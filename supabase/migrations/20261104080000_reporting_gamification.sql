-- ---------------------------------------------------------------------------
-- Daily reporting, task assignment, blockers and gamification
--
-- * todos gain an assignee (the organization owner assigns work) and an
--   optional blocker note ("what is stopping this task").
-- * daily_reports stores one yesterday/today/blockers report per member per
--   day. report_date is always supplied by the server in APP_TIMEZONE.
-- * profiles gain XP, streak and best-streak columns; the level is derived
--   in the app (level = floor(xp / 250) + 1).
-- ---------------------------------------------------------------------------

alter table public.todos
    add column if not exists assignee_id uuid references public.profiles (id) on delete set null,
    add column if not exists blocker text check (char_length(blocker) <= 500);

create index if not exists todos_assignee_id on public.todos (assignee_id);

create table if not exists public.daily_reports (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    report_date date not null,
    yesterday text not null default '' check (char_length(yesterday) <= 2000),
    today text not null default '' check (char_length(today) <= 2000),
    blockers text not null default '' check (char_length(blockers) <= 2000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, report_date)
);

create index if not exists daily_reports_user_date
    on public.daily_reports (user_id, report_date desc);

create index if not exists daily_reports_date
    on public.daily_reports (report_date desc);

alter table public.profiles
    add column if not exists xp integer not null default 0,
    add column if not exists streak integer not null default 0,
    add column if not exists best_streak integer not null default 0,
    add column if not exists last_report_date date;

alter table public.profiles
    drop constraint if exists profiles_xp_non_negative;
alter table public.profiles
    add constraint profiles_xp_non_negative check (xp >= 0);

create index if not exists profiles_organization_xp
    on public.profiles (organization_id, xp desc);

-- ---------------------------------------------------------------------------
-- XP: a single atomic increment so parallel completions never lose points.
-- ---------------------------------------------------------------------------
create or replace function public.add_xp(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_xp integer;
begin
    if p_amount = 0 then
        select xp into v_xp from public.profiles where id = p_user_id;
        return coalesce(v_xp, 0);
    end if;

    update public.profiles
       set xp = greatest(0, xp + p_amount)
     where id = p_user_id
    returning xp into v_xp;

    return coalesce(v_xp, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Filing a daily report: upsert the report, advance the streak and award XP
-- in one transaction. Editing an already-filed report never re-awards XP.
--
--   base       +20 for the first report of the day
--   streak     +5 per consecutive day, capped at +25 (streak 6+)
-- ---------------------------------------------------------------------------
create or replace function public.file_daily_report(
    p_user_id uuid,
    p_date date,
    p_yesterday text,
    p_today text,
    p_blockers text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_exists boolean;
    v_last date;
    v_streak integer := 0;
    v_best integer := 0;
    v_bonus integer := 0;
    v_gained integer := 0;
begin
    select exists(
        select 1 from public.daily_reports
         where user_id = p_user_id and report_date = p_date
    ) into v_exists;

    if v_exists then
        update public.daily_reports
           set yesterday = p_yesterday,
               today = p_today,
               blockers = p_blockers,
               updated_at = now()
         where user_id = p_user_id and report_date = p_date;
    else
        insert into public.daily_reports (user_id, report_date, yesterday, today, blockers)
        values (p_user_id, p_date, p_yesterday, p_today, p_blockers);

        select last_report_date, streak, best_streak
          into v_last, v_streak, v_best
          from public.profiles
         where id = p_user_id;

        if v_last = p_date then
            v_streak := coalesce(v_streak, 0);
        elsif v_last = p_date - 1 then
            v_streak := coalesce(v_streak, 0) + 1;
        else
            v_streak := 1;
        end if;

        if v_streak > coalesce(v_best, 0) then
            v_best := v_streak;
        end if;

        if v_streak > 1 then
            v_bonus := 5 * least(v_streak - 1, 5);
        end if;

        v_gained := 20 + v_bonus;

        update public.profiles
           set last_report_date = p_date,
               streak = v_streak,
               best_streak = v_best,
               xp = xp + v_gained
         where id = p_user_id;
    end if;

    return jsonb_build_object(
        'xp', v_gained,
        'streak', v_streak,
        'new', not v_exists
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security (defence in depth — server code uses the service role)
-- ---------------------------------------------------------------------------
alter table public.daily_reports enable row level security;

drop policy if exists "reports belong to their owner" on public.daily_reports;
create policy "reports belong to their owner"
    on public.daily_reports for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Scrum Master schema
--
-- accounts live in Supabase Auth (auth.users); public.profiles holds the
-- display name, photo, organization and notification preferences.
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 2 and 80),
    owner_id uuid not null,
    created_at timestamptz not null default now()
);

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    name text not null check (char_length(name) between 1 and 60),
    email text not null,
    avatar_url text,
    organization_id uuid references public.organizations (id) on delete set null,
    notify_browser boolean not null default true,
    notify_email boolean not null default true,
    notify_lead_minutes integer not null default 30
        check (notify_lead_minutes in (5, 10, 15, 30, 60, 120)),
    onboarding_complete boolean not null default false,
    created_at timestamptz not null default now()
);

-- The two tables reference each other; the profile side was created first so
-- an organization can be inserted right after the owner's profile exists.
alter table public.organizations
    drop constraint if exists organizations_owner_id_fkey;
alter table public.organizations
    add constraint organizations_owner_id_fkey
    foreign key (owner_id) references public.profiles (id) on delete cascade;

create unique index if not exists profiles_email_unique
    on public.profiles (lower(email));
create index if not exists profiles_organization_id
    on public.profiles (organization_id);

create table if not exists public.todos (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    title text not null check (char_length(title) between 1 and 200),
    completed boolean not null default false,
    start_time time,
    end_time time,
    legacy_id integer,
    created_at timestamptz not null default now()
);

create index if not exists todos_user_id on public.todos (user_id);
create index if not exists todos_user_completed on public.todos (user_id, completed);
create unique index if not exists todos_user_legacy_unique
    on public.todos (user_id, legacy_id)
    where legacy_id is not null;

create table if not exists public.notification_state (
    user_id uuid not null references public.profiles (id) on delete cascade,
    notification_key text not null,
    read_at timestamptz,
    emailed_at timestamptz,
    primary key (user_id, notification_key)
);

-- A small audit trail of outbound mail. When no SMTP/Resend credentials are
-- configured the "log" transport still records every message here and in
-- storage/mail.log, so notification behaviour can be verified locally.
create table if not exists public.email_log (
    id bigint generated always as identity primary key,
    user_id uuid references public.profiles (id) on delete set null,
    to_email text not null,
    subject text not null,
    transport text not null,
    status text not null check (status in ('sent', 'logged', 'failed')),
    error text,
    created_at timestamptz not null default now()
);

create index if not exists email_log_created_at on public.email_log (created_at desc);

-- ---------------------------------------------------------------------------
-- New auth user → profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, name, email, avatar_url, onboarding_complete)
    values (
        new.id,
        coalesce(
            nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
            split_part(coalesce(new.email, ''), '@', 1)
        ),
        coalesce(new.email, ''),
        nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
        false
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security (defence in depth — server code uses the service role)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.todos enable row level security;
alter table public.notification_state enable row level security;
alter table public.email_log enable row level security;

drop policy if exists "profiles are readable by their owner" on public.profiles;
create policy "profiles are readable by their owner"
    on public.profiles for select
    using (id = auth.uid());

drop policy if exists "profiles are updatable by their owner" on public.profiles;
create policy "profiles are updatable by their owner"
    on public.profiles for update
    using (id = auth.uid())
    with check (id = auth.uid());

drop policy if exists "organizations are readable by their owner" on public.organizations;
create policy "organizations are readable by their owner"
    on public.organizations for select
    using (owner_id = auth.uid());

drop policy if exists "organizations are created by their owner" on public.organizations;
create policy "organizations are created by their owner"
    on public.organizations for insert
    with check (owner_id = auth.uid());

drop policy if exists "todos belong to their owner" on public.todos;
create policy "todos belong to their owner"
    on public.todos for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "notification state belongs to its owner" on public.notification_state;
create policy "notification state belongs to its owner"
    on public.notification_state for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- email_log is intentionally service-role only (no policies).

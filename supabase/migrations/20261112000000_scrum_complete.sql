-- ---------------------------------------------------------------------------
-- Phase 2-5: Scrum completeness - story points, DoD, roles, reviews,
-- retrospectives, velocity tracking, and EBM metrics.
-- ---------------------------------------------------------------------------

-- Story points on tasks
alter table public.todos
    add column if not exists story_points integer check (story_points >= 0 and story_points <= 100);

-- Scrum role on profiles
alter table public.profiles
    add column if not exists scrum_role text
        check (scrum_role in ('product_owner', 'scrum_master', 'developer'));

-- Definition of Done per organization
alter table public.organizations
    add column if not exists definition_of_done text;

-- Sprint review / retrospective notes
create table if not exists public.sprint_reviews (
    id uuid primary key default gen_random_uuid(),
    sprint_id uuid not null references public.sprints (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    went_well text,
    to_improve text,
    action_items text,
    created_at timestamptz not null default now()
);

create index if not exists sprint_reviews_sprint_id on public.sprint_reviews (sprint_id);

-- Daily Scrum entries
create table if not exists public.daily_scrum (
    id uuid primary key default gen_random_uuid(),
    sprint_id uuid not null references public.sprints (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    yesterday text,
    today text,
    blockers text,
    created_at timestamptz not null default now()
);

create index if not exists daily_scrum_sprint_user on public.daily_scrum (sprint_id, user_id, created_at desc);

-- RLS
alter table public.sprint_reviews enable row level security;
alter table public.daily_scrum enable row level security;

drop policy if exists "sprint_reviews belong to their owner" on public.sprint_reviews;
create policy "sprint_reviews belong to their owner"
    on public.sprint_reviews for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists "daily_scrum belongs to its author" on public.daily_scrum;
create policy "daily_scrum belongs to its author"
    on public.daily_scrum for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- Sprint reviews/readable by org members (sprint owner's org)
-- (simplified: owner-only for now, matching existing pattern)

-- ---------------------------------------------------------------------------
-- Sprints: time-boxed iterations for Scrum teams.
-- A task with sprint_id = null lives in the Product Backlog; a non-null
-- value means it is committed to that sprint's Sprint Backlog.
-- ---------------------------------------------------------------------------
create table if not exists public.sprints (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    name text not null check (char_length(name) between 1 and 80),
    goal text,
    start_date date not null,
    end_date date not null,
    status text not null default 'planned'
        check (status in ('planned', 'active', 'completed')),
    created_at timestamptz not null default now()
);

create index if not exists sprints_user_id on public.sprints (user_id);
create index if not exists sprints_user_status on public.sprints (user_id, status);

-- Link tasks to a sprint (nullable = product backlog).
alter table public.todos
    add column if not exists sprint_id uuid references public.sprints (id) on delete set null;

create index if not exists todos_sprint_id on public.todos (sprint_id);

-- RLS: sprints belong to their owner.
alter table public.sprints enable row level security;

drop policy if exists "sprints belong to their owner" on public.sprints;
create policy "sprints belong to their owner"
    on public.sprints for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

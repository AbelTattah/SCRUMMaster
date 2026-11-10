-- ---------------------------------------------------------------------------
-- Row Level Security for offline-first desktop clients.
--
-- The desktop app ships only the anon key (never the service role key), so
-- every read and every user-scoped write must succeed under the signed-in
-- user's own session. These policies make that possible while keeping each
-- user's data isolated.
--
-- Applied in addition to the policies created by 20261102120000_init.sql and
-- friends; the old "owner only" todo policy is replaced here.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- todos: visible to creator and assignee; writable by creator/owner.
-- ---------------------------------------------------------------------------
drop policy if exists "todos belong to their owner" on public.todos;

create policy "todos are readable by creator or assignee"
    on public.todos for select
    using (user_id = auth.uid() or assignee_id = auth.uid());

create policy "todos are insertable by their creator"
    on public.todos for insert
    with check (user_id = auth.uid());

create policy "todos are updatable by creator or assignee"
    on public.todos for update
    using (user_id = auth.uid() or assignee_id = auth.uid())
    with check (user_id = auth.uid() or assignee_id = auth.uid());

create policy "todos are deletable by their creator"
    on public.todos for delete
    using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- profiles: readable by self and by members of the same organization.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles are readable by their owner" on public.profiles;

create policy "profiles are readable by self or org peers"
    on public.profiles for select
    using (
        id = auth.uid()
        or organization_id is not null and organization_id in (
            select organization_id from public.profiles where id = auth.uid()
        )
    );

-- profiles updatable by owner (already exists; re-create for clarity).
drop policy if exists "profiles are updatable by their owner" on public.profiles;
create policy "profiles are updatable by their owner"
    on public.profiles for update
    using (id = auth.uid())
    with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- organizations: readable by owner and members.
-- ---------------------------------------------------------------------------
drop policy if exists "organizations are readable by their owner" on public.organizations;

create policy "organizations are readable by owner or members"
    on public.organizations for select
    using (
        owner_id = auth.uid()
        or id in (select organization_id from public.profiles where id = auth.uid())
    );

-- organizations created by their owner (already exists; re-create).
drop policy if exists "organizations are created by their owner" on public.organizations;
create policy "organizations are created by their owner"
    on public.organizations for insert
    with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notification_state: owner only (already existed).
-- ---------------------------------------------------------------------------
-- (policy "notification state belongs to its owner" already in place)

-- ---------------------------------------------------------------------------
-- push_subscriptions: owner only.
-- ---------------------------------------------------------------------------
-- (policy "push subscriptions belong to their owner" already in place)

-- ---------------------------------------------------------------------------
-- daily_reports: owner only.
-- ---------------------------------------------------------------------------
-- (policy "reports belong to their owner" already in place)

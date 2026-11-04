-- ---------------------------------------------------------------------------
-- Web Push subscriptions
--
-- Installed PWAs (and any browser that granted permission) register an
-- endpoint here; the digest job pushes actionable notifications to it, which
-- is what makes alerts work while the app is fully closed.
-- ---------------------------------------------------------------------------

create table if not exists public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    user_agent text,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id
    on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Reads are limited to the subscription's owner; writes happen through the
-- service role (defence in depth, same as the other tables).
drop policy if exists "push subscriptions belong to their owner" on public.push_subscriptions;
create policy "push subscriptions belong to their owner"
    on public.push_subscriptions for select
    using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Pending invites + organization-wide task management
--
-- * profiles.invited_at marks accounts the organization owner created for
--   someone who has not signed in yet (cleared on their first authenticated
--   load). The owner assigns and updates tasks for those people in the
--   meantime — no account needed on their side "at the moment".
-- ---------------------------------------------------------------------------
alter table public.profiles
    add column if not exists invited_at timestamptz;

comment on column public.profiles.invited_at is
    'Set when an owner creates an account for an invitee; cleared on first sign-in.';

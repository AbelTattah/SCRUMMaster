# Scrum Master

> Record what gets done, stay accountable, and level up every day.

Scrum Master is a fast, offline-first task manager for you and your team. Track
today's work, assign it to anyone (even before they sign up), get reminded before
tasks start, and ship a stand-up report — PDF or Word — in one click. Your task
titles are end-to-end encrypted; we can't read them.

- **Web app:** https://scrum-master-two.vercel.app
- **Desktop app:** Windows installer (Electron)
- **License:** MIT

## Features

- **Today's board** — inline editing, one-click checkboxes, search, pagination, sticky-note mini-window
- **Reminders & notifications** — browser push + email digests, overdue/upcoming/blocker alerts
- **Teams without friction** — invite by email, assign before they sign up, XP + levels, leaderboard
- **Stand-up reports** — daily/weekly/monthly, PDF + Word (.docx) export, org-wide for owners
- **Private by design** — zero-knowledge end-to-end encryption (AES-256-GCM)
- **Works offline** — encrypted local mirror, syncs when reconnected
- **Guest mode** — use the app without an account
- **Data export** — download all your tasks as JSON

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Offline:** Dexie (IndexedDB), service worker
- **Encryption:** Web Crypto API (PBKDF2, AES-GCM, ECDH)
- **Desktop:** Electron
- **Reports:** jsPDF, docx

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project

### Setup

```bash
git clone https://github.com/AbelTattah/SCRUMMaster.git
cd SCRUMMaster
npm install
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

Open http://localhost:3000.

### Environment variables

See `.env.example` for the full list. Key ones:

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-side only)
- `APP_TIMEZONE` — e.g. `Africa/Accra`

### Database

Apply the migrations in `supabase/migrations/` to your Supabase project
(via the Supabase CLI or the SQL editor).

### Desktop app

```bash
npm run build:desktop   # builds the Next.js standalone bundle
npm run dist:desktop    # packages the Electron installer
```

Output: `desktop/dist/Scrum Master Setup 0.1.0.exe`

## Project structure

```
src/
  app/            # Next.js App Router pages & API routes
  components/     # React components (incl. shadcn/ui in ui/)
  lib/            # sync, crypto, keys, data access, types
desktop/          # Electron shell (main.js, preload, assets)
supabase/         # SQL migrations
scripts/          # build, package, notify, migrate
public/           # static assets, service worker, PWA manifest
docs/             # encryption architecture, landing page brief
```

## Monetization

Scrum Master is open source (MIT) and free to self-host. Revenue comes from:

1. **Hosted SaaS** (https://scrum-master-two.vercel.app) — managed hosting,
   automatic updates, backups, and support. Free tier available.
2. **Premium features** (roadmap) — advanced reporting, SSO, audit logs,
   priority support for teams and organizations.
3. **Sponsorships** — GitHub Sponsors and Open Collective.
4. **Support & consulting** — paid setup, customization and training for
   organizations.

The core task manager, encryption, offline sync and stand-up reports will
always remain open source and free to self-host.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Issues and PRs are welcome.

## Security

See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities.

## Documentation

- [Encryption architecture](./docs/encryption.md)
- [Landing page brief](./docs/landing-page.md)

## License

[MIT](./LICENSE) — Copyright (c) 2026 Abel Tattah

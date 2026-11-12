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
- **Works offline** - encrypted local mirror, syncs when reconnected
- **True offline-first desktop** - the app boots from a bundled local server on a fixed port, serves the cached session and the encrypted mirror with no network at all (~15 ms cold start), and syncs when you reconnect
- **Guest mode** - use the app without an account
- **Data export** - download all your tasks as JSON

### Scrum features

Built against the [Scrum Guide 2020](https://www.scrum.org/resources/scrum-guide):

| Feature | What it does |
|---|---|
| **Sprints** | Time-boxed iterations with a name, goal, dates and a planned → active → completed lifecycle |
| **Product Backlog vs Sprint Backlog** | Tasks with no sprint stay in the backlog; selecting a sprint filters the board |
| **Sprint Goal** | One objective per sprint, shown with the sprint |
| **Story points** | Relative effort per task (0–100), synced end to end |
| **Velocity & burndown** | Average velocity across completed sprints, live sprint progress bar |
| **Sprint Review & Retrospective** | Went well / to improve / action items, kept per sprint |
| **Daily Scrum** | Yesterday / today / blockers entries per team member |
| **Definition of Done** | A shared checklist per organization |
| **Scrum roles** | Product Owner, Scrum Master, Developer assigned per member |
| **Evidence-Based Management** | Current value, unrealized value, ability to innovate, time to market |
| **Nexus** | Integration, Architecture & Quality and Governance streams for teams scaling beyond one |

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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Issues and PRs are welcome.

## Security

See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities.

## Documentation

- [Encryption architecture](./docs/encryption.md)
- [Landing page brief](./docs/landing-page.md)

## License

[MIT](./LICENSE) — Copyright (c) 2026 Abel Tattah

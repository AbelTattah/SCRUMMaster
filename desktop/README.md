# Scrum Master — desktop (Electron)

The desktop shell for [Scrum Master](../). It is intentionally thin: the web
app in the repo root stays the single source of truth, and this folder only
knows how to run it as a native window.

## How the UI is resolved

1. **`SCRUM_MASTER_URL`** — point the shell at any running instance
   (useful against `npm run dev` on `localhost:3000`).
2. **Bundled standalone server** — the Next.js build produced by
   `npm run build:desktop` (repo root), started *in-process* on a loopback
   port and loaded from there. No system Node.js required at runtime.
3. **Production site** — `https://scrum-master-two.vercel.app` when no bundle
   is present, so a fresh checkout still opens the app.

External links (Google sign-in, password-reset mails, docs) open in the
default browser; everything on the app's own origin stays in the window.

## Offline-first

The desktop app is not a wrapper around the website - it *is* the app:

- The bundled Next.js server always starts first, on a **fixed port 4556**.
  A fixed origin matters: the encrypted task mirror lives in IndexedDB, which
  is per-origin, so a changing port would wipe it on every launch.
- On boot the shell **probes Supabase** (2.5 s timeout). If the network is
  there it sets `SCRUM_OFFLINE=0` and the server syncs as usual. If it is
  not, it sets `SCRUM_OFFLINE=1` and the server skips every remote call:
  the cached session cookie serves the shell and the encrypted local mirror
  serves the tasks.
- Cold start with no network is ~15 ms. The header shows an **Offline**
  banner so it is obvious that the app is running from the device and that
  writes will sync by themselves later.
- Writes are queued in an outbox (Dexie) and pushed when the connection
  returns, so nothing is lost while offline.

## Development

```bash
# repo root — either run against the dev server…
npm run dev                                  # http://localhost:3000

# …or build the standalone bundle the packaged app uses
npm run build:desktop

# desktop/
cd desktop
npm install
SCRUM_MASTER_URL=http://localhost:3000 npm start   # dev mode (Windows PowerShell: $env:SCRUM_MASTER_URL=…)
npm start                                            # bundled / production fallback
npm run smoke                                        # headless check: loads, prints SMOKE_OK, exits
```

## Packaging

```bash
# repo root: build the standalone bundle first
npm run build:desktop

# desktop/
npm run dist:win      # NSIS installer → desktop/dist/
npm run dist:mac
npm run dist:linux
```

`extraResources` in `package.json` copies `.next/standalone` to
`resources/web`, which `src/main.js` picks up automatically.

## Layout (multi-platform)

```
/                 the web app (Next.js, deployed to Vercel)
/desktop          this Electron shell (Windows · macOS · Linux)
/mobile           reserved for the future native port
```

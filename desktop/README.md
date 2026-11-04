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

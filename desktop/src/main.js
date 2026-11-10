"use strict";

/**
 * Scrum Master desktop (Electron).
 *
 * UI resolution order:
 *   1. SCRUM_MASTER_URL          — point at any running instance (dev)
 *   2. bundled standalone server — the Next.js build shipped inside the app,
 *                                   started in-process on a loopback port
 *   3. the production site       — fallback when no bundle is present
 *
 * The window never shows a raw colour while loading: a branded splash shows
 * first, and a failed load lands on a friendly retry page instead.
 */
const { app, BrowserWindow, Menu, session, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");

const PRODUCTION_URL = "https://scrum-master-two.vercel.app";
const SMOKE_TEST = process.argv.includes("--smoke-test");
const NOTIFY_TEST = process.argv.includes("--notify-test");

// Windows toast identity — matches the NSIS appId so notifications and the
// taskbar entry group under one name. Must be set before any notification.
app.setAppUserModelId("com.scrummaster.desktop");

/* ------------------------------------------------------------------ pages */

const BRAND_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body {
    display: flex; align-items: center; justify-content: center; min-height: 100vh;
    background: #FAFAFA; color: #1A1A1A;
    font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .card { text-align: center; max-width: 420px; padding: 40px 32px; }
  .mark {
    display: grid; place-items: center; width: 64px; height: 64px; margin: 0 auto 20px;
    border-radius: 16px; background: linear-gradient(135deg, #2E0480, #160043);
    color: #fff; font-size: 30px; font-weight: 600;
    box-shadow: 0 18px 40px rgba(33, 0, 93, 0.28);
  }
  h1 { font-size: 22px; font-weight: 600; }
  p { margin-top: 8px; color: #727272; font-size: 14px; line-height: 1.6; }
  .spinner {
    width: 26px; height: 26px; margin: 22px auto 0;
    border: 3px solid #E4D9F7; border-top-color: #21005D;
    border-radius: 50%; animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .actions { display: flex; gap: 10px; justify-content: center; margin-top: 24px; }
  button, a {
    display: inline-flex; align-items: center; justify-content: center;
    height: 42px; padding: 0 20px; border-radius: 8px; border: 0;
    font: inherit; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer;
  }
  button { background: #21005D; color: #fff; }
  button:hover { background: #2E0480; }
  a { background: #fff; color: #21005D; border: 1.5px solid #E4D9F7; }
  a:hover { background: #F4F0FB; }
  .meta { margin-top: 18px; font-size: 12px; color: #ABABAB; }
`;

function dataUrl(html) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/**
 * The first screen the desktop shows matches the web app's post-sign-up
 * loading veil exactly: the app mark centred on the page background with
 * the glowing indeterminate bar underneath (see AuthLoading / globals.css).
 */
const SPLASH_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body {
    display: flex; align-items: center; justify-content: center; min-height: 100vh;
    background: #FAFAFA;
    font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .veil { display: flex; flex-direction: column; align-items: center; gap: 28px; }
  .mark-img { height: 88px; width: auto; animation: breathe 1.6s ease-in-out infinite; }
  .bar {
    position: relative; width: 176px; height: 7px; overflow: hidden;
    border-radius: 999px; background: rgba(33, 0, 93, 0.16);
    box-shadow: 0 0 18px rgba(33, 0, 93, 0.16);
  }
  .bar span {
    position: absolute; top: 0; bottom: 0; left: 0; width: 42%;
    border-radius: 999px; background: #21005D;
    box-shadow: 0 0 14px 2px rgba(33, 0, 93, 0.16);
    animation: sweep 1.15s ease-in-out infinite;
  }
  @keyframes sweep { from { transform: translateX(-110%); } to { transform: translateX(340%); } }
  @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.04); opacity: 0.85; } }
  @media (prefers-color-scheme: dark) {
    body { background: #0E0E12; }
    .bar { background: rgba(185, 166, 245, 0.3); box-shadow: 0 0 18px rgba(185, 166, 245, 0.3); }
    .bar span { background: #B9A6F5; box-shadow: 0 0 14px 2px rgba(185, 166, 245, 0.3); }
  }
  @media (prefers-reduced-motion: reduce) {
    .mark-img, .bar span { animation: none; }
    .bar span { width: 100%; }
  }
`;

/** The app mark as a data URI so the data-URL splash needs no file access. */
function splashIconDataUri() {
  const candidates = [];

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, "web", "public", "favicon.png"));
  }

  candidates.push(path.join(__dirname, "..", "..", "public", "favicon.png")); // dev
  candidates.push(path.join(__dirname, "..", "..", "..", "public", "favicon.png"));

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
      }
    } catch {
      // try the next candidate
    }
  }

  return "";
}

/** Wordmark as a data URI so the offline page keeps the logo with no network. */
function logoLightDataUri() {
  const candidates = [];
  if (process.resourcesPath) candidates.push(path.join(process.resourcesPath, "web", "public", "logo-wordmark.png"));
  candidates.push(path.join(__dirname, "..", "..", "public", "logo-wordmark.png"));
  candidates.push(path.join(__dirname, "..", "..", "..", "public", "logo-wordmark.png"));
  for (const file of candidates) {
    try { if (fs.existsSync(file)) return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`; } catch {}
  }
  return "";
}

function logoDarkDataUri() {
  const candidates = [];
  if (process.resourcesPath) candidates.push(path.join(process.resourcesPath, "web", "public", "logo-wordmark-white.png"));
  candidates.push(path.join(__dirname, "..", "..", "public", "logo-wordmark-white.png"));
  candidates.push(path.join(__dirname, "..", "..", "..", "public", "logo-wordmark-white.png"));
  for (const file of candidates) {
    try { if (fs.existsSync(file)) return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`; } catch {}
  }
  return "";
}

const OFFLINE_URL = dataUrl(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Scrum Master - offline</title>
<style>
  body { display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px; background:#FAFAFA; color:#1A1A1A; font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; text-align:center; }
  .card { max-width:440px; padding:40px 32px; background:#FFFFFF; border:1px solid #EBEBEB; border-radius:16px; box-shadow:0 18px 50px rgba(33,0,93,0.10); }
  .logo { display:block; height:32px; width:auto; margin:0 auto 20px; }
  .logo--dark { display:none; }
  h1 { margin:0 0 8px; font-size:22px; }
  p { margin:0 0 24px; color:#727272; font-size:15px; line-height:1.6; }
  button { height:44px; padding:0 24px; border:0; border-radius:8px; background:#21005D; color:#FFFFFF; font:inherit; font-size:15px; font-weight:600; cursor:pointer; }
  button:hover { background:#2E0480; }
  @media (prefers-color-scheme: dark) {
    body { background:#0E0E12; color:#E7E7EE; }
    .card { background:#1A1A21; border-color:#2A2A34; box-shadow:none; }
    p { color:#9C9CA8; }
    .logo--light { display:none; }
    .logo--dark { display:block; }
  }
</style></head>
<body><div class="card">
  <img class="logo logo--light" src="${logoLightDataUri()}" alt="Scrum Master">
  <img class="logo logo--dark" src="${logoDarkDataUri()}" alt="Scrum Master">
  <h1>You are offline</h1>
  <p>Scrum Master could not reach the network. Your tasks are safe on this device - reconnect and pull to refresh.</p>
  <button onclick="location.reload()">Try again</button>
</div></body></html>`);

const SPLASH_URL = dataUrl(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Scrum Master</title>
<style>${SPLASH_CSS}</style></head>
<body>
  <div class="veil">
    <img class="mark-img" src="${splashIconDataUri()}" alt="Scrum Master">
    <div class="bar"><span></span></div>
  </div>
</body></html>`);

function errorPage(target, code, description) {
  return dataUrl(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Couldn't load Scrum Master</title>
<style>${BRAND_CSS}</style></head>
<body>
  <div class="card">
    <div class="mark">!</div>
    <h1>Couldn't load Scrum Master</h1>
    <p>${description || "The page failed to load."} (error ${code})<br>
       Check your connection, then try again.</p>
    <div class="actions">
      <button onclick="location.href=${JSON.stringify(target).replace(/"/g, "&quot;")}">Try again</button>
      <a href="${target}" target="_blank" rel="noreferrer">Open in browser</a>
    </div>
    <p class="meta">${target}</p>
  </div>
</body></html>`);
}

/* ------------------------------------------------------- bundle discovery */

/** Repo root in development; <resources>/web when packaged. */
function webRootCandidates() {
  const candidates = [];

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, "web"));
  }

  candidates.push(path.join(__dirname, "..", ".."));

  return candidates;
}

function findStandaloneRoot() {
  for (const dir of webRootCandidates()) {
    // Development checkout: <repo>/.next/standalone/server.js
    const nested = path.join(dir, ".next", "standalone");

    if (fs.existsSync(path.join(nested, "server.js"))) {
      return nested;
    }

    // Packaged: extraResources flattens the standalone folder into web/, so
    // server.js sits directly next to its .next directory.
    if (fs.existsSync(path.join(dir, "server.js")) && fs.existsSync(path.join(dir, ".next"))) {
      return dir;
    }
  }

  return null;
}

/**
 * The standalone server does not load .env files itself (Next hands that to
 * the host), so the shell injects them before requiring it. Values already
 * present in the environment win — a packaged app can ship its own
 * resources/web/.env.local without it being overwritten here.
 */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) {
    return;
  }

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);

    if (!match || process.env[match[1]] !== undefined) {
      continue;
    }

    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[match[1]] = value;
  }
}

function loadWebEnv() {
  for (const dir of webRootCandidates()) {
    loadEnvFile(path.join(dir, ".env.local"));
    loadEnvFile(path.join(dir, ".env"));
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ping(url) {
  return new Promise((resolve) => {
    const mod = String(url).startsWith("https:") ? https : http;
    const request = mod.get(url, (response) => {
      response.resume();
      resolve(response.statusCode && response.statusCode < 500);
    });

    request.on("error", () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

/** Start the bundled Next.js server inside this process. */
async function startLocalServer(standaloneRoot) {
  // A stable port is essential: IndexedDB is per-origin, so a random port
  // each launch would wipe the offline task mirror on every restart.
  const port = 4556;
  const url = `http://127.0.0.1:${port}`;

  process.env.PORT = String(port);
  process.env.HOSTNAME = "127.0.0.1";
  // Tells the server it is the desktop shell: enables the offline session
  // cache in lib/auth.ts. The web deployment never sets this.
  process.env.SCRUM_DESKTOP = "1";

  require(path.join(standaloneRoot, "server.js"));

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await ping(`${url}/`)) {
      return url;
    }

    await sleep(250);
  }

  return null;
}

async function resolveUrl() {
  if (process.env.SCRUM_MASTER_URL) {
    return { url: process.env.SCRUM_MASTER_URL, mode: "env" };
  }

  const standaloneRoot = findStandaloneRoot();

  if (standaloneRoot) {
    loadWebEnv();

    try {
      const url = await startLocalServer(standaloneRoot);

      if (url) {
        return { url, mode: "local" };
      }
    } catch (error) {
      console.error("[desktop] local server failed, falling back:", error);
    }
  }

  // Last resort only: a configured-but-broken local server, or a dev
  // checkout with no bundle. Prefer the production site when reachable.
  const online = await ping(PRODUCTION_URL);

  if (!online) {
    console.log("[desktop] offline - using embedded offline page");
    return { url: OFFLINE_URL, mode: "offline" };
  }

  return { url: PRODUCTION_URL, mode: "production" };
}

/* ----------------------------------------------------------------- window */

async function createWindow(url) {
  const window = new BrowserWindow({
    width: 1340,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#FAFAFA", // never a raw colour while loading
    title: "Scrum Master",
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  window.once("ready-to-show", () => window.show());

  const origin = new URL(url).origin;

  // Mark this session as the desktop app so the server can skip the
  // marketing landing page for signed-out users (desktop has no landing).
  try {
    await session.defaultSession.cookies.set({
      url: origin,
      name: "scrum-platform",
      value: "desktop",
      path: "/",
      secure: origin.startsWith("https:"),
      httpOnly: false,
      sameSite: "lax",
    });
  } catch (error) {
    console.error("[desktop] cookie set failed:", error);
  }

  // A blank child window is the sticky-notes mini window: keep it floating
  // above the desktop and other apps (the options alone are not enough on
  // every Windows build).
  window.webContents.on("did-create-window", (child) => {
    child.setAlwaysOnTop(true, "floating");
    child.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  });

  // Anything that leaves our origin opens in the default browser (Google
  // sign-in, password-reset links, docs) instead of a new Electron window.
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    // The sticky-notes mini window opens a *blank* document (window.open(""))
    // and writes the notes into it. about:blank has origin "null", so it must
    // be allowed explicitly — otherwise the popup is denied, window.open()
    // returns null, and the notes degrade to a panel inside this window
    // instead of a real, separate mini window.
    const isBlank = !target || target === "about:blank";

    if (isBlank) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 330,
          height: 440,
          minWidth: 260,
          minHeight: 220,
          autoHideMenuBar: true,
          resizable: true,
          // The notes are a mini window: they must stay above other apps and
          // the desktop, not drop behind them when the user clicks away.
          alwaysOnTop: true,
          title: "Today - Scrum Master",
        },
      };
    }

    try {
      if (new URL(target).origin !== origin) {
        shell.openExternal(target);
        return { action: "deny" };
      }
    } catch (error) {
      shell.openExternal(target);
      return { action: "deny" };
    }

    return { action: "allow" };
  });

  window.webContents.on("will-navigate", (event, target) => {
    try {
      if (new URL(target).origin !== origin) {
        event.preventDefault();
        shell.openExternal(target);
      }
    } catch (error) {
      event.preventDefault();
      shell.openExternal(target);
    }
  });

  // A failed load gets a branded retry page — never a blank window.
  window.webContents.on(
    "did-fail-load",
    (_event, code, description, isMainFrame, failedUrl) => {
      if (!isMainFrame || code === -3 || (failedUrl || "").startsWith("data:")) {
        return; // aborted navigation or the pages we load ourselves
      }

      if (SMOKE_TEST || NOTIFY_TEST) {
        return; // test modes exit via their own handlers below
      }

      console.error(`[desktop] load failed: ${code} ${description} (${failedUrl})`);
      window.loadURL(errorPage(url, code, description));
    },
  );

  if (SMOKE_TEST || NOTIFY_TEST) {
    window.webContents.once("did-finish-load", async () => {
      if (NOTIFY_TEST) {
        // Requests permission through the granted handler below, then fires a
        // real OS notification. The window stays up for a moment so the toast
        // is visible on screen.
        try {
          const result = await window.webContents.executeJavaScript(`(async () => {
            if (!("Notification" in window)) {
              return { permission: "unsupported", fired: false };
            }
            const initial = Notification.permission;
            const permission = await Notification.requestPermission();
            let fired = false;
            let error = null;
            if (permission === "granted") {
              try {
                new Notification("Scrum Master", {
                  body: "Desktop notifications are working.",
                });
                fired = true;
              } catch (e) {
                error = String(e);
              }
            }
            return { initial, permission, fired, error };
          })()`);

          console.log(`NOTIFY_TEST ${JSON.stringify(result)}`);
          setTimeout(
            () => app.exit(result.permission === "granted" && result.fired ? 0 : 1),
            4000,
          );
        } catch (error) {
          console.error(`NOTIFY_TEST_FAILED ${error}`);
          app.exit(1);
        }
        return;
      }

      console.log(`SMOKE_OK mode=${new URL(url).hostname}`);
      app.exit(0);
    });

    window.webContents.once("did-fail-load", (_event, code) => {
      console.error(`${SMOKE_TEST ? "SMOKE" : "NOTIFY"}_FAIL ${code}`);
      app.exit(1);
    });

    setTimeout(() => {
      console.error(`${SMOKE_TEST ? "SMOKE" : "NOTIFY"}_FAIL timeout`);
      app.exit(1);
    }, 60_000);

    window.loadURL(url);
  } else {
    // Branded splash first, then the app — the window is never a colour void.
    window.loadURL(SPLASH_URL);
    window.webContents.once("did-finish-load", () => {
      window.loadURL(url);
    });
  }

  return window;
}

/* ------------------------------------------------------------------- menu */

function buildMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        { role: "close" },
        ...(isMac ? [] : [{ type: "separator" }, { role: "quit" }]),
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { label: "Window", role: "windowMenu" },
    {
      label: "Help",
      role: "help",
      submenu: [
        {
          label: "Scrum Master on the web",
          click: () => shell.openExternal(PRODUCTION_URL),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ------------------------------------------------------------------- main */

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [window] = BrowserWindow.getAllWindows();

    if (window) {
      if (window.isMinimized()) {
        window.restore();
      }

      window.focus();
    }
  });

  app.whenReady().then(async () => {
    buildMenu();

    // Notifications are the whole point of the desktop shell: grant them
    // without a prompt (Electron shows no permission UI by default) and do
    // not advertise anything else the app never uses.
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, permission, callback) => {
        callback(permission === "notifications");
      },
    );
    session.defaultSession.setPermissionCheckHandler(
      (_webContents, permission) => permission === "notifications",
    );

    const { url, mode } = await resolveUrl();

    console.log(`[desktop] loading ${url} (${mode})`);
    await createWindow(url);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow(url);
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

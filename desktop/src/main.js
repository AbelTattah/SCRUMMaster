"use strict";

/**
 * Scrum Master desktop (Electron).
 *
 * UI resolution order:
 *   1. SCRUM_MASTER_URL          — point at any running instance (dev)
 *   2. bundled standalone server — the Next.js build shipped inside the app,
 *                                   started in-process on a loopback port
 *   3. the production site       — fallback when no bundle is present
 */
const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

const PRODUCTION_URL = "https://scrum-master-two.vercel.app";
const SMOKE_TEST = process.argv.includes("--smoke-test");

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
    if (fs.existsSync(path.join(dir, ".next", "standalone", "server.js"))) {
      return path.join(dir, ".next", "standalone");
    }
  }

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function ping(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
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
  const port = String(4300 + (process.pid % 500));

  process.env.PORT = port;
  process.env.HOSTNAME = "127.0.0.1";

  require(path.join(standaloneRoot, "server.js"));

  const url = `http://127.0.0.1:${port}`;

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

  return { url: PRODUCTION_URL, mode: "production" };
}

function createWindow(url) {
  const window = new BrowserWindow({
    width: 1340,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#21005D",
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

  // Anything that leaves our origin opens in the default browser (Google
  // sign-in, password-reset links, docs) instead of a new Electron window.
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (new URL(target).origin !== origin) {
      shell.openExternal(target);
      return { action: "deny" };
    }

    return { action: "allow" };
  });

  window.webContents.on("will-navigate", (event, target) => {
    if (new URL(target).origin !== origin) {
      event.preventDefault();
      shell.openExternal(target);
    }
  });

  window.webContents.on("did-fail-load", (_event, code, description) => {
    console.error(`[desktop] load failed: ${code} ${description}`);
  });

  window.loadURL(url);

  if (SMOKE_TEST) {
    window.webContents.once("did-finish-load", () => {
      console.log(`SMOKE_OK mode=${new URL(url).hostname}`);
      app.exit(0);
    });

    window.webContents.once("did-fail-load", (_event, code) => {
      console.error(`SMOKE_FAIL ${code}`);
      app.exit(1);
    });

    // Never hang a CI run on a slow network.
    setTimeout(() => {
      console.error("SMOKE_FAIL timeout");
      app.exit(1);
    }, 60_000);
  }

  return window;
}

app.whenReady().then(async () => {
  const { url, mode } = await resolveUrl();

  console.log(`[desktop] loading ${url} (${mode})`);
  createWindow(url);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(url);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

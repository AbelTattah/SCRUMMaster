// Builds the web app as a Next.js standalone server for the desktop bundle
// and assembles the folder Electron (and electron-builder) expect.
//
//   npm run build:desktop
//
// Afterwards: cd desktop && npm start
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

console.log("→ next build (DESKTOP_BUILD=1, output: standalone)");

const build = spawnSync("npx", ["next", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DESKTOP_BUILD: "1" },
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

// The standalone server needs the static chunks and public files next to it
// (see the Next.js self-hosting docs).
const standalone = path.join(root, ".next", "standalone");

fs.cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), {
  recursive: true,
});
fs.cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });

console.log(`✓ standalone bundle ready at ${path.relative(root, standalone)}`);
console.log("  next: cd desktop && npm start");

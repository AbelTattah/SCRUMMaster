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

// Turbopack traces external packages as relative symlinks (e.g. nodemailer).
// electron-builder copies links verbatim and 7-Zip then fails on them, so
// every link inside the bundle is replaced with a real copy of its target.
function dereferenceLinks(dir) {
  let fixed = 0;

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isSymbolicLink()) {
        const target = path.resolve(path.dirname(full), fs.readlinkSync(full));

        fs.rmSync(full, { force: true });

        if (fs.existsSync(target)) {
          fs.cpSync(target, full, { recursive: true, dereference: true });
          fixed += 1;
        }
        continue;
      }

      if (entry.isDirectory()) {
        walk(full);
      }
    }
  }

  walk(dir);
  return fixed;
}

const links = dereferenceLinks(standalone);
console.log(`✓ dereferenced ${links} symlink(s) in the bundle`);

console.log(`✓ standalone bundle ready at ${path.relative(root, standalone)}`);
console.log("  next: cd desktop && npm start");

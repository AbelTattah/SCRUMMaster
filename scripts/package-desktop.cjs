// Packages the desktop app with retries: Windows Defender intermittently
// locks the freshly built uninstaller NSIS executes mid-build, which surfaces
// as electron-builder's "spawn UNKNOWN". Cleaning dist and retrying works.
//
//   npm run dist:desktop
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const desktop = path.join(root, "desktop");
const dist = path.join(desktop, "dist");
const MAX_ATTEMPTS = 4;

function run(command) {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: desktop,
      stdio: "inherit",
      shell: true,
      windowsHide: true,
    });

    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.log(`\n=== packaging attempt ${attempt}/${MAX_ATTEMPTS} ===`);

    const code = await run("npm run dist:win");

    if (code === 0) {
      console.log("✓ desktop app packaged");
      process.exit(0);
    }

    fs.rmSync(dist, { recursive: true, force: true });
    await sleep(5000);
  }

  console.error(`✗ packaging failed after ${MAX_ATTEMPTS} attempts`);
  process.exit(1);
}

main();

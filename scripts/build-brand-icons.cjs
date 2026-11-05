// Builds the brand icon set from the assets in /public:
//   public/favicon.png (S-mark) → PWA tiles, apple icon, desktop icon + .ico
//   public/logo.png (wordmark) → public/logo-wordmark.png (margins trimmed)
//
// Requires sharp (devDependency): npm install
const sharp = require("sharp");
const path = require("node:path");
const fs = require("node:fs");

const root = path.join(__dirname, "..");
const MARK = path.join(root, "public", "favicon.png");
const LOGO = path.join(root, "public", "logo.png");

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

function fit(width, height, box) {
  const scale = Math.min(box / width, box / height);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The mark, scaled into `fillRatio` of the square and centred on `background`. */
async function tile(size, fillRatio, background) {
  const meta = await sharp(MARK).metadata();
  const box = Math.round(size * fillRatio);
  const { width, height } = fit(meta.width, meta.height, box);
  const left = Math.round((size - width) / 2);
  const top = Math.round((size - height) / 2);

  return sharp(MARK)
    .resize(width, height)
    .extend({
      top,
      left,
      bottom: size - height - top,
      right: size - width - left,
      background,
    })
    .png()
    .toBuffer();
}

/** ICO container with a single embedded PNG (valid since Windows Vista). */
function encodeIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // 0 means 256
  entry[1] = size >= 256 ? 0 : size;
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12); // offset: header (6) + entry (16)

  return Buffer.concat([header, entry, pngBuffer]);
}

async function main() {
  const outputs = [
    // Desktop: the mark on a transparent square (exe / tray / toast icon).
    ["desktop/assets/icon.png", await tile(512, 0.88, TRANSPARENT)],
    // PWA tiles: opaque so launchers and masks composite predictably.
    ["public/icons/icon-192.png", await tile(192, 0.74, WHITE)],
    ["public/icons/icon-512.png", await tile(512, 0.74, WHITE)],
    ["public/icons/maskable-512.png", await tile(512, 0.6, WHITE)], // safe zone
    ["public/icons/apple-touch-icon.png", await tile(180, 0.66, WHITE)],
  ];

  for (const [relative, buffer] of outputs) {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, buffer);

    const meta = await sharp(buffer).metadata();
    console.log(`${relative}: ${meta.width}x${meta.height}, ${(buffer.length / 1024).toFixed(1)} KB`);
  }

  const ico = encodeIco(await tile(256, 0.88, TRANSPARENT), 256);
  fs.writeFileSync(path.join(root, "desktop", "assets", "icon.ico"), ico);
  console.log(`desktop/assets/icon.ico: ${(ico.length / 1024).toFixed(1)} KB`);

  const wordmark = await sharp(LOGO)
    .trim({ background: TRANSPARENT })
    .extend({ top: 4, bottom: 4, left: 6, right: 6, background: TRANSPARENT })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(root, "public", "logo-wordmark.png"), wordmark);

  const meta = await sharp(wordmark).metadata();
  console.log(`public/logo-wordmark.png: ${meta.width}x${meta.height}, ${(wordmark.length / 1024).toFixed(1)} KB`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Generates the PWA icon set in pure Node (no image dependencies):
//   public/icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
//
// Design: KPIMe/Scrum Master purple tile, white checkmark, amber notification
// dot — matching the app shell (#21005D / #E0A606).
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

// ---------------------------------------------------------------- PNG writer

const CRC_TABLE = (() => {
  const table = new Int32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  return table;
})();

function crc32(buffer) {
  let crc = -1;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Each scanline is prefixed with filter type 0 (none).
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- drawing

const PURPLE_TOP = [46, 4, 128]; // #2E0480
const PURPLE_BOTTOM = [22, 0, 67]; // #160043
const PURPLE_MID = [33, 0, 93]; // #21005D
const WHITE = [255, 255, 255];
const AMBER = [224, 166, 6]; // #E0A606

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Coverage of a rounded rectangle at (x, y): 1 inside, 0 outside. */
function roundedRectCoverage(x, y, left, top, right, bottom, radius) {
  const cx = Math.max(left + radius, Math.min(right - radius, x));
  const cy = Math.max(top + radius, Math.min(bottom - radius, y));
  const distance = Math.hypot(x - cx, y - cy) - radius;

  return Math.max(0, Math.min(1, 0.5 - distance));
}

/** Coverage of a thick line segment. */
function segmentCoverage(x, y, ax, ay, bx, by, halfWidth) {
  const vx = bx - ax;
  const vy = by - ay;
  const lengthSquared = vx * vx + vy * vy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / lengthSquared));
  const distance = Math.hypot(x - (ax + vx * t), y - (ay + vy * t)) - halfWidth;

  return Math.max(0, Math.min(1, 0.5 - distance));
}

function circleCoverage(x, y, cx, cy, radius) {
  return Math.max(0, Math.min(1, 0.5 - (Math.hypot(x - cx, y - cy) - radius)));
}

function renderIcon(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4);

  // Content is inset inside the maskable safe zone (a centred circle of ~80%).
  const inset = maskable ? size * 0.14 : size * 0.06;
  const box = size - inset * 2;
  const radius = maskable ? 0 : box * 0.22;

  // Checkmark geometry, in box-relative units.
  const check = [
    [inset + box * 0.28, inset + box * 0.53],
    [inset + box * 0.45, inset + box * 0.7],
    [inset + box * 0.74, inset + box * 0.34],
  ];
  const halfWidth = box * 0.075;

  const dot = {
    x: inset + box * 0.76,
    y: inset + box * 0.26,
    r: box * 0.11,
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;

      let base;
      if (maskable) {
        // Full-bleed background for maskable icons.
        base = mix(PURPLE_MID, PURPLE_BOTTOM, y / size);
      } else {
        const coverage = roundedRectCoverage(px, py, inset, inset, size - inset, size - inset, radius);
        if (coverage <= 0) {
          continue; // transparent corner
        }
        base = mix(PURPLE_TOP, PURPLE_BOTTOM, (py - inset) / box);
      }

      // Soft highlight sweep from the top-left.
      const glow = Math.max(0, 1 - Math.hypot(px - size * 0.28, py - size * 0.18) / (size * 0.9));
      let color = mix(base, PURPLE_TOP, glow * 0.35);

      // Amber dot behind a white ring.
      const ring = circleCoverage(px, py, dot.x, dot.y, dot.r + box * 0.035);
      const dotFill = circleCoverage(px, py, dot.x, dot.y, dot.r);
      color = mix(color, WHITE, ring * (1 - dotFill));
      color = mix(color, AMBER, dotFill);

      // White checkmark on top.
      const c1 = segmentCoverage(px, py, check[0][0], check[0][1], check[1][0], check[1][1], halfWidth);
      const c2 = segmentCoverage(px, py, check[1][0], check[1][1], check[2][0], check[2][1], halfWidth);
      const checkCoverage = Math.max(c1, c2);
      color = mix(color, WHITE, checkCoverage);

      const alpha = maskable ? 255 : Math.round(255 * roundedRectCoverage(px, py, inset, inset, size - inset, size - inset, radius));
      const offset = (y * size + x) * 4;
      rgba[offset] = color[0];
      rgba[offset + 1] = color[1];
      rgba[offset + 2] = color[2];
      rgba[offset + 3] = alpha;
    }
  }

  return encodePng(size, size, rgba);
}

// ---------------------------------------------------------------------- main

/** ICO container with a single embedded 256px PNG (valid since Vista). */
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

const outDir = path.join(__dirname, "..", "public", "icons");
const desktopAssets = path.join(__dirname, "..", "desktop", "assets");

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(desktopAssets, { recursive: true });

const icon512 = renderIcon(512, { maskable: false });

const targets = [
  ["icon-192.png", renderIcon(192, { maskable: false })],
  ["icon-512.png", icon512],
  ["maskable-512.png", renderIcon(512, { maskable: true })],
  ["apple-touch-icon.png", renderIcon(180, { maskable: true })],
];

for (const [name, buffer] of targets) {
  fs.writeFileSync(path.join(outDir, name), buffer);

  // Sanity: read the IHDR back so a bad write is caught immediately.
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  console.log(`${name}: ${width}x${height}, ${(buffer.length / 1024).toFixed(1)} KB`);
}

// Desktop shell (Electron) copies of the same mark.
fs.writeFileSync(path.join(desktopAssets, "icon.png"), icon512);
fs.writeFileSync(path.join(desktopAssets, "icon.ico"), encodeIco(renderIcon(256, { maskable: false }), 256));
console.log("desktop/assets/icon.png + icon.ico written");

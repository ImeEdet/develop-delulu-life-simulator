/**
 * Generates Delulu Life PWA icons with zero dependencies.
 * Run: npm run icons
 * Draws a dusk gradient tile with a cream serif-style "D" monogram.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

// ---- CRC32 + PNG chunk encoding -------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- Drawing ---------------------------------------------------------------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const CREAM = hex("#f4efff");
const PINK = hex("#ff5fa2");
const GOLD = hex("#ffb054");
const MINT = hex("#5ce8a9");

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// 7x7 bitmap for "D"
const D_GLYPH = [
  [1, 1, 1, 1, 0, 0, 0],
  [1, 0, 0, 0, 1, 0, 0],
  [1, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0, 0],
  [1, 1, 1, 1, 0, 0, 0],
];

function draw(size, { maskable = false, rounded = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const top = hex("#2e1c58");
  const bottom = hex("#15102a");
  const radius = rounded ? size * 0.18 : 0;
  const setPx = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = a;
  };
  const inCorner = (x, y) => {
    if (!rounded) return false;
    const cx = x < radius ? radius : x > size - radius ? size - radius : null;
    const cy = y < radius ? radius : y > size - radius ? size - radius : null;
    if (cx === null || cy === null) return false;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy > radius * radius;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inCorner(x, y)) {
        setPx(x, y, [0, 0, 0], 0);
        continue;
      }
      const tY = y / size;
      let col = mix(top, bottom, tY);
      // pink glow, upper right
      const dxP = (x - size * 0.82) / size;
      const dyP = (y - size * 0.12) / size;
      const glowP = Math.max(0, 1 - Math.sqrt(dxP * dxP + dyP * dyP) * 2.2);
      col = mix(col, PINK, glowP * 0.35);
      // mint glow, lower left
      const dxM = (x - size * 0.12) / size;
      const dyM = (y - size * 0.88) / size;
      const glowM = Math.max(0, 1 - Math.sqrt(dxM * dxM + dyM * dyM) * 2.4);
      col = mix(col, MINT, glowM * 0.22);
      setPx(x, y, col);
    }
  }
  // tiny gold star, upper left
  const starX = Math.round(size * 0.2);
  const starY = Math.round(size * 0.2);
  const starR = Math.max(1, Math.round(size * 0.02));
  for (let y = -starR * 2; y <= starR * 2; y++) {
    for (let x = -starR * 2; x <= starR * 2; x++) {
      if (Math.abs(x) + Math.abs(y) <= starR * 2) setPx(starX + x, starY + y, GOLD);
    }
  }
  // the monogram
  const glyphScale = maskable ? Math.round(size / 14) : Math.round(size / 11);
  const glyphW = 7 * glyphScale;
  const glyphH = 7 * glyphScale;
  const ox = Math.round((size - glyphW) / 2);
  const oy = Math.round((size - glyphH) / 2);
  for (let gy = 0; gy < 7; gy++) {
    for (let gx = 0; gx < 7; gx++) {
      if (!D_GLYPH[gy][gx]) continue;
      for (let y = 0; y < glyphScale; y++) {
        for (let x = 0; x < glyphScale; x++) {
          setPx(ox + gx * glyphScale + x, oy + gy * glyphScale + y, CREAM);
        }
      }
    }
  }
  return encodePng(size, size, rgba);
}

const targets = [
  { name: "favicon-32.png", size: 32, opts: { rounded: true } },
  { name: "apple-touch-icon-180.png", size: 180, opts: {} },
  { name: "icon-192.png", size: 192, opts: { rounded: true } },
  { name: "icon-512.png", size: 512, opts: { rounded: true } },
  { name: "maskable-512.png", size: 512, opts: { maskable: true } },
];

for (const t of targets) {
  writeFileSync(join(OUT, t.name), draw(t.size, t.opts));
  console.log("wrote", t.name);
}

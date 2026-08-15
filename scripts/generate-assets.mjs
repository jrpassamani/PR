// Gera os assets do app (PNG) sem dependências externas: encoder PNG puro.
// Identidade visual: relógio (horas do serviço) sobre verde profundo.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'assets');
fs.mkdirSync(OUT, { recursive: true });

const GREEN = [11, 61, 46, 255]; // #0B3D2E
const ACCENT = [34, 197, 94, 255]; // #22C55E
const WHITE = [255, 255, 255, 255];

// ---- encoder PNG (RGBA, 8 bits) ------------------------------------------
const CRC_TABLE = (() => {
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
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- desenho --------------------------------------------------------------
function canvas(w, h, bg) {
  const buf = Buffer.alloc(w * h * 4);
  if (bg) for (let i = 0; i < w * h; i++) buf.set(bg, i * 4);
  return buf;
}
function blend(buf, w, x, y, color, a = 1) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  if (i < 0 || i + 3 >= buf.length) return;
  const inv = 1 - a;
  buf[i] = color[0] * a + buf[i] * inv;
  buf[i + 1] = color[1] * a + buf[i + 1] * inv;
  buf[i + 2] = color[2] * a + buf[i + 2] * inv;
  buf[i + 3] = Math.max(buf[i + 3], color[3] * a);
}
function ring(buf, w, h, cx, cy, rOuter, thickness, color) {
  const rInner = rOuter - thickness;
  const x0 = Math.max(0, Math.floor(cx - rOuter - 1));
  const x1 = Math.min(w, Math.ceil(cx + rOuter + 1));
  const y0 = Math.max(0, Math.floor(cy - rOuter - 1));
  const y1 = Math.min(h, Math.ceil(cy + rOuter + 1));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const a = Math.min(1, rOuter - d + 0.5) * Math.min(1, d - rInner + 0.5);
      if (a > 0) blend(buf, w, x, y, color, Math.max(0, Math.min(1, a)));
    }
}
function disc(buf, w, h, cx, cy, r, color) {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const a = Math.min(1, r - d + 0.5);
      if (a > 0) blend(buf, w, x, y, color, Math.max(0, Math.min(1, a)));
    }
}
function hand(buf, w, h, cx, cy, clockPos, length, thickness, color) {
  const ang = (clockPos / 12) * Math.PI * 2;
  const ex = cx + Math.sin(ang) * length;
  const ey = cy - Math.cos(ang) * length;
  const half = thickness / 2;
  const x0 = Math.max(0, Math.floor(Math.min(cx, ex) - half - 1));
  const x1 = Math.min(w, Math.ceil(Math.max(cx, ex) + half + 1));
  const y0 = Math.max(0, Math.floor(Math.min(cy, ey) - half - 1));
  const y1 = Math.min(h, Math.ceil(Math.max(cy, ey) + half + 1));
  const dx = ex - cx, dy = ey - cy;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      let t = ((x + 0.5 - cx) * dx + (y + 0.5 - cy) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = cx + t * dx, py = cy + t * dy;
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      const a = Math.min(1, half - d + 0.5);
      if (a > 0) blend(buf, w, x, y, color, Math.max(0, Math.min(1, a)));
    }
}
function clock(buf, w, h, cx, cy, size, color, accent) {
  ring(buf, w, h, cx, cy, size * 0.34, size * 0.052, color);
  hand(buf, w, h, cx, cy, 10, size * 0.15, size * 0.032, color); // hora → 10
  hand(buf, w, h, cx, cy, 2, size * 0.23, size * 0.026, accent); // minuto → 2
  disc(buf, w, h, cx, cy, size * 0.028, color);
}

function write(name, w, h, bg) {
  const buf = canvas(w, h, bg);
  const size = Math.min(w, h);
  clock(buf, w, h, w / 2, h / 2, size, WHITE, ACCENT);
  fs.writeFileSync(path.join(OUT, name), encodePNG(w, h, buf));
  console.log('  •', name, `${w}x${h}`);
}

console.log('Gerando assets em', OUT);
write('icon.png', 1024, 1024, GREEN); // ícone principal
write('adaptive-icon.png', 1024, 1024, null); // foreground (bg vem do app.json)
write('splash.png', 1284, 1284, GREEN); // splash
write('favicon.png', 48, 48, GREEN); // web
console.log('OK');

/*
 * 开发用预览：纯 Node 软件光栅器（无依赖），把十二幅剑意图渲染成 preview.png。
 * 仅实现 SwordInk.render 用到的 2D 上下文子集：save/restore/translate/rotate、
 * beginPath/moveTo/lineTo/closePath/fill/stroke/arc/fillRect + 2x 超采样。
 */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const SwordInk = require('./sword-ink.js');

/* ---------- 颜色解析 ---------- */
function parseColor(c) {
  if (c[0] === '#') {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(c);
  return [+m[1], +m[2], +m[3]];
}

/* ---------- 软光栅画布 ---------- */
class SoftCtx {
  constructor(W, H, scale) {
    this.W = W; this.H = H; this.S = scale;
    this.buf = new Float32Array(W * H * 3);
    this.ctm = [scale, 0, 0, scale, 0, 0];
    this.stack = [];
    this.path = [];
    this.fillStyle = '#000'; this.strokeStyle = '#000';
    this.globalAlpha = 1; this.lineWidth = 1;
    this.lineCap = 'butt'; this.lineJoin = 'miter';
  }
  save() { this.stack.push(this.ctm.slice()); }
  restore() { if (this.stack.length) this.ctm = this.stack.pop(); }
  translate(tx, ty) {
    const [a, b, c, d, e, f] = this.ctm;
    this.ctm = [a, b, c, d, a * tx + c * ty + e, b * tx + d * ty + f];
  }
  rotate(r) {
    const cos = Math.cos(r), sin = Math.sin(r);
    const [a, b, c, d, e, f] = this.ctm;
    this.ctm = [a * cos + c * sin, b * cos + d * sin, -a * sin + c * cos, -b * sin + d * cos, e, f];
  }
  xf(x, y) {
    const [a, b, c, d, e, f] = this.ctm;
    return [a * x + c * y + e, b * x + d * y + f];
  }
  get scaleF() { return Math.hypot(this.ctm[0], this.ctm[1]); }

  beginPath() { this.path = []; }
  moveTo(x, y) { this.path.push({ pts: [this.xf(x, y)], closed: false }); }
  lineTo(x, y) {
    const sub = this.path[this.path.length - 1];
    sub.pts.push(this.xf(x, y));
  }
  closePath() { this.path[this.path.length - 1].closed = true; }
  arc(x, y, r) {
    const [cx, cy] = this.xf(x, y);
    this.path.push({ circle: [cx, cy, r * this.scaleF] });
  }
  fillRect(x, y, w, h) {
    const p = [this.xf(x, y), this.xf(x + w, y), this.xf(x + w, y + h), this.xf(x, y + h)];
    this.fillPoly(p, parseColor(this.fillStyle), this.globalAlpha);
  }
  fill() {
    const col = parseColor(this.fillStyle);
    for (const sub of this.path) {
      if (sub.circle) this.disc(sub.circle[0], sub.circle[1], sub.circle[2], col, this.globalAlpha);
      else this.fillPoly(sub.pts, col, this.globalAlpha);
    }
  }
  stroke() {
    const col = parseColor(this.strokeStyle);
    const lw = this.lineWidth * this.scaleF;
    for (const sub of this.path) {
      if (sub.circle) { this.ring(sub.circle[0], sub.circle[1], sub.circle[2], lw, col, this.globalAlpha); continue; }
      // 同一子路径：覆盖率先取并集（max），最后一次合成，避免接缝处重复叠加
      const scratch = this._scratch || (this._scratch = new Float32Array(this.W * this.H));
      const touched = [];
      const pts = sub.pts;
      const n = pts.length;
      const last = sub.closed ? n : n - 1;
      for (let i = 0; i < last; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        this.segCover(a[0], a[1], b[0], b[1], lw, scratch, touched);
      }
      for (const idx of touched) {
        const x = idx % this.W, y = (idx / this.W) | 0;
        this.plot(x, y, col, this.globalAlpha * scratch[idx]);
        scratch[idx] = 0;
      }
    }
  }

  segCover(x0, y0, x1, y1, lw, scratch, touched) {
    const r = lw / 2;
    const minx = Math.max(0, Math.floor(Math.min(x0, x1) - r - 1));
    const maxx = Math.min(this.W - 1, Math.ceil(Math.max(x0, x1) + r + 1));
    const miny = Math.max(0, Math.floor(Math.min(y0, y1) - r - 1));
    const maxy = Math.min(this.H - 1, Math.ceil(Math.max(y0, y1) + r + 1));
    const dx = x1 - x0, dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      let t = len2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
      const cov = Math.min(1, Math.max(0, r + 0.5 - d));
      if (cov > 0) {
        const idx = y * this.W + x;
        if (scratch[idx] === 0) touched.push(idx);
        if (cov > scratch[idx]) scratch[idx] = cov;
      }
    }
  }

  plot(x, y, col, a) {
    if (a <= 0 || x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    const i = (y * this.W + x) * 3;
    this.buf[i] = col[0] * a + this.buf[i] * (1 - a);
    this.buf[i + 1] = col[1] * a + this.buf[i + 1] * (1 - a);
    this.buf[i + 2] = col[2] * a + this.buf[i + 2] * (1 - a);
  }
  disc(cx, cy, r, col, alpha) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(this.W - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(this.H - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const cov = Math.min(1, Math.max(0, r + 0.5 - d));
      if (cov > 0) this.plot(x, y, col, alpha * cov);
    }
  }
  ring(cx, cy, r, lw, col, alpha) {
    const R = r + lw / 2 + 1;
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(this.W - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(this.H - 1, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r);
      const cov = Math.min(1, Math.max(0, lw / 2 + 0.5 - d));
      if (cov > 0) this.plot(x, y, col, alpha * cov);
    }
  }
  thickSeg(x0, y0, x1, y1, lw, col, alpha) {
    const r = lw / 2;
    const minx = Math.max(0, Math.floor(Math.min(x0, x1) - r - 1));
    const maxx = Math.min(this.W - 1, Math.ceil(Math.max(x0, x1) + r + 1));
    const miny = Math.max(0, Math.floor(Math.min(y0, y1) - r - 1));
    const maxy = Math.min(this.H - 1, Math.ceil(Math.max(y0, y1) + r + 1));
    const dx = x1 - x0, dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      let t = len2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
      const cov = Math.min(1, Math.max(0, r + 0.5 - d));
      if (cov > 0) this.plot(x, y, col, alpha * cov);
    }
  }
  fillPoly(pts, col, alpha) {
    if (pts.length < 3) return;
    let yMin = Infinity, yMax = -Infinity;
    for (const p of pts) { if (p[1] < yMin) yMin = p[1]; if (p[1] > yMax) yMax = p[1]; }
    const y0 = Math.max(0, Math.floor(yMin)), y1 = Math.min(this.H - 1, Math.ceil(yMax));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const yi = pts[i][1], yj = pts[j][1];
        if ((yi <= yc && yj > yc) || (yj <= yc && yi > yc)) {
          xs.push(pts[i][0] + ((yc - yi) / (yj - yi)) * (pts[j][0] - pts[i][0]));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(this.W - 1, Math.round(xs[k + 1]));
        for (let x = xa; x <= xb; x++) this.plot(x, y, col, alpha);
      }
    }
  }
  downsample() {
    const S = this.S, W = this.W / S, H = this.H / S;
    const out = new Uint8Array(W * H * 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const i = ((y * S + sy) * this.W + x * S + sx) * 3;
        r += this.buf[i]; g += this.buf[i + 1]; b += this.buf[i + 2];
      }
      const o = (y * W + x) * 3, n = S * S;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
    }
    return { data: out, W, H };
  }
}

/* ---------- PNG 编码（zlib + 手写 CRC32） ---------- */
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
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(rgb, W, H) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8bit RGB
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- 渲染十二幅并拼图 ---------- */
const CW = 400, CH = 520, GAP = 10, COLS = 4;
const ROWS = Math.ceil(SwordInk.SWORDS.length / COLS);
const sheetW = COLS * CW + (COLS + 1) * GAP;
const sheetH = ROWS * CH + (ROWS + 1) * GAP;
const sheet = new Uint8Array(sheetW * sheetH * 3);
for (let i = 0; i < sheet.length; i += 3) { sheet[i] = 0xe6; sheet[i + 1] = 0xdf; sheet[i + 2] = 0xcd; }

const variant = parseInt(process.argv[2] || '0', 10);
SwordInk.SWORDS.forEach((s, i) => {
  const ctx = new SoftCtx(CW * 2, CH * 2, 2);
  const t0 = process.hrtime.bigint();
  const fp = SwordInk.render(ctx, CW, CH, i, variant);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const img = ctx.downsample();
  const ox = GAP + (i % COLS) * (CW + GAP), oy = GAP + Math.floor(i / COLS) * (CH + GAP);
  for (let y = 0; y < CH; y++) {
    Buffer.from(img.data.buffer, y * CW * 3, CW * 3).copy(sheet, ((oy + y) * sheetW + ox) * 3);
  }
  console.log(`${s.name}  意${variant}  指纹 pts=${fp.pts} ink=${fp.ink} bbox=[${fp.bbox}]  软光栅 ${ms.toFixed(0)}ms`);
});

const out = path.join(__dirname, 'preview.png');
fs.writeFileSync(out, encodePNG(sheet, sheetW, sheetH));
console.log('\nwritten:', out, `${sheetW}x${sheetH}`);

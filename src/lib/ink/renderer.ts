/**
 * 剑意图 · Canvas 渲染层
 * ------------------------------------------------------------
 * 仅使用原生 Canvas 2D API：
 *   · 所有线条均以“中点二次贝塞尔”手写平滑（手绘笔意）
 *   · 带状笔触沿噪声半宽生成左右轮廓 → 噪声边缘
 *   · 飞白用 destination-out 沿锋面挖丝
 *   · 宣纸纹理由纤维 / 颗粒 / 云版 / 毛边四层程序生成
 * 不引入任何图形库、噪声库；随机全部来自 rng.ts（无 Math.random）。
 */

import { Rng, hash2 } from './rng';
import type { Painting, Stroke, InkBlob } from './types';

interface Pt {
  x: number; y: number;
}

// ---------------------------------------------------------------------------
// 画布初始化（按设备像素比缩放，上限 2 以免高分屏过载）
// ---------------------------------------------------------------------------

export interface CanvasCtx {
  ctx: CanvasRenderingContext2D;
  /** 纸坐标正方形的边长（CSS 像素） */
  s: number;
  ox: number;
  oy: number;
  dpr: number;
  w: number;
  h: number;
}

export function setupCanvas(canvas: HTMLCanvasElement): CanvasCtx | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const s = Math.min(w, h);
  return { ctx, s, ox: (w - s) / 2, oy: (h - s) / 2, dpr, w, h };
}

/** 进入 NDC 纸坐标（0..1 的正方形） */
function enterNDC(c: CanvasCtx): void {
  c.ctx.setTransform(c.dpr * c.s, 0, 0, c.dpr * c.s, c.dpr * c.ox, c.dpr * c.oy);
}

// ---------------------------------------------------------------------------
// 颜色与路径
// ---------------------------------------------------------------------------

function inkColor(tone: number, alpha: number, dye: 'ink' | 'cinnabar' = 'ink'): string {
  const t = Math.max(0, Math.min(1, tone));
  if (dye === 'cinnabar') {
    return `rgba(160,44,36,${alpha})`;
  }
  // 焦墨近黑带暖，淡墨偏灰
  const g = 18 + (1 - t) * 150;
  return `rgba(${Math.round(g + 7)},${Math.round(g + 2)},${Math.max(0, Math.round(g - 10))},${alpha})`;
}

/** 中点二次贝塞尔折线（手写平滑） */
function smoothPath(ctx: CanvasRenderingContext2D, pts: Pt[], close = false): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
  if (close) ctx.closePath();
}

function normals(pts: Pt[]): Pt[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // 左法向
    return { x: -dy / len, y: dx / len };
  });
}

// ---------------------------------------------------------------------------
// 宣纸（每剑一张，换笔意不重画）
// ---------------------------------------------------------------------------

export function renderPaper(canvas: HTMLCanvasElement, p: Painting): number {
  const c = setupCanvas(canvas);
  if (!c) return 0;
  const t0 = performance.now();
  const { ctx } = c;

  // 底纸：做旧宣色（渐变在设备像素空间定义并填充，再进入 NDC）
  const grad = ctx.createLinearGradient(0, 0, c.w * c.dpr, c.h * c.dpr);
  grad.addColorStop(0, '#f5efdd');
  grad.addColorStop(0.55, '#f1ead5');
  grad.addColorStop(1, '#e9e0c8');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.w * c.dpr, c.h * c.dpr);
  enterNDC(c);

  const rng = new Rng(p.paperSeed);

  // 云版（若隐若现的淡墨晕，两层）
  for (let k = 0; k < 2; k++) {
    const bx = rng.range(0.15, 0.85);
    const by = rng.range(0.15, 0.85);
    const br = rng.range(0.25, 0.42);
    ctx.fillStyle = `rgba(90,82,64,${0.025 + rng.next() * 0.02})`;
    blobPath(ctx, bx, by, br, ring(rng));
    ctx.fill();
  }

  // 纸纤维：按透明度分四笔批量勾
  const fiberRng = new Rng(p.paperSeed ^ 0xf1be);
  for (let bucket = 0; bucket < 4; bucket++) {
    ctx.beginPath();
    const alpha = 0.05 + bucket * 0.035;
    const count = 60;
    for (let i = 0; i < count; i++) {
      const x = fiberRng.range(-0.02, 1.02);
      const y = fiberRng.range(-0.02, 1.02);
      const ang = fiberRng.range(0, Math.PI);
      const len = fiberRng.range(0.015, 0.07);
      const nx = x + Math.cos(ang) * len;
      const ny = y + Math.sin(ang) * len * 0.4;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo((x + nx) / 2 + fiberRng.range(-0.004, 0.004), (y + ny) / 2, nx, ny);
    }
    ctx.strokeStyle = `rgba(86,76,56,${alpha})`;
    ctx.lineWidth = 0.0007 + bucket * 0.00025;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // 颗粒 / 墨点砂眼（单路径批量填充）
  const specRng = new Rng(p.paperSeed ^ 0x5ec);
  ctx.beginPath();
  for (let i = 0; i < 130; i++) {
    const x = specRng.range(0, 1);
    const y = specRng.range(0, 1);
    const r = specRng.range(0.0008, 0.0024);
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = 'rgba(64,54,38,0.14)';
  ctx.fill();

  // 毛边：四周一圈不均匀的旧色
  const edgeRng = new Rng(p.paperSeed ^ 0xed6e);
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(120,104,72,${0.05 + i * 0.02})`;
    ctx.lineWidth = 0.012;
    ctx.strokeRect(
      edgeRng.range(-0.004, 0.004),
      edgeRng.range(-0.004, 0.004),
      1 + edgeRng.range(-0.008, 0.008),
      1 + edgeRng.range(-0.008, 0.008),
    );
  }

  // 背景洇墨团：多层同心淡铺 → 边缘洇开 + 中心积墨
  for (const blob of p.blobs) {
    drawInkBlob(ctx, blob);
  }

  return performance.now() - t0;
}

function ring(rng: Rng): number[] {
  const seg = 24;
  const out: number[] = [];
  const phase = rng.range(0, Math.PI * 2);
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    out.push(
      Math.max(
        0.55,
        1 +
          0.15 * Math.sin(a * 3 + phase) +
          0.09 * Math.sin(a * 5 + phase * 1.7) +
          rng.range(-0.05, 0.05),
      ),
    );
  }
  return out;
}

function blobPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rr: number[]): void {
  const pts: Pt[] = rr.map((m, i) => {
    const a = (i / rr.length) * Math.PI * 2;
    return { x: x + Math.cos(a) * r * m, y: y + Math.sin(a) * r * m };
  });
  smoothPath(ctx, pts, true);
}

function drawInkBlob(ctx: CanvasRenderingContext2D, blob: InkBlob): void {
  // 洇开：由外向内四层淡墨，边缘多层轻铺（真实宣纸渗墨靠多次叠加）
  const layers = [
    { mul: 1.5, a: 0.1 },
    { mul: 1.12, a: 0.14 },
    { mul: 0.78, a: 0.18 },
    { mul: 0.5, a: 0.22 },
  ];
  for (const L of layers) {
    const rr = blob.ring.map((m) => 0.55 + m * L.mul * 0.45);
    ctx.fillStyle = `rgba(46,43,38,${blob.alpha * L.a * 2.2})`;
    blobPath(ctx, blob.x, blob.y, blob.r * L.mul, rr);
    ctx.fill();
  }
  // 中心仅一点积墨，比边缘略深
  ctx.beginPath();
  ctx.arc(blob.x, blob.y, blob.r * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(30,28,25,${Math.min(0.22, blob.alpha * 0.9)})`;
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 前景笔触
// ---------------------------------------------------------------------------

export function renderForeground(canvas: HTMLCanvasElement, p: Painting): number {
  const c = setupCanvas(canvas);
  if (!c) return 0;
  const t0 = performance.now();
  const { ctx } = c;
  enterNDC(c);
  ctx.clearRect(-0.2, -0.2, 1.4, 1.4);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const st of p.strokes) {
    if (st.kind === 'ribbon') drawRibbon(ctx, st);
    else if (st.kind === 'line') drawLine(ctx, st);
    else drawSplat(ctx, st);
  }

  drawSeal(ctx, p);
  return performance.now() - t0;
}

function drawLine(ctx: CanvasRenderingContext2D, st: Stroke): void {
  smoothPath(ctx, st.pts);
  ctx.strokeStyle = inkColor(st.tone, st.alpha ?? 1, st.dye);
  ctx.lineWidth = st.w ?? 0.005;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawSplat(ctx: CanvasRenderingContext2D, st: Stroke): void {
  const p = st.pts[0];
  ctx.beginPath();
  ctx.arc(p.x, p.y, st.w ?? 0.005, 0, Math.PI * 2);
  ctx.fillStyle = inkColor(st.tone, st.alpha ?? 1, st.dye);
  ctx.fill();
}

function halfWidths(st: Stroke): { wl: number[]; wr: number[] } {
  if (st.wL && st.wR) return { wl: st.wL, wr: st.wR };
  const w = st.widths ?? st.pts.map(() => st.w ?? 0.01);
  return { wl: w, wr: w };
}

function ribbonOutline(st: Stroke): { left: Pt[]; right: Pt[]; ns: Pt[] } {
  const ns = normals(st.pts);
  const { wl, wr } = halfWidths(st);
  const left = st.pts.map((p, i) => ({ x: p.x + ns[i].x * wl[i], y: p.y + ns[i].y * wl[i] }));
  const right = st.pts.map((p, i) => ({ x: p.x - ns[i].x * wr[i], y: p.y - ns[i].y * wr[i] }));

  // 边缘缺刻：以缺刻点为中心做高斯式凹陷（±3 点平滑收束，不出现三角豁口）
  if (st.nicks) {
    for (const nk of st.nicks) {
      const center = Math.round(nk.along * (st.pts.length - 1));
      const arr = nk.side > 0 ? left : right;
      const widths = nk.side > 0 ? wl : wr;
      for (let i = Math.max(0, center - 3); i <= Math.min(st.pts.length - 1, center + 3); i++) {
        const d = (i - center) / 3;
        const fall = Math.exp(-d * d * 2.2);
        const c = st.pts[i];
        const p = arr[i];
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const k = Math.max(0.15, 1 - (nk.depth / (widths[i] || 1)) * fall);
        p.x = c.x + dx * k;
        p.y = c.y + dy * k;
      }
    }
  }
  return { left, right, ns };
}

/**
 * 带状轮廓：
 *  - tight=true（剑身/硬部件）用直线逐点连接，保留噪声毛边的笔触感；
 *  - tight=false（剑气/流苏等柔性飘带）用中点二次贝塞尔做顺滑曲线。
 */
function traceRibbon(
  ctx: CanvasRenderingContext2D,
  st: Stroke,
  wMul: number,
  tight = true,
): { left: Pt[]; right: Pt[]; ns: Pt[] } {
  const savedL = st.wL;
  const savedR = st.wR;
  const savedW = st.widths;
  if (wMul !== 1) {
    st.wL = savedL?.map((v) => v * wMul);
    st.wR = savedR?.map((v) => v * wMul);
    st.widths = savedW?.map((v) => v * wMul);
  }
  const { left, right, ns } = ribbonOutline(st);
  if (wMul !== 1) {
    st.wL = savedL;
    st.wR = savedR;
    st.widths = savedW;
  }
  const outline: Pt[] = left.concat([...right].reverse());
  if (tight) {
    ctx.beginPath();
    ctx.moveTo(outline[0].x, outline[0].y);
    for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i].x, outline[i].y);
    ctx.closePath();
  } else {
    smoothPath(ctx, outline, true);
  }
  return { left, right, ns };
}

/** 是否为柔性飘带（剑气 / 流苏），用顺滑曲线 */
function isSoftRibbon(st: Stroke): boolean {
  return st.z === 10 || st.z === 20;
}

/** 剑身：铺一圈极淡的湿墨外缘（仅约 12% 宽） */
function isBlade(st: Stroke): boolean {
  return st.z === 30;
}

function drawRibbon(ctx: CanvasRenderingContext2D, st: Stroke): void {
  const soft = isSoftRibbon(st);
  const blade = isBlade(st);

  // 湿晕
  if (st.wet && (soft || blade)) {
    ctx.save();
    if (soft) ctx.filter = 'blur(0.8px)'; // 极轻的纸面洇化（CSS 滤镜，非图形库）
    traceRibbon(ctx, st, blade ? 1.12 : 1.6, blade); // 剑身晕缘仍走硬边，飘带走顺边
    ctx.fillStyle = inkColor(
      st.tone * (blade ? 0.82 : 0.6),
      (st.alpha ?? 1) * 0.12 * (st.wet ?? 1),
      st.dye,
    );
    ctx.fill();
    ctx.restore();
  }

  // 主体（剑身等硬笔触：毛边直连；柔性：顺滑）
  const { ns } = traceRibbon(ctx, st, 1, !soft);
  ctx.fillStyle = inkColor(st.tone, st.alpha ?? 1, st.dye);
  ctx.fill();

  // 飞白：offset 是该处半宽的比例（-0.5..0.5），丝严格落在锋内
  if (st.feibai && st.feibai.length > 0) {
    const { wl, wr } = halfWidths(st);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    for (const f of st.feibai) {
      const pts: Pt[] = [];
      for (let i = f.i0; i <= f.i1; i++) {
        const p = st.pts[i];
        const n = ns[i];
        const halfW = (wl[i] + wr[i]) / 2;
        const phase = (i - f.i0) / Math.max(1, f.i1 - f.i0);
        const jitter =
          Math.sin(phase * Math.PI * 6 + f.seed * 1e-9) * f.w * 0.9 +
          (hash2(i, 3, f.seed) - 0.5) * f.w * 1.4;
        const off = (f.offset + jitter / Math.max(halfW, 1e-4)) * halfW;
        pts.push({ x: p.x + n.x * off, y: p.y + n.y * off });
      }
      // 紧贴剑身的干笔丝：硬笔触直连，保持丝缕顺直
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = `rgba(0,0,0,${f.alpha})`;
      ctx.lineWidth = f.w;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 钤印（编号朱印；不计入墨指纹）
// ---------------------------------------------------------------------------

function drawSeal(ctx: CanvasRenderingContext2D, p: Painting): void {
  const size = 0.052;
  const x = 0.86;
  const y = 0.885;
  const rng = new Rng(Math.round(hash2(7, 9, p.paperSeed) * 1e9));

  // 残边印面
  const pts: Pt[] = [];
  const n = 4;
  for (let e = 0; e < 4; e++) {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const j = (rng.next() - 0.5) * size * 0.12;
      let px = x;
      let py = y;
      if (e === 0) {
        px = x + size * t;
        py = y + j;
      } else if (e === 1) {
        px = x + size + j;
        py = y + size * t;
      } else if (e === 2) {
        px = x + size * (1 - t);
        py = y + size + j;
      } else {
        px = x + j;
        py = y + size * (1 - t);
      }
      pts.push({ x: px, y: py });
    }
  }
  smoothPath(ctx, pts, true);
  ctx.fillStyle = 'rgba(166,42,34,0.86)';
  ctx.fill();

  // 印面斑驳
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.arc(
      x + rng.next() * size,
      y + rng.next() * size,
      rng.range(0.0015, 0.004),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = `rgba(0,0,0,${rng.range(0.2, 0.6)})`;
    ctx.fill();
  }
  ctx.restore();

  // 编号（阳刻白文，阿拉伯数字避免冷僻字缺字）
  ctx.fillStyle = 'rgba(245,239,221,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const idStr = p.sword.id;
  ctx.font = `bold ${size * 0.62}px Georgia, "Times New Roman", serif`;
  ctx.fillText(idStr, x + size / 2, y + size / 2 + size * 0.03);
}

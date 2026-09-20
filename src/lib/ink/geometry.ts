/**
 * 剑意图 · 几何生成层（纯函数，无 DOM，无随机库）
 * ------------------------------------------------------------
 * 输入一柄剑（编号 + 四属性）与笔意编号，输出一幅画的完整笔触几何：
 *
 *   锋利度 sharpness     → 锋尖收束长度、飞白多少、边缘缺刻、点景数量
 *   硬度 hardness        → 墨色浓淡（inkDensity）
 *   韧性 flexibility     → 剑身弯曲、剑尖回锋勾、流苏摆幅、剑气曲度
 *   工艺 craftsmanship   → 剑格云纹、镶嵌点、剑柄缠纹、流苏股数等点缀繁简
 *
 * 剑身局部坐标：剑尖 (0,-1)，剑格 (0,0)，剑柄/流苏沿 +y；
 * 再经 baseMap 落纸、按笔意做旋转/缩放/平移。
 */

import { Rng, hashStr32, fbm2 } from './rng';
import { seedFor, paperSeedFor, INTENTS, type BrushIntent } from './intents';
import type { InkSword, Stroke, InkBlob, Fingerprint, Painting } from './types';

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

/** 硬度 → 墨的浓度 0..1（越硬墨越浓） */
export function inkDensity(hardness: number): number {
  return clamp(0.16 + (hardness / 100) * 0.8, 0, 1);
}

export interface Pt {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// 落纸与构图
// ---------------------------------------------------------------------------

/**
 * 局部剑身坐标 → 纸面 NDC（竖幅 0..1）。
 * 剑格局部 (0,0) → 纸下 0.78；剑尖 y≈-1 → 天上 0.10；柄首流苏 y≈+0.45 → 贴地 ~0.98。
 */
export function baseMap(p: Pt): Pt {
  return { x: 0.5 + p.x * 0.4, y: 0.78 + p.y * 0.4 };
}

/** 笔意构图（旋转 / 缩放 / 平移，绕旋心） */
function composePoint(p: Pt, intent: BrushIntent): Pt {
  const q = baseMap(p);
  const c = Math.cos(intent.rot);
  const s = Math.sin(intent.rot);
  const dx = (q.x - intent.pivot.x) * intent.scale;
  const dy = (q.y - intent.pivot.y) * intent.scale;
  return {
    x: intent.pivot.x + dx * c - dy * s + intent.offset.x,
    y: intent.pivot.y + dx * s + dy * c + intent.offset.y,
  };
}

/** 形制缩放：以剑格处 (0,0.06) 为不动点，整体放大缩小（鱼肠短、巨阙大） */
function scalePoint(p: Pt, k: number): Pt {
  const py = 0.06;
  return { x: p.x * k, y: py + (p.y - py) * k };
}

/** 对一幅画应用笔意：点做仿射，宽度/飞白只随缩放 */
function applyIntent(strokes: Stroke[], intent: BrushIntent): Stroke[] {
  return strokes.map((st) => ({
    ...st,
    pts: st.pts.map((p0) => composePoint(p0, intent)),
    widths: st.widths?.map((w) => w * intent.scale),
    wL: st.wL?.map((w) => w * intent.scale),
    wR: st.wR?.map((w) => w * intent.scale),
    w: st.w !== undefined ? st.w * intent.scale : st.w,
    feibai: st.feibai?.map((f) => ({
      ...f,
      offset: f.offset * intent.scale,
      w: f.w * intent.scale,
    })),
    nicks: st.nicks?.map((n) => ({ ...n, depth: n.depth * intent.scale })),
  }));
}

// ---------------------------------------------------------------------------
// 剑身（骨）
// ---------------------------------------------------------------------------

function buildBlade(
  sword: InkSword,
  rng: Rng,
  samples: number,
): { strokes: Stroke[]; center: Pt[] } {
  const sh = sword.attrs.sharpness / 100;
  const fl = sword.attrs.flexibility / 100;
  const cr = sword.attrs.craftsmanship / 100;
  const density = inkDensity(sword.attrs.hardness);

  // 韧性 → 主线弯曲（剑体应基本挺直，仅带弧意）与微相位
  const bendAmp = 0.01 + fl * 0.05 + rng.range(0, 0.008);
  const bendK = 0.7 + fl * 1.1 + rng.range(-0.1, 0.1);
  const bendPhase = rng.range(0, Math.PI * 2);
  // 剑体窄长（汉剑制式）；高锋利度更窄（寒刃），低锋利则略阔
  const widthScale = 0.052 * (1.1 - 0.28 * sh) * rng.range(0.96, 1.04);
  // 锋利 → 收尖更早更快
  const taperStart = clamp(0.55 + (1 - sh) * 0.38, 0.55, 0.95);
  const taperPow = 1.35 + sh * 1.05;
  // 锋利 → 飞白多而细
  const feibaiCount = Math.round(sh * 8) + rng.int(0, 2);
  // 锋利 → 边缘缺刻（克制数量，否则剑缘呈锯齿）
  const nickCount = Math.round(sh * sh * 4);
  // 剑尖回锋（韧性勾：小巧，仅末段挑出）
  const hookLen = 0.05 + fl * 0.07;
  const hookCurl = 0.02 + fl * 0.05;
  const hookSide = rng.chance(0.5) ? 1 : -1;

  const center: Pt[] = [];
  const widthAt: number[] = [];
  const wL: number[] = [];
  const wR: number[] = [];

  // 边缘噪声种子（左右不同 → 两侧毛糙不对称）
  const edgeSeedL = hashStr32(sword.id + ':edgeL');
  const edgeSeedR = hashStr32(sword.id + ':edgeR');
  const edgeFreq = 4 + (1 - sh) * 10 + cr * 2;
  const edgeAmp = 0.03 + (1 - sh) * 0.12 + (1 - fl) * 0.03;

  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1); // 0=剑格 1=剑尖
    // 柔性长弧（过两端）+ 高频微颤 + 剑尖回锋
    let x =
      bendAmp * Math.sin(t * Math.PI * bendK + bendPhase) * Math.sin(t * Math.PI) +
      0.006 * Math.sin(t * 22 + bendPhase) * fl;
    let y = -t;
    if (t > 1 - hookLen) {
      const u = (t - (1 - hookLen)) / hookLen;
      x += hookSide * hookCurl * u * u;
      y += hookCurl * 0.25 * u * u; // 小幅折回（回锋），尖仍近 -1
    }
    center.push({ x, y });

    // 半宽轮廓
    let half: number;
    if (t < taperStart) {
      half = widthScale * (0.92 + 0.08 * Math.sin(t * Math.PI * 2 + bendPhase));
    } else {
      const u = (t - taperStart) / (1 - taperStart);
      half = widthScale * Math.pow(1 - u, taperPow);
    }
    widthAt.push(half);

    // 边缘噪声：钝/脆刃更毛糙；剑尖必须收成锋
    const tipMin = t > 0.995 ? 0.002 : half * 0.3;
    const nzL = (fbm2(t * edgeFreq, 3.1, edgeSeedL) - 0.5) * 2;
    const nzR = (fbm2(t * edgeFreq, 9.7, edgeSeedR) - 0.5) * 2;
    wL.push(Math.max(half * (1 + nzL * edgeAmp), tipMin));
    wR.push(Math.max(half * (1 + nzR * edgeAmp), tipMin));
  }

  // 飞白：沿锋面纵向擦出的干笔丝（offset 以该处半宽的比例给出，保证丝在锋内）
  const feibai: NonNullable<Stroke['feibai']> = [];
  for (let k = 0; k < feibaiCount; k++) {
    const along0 = rng.range(0.1, 0.6);
    const along1 = clamp(along0 + rng.range(0.18, 0.34), along0 + 0.08, 0.94);
    const i0 = Math.round(along0 * (samples - 1));
    // 归一化横向位置 -0.5..0.5（相对半宽），渲染时再乘实时半宽 → 永不出锋
    const offsetFrac = rng.range(-0.42, 0.42);
    feibai.push({
      i0,
      i1: Math.round(along1 * (samples - 1)),
      offset: offsetFrac,
      w: rng.range(0.0009, 0.0018) + (1 - sh) * 0.001,
      alpha: 0.16 + sh * 0.3,
      seed: rng.int(0, 1e9),
    });
  }

  // 边缘缺刻
  const nicks: Stroke['nicks'] = [];
  for (let k = 0; k < nickCount; k++) {
    const i = rng.int(Math.floor(samples * 0.25), samples - 3);
    nicks.push({
      along: i / (samples - 1),
      side: rng.chance(0.5) ? 1 : -1,
      depth: widthAt[i] * rng.range(0.12, 0.32),
    });
  }

  const blade: Stroke = {
    kind: 'ribbon',
    pts: center,
    wL,
    wR,
    tone: density,
    alpha: 0.62 + density * 0.22,
    z: 30,
    feibai,
    nicks,
    wet: 0.4 + density * 0.3,
  };

  return { strokes: [blade], center };
}

// ---------------------------------------------------------------------------
// 血槽/脊线 与 镶嵌
// ---------------------------------------------------------------------------

function buildBladeDetails(sword: InkSword, rng: Rng, blade: { center: Pt[] }): Stroke[] {
  const cr = sword.attrs.craftsmanship / 100;
  const sh = sword.attrs.sharpness / 100;
  const density = inkDensity(sword.attrs.hardness);
  const strokes: Stroke[] = [];
  const { center } = blade;

  // 脊线（工艺越高越利落）
  const ridgePts = center.slice(2, Math.floor(center.length * 0.92)).map((p) => ({ ...p }));
  strokes.push({
    kind: 'line',
    pts: ridgePts,
    w: 0.005 + cr * 0.004,
    tone: clamp(density * 0.55, 0.1, 0.7),
    alpha: 0.5,
    z: 31,
  });

  // 镶嵌点/星纹：工艺 0..100 → 0..6 枚，沿脊线分布
  const inlayCount = Math.round(cr * 6);
  for (let k = 0; k < inlayCount; k++) {
    const t = 0.16 + (k + 0.5) * (0.62 / Math.max(inlayCount, 1));
    const i = Math.round(t * (center.length - 1));
    const p = center[i];
    const size = 0.009 + cr * 0.006 + rng.range(0, 0.003);
    const diamond = rng.chance(0.5);
    if (diamond) {
      const d = size;
      strokes.push({
        kind: 'ribbon',
        pts: [
          { x: p.x, y: p.y - d },
          { x: p.x + d, y: p.y },
          { x: p.x, y: p.y + d },
          { x: p.x - d, y: p.y },
          { x: p.x, y: p.y - d },
        ],
        widths: new Array(5).fill(size * 0.55),
        tone: clamp(density * 0.7, 0.15, 0.85),
        alpha: 0.85,
        z: 32,
      });
    } else {
      strokes.push({
        kind: 'splat',
        pts: [{ x: p.x, y: p.y }],
        w: size,
        tone: clamp(density * 0.7, 0.15, 0.85),
        alpha: 0.9,
        z: 32,
      });
    }
  }

  // 近格处一枚朱品（高工艺才有）
  if (cr > 0.82 && rng.chance(0.7)) {
    const i = Math.floor(center.length * 0.12);
    const p = center[i];
    strokes.push({
      kind: 'splat',
      pts: [{ x: p.x + rng.range(-0.02, 0.02), y: p.y }],
      w: 0.014,
      tone: 0.5,
      alpha: 0.85,
      z: 33,
      dye: 'cinnabar',
    });
  }

  // 锋口挑芒（锋利越高越显）：从近尖处轻挑，不超出剑尖
  if (sh > 0.8) {
    const near = center[center.length - 4];
    const tip = center[center.length - 1];
    strokes.push({
      kind: 'line',
      pts: [
        { x: near.x, y: near.y },
        {
          x: tip.x + rng.range(-0.008, 0.008),
          y: tip.y - rng.range(0.0, 0.012),
        },
      ],
      w: 0.002,
      tone: clamp(density * 0.45, 0.1, 0.5),
      alpha: 0.32,
      z: 29,
    });
  }

  return strokes;
}

// ---------------------------------------------------------------------------
// 剑格、剑柄、剑首、流苏
// ---------------------------------------------------------------------------

function buildHilt(sword: InkSword, rng: Rng): Stroke[] {
  const fl = sword.attrs.flexibility / 100;
  const cr = sword.attrs.craftsmanship / 100;
  const density = inkDensity(sword.attrs.hardness);
  const strokes: Stroke[] = [];

  // —— 剑格：横向带状，两端上翘（韧性越高越翘），凸弧 ——
  const span = 0.15 + cr * 0.035 + rng.range(-0.008, 0.008);
  const guardPts: Pt[] = [];
  const guardW: number[] = [];
  const n = 18;
  const curl = 0.02 + fl * 0.05;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); // 0..1 左→右
    const x = -span + 2 * span * t;
    const y =
      0.012 +
      0.028 * (1 - Math.pow((t - 0.5) * 2, 2)) +
      curl * Math.pow(Math.abs((t - 0.5) * 2), 2.2);
    guardPts.push({ x, y });
    guardW.push(0.026 + cr * 0.008);
  }
  strokes.push({
    kind: 'ribbon',
    pts: guardPts,
    widths: guardW,
    tone: clamp(density * 0.95, 0.2, 1),
    alpha: 0.92,
    z: 40,
  });

  // 剑格云纹（工艺 → 点缀繁简）
  const curlCount = Math.round(cr * 3);
  for (let k = 0; k < curlCount; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const bx = side * span * 0.55;
    const by = 0.03;
    const spiral: Pt[] = [];
    const turns = 0.8 + cr * 0.8;
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      const a = u * Math.PI * turns + (side < 0 ? Math.PI : 0);
      const r = 0.035 * (1 - u * 0.55);
      spiral.push({ x: bx + Math.cos(a) * r * side, y: by + Math.sin(a) * r * 0.8 + 0.02 });
    }
    strokes.push({
      kind: 'line',
      pts: spiral,
      w: 0.006 + cr * 0.003,
      tone: clamp(density * 0.6, 0.15, 0.8),
      alpha: 0.75,
      z: 41,
    });
  }

  // —— 剑柄：略弯竖带 ——
  const gripTop = 0.03;
  const gripBot = 0.42;
  const gripPts: Pt[] = [];
  const gripW: number[] = [];
  const gn = 16;
  const gripBend = (fl - 0.5) * 0.05 + rng.range(-0.012, 0.012);
  for (let i = 0; i < gn; i++) {
    const t = i / (gn - 1);
    const y = gripTop + (gripBot - gripTop) * t;
    const x = gripBend * Math.sin(t * Math.PI) * 0.8;
    gripPts.push({ x, y });
    gripW.push(0.045 + 0.005 * Math.sin(t * 10));
  }
  strokes.push({
    kind: 'ribbon',
    pts: gripPts,
    widths: gripW,
    tone: clamp(density * 0.7, 0.15, 0.85),
    alpha: 0.9,
    z: 38,
  });

  // 缠柄纹（工艺 → 道数）
  const bandCount = 3 + Math.round(cr * 5);
  for (let k = 1; k <= bandCount; k++) {
    const t = k / (bandCount + 1);
    const y = gripTop + (gripBot - gripTop) * t;
    const x = gripBend * Math.sin(t * Math.PI) * 0.8;
    strokes.push({
      kind: 'ribbon',
      pts: [
        { x: x - 0.05, y: y - 0.006 },
        { x: x + 0.05, y: y + 0.006 },
      ],
      widths: [0.008, 0.008],
      tone: clamp(density * 0.85, 0.2, 0.95),
      alpha: 0.8,
      z: 39,
    });
  }

  // —— 剑首 ——
  strokes.push({
    kind: 'ribbon',
    pts: [
      { x: -0.065, y: gripBot + 0.012 },
      { x: 0.065, y: gripBot + 0.012 },
    ],
    widths: [0.018, 0.018],
    tone: clamp(density * 0.9, 0.2, 1),
    alpha: 0.92,
    z: 42,
  });
  strokes.push({
    kind: 'splat',
    pts: [{ x: 0, y: gripBot + 0.032 }],
    w: 0.016 + cr * 0.006,
    tone: clamp(density * 0.8, 0.2, 0.9),
    alpha: 0.9,
    z: 43,
  });

  // —— 流苏（工艺 → 股数，韧性 → 摆幅与曲度）——
  const strands = 2 + Math.round(cr * 4);
  const sway = 0.04 + fl * 0.13;
  // 剑首在局部 y≈0.45，纸底约局部 +0.5 → 流苏收得很短
  const length = 0.02 + fl * 0.025 + rng.range(0, 0.004);
  for (let k = 0; k < strands; k++) {
    const f = strands === 1 ? 0.5 : k / (strands - 1);
    const dir = k % 2 === 0 ? 1 : -1;
    const pts: Pt[] = [];
    const wArr: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push({
        x: dir * sway * f * Math.sin(t * (1.6 + fl)) * 0.7 + (f - 0.5) * 0.015 * t,
        y: gripBot + 0.032 + length * t,
      });
      wArr.push(0.01 * (1 - t) + 0.0015);
    }
    // 用每股独立噪声做飘摆
    const strandSeed = rng.int(0, 1e9);
    pts.forEach((p, i) => {
      const t = i / 12;
      p.x += (fbm2(t * 3, k * 1.7, strandSeed) - 0.5) * sway * 0.5;
    });
    strokes.push({
      kind: 'ribbon',
      pts,
      widths: wArr,
      tone: clamp(density * 0.6, 0.12, 0.8),
      alpha: 0.7,
      z: 20,
    });
  }

  return strokes;
}

// ---------------------------------------------------------------------------
// 剑气（写意点缀，工艺/锋利决定繁简，韧性决定曲度）
// ---------------------------------------------------------------------------

function buildQi(sword: InkSword, rng: Rng): Stroke[] {
  const sh = sword.attrs.sharpness / 100;
  const fl = sword.attrs.flexibility / 100;
  const cr = sword.attrs.craftsmanship / 100;
  const density = inkDensity(sword.attrs.hardness);
  const strokes: Stroke[] = [];

  const count = Math.round(sh * 4) + Math.round(cr * 2);
  for (let k = 0; k < count; k++) {
    const side = rng.chance(0.5) ? 1 : -1;
    const y = rng.range(-0.82, -0.16);
    const dist = rng.range(0.2, 0.34);
    const len = rng.range(0.1, 0.2) + sh * 0.07;
    const curve = (0.03 + fl * 0.1) * side;
    const x0 = side * dist;
    const pts: Pt[] = [
      { x: x0, y: y + 0.06 },
      { x: x0 + curve + side * len * 0.35, y: y + 0.02 },
      { x: x0 + side * len, y: y - 0.02 + rng.range(-0.02, 0.02) },
    ];
    strokes.push({
      kind: 'ribbon',
      pts,
      widths: [0.005, 0.003, 0.0008],
      tone: clamp(density * 0.35, 0.06, 0.4),
      alpha: 0.16 + rng.range(0, 0.12),
      z: 10,
      wet: 0.5,
    });
  }

  // 散墨点（锋利 → 迸溅；多在剑身两侧空白处）
  const splatCount = 4 + Math.round(sh * 7);
  for (let k = 0; k < splatCount; k++) {
    const side = rng.chance(0.5) ? 1 : -1;
    const along = rng.range(-0.88, -0.08);
    strokes.push({
      kind: 'splat',
      pts: [
        {
          x: side * rng.range(0.16, 0.4),
          y: along,
        },
      ],
      w: rng.range(0.002, 0.008) + sh * 0.004,
      tone: clamp(density * 0.45, 0.1, 0.6),
      alpha: rng.range(0.14, 0.36),
      z: 8,
    });
  }

  return strokes;
}

// ---------------------------------------------------------------------------
// 背景洇墨团（与笔意无关，永远沉在宣纸层）
// ---------------------------------------------------------------------------

function buildBlobs(sword: InkSword, rng: Rng): InkBlob[] {
  const density = inkDensity(sword.attrs.hardness);
  const count = 1 + rng.int(0, 2);
  const blobs: InkBlob[] = [];
  for (let k = 0; k < count; k++) {
    const big = count === 1 || k === 0;
    const r = big ? rng.range(0.06, 0.11) : rng.range(0.03, 0.06);
    blobs.push({
      x: rng.range(0.14, 0.86),
      y: rng.range(0.14, 0.84),
      r,
      // 淡墨痕：即使硬度高也不过分浓黑，只作气息
      alpha: (big ? 0.03 : 0.022) + density * 0.05,
      ring: buildRing(rng),
    });
  }
  return blobs;
}

function buildRing(rng: Rng): number[] {
  const ring: number[] = [];
  const seg = 24;
  const phase = rng.range(0, Math.PI * 2);
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const wobble =
      1 +
      0.16 * Math.sin(a * 3 + phase) +
      0.1 * Math.sin(a * 5 + phase * 1.7) +
      rng.range(-0.05, 0.05);
    ring.push(Math.max(0.55, wobble));
  }
  return ring;
}

// ---------------------------------------------------------------------------
// 几何指纹：路径点数、墨色均值（面积加权 0..255）、包围盒
// ---------------------------------------------------------------------------

function widthOf(st: Stroke, i: number): number {
  if (st.wL && st.wR) return (st.wL[i] + st.wR[i]) / 2;
  if (st.widths) return st.widths[i];
  return st.w ?? 0;
}

/** 墨黑度 0..1（笔触覆盖率） */
function coverage(st: Stroke): number {
  if (st.kind === 'splat') {
    return Math.PI * (st.w ?? 0) ** 2 * 0.85 * (st.alpha ?? 1);
  }
  let area = 0;
  for (let i = 1; i < st.pts.length; i++) {
    const w = (widthOf(st, i - 1) + widthOf(st, i)) / 2;
    const len = Math.hypot(st.pts[i].x - st.pts[i - 1].x, st.pts[i].y - st.pts[i - 1].y);
    area += (st.kind === 'ribbon' ? 2 * w * len : st.kind === 'line' ? (st.w ?? 0) * len : 0);
  }
  return area * (st.alpha ?? 1);
}

/** 笔触墨的灰度 0(黑)..255(白)：tone 即墨浓度 */
function grayOf(st: Stroke): number {
  return 18 + (1 - clamp(st.tone, 0, 1)) * 150;
}

/**
 * 几何指纹
 *  - pathPoints / inkMean 在构图变换前的局部几何上计算 → 只由剑属性决定，
 *    与笔意无关，可作为「同剑同墨」的断言锚点；
 *  - bbox 在变换后的纸坐标上计算 → 换笔意时构图不同，包围盒随之改变。
 */
export function computeFingerprint(localStrokes: Stroke[], ndcStrokes: Stroke[]): Fingerprint {
  let pathPoints = 0;
  let inkWeighted = 0;
  let totalInk = 0;

  for (const st of localStrokes) {
    if (st.dye === 'cinnabar') continue; // 朱色不计墨指纹
    const cov = coverage(st);
    inkWeighted += grayOf(st) * cov;
    totalInk += cov;
    pathPoints += st.kind === 'ribbon' ? st.pts.length * 2 : st.pts.length;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const st of ndcStrokes) {
    for (const p of st.pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  const inkMean = totalInk > 0 ? inkWeighted / totalInk : 255;
  const r4 = (v: number): number => Math.round(v * 1e4) / 1e4;

  return {
    pathPoints,
    inkMean: Math.round(inkMean * 100) / 100,
    bbox: {
      minX: r4(minX),
      minY: r4(minY),
      maxX: r4(maxX),
      maxY: r4(maxY),
    },
  };
}

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

export function buildPainting(sword: InkSword, intentIndex: number): Painting {
  const intent = INTENTS[((intentIndex % INTENTS.length) + INTENTS.length) % INTENTS.length];
  const seed = seedFor(sword.id, intentIndex);

  // 几何本体（骨、墨、点缀）只由剑编号驱动 → 换笔意时笔触集合逐点不变；
  // 笔意仅在最后施加旋转/缩放/平移等构图参数。
  const intrinsicSeed = hashStr32(`jian-gu:${sword.id}`);
  const rng = new Rng(intrinsicSeed);

  // 属性 + 逐剑随机定采样量（锋利/韧性高 → 点更多）
  const sh = sword.attrs.sharpness / 100;
  const fl = sword.attrs.flexibility / 100;
  const samples = Math.round(clamp(48 + sh * 26 + fl * 16 + rng.range(-4, 4), 44, 92));

  const bladeData = buildBlade(sword, new Rng(intrinsicSeed ^ 0x517a), samples);
  const details = buildBladeDetails(sword, new Rng(intrinsicSeed ^ 0x6a91), bladeData);
  const hilt = buildHilt(sword, new Rng(intrinsicSeed ^ 0x4869));
  const qi = buildQi(sword, new Rng(intrinsicSeed ^ 0x7169));

  // 先在局部坐标合并、按 z 排序；再按形制缩放（短剑/巨剑），最后统一构图
  const localStrokes = [...qi, ...bladeData.strokes, ...details, ...hilt].sort(
    (a, b) => a.z - b.z,
  );
  const formK = sword.form ?? 1;
  const formedStrokes =
    formK === 1
      ? localStrokes
      : localStrokes.map((st) => ({
          ...st,
          pts: st.pts.map((p) => scalePoint(p, formK)),
          widths: st.widths?.map((w) => w * formK),
          wL: st.wL?.map((w) => w * formK),
          wR: st.wR?.map((w) => w * formK),
          w: st.w !== undefined ? st.w * formK : st.w,
          feibai: st.feibai?.map((f) => ({ ...f, offset: f.offset, w: f.w * formK })),
          nicks: st.nicks?.map((n) => ({ ...n, depth: n.depth * formK })),
        }));
  const strokes = applyIntent(formedStrokes, intent);

  const blobs = buildBlobs(sword, new Rng(hashStr32(`xuan-mo:${sword.id}`)));

  return {
    sword,
    intent: intentIndex,
    seed,
    strokes,
    blobs,
    paperSeed: paperSeedFor(sword.id),
    fingerprint: computeFingerprint(formedStrokes, strokes),
  };
}

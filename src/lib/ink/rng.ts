/**
 * 剑意图 · 确定性随机与噪声层
 * ------------------------------------------------------------
 * 全引擎禁止使用 Math.random（由 test/jianyi.test.ts 扫描源码断言）。
 * 同一种子必然产出同一串数，不同种子产出不同序列。
 *
 *  - hashStr32      字符串 → 32 位整数（FNV-1a 变体，再用 murmur 混合）
 *  - Rng            mulberry32 状态发生器：均匀分布 / 区间 / 加权
 *  - hash2/noise2   二维值噪声（按整数格点哈希后双线性插值）
 *  - fbm2           三层分形叠加
 *  - noise1         一维平滑噪声（供路径边缘颤动使用）
 */

/** 字符串 → 32 位无符号整数（同一输入恒等，不同输入雪崩） */
export function hashStr32(input: string): number {
  // FNV-1a
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // murmur3 finalizer，打散低位
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** 32 位整数 → mulberry32 发生器 */
export class Rng {
  private state: number;

  constructor(seed: number | string) {
    this.state =
      typeof seed === 'string' ? hashStr32(seed) : (seed >>> 0) || 0x9e3779b9;
  }

  /** [0,1) 均匀分布 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min,max) 浮点区间 */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** [min,max] 整数闭区间 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** 以概率 p 返回 true */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** 加权挑选：返回索引 */
  weighted(weights: number[]): number {
    let total = 0;
    for (const w of weights) total += w;
    let roll = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return i;
    }
    return weights.length - 1;
  }

  /** [-1,1) 近似正态（两次均匀相减，够用且便宜） */
  normal(): number {
    return this.next() - this.next();
  }
}

/** 整数格点哈希 → [0,1)，值噪声的随机源 */
export function hash2(ix: number, iy: number, seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (ix | 0), 0x85ebca6b);
  h = Math.imul(h ^ (iy | 0), 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number): number => t * t * (3 - 2 * t);

/** 二维值噪声（无库，格点哈希 + smoothstep 双线性插值） */
export function noise2(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = fade(x - x0);
  const fy = fade(y - y0);

  const v00 = hash2(x0, y0, seed);
  const v10 = hash2(x0 + 1, y0, seed);
  const v01 = hash2(x0, y0 + 1, seed);
  const v11 = hash2(x0 + 1, y0 + 1, seed);

  const top = v00 + (v10 - v00) * fx;
  const bottom = v01 + (v11 - v01) * fx;
  return top + (bottom - top) * fy; // 0..1
}

/** 三层分形值噪声，返回约 0..1 */
export function fbm2(x: number, y: number, seed: number): number {
  let sum = 0;
  let amp = 0.55;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < 3; o++) {
    sum += noise2(x * freq, y * freq, seed + o * 1013) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm;
}

/** 一维平滑噪声：在整数控制点之间做 smoothstep 插值 */
export function noise1(t: number, seed: number): number {
  const i = Math.floor(t);
  const f = fade(t - i);
  const a = hash2(i, 0, seed);
  const b = hash2(i + 1, 0, seed);
  return a + (b - a) * f;
}

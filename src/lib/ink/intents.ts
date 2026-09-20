import { hashStr32 } from './rng';

/** 笔意数量（点击循环切换） */
export const INTENT_COUNT = 3;

export interface BrushIntent {
  /** 短名，写入地址栏 #bi= */
  name: string;
  /** 画名 */
  title: string;
  /** 画诀说明 */
  desc: string;
  /** 前景整体旋转（弧度）——只改构图 */
  rot: number;
  /** 前景整体缩放 */
  scale: number;
  /** 旋心（NDC 纸坐标） */
  pivot: { x: number; y: number };
  /** 旋转缩放后的平移（NDC） */
  offset: { x: number; y: number };
}

/**
 * 三种笔意 = 三套构图参数。
 * 换意只动这里的旋转/缩放/平移，几何与墨色仍由剑属性决定，故可复现。
 */
export const INTENTS: BrushIntent[] = [
  {
    name: 'li',
    title: '立锋 · 正悬',
    desc: '中锋直笔，剑气干云',
    rot: 0,
    scale: 1,
    pivot: { x: 0.5, y: 0.5 },
    offset: { x: 0, y: 0 },
  },
  {
    name: 'li-xie',
    title: '横斜 · 醉笔',
    desc: '欹侧取势，斜风细雨',
    rot: -1.27,
    scale: 0.9,
    pivot: { x: 0.5, y: 0.5 },
    offset: { x: -0.02, y: 0.04 },
  },
  {
    name: 'hui',
    title: '回锋 · 倒卷',
    desc: '无往不复，天地回旋',
    rot: Math.PI + 0.05,
    scale: 0.94,
    pivot: { x: 0.5, y: 0.5 },
    offset: { x: 0.02, y: 0.02 },
  },
];

/** 完整随机种子：剑编号 + 笔意编号，同一把剑同一笔意永远同画 */
export function seedFor(swordId: string, intent: number): string {
  return `jian-yi:${swordId}:bi:${intent}`;
}

/** 纸面纹理种子（只由剑编号决定，换笔意纸不换） */
export function paperSeedFor(swordId: string): number {
  return hashStr32(`xuan-paper:${swordId}`);
}

/** 解析地址栏 hash，如 #bi=2&jian=8 */
export function parseHash(): { bi: number; jian: string | null } {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const raw = parseInt(params.get('bi') ?? '0', 10);
  const bi = Number.isFinite(raw) ? ((raw % INTENT_COUNT) + INTENT_COUNT) % INTENT_COUNT : 0;
  const jian = params.get('jian');
  return { bi, jian };
}

/** 写回地址栏（replaceState 不产生历史噪音；前进后退由 hashchange 兜底） */
export function writeHash(bi: number, jian: string | null): void {
  const params = new URLSearchParams();
  params.set('bi', String(bi));
  if (jian) params.set('jian', jian);
  const next = `#${params.toString()}`;
  if (window.location.hash !== next) {
    window.history.replaceState(null, '', next);
  }
}

/** 剑意图引擎类型 */

export interface SwordAttrs {
  /** 锋利度 0..100 → 笔锋锐利与飞白 */
  sharpness: number;
  /** 硬度 0..100 → 墨色浓重 */
  hardness: number;
  /** 韧性 0..100 → 线条弯曲与回锋 */
  flexibility: number;
  /** 工艺 0..100 → 点缀繁简 */
  craftsmanship: number;
}

export interface InkSword {
  id: string;
  name: string;
  alias: string;
  attrs: SwordAttrs;
  /** 形制：剑身整体缩放（鱼肠短、巨阙大），缺省 1，由数据/编号给定 */
  form?: number;
}

/** 一条手写笔触。ribbon=带状（剑体/剑格/剑柄/流苏/剑气），line=单线，splat=墨点 */
export interface Stroke {
  kind: 'ribbon' | 'line' | 'splat';
  /** 中心线（ribbon/line），splat 时只用首点作圆心 */
  pts: { x: number; y: number }[];
  /** ribbon：单侧半宽（左右对称时）；line/splat：使用 w */
  widths?: number[];
  /** ribbon：左 / 右半宽分别给出（边缘噪声左右不对称时） */
  wL?: number[];
  wR?: number[];
  w?: number;
  /** 墨色 0(焦墨)..1(淡墨)，最终浓淡仍受硬度调制；splat 同 */
  tone: number;
  /** 额外透明度倍率（湿晕层/剑气用） */
  alpha?: number;
  /** 图层顺序，小者先画（剑气在剑后、流苏在剑下等） */
  z: number;
  /** 飞白/枯笔擦痕：沿中心线挖掉若干细线（仅 blade ribbon 有效，i0/i1 为中心线索引） */
  feibai?: { i0: number; i1: number; offset: number; w: number; alpha: number; seed: number }[];
  /** 边缘缺刻（仅 ribbon 有效）：在轮廓上随机咬出小缺口 */
  nicks?: { along: number; side: 1 | -1; depth: number }[];
  /** 湿晕：渲染时额外铺一层放大半透明墨 */
  wet?: number;
  /** 染色基调，默认墨黑；'cinnabar'=朱（仅装饰点） */
  dye?: 'ink' | 'cinnabar';
}

/** 背景洇墨团（固定于纸面坐标系，换笔意不移动 → 换的只是前景构图） */
export interface InkBlob {
  x: number;
  y: number;
  r: number;
  alpha: number;
  /** 24 个半径倍率，做出洇开的不规则边缘 */
  ring: number[];
}

export interface Fingerprint {
  /** 路径点数量（所有前景笔触轮廓顶点合计） */
  pathPoints: number;
  /** 墨色均值 0..255（按面积加权的墨黑度，255 为全白） */
  inkMean: number;
  /** 包围盒（NDC 纸坐标 0..1，可能因构图旋转略微出界） */
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface Painting {
  sword: InkSword;
  intent: number;
  /** 完整驱动种子（已混合剑编号 + 笔意） */
  seed: string;
  /** 前景笔触（已经过笔意构图变换） */
  strokes: Stroke[];
  /** 背景洇墨（仅由剑种子决定） */
  blobs: InkBlob[];
  /** 供渲染的纸面纹理种子 */
  paperSeed: number;
  /** 几何指纹 */
  fingerprint: Fingerprint;
}

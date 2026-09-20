import type { InkSword } from './types';

/**
 * 十二柄传世名剑（数据取自 api/src/data/swords.ts，
 * 仅保留剑意图所需属性，使引擎可独立在 Node 中断言）。
 * id 即「剑之编号」，直接驱动全画；form 为形制缩放（短剑/巨剑）。
 */
export const INK_SWORDS: InkSword[] = [
  { id: '1', name: '轩辕剑', alias: '圣道之剑', attrs: { sharpness: 98, hardness: 95, flexibility: 75, craftsmanship: 100 }, form: 1.05 },
  { id: '2', name: '湛泸剑', alias: '仁道之剑', attrs: { sharpness: 92, hardness: 88, flexibility: 90, craftsmanship: 96 }, form: 1.0 },
  { id: '3', name: '赤霄剑', alias: '帝王之剑', attrs: { sharpness: 90, hardness: 85, flexibility: 80, craftsmanship: 88 }, form: 1.02 },
  { id: '4', name: '太阿剑', alias: '威道之剑', attrs: { sharpness: 94, hardness: 90, flexibility: 85, craftsmanship: 92 }, form: 1.0 },
  { id: '5', name: '龙泉剑', alias: '诚信之剑', attrs: { sharpness: 88, hardness: 92, flexibility: 90, craftsmanship: 90 }, form: 1.0 },
  { id: '6', name: '干将剑', alias: '挚情雄剑', attrs: { sharpness: 91, hardness: 89, flexibility: 88, craftsmanship: 93 }, form: 0.99 },
  { id: '7', name: '莫邪剑', alias: '挚情雌剑', attrs: { sharpness: 89, hardness: 87, flexibility: 94, craftsmanship: 93 }, form: 0.97 },
  { id: '8', name: '鱼肠剑', alias: '勇绝之剑', attrs: { sharpness: 96, hardness: 82, flexibility: 78, craftsmanship: 85 }, form: 0.74 },
  { id: '9', name: '纯钧剑', alias: '尊贵之剑', attrs: { sharpness: 87, hardness: 84, flexibility: 82, craftsmanship: 95 }, form: 0.98 },
  { id: '10', name: '巨阙剑', alias: '巨剑之冠', attrs: { sharpness: 85, hardness: 96, flexibility: 70, craftsmanship: 88 }, form: 1.1 },
  { id: '11', name: '承影剑', alias: '优雅之剑', attrs: { sharpness: 93, hardness: 75, flexibility: 95, craftsmanship: 91 }, form: 0.96 },
  { id: '12', name: '青釭剑', alias: '绝世双剑', attrs: { sharpness: 97, hardness: 86, flexibility: 83, craftsmanship: 87 }, form: 1.0 },
];

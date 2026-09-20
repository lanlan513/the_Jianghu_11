/*
 * 墨剑谱 · 断言测试（node test.js）
 *  - 禁用 Math.random
 *  - 同一（剑, 意）指纹可复现
 *  - 十二把剑指纹两两不同
 *  - 换笔意 → 构图变但仍确定
 *  - 指纹字段合法、单幅生成逻辑 < 150ms
 */
'use strict';
const fs = require('fs');
const path = require('path');
const SI = require('./sword-ink.js');

let failures = 0;
function check(name, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  ' + extra : ''));
  if (!cond) failures++;
}

const W = 400, H = 520, N = SI.SWORDS.length;
check('名剑数量为 12', N === 12);

// 源码禁用 Math.random（先剥离注释，避免误伤说明文字）
const src = fs.readFileSync(path.join(__dirname, 'sword-ink.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');
check('生成器源码不含 Math.random', !/Math\.random\s*\(/.test(src));

// 指纹：可复现
const fp = [];
for (let i = 0; i < N; i++) fp.push(SI.fingerprint(i, 0, W, H));
let deterministic = true;
for (let i = 0; i < N; i++) {
  if (JSON.stringify(SI.fingerprint(i, 0, W, H)) !== JSON.stringify(fp[i])) deterministic = false;
}
check('同一（剑, 意）两次生成指纹完全一致', deterministic);

// 指纹：两两不同
const keys = fp.map((f) => JSON.stringify(f));
check('十二把剑几何指纹两两不同', new Set(keys).size === N, `(unique=${new Set(keys).size}/${N})`);

// 换笔意：构图变化且仍可复现
let variantDiff = true, variantDet = true;
for (let i = 0; i < N; i++) {
  const a = SI.fingerprint(i, 1, W, H);
  const b = SI.fingerprint(i, 1, W, H);
  if (JSON.stringify(a) !== JSON.stringify(b)) variantDet = false;
  if (JSON.stringify(a) === JSON.stringify(fp[i])) variantDiff = false;
}
check('换笔意后指纹仍确定可复现', variantDet);
check('换笔意后构图确实变化（指纹不同）', variantDiff);

// 指纹字段合法
let sane = true;
for (const f of fp) {
  if (!(f.pts > 100)) sane = false;
  if (!(f.ink > 0.005 && f.ink < 0.9)) sane = false;
  const [x0, y0, x1, y1] = f.bbox;
  if (!(x1 > x0 && y1 > y0)) sane = false;
  if (!(y1 - y0 > H * 0.15)) sane = false; // 剑体应占画面相当高度
  if (x0 < -W * 0.1 || y0 < -H * 0.1 || x1 > W * 1.1 || y1 > H * 1.1) sane = false;
}
check('指纹字段合法（pts / ink / bbox）', sane);

// 性能：生成逻辑耗时（真实画布光栅化另有充足余量）
const ROUNDS = 5;
const t0 = process.hrtime.bigint();
for (let r = 0; r < ROUNDS; r++) for (let i = 0; i < N; i++) SI.fingerprint(i, r % SI.VARIANTS, W, H);
const ms = Number(process.hrtime.bigint() - t0) / 1e6 / (ROUNDS * N);
check(`单幅生成逻辑 < 150ms（实测均值 ${ms.toFixed(2)}ms）`, ms < 150);

console.log('\n几何指纹一览（意 0，400×520）：');
console.table(fp.map((f, i) => ({
  剑: SI.SWORDS[i].name,
  路径点: f.pts,
  墨色均值: f.ink,
  包围盒: f.bbox.join(', ')
})));

process.exit(failures ? 1 : 0);

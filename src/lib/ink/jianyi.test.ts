/**
 * 剑意图引擎断言（node --test，纯几何，无需浏览器）
 * 运行：npm run test:jianyi
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { INK_SWORDS } from './swords';
import { INTENT_COUNT, seedFor } from './intents';
import { hashStr32, Rng } from './rng';
import { buildPainting, inkDensity } from './geometry';
import type { Painting, Stroke } from './types';

const here = dirname(fileURLToPath(import.meta.url));

const paintings: Painting[] = [];
for (const s of INK_SWORDS) {
  for (let bi = 0; bi < INTENT_COUNT; bi++) paintings.push(buildPainting(s, bi));
}
const byKey = new Map<string, Painting>();
for (const p of paintings) byKey.set(`${p.sword.id}:${p.intent}`, p);

// 1. 可复现：同剑同笔意，任何时刻重画完全一致
test('deterministic: same sword + intent rebuilds an identical painting', () => {
  for (const s of INK_SWORDS) {
    for (let bi = 0; bi < INTENT_COUNT; bi++) {
      const a = buildPainting(s, bi);
      const b = buildPainting(s, bi);
      assert.equal(JSON.stringify(a.strokes), JSON.stringify(b.strokes));
      assert.equal(JSON.stringify(a.blobs), JSON.stringify(b.blobs));
      assert.deepEqual(a.fingerprint, b.fingerprint);
      assert.equal(a.seed, seedFor(s.id, bi));
    }
  }
});

// 2. 不同剑：同笔意下指纹三元组两两不同
test('uniqueness: no two swords share a full fingerprint in the same intent', () => {
  for (let bi = 0; bi < INTENT_COUNT; bi++) {
    const keys = new Set<string>();
    for (const s of INK_SWORDS) {
      const f = byKey.get(`${s.id}:${bi}`)!.fingerprint;
      const sig = `${f.pathPoints}|${f.inkMean}|${f.bbox.minX},${f.bbox.minY},${f.bbox.maxX},${f.bbox.maxY}`;
      assert.ok(!keys.has(sig), `intent ${bi} sword ${s.id} collides: ${sig}`);
      keys.add(sig);
    }
    assert.equal(keys.size, INK_SWORDS.length);
  }
});

// 3. 同一把剑换笔意：几何指纹发生变化（构图参数确实在变）
test('intent switch changes composition while ink mean (property-driven) stays fixed', () => {
  for (const s of INK_SWORDS) {
    const a = byKey.get(`${s.id}:0`)!;
    const b = byKey.get(`${s.id}:1`)!;
    const c = byKey.get(`${s.id}:2`)!;
    const boxKey = (p: Painting) => JSON.stringify(p.fingerprint.bbox);
    assert.notEqual(boxKey(a), boxKey(b));
    assert.notEqual(boxKey(a), boxKey(c));
    // 墨色均值只由属性决定，与构图无关（仿射浮点会带来极小误差，按四舍五入位比较）
    assert.equal(Math.round(a.fingerprint.inkMean), Math.round(b.fingerprint.inkMean));
    assert.equal(Math.round(a.fingerprint.inkMean), Math.round(c.fingerprint.inkMean));
  }
});

// 4. 属性 → 墨 / 锋 / 韧 / 工艺 的单调映射
test('hardness drives ink density monotonically', () => {
  const mk = (h: number) => ({
    id: 't', name: 't', alias: 't',
    attrs: { sharpness: 90, hardness: h, flexibility: 85, craftsmanship: 90 },
  });
  const grays = [60, 70, 80, 90, 100].map((h) => buildPainting(mk(h), 0).fingerprint.inkMean);
  for (let i = 1; i < grays.length; i++) {
    assert.ok(grays[i] <= grays[i - 1], `gray should darken as hardness rises: ${grays}`);
  }
  assert.ok(grays[grays.length - 1] < grays[0]);
});

test('sharpness drives feibai count and edge taper', () => {
  const mk = (sh: number) => ({
    id: `t${sh}`, name: 't', alias: 't',
    attrs: { sharpness: sh, hardness: 88, flexibility: 85, craftsmanship: 90 },
  });
  const feibaiOf = (p: Painting) =>
    p.strokes.reduce((n, st) => n + (st.feibai ? st.feibai.length : 0), 0);
  const low = feibaiOf(buildPainting(mk(55), 0));
  const high = feibaiOf(buildPainting(mk(99), 0));
  assert.ok(high > low, `sharp blades should carry more feibai (${low} vs ${high})`);
});

test('flexibility drives blade curvature', () => {
  const mk = (id: string, fl: number) => ({
    id, name: 't', alias: 't',
    attrs: { sharpness: 90, hardness: 88, flexibility: fl, craftsmanship: 90 },
  });
  const bladePoints = (p: Painting): Stroke =>
    p.strokes.find((st) => st.feibai !== undefined && st.z === 30)!;
  const bend = (p: Painting) => {
    const b = bladePoints(p);
    const xs = b.pts.map((q) => q.x);
    return Math.max(...xs) - Math.min(...xs);
  };
  // 立锋笔意无旋转，NDC 横向摆幅与局部弯曲成正比
  const stiff = bend(buildPainting(mk('a', 40), 0));
  const flex = bend(buildPainting(mk('b', 100), 0));
  assert.ok(flex > stiff, `flexible blade should swing wider (${stiff} vs ${flex})`);
});

test('craftsmanship drives ornament count', () => {
  const mk = (id: string, cr: number) => ({
    id, name: 't', alias: 't',
    attrs: { sharpness: 90, hardness: 88, flexibility: 85, craftsmanship: cr },
  });
  const countDecor = (p: Painting) => p.strokes.filter((s) => s.z === 41 || s.z === 20).length;
  const plain = countDecor(buildPainting(mk('a', 40), 0));
  const fancy = countDecor(buildPainting(mk('b', 100), 0));
  assert.ok(fancy > plain, `higher craft should add ornaments (${plain} vs ${fancy})`);
});

// 5. 种子稳定性：字符串哈希纯函数
test('hashStr32 is stable across calls and avalanches on different ids', () => {
  for (const s of INK_SWORDS) {
    assert.equal(hashStr32(seedFor(s.id, 0)), hashStr32(seedFor(s.id, 0)));
  }
  const ids = new Set(INK_SWORDS.map((s) => hashStr32(s.id)));
  assert.equal(ids.size, INK_SWORDS.length);
});

test('Rng sequence is reproducible from the same seed', () => {
  const a = new Rng(12345);
  const b = new Rng(12345);
  const sa = [a.next(), a.next(), a.range(-2, 2), a.int(1, 9)];
  const sb = [b.next(), b.next(), b.range(-2, 2), b.int(1, 9)];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, [0.1, 0.2, 0.3, 0.4]);
});

// 6. 指纹结构合法
test('fingerprints are well-formed', () => {
  for (const p of paintings) {
    const f = p.fingerprint;
    assert.ok(f.pathPoints > 0);
    assert.ok(f.inkMean >= 0 && f.inkMean <= 255);
    assert.ok(f.bbox.maxX >= f.bbox.minX);
    assert.ok(f.bbox.maxY >= f.bbox.minY);
    // 竖幅立锋时剑体应落在纸面范围内（容差留给湿晕/飘带过冲）
    if (p.intent === 0) {
      assert.ok(f.bbox.minX > 0.08 && f.bbox.maxX < 0.92, JSON.stringify(f.bbox));
      assert.ok(f.bbox.minY > 0.0 && f.bbox.maxY < 1.02, JSON.stringify(f.bbox));
    }
  }
});

// 7. 性能：几何构建单幅远低于 150ms（渲染预算留给 Canvas）
test('geometry build is well under 150ms per sword', () => {
  const t0 = process.hrtime.bigint();
  for (let rep = 0; rep < 12; rep++) {
    for (const s of INK_SWORDS) buildPainting(s, 0);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 12;
  assert.ok(ms < 10, `avg build took ${ms.toFixed(2)}ms`);
});

// 8. 源码纪律：引擎内禁止出现非确定性随机源
test('engine source never calls the global RNG or imports graphics/noise libraries', () => {
  const banned = [
    'Math.random',
    'import("simplex',
    'from "noise',
    "from 'noise",
    'perlin',
    'd3-',
    'pixi',
    'three',
  ];
  for (const file of ['rng.ts', 'geometry.ts', 'renderer.ts', 'intents.ts']) {
    const src = readFileSync(join(here, file), 'utf-8');
    for (const token of banned) {
      // 允许注释中提及；按去除注释后的代码检查
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
      assert.ok(
        !code.includes(token),
        `${file} must not contain ${token}`,
      );
    }
  }
});

test('inkDensity follows hardness', () => {
  assert.ok(inkDensity(100) > inkDensity(50));
  assert.ok(inkDensity(0) < inkDensity(100));
});

// 保证全部 12 剑均有背景洇墨与前景
test('every painting carries blobs, strokes and a seal-ready sword id', () => {
  for (const p of paintings) {
    assert.ok(p.blobs.length >= 1);
    assert.ok(p.strokes.length > 10);
    assert.ok(/^\d+$/.test(p.sword.id));
  }
});

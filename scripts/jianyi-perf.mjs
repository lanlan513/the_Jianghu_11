/**
 * 精确性能测量：通过 window.__jianyi 在离屏 canvas 上
 *  - 单幅纸 / 单幅前景耗时（12 剑 × 3 笔意，各跑 3 轮取最大）
 *  - 十二幅连续总耗时（模拟一屏全画）
 *  - 同剑同笔意两次渲染 getImageData 逐像素相等（浏览器端可复现）
 */
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4173/jianyi', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const report = await page.evaluate(async () => {
  const J = window.__jianyi;
  const cssW = 300;
  const cssH = 375;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // 必须挂载到 DOM，否则 clientWidth/clientHeight 为 0，setupCanvas 会跳过
  const holder = document.createElement('div');
  holder.style.cssText =
    'position:fixed;left:-9999px;top:0;width:300px;height:375px;visibility:hidden;';
  document.body.appendChild(holder);
  const mk = () => {
    const c = document.createElement('canvas');
    c.style.width = cssW + 'px';
    c.style.height = cssH + 'px';
    holder.appendChild(c);
    return c;
  };
  const snapshot = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;

  let maxPaper = 0;
  let maxFg = 0;
  let maxTotal = 0;
  const per = [];
  let determinismOk = true;

  for (let round = 0; round < 3; round++) {
    let roundTotal = 0;
    for (const s of J.INK_SWORDS) {
      for (let bi = 0; bi < 3; bi++) {
        const p = J.buildPainting(s, bi);
        const c1 = mk();
        const c2 = mk();
        const t0 = performance.now();
        J.renderPaper(c1, p);
        const t1 = performance.now();
        J.renderForeground(c2, p);
        const t2 = performance.now();
        const pm = t1 - t0;
        const fm = t2 - t1;
        maxPaper = Math.max(maxPaper, pm);
        maxFg = Math.max(maxFg, fm);
        maxTotal = Math.max(maxTotal, pm + fm);
        roundTotal += pm + fm;
        if (round === 0 && bi === 0) per.push({ id: s.id, name: s.name, paper: pm, fg: fm });

        // 可复现：第二份离屏 canvas 重画后像素必须一致
        const c1b = mk();
        const c2b = mk();
        J.renderPaper(c1b, p);
        J.renderForeground(c2b, p);
        const a1 = snapshot(c1);
        const b1 = snapshot(c1b);
        const a2 = snapshot(c2);
        const b2 = snapshot(c2b);
        if (a1.length !== b1.length || a2.length !== b2.length) determinismOk = false;
        else {
          for (let i = 0; i < a1.length; i += 97) {
            if (a1[i] !== b1[i] || a2[i] !== b2[i]) {
              determinismOk = false;
              break;
            }
          }
        }
      }
    }
    per.push({ roundTotal });
  }

  return { maxPaper, maxFg, maxTotal, perFirst12: per.slice(0, 12), rounds: per.slice(12), determinismOk, dpr };
});

console.log('DPR:', report.dpr);
console.log('max single paper (ms):', report.maxPaper.toFixed(2));
console.log('max single foreground (ms):', report.maxFg.toFixed(2));
console.log('max single total (ms):', report.maxTotal.toFixed(2), '/ budget 150');
console.log('12-sword round totals (ms):', report.rounds.map((r) => r.roundTotal.toFixed(1)).join(', '));
console.log('deterministic pixels:', report.determinismOk);
console.table(
  report.perFirst12.map((r) => ({
    id: r.id,
    name: r.name,
    paperMs: +r.paper.toFixed(1),
    fgMs: +r.fg.toFixed(1),
  })),
);

let fail = 0;
const assert = (c, m) => {
  console.log(c ? 'PASS:' : 'FAIL:', m);
  if (!c) fail++;
};
assert(report.maxTotal < 150, `single painting total ${report.maxTotal.toFixed(1)}ms < 150ms`);
assert(report.maxFg < 80, `intent switch foreground only ${report.maxFg.toFixed(1)}ms (feels instant)`);
assert(report.determinismOk, 'pixel-identical repaint for same (sword, intent)');

await browser.close();
process.exit(fail ? 1 : 0);

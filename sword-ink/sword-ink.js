/*
 * 墨剑谱 · sword-ink.js
 * 以剑为骨、以属性为墨 —— 程序化水墨「剑意图」生成器。
 *
 * 原则：
 *  - 纯手写三次贝塞尔 + 自研格点值噪声，零图形库 / 零噪声库；
 *  - 全链路种子驱动（FNV-1a → mulberry32），禁用 Math.random，
 *    同一把剑、同一种「笔意」必得同一幅画；
 *  - 锋利度 → 笔锋锐利与飞白多少；硬度 → 墨色浓重；
 *    韧性 → 线条弯曲与回锋；工艺 → 点缀繁简（含朱砂印）；
 *  - 每幅返回几何指纹 { pts 路径点数量, ink 墨色均值, bbox 包围盒 } 供断言。
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  if (root) root.SwordInk = mod;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const TAU = Math.PI * 2;
  const INK = 'rgb(26,29,37)';       // 松烟墨（主锋）
  const INK_SOFT = 'rgb(56,60,70)';  // 宿墨（墨骨、洇团）
  const PAPER = '#f3eee1';           // 宣纸底色
  const SEAL = 'rgb(176,52,40)';     // 朱砂印
  const PAPER_SEED = 0x5eed5eed;     // 所有画共用同一纸性，互不干扰剑的指纹
  const VARIANTS = 6;                // 每把剑的笔意数

  /* ================= 确定性随机 ================= */

  // FNV-1a 字符串散列 → uint32 种子
  function hashString(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // mulberry32 PRNG
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 整数格点散列（不依赖 Math.sin，跨平台一致）
  function latticeHash(ix, iy, seed) {
    let h = (seed >>> 0) ^ Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x165667b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // 二维值噪声（smoothstep 双线性插值）
  function makeNoise2D(seed) {
    const s = seed >>> 0;
    return function (x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const a = latticeHash(ix, iy, s), b = latticeHash(ix + 1, iy, s);
      const c = latticeHash(ix, iy + 1, s), d = latticeHash(ix + 1, iy + 1, s);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    };
  }

  // 分形叠加 fBm
  function makeFbm2(seed, octaves) {
    const noise = makeNoise2D(seed);
    const oct = octaves || 4;
    return function (x, y) {
      let v = 0, amp = 0.5, fx = x, fy = y, norm = 0;
      for (let i = 0; i < oct; i++) {
        v += amp * noise(fx, fy);
        norm += amp;
        amp *= 0.5; fx *= 2.03; fy *= 2.01;
      }
      return v / norm;
    };
  }

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ================= 名剑谱 ================= */
  // sharp 锋利 / hard 硬度 / flex 韧性 / craft 工艺（0..1）
  // len/wid 控制剑体剪影的长短宽窄，让画面形态本身可区分
  const SWORDS = [
    { id: 0,  name: '轩辕剑', pinyin: 'Xuanyuan',  sharp: 0.95, hard: 0.90, flex: 0.60, craft: 0.98, len: 1.02, wid: 1.05, note: '圣道之剑' },
    { id: 1,  name: '湛卢',   pinyin: 'Zhanlu',    sharp: 0.80, hard: 0.85, flex: 0.70, craft: 0.92, len: 1.00, wid: 1.00, note: '仁道之剑' },
    { id: 2,  name: '赤霄',   pinyin: 'Chixiao',   sharp: 0.88, hard: 0.82, flex: 0.65, craft: 0.80, len: 0.98, wid: 0.95, note: '帝道之剑' },
    { id: 3,  name: '泰阿',   pinyin: "Tai'e",     sharp: 0.85, hard: 0.88, flex: 0.72, craft: 0.85, len: 1.00, wid: 1.02, note: '威道之剑' },
    { id: 4,  name: '龙泉',   pinyin: 'Longquan',  sharp: 0.82, hard: 0.80, flex: 0.78, craft: 0.88, len: 1.00, wid: 0.95, note: '诚信之剑' },
    { id: 5,  name: '干将',   pinyin: 'Ganjiang',  sharp: 0.90, hard: 0.86, flex: 0.68, craft: 0.90, len: 1.00, wid: 1.00, note: '挚情之剑' },
    { id: 6,  name: '莫邪',   pinyin: 'Moye',      sharp: 0.89, hard: 0.84, flex: 0.74, craft: 0.91, len: 0.97, wid: 0.92, note: '挚情之剑' },
    { id: 7,  name: '鱼肠',   pinyin: 'Yuchang',  sharp: 0.96, hard: 0.78, flex: 0.62, craft: 0.84, len: 0.66, wid: 0.80, note: '勇绝之剑' },
    { id: 8,  name: '纯钧',   pinyin: 'Chunjun',   sharp: 0.87, hard: 0.90, flex: 0.70, craft: 0.93, len: 1.00, wid: 1.00, note: '尊贵之剑' },
    { id: 9,  name: '承影',   pinyin: 'Chengying', sharp: 0.92, hard: 0.75, flex: 0.80, craft: 0.86, len: 0.98, wid: 0.90, note: '优雅之剑' },
    { id: 10, name: '巨阙',   pinyin: 'Juque',     sharp: 0.78, hard: 0.95, flex: 0.55, craft: 0.82, len: 1.10, wid: 1.48, note: '厚重之剑' },
    { id: 11, name: '工布',   pinyin: 'Gongbu',    sharp: 0.84, hard: 0.87, flex: 0.73, craft: 0.87, len: 1.00, wid: 0.98, note: '霸道之剑' }
  ];

  /* ================= 几何指纹记录器 ================= */
  function makeRecorder(W, H) {
    return {
      W, H, points: 0,
      minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity,
      ink: 0,
      addPoint(x, y) {
        this.points++;
        if (x < this.minX) this.minX = x;
        if (y < this.minY) this.minY = y;
        if (x > this.maxX) this.maxX = x;
        if (y > this.maxY) this.maxY = y;
      },
      addPath(pts) { for (let i = 0; i < pts.length; i++) this.addPoint(pts[i][0], pts[i][1]); },
      // 墨色按「不透明度 × 覆盖面积 / 画布面积」累积，等价于全图墨色均值的解析估计
      addInk(alpha, area) { this.ink += (alpha * area) / (this.W * this.H); },
      fingerprint() {
        const r = (v) => Math.round(v * 10) / 10;
        return {
          pts: this.points,
          ink: Math.round(this.ink * 1e5) / 1e5,
          bbox: [r(this.minX), r(this.minY), r(this.maxX), r(this.maxY)]
        };
      }
    };
  }

  /* ================= 基础笔触（全部手写路径 + 记录指纹） ================= */

  function strokePolyline(ctx, rec, pts, width, alpha, color) {
    if (!pts || pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
      len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    rec.addPath(pts);
    rec.addInk(alpha, width * len);
  }

  function fillPolygon(ctx, rec, pts, alpha, color) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    let area = 0; // 鞋带公式求多边形面积
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      area += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
    }
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    rec.addPath(pts);
    rec.addInk(alpha, Math.abs(area / 2));
  }

  function fillCircle(ctx, rec, x, y, r, alpha, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    rec.addPoint(x - r, y - r);
    rec.addPoint(x + r, y + r);
    rec.points += 10; // 圆按十段贝塞尔近似计入路径点
    rec.addInk(alpha, Math.PI * r * r);
  }

  /* ================= 宣纸纹理（固定纸种，全部矢量绘制） ================= */
  function renderPaper(ctx, W, H) {
    const rng = mulberry32(PAPER_SEED);
    const u = Math.min(W, H);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    // 云絮：宣纸的厚薄不匀
    for (let i = 0; i < 7; i++) {
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = i % 2 ? '#e7dfcc' : '#faf6ea';
      ctx.beginPath();
      ctx.arc(rng() * W, rng() * H, u * (0.16 + rng() * 0.26), 0, TAU);
      ctx.fill();
    }
    // 帘纹：竹帘抄纸留下的平行暗痕
    ctx.strokeStyle = 'rgb(190,182,160)';
    ctx.lineWidth = 0.7;
    for (let y = 6 + rng() * 6; y < H; y += 13) {
      ctx.globalAlpha = 0.05 + rng() * 0.03;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // 纤维：乱向短丝
    ctx.strokeStyle = 'rgb(112,102,82)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 150; i++) {
      const x = rng() * W, y = rng() * H, a = rng() * TAU, l = 2 + rng() * 7;
      ctx.globalAlpha = 0.04 + rng() * 0.05;
      ctx.lineWidth = 0.5 + rng() * 0.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
    // 杂质点
    ctx.fillStyle = 'rgb(88,78,60)';
    for (let i = 0; i < 220; i++) {
      ctx.globalAlpha = 0.03 + rng() * 0.05;
      ctx.beginPath();
      ctx.arc(rng() * W, rng() * H, 0.3 + rng() * 0.9, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ================= 洇墨团（背景） ================= */
  function inkBlob(ctx, rec, noise, rng, cx, cy, R, dark) {
    const N = 44, off = rng() * 40;
    const rx = R * (0.75 + rng() * 0.5), ry = R * (0.75 + rng() * 0.5); // 非正圆，更像水渍
    const ring = (radius, wob) => {
      const pts = [];
      for (let i = 0; i < N; i++) {
        const th = (i / N) * TAU;
        const n = noise(Math.cos(th) * 1.1 + off, Math.sin(th) * 1.1 + off);
        const r = radius * (1 - wob / 2 + wob * n);
        pts.push([cx + Math.cos(th) * r * rx / R, cy + Math.sin(th) * r * ry / R]);
      }
      return pts;
    };
    // 外层淡墨洇开
    fillPolygon(ctx, rec, ring(R, 0.85), 0.05 + 0.05 * dark, INK_SOFT);
    // 洇缘积墨（水渍边缘色深）
    const edge = ring(R * 1.02, 0.9);
    edge.push(edge[0]);
    strokePolyline(ctx, rec, edge, R * 0.09, 0.04 + 0.04 * dark, INK_SOFT);
    // 内层积墨
    const ox = (rng() - 0.5) * R * 0.3, oy = (rng() - 0.5) * R * 0.3;
    fillPolygon(ctx, rec, ring(R * 0.52, 0.7).map(p => [p[0] + ox, p[1] + oy]), 0.06 + 0.07 * dark, INK);
  }

  /* ================= 剑体（前景写意笔触） ================= */
  function renderBlade(ctx, rec, sword, rng, noise, W, H, variant) {
    const u = Math.min(W, H);
    const len = u * 0.60 * sword.len * (0.94 + rng() * 0.12);
    const cx = W * 0.5 + (rng() - 0.5) * W * 0.10;
    const cy = H * (0.76 - (1 - sword.len) * 0.10) + (rng() - 0.5) * H * 0.05;
    const tilt = (rng() - 0.5) * 0.7 + (variant - (VARIANTS - 1) / 2) * 0.05;
    const ang = -Math.PI / 2 + tilt;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const px = -dy, py = dx;
    const bendSign = rng() < 0.5 ? -1 : 1;
    const bend = (sword.flex - 0.5) * 2 * bendSign; // 韧性 → 脊线弯曲

    // 脊线：三次贝塞尔 P0(剑根) → P3(剑尖)
    const P0 = [cx, cy];
    const P1 = [cx + dx * len * 0.33 + px * bend * len * 0.20, cy + dy * len * 0.33 + py * bend * len * 0.20];
    const P2 = [cx + dx * len * 0.66 - px * bend * len * 0.12, cy + dy * len * 0.66 - py * bend * len * 0.12];
    const P3 = [cx + dx * len, cy + dy * len];

    const N = 56;
    const spine = [], nrm = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, mt = 1 - t;
      spine.push([
        mt * mt * mt * P0[0] + 3 * mt * mt * t * P1[0] + 3 * mt * t * t * P2[0] + t * t * t * P3[0],
        mt * mt * mt * P0[1] + 3 * mt * mt * t * P1[1] + 3 * mt * t * t * P2[1] + t * t * t * P3[1]
      ]);
      const tx = 3 * mt * mt * (P1[0] - P0[0]) + 6 * mt * t * (P2[0] - P1[0]) + 3 * t * t * (P3[0] - P2[0]);
      const ty = 3 * mt * mt * (P1[1] - P0[1]) + 6 * mt * t * (P2[1] - P1[1]) + 3 * t * t * (P3[1] - P2[1]);
      const l = Math.hypot(tx, ty) || 1;
      nrm.push([-ty / l, tx / l]);
    }

    const wMax = u * 0.030 * sword.wid;
    // 宽度轮廓：根部宽、向剑尖收束，近镡处微微隆起
    const wAt = (t) =>
      wMax * (0.10 + 0.90 * Math.pow(1 - t, 0.72)) +
      wMax * 0.38 * Math.exp(-Math.pow((t - 0.10) / 0.075, 2));
    // 锋利 → 边缘更挺（噪声抖动更小）
    const edgeJit = (0.9 - sword.sharp * 0.6) * 0.45;

    const L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const j = (noise(i * 0.23, 3.7) - 0.5) * 2 * wMax * edgeJit;
      const w = wAt(t);
      L.push([spine[i][0] + nrm[i][0] * (w + j), spine[i][1] + nrm[i][1] * (w + j)]);
      R.push([spine[i][0] - nrm[i][0] * (w - j * 0.7), spine[i][1] - nrm[i][1] * (w - j * 0.7)]);
    }
    // 墨骨：淡墨铺出剑体（硬度 → 墨色浓淡）
    fillPolygon(ctx, rec, L.concat(R.slice().reverse()), 0.10 + sword.hard * 0.12, INK_SOFT);
    // 中锋：脊线重墨一笔
    strokePolyline(ctx, rec, spine, wMax * 0.5, 0.30 + sword.hard * 0.35, INK);

    // 飞白：排笔丝毛，锋利 → 笔道多、枯笔断口多
    const M = 3 + Math.round(sword.sharp * 7);
    const gapBase = 0.78 - sword.sharp * 0.55;
    for (let b = 0; b < M; b++) {
      const f = (b / (M - 1)) * 2 - 1 + (rng() - 0.5) * 0.18;
      const lw = wMax * (0.08 + rng() * 0.10);
      let run = [], runIdx = 0;
      const flush = () => {
        if (run.length > 1) {
          const a = (0.16 + 0.45 * sword.hard) * (0.45 + 0.55 * noise(b * 1.71, runIdx * 3.3));
          strokePolyline(ctx, rec, run, lw, a, INK);
        }
        run = []; runIdx++;
      };
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const dry = gapBase * (0.35 + 0.65 * t); // 越到剑尖越枯
        if (noise(b * 3.13 + 11.7, i * 0.42) > dry) {
          const off = f * wAt(t) * 0.85 + (noise(i * 0.31, b * 7.7) - 0.5) * wMax * 0.5;
          run.push([spine[i][0] + nrm[i][0] * off, spine[i][1] + nrm[i][1] * off]);
        } else flush();
      }
      flush();
    }

    // 剑尖飞白：出锋短丝
    const T = [P3[0] - P2[0], P3[1] - P2[1]];
    const tl = Math.hypot(T[0], T[1]) || 1;
    T[0] /= tl; T[1] /= tl;
    const streaks = 2 + Math.round(sword.sharp * 3);
    for (let s = 0; s < streaks; s++) {
      const sp = (rng() - 0.5) * 0.35;
      const sx = T[0] * Math.cos(sp) - T[1] * Math.sin(sp);
      const sy = T[0] * Math.sin(sp) + T[1] * Math.cos(sp);
      const L2 = len * (0.02 + rng() * 0.05);
      strokePolyline(ctx, rec,
        [[P3[0] - T[0] * len * 0.02, P3[1] - T[1] * len * 0.02], [P3[0] + sx * L2, P3[1] + sy * L2]],
        wMax * 0.10, 0.25 + rng() * 0.3, INK);
    }

    // 回锋：韧性高则根回收笔、尖上带出
    if (sword.flex > 0.52) {
      const hook = [];
      const hx = -dx * len * 0.05 + px * bendSign * len * 0.055 * sword.flex;
      const hy = -dy * len * 0.05 + py * bendSign * len * 0.055 * sword.flex;
      const ex = -dx * len * 0.015 + px * bendSign * len * 0.095 * sword.flex;
      const ey = -dy * len * 0.015 + py * bendSign * len * 0.095 * sword.flex;
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, mt = 1 - t;
        hook.push([
          mt * mt * P0[0] + 2 * mt * t * (P0[0] + hx) + t * t * (P0[0] + ex),
          mt * mt * P0[1] + 2 * mt * t * (P0[1] + hy) + t * t * (P0[1] + ey)
        ]);
      }
      strokePolyline(ctx, rec, hook, wMax * (0.28 + 0.3 * sword.flex), 0.42, INK);
    }
    if (sword.flex > 0.74) {
      strokePolyline(ctx, rec,
        [P3, [P3[0] + T[0] * len * 0.025 - nrm[N][0] * len * 0.018 * bendSign,
              P3[1] + T[1] * len * 0.025 - nrm[N][1] * len * 0.018 * bendSign]],
        wMax * 0.16, 0.4, INK);
    }

    // 剑镡：近根一横
    const gi = Math.round(N * 0.05);
    const g = spine[gi], gn = nrm[gi];
    const gw = wMax * 2.7;
    const guard = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, mt = 1 - t;
      const ax = g[0] - gn[0] * gw, ay = g[1] - gn[1] * gw;
      const bx = g[0] + gn[0] * gw, by = g[1] + gn[1] * gw;
      const cx2 = g[0] + dx * wMax * 0.6, cy2 = g[1] + dy * wMax * 0.6;
      guard.push([mt * mt * ax + 2 * mt * t * cx2 + t * t * bx, mt * mt * ay + 2 * mt * t * cy2 + t * t * by]);
    }
    strokePolyline(ctx, rec, guard, wMax * 0.5, 0.30 + sword.hard * 0.35, INK);

    // 剑茎（柄）：下行双笔
    const hTip = [P0[0] - dx * len * 0.15, P0[1] - dy * len * 0.15];
    strokePolyline(ctx, rec,
      [[P0[0] + px * wMax * 0.35, P0[1] + py * wMax * 0.35], [hTip[0] + px * wMax * 0.35, hTip[1] + py * wMax * 0.35]],
      wMax * 0.42, 0.45, INK);
    strokePolyline(ctx, rec,
      [[P0[0] - px * wMax * 0.35, P0[1] - py * wMax * 0.35], [hTip[0] - px * wMax * 0.35, hTip[1] - py * wMax * 0.35]],
      wMax * 0.42, 0.45, INK);
    // 缠绳：工艺过半者柄上三箍
    if (sword.craft > 0.55) {
      for (let k = 0; k < 3; k++) {
        const s = 0.3 + k * 0.25;
        const mx = P0[0] + (hTip[0] - P0[0]) * s, my = P0[1] + (hTip[1] - P0[1]) * s;
        strokePolyline(ctx, rec,
          [[mx - px * wMax * 0.75, my - py * wMax * 0.75], [mx + px * wMax * 0.75, my + py * wMax * 0.75]],
          wMax * 0.16, 0.4, INK);
      }
    }
    // 剑首
    fillCircle(ctx, rec, hTip[0] - dx * len * 0.015, hTip[1] - dy * len * 0.015, wMax * 0.75, 0.55, INK);

    return { spine, nrm, wAt, N, u };
  }

  /* ================= 点缀（工艺 → 繁简） ================= */
  function renderOrnaments(ctx, rec, sword, rng, W, H, blade) {
    const u = blade.u;
    const n = Math.round(sword.craft * 7);
    const m = u * 0.02;
    for (let k = 0; k < n; k++) {
      const t = 0.08 + rng() * 0.8;
      const i = Math.round(t * blade.N);
      const side = rng() < 0.5 ? -1 : 1;
      const dist = blade.wAt(t) * (2.2 + rng() * 4.5);
      const x = clamp(blade.spine[i][0] + blade.nrm[i][0] * side * dist, m, W - m);
      const y = clamp(blade.spine[i][1] + blade.nrm[i][1] * side * dist, m, H - m);
      const kind = rng();
      if (kind < 0.45) {
        // 点苔
        fillCircle(ctx, rec, x, y, u * (0.003 + rng() * 0.006), 0.18 + rng() * 0.35, INK);
      } else if (kind < 0.8) {
        // 碎锋
        const a = rng() * TAU, l = u * (0.012 + rng() * 0.02);
        strokePolyline(ctx, rec, [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], u * 0.004, 0.2 + rng() * 0.3, INK);
      } else {
        // 小环（剑穗饰）
        const r = u * (0.006 + rng() * 0.008);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.strokeStyle = INK;
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = u * 0.0025;
        ctx.stroke();
        rec.addPoint(x - r, y - r); rec.addPoint(x + r, y + r);
        rec.points += 10;
        rec.addInk(0.25, TAU * r * u * 0.0025);
      }
    }
  }

  /* ================= 朱砂印（工艺 ≥ 0.8 者落印） ================= */
  function renderSeal(ctx, rec, sword, rng, W, H, variant) {
    if (sword.craft < 0.8) return;
    const u = Math.min(W, H);
    const s = u * 0.085;
    const sideX = (variant % 2 === 0) ? 1 : -1;
    const cx = clamp(W * 0.5 + sideX * W * (0.26 + rng() * 0.08), s * 0.8, W - s * 0.8);
    const cy = clamp(H * (0.68 + rng() * 0.16), s * 0.8, H - s * 0.8);
    const rot = (rng() - 0.5) * 0.16;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = SEAL;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    // 白文：抽象篆意
    ctx.strokeStyle = PAPER;
    ctx.lineCap = 'round';
    const strokes = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < strokes; i++) {
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = s * 0.09;
      const horiz = rng() < 0.5;
      const a = (rng() - 0.5) * s * 0.62, b = (rng() - 0.5) * s * 0.62;
      const l = s * (0.2 + rng() * 0.4);
      ctx.beginPath();
      if (horiz) { ctx.moveTo(a - l / 2, b); ctx.lineTo(a + l / 2, b); }
      else { ctx.moveTo(a, b - l / 2); ctx.lineTo(a, b + l / 2); }
      ctx.stroke();
    }
    ctx.restore();
    const h = s * 0.7072; // 旋转外接盒半径
    rec.addPoint(cx - h, cy - h); rec.addPoint(cx + h, cy + h);
    rec.points += 2 + strokes * 2;
    rec.addInk(0.85, s * s * 0.8);
  }

  /* ================= 主入口 ================= */
  // render(ctx, W, H, swordIndex, variant) → 几何指纹
  function render(ctx, W, H, swordIndex, variant) {
    const sword = SWORDS[swordIndex];
    if (!sword) throw new RangeError('unknown sword: ' + swordIndex);
    variant = ((variant % VARIANTS) + VARIANTS) % VARIANTS;
    const seed = hashString('sword-ink|v2|' + sword.id + '|' + variant);
    const rng = mulberry32(seed);
    const noise = makeFbm2(seed ^ 0x9e3779b9, 4);
    const rec = makeRecorder(W, H);
    const u = Math.min(W, H);

    ctx.save();
    renderPaper(ctx, W, H);

    // 背景：洇开的墨团（数量随笔意变化）
    const blobs = 2 + (variant % 2) + Math.floor(rng() * 2);
    for (let b = 0; b < blobs; b++) {
      const R = u * (0.10 + rng() * 0.15);
      const bx = clamp(W * (0.5 + (rng() - 0.5) * 0.72), R, W - R);
      const by = clamp(H * (0.5 + (rng() - 0.5) * 0.72), R, H - R);
      inkBlob(ctx, rec, noise, rng, bx, by, R, sword.hard);
    }

    // 前景：剑 + 点缀 + 印
    const blade = renderBlade(ctx, rec, sword, rng, noise, W, H, variant);
    renderOrnaments(ctx, rec, sword, rng, W, H, blade);
    renderSeal(ctx, rec, sword, rng, W, H, variant);

    ctx.restore();
    ctx.globalAlpha = 1;
    return rec.fingerprint();
  }

  // 空上下文：只记录几何、不做任何绘制，用于纯计算指纹
  const NOOP_CTX = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : function () {}),
    set: (t, k, v) => { t[k] = v; return true; }
  });

  // fingerprint(swordIndex, variant, W, H) → 不依赖画布的指纹计算
  function fingerprint(swordIndex, variant, W, H) {
    return render(NOOP_CTX, W || 400, H || 520, swordIndex, variant == null ? 0 : variant);
  }

  return {
    VERSION: '1.0.0',
    SWORDS,
    VARIANTS,
    render,
    fingerprint,
    _internals: { hashString, mulberry32, makeNoise2D, makeFbm2 }
  };
});

# 墨剑谱 · 十二名剑剑意图

以剑的形态为骨、以属性为墨的程序化水墨画。**零依赖**：纯 Canvas 手写三次贝塞尔 +
自研格点值噪声（FNV-1a → mulberry32 → value-noise fBm），全程不用 `Math.random`。

## 运行

直接用浏览器打开 `index.html` 即可（无需构建、无需服务器）；或：

```bash
cd sword-ink && python3 -m http.server 8000   # http://localhost:8000
```

## 属性 → 笔墨映射

| 属性 | 笔墨 |
| --- | --- |
| 锋利度 | 笔锋锐利度（刃缘噪声抖动更小）与飞白（排笔丝毛更多、枯笔断口更多、剑尖出锋丝更多） |
| 硬度 | 墨色浓重（墨骨不透明度、中锋与排笔的 alpha） |
| 韧性 | 脊线贝塞尔的弯曲与根部「回锋」、尖上带出 |
| 工艺 | 点缀繁简（点苔 / 碎锋 / 小环的数量），≥0.8 者落朱砂白文印 |

背景为固定纸种的宣纸（云絮、帘纹、纤维、杂质）+ 噪声边缘的洇墨团（淡墨洇开、
洇缘积墨、内层积墨三层）；前景为剑的写意笔触：墨骨剪影、中锋一笔、飞白排笔、
剑镡、缠绳、剑首。

## 可复现与种子

- 种子 = `hash('sword-ink|v2|<剑号>|<笔意>')`，同一（剑， 意）必得同一幅画；
- 点击任意一幅换「笔意」（每剑 6 意），只换构图参数，仍可复现；
- 全部种子写入地址栏：`#v=意0,意1,…,意11`，刷新 / 分享 / 前进后退均还原画面。

## 几何指纹（供断言）

```js
SwordInk.fingerprint(剑号, 笔意)   // → { pts, ink, bbox }，纯计算不依赖画布
SwordInk.render(ctx, W, H, 剑号, 笔意) // 绘制并返回同样的指纹
```

- `pts`：路径点数量；`ink`：墨色均值（α×面积 / 画布面积的解析累积）；
- `bbox`：包围盒 `[x0,y0,x1,y1]`（CSS 像素）。
- 浏览器里每幅卡片的 `data-fingerprint` 属性与 `window.SwordInkUI.fingerprints()` 亦可取。
- 十二把剑指纹两两不同（`node test.js` 断言）。

## 性能与清晰度

- 单幅生成逻辑实测 ≈0.7ms（连开发用的纯 CPU 软光栅也仅 40–260ms），预算 150ms 充裕；
- 画布按 `devicePixelRatio`（上限 3）分配位图并 `setTransform(dpr,…)` 矢量重绘，
  resize 防抖重绘，任何 DPR 下不模糊；
- 十二幅为静态一次性渲染，无动画循环，同屏不卡。

## 文件

- `sword-ink.js` — 生成器核心（UMD，浏览器 / Node 通用）
- `index.html` — 十二宫格展示页（DPR 适配、地址栏种子、点击换意）
- `test.js` — 断言测试：`node test.js`
- `render-preview.js` — 开发用纯 Node 软光栅预览：`node render-preview.js [笔意]` → `preview.png`
- `preview.png` / `preview-variants.png` — 意 0 与意 3 的效果样张

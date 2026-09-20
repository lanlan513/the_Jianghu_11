# 江湖名剑谱 · 剑意图

## 剑意图（程序化水墨）

`/jianyi` 为十二柄名剑各生成一幅独一无二的水墨「剑意图」。整套笔触只用原生 Canvas 2D
（手写二次贝塞尔 + 程序噪声边缘），**不引入任何图形库或噪声库，全代码不出现 `Math.random`**。

### 属性 → 笔墨映射

| 属性 | 画面表现 |
| --- | --- |
| 锋利度 sharpness | 锋尖收束早晚、飞白多寡与枯细、边缘缺刻、迸墨与剑气数量 |
| 硬度 hardness | 墨色浓淡（焦墨 ↔ 淡墨）与湿晕积墨 |
| 韧性 flexibility | 剑身弧弯、剑尖回锋勾、流苏摆幅、剑气曲度 |
| 工艺 craftsmanship | 剑格云纹、镶嵌星纹、缠柄道数、流苏股数等繁简 |

另有逐剑形制因子（鱼肠短、巨阙大）与逐剑噪声相位，保证同属性也绝不雷同。

### 复现与种子

- 每幅画由 `seedFor(swordId, intent) = jian-yi:{id}:bi:{n}` 驱动（mulberry32 + 值噪声），
  同剑同笔意逐像素一致；浏览器端已用离屏 canvas 做像素级复测。
- 点击任意一幅（或 ←/→ 键）切换三种**笔意**（立锋正悬 / 横斜醉笔 / 回锋倒卷）。
  换意只改变旋转/缩放/平移等**构图参数**，剑身骨相与墨色不变。
- 当前笔意与最后点选的剑写入地址栏：`#bi=1&jian=8`，刷新、前进后退均可复现。

### 几何指纹（可断言）

每幅画暴露三元组指纹（画廊「指纹」开关可见）：

- `pathPoints`：前景笔触轮廓顶点总数
- `inkMean`：按面积加权的墨色均值（0..255），只由剑属性决定，与笔意无关
- `bbox`：NDC 纸坐标包围盒（换笔意随之改变）

Node 测试断言：同一笔意下任意两剑的指纹三元组不可能完全相同。

### 性能

- 宣纸纹理（纤维/颗粒/云版/毛边/洇墨）只由剑种子决定，绘制一次即沉于独立 canvas 层；
  换笔意仅重画前景笔触。
- 十二幅首帧经 `requestAnimationFrame` 逐帧分片，单帧只画一幅，不阻塞交互。
- 实测（DPR=2，300×375）：单幅含宣纸约 5–7ms、前景约 2–3ms，远低于 150ms 预算。
- backing store 按 `min(devicePixelRatio, 2)` 缩放，高分屏不模糊、低端机不爆量。

### 引擎位置与测试

```
src/lib/ink/
  rng.ts        # FNV/murmur 哈希、mulberry32、值噪声/fbm（确定性随机层）
  swords.ts     # 十二剑属性与形制
  intents.ts    # 三种笔意（构图参数）+ 地址栏协议
  geometry.ts   # 纯函数：以剑为骨、属性为墨的笔触几何 + 几何指纹
  renderer.ts   # Canvas：宣纸纹理、洇墨、贝塞尔笔触、飞白、钤印
  jianyi.test.ts# node:test 断言（可复现/唯一性/属性映射/性能/禁用随机源）
```

```bash
npm run test:jianyi     # Node 几何断言（无需浏览器）
```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  extends: [
    // other configs...
    // Enable lint rules for React
    reactX.configs['recommended-typescript'],
    // Enable lint rules for React DOM
    reactDom.configs.recommended,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

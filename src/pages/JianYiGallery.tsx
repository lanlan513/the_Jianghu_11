import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, BarChart3, Keyboard } from 'lucide-react';
import { INK_SWORDS } from '@/lib/ink/swords';
import { INTENTS, INTENT_COUNT, parseHash, writeHash } from '@/lib/ink/intents';
import { buildPainting } from '@/lib/ink/geometry';
import { renderPaper, renderForeground } from '@/lib/ink/renderer';
import SwordInkCanvas from '@/components/jianyi/SwordInkCanvas';

// 开发/测试可观测：暴露引擎供控制台断言（不引入任何依赖）
declare global {
  interface Window {
    __jianyi?: {
      INK_SWORDS: typeof INK_SWORDS;
      buildPainting: typeof buildPainting;
      renderPaper: typeof renderPaper;
      renderForeground: typeof renderForeground;
    };
  }
}

export default function JianYiGallery() {
  const [bi, setBi] = useState(() => parseHash().bi);
  const [focusJian, setFocusJian] = useState<string | null>(() => parseHash().jian);
  const [showStats, setShowStats] = useState(true);
  const timingsRef = useRef<number[]>([]);
  const [maxFgMs, setMaxFgMs] = useState(0);

  // hash 同步：地址栏即种子（支持前进/后退）
  useEffect(() => {
    const sync = () => {
      const { bi: hBi, jian } = parseHash();
      setBi(hBi);
      setFocusJian(jian);
    };
    window.addEventListener('hashchange', sync);
    if (!window.location.hash) writeHash(0, null);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const cycleIntent = useCallback(
    (swordId?: string) => {
      const next = (bi + 1) % INTENT_COUNT;
      setBi(next);
      setFocusJian(swordId ?? null);
      writeHash(next, swordId ?? null);
    },
    [bi],
  );

  // 键盘 ← → 换笔意
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') cycleIntent();
      if (e.key === 'ArrowLeft') {
        const prev = (bi - 1 + INTENT_COUNT) % INTENT_COUNT;
        setBi(prev);
        writeHash(prev, focusJian);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bi, focusJian, cycleIntent]);

  /** rAF 分片队列：每帧只画一幅，十二幅分十二帧 → 单屏不卡 */
  const queueRef = useRef<Array<() => void>>([]);
  const flushingRef = useRef(false);
  const enqueue = useCallback((fn: () => void) => {
    queueRef.current.push(fn);
    if (flushingRef.current) return;
    flushingRef.current = true;
    const flush = () => {
      const job = queueRef.current.shift();
      if (job) job();
      if (queueRef.current.length > 0) {
        requestAnimationFrame(flush);
      } else {
        flushingRef.current = false;
      }
    };
    requestAnimationFrame(flush);
  }, []);

  const handleTiming = useCallback((_paperMs: number, fgMs: number) => {
    if (fgMs > 0) {
      timingsRef.current.push(fgMs);
      // 只保留最近 60 次
      if (timingsRef.current.length > 60) timingsRef.current.shift();
      setMaxFgMs((m) => Math.max(m, fgMs));
    }
  }, []);

  const intent = INTENTS[bi];

  // 暴露引擎（性能/一致性断言用）
  useEffect(() => {
    window.__jianyi = { INK_SWORDS, buildPainting, renderPaper, renderForeground };
  }, []);

  // 指纹唯二校验（实时）
  const allUnique = useMemo(() => {
    const sigs = new Set<string>();
    for (const s of INK_SWORDS) {
      const f = buildPainting(s, bi).fingerprint;
      sigs.add(
        `${f.pathPoints}|${f.inkMean}|${f.bbox.minX},${f.bbox.minY},${f.bbox.maxX},${f.bbox.maxY}`,
      );
    }
    return sigs.size === INK_SWORDS.length;
  }, [bi]);

  return (
    <div className="min-h-screen pt-16 bg-ink-100">
      <div className="container mx-auto px-4 py-8">
        {/* 页眉 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <Link
              to="/swords"
              className="inline-flex items-center gap-1 text-sm font-song text-ink-500 hover:text-cinnabar-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> 返回名剑谱
            </Link>
            <h1 className="font-brush text-4xl md:text-5xl text-ink-900 flex items-center gap-3">
              剑意图
              <span className="font-song text-sm text-ink-500 tracking-wider">
                以剑为骨 · 以属性为墨
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => cycleIntent()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cinnabar-600 text-ink-100 font-song text-sm hover:bg-cinnabar-700 transition-colors shadow-brush"
            >
              <RefreshCw className="w-4 h-4" />
              换一种笔意（{bi + 1}/{INTENT_COUNT}）
            </button>
            <button
              onClick={() => setShowStats((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2 border-2 font-song text-sm transition-colors ${
                showStats
                  ? 'bg-ink-800 text-ink-100 border-ink-800'
                  : 'bg-ink-50 text-ink-700 border-ink-200 hover:border-ink-400'
              }`}
              title="显示/隐藏几何指纹"
            >
              <BarChart3 className="w-4 h-4" />
              指纹
            </button>
          </div>
        </div>

        {/* 笔意状态条 */}
        <div className="ink-card p-4 mb-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <div className="font-brush text-2xl text-cinnabar-700">{intent.title}</div>
            <div className="font-song text-sm text-ink-600">{intent.desc}</div>
          </div>
          <div className="font-mono text-xs text-ink-500">
            address: <span className="text-ink-800">{window.location.hash || '#bi=0'}</span>
          </div>
          <div className="font-song text-xs text-ink-500 flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5" /> ← → 键可全局换意，点击单幅以该剑换意
          </div>
          <div
            className={`font-song text-xs px-2 py-1 ${
              allUnique ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {allUnique ? `✓ 十二剑指纹两两不同` : '✗ 指纹冲突'}
          </div>
          {maxFgMs > 0 && (
            <div
              className={`font-song text-xs px-2 py-1 ${
                maxFgMs < 150 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              单幅峰值 {maxFgMs.toFixed(1)}ms（预算 150ms）
            </div>
          )}
        </div>

        {/* 十二幅剑意图 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {INK_SWORDS.map((sword) => (
            <button
              key={sword.id}
              onClick={() => cycleIntent(sword.id)}
              className="ink-card text-left hover:shadow-ink-hover transition-shadow group"
              title="点击换一种笔意"
            >
              <SwordInkCanvas
                sword={sword}
                intent={bi}
                enqueue={enqueue}
                onTiming={handleTiming}
                showStats={showStats}
              />
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-brush text-xl text-ink-900 group-hover:text-cinnabar-600 transition-colors">
                    {sword.name}
                  </span>
                  <span className="seal-stamp !text-[10px]">{sword.alias}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-4 gap-1 font-song text-[9px] text-ink-500">
                  {[
                    ['锋', sword.attrs.sharpness],
                    ['硬', sword.attrs.hardness],
                    ['韧', sword.attrs.flexibility],
                    ['工', sword.attrs.craftsmanship],
                  ].map(([label, v]) => (
                    <div key={label as string} className="text-center">
                      <span className="text-ink-400">{label}</span>
                      <span className="ml-0.5 text-ink-700">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 画诀 */}
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            {
              k: '锋利度',
              v: '锋',
              t: '决定锋尖收束的早晚、飞白的多寡与枯细、边缘缺刻与迸墨。锋越利，越见寒芒。',
            },
            {
              k: '硬度',
              v: '墨',
              t: '决定墨色浓淡：硬则焦墨沉厚，软则淡墨清润；湿晕的积墨范围也随之变化。',
            },
            {
              k: '韧性 + 工艺',
              v: '韧 · 工',
              t: '韧性决定剑身弯曲、剑尖回锋之勾与流苏摆幅；工艺决定云纹、镶嵌、缠柄、流苏股数的繁简。',
            },
          ].map((x) => (
            <div key={x.k} className="ink-card p-4">
              <div className="font-brush text-xl text-cinnabar-700 mb-1">
                {x.k} · {x.v}
              </div>
              <p className="font-song text-sm text-ink-600 leading-relaxed">{x.t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

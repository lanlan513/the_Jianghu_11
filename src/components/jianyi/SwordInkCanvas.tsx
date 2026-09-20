import { useEffect, useRef, useState } from 'react';
import {
  buildPainting,
  renderPaper,
  renderForeground,
  type InkSword,
  type Painting,
} from '@/lib/ink';

interface SwordInkCanvasProps {
  sword: InkSword;
  intent: number;
  /** 父级把绘制任务排队（rAF 分片），避免十二幅同帧抢主线程 */
  enqueue: (fn: () => void) => void;
  onTiming?: (paperMs: number, fgMs: number) => void;
  showStats: boolean;
}

interface Size {
  w: number;
  h: number;
  dpr: number;
}

/**
 * 一幅剑意图 = 上下两层 canvas：
 *   下层宣纸（纤维/颗粒/云版/洇墨，只由剑种子驱动，换笔意绝不重画）
 *   上层前景（剑之写意笔触，仅随笔意重绘）
 */
export default function SwordInkCanvas({
  sword,
  intent,
  enqueue,
  onTiming,
  showStats,
}: SwordInkCanvasProps) {
  const paperRef = useRef<HTMLCanvasElement>(null);
  const fgRef = useRef<HTMLCanvasElement>(null);
  const paintingRef = useRef<Painting | null>(null);
  const sizeRef = useRef<Size | null>(null);
  const paperForRef = useRef<string | null>(null); // 当前宣纸画的是哪把剑
  const [fingerprint, setFingerprint] = useState<Painting['fingerprint'] | null>(null);
  const [fgMs, setFgMs] = useState(0);

  // 几何（纯函数，极廉价；同 (剑,笔意) 逐字节一致，绝不使用 Math.random）
  paintingRef.current = buildPainting(sword, intent);
  const painting = paintingRef.current;

  const configure = (canvas: HTMLCanvasElement): Size | null => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    return { w, h, dpr };
  };

  const paintPaper = () => {
    const paper = paperRef.current;
    if (!paper) return 0;
    const size = configure(paper);
    if (!size) return 0;
    sizeRef.current = size;
    const ms = renderPaper(paper, paintingRef.current!);
    paperForRef.current = sword.id;
    return ms;
  };

  const paintFg = () => {
    const fg = fgRef.current;
    if (!fg) return 0;
    if (!configure(fg)) return 0;
    const ms = renderForeground(fg, paintingRef.current!);
    setFingerprint(paintingRef.current!.fingerprint);
    setFgMs(ms);
    return ms;
  };

  /** 全量：宣纸（若该剑尚未画过）+ 前景 */
  const repaintAll = () => {
    const paperMs = paperForRef.current === sword.id ? 0 : paintPaper();
    const fgMs = paintFg();
    if (paperMs + fgMs > 0) onTiming?.(paperMs, fgMs);
  };

  /** 只重前景（换笔意路径） */
  const repaintFgOnly = () => {
    const fgMs = paintFg();
    if (fgMs > 0) onTiming?.(0, fgMs);
  };

  // 首帧分片调度
  useEffect(() => {
    enqueue(repaintAll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 响应式断点 / DPR 变化 → 全量重画
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    const ro = new ResizeObserver(() => {
      const w = paper.clientWidth;
      const h = paper.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cur = sizeRef.current;
      if (cur && cur.w === w && cur.h === h && cur.dpr === dpr) return;
      paperForRef.current = null; // 尺寸变了，宣纸也要重画
      enqueue(repaintAll);
    });
    ro.observe(paper);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enqueue]);

  // 换剑：宣纸 + 前景；换笔意：仅前景
  useEffect(() => {
    enqueue(paperForRef.current === sword.id ? repaintFgOnly : repaintAll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, sword.id]);

  return (
    <div className="relative w-full aspect-[4/5] bg-[#f1ead5] select-none overflow-hidden">
      <canvas ref={paperRef} className="absolute inset-0 w-full h-full" aria-hidden />
      <canvas ref={fgRef} className="absolute inset-0 w-full h-full" />
      {showStats && fingerprint && (
        <div className="absolute left-2 bottom-2 right-2 font-song text-[10px] leading-tight text-ink-700/85 bg-[#f5efdd]/85 px-1.5 py-1">
          <div>
            路径点 <b>{fingerprint.pathPoints}</b> · 墨色均值 <b>{fingerprint.inkMean}</b> · 前景{' '}
            {fgMs.toFixed(1)}ms
          </div>
          <div className="font-mono text-[9px] text-ink-500">
            bbox [{fingerprint.bbox.minX.toFixed(2)},{fingerprint.bbox.minY.toFixed(2)} →{' '}
            {fingerprint.bbox.maxX.toFixed(2)},{fingerprint.bbox.maxY.toFixed(2)}]
          </div>
        </div>
      )}
      <div className="absolute top-2 left-2 font-mono text-[9px] text-ink-500/75 bg-[#f5efdd]/70 px-1 py-0.5">
        {painting.seed}
      </div>
    </div>
  );
}

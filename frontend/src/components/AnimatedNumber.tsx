// ─── AnimatedNumber — eases a number toward target over ~600ms ───────────────
// Respects prefers-reduced-motion; fixed decimals; no deps.
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  format?: (v: number) => string;
}

function reducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

export default function AnimatedNumber({
  value, decimals = 0, duration = 600, className, format,
}: Props) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion()) { setShown(value); fromRef.current = value; return; }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setShown(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = to; rafRef.current = null; }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const text = format ? format(shown) : shown.toFixed(decimals);
  return <span className={className} aria-live="polite">{text}</span>;
}

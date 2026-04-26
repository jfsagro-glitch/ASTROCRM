// ─── usePullToRefresh — touch-only pull-to-refresh on document top ───────────
// Returns {pulling, progress 0..1}. Calls onRefresh() once threshold reached.
// Only activates when window.scrollY === 0 to avoid hijacking inner scrolls.
import { useEffect, useRef, useState } from 'react';
import { haptic } from './useHaptic';

const THRESHOLD = 72;   // px to trigger
const MAX_PULL  = 110;  // px clamp

export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    function onStart(e: TouchEvent) {
      if (window.scrollY > 0 || busy) { startY.current = null; return; }
      startY.current = e.touches[0]?.clientY ?? null;
    }
    function onMove(e: TouchEvent) {
      if (startY.current == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy > 0 && window.scrollY === 0) {
        const damped = Math.min(MAX_PULL, dy * 0.55);
        setPull(damped);
        if (damped >= THRESHOLD && pull < THRESHOLD) haptic('select');
      } else if (dy <= 0) {
        setPull(0);
      }
    }
    async function onEnd() {
      if (startY.current == null) { setPull(0); return; }
      const reached = pull >= THRESHOLD;
      startY.current = null;
      if (reached && !busy) {
        setBusy(true);
        haptic('success');
        try { await onRefresh(); } finally {
          setBusy(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    }
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove',  onMove,  { passive: true });
    window.addEventListener('touchend',   onEnd,   { passive: true });
    window.addEventListener('touchcancel', onEnd,  { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove',  onMove);
      window.removeEventListener('touchend',   onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [busy, pull, onRefresh]);

  return {
    pull,
    busy,
    progress: Math.min(1, pull / THRESHOLD),
    threshold: THRESHOLD,
  };
}

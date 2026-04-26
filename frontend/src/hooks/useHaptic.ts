// ─── useHaptic — tiny haptic feedback util (navigator.vibrate, no-op if absent)
// Tactile cues for primary actions on mobile. Respects user reduce-motion.
export type HapticPattern = 'tap' | 'success' | 'warn' | 'error' | 'select';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap:     8,
  select:  12,
  success: [10, 40, 10],
  warn:    [20, 60, 20],
  error:   [30, 80, 30, 80, 30],
};

function reducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

export function haptic(p: HapticPattern = 'tap'): void {
  if (reducedMotion()) return;
  const nav = navigator as unknown as { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate === 'function') {
    try { nav.vibrate(PATTERNS[p]); } catch {/* ignore */}
  }
}

export function useHaptic() {
  return haptic;
}

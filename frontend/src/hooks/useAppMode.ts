/**
 * useAppMode — persists Простой/Профи display mode in localStorage.
 * "simple" hides advanced blocks; "pro" shows everything.
 */
import { useState, useCallback } from 'react';

export type AppMode = 'simple' | 'pro';

const STORAGE_KEY = 'astrocrm_app_mode';

export function useAppMode(): { mode: AppMode; toggle: () => void; isSimple: boolean; isPro: boolean } {
  const [mode, setMode] = useState<AppMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'pro' ? 'pro' : 'simple';
    } catch {
      return 'simple';
    }
  });

  const toggle = useCallback(() => {
    setMode(prev => {
      const next: AppMode = prev === 'simple' ? 'pro' : 'simple';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* quota exceeded — ignore */ }
      return next;
    });
  }, []);

  return { mode, toggle, isSimple: mode === 'simple', isPro: mode === 'pro' };
}

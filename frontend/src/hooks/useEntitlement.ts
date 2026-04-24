// ─── useEntitlement — текущий тариф пользователя + refresh ──────────────────
import { useCallback, useEffect, useState } from 'react';
import { getEntitlement, type Entitlement } from '../services/billingService';

interface Result {
  entitlement: Entitlement | null;
  isPro: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEntitlement(userId?: string): Result {
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!userId) {
      setEntitlement(null); setIsPro(false); return;
    }
    setLoading(true); setError(null);
    try {
      const r = await getEntitlement(userId);
      setEntitlement(r.entitlement);
      setIsPro(r.isPro);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void fetchOnce(); }, [fetchOnce]);

  return { entitlement, isPro, loading, error, refresh: fetchOnce };
}

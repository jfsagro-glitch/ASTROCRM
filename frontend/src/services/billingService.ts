// ─── billingService — entitlement + plan catalog client ────────────────────
const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

export type Tier = 'free' | 'pro';

export interface Entitlement {
  user_id: string;
  tier: Tier;
  valid_until: string | null;
  source: string | null;
  updated_at: string;
}

export interface Plan {
  id: string;                // 'free' | 'pro_month' | 'pro_year'
  name: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
  sbp?: boolean;
  badge?: string;
}

export async function getEntitlement(userId: string): Promise<{ entitlement: Entitlement; isPro: boolean }> {
  const res = await fetch(`${API_URL}/api/billing/entitlement?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`billing ${res.status}`);
  const data = await res.json();
  return { entitlement: data.entitlement as Entitlement, isPro: !!data.is_pro };
}

export async function getPlans(): Promise<Plan[]> {
  const res = await fetch(`${API_URL}/api/billing/plans`);
  if (!res.ok) throw new Error(`billing plans ${res.status}`);
  const data = await res.json();
  return (data.plans as Plan[]) ?? [];
}

/** DEV helper — выдать Pro вручную (на проде должно быть под auth). */
export async function grantPro(userId: string, days = 30, source = 'manual'): Promise<Entitlement> {
  const res = await fetch(`${API_URL}/api/billing/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, tier: 'pro', days, source }),
  });
  if (!res.ok) throw new Error(`grant ${res.status}`);
  const data = await res.json();
  return data.entitlement as Entitlement;
}

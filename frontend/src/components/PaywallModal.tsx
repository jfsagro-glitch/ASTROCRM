// ─── PaywallModal — Pro upgrade modal с тарифами и CTA на СБП ───────────────
// YooKassa/Tinkoff SBP wiring — отдельным эпиком. Сейчас кнопка «Оплатить»
// открывает внешний платёжный URL из env (VITE_PAYMENT_URL_MONTH/_YEAR)
// с query user_id=<uid>, либо показывает контакт поддержки.
import { useEffect, useState } from 'react';
import { X, Check, Zap, Sparkles, Loader2 } from 'lucide-react';
import { getPlans, type Plan } from '../services/billingService';

interface Props {
  open: boolean;
  onClose: () => void;
  userId?: string;
  feature?: string;   // что пользователь пытался открыть — для копирайта
}

const PAY_URL_MONTH = (import.meta.env.VITE_PAYMENT_URL_MONTH as string) || '';
const PAY_URL_YEAR  = (import.meta.env.VITE_PAYMENT_URL_YEAR  as string) || '';
const SUPPORT_URL   = (import.meta.env.VITE_SUPPORT_URL as string) || 'mailto:support@astrocrm.local';

function buildPayUrl(base: string, userId?: string): string {
  if (!base) return '';
  const sep = base.includes('?') ? '&' : '?';
  return userId ? `${base}${sep}user_id=${encodeURIComponent(userId)}` : base;
}

export default function PaywallModal({ open, onClose, userId, feature }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setError(null);
    getPlans()
      .then(p => { if (!cancelled) setPlans(p); })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const paid = plans.filter(p => p.id !== 'free');
  const free = plans.find(p => p.id === 'free');

  const goPay = (planId: string) => {
    const url = planId === 'pro_year' ? PAY_URL_YEAR : PAY_URL_MONTH;
    const full = buildPayUrl(url, userId);
    if (full) {
      window.open(full, '_blank', 'noopener');
    } else {
      window.open(SUPPORT_URL, '_blank', 'noopener');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Обновление до Pro"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-3xl rounded-3xl border border-amber-300/25 bg-slate-900/95 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-3 right-3 w-9 h-9 rounded-full text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 text-amber-300 mb-2">
            <Sparkles size={18} aria-hidden="true" />
            <span className="text-xs uppercase tracking-widest font-semibold">HOLO Pro</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white m-0">
            Откройте глубину {feature ? `для «${feature}»` : 'астрологии'}
          </h2>
          <p className="mt-2 text-sm text-white/70 leading-relaxed">
            Pro — это персональная глубина: фирдарий с практиками, Solar/Lunar Return-таймлайн,
            безлимитный дневник и push без задержек. Оплата по СБП — моментально.
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-white/60 py-10 justify-center">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Загружаем тарифы…
            </div>
          )}

          {error && (
            <div className="mt-4 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              Не удалось загрузить тарифы: {error}
            </div>
          )}

          {!loading && paid.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {paid.map(plan => (
                <div
                  key={plan.id}
                  className={
                    'relative rounded-2xl border p-5 flex flex-col ' +
                    (plan.badge
                      ? 'border-amber-300/40 bg-amber-400/5'
                      : 'border-white/10 bg-white/5')
                  }
                >
                  {plan.badge && (
                    <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold uppercase tracking-wider">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-white m-0">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    <span className="text-sm text-white/60">₽ / {plan.period}</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-white/80 list-none p-0 m-0 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => goPay(plan.id)}
                    className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-amber-400 text-slate-900 text-sm font-semibold hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                  >
                    <Zap size={14} aria-hidden="true" />
                    Оплатить по СБП
                  </button>
                  {plan.sbp && (
                    <p className="text-[11px] text-white/50 mt-2 text-center m-0">
                      СБП · моментальное зачисление · без комиссий
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && free && (
            <div className="mt-5 pt-5 border-t border-white/10 text-xs text-white/55">
              Сейчас у вас <strong className="text-white/80">Free</strong>: {free.features.join(' · ')}.
              Вопросы — <a href={SUPPORT_URL} className="text-amber-300 hover:underline" target="_blank" rel="noopener">поддержка</a>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

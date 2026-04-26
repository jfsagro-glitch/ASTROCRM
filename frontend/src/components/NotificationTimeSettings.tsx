// ─── NotificationTimeSettings — pick morning push time, sync to backend ──────
import { useState } from 'react';
import { Bell, BellOff, Clock } from 'lucide-react';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { haptic } from '../hooks/useHaptic';

interface ThemeLike { card: string; header: string; accent: string; text: string; btn: string; symbol: string; }
interface Props { theme: ThemeLike; userId?: string; }

const TIMES: Array<{ h: number; m: number; label: string }> = [
  { h: 6, m: 30, label: '06:30' },
  { h: 7, m: 0,  label: '07:00' },
  { h: 7, m: 30, label: '07:30' },
  { h: 8, m: 0,  label: '08:00' },
  { h: 9, m: 0,  label: '09:00' },
  { h: 10, m: 0, label: '10:00' },
];

const KEY = 'astrocrm:push_morning';

interface Stored { h: number; m: number; enabled: boolean; }

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Stored>;
      return {
        h: typeof v.h === 'number' ? v.h : 8,
        m: typeof v.m === 'number' ? v.m : 0,
        enabled: v.enabled !== false,
      };
    }
  } catch {/* ignore */}
  return { h: 8, m: 0, enabled: true };
}

export default function NotificationTimeSettings({ theme, userId }: Props) {
  const { status, subscribed, loading, subscribe, unsubscribe, updatePrefs, supported } = usePushSubscription(userId);
  const [s, setS] = useState<Stored>(read());
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  if (!supported) return null;

  async function pick(h: number, m: number) {
    haptic('select');
    const next = { ...s, h, m };
    setS(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {/* ignore */}
    if (subscribed) {
      setSaving(true);
      const ok = await updatePrefs({ morning_hour: h, morning_minute: m });
      setSaving(false);
      if (ok) setSavedAt(Date.now());
    }
  }

  async function toggleEnabled() {
    haptic('tap');
    if (!subscribed) {
      const ok = await subscribe();
      if (ok) {
        await updatePrefs({ morning_hour: s.h, morning_minute: s.m, enabled: true });
        const next = { ...s, enabled: true };
        setS(next);
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {/* ignore */}
      }
      return;
    }
    const next = { ...s, enabled: !s.enabled };
    setS(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {/* ignore */}
    setSaving(true);
    await updatePrefs({ enabled: next.enabled });
    setSaving(false);
    if (!next.enabled) await unsubscribe();
  }

  const label = `${String(s.h).padStart(2, '0')}:${String(s.m).padStart(2, '0')}`;
  const blocked = status === 'denied';

  return (
    <div className={`rounded-2xl border ${theme.card} p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <Bell size={14} className={theme.symbol} aria-hidden="true" />
        <h3 className={`text-sm font-semibold ${theme.header} m-0`}>Утренние напоминания</h3>
        {savedAt && Date.now() - savedAt < 2500 && (
          <span className="ml-auto text-[10px] text-emerald-300 opacity-80">сохранено</span>
        )}
      </div>

      <p className={`text-xs ${theme.text} opacity-70 leading-relaxed m-0`}>
        Краткая сводка дня в выбранное время. Тихо, без рекламы. Можно выключить в любой момент.
      </p>

      {blocked && (
        <p className="text-xs text-amber-300 opacity-90 m-0">
          Уведомления заблокированы в настройках браузера. Разрешите их, чтобы включить напоминания.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Время утреннего уведомления">
        {TIMES.map((t) => {
          const active = t.h === s.h && t.m === s.m;
          return (
            <button
              key={t.label}
              role="radio"
              aria-checked={active}
              disabled={blocked || saving}
              onClick={() => pick(t.h, t.m)}
              className={`text-xs px-3 py-2 min-h-[36px] rounded-xl border tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                active
                  ? 'bg-white/15 border-white/30 text-white font-semibold'
                  : 'bg-white/4 border-white/10 text-white/70 hover:text-white hover:bg-white/8'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={toggleEnabled}
          disabled={loading || blocked}
          className={`flex items-center gap-1.5 text-xs px-3 py-2 min-h-[40px] rounded-xl ${theme.btn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50`}
          aria-pressed={subscribed && s.enabled}
        >
          {subscribed && s.enabled
            ? <><Bell size={12} aria-hidden="true" /> Включено в {label}</>
            : <><BellOff size={12} aria-hidden="true" /> Включить</>}
        </button>
        {subscribed && s.enabled && (
          <span className={`flex items-center gap-1 text-[11px] ${theme.text} opacity-60`}>
            <Clock size={10} aria-hidden="true" /> ежедневно
          </span>
        )}
      </div>
    </div>
  );
}

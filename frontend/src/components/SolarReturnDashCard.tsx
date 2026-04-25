// ─── SolarReturnDashCard — compact Solar Return summary for the dashboard ────
// Shows the upcoming solar year at a glance: SR date, days until SR,
// main sphere of the year (ASC sphere), SR ASC + Sun + Moon houses,
// dominant element/modality, double returns. Uses the city the user
// previously saved in SolarReturnBlock; if none, falls back to natal place
// with a hint to set it up.
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sun, Moon, MapPin, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import type { BirthInput } from '../types/astro';
import { getSolarReturnDeep } from '../services/astrologyService';
import { loadObsCity } from '../utils/solarCity';

interface Theme {
  card: string; header: string; accent: string; text: string; btn: string;
  tabActive: string; tabInactive: string; symbol: string;
  wheelTheme?: 'dark' | 'light';
}

interface Props {
  birth: BirthInput;
  theme: Theme;
  onOpenFull?: () => void;   // optional callback — switch to full Solar tab
}

interface DeepResult {
  sr_year?: number;
  sr_date_utc?: string;
  year_card?: {
    main_sphere?: number;
    main_sphere_label?: string;
    sr_asc?: string;
    sun_in_sr_house?: number;
    moon_in_sr_house?: number;
    dominant_element?: string;
    dominant_modality?: string;
    returns?: string[];
  };
  sphere_map?: { primary_sphere?: string; summary?: string };
  planetary_returns_summary?: string;
  dominant_quality?: { element_ru?: string; modality_ru?: string };
}

function pickSrYear(birth: BirthInput): number {
  // Pick the next upcoming SR year: if today is before this year's birthday → this year, else next.
  const now = new Date();
  const y = now.getFullYear();
  if (!birth.date) return y;
  const [, mm, dd] = birth.date.split('-').map(Number);
  const thisYearBday = new Date(y, (mm ?? 1) - 1, dd ?? 1);
  return now < thisYearBday ? y : y + 1;
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const t = new Date(m[1] + 'T00:00:00Z').getTime();
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((t - todayUtc) / 86400000);
}

export default function SolarReturnDashCard({ birth, theme, onOpenFull }: Props) {
  const [data, setData] = useState<DeepResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme.wheelTheme !== 'light';
  const savedCity = loadObsCity(birth);
  const usedCity = savedCity ?? { name: 'место рождения', lat: birth.lat, lon: birth.lon };
  const srYear = useMemo(() => pickSrYear(birth), [birth.date]);

  useEffect(() => {
    if (!birth.date || !birth.time) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      try {
        const r = await getSolarReturnDeep(birth, srYear, usedCity.lat, usedCity.lon, false);
        if (!cancelled) setData(r as DeepResult);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [birth.date, birth.time, srYear, usedCity.lat, usedCity.lon]);

  const card = data?.year_card;
  const days = daysUntil(data?.sr_date_utc);
  const dq = data?.dominant_quality;

  return (
    <section
      aria-label="Соляр года"
      className={`rounded-2xl border ${theme.card} card-lift overflow-hidden`}
    >
      <header className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <Sun size={16} className="text-amber-300" aria-hidden="true" />
        <h3 className={`m-0 text-sm font-semibold ${theme.header}`}>Соляр {srYear}</h3>
        {loading && <Loader2 size={14} className="animate-spin text-white/40 ml-auto" aria-hidden="true" />}
        {!loading && data && (
          <button
            onClick={onOpenFull}
            className="ml-auto text-[11px] text-white/60 hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            подробнее <ArrowRight size={11} aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="p-4 space-y-3">
        {/* City line */}
        <div className="flex items-center gap-2 text-[11px]">
          <MapPin size={12} className="text-white/40 shrink-0" aria-hidden="true" />
          <span className={savedCity ? 'text-white/75' : 'text-amber-300/80'}>
            {savedCity
              ? <>Место встречи дня рождения: <b>{savedCity.name}</b></>
              : <>Город не указан — используется место рождения. <span className="opacity-70">Задайте город в разделе «Соляр».</span></>}
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-300">
            <AlertCircle size={12} aria-hidden="true" /> {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Top banner: date + days until */}
            <div className={`rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 ${
              isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
            }`}>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-white/45">Возврат Солнца</div>
                <div className="text-sm font-semibold text-amber-200">
                  {data.sr_date_utc ? data.sr_date_utc.slice(0, 10) : '—'}
                </div>
              </div>
              {days !== null && (
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-white/45">До соляра</div>
                  <div className={`text-sm font-semibold ${days <= 30 ? 'text-amber-200' : 'text-white/80'}`}>
                    {days <= 0 ? 'уже прошёл' : days === 1 ? 'завтра' : `${days} дн.`}
                  </div>
                </div>
              )}
            </div>

            {/* Main sphere */}
            {card?.main_sphere && (
              <div className="rounded-xl px-3 py-2.5 bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-wide text-white/45 mb-0.5">Главная сфера года</div>
                <div className="text-sm font-semibold text-white">
                  Дом {card.main_sphere}{card.main_sphere_label ? ` — ${card.main_sphere_label}` : ''}
                </div>
                {card.sr_asc && (
                  <div className="text-[11px] text-white/55 mt-0.5">АСЦ соляра: {card.sr_asc}</div>
                )}
              </div>
            )}

            {/* Sun / Moon mini grid — only when at least one is present */}
            {(card?.sun_in_sr_house != null || card?.moon_in_sr_house != null) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg px-3 py-2 bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45 mb-0.5">
                    <Sun size={10} className="text-amber-300" aria-hidden="true" /> Солнце
                  </div>
                  <div className="text-sm text-white/85">
                    {card?.sun_in_sr_house != null ? `Дом ${card.sun_in_sr_house}` : '—'}
                  </div>
                </div>
                <div className="rounded-lg px-3 py-2 bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45 mb-0.5">
                    <Moon size={10} className="text-sky-300" aria-hidden="true" /> Луна
                  </div>
                  <div className="text-sm text-white/85">
                    {card?.moon_in_sr_house != null ? `Дом ${card.moon_in_sr_house}` : '—'}
                  </div>
                </div>
              </div>
            )}

            {/* Element / modality */}
            {(dq?.element_ru || card?.dominant_element) && (
              <div className="flex flex-wrap gap-1.5">
                {(dq?.element_ru || card?.dominant_element) && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    Стихия: {dq?.element_ru ?? card?.dominant_element}
                  </span>
                )}
                {(dq?.modality_ru || card?.dominant_modality) && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300">
                    Модальность: {dq?.modality_ru ?? card?.dominant_modality}
                  </span>
                )}
              </div>
            )}

            {/* Double returns */}
            {data.planetary_returns_summary && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2 bg-emerald-500/10 border border-emerald-500/20">
                <Sparkles size={14} className="text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[11px] text-emerald-100/85 leading-relaxed m-0">
                  {data.planetary_returns_summary}
                </p>
              </div>
            )}
          </>
        )}

        {!loading && !error && !data && birth.date && birth.time && (
          <p className="text-xs text-white/55 m-0">Не удалось рассчитать соляр.</p>
        )}
      </div>
    </section>
  );
}

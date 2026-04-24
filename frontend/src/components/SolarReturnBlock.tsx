// ─── SolarReturnBlock — полный сервис Соляр по системе Андреева ─────────────
import React, { useState } from 'react';
import { Loader2, AlertCircle, MapPin, Star, Sun, Moon, Search } from 'lucide-react';
import { getSolarReturnDeep, getSolarReturnCities, getSolarReturnSphereSearch } from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

// ── types ─────────────────────────────────────────────────────────────────────
type Theme = {
  card: string; header: string; accent: string; text: string; btn: string;
  tabActive: string; tabInactive: string; symbol: string; wheelTheme: 'dark' | 'light';
};

interface Props {
  birth: BirthInput;
  theme: Theme;
}

// prettier-ignore
const SPHERE_KEYWORDS = [
  { label: 'Карьера',          value: 'career' },
  { label: 'Финансы',          value: 'money' },
  { label: 'Любовь',           value: 'love' },
  { label: 'Партнёрство',      value: 'partnership' },
  { label: 'Дом / семья',      value: 'home' },
  { label: 'Здоровье',         value: 'health' },
  { label: 'Творчество',       value: 'creativity' },
  { label: 'Коммуникации',     value: 'communication' },
  { label: 'Путешествия',      value: 'travel' },
  { label: 'Трансформация',    value: 'transformation' },
  { label: 'Духовность',       value: 'spirituality' },
  { label: 'Личность',         value: 'self' },
];

const DEFAULT_CITIES = [
  { name: 'Москва',      lat: 55.75, lon: 37.62 },
  { name: 'Санкт-Петербург', lat: 59.93, lon: 30.32 },
  { name: 'Берлин',      lat: 52.52, lon: 13.40 },
  { name: 'Стамбул',     lat: 41.01, lon: 28.97 },
  { name: 'Дубай',       lat: 25.20, lon: 55.27 },
  { name: 'Барселона',   lat: 41.39, lon:  2.15 },
  { name: 'Тбилиси',     lat: 41.69, lon: 44.83 },
  { name: 'Батуми',      lat: 41.64, lon: 41.64 },
  { name: 'Белград',     lat: 44.79, lon: 20.46 },
  { name: 'Лимасол',     lat: 34.68, lon: 33.04 },
  { name: 'Бали',        lat: -8.34, lon: 115.09 },
  { name: 'Нью-Йорк',   lat: 40.71, lon: -74.01 },
];

const Spin = () => <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" />;
const ErrBox = ({ msg }: { msg: string }) => (
  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
    <AlertCircle className="h-4 w-4 shrink-0" />{msg}
  </div>
);

function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${className}`}>
      <h4 className="text-sm font-bold opacity-80">{title}</h4>
      {children}
    </div>
  );
}

function Badge({ children, color = 'slate' }: { children: React.ReactNode; color?: string }) {
  const cls = color === 'amber'
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : color === 'green'
    ? 'bg-green-500/10 text-green-300 border-green-500/20'
    : color === 'red'
    ? 'bg-red-500/10 text-red-300 border-red-500/20'
    : color === 'blue'
    ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
    : 'bg-slate-500/10 text-slate-300 border-slate-500/20';
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}>{children}</span>;
}

// ── Year Card ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function YearCard({ card, isDark }: { card: any; isDark: boolean }) {
  if (!card) return null;
  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Sun className="h-5 w-5 text-amber-400" />
        <span className={`font-bold text-base ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
          Соляр {card.sr_year} — {card.sr_date_utc ?? ''}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {card.main_sphere && (
          <div className={`rounded-lg p-2.5 ${isDark ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
            <div className="text-xs opacity-60 mb-0.5">Главная сфера года</div>
            <div className={`font-semibold ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
              Дом {card.main_sphere} — {card.main_sphere_label ?? ''}
            </div>
          </div>
        )}
        {card.sr_asc && (
          <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-800/60' : 'bg-white'}`}>
            <div className="text-xs opacity-60 mb-0.5">АСЦ соляра</div>
            <div className="font-semibold">{card.sr_asc}</div>
          </div>
        )}
        {card.sun_in_sr_house != null && (
          <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-800/60' : 'bg-white'}`}>
            <div className="text-xs opacity-60 mb-0.5">Солнце в соляре</div>
            <div className="font-semibold">Дом {card.sun_in_sr_house}</div>
          </div>
        )}
        {card.moon_in_sr_house != null && (
          <div className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-800/60' : 'bg-white'}`}>
            <div className="text-xs opacity-60 mb-0.5">Луна в соляре</div>
            <div className="font-semibold">Дом {card.moon_in_sr_house}</div>
          </div>
        )}
      </div>
      {card.dominant_element && (
        <div className="mt-2 flex gap-2 flex-wrap">
          <Badge color="amber">Стихия: {card.dominant_element}</Badge>
          {card.dominant_modality && <Badge color="blue">Модальность: {card.dominant_modality}</Badge>}
        </div>
      )}
      {card.returns && card.returns.length > 0 && (
        <div className="mt-2">
          <div className="text-xs opacity-60 mb-1">Планетарные ретурны:</div>
          <div className="flex flex-wrap gap-1.5">
            {card.returns.map((r: string, i: number) => <Badge key={i} color="green">{r}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Interpretation section (8 priorities) ─────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InterpBlock({ interp, isDark }: { interp: any; isDark: boolean }) {
  if (!interp) return null;

  const PRIORITY_META: Record<string, { icon: string; color: string }> = {
    priority_1: { icon: '🏠', color: isDark ? 'border-amber-600/40 bg-amber-900/20' : 'border-amber-200 bg-amber-50' },
    priority_2: { icon: '⚡', color: isDark ? 'border-orange-600/40 bg-orange-900/20' : 'border-orange-200 bg-orange-50' },
    priority_3: { icon: '💼', color: isDark ? 'border-blue-600/40 bg-blue-900/20' : 'border-blue-200 bg-blue-50' },
    priority_4: { icon: '☀️', color: isDark ? 'border-yellow-600/40 bg-yellow-900/20' : 'border-yellow-200 bg-yellow-50' },
    priority_5: { icon: '🌙', color: isDark ? 'border-indigo-600/40 bg-indigo-900/20' : 'border-indigo-200 bg-indigo-50' },
    priority_6: { icon: '🔑', color: isDark ? 'border-purple-600/40 bg-purple-900/20' : 'border-purple-200 bg-purple-50' },
    priority_7: { icon: '🔗', color: isDark ? 'border-green-600/40 bg-green-900/20' : 'border-green-200 bg-green-50' },
    priority_8: { icon: '🧲', color: isDark ? 'border-slate-600/40 bg-slate-800/40' : 'border-slate-200 bg-slate-50' },
    year_card:   { icon: '📋', color: isDark ? 'border-amber-600/40 bg-amber-900/20' : 'border-amber-200 bg-amber-50' },
    action_plan: { icon: '✅', color: isDark ? 'border-green-600/40 bg-green-900/20' : 'border-green-200 bg-green-50' },
  };

  const entries = Object.entries(interp as Record<string, string>);

  return (
    <div className="space-y-3">
      {entries.map(([key, text]) => {
        if (!text || key === 'type') return null;
        const meta = PRIORITY_META[key] ?? { icon: '•', color: isDark ? 'border-slate-600/30 bg-slate-800/30' : 'border-slate-200 bg-white' };
        // Render as plain label / body
        const label = key
          .replace('priority_', 'Приоритет ')
          .replace('year_card', 'Год в словах')
          .replace('action_plan', 'План действий')
          .replace('_', ' ');
        return (
          <div key={key} className={`rounded-xl border ${meta.color} p-4`}>
            <div className="flex items-start gap-2">
              <span className="text-lg leading-tight mt-0.5">{meta.icon}</span>
              <div>
                <div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-1">{label}</div>
                <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sphere Map ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SphereMapBlock({ smap, isDark }: { smap: any; isDark: boolean }) {
  if (!smap) return null;
  const items = [
    { label: 'АСЦ соляра', house: smap.asc_natal_house, sphere: smap.primary_sphere },
    { label: 'МС соляра',  house: smap.mc_natal_house,  sphere: smap.career_sphere },
    { label: 'Солнце',     house: smap.sun_natal_house,  sphere: smap.sun_sphere },
    { label: 'Луна',       house: smap.moon_natal_house, sphere: smap.moon_sphere },
  ];
  return (
    <div className={`rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'} p-4`}>
      <h4 className="text-xs font-bold opacity-60 uppercase tracking-wide mb-3">Карта сфер года</h4>
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <div key={it.label} className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
            <div className="text-[11px] opacity-50">{it.label}</div>
            <div className="font-semibold text-sm">Дом {it.house}</div>
            <div className="text-[11px] opacity-70">{it.sphere ?? ''}</div>
          </div>
        ))}
      </div>
      {smap.summary && (
        <p className="mt-3 text-xs leading-relaxed opacity-70">{smap.summary}</p>
      )}
    </div>
  );
}

// ── City comparison results ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CitiesResult({ result, isDark }: { result: any; isDark: boolean }) {
  if (!result) return null;
  const cities = result.cities as unknown[];
  if (!cities?.length) return null;

  return (
    <div className="space-y-3">
      {result.recommendation && (
        <div className={`rounded-xl border p-3 text-sm font-medium ${isDark ? 'bg-green-900/20 border-green-700/40 text-green-200' : 'bg-green-50 border-green-200 text-green-800'}`}>
          ✅ {result.recommendation}
        </div>
      )}

      {/* Sphere recommendations grid */}
      {result.sphere_recommendations && Object.keys(result.sphere_recommendations).length > 0 && (
        <div className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50'}`}>
          <h4 className="text-xs font-bold opacity-60 uppercase tracking-wide mb-2">Лучший город по сфере</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {Object.values(result.sphere_recommendations as Record<string, { sphere_label: string; best_city: string; sr_asc: string }>).map((v, i) => (
              <div key={i} className={`rounded-lg p-2 text-[11px] ${isDark ? 'bg-slate-700/40' : 'bg-white border border-slate-100'}`}>
                <div className="opacity-60 truncate">{v.sphere_label}</div>
                <div className="font-semibold truncate">{v.best_city}</div>
                <div className="opacity-50">{v.sr_asc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* City list */}
      <div className="space-y-2">
        {(cities as {
          city: string; category: string; sr_asc: { formatted: string; sphere_label: string; diff_from_natal_asc: number; in_natal_house: number }; target_match?: boolean; sr_date_utc?: string;
        }[]).map((c, i) => (
          <div key={i} className={`rounded-xl border p-3 ${
            c.target_match === true
              ? isDark ? 'border-amber-600/50 bg-amber-900/20' : 'border-amber-300 bg-amber-50'
              : isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 opacity-40 shrink-0" />
                <span className="font-semibold text-sm">{c.city}</span>
                {c.target_match && <Badge color="amber">✓ совпадение</Badge>}
              </div>
              <span className="text-[11px] opacity-50 shrink-0">{c.sr_date_utc?.slice(0, 10) ?? ''}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
              <span className="opacity-70">АСЦ: <b>{c.sr_asc?.formatted}</b></span>
              <span className="opacity-50">Дом {c.sr_asc?.in_natal_house} — {c.sr_asc?.sphere_label}</span>
              {c.sr_asc?.diff_from_natal_asc != null && (
                <span className="opacity-50">Δ нат. АСЦ: {c.sr_asc.diff_from_natal_asc}°</span>
              )}
            </div>
            <p className="mt-1 text-[11px] opacity-60">{c.category}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sphere search results ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SphereSearchResult({ result, isDark }: { result: any; isDark: boolean }) {
  if (!result) return null;
  return (
    <div className="space-y-3">
      {result.recommendation && (
        <div className={`rounded-xl border p-3 text-sm font-medium ${isDark ? 'bg-blue-900/20 border-blue-700/40 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          🎯 {result.recommendation}
        </div>
      )}
      {result.exact_matches?.length > 0 && (
        <div>
          <h4 className="text-xs font-bold opacity-60 uppercase mb-2">Точное совпадение ({result.exact_matches.length})</h4>
          <div className="space-y-1.5">
            {(result.exact_matches as { city: string; sr_asc: string; sr_asc_house: number }[]).map((c, i) => (
              <div key={i} className={`rounded-lg border p-2.5 ${isDark ? 'border-amber-600/40 bg-amber-900/20' : 'border-amber-200 bg-amber-50'}`}>
                <span className="font-semibold text-sm">{c.city}</span>
                <span className="ml-2 text-xs opacity-70">АСЦ {c.sr_asc} · Дом {c.sr_asc_house}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {result.near_matches?.length > 0 && (
        <div>
          <h4 className="text-xs font-bold opacity-60 uppercase mb-2">Рядом (в пределах 5°)</h4>
          <div className="space-y-1.5">
            {(result.near_matches as { city: string; sr_asc: string; dist_to_cusp: number }[]).map((c, i) => (
              <div key={i} className={`rounded-lg border p-2.5 ${isDark ? 'border-slate-600/40 bg-slate-800/40' : 'border-slate-200 bg-slate-50'}`}>
                <span className="font-semibold text-sm">{c.city}</span>
                <span className="ml-2 text-xs opacity-70">АСЦ {c.sr_asc} · {c.dist_to_cusp}° от куспида</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {result.all_cities_ranked?.length > 0 && (
        <div>
          <h4 className="text-xs font-bold opacity-60 uppercase mb-2">Все города (по близости)</h4>
          <div className="space-y-1.5">
            {(result.all_cities_ranked as { city: string; sr_asc: string; sr_asc_house: number; dist_to_cusp: number }[]).map((c, i) => (
              <div key={i} className={`rounded-lg border p-2 ${isDark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-100 bg-white'}`}>
                <span className="font-semibold text-sm">{i + 1}. {c.city}</span>
                <span className="ml-2 text-xs opacity-60">АСЦ {c.sr_asc} · Дом {c.sr_asc_house} · Δ {c.dist_to_cusp}°</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function SolarReturnBlock({ birth, theme }: Props) {
  const isDark = theme.wheelTheme === 'dark';
  const thisYear = new Date().getFullYear();

  // ── tabs ─
  type Tab = 'deep' | 'cities' | 'sphere-search';
  const [tab, setTab] = useState<Tab>('deep');

  // ── deep analysis state ─
  const [srYear, setSrYear] = useState(thisYear);
  const [obsLat, setObsLat] = useState<string>('');
  const [obsLon, setObsLon] = useState<string>('');
  const [includeLunars, setIncludeLunars] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deepResult, setDeepResult] = useState<any>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState('');

  // ── city comparison state ─
  const [citySrYear, setCitySrYear] = useState(thisYear);
  const [cityTargetSphere, setCityTargetSphere] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cityResult, setCityResult] = useState<any>(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState('');

  // ── sphere search state ─
  const [ssYear, setSsYear] = useState(thisYear);
  const [ssSphere, setSsSphere] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ssResult, setSsResult] = useState<any>(null);
  const [ssLoading, setSsLoading] = useState(false);
  const [ssError, setSsError] = useState('');

  // ── actions ─────────────────────────────────────────────────────────────────
  const runDeep = async () => {
    setDeepLoading(true); setDeepError(''); setDeepResult(null);
    try {
      const lat = obsLat !== '' ? parseFloat(obsLat) : undefined;
      const lon = obsLon !== '' ? parseFloat(obsLon) : undefined;
      const r = await getSolarReturnDeep(birth, srYear, lat, lon, includeLunars);
      setDeepResult(r);
    } catch (e: unknown) {
      setDeepError(e instanceof Error ? e.message : String(e));
    } finally { setDeepLoading(false); }
  };

  const runCities = async () => {
    setCityLoading(true); setCityError(''); setCityResult(null);
    try {
      const r = await getSolarReturnCities(birth, citySrYear, DEFAULT_CITIES, undefined, cityTargetSphere || undefined);
      setCityResult(r);
    } catch (e: unknown) {
      setCityError(e instanceof Error ? e.message : String(e));
    } finally { setCityLoading(false); }
  };

  const runSphereSearch = async () => {
    if (!ssSphere) { setSsError('Выберите сферу жизни'); return; }
    setSsLoading(true); setSsError(''); setSsResult(null);
    try {
      const r = await getSolarReturnSphereSearch(birth, ssYear, DEFAULT_CITIES, undefined, ssSphere);
      setSsResult(r);
    } catch (e: unknown) {
      setSsError(e instanceof Error ? e.message : String(e));
    } finally { setSsLoading(false); }
  };

  // ── UI helpers ───────────────────────────────────────────────────────────────
  const card = `${theme.card} border`;
  const yearBtns = [thisYear, thisYear + 1, thisYear + 2, thisYear + 3];

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex flex-wrap gap-1.5">
        {([
          { key: 'deep',         icon: '🌞', label: 'Глубокий анализ' },
          { key: 'cities',       icon: '🗺️', label: 'Сравнение городов' },
          { key: 'sphere-search',icon: '🎯', label: 'Найти город по сфере' },
        ] as { key: Tab; icon: string; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
              tab === t.key ? theme.tabActive : theme.tabInactive
            }`}
          >
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════ DEEP ANALYSIS ═══════════════════════════ */}
      {tab === 'deep' && (
        <div className="space-y-3">
          <div className={`rounded-xl ${card} p-4 space-y-3`}>
            <h4 className={`text-sm font-semibold ${theme.header}`}>🌞 Глубокий анализ Соляра · 8 приоритетов Андреева</h4>
            <p className={`text-xs ${theme.text} opacity-60 leading-relaxed`}>
              Полная расшифровка солярного года: главная сфера, планеты в угловых домах, управитель АСЦ, лунный фон, карьерный вектор, ключевые аспекты и двойные ретурны.
            </p>
            {/* Year */}
            <div>
              <label className={`text-xs ${theme.text} mb-1 block`}>Год возврата</label>
              <div className="flex gap-1.5 flex-wrap">
                {yearBtns.map(y => (
                  <button key={y} onClick={() => setSrYear(y)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${srYear === y ? theme.tabActive : theme.tabInactive}`}
                  >{y}</button>
                ))}
                <input type="number" value={srYear} onChange={e => setSrYear(parseInt(e.target.value))}
                  className={`px-3 py-1.5 rounded-lg border text-xs w-20 ${theme.card}`} />
              </div>
            </div>
            {/* Observation location */}
            <div>
              <label className={`text-xs ${theme.text} mb-1 block`}>Город встречи дня рождения (необязательно)</label>
              <div className="flex gap-2 flex-wrap">
                <div>
                  <label className={`text-[10px] ${theme.text} opacity-50 mb-0.5 block`}>Широта</label>
                  <input type="number" step="0.01" placeholder={`${birth.lat}`} value={obsLat}
                    onChange={e => setObsLat(e.target.value)}
                    className={`px-2 py-1.5 rounded-lg border text-xs w-24 ${theme.card}`} />
                </div>
                <div>
                  <label className={`text-[10px] ${theme.text} opacity-50 mb-0.5 block`}>Долгота</label>
                  <input type="number" step="0.01" placeholder={`${birth.lon}`} value={obsLon}
                    onChange={e => setObsLon(e.target.value)}
                    className={`px-2 py-1.5 rounded-lg border text-xs w-24 ${theme.card}`} />
                </div>
                <button onClick={() => { setObsLat(''); setObsLon(''); }}
                  className={`self-end px-2 py-1.5 rounded-lg border text-[10px] ${theme.tabInactive}`}
                  title="Сбросить (использовать натальный город)">↺ Сброс</button>
              </div>
              <p className={`text-[10px] ${theme.text} opacity-40 mt-1`}>
                Пусто = место рождения. Укажите город, где планируете встретить день рождения.
              </p>
            </div>
            {/* Lunars toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={includeLunars} onChange={e => setIncludeLunars(e.target.checked)}
                className="rounded" />
              <span className={`text-xs ${theme.text}`}>Включить лунный календарь + «горячие месяцы»</span>
            </label>

            <button onClick={runDeep} disabled={deepLoading}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${theme.btn}`}
            >
              {deepLoading ? <><Spin />Вычисляю...</> : <><Star className="h-4 w-4" />Рассчитать соляр</>}
            </button>
          </div>

          {deepError && <ErrBox msg={deepError} />}

          {deepResult && (
            <div className="space-y-4">
              {/* Year card */}
              <YearCard card={deepResult.year_card} isDark={isDark} />

              {/* Dominant quality */}
              {deepResult.dominant_quality && (
                <div className={`rounded-xl ${card} p-3`}>
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className={`text-xs font-bold ${theme.accent}`}>Стихия / Модальность:</span>
                    <Badge color="amber">{deepResult.dominant_quality.element_ru}</Badge>
                    <Badge color="blue">{deepResult.dominant_quality.modality_ru}</Badge>
                    {deepResult.dominant_quality.description && (
                      <span className={`text-xs ${theme.text} opacity-60`}>{deepResult.dominant_quality.description}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Sphere map */}
              <SphereMapBlock smap={deepResult.sphere_map} isDark={isDark} />

              {/* ASC Ruler (Priority 6) */}
              {deepResult.sr_asc_ruler && (
                <div className={`rounded-xl border p-3 ${isDark ? 'border-purple-600/30 bg-purple-900/15' : 'border-purple-200 bg-purple-50'}`}>
                  <div className="text-xs font-bold opacity-60 uppercase mb-1">Управитель АСЦ соляра</div>
                  <p className="text-sm">{deepResult.sr_asc_ruler.interpretation ?? JSON.stringify(deepResult.sr_asc_ruler)}</p>
                </div>
              )}

              {/* Planetary returns banner */}
              {deepResult.planetary_returns_summary && (
                <div className={`rounded-xl border p-3 ${isDark ? 'border-green-700/30 bg-green-900/15' : 'border-green-200 bg-green-50'}`}>
                  <div className={`text-xs font-bold mb-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>⭐ Двойные ретурны</div>
                  <p className="text-sm">{deepResult.planetary_returns_summary}</p>
                </div>
              )}

              {/* Interpretation (8 priorities) */}
              {deepResult.interpretation && (
                <Section title="📖 Интерпретация года" className={theme.card + ' border'}>
                  <InterpBlock interp={deepResult.interpretation} isDark={isDark} />
                </Section>
              )}

              {/* Hot months */}
              {deepResult.hot_months && deepResult.hot_months.length > 0 && (
                <Section title="🔥 Горячие месяцы года" className={theme.card + ' border'}>
                  <div className="space-y-1.5">
                    {(deepResult.hot_months as { lr_date: string; activated_natal_house: number; asc_sign: string }[]).map((m, i) => (
                      <div key={i} className={`rounded-lg p-2 text-sm ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                        <span className="font-mono text-xs opacity-60">{m.lr_date?.slice(0, 10)}</span>
                        <span className="ml-2">Лунный возврат → Дом {m.activated_natal_house} · АСЦ {m.asc_sign}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════ CITY COMPARISON ═════════════════════════ */}
      {tab === 'cities' && (
        <div className="space-y-3">
          <div className={`rounded-xl ${card} p-4 space-y-3`}>
            <h4 className={`text-sm font-semibold ${theme.header}`}>🗺️ Сравнение городов для Соляра</h4>
            <p className={`text-xs ${theme.text} opacity-60`}>
              Сравниваем АСЦ соляра в {DEFAULT_CITIES.length} популярных городах. Необязательно укажите целевую сферу — и города будут отсортированы по соответствию.
            </p>

            {/* Year */}
            <div>
              <label className={`text-xs ${theme.text} mb-1 block`}>Год</label>
              <div className="flex gap-1.5 flex-wrap">
                {yearBtns.map(y => (
                  <button key={y} onClick={() => setCitySrYear(y)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${citySrYear === y ? theme.tabActive : theme.tabInactive}`}
                  >{y}</button>
                ))}
              </div>
            </div>

            {/* Target sphere */}
            <div>
              <label className={`text-xs ${theme.text} mb-1 block`}>Целевая сфера (необязательно)</label>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setCityTargetSphere('')}
                  className={`px-2.5 py-1 text-[11px] rounded-full border ${!cityTargetSphere ? theme.tabActive : theme.tabInactive}`}
                >Лучший резонанс</button>
                {SPHERE_KEYWORDS.map(s => (
                  <button key={s.value} onClick={() => setCityTargetSphere(s.value)}
                    className={`px-2.5 py-1 text-[11px] rounded-full border ${cityTargetSphere === s.value ? theme.tabActive : theme.tabInactive}`}
                  >{s.label}</button>
                ))}
              </div>
            </div>

            <button onClick={runCities} disabled={cityLoading}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${theme.btn}`}
            >
              {cityLoading ? <><Spin />Вычисляю...</> : <><MapPin className="h-4 w-4" />Сравнить города</>}
            </button>
          </div>

          {cityError && <ErrBox msg={cityError} />}
          {cityResult && <CitiesResult result={cityResult} isDark={isDark} />}
        </div>
      )}

      {/* ═══════════════════════════ SPHERE SEARCH ═══════════════════════════ */}
      {tab === 'sphere-search' && (
        <div className="space-y-3">
          <div className={`rounded-xl ${card} p-4 space-y-3`}>
            <h4 className={`text-sm font-semibold ${theme.header}`}>🎯 Найти город для нужной сферы</h4>
            <p className={`text-xs ${theme.text} opacity-60`}>
              Выберите сферу жизни — система найдёт город, где АСЦ соляра попадает в соответствующий натальный дом.
            </p>

            {/* Year */}
            <div>
              <label className={`text-xs ${theme.text} mb-1 block`}>Год</label>
              <div className="flex gap-1.5 flex-wrap">
                {yearBtns.map(y => (
                  <button key={y} onClick={() => setSsYear(y)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${ssYear === y ? theme.tabActive : theme.tabInactive}`}
                  >{y}</button>
                ))}
              </div>
            </div>

            {/* Sphere selector */}
            <div>
              <label className={`text-xs ${theme.text} mb-1.5 block`}>Выберите сферу <span className="text-red-400">*</span></label>
              <div className="flex flex-wrap gap-1.5">
                {SPHERE_KEYWORDS.map(s => (
                  <button key={s.value} onClick={() => setSsSphere(s.value)}
                    className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${ssSphere === s.value ? theme.tabActive : theme.tabInactive}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={runSphereSearch} disabled={ssLoading || !ssSphere}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${theme.btn} disabled:opacity-40`}
            >
              {ssLoading ? <><Spin />Ищу...</> : <><Search className="h-4 w-4" />Найти лучший город</>}
            </button>
          </div>

          {ssError && <ErrBox msg={ssError} />}

          {ssResult && (
            <div className="space-y-3">
              {/* Target info */}
              {ssResult.target_natal_house && (
                <div className={`rounded-xl border p-3 ${isDark ? 'border-blue-700/30 bg-blue-900/15' : 'border-blue-200 bg-blue-50'}`}>
                  <div className={`text-sm font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    Целевой натальный дом: {ssResult.target_natal_house} ({ssResult.target_sphere_label ?? ssSphere})
                  </div>
                  <div className="mt-1">
                    <Moon className="h-3 w-3 inline mr-1 opacity-40" />
                    <span className="text-xs opacity-60">Ищем города, где АСЦ соляра активирует эту сферу</span>
                  </div>
                </div>
              )}
              <SphereSearchResult result={ssResult} isDark={isDark} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

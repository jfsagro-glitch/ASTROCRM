// ─── SolarReturnBlock — полный сервис Соляр по системе Андреева ─────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, MapPin, Star, Sun, Moon, Search, X, Plus } from 'lucide-react';
import { getSolarReturnDeep, getSolarReturnCities, getSolarReturnSphereSearch, geocodeCities } from '../services/astrologyService';
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

// ── City Search ──────────────────────────────────────────────────────────────
interface CityItem { name: string; lat: number; lon: number; }

function CitySearch({
  onSelect, placeholder = 'Поиск города...', theme, isDark,
}: {
  onSelect: (city: CityItem) => void;
  placeholder?: string;
  theme: Theme;
  isDark: boolean;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; display_name: string; lat: number; lon: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); setSearchErr(''); return; }
    setLoading(true); setSearchErr('');
    try {
      const res = await geocodeCities(q);
      setSuggestions(res);
      setOpen(true);
      if (res.length === 0) setSearchErr('Город не найден — уточните запрос');
    } catch {
      setSuggestions([]);
      setSearchErr('Ошибка поиска — попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setSearchErr('');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (v.length < 2) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => search(v), 350);
  };

  const pick = (s: { name: string; display_name: string; lat: number; lon: number }) => {
    // Use short name (first segment before comma)
    const shortName = s.name || s.display_name.split(',')[0].trim();
    onSelect({ name: shortName, lat: s.lat, lon: s.lon });
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    setSearchErr('');
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${
        isDark ? 'bg-slate-800/60 border-slate-600' : 'bg-white border-slate-300'
      } focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500`}>
        <Search className="h-3.5 w-3.5 opacity-40 shrink-0" />
        <input
          type="text" value={query} onChange={handleChange}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs outline-none"
        />
        {loading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin opacity-50 shrink-0" />
          : query && <button onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); setSearchErr(''); }}
              className="opacity-40 hover:opacity-70 shrink-0"><X className="h-3 w-3" /></button>
        }
      </div>
      {searchErr && !open && (
        <p className="text-[11px] text-red-400 mt-1">{searchErr}</p>
      )}
      {open && suggestions.length > 0 && (
        <div className={`absolute z-50 mt-1 w-full rounded-xl border shadow-lg max-h-52 overflow-y-auto ${
          isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
        }`}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => pick(s)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'
              }`}
            >
              <MapPin className="h-3 w-3 opacity-40 shrink-0" />
              <span className="flex-1 truncate">{s.display_name}</span>
              <span className="opacity-40 text-[10px] shrink-0">{s.lat.toFixed(2)}°, {s.lon.toFixed(2)}°</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Editable city list ────────────────────────────────────────────────────────
function CityListEditor({
  cities, onChange, theme, isDark,
}: {
  cities: CityItem[];
  onChange: (cities: CityItem[]) => void;
  theme: Theme;
  isDark: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {cities.map((c, i) => (
          <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] ${
            isDark ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'
          }`}>
            <MapPin className="h-2.5 w-2.5 opacity-40" />
            <span>{c.name.split(',')[0]}</span>
            <button onClick={() => onChange(cities.filter((_, j) => j !== i))}
              className="ml-0.5 opacity-40 hover:opacity-80"><X className="h-2.5 w-2.5" /></button>
          </div>
        ))}
      </div>
      <CitySearch
        onSelect={(city) => { if (!cities.some(c => Math.abs(c.lat - city.lat) < 0.1)) onChange([...cities, city]); }}
        placeholder="+ Добавить город"
        theme={theme}
        isDark={isDark}
      />
    </div>
  );
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
          Соляр {card.sr_year}
          {card.sr_date_utc && <span className="font-normal opacity-60 text-sm ml-1">· {card.sr_date_utc.slice(0, 10)}</span>}
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

  // ── Object form (legacy / future) ──────────────────────────────────────
  if (typeof interp !== 'string') {
    const PMETA: Record<string, { icon: string; color: string }> = {
      priority_1: { icon: '🏠', color: isDark ? 'border-amber-600/40 bg-amber-900/20' : 'border-amber-200 bg-amber-50' },
      priority_2: { icon: '⚡', color: isDark ? 'border-orange-600/40 bg-orange-900/20' : 'border-orange-200 bg-orange-50' },
      priority_3: { icon: '💼', color: isDark ? 'border-blue-600/40 bg-blue-900/20' : 'border-blue-200 bg-blue-50' },
      priority_4: { icon: '☀️', color: isDark ? 'border-yellow-600/40 bg-yellow-900/20' : 'border-yellow-200 bg-yellow-50' },
      priority_5: { icon: '🌙', color: isDark ? 'border-indigo-600/40 bg-indigo-900/20' : 'border-indigo-200 bg-indigo-50' },
      priority_6: { icon: '🔑', color: isDark ? 'border-purple-600/40 bg-purple-900/20' : 'border-purple-200 bg-purple-50' },
      priority_7: { icon: '🔗', color: isDark ? 'border-green-600/40 bg-green-900/20' : 'border-green-200 bg-green-50' },
      priority_8: { icon: '🧲', color: isDark ? 'border-slate-600/40 bg-slate-800/40' : 'border-slate-200 bg-slate-50' },
      year_card:  { icon: '📋', color: isDark ? 'border-amber-600/40 bg-amber-900/20' : 'border-amber-200 bg-amber-50' },
      action_plan:{ icon: '✅', color: isDark ? 'border-green-600/40 bg-green-900/20' : 'border-green-200 bg-green-50' },
    };
    return (
      <div className="space-y-3">
        {Object.entries(interp as Record<string, string>).map(([key, text]) => {
          if (!text || key === 'type') return null;
          const m = PMETA[key] ?? { icon: '•', color: isDark ? 'border-slate-600/30 bg-slate-800/30' : 'border-slate-200 bg-white' };
          const label = key.replace('priority_', 'Приоритет ').replace('year_card', 'Год в словах').replace('action_plan', 'План действий').replace('_', ' ');
          return (
            <div key={key} className={`rounded-xl border ${m.color} p-4`}>
              <div className="flex items-start gap-2">
                <span className="text-lg leading-tight mt-0.5">{m.icon}</span>
                <div><div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-1">{label}</div>
                <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Plain string form from backend ─────────────────────────────────────
  const PICONS: Record<number, string> = {1:'🏠',2:'⚡',3:'💼',4:'☀️',5:'🌙',6:'🔑',7:'🔗',8:'🧲'};
  const PCOLORS: Record<number, string> = {
    1: isDark ? 'border-amber-600/40 bg-amber-900/20'  : 'border-amber-200 bg-amber-50',
    2: isDark ? 'border-orange-600/40 bg-orange-900/20': 'border-orange-200 bg-orange-50',
    3: isDark ? 'border-blue-600/40 bg-blue-900/20'   : 'border-blue-200 bg-blue-50',
    4: isDark ? 'border-yellow-600/40 bg-yellow-900/20': 'border-yellow-200 bg-yellow-50',
    5: isDark ? 'border-indigo-600/40 bg-indigo-900/20': 'border-indigo-200 bg-indigo-50',
    6: isDark ? 'border-purple-600/40 bg-purple-900/20': 'border-purple-200 bg-purple-50',
    7: isDark ? 'border-green-600/40 bg-green-900/20'  : 'border-green-200 bg-green-50',
    8: isDark ? 'border-slate-600/40 bg-slate-800/40'  : 'border-slate-200 bg-slate-50',
  };
  const DEF_COLOR = isDark ? 'border-slate-600/30 bg-slate-800/30' : 'border-slate-200 bg-white';

  interface Blk { icon: string; color: string; title: string; body: string }
  const blocks: Blk[] = [];
  let cur: Blk | null = null;
  const flush = () => { if (cur) { blocks.push(cur); cur = null; } };

  for (const raw of interp.split('\n')) {
    const line = raw.trim();
    if (!line || /^[═─]{4,}$/.test(line)) continue;

    // [ПРИОРИТЕТ N]
    const pm = line.match(/^\[ПРИОРИТЕТ\s+(\d+)\]\s*(.*)/);
    if (pm) {
      flush();
      const n = parseInt(pm[1]);
      cur = { icon: PICONS[n] ?? '•', color: PCOLORS[n] ?? DEF_COLOR, title: pm[2], body: '' };
      continue;
    }
    // Star alerts
    if (line.startsWith('★')) {
      flush();
      const stars = (line.match(/^★+/) ?? [''])[0].length;
      cur = {
        icon: stars >= 3 ? '⭐' : '✨',
        color: isDark ? 'border-yellow-600/40 bg-yellow-900/20' : 'border-yellow-200 bg-yellow-50',
        title: line.replace(/^★+\s*/, ''),
        body: '',
      };
      continue;
    }
    // Year card
    if (line.startsWith('ГОД В НЕСКОЛЬКИХ СЛОВАХ')) {
      flush();
      cur = { icon: '📋', color: isDark ? 'border-amber-600/40 bg-amber-900/20' : 'border-amber-200 bg-amber-50',
        title: 'Год в нескольких словах', body: line.replace(/^ГОД В НЕСКОЛЬКИХ СЛОВАХ:\s*/, '') };
      continue;
    }
    // Action plan
    if (line.startsWith('ПЛАН ДЕЙСТВИЙ')) {
      flush();
      cur = { icon: '✅', color: isDark ? 'border-green-600/40 bg-green-900/20' : 'border-green-200 bg-green-50',
        title: 'План действий', body: line.replace(/^ПЛАН ДЕЙСТВИЙ:\s*/, '') };
      continue;
    }
    // Element/modality banner (before first priority)
    if (!cur && line.startsWith('Стихия')) {
      cur = { icon: '🔥', color: isDark ? 'border-rose-600/30 bg-rose-900/15' : 'border-rose-200 bg-rose-50',
        title: '', body: line };
      flush();
      continue;
    }
    // Skip giant header
    if (line.includes('АНАЛИЗ ПО СИСТЕМЕ АНДРЕЕВА')) continue;

    if (!cur) {
      cur = { icon: '•', color: DEF_COLOR, title: '', body: line };
    } else {
      cur.body += (cur.body ? '\n' : '') + line;
    }
  }
  flush();

  return (
    <div className="space-y-2">
      {blocks.map((b, i) => (
        <div key={i} className={`rounded-xl border ${b.color} p-3`}>
          <div className="flex items-start gap-2">
            <span className="text-lg leading-tight mt-0.5 shrink-0">{b.icon}</span>
            <div className="min-w-0">
              {b.title && <div className="text-xs font-semibold opacity-70 uppercase tracking-wide mb-1">{b.title}</div>}
              {b.body  && <p className="text-sm leading-relaxed whitespace-pre-line">{b.body}</p>}
            </div>
          </div>
        </div>
      ))}
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
  const [obsCity, setObsCity] = useState<CityItem | null>(null);   // city for birthday
  const [includeLunars, setIncludeLunars] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deepResult, setDeepResult] = useState<any>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState('');

  // ── city comparison state ─
  const [citySrYear, setCitySrYear] = useState(thisYear);
  const [cityTargetSphere, setCityTargetSphere] = useState('');
  const [compareCities, setCompareCities] = useState<CityItem[]>(DEFAULT_CITIES);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cityResult, setCityResult] = useState<any>(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState('');

  // ── sphere search state ─
  const [ssYear, setSsYear] = useState(thisYear);
  const [ssSphere, setSsSphere] = useState('');
  const [searchCities, setSearchCities] = useState<CityItem[]>(DEFAULT_CITIES);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ssResult, setSsResult] = useState<any>(null);
  const [ssLoading, setSsLoading] = useState(false);
  const [ssError, setSsError] = useState('');

  // ── actions ─────────────────────────────────────────────────────────────────
  const runDeep = async () => {
    if (!obsCity) { setDeepError('Укажите город встречи дня рождения'); return; }
    setDeepLoading(true); setDeepError(''); setDeepResult(null);
    try {
      const r = await getSolarReturnDeep(birth, srYear, obsCity.lat, obsCity.lon, includeLunars);
      setDeepResult(r);
    } catch (e: unknown) {
      setDeepError(e instanceof Error ? e.message : String(e));
    } finally { setDeepLoading(false); }
  };

  const runCities = async () => {
    if (!compareCities.length) { setCityError('Добавьте хотя бы один город'); return; }
    setCityLoading(true); setCityError(''); setCityResult(null);
    try {
      const r = await getSolarReturnCities(birth, citySrYear, compareCities, undefined, cityTargetSphere || undefined);
      setCityResult(r);
    } catch (e: unknown) {
      setCityError(e instanceof Error ? e.message : String(e));
    } finally { setCityLoading(false); }
  };

  const runSphereSearch = async () => {
    if (!ssSphere) { setSsError('Выберите сферу жизни'); return; }
    if (!searchCities.length) { setSsError('Добавьте хотя бы один город'); return; }
    setSsLoading(true); setSsError(''); setSsResult(null);
    try {
      const r = await getSolarReturnSphereSearch(birth, ssYear, searchCities, undefined, ssSphere);
      setSsResult(r);
    } catch (e: unknown) {
      setSsError(e instanceof Error ? e.message : String(e));
    } finally { setSsLoading(false); }
  };

  // ── UI helpers ───────────────────────────────────────────────────────────────
  const card = `${theme.card} border`;
  const yearBtns = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2, thisYear + 3];

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
          {/* Methodology preface — 8 priorities */}
          <div className={`rounded-xl border p-4 ${isDark ? 'border-amber-700/30 bg-gradient-to-br from-amber-900/10 to-orange-900/10' : 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'}`}>
            <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>🌞 Соляр года — система Андреева</h3>
            <p className={`text-xs leading-relaxed ${theme.text} opacity-75`}>
              Соляр (карта солнечного возвращения) — это карта на момент, когда Солнце возвращается в ту же точку зодиака, что и при рождении. Она задаёт тему ближайших ~365 дней. Метод 8&nbsp;приоритетов В.&nbsp;Андреева раскрывает год слой за слоем.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3 text-[11px]">
              {[
                { n: 1, icon: '🏠', t: 'Куспид АСЦ соляра', d: 'в каком натальном доме — главная сфера года' },
                { n: 2, icon: '⚡', t: 'Планеты в углах соляра', d: 'I, IV, VII, X — где будет проявление' },
                { n: 3, icon: '💼', t: 'МС соляра', d: 'карьерный/публичный вектор года' },
                { n: 4, icon: '☀️', t: 'Солнце в соляре', d: 'дом года и его дом в натале' },
                { n: 5, icon: '🌙', t: 'Луна в соляре', d: 'эмоциональный фон, бытовая сфера' },
                { n: 6, icon: '🔑', t: 'Управитель АСЦ соляра', d: 'кто «ведёт» год — куда направляет внимание' },
                { n: 7, icon: '🔗', t: 'Аспекты Солнце↔Луна, угловые', d: 'напряжения и поддержки месяца к месяцу' },
                { n: 8, icon: '🧲', t: 'Двойные ретурны', d: 'планеты, возвращающиеся одновременно — узлы судьбы' },
              ].map((p) => (
                <div key={p.n} className={`flex items-start gap-1.5 px-2 py-1.5 rounded-lg ${isDark ? 'bg-slate-900/30' : 'bg-white/60'}`}>
                  <span className="opacity-50 font-mono text-[10px] mt-0.5">{p.n}.</span>
                  <span>{p.icon}</span>
                  <span className="flex-1"><b className="opacity-90">{p.t}</b><span className="opacity-60"> — {p.d}</span></span>
                </div>
              ))}
            </div>
            <p className={`text-[11px] mt-3 opacity-60 leading-relaxed`}>
              💡 <b>Совет:</b> для перенесённого соляра указывайте город, где вы реально встретите день рождения (не город рождения). Карта меняет конфигурацию домов и углов — а значит и сферу года.
            </p>
          </div>

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
            {/* Observation city — REQUIRED */}
            <div>
              <label className={`text-xs font-semibold mb-1 flex items-center gap-1 ${obsCity ? 'text-green-400' : 'text-amber-400'}`}>
                <MapPin className="h-3 w-3" />
                Город встречи дня рождения
                <span className="text-red-400 ml-0.5">*</span>
              </label>
              {obsCity ? (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs ${isDark ? 'border-green-600/60 bg-green-900/20' : 'border-green-300 bg-green-50'}`}>
                  <MapPin className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <span className="flex-1 font-semibold">{obsCity.name}</span>
                  <span className="opacity-50 text-[10px]">{obsCity.lat.toFixed(2)}°, {obsCity.lon.toFixed(2)}°</span>
                  <button onClick={() => setObsCity(null)} className="opacity-40 hover:opacity-80 ml-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <CitySearch
                    onSelect={setObsCity}
                    placeholder="Начните вводить название города..."
                    theme={theme}
                    isDark={isDark}
                  />
                  <p className={`text-[10px] mt-1 text-amber-400 opacity-80`}>
                    Укажите город, где вы будете встречать день рождения — это обязательно для расчёта.
                  </p>
                </>
              )}
            </div>
            {/* Lunars toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={includeLunars} onChange={e => setIncludeLunars(e.target.checked)}
                className="rounded" />
              <span className={`text-xs ${theme.text}`}>Включить лунный календарь + «горячие месяцы»</span>
            </label>

            <button onClick={runDeep} disabled={deepLoading || !obsCity}
              title={!obsCity ? 'Сначала выберите город встречи дня рождения' : ''}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                !obsCity ? 'opacity-40 cursor-not-allowed ' + theme.btn : theme.btn
              }`}
            >
              {deepLoading ? <><Spin />Вычисляю...</> : <><Star className="h-4 w-4" />Рассчитать соляр</>}
            </button>
            {!obsCity && (
              <p className="text-[11px] text-amber-400">⬆ Выберите город выше, чтобы продолжить</p>
            )}
          </div>

          {deepError && <ErrBox msg={deepError} />}

          {deepResult && (
            <div className="space-y-4">
              {/* Result header banner */}
              <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${isDark ? 'border-amber-600/40 bg-amber-900/20' : 'border-amber-200 bg-amber-50'}`}>
                <Sun className={`h-5 w-5 shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-500'}`} />
                <div>
                  <div className={`font-bold text-base ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                    Соляр {srYear} · {obsCity?.name}
                  </div>
                  {deepResult.year_card?.sr_date_utc && (
                    <div className="text-xs opacity-60">Момент возврата: {deepResult.year_card.sr_date_utc.slice(0, 16).replace('T', ' ')} UTC</div>
                  )}
                </div>
              </div>

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
                  {deepResult.sr_asc_ruler.interpretation
                    ? <p className="text-sm">{deepResult.sr_asc_ruler.interpretation}</p>
                    : (
                      <p className="text-sm">
                        {deepResult.sr_asc_ruler.formatted ?? deepResult.sr_asc_ruler.planet}
                        {deepResult.sr_asc_ruler.in_sr_house != null && ` — дом ${deepResult.sr_asc_ruler.in_sr_house} соляра`}
                        {deepResult.sr_asc_ruler.in_natal_house != null && `, дом ${deepResult.sr_asc_ruler.in_natal_house} натала`}
                        {deepResult.sr_asc_ruler.sphere_label && ` · ${deepResult.sr_asc_ruler.sphere_label}`}
                      </p>
                    )
                  }
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
                    {(deepResult.hot_months as { month_in_sr: number; date: string; lr_asc_natal_house: number; sphere: string; note: string }[]).map((m, i) => (
                      <div key={i} className={`rounded-lg p-2 text-sm ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                        <span className="font-mono text-xs opacity-60">{m.date?.slice(0, 10)}</span>
                        {m.month_in_sr != null && <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-orange-800/40' : 'bg-orange-200'}`}>Месяц {m.month_in_sr}</span>}
                        <span className="ml-2">{m.note ?? `Лунный возврат → Дом ${m.lr_asc_natal_house}${m.sphere ? ' · ' + m.sphere : ''}`}</span>
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
              Сравниваем АСЦ соляра по городам. Добавьте нужные города и выберите целевую сферу.
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

            {/* Editable city list */}
            <div>
              <label className={`text-xs ${theme.text} mb-1.5 block`}>Города для сравнения ({compareCities.length})</label>
              <CityListEditor cities={compareCities} onChange={setCompareCities} theme={theme} isDark={isDark} />
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

            {/* Editable city list */}
            <div>
              <label className={`text-xs ${theme.text} mb-1.5 block`}>Города для поиска ({searchCities.length})</label>
              <CityListEditor cities={searchCities} onChange={setSearchCities} theme={theme} isDark={isDark} />
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

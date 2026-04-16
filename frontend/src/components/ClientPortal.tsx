import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Moon, Sun, Star, Map, Heart, Sparkles, ArrowRight, Palette,
  Download, Layers, Clock, Zap, Globe, RefreshCw, ChevronDown,
  AlertCircle, Loader2, Search, BookOpen, ChevronRight, Lightbulb,
  LogOut, UserCircle, Trash2,
} from 'lucide-react';
import {
  scoreSpheres, getPairInterp, getAspectCategory, getAspectInterpText,
  getSphereInterpretation, getSphereActions, getScoreLabel, getScoreBarColor,
  getOverallText, LIFE_SPHERES,
} from '../data/synastryData';
import type { SphereScore } from '../data/synastryData';
import {
  generateForecast, formatEventDate, getSphereIcon, getSphereRuName,
  getForecastScoreBarColor,
} from '../data/forecastData';
import type { RelationshipForecast } from '../data/forecastData';
import { Link } from 'react-router-dom';

import ChartWheel, { ChartWheelResponsive } from './ChartWheel';
import HumanDesignBlock from './HumanDesignBlock';
import JyotishBlock from './JyotishBlock';
import HolosBlock from './HolosBlock';
import SynastryForecast from './SynastryForecast';
import SynastryInteractionEngine from './SynastryInteractionEngine';
import InteractionRelocationEngine from './InteractionRelocationEngine';
import HoroscopeBlock from './HoroscopeBlock';
import DateSegmentInput from './DateSegmentInput';
import PAReportBlock from './PAReportBlock';
import DashboardView from './DashboardView';
import NumerologyBlock from './NumerologyBlock';
import AsteroidsLilithBlock from './AsteroidsLilithBlock';
import PlanetaryHoursBlock from './PlanetaryHoursBlock';
import SiderealBlock from './SiderealBlock';
import GeneKeysBlock from './GeneKeysBlock';
import { ClientHistoryPanel } from './ClientHistoryPanel';
import PrimaryDirectionsBlock from './PrimaryDirectionsBlock';
import ProbabilityTreeBlock from './ProbabilityTreeBlock';
import ZodiacalReleasingBlock from './ZodiacalReleasingBlock';
import { ChartAnalysisSection } from './ChartAnalysisSection';
import DailyPersonalBlock from './DailyPersonalBlock';
import { IngressCalendarBlock } from './IngressCalendarBlock';
import { VoCWindowsPanel } from './VoCWindowsPanel';
import { FixedStarsBlock } from './FixedStarsBlock';
import SaturnCycleBlock from './SaturnCycleBlock';
import { HeliocentricBlock } from './HeliocentricBlock';
import { KabbalahTreeBlock } from './KabbalahTreeBlock';
import { PlanetaryNodesBlock } from './PlanetaryNodesBlock';
import { CompensatoryPracticesCard } from './CompensatoryPracticesCard';
import EclipsePersonalBlock from './EclipsePersonalBlock';
import IngressPersonalBlock from './IngressPersonalBlock';
import { usePdfExport } from '../hooks/usePdfExport';
import {
  getNatalChart, getTransits, getSecondaryProgressions, getSolarArc,
  getSolarReturn, getLunarReturn, getProfections, getTertiaryProgressions,
  getConverseProgressions, getSynastry, getCompositeChart, getDavisonChart,
  getEphemerides, getAstroSummary, geocodeCity, resolveHistoricalTimezone,
} from '../services/astrologyService';
import type { NatalChart, BirthInput, SynastryResult } from '../types/astro';
import type { HumanDesignContentMode } from '../types/humanDesign';
import { PLANET_SYMBOLS, ASPECT_SYMBOLS, SIGN_COLORS } from '../types/astro';
import { downloadTabsPDF } from '../lib/pdfUtils';
import { useLang } from '../i18n/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import type { SavedPerson } from '../services/peopleService';
import { subscribePeople, addPerson, deletePerson } from '../services/peopleService';

// ─── Themes ───────────────────────────────────────────────────────────────────
const chartThemes = {
  cosmic: {
    name: 'Midnight Gold',
    container: 'text-amber-50/95 border-amber-300/20',
    header: 'text-amber-200', card: 'bg-slate-950/45 border-amber-300/20 backdrop-blur-xl',
    accent: 'text-amber-300', text: 'text-amber-50/75', symbol: 'text-amber-300',
    btn: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-600/20',
    tabActive: 'bg-amber-300/12 text-amber-200 border-amber-300',
    tabInactive: 'text-amber-50/60 hover:text-amber-100 border-transparent hover:border-amber-400/40',
    wheelTheme: 'dark' as const,
  },
  ethereal: {
    name: 'Ethereal Light',
    container: 'bg-stone-50 text-stone-800 border-stone-200 shadow-xl shadow-stone-200/50',
    header: 'text-amber-700', card: 'bg-white border-stone-100 shadow-sm',
    accent: 'text-amber-600', text: 'text-stone-600', symbol: 'text-amber-500',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    tabActive: 'bg-amber-50 text-amber-700 border-amber-400',
    tabInactive: 'text-stone-500 hover:text-stone-700 border-transparent',
    wheelTheme: 'light' as const,
  },
  vintage: {
    name: 'Mystic Vintage',
    container: 'bg-[#f4ecd8] text-[#4a3b32] border-[#d4c4a8] shadow-xl',
    header: 'text-[#8b5a2b]', card: 'bg-[#fdfbf7] border-[#e6d5b8]',
    accent: 'text-[#8b5a2b]', text: 'text-[#5c4033]', symbol: 'text-[#a0522d]',
    btn: 'bg-[#8b5a2b] hover:bg-[#7a4e25] text-white',
    tabActive: 'bg-[#fdf3e3] text-[#8b5a2b] border-[#c4a060]',
    tabInactive: 'text-[#9c7c5e] hover:text-[#4a3b32] border-transparent',
    wheelTheme: 'light' as const,
  },
  cyber: {
    name: 'Neon Cyber',
    container: 'bg-black text-cyan-50 border-cyan-900/50 shadow-2xl shadow-cyan-900/20',
    header: 'text-fuchsia-400', card: 'bg-zinc-950 border-cyan-500/30',
    accent: 'text-cyan-400', text: 'text-cyan-100/70', symbol: 'text-fuchsia-500',
    btn: 'bg-cyan-600 hover:bg-cyan-500 text-black font-bold',
    tabActive: 'bg-cyan-950 text-cyan-300 border-cyan-500',
    tabInactive: 'text-cyan-700 hover:text-cyan-400 border-transparent',
    wheelTheme: 'dark' as const,
  },
};
type ThemeKey = keyof typeof chartThemes;

const HD_MODE_LABELS: Record<HumanDesignContentMode, string> = {
  reader: 'Reader',
  analyst: 'Analyst',
  practitioner: 'Practitioner',
};

// ─── Planet avg daily motion (degrees) — used for 14-day orb projection ───────
const DAILY_MOTION: Record<string, number> = {
  moon: 13.2, sun: 1.0, mercury: 1.4, venus: 1.2, mars: 0.52,
  jupiter: 0.083, saturn: 0.033, uranus: 0.012, neptune: 0.006,
  pluto: 0.004, chiron: 0.018, north_node: 0.053, south_node: 0.053,
  mean_node: 0.053, true_node: 0.053,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Spin = () => <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />;
const Err = ({ msg }: { msg: string }) => (
  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
    <AlertCircle className="h-4 w-4 shrink-0" /> {msg}
  </div>
);

// ─── City Geocoder field ───────────────────────────────────────────────────────
function CityField({
  onFound, theme, prefill, date, time,
}: {
  onFound: (lat: number, lon: number, utc: number) => void;
  theme: typeof chartThemes[ThemeKey];
  prefill?: { city: string; utc: number } | null;
  date?: string;
  time?: string;
}) {
  const { tr } = useLang();
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // When parent prefills from saved person — show city + UTC without geocoding
  const prevPrefillRef = React.useRef<typeof prefill>(null);
  useEffect(() => {
    if (!prefill) return;
    if (prefill === prevPrefillRef.current) return;
    prevPrefillRef.current = prefill;
    setCity(prefill.city);
    const tzSign = prefill.utc >= 0 ? '+' : '';
    setResult(`✓ ${prefill.city} · UTC${tzSign}${prefill.utc}`);
    setError(null);
  }, [prefill]);

  const find = useCallback(async () => {
    if (!city.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      // Pass birth date/time so geocoder returns historically-correct UTC offset (DST-aware)
      const data = await geocodeCity(city, date, time);
      onFound(data.lat, data.lon, data.utc);
      const tzSign = data.utc >= 0 ? '+' : '';
      setResult(`✓ ${data.displayName} · UTC${tzSign}${data.utc}`);
    } catch (e: unknown) {
      setError((e as Error).message === 'City not found' ? tr.cityNotFound : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [city, date, time, onFound, tr]);

  return (
    <div className="space-y-1">
      <label className={`text-xs ${theme.text} block`}>{tr.city}</label>
      <div className="flex gap-2">
        <input
          value={city}
          onChange={e => { setCity(e.target.value); setResult(null); setError(null); }}
          onKeyDown={e => e.key === 'Enter' && find()}
          placeholder={tr.cityPlaceholder}
          className={`flex-1 px-3 py-2 rounded-lg border text-sm ${theme.card} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
        />
        <button
          onClick={find}
          disabled={loading || !city.trim()}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${theme.btn} disabled:opacity-50`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>
      {result && <div className={`text-xs ${theme.accent} truncate`}>{result}</div>}
      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  );
}

// ─── Birth Form ───────────────────────────────────────────────────────────────
function BirthForm({
  value, onChange, label, theme, people, onSave, onDelete,
}: {
  value: BirthInput & { name?: string };
  onChange: (v: BirthInput & { name?: string }) => void;
  label: string;
  theme: typeof chartThemes[ThemeKey];
  people?: SavedPerson[];
  onSave?: (p: Omit<SavedPerson, 'id'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cityPrefill, setCityPrefill] = useState<{ city: string; utc: number } | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!people?.length) {
      if (selectedPersonId) setSelectedPersonId('');
      return;
    }
    if (selectedPersonId && !people.some(p => p.id === selectedPersonId)) {
      setSelectedPersonId('');
    }
  }, [people, selectedPersonId]);

  const loadPerson = useCallback((p: SavedPerson) => {
    setSelectedPersonId(p.id);
    onChange({ name: p.name, date: p.date, time: p.time, lat: p.lat, lon: p.lon, utc: p.utc });
    if (p.location) setCityPrefill({ city: p.location, utc: p.utc });
    setDropdownOpen(false);
  }, [onChange]);

  const handleSave = useCallback(async () => {
    if (!value.name || !onSave) return;
    setSaveLoading(true); setSaveMsg(null);
    try {
      await onSave({ name: value.name, date: value.date, time: value.time, lat: value.lat, lon: value.lon, utc: value.utc });
      setSaveMsg('Профиль сохранён ✓');
      setTimeout(() => setSaveMsg(null), 2500);
    } catch { setSaveMsg('Ошибка сохранения'); }
    finally { setSaveLoading(false); }
  }, [value, onSave]);

  const { tr } = useLang();
  const inp = `w-full px-3 py-2 rounded-lg border text-sm ${theme.card} focus:outline-none focus:ring-1 focus:ring-indigo-500`;
  const hasPeople = !!(people && people.length > 0);

  return (
    <div className={`p-4 rounded-xl border ${theme.card} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={`font-semibold text-sm ${theme.header}`}>{label}</h3>
        {onSave && (
          <div className="flex items-center gap-2">
            {saveMsg && <span className={`text-xs ${saveMsg.includes('✓') ? 'text-green-400' : 'text-red-400'}`}>{saveMsg}</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saveLoading || !value.name}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${theme.tabInactive} disabled:opacity-40`}
              title="Сохранить текущий профиль в списке"
            >
              💾 {saveLoading ? '…' : 'Сохранить'}
            </button>
          </div>
        )}
      </div>

      {/* Row 1: Name (with people dropdown) + Date */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`text-xs ${theme.text} mb-1 block`}>{tr.name}</label>
          <div className="relative" ref={dropdownRef}>
            <div className="flex gap-1">
              <input
                type="text"
                value={value.name ?? ''}
                onChange={e => { onChange({ ...value, name: e.target.value }); setSelectedPersonId(''); }}
                className={`flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm ${theme.card} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
              />
              {hasPeople && (
                <button
                  type="button"
                  onClick={() => setDropdownOpen(o => !o)}
                  title="Выбрать сохранённый профиль"
                  className={`px-2 py-2 rounded-lg border text-xs transition-colors ${theme.tabInactive}`}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {dropdownOpen && hasPeople && (
              <div className={`absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden ${theme.card}`}>
                <div className={`text-xs px-3 py-1.5 opacity-50 border-b ${theme.text}`}>Сохранённые профили</div>
                <div className="max-h-48 overflow-y-auto">
                  {people!.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => loadPerson(p)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors ${selectedPersonId === p.id ? 'opacity-100' : 'opacity-80'}`}
                    >
                      <span className={`font-medium ${theme.header} truncate`}>{p.name}</span>
                      <span className={`shrink-0 ${theme.text} opacity-50`}>
                        {p.location ? p.location : p.date}
                        {p.utc !== undefined ? ` · UTC${p.utc >= 0 ? '+' : ''}${p.utc}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
                {onDelete && selectedPersonId && (
                  <div className="border-t px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => { onDelete(selectedPersonId); setSelectedPersonId(''); setDropdownOpen(false); }}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Удалить профиль
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className={`text-xs ${theme.text} mb-1 block`}>{tr.date}</label>
          <DateSegmentInput
            value={value.date}
            onChange={async (newDate: string) => {
              const updated: typeof value = { ...value, date: newDate };
              if (value.lat && value.lon && newDate) {
                try {
                  const utc = await resolveHistoricalTimezone(value.lat, value.lon, newDate, value.time);
                  updated.utc = utc;
                } catch { /* keep existing utc */ }
              }
              onChange(updated);
            }}
            className={inp}
          />
        </div>
      </div>

      {/* Row 2: Time */}
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className={`text-xs ${theme.text} mb-1 block`}>{tr.time}</label>
          <input type="time" step="1" value={value.time}
            onChange={async e => {
              const newTime = e.target.value;
              const updated: typeof value = { ...value, time: newTime };
              // Re-resolve historical UTC offset when time changes and coordinates are set
              if (value.lat && value.lon && value.date) {
                try {
                  const utc = await resolveHistoricalTimezone(value.lat, value.lon, value.date, newTime);
                  updated.utc = utc;
                } catch { /* keep existing utc */ }
              }
              onChange(updated);
            }}
            className={inp} />
        </div>
      </div>

      {/* City geocoder — auto-fills lat/lon/utc */}
      <CityField
        onFound={(lat, lon, utc) => { onChange({ ...value, lat, lon, utc }); setCityPrefill(null); }}
        theme={theme}
        prefill={cityPrefill}
        date={value.date}
        time={value.time}
      />
    </div>
  );
}

// ─── Planet Table ─────────────────────────────────────────────────────────────
function PlanetTable({ chart, theme }: { chart: NatalChart; theme: typeof chartThemes[ThemeKey] }) {
  const { tr } = useLang();
  const pname = (k: string) => tr.planets[k] ?? k;
  const sname = (s: string) => tr.signs[s] ?? s;
  const sstatus = (s: string) => tr.speedStatus[s] ?? s;
  return (
    <div className={`rounded-xl border ${theme.card} overflow-hidden`}>
      <table className="w-full text-xs">
        <thead>
          <tr className={`text-left ${theme.accent} border-b`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {[tr.planet, tr.sign, tr.pos, tr.house, tr.speed, tr.decan, tr.term, tr.dignity].map(h => (
              <th key={h} className="px-2 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(chart.planets).map(([name, p]) => (
            <tr key={name} className="border-b hover:bg-white/5 transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <td className="px-2 py-1.5">
                <span className={`${theme.symbol} mr-1`}>{PLANET_SYMBOLS[name]}</span>
                <span className={theme.text}>{pname(name)}</span>
              </td>
              <td className="px-2 py-1.5">
                <span style={{ color: SIGN_COLORS[p.sign] || '#888' }}>{sname(p.sign)}</span>
              </td>
              <td className={`px-2 py-1.5 font-mono ${theme.accent}`}>
                {p.deg_min}{p.retrograde ? ' ℛ' : ''}
                {p.oob ? <span className="ml-1 text-orange-400 text-[10px]">OOB</span> : null}
              </td>
              <td className={`px-2 py-1.5 ${theme.text}`}>{p.house}</td>
              <td className={`px-2 py-1.5 ${p.retrograde ? 'text-red-400' : p.speed_status === 'fast' ? 'text-green-400' : theme.text}`}>
                {p.speed != null ? <>{p.speed > 0 ? '+' : ''}{(p.speed as number).toFixed(3)}°
                <span className="ml-1 opacity-60 text-[10px]">{sstatus(p.speed_status)}</span></> : '—'}
              </td>
              <td className={`px-2 py-1.5 ${theme.text}`}>{p.decan != null ? `${p.decan} / ${pname(p.decan_ruler)}` : '—'}</td>
              <td className={`px-2 py-1.5 ${theme.text}`}>{p.term_ruler ? pname(p.term_ruler) : '—'}</td>
              <td className={`px-2 py-1.5 ${theme.accent}`}>
                {chart.dignities?.[name]?.dignity || '—'}
                {(chart.dignities?.[name]?.score ?? 0) !== 0 &&
                  <span className="ml-1 opacity-60">({chart.dignities[name].score > 0 ? '+' : ''}{chart.dignities[name].score})</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Aspect List ──────────────────────────────────────────────────────────────
function AspectList({ aspects, theme }: { aspects: NatalChart['aspects']; theme: typeof chartThemes[ThemeKey] }) {
  const { tr } = useLang();
  const pname = (k: string) => tr.planets[k] ?? k;
  const aname = (k: string) => tr.aspects[k] ?? k;
  const major = aspects?.filter(a => ['conjunction','opposition','trine','square','sextile'].includes(a.aspect)) ?? [];
  return (
    <div className={`rounded-xl border ${theme.card} p-3`}>
      <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>{tr.majorAspects} ({major.length})</h4>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {major.map((a, i) => (
          <div key={i} className={`flex items-center gap-1 ${theme.text}`}>
            <span className={theme.symbol}>{ASPECT_SYMBOLS[a.aspect] || a.aspect}</span>
            <span>{pname(a.p1)}</span>
            <span className="opacity-50">–</span>
            <span>{pname(a.p2)}</span>
            <span className="ml-auto opacity-60">{a.orb.toFixed(1)}°{a.applying ? '→' : '←'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── House Table ──────────────────────────────────────────────────────────────
function HouseTable({ chart, theme }: { chart: NatalChart; theme: typeof chartThemes[ThemeKey] }) {
  const { tr } = useLang();
  const sname = (s: string) => tr.signs[s] ?? s;
  return (
    <div className={`rounded-xl border ${theme.card} p-3`}>
      <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>{tr.houseCusps}</h4>
      <div className="grid grid-cols-3 gap-1 text-xs">
        {Array.from({ length: 12 }, (_, i) => {
          const h = chart.houses[`h${i + 1}`];
          return h ? (
            <div key={i} className={`flex gap-1 ${theme.text}`}>
              <span className="opacity-50 w-4">H{i + 1}</span>
              <span style={{ color: SIGN_COLORS[h.sign] || '#888' }}>{sname(h.sign)}</span>
              <span className={`ml-auto font-mono ${theme.accent}`}>{h.deg_min}</span>
            </div>
          ) : null;
        })}
        {chart.houses.vtx && (
          <div className={`flex gap-1 ${theme.text}`}>
            <span className="opacity-50">VTX</span>
            <span style={{ color: SIGN_COLORS[chart.houses.vtx.sign] || '#888' }}>{sname(chart.houses.vtx.sign)}</span>
            <span className={`ml-auto font-mono ${theme.accent}`}>{chart.houses.vtx.deg_min}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Extra Info ───────────────────────────────────────────────────────────────
function ExtraInfo({ chart, theme }: { chart: NatalChart; theme: typeof chartThemes[ThemeKey] }) {
  const { tr } = useLang();
  const pname = (k: string) => tr.planets[k] ?? k;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {chart.sect && (
        <div className={`rounded-xl border ${theme.card} p-3`}>
          <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>{tr.sect}: {String(chart.sect).toUpperCase()}</h4>
          <div className="flex flex-wrap gap-1">
            {Object.entries(chart.planets).map(([p, pd]) =>
              pd.sect_status ? (
                <span key={p} className={`text-xs px-2 py-0.5 rounded-full ${pd.sect_status === 'in_sect' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {PLANET_SYMBOLS[p]} {pname(p)}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}
      <div className={`rounded-xl border ${theme.card} p-3`}>
        <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>{tr.moon}</h4>
        <div className={`text-xs ${theme.text} space-y-1`}>
          <p>{tr.phase}: <span className={theme.accent}>{chart.lunar_phase.name}</span> ({chart.lunar_phase.illumination?.toFixed(0) ?? '?'}%)</p>
          {chart.planets.moon?.mansion_name && (
            <p>{tr.mansion}: <span className={theme.accent}>{chart.planets.moon.mansion_num} – {chart.planets.moon.mansion_name}</span>
              <span className="ml-1 opacity-60">({chart.planets.moon.mansion_nature})</span>
            </p>
          )}
        </div>
      </div>
      {chart.arabic_parts && (
        <div className={`rounded-xl border ${theme.card} p-3`}>
          <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>{tr.arabicParts}</h4>
          <div className={`text-xs ${theme.text} space-y-1`}>
            {Object.entries(chart.arabic_parts).map(([name, p]) => (
              <p key={name}>{name.replace(/_/g,' ')}: <span className={theme.accent}>{tr.signs[p.sign] ?? p.sign} {p.deg_min}</span></p>
            ))}
          </div>
        </div>
      )}
      {chart.patterns && (
        <div className={`rounded-xl border ${theme.card} p-3`}>
          <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>{tr.patterns}</h4>
          <div className="flex flex-wrap gap-1">
            {Object.entries(chart.patterns).filter(([, v]) => v).map(([k]) => (
              <span key={k} className={`text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 ${theme.accent}`}>
                {k.replace('has_', '').replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
      {chart.fixed_stars && chart.fixed_stars.length > 0 && (
        <div className={`rounded-xl border ${theme.card} p-3 sm:col-span-2`}>
          <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>{tr.fixedStars}</h4>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {chart.fixed_stars.map((fs, i) => (
              <div key={i} className={`flex gap-1 ${theme.text}`}>
                <span className={theme.symbol}>{PLANET_SYMBOLS[fs.planet]}</span>
                <span className={fs.nature === 'benefic' ? 'text-green-400' : fs.nature === 'malefic' ? 'text-red-400' : theme.accent}>{fs.star}</span>
                <span className="opacity-60 ml-auto">{fs.orb.toFixed(2)}°</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {chart.dispositors?.final_dispositors && (
        <div className={`rounded-xl border ${theme.card} p-3 sm:col-span-2`}>
          <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>{tr.dispositors}</h4>
          <div className={`text-xs ${theme.text}`}>
            <p>{tr.final}: <span className={theme.accent}>{chart.dispositors.final_dispositors.map(p => pname(p)).join(', ')}</span></p>
            {chart.dispositors.mutual_receptions.length > 0 && (
              <p>{tr.mutual}: <span className={theme.accent}>{chart.dispositors.mutual_receptions.map(pair => pair.map(p => pname(p)).join(' ↔ ')).join(', ')}</span></p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Predictive result sub-components ────────────────────────────────────────

type AnyResult = Record<string, unknown>;

/** Simple planet table for return charts (no speed/decan columns) */
function MiniPlanetTable({ planetsMap, theme }: {
  planetsMap: Record<string, { lon: number; sign: string; deg_min: string }>;
  theme: typeof chartThemes[ThemeKey];
}) {
  const { tr } = useLang();
  const pname = (k: string) => tr.planets[k] ?? k;
  return (
    <div className={`rounded-xl border ${theme.card} overflow-hidden`}>
      <table className="w-full text-xs">
        <thead>
          <tr className={`text-left ${theme.accent} border-b`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {[tr.planet, tr.sign, tr.pos].map(h => (
              <th key={h} className="px-2 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(planetsMap).map(([name, p]) => (
            <tr key={name} className="border-b hover:bg-white/5 transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <td className="px-2 py-1.5">
                <span className={`${theme.symbol} mr-1`}>{PLANET_SYMBOLS[name]}</span>
                <span className={theme.text}>{pname(name)}</span>
              </td>
              <td className="px-2 py-1.5">
                <span style={{ color: SIGN_COLORS[p.sign] || '#888' }}>{tr.signs[p.sign] ?? p.sign}</span>
              </td>
              <td className={`px-2 py-1.5 font-mono ${theme.accent}`}>{p.deg_min}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Aspect list for transit/progression aspects (2-column labels) */
function AspectPairList({ aspects, col1Label, col2Label, theme }: {
  aspects: Array<Record<string, unknown>>;
  col1Label: string;
  col2Label: string;
  theme: typeof chartThemes[ThemeKey];
}) {
  const { tr } = useLang();
  const pname = (k: unknown) => tr.planets[k as string] ?? (k as string);
  const aname = (k: unknown) => tr.aspects[k as string] ?? (k as string);
  const applying = (a: Record<string, unknown>) =>
    a.applying != null ? (a.applying ? ' →' : ' ←') : '';
  if (!aspects.length) return null;
  return (
    <div className={`rounded-xl border ${theme.card} p-3`}>
      <div className={`text-xs font-semibold ${theme.accent} mb-2`}>
        {col1Label} → {col2Label} ({aspects.length})
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto text-xs">
        {aspects.map((a, i) => (
          <div key={i} className={`flex items-center gap-1.5 ${theme.text}`}>
            <span className={theme.symbol}>{PLANET_SYMBOLS[col1Label === 'transit' ? a.transit_planet as string : a.prog_planet as string ?? a.directed_planet as string ?? Object.keys(a)[0]] ?? '●'}</span>
            <span>{pname(a.transit_planet ?? a.prog_planet ?? a.directed_planet)}</span>
            <span className={`${theme.accent} font-medium`}>{ASPECT_SYMBOLS[a.aspect as string] || aname(a.aspect)}</span>
            <span>{pname(a.natal_planet)}</span>
            <span className={`${theme.symbol} ml-1`}>{PLANET_SYMBOLS[a.natal_planet as string] ?? ''}</span>
            <span className="ml-auto font-mono opacity-60">
              {typeof a.orb === 'number' ? a.orb.toFixed(2) : ''}°{applying(a)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransitView({ result, theme }: { result: AnyResult; theme: typeof chartThemes[ThemeKey] }) {
  const { tr } = useLang();
  const pname = (k: string) => tr.planets[k] ?? k;
  const transitPlanets = result.transit_planets as Record<string, { lon: number; sign: string; deg_min: string }>;
  const aspects = (result.aspects as Array<Record<string, unknown>>) ?? [];
  return (
    <div className="space-y-3">
      <div className={`rounded-xl border ${theme.card} p-3`}>
        <p className={`text-xs ${theme.text} mb-2`}>
          <span className={theme.accent}>{tr.targetDate}:</span> {result.target_date as string}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(transitPlanets).map(([name, p]) => (
            <div key={name} className={`text-xs px-2 py-1 rounded-lg border ${theme.card} flex items-center gap-1`}>
              <span className={theme.symbol}>{PLANET_SYMBOLS[name]}</span>
              <span className={theme.text}>{pname(name)}</span>
              <span className="opacity-50 mx-0.5">in</span>
              <span style={{ color: SIGN_COLORS[p.sign] || '#888' }}>{tr.signs[p.sign] ?? p.sign}</span>
              <span className={`font-mono ${theme.accent} ml-1`}>{p.deg_min}</span>
            </div>
          ))}
        </div>
      </div>
      <AspectPairList aspects={aspects} col1Label="transit" col2Label="natal" theme={theme} />
    </div>
  );
}

function ProgressionView({ result, theme }: { result: AnyResult; theme: typeof chartThemes[ThemeKey] }) {
  const { tr } = useLang();
  const planetsKey = 'prog_planets' in result ? 'prog_planets' : 'directed_planets';
  const aspectsKey = 'aspects_prog_to_natal' in result ? 'aspects_prog_to_natal' : 'aspects_directed_to_natal';
  const planetsMap = result[planetsKey] as Record<string, { lon: number; sign: string; deg_min: string }>;
  const aspects = (result[aspectsKey] as Array<Record<string, unknown>>) ?? [];
  const col1 = planetsKey === 'prog_planets' ? 'prog' : 'directed';
  return (
    <div className="space-y-3">
      {result.solar_arc_deg != null && (
        <div className={`rounded-xl border ${theme.card} p-3 text-xs ${theme.text}`}>
          <span className={theme.accent}>{tr.solarArc}:</span> +{(result.solar_arc_deg as number).toFixed(4)}°
          <span className="ml-3 opacity-60">{tr.targetDate}: {result.target_date as string}</span>
        </div>
      )}
      {result.years_elapsed != null && (
        <div className={`rounded-xl border ${theme.card} p-3 text-xs ${theme.text}`}>
          <span className={theme.accent}>{tr.secondary}:</span> {(result.years_elapsed as number).toFixed(2)} {tr.targetDate} {result.target_date as string}
        </div>
      )}
      <MiniPlanetTable planetsMap={planetsMap} theme={theme} />
      <AspectPairList aspects={aspects} col1Label={col1} col2Label="natal" theme={theme} />
    </div>
  );
}

function ReturnView({ result, theme }: { result: AnyResult; theme: typeof chartThemes[ThemeKey] }) {
  const { tr } = useLang();
  const planetsMap = result.planets as Record<string, { lon: number; sign: string; deg_min: string }>;
  const houses = result.houses as Record<string, { lon: number; sign: string; deg_min?: string }>;
  const dateStr = (result.sr_date_utc ?? result.lr_date_utc ?? '') as string;
  return (
    <div className="space-y-3">
      {dateStr && (
        <div className={`rounded-xl border ${theme.card} p-3 text-xs ${theme.text}`}>
          <span className={theme.accent}>{result.return_year ? tr.solarReturn : tr.lunarReturn}:</span> {dateStr}
        </div>
      )}
      <MiniPlanetTable planetsMap={planetsMap} theme={theme} />
      {houses && (
        <div className={`rounded-xl border ${theme.card} p-3`}>
          <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>{tr.houseCusps}</h4>
          <div className="grid grid-cols-3 gap-1 text-xs">
            {Array.from({ length: 12 }, (_, i) => {
              const h = houses[`h${i + 1}`];
              return h ? (
                <div key={i} className={`flex gap-1 ${theme.text}`}>
                  <span className="opacity-50 w-4">H{i + 1}</span>
                  <span style={{ color: SIGN_COLORS[h.sign] || '#888' }}>{tr.signs[h.sign] ?? h.sign}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfectionView({ result, theme }: { result: AnyResult; theme: typeof chartThemes[ThemeKey] }) {
  const { tr } = useLang();
  const pname = (k: unknown) => tr.planets[k as string] ?? (k as string);
  const sname = (k: unknown) => tr.signs[k as string] ?? (k as string);
  return (
    <div className={`rounded-xl border ${theme.card} p-4 space-y-3`}>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className={`text-xs ${theme.text} opacity-60 mb-0.5`}>Age</p>
          <p className={`font-bold ${theme.accent}`}>{result.age as number}</p>
        </div>
        <div>
          <p className={`text-xs ${theme.text} opacity-60 mb-0.5`}>{tr.targetDate}</p>
          <p className={`font-medium ${theme.text}`}>{result.target_date as string}</p>
        </div>
        <div>
          <p className={`text-xs ${theme.text} opacity-60 mb-0.5`}>Annual House</p>
          <p className={`font-bold text-lg ${theme.accent}`}>H{result.annual_house as number}</p>
          <p className={`text-xs ${theme.text}`}>{sname(result.annual_sign)}</p>
          <p className={`text-xs ${theme.symbol}`}>Lord: {pname(result.annual_lord)}</p>
        </div>
        <div>
          <p className={`text-xs ${theme.text} opacity-60 mb-0.5`}>Monthly House</p>
          <p className={`font-bold text-lg ${theme.accent}`}>H{result.monthly_house as number}</p>
          <p className={`text-xs ${theme.text}`}>{sname(result.monthly_sign)}</p>
          <p className={`text-xs ${theme.symbol}`}>Lord: {pname(result.monthly_lord)}</p>
        </div>
      </div>
    </div>
  );
}

function EphemeridesView({ result, theme }: { result: AnyResult; theme: typeof chartThemes[ThemeKey] }) {
  const { tr } = useLang();
  const rows = (result.rows as Array<Record<string, unknown>>) ?? [];
  const pname = (k: string) => tr.planets[k] ?? k;
  const planetOrder = [
    'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
    'uranus', 'neptune', 'pluto', 'true_node', 'node', 'lilith', 'chiron',
  ];

  if (!rows.length) return null;
  const eng = result.engine ? String(result.engine) : '';
  const engineBadge = eng ? (
    <span className={`ml-3 px-1.5 py-0.5 rounded text-[10px] font-mono ${
      eng === 'swiss_ephemeris' ? 'bg-green-900/50 text-green-300'
      : eng === 'moshier' ? 'bg-yellow-900/50 text-yellow-300'
      : 'bg-zinc-800 text-zinc-400'
    }`}>
      {eng === 'swiss_ephemeris' ? '✓ Swiss Ephemeris' : eng === 'moshier' ? '~ Moshier' : 'VSOP87'}
    </span>
  ) : null;
  return (
    <div className={`rounded-xl border ${theme.card} p-3`}> 
      <div className={`text-xs ${theme.text} mb-2`}>
        <span className={theme.accent}>Start:</span> {String(result.start_date)} {String(result.time_utc)} UTC ·
        <span className="ml-2">Days: {String(result.days)}</span>
        {engineBadge}
      </div>
      <div className="overflow-auto max-h-[520px] rounded-lg border border-white/10">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-black/60 backdrop-blur-sm">
            <tr className={`${theme.accent}`}>
              <th className="px-2 py-1 text-left">Date</th>
              {planetOrder.map(p => (
                <th key={p} className="px-2 py-1 text-left">{pname(p)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const planets = (row.planets as Record<string, Record<string, unknown>>) ?? {};
              return (
                <tr key={i} className="border-t border-white/10 align-top">
                  <td className={`px-2 py-1.5 whitespace-nowrap ${theme.text}`}>{String(row.date)}</td>
                  {planetOrder.map(p => {
                    const pv = planets[p] ?? {};
                    return (
                      <td key={p} className={`px-2 py-1.5 ${theme.text}`}>
                        <div className="whitespace-nowrap">{String(pv.sign ?? '')} {String(pv.deg_min ?? '')}</div>
                        <div className="opacity-60 font-mono">
                          {typeof pv.speed_deg_day === 'number' ? (pv.speed_deg_day as number).toFixed(3) : ''}°/d
                          {pv.retrograde ? ' R' : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AstroSummaryView({ result, theme }: { result: AnyResult; theme: typeof chartThemes[ThemeKey] }) {
  const periods = (result.periods as Record<string, Record<string, unknown>>) ?? {};
  const order: Array<[string, string]> = [
    ['day', 'Астросводка дня'],
    ['week', 'Астросводка недели'],
    ['month', 'Астросводка месяца'],
    ['year', 'Астросводка года'],
  ];

  return (
    <div className="space-y-3">
      {order.map(([k, title]) => {
        const p = periods[k] ?? {};
        const energy = String(p.energy ?? 'переменный');
        const aspects = (p.key_aspects as string[]) ?? [];
        const energyClass = energy === 'благоприятный'
          ? 'bg-green-500/10 text-green-300 border-green-500/30'
          : energy === 'напряженный'
          ? 'bg-red-500/10 text-red-300 border-red-500/30'
          : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
        return (
          <div key={k} className={`rounded-xl border ${theme.card} p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h4 className={`font-semibold ${theme.header}`}>{title}</h4>
              <div className={`px-2 py-1 rounded-md border text-xs ${energyClass}`}>{energy}</div>
            </div>
            <div className={`text-xs ${theme.text} mb-3`}>
              Период: {String(p.start_date ?? '')} — {String(p.end_date ?? '')}
            </div>
            <div className={`text-sm ${theme.text} mb-2`}>
              {String(p.interpretation ?? '')}
            </div>
            <div className={`text-sm ${theme.text} mb-2`}>
              <span className={theme.accent}>Фокус:</span> {String(p.focus ?? '')}
            </div>
            {!!aspects.length && (
              <div className={`text-xs ${theme.text} mb-2`}>
                <span className={theme.accent}>Ключевые аспекты:</span>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  {aspects.map((a, idx) => <li key={idx}>{a}</li>)}
                </ul>
              </div>
            )}
            <div className={`text-sm ${theme.text}`}>
              <span className={theme.accent}>Рекомендация:</span> {String(p.advice ?? '')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Predictive Panel ─────────────────────────────────────────────────────────
function PredictivePanel({ birth, theme }: { birth: BirthInput; theme: typeof chartThemes[ThemeKey] }) {
  const { tr } = useLang();
  const [tab, setTab] = useState<'transits'|'secondary'|'solar-arc'|'solar-return'|'lunar-return'|'profections'|'tertiary'|'converse'|'ephemerides'|'astrosummary'>('transits');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetTime, setTargetTime] = useState('12:00');
  const [returnYear, setReturnYear] = useState(new Date().getFullYear());
  const [result, setResult] = useState<AnyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      let data;
      switch (tab) {
        case 'transits':      data = await getTransits(birth, targetDate, targetTime); break;
        case 'secondary':     data = await getSecondaryProgressions(birth, targetDate); break;
        case 'solar-arc':     data = await getSolarArc(birth, targetDate); break;
        case 'solar-return':  data = await getSolarReturn(birth, returnYear); break;
        case 'lunar-return':  data = await getLunarReturn(birth, targetDate); break;
        case 'profections':   data = await getProfections(birth, targetDate); break;
        case 'tertiary':      data = await getTertiaryProgressions(birth, targetDate); break;
        case 'converse':      data = await getConverseProgressions(birth, targetDate); break;
        case 'ephemerides':   data = await getEphemerides(targetDate, 30, targetTime); break;
        case 'astrosummary':  data = await getAstroSummary(targetDate, targetTime); break;
      }
      setResult(data as AnyResult);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [tab, birth, targetDate, targetTime, returnYear]);

  const tabs: [string, string][] = [
    ['transits', tr.transits], ['secondary', tr.secondary],
    ['solar-arc', tr.solarArc], ['solar-return', tr.solarReturn],
    ['lunar-return', tr.lunarReturn], ['profections', tr.profections],
    ['tertiary', tr.tertiary], ['converse', tr.converse],
    ['ephemerides', 'Эфемериды'],
    ['astrosummary', 'Астросводка'],
  ];

  const renderResult = () => {
    if (!result) return null;
    const type = result.type as string;
    if (type === 'transits') return <TransitView result={result} theme={theme} />;
    if (['secondary_progressions','solar_arc','tertiary_progressions','converse_progressions'].includes(type))
      return <ProgressionView result={result} theme={theme} />;
    if (['solar_return','lunar_return'].includes(type))
      return <ReturnView result={result} theme={theme} />;
    if (type === 'profections')
      return <ProfectionView result={result} theme={theme} />;
    if (type === 'ephemerides')
      return <EphemeridesView result={result} theme={theme} />;
    if (type === 'astrosummary')
      return <AstroSummaryView result={result} theme={theme} />;
    // Fallback
    return (
      <pre className={`text-xs ${theme.text} overflow-auto max-h-96 p-3 rounded-xl border ${theme.card}`}>
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k as typeof tab); setResult(null); setError(null); }}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${tab === k ? theme.tabActive : theme.tabInactive}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        {tab === 'solar-return' ? (
          <div>
            <label className={`text-xs ${theme.text} mb-1 block`}>{tr.returnYear}</label>
            <input type="number" value={returnYear} onChange={e => setReturnYear(parseInt(e.target.value))}
              className={`px-3 py-2 rounded-lg border text-sm w-28 ${theme.card}`} />
          </div>
        ) : (
          <>
            <div>
              <label className={`text-xs ${theme.text} mb-1 block`}>{tr.targetDate}</label>
              <DateSegmentInput value={targetDate} onChange={setTargetDate}
                className={`px-3 py-2 rounded-lg border text-sm ${theme.card}`} />
            </div>
            <div>
              <label className={`text-xs ${theme.text} mb-1 block`}>UTC Time</label>
              <input type="time" value={targetTime} onChange={e => setTargetTime(e.target.value || '12:00')}
                className={`px-3 py-2 rounded-lg border text-sm ${theme.card}`} />
            </div>
          </>
        )}
        <button onClick={run} disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme.btn}`}>
          {loading ? <><Spin />{tr.calculating}</> : tr.calculate}
        </button>
      </div>
      {error && <Err msg={error} />}
      {renderResult()}
    </div>
  );
}

// ─── Synastry Panel ───────────────────────────────────────────────────────────
type SynTab = 'compat'|'aspects'|'spheres'|'compensation'|'forecast'|'advanced'|'interaction-engine'|'composite'|'davison';

function SynastryPanel({ birth, theme, people }: { birth: BirthInput; theme: typeof chartThemes[ThemeKey]; people?: SavedPerson[] }) {
  const { tr } = useLang();
  const pname = (k: string) => tr.planets[k] ?? k;
  const [tab, setTab] = useState<SynTab>('compat');
  const [partner, setPartner] = useState<BirthInput & { name?: string }>({
    date: '', time: '12:00', lat: 0, lon: 0, utc: 0, name: '',
  });
  const [result, setResult] = useState<SynastryResult | null>(null);
  const [compositeChart, setCompositeChart] = useState<NatalChart | null>(null);
  const [davisonChart, setDavisonChart] = useState<NatalChart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAspect, setExpandedAspect] = useState<number | null>(null);
  const [selectedSphere, setSelectedSphere] = useState<string | null>(null);
  const [expandedSphere, setExpandedSphere] = useState<string | null>(null);

  // Forecast state
  const today = new Date().toISOString().slice(0, 10);
  const threeMonths = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const [forecastStart, setForecastStart] = useState(today);
  const [forecastEnd,   setForecastEnd]   = useState(threeMonths);
  const [forecast, setForecast]           = useState<RelationshipForecast | null>(null);
  const [forecastSphere, setForecastSphere] = useState<string | null>(null);
  const [expandedFortnight, setExpandedFortnight] = useState<number | null>(null);

  // Advanced: synastry + current transits (for both partners)
  const [advancedDate, setAdvancedDate] = useState(today);
  const [advancedTime, setAdvancedTime] = useState('12:00');
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [advancedSelfTransits, setAdvancedSelfTransits] = useState<AnyResult | null>(null);
  const [advancedPartnerTransits, setAdvancedPartnerTransits] = useState<AnyResult | null>(null);
  const [windowDayIndex, setWindowDayIndex] = useState<number | null>(null);

  const run = useCallback(async () => {
    if (!partner.date) { setError('Введите дату рождения партнёра'); return; }
    setLoading(true); setError(null); setResult(null); setCompositeChart(null); setDavisonChart(null);
    try {
      const [syn, comp, dav] = await Promise.all([
        getSynastry(birth, partner),
        getCompositeChart(birth, partner),
        getDavisonChart(birth, partner),
      ]);
      setResult(syn as SynastryResult);
      setCompositeChart(comp as NatalChart);
      setDavisonChart(dav as NatalChart);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [birth, partner]);

  // Sphere scores derived from synastry aspects
  const sphereScores: SphereScore[] = useMemo(
    () => result ? scoreSpheres(result.aspects) : [],
    [result]
  );
  const overallScore = useMemo(() => {
    if (!sphereScores.length) return 0;
    return Math.round(sphereScores.reduce((s, ss) => s + ss.score, 0) / sphereScores.length);
  }, [sphereScores]);

  const selectedSS = useMemo(
    () => sphereScores.find(ss => ss.sphere.id === selectedSphere) ?? null,
    [sphereScores, selectedSphere]
  );

  const runAdvanced = useCallback(async () => {
    if (!partner.date) {
      setAdvancedError('Сначала заполните данные партнёра и рассчитайте синастрию.');
      return;
    }
    setAdvancedLoading(true);
    setAdvancedError(null);
    try {
      const [selfT, partnerT] = await Promise.all([
        getTransits(birth, advancedDate, advancedTime),
        getTransits(partner, advancedDate, advancedTime),
      ]);
      setAdvancedSelfTransits(selfT as AnyResult);
      setAdvancedPartnerTransits(partnerT as AnyResult);
    } catch (e: unknown) {
      setAdvancedError((e as Error).message);
    } finally {
      setAdvancedLoading(false);
    }
  }, [birth, partner, advancedDate, advancedTime]);

  const advancedSummary = useMemo(() => {
    const selfAspects = ((advancedSelfTransits?.aspects as Array<Record<string, unknown>>) ?? []);
    const partnerAspects = ((advancedPartnerTransits?.aspects as Array<Record<string, unknown>>) ?? []);
    const all = [...selfAspects, ...partnerAspects];
    if (!all.length) {
      return null;
    }

    const positive = new Set(['trine', 'sextile']);
    const challenging = new Set(['square', 'opposition', 'quincunx', 'semisquare', 'sesquisquare', 'contra_parallel']);

    let supportive = 0;
    let tense = 0;
    const top = all
      .map(item => {
        const aspect = String(item.aspect || '');
        const orb = typeof item.orb === 'number' ? item.orb : 6;
        const intensity = Math.max(0.1, 1 - Math.min(orb, 6) / 6);
        if (positive.has(aspect)) supportive += intensity;
        if (challenging.has(aspect)) tense += intensity;
        return {
          transit: String(item.transit_planet || ''),
          natal: String(item.natal_planet || ''),
          aspect,
          orb,
          intensity,
        };
      })
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 8);

    const ratio = supportive + tense > 0 ? supportive / (supportive + tense) : 0.5;
    const balanceLabel = ratio >= 0.62
      ? 'Поддерживающий транзитный фон'
      : ratio <= 0.42
      ? 'Напряжённый транзитный фон'
      : 'Смешанный транзитный фон';

    const strongestSphere = sphereScores[0];
    const weakSphere = [...sphereScores].sort((a, b) => a.score - b.score)[0];

    // ── 14-day window strip (client-side orb projection) ──────────────────────
    const baseMs = new Date(advancedDate || new Date().toISOString().slice(0, 10)).getTime();
    const MAX_ORB_W = 6.0;
    type WinAspect = { transit: string; natal: string; aspect: string; orb: number; tone: 'green' | 'orange' | 'neutral' };
    type WinDay = { dateLabel: string; score: number; tone: 'green' | 'orange' | 'neutral'; aspects: WinAspect[] };
    const windowStrip: WinDay[] = Array.from({ length: 14 }, (_, d) => {
      const dayDate = new Date(baseMs + d * 86_400_000);
      const dateLabel = dayDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace(/\.$/, '');
      let dayScore = 0;
      const aspects: WinAspect[] = [];
      for (const raw of all) {
        const tPlanet = String(raw.transit_planet || '');
        const nPlanet = String(raw.natal_planet || '');
        const asp = String(raw.aspect || '');
        const curOrb = typeof raw.orb === 'number' ? (raw.orb as number) : 3;
        const isApplying = !!(raw.applying);
        const dailyMot = DAILY_MOTION[tPlanet.toLowerCase()] ?? 0.5;
        const delta = dailyMot * d;
        const projOrb = isApplying
          ? (delta <= curOrb ? curOrb - delta : delta - curOrb)
          : curOrb + delta;
        if (projOrb > MAX_ORB_W) continue;
        const projIntensity = Math.max(0.05, 1 - projOrb / MAX_ORB_W);
        const tone: 'green' | 'orange' | 'neutral' = positive.has(asp) ? 'green' : challenging.has(asp) ? 'orange' : 'neutral';
        if (positive.has(asp)) dayScore += projIntensity;
        if (challenging.has(asp)) dayScore -= projIntensity;
        aspects.push({ transit: tPlanet, natal: nPlanet, aspect: asp, orb: projOrb, tone });
      }
      const daytone: 'green' | 'orange' | 'neutral' = dayScore >= 0.35 ? 'green' : dayScore <= -0.35 ? 'orange' : 'neutral';
      return { dateLabel, score: dayScore, tone: daytone, aspects };
    });

    return {
      totalAspects: all.length,
      supportive: Math.round(supportive * 100) / 100,
      tense: Math.round(tense * 100) / 100,
      ratio,
      balanceLabel,
      top,
      strongestSphere,
      weakSphere,
      windowStrip,
    };
  }, [advancedSelfTransits, advancedPartnerTransits, sphereScores, advancedDate]);

  const TABS: Array<[SynTab, string]> = [
    ['compat',       '⭐ Совместимость'],
    ['aspects',      '🔗 Аспекты'],
    ['spheres',      '🌐 Сферы жизни'],
    ['compensation', '💡 Компенсаторика'],
    ['forecast',     '🔮 Прогностика'],
    ['advanced',     '🧠 Синастрия + транзиты'],
    ['interaction-engine', '🧩 Движок взаимодействия'],
    ['composite',    '🔵 Композит'],
    ['davison',      '🟡 Дэвисон'],
  ];

  return (
    <div className="space-y-4">
      {/* Partner form */}
      <BirthForm value={partner} onChange={setPartner} label={tr.partnerData} theme={theme} people={people} />
      <button onClick={run} disabled={loading}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme.btn}`}>
        {loading ? <><Spin />Рассчитываю все карты…</> : '✨ Рассчитать синастрию'}
      </button>
      {error && <Err msg={error} />}

      {/* Tab bar — shown after calculation */}
      {result && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {TABS.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${tab === id ? theme.tabActive : theme.tabInactive}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── COMPATIBILITY OVERVIEW ── */}
          {tab === 'compat' && (
            <div className="space-y-4">
              {/* Overall score */}
              <div className={`rounded-xl border ${theme.card} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`font-semibold text-base ${theme.header}`}>Общая совместимость</h4>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getScoreLabel(overallScore).color}`}>{overallScore}%</div>
                    <div className={`text-xs ${getScoreLabel(overallScore).color}`}>{getScoreLabel(overallScore).label}</div>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-white/10 mb-4">
                  <div className={`h-3 rounded-full transition-all ${getScoreBarColor(overallScore)}`}
                    style={{ width: `${overallScore}%` }} />
                </div>
                <p className={`text-sm leading-relaxed ${theme.text}`}>{getOverallText(overallScore)}</p>
              </div>

              {/* API scores */}
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <h4 className={`text-sm font-semibold ${theme.accent} mb-3`}>Детальные оценки</h4>
                {([
                  ['harmony',       '❤️ Гармония',         result.score.harmony,       20],
                  ['challenge',     '⚡ Напряжение',        result.score.challenge,      20],
                  ['attraction',    '🔥 Притяжение',        result.score.attraction,     20],
                  ['communication', '💬 Коммуникация',      result.score.communication,  20],
                  ['total_score',   '⭐ Итог (API)',        result.score.total_score,    100],
                ] as const).map(([key, label, val, max]) => (
                  <div key={key} className="flex items-center gap-2 mb-2">
                    <span className={`text-xs w-36 ${theme.text}`}>{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/10">
                      <div className={`h-2 rounded-full transition-all ${key === 'challenge' ? 'bg-orange-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, (val / max) * 100)}%` }} />
                    </div>
                    <span className={`text-xs font-mono w-8 text-right ${theme.accent}`}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Sphere overview grid */}
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <h4 className={`text-sm font-semibold ${theme.accent} mb-3`}>Сферы жизни — обзор</h4>
                <div className="grid grid-cols-2 gap-2">
                  {sphereScores.map(ss => {
                    const { label, color } = getScoreLabel(ss.score);
                    return (
                      <button key={ss.sphere.id}
                        onClick={() => { setSelectedSphere(ss.sphere.id); setTab('compensation'); }}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-left ${theme.card} hover:opacity-80`}>
                        <span className="text-base">{ss.sphere.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium ${theme.text} truncate`}>{ss.sphere.name}</div>
                          <div className="h-1.5 rounded-full bg-white/10 mt-1">
                            <div className={`h-1.5 rounded-full ${getScoreBarColor(ss.score)}`}
                              style={{ width: `${ss.score}%` }} />
                          </div>
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${color}`}>{ss.score}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── ASPECTS WITH INTERPRETATIONS ── */}
          {tab === 'aspects' && (
            <div className={`rounded-xl border ${theme.card} p-4 space-y-2`}>
              <h4 className={`text-sm font-semibold ${theme.accent} mb-2`}>
                Аспекты синастрии ({result.aspects.length})
              </h4>
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {result.aspects.map((a, i) => {
                  const interp = getPairInterp(a.p1, a.p2);
                  const cat = getAspectCategory(a.aspect);
                  const isOpen = expandedAspect === i;
                  return (
                    <div key={i} className={`rounded-lg border transition-colors ${theme.card}`}>
                      <button className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${theme.text}`}
                        onClick={() => setExpandedAspect(isOpen ? null : i)}>
                        <span className={`text-sm ${theme.symbol}`}>{PLANET_SYMBOLS[a.p1] || a.p1}</span>
                        <span className="font-medium">{pname(a.p1)}</span>
                        <span className={`font-bold ${theme.accent}`}>{ASPECT_SYMBOLS[a.aspect] || a.aspect}</span>
                        <span className="font-medium">{pname(a.p2)}</span>
                        <span className={`text-sm ${theme.symbol}`}>{PLANET_SYMBOLS[a.p2] || a.p2}</span>
                        {cat === 'harm' && <span className="ml-1 text-green-400">▲</span>}
                        {cat === 'tense' && <span className="ml-1 text-red-400">▼</span>}
                        {cat === 'conj' && <span className="ml-1 text-yellow-400">◆</span>}
                        <span className="ml-auto opacity-50">{a.orb.toFixed(1)}°</span>
                        <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {isOpen && interp && cat && (
                        <div className={`px-3 pb-3 text-xs leading-relaxed ${theme.text} border-t border-white/10 pt-2`}>
                          <span className={`font-semibold ${theme.accent}`}>{interp.title} · </span>
                          {getAspectInterpText(interp, cat)}
                        </div>
                      )}
                      {isOpen && !interp && (
                        <div className={`px-3 pb-3 text-xs opacity-50 ${theme.text} border-t border-white/10 pt-2`}>
                          Интерпретация для этой пары планет в разработке.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── LIFE SPHERES ── */}
          {tab === 'spheres' && (
            <div className="space-y-3">
              {sphereScores.map(ss => {
                const isOpen = expandedSphere === ss.sphere.id;
                const { label, color } = getScoreLabel(ss.score);
                return (
                  <div key={ss.sphere.id} className={`rounded-xl border ${theme.card} overflow-hidden`}>
                    <button className="w-full flex items-center gap-3 p-4"
                      onClick={() => setExpandedSphere(isOpen ? null : ss.sphere.id)}>
                      <span className="text-2xl">{ss.sphere.icon}</span>
                      <div className="flex-1 text-left">
                        <div className={`font-semibold text-sm ${theme.header}`}>{ss.sphere.name}</div>
                        <div className="h-2 rounded-full bg-white/10 mt-1 w-48">
                          <div className={`h-2 rounded-full ${getScoreBarColor(ss.score)}`}
                            style={{ width: `${ss.score}%` }} />
                        </div>
                      </div>
                      <div className="text-right mr-2">
                        <div className={`text-xl font-bold ${color}`}>{ss.score}</div>
                        <div className={`text-xs ${color}`}>{label}</div>
                      </div>
                      <ChevronDown className={`h-4 w-4 ${theme.text} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className={`border-t border-white/10 p-4 space-y-4`}>
                        <p className={`text-sm leading-relaxed ${theme.text}`}>{getSphereInterpretation(ss)}</p>
                        {ss.topAspects.length > 0 && (
                          <div>
                            <h5 className={`text-xs font-semibold ${theme.accent} mb-2`}>Ключевые аспекты</h5>
                            <div className="space-y-2">
                              {ss.topAspects.map((ta, ti) => (
                                <div key={ti} className={`rounded-lg p-2 bg-white/5 text-xs ${theme.text}`}>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className={theme.symbol}>{PLANET_SYMBOLS[ta.aspect.p1] || ta.aspect.p1}</span>
                                    <span className="font-medium">{pname(ta.aspect.p1)}</span>
                                    <span className={`font-bold ${theme.accent}`}>{ASPECT_SYMBOLS[ta.aspect.aspect] || ta.aspect.aspect}</span>
                                    <span className="font-medium">{pname(ta.aspect.p2)}</span>
                                    <span className={theme.symbol}>{PLANET_SYMBOLS[ta.aspect.p2] || ta.aspect.p2}</span>
                                    <span className="ml-auto opacity-40">{ta.aspect.orb.toFixed(1)}°</span>
                                  </div>
                                  {ta.interp && (
                                    <p className="opacity-70 leading-relaxed">
                                      {getAspectInterpText(ta.interp, ta.category)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => { setSelectedSphere(ss.sphere.id); setTab('compensation'); }}
                          className={`flex items-center gap-1.5 text-xs ${theme.accent} hover:opacity-80 transition-opacity`}>
                          <Lightbulb className="h-3.5 w-3.5" />
                          Как улучшить эту сферу →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── COMPENSATION ── */}
          {tab === 'compensation' && (
            <div className="space-y-4">
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <h4 className={`font-semibold ${theme.header} mb-1`}>💡 Компенсаторика</h4>
                <p className={`text-xs ${theme.text} opacity-70`}>
                  Выберите сферу жизни, чтобы получить конкретные рекомендации по гармонизации отношений.
                </p>
              </div>

              {/* Sphere selector */}
              <div className="grid grid-cols-2 gap-2">
                {sphereScores.map(ss => {
                  const { color } = getScoreLabel(ss.score);
                  const isSelected = selectedSphere === ss.sphere.id;
                  return (
                    <button key={ss.sphere.id} onClick={() => setSelectedSphere(ss.sphere.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                        isSelected
                          ? `${theme.tabActive} ring-2 ring-indigo-400/50`
                          : `${theme.card} hover:opacity-80`
                      }`}>
                      <span className="text-xl">{ss.sphere.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium ${theme.text} truncate`}>{ss.sphere.name}</div>
                        <div className="h-1.5 rounded-full bg-white/10 mt-1">
                          <div className={`h-1.5 rounded-full ${getScoreBarColor(ss.score)}`}
                            style={{ width: `${ss.score}%` }} />
                        </div>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${color}`}>{ss.score}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected sphere detail */}
              {selectedSS && (
                <div
                  className={`rounded-xl border ${theme.card} p-5 space-y-5`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{selectedSS.sphere.icon}</span>
                    <div>
                      <h4 className={`font-bold text-base ${theme.header}`}>{selectedSS.sphere.name}</h4>
                      <p className={`text-xs ${theme.text} opacity-70 mt-0.5`}>{selectedSS.sphere.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-2 w-32 rounded-full bg-white/10">
                          <div className={`h-2 rounded-full ${getScoreBarColor(selectedSS.score)}`}
                            style={{ width: `${selectedSS.score}%` }} />
                        </div>
                        <span className={`text-sm font-bold ${getScoreLabel(selectedSS.score).color}`}>
                          {selectedSS.score}% — {getScoreLabel(selectedSS.score).label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Interpretation */}
                  <div className={`rounded-lg p-3 bg-white/5`}>
                    <h5 className={`text-xs font-semibold ${theme.accent} mb-1.5`}>Астрологический анализ</h5>
                    <p className={`text-sm leading-relaxed ${theme.text}`}>{getSphereInterpretation(selectedSS)}</p>
                  </div>

                  {/* Key aspects */}
                  {selectedSS.topAspects.length > 0 && (
                    <div>
                      <h5 className={`text-xs font-semibold ${theme.accent} mb-2`}>Задействованные аспекты</h5>
                      <div className="space-y-2">
                        {selectedSS.topAspects.map((ta, ti) => {
                          const isHarm = ta.category === 'harm';
                          const isConj = ta.category === 'conj';
                          return (
                            <div key={ti} className={`rounded-lg p-2.5 text-xs ${
                              isHarm ? 'bg-green-500/10 border border-green-500/20'
                              : isConj ? 'bg-yellow-500/10 border border-yellow-500/20'
                              : 'bg-red-500/10 border border-red-500/20'
                            }`}>
                              <div className={`flex items-center gap-1.5 font-medium mb-1 ${theme.text}`}>
                                <span>{PLANET_SYMBOLS[ta.aspect.p1] || ta.aspect.p1}</span>
                                <span>{pname(ta.aspect.p1)}</span>
                                <span className={theme.accent}>{ASPECT_SYMBOLS[ta.aspect.aspect] || ta.aspect.aspect}</span>
                                <span>{pname(ta.aspect.p2)}</span>
                                <span>{PLANET_SYMBOLS[ta.aspect.p2] || ta.aspect.p2}</span>
                                <span className={`ml-auto ${isHarm ? 'text-green-400' : isConj ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {isHarm ? '▲ гармония' : isConj ? '◆ соединение' : '▼ напряжение'}
                                </span>
                              </div>
                              {ta.interp && (
                                <p className={`leading-relaxed opacity-80 ${theme.text}`}>
                                  {getAspectInterpText(ta.interp, ta.category)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div>
                    <h5 className={`text-xs font-semibold ${theme.accent} mb-3 flex items-center gap-1.5`}>
                      <Lightbulb className="h-3.5 w-3.5" />
                      Рекомендации по гармонизации
                    </h5>
                    <div className="space-y-2">
                      {getSphereActions(selectedSS).map((action, ai) => (
                        <div key={ai} className={`flex gap-3 p-3 rounded-lg bg-white/5 text-sm ${theme.text}`}>
                          <span className={`shrink-0 font-bold text-xs mt-0.5 ${theme.accent} w-5 text-center`}>{ai + 1}</span>
                          <span className="leading-relaxed">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FORECAST ── */}
          {tab === 'forecast' && (
            <div className="space-y-4">
              {/* Period selector */}
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <h4 className={`font-semibold ${theme.header} mb-1`}>🔮 Прогностика отношений</h4>
                <p className={`text-xs ${theme.text} opacity-60 mb-3`}>
                  Астрологический прогноз развития отношений по сферам с конкретными датами и рекомендациями.
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className={`text-xs ${theme.text} mb-1 block`}>С даты</label>
                    <DateSegmentInput value={forecastStart} onChange={setForecastStart}
                      className={`px-3 py-2 rounded-lg border text-sm ${theme.card}`} />
                  </div>
                  <div>
                    <label className={`text-xs ${theme.text} mb-1 block`}>По дату</label>
                    <DateSegmentInput value={forecastEnd} onChange={setForecastEnd}
                      className={`px-3 py-2 rounded-lg border text-sm ${theme.card}`} />
                  </div>
                  <button
                    onClick={() => setForecast(generateForecast(forecastStart, forecastEnd, sphereScores))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${theme.btn}`}>
                    Построить прогноз
                  </button>
                </div>
              </div>

              {forecast && (
                <div className="space-y-4">
                  {/* Overall period */}
                  <div className={`rounded-xl border ${theme.card} p-5`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className={`font-bold ${theme.header}`}>Период: {forecast.periodLabel}</h4>
                        <p className={`text-xs ${theme.text} opacity-60`}>Общая астрологическая энергия</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getForecastScoreBarColor(forecast.overallScore).replace('bg-','text-')}`}>
                          {forecast.overallScore}%
                        </div>
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-white/10 mb-3">
                      <div className={`h-3 rounded-full ${getForecastScoreBarColor(forecast.overallScore)}`}
                        style={{ width: `${forecast.overallScore}%` }} />
                    </div>
                    <p className={`text-sm leading-relaxed ${theme.text}`}>{forecast.overallSummary}</p>
                  </div>

                  {/* Top dates */}
                  {forecast.topDates.length > 0 && (
                    <div className={`rounded-xl border ${theme.card} p-4`}>
                      <h4 className={`text-sm font-semibold ${theme.accent} mb-3`}>
                        ✨ Лучшие даты периода
                      </h4>
                      <div className="space-y-2">
                        {forecast.topDates.map((td, i) => (
                          <div key={i} className="flex gap-3 items-start text-xs">
                            <div className={`shrink-0 font-bold px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-center min-w-[80px]`}>
                              {formatEventDate(td.date)}
                            </div>
                            <div className={`flex-1 ${theme.text}`}>
                              <div className="font-medium opacity-80">{td.eventTitle}</div>
                              <div className="opacity-60 mt-0.5">{td.action}</div>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {td.spheres.slice(0, 3).map(s => (
                                  <span key={s} className="text-xs px-1.5 py-0.5 rounded-full bg-white/10">
                                    {getSphereIcon(s)} {getSphereRuName(s)}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {'⭐'.repeat(td.power)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warning dates */}
                  {forecast.warningDates.length > 0 && (
                    <div className={`rounded-xl border border-orange-500/20 ${theme.card} p-4`}>
                      <h4 className={`text-sm font-semibold text-orange-400 mb-3`}>
                        ⚠️ Периоды осторожности
                      </h4>
                      <div className="space-y-2">
                        {forecast.warningDates.slice(0, 5).map((wd, i) => (
                          <div key={i} className="flex gap-3 items-start text-xs">
                            <div className="shrink-0 font-bold px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 text-center min-w-[80px]">
                              {formatEventDate(wd.date, wd.end)}
                            </div>
                            <div className={`flex-1 ${theme.text}`}>
                              <div className="font-medium opacity-80">{wd.reason}</div>
                              {wd.avoid && <div className="opacity-60 mt-0.5">Избегайте: {wd.avoid}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fortnight timeline */}
                  <div className={`rounded-xl border ${theme.card} p-4`}>
                    <h4 className={`text-sm font-semibold ${theme.accent} mb-3`}>📅 По периодам</h4>
                    <div className="space-y-2">
                      {forecast.fortnights.map((fn, fi) => {
                        const isOpen = expandedFortnight === fi;
                        return (
                          <div key={fi} className={`rounded-lg border overflow-hidden ${theme.card}`}>
                            <button className="w-full flex items-center gap-3 px-4 py-3"
                              onClick={() => setExpandedFortnight(isOpen ? null : fi)}>
                              <div className={`shrink-0 w-2 h-8 rounded-full ${getForecastScoreBarColor(fn.energyScore)}`} />
                              <div className="flex-1 text-left">
                                <div className={`text-xs font-semibold ${theme.text}`}>{fn.label}</div>
                                <div className={`text-xs ${fn.energyColor}`}>{fn.energyLabel}</div>
                              </div>
                              <div className="flex gap-1 flex-wrap max-w-[120px]">
                                {fn.activeSpheres.slice(0, 3).map(s => (
                                  <span key={s} className="text-base">{getSphereIcon(s)}</span>
                                ))}
                              </div>
                              <ChevronDown className={`h-4 w-4 shrink-0 ${theme.text} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isOpen && (
                              <div className={`border-t border-white/10 p-4 space-y-3`}>
                                {/* Main advice */}
                                <p className={`text-sm leading-relaxed ${theme.text}`}>{fn.mainAdvice}</p>

                                {/* Active spheres */}
                                {fn.activeSpheres.length > 0 && (
                                  <div>
                                    <span className={`text-xs font-semibold ${theme.accent}`}>Активные сферы: </span>
                                    <span className={`text-xs ${theme.text}`}>
                                      {fn.activeSpheres.map(s => `${getSphereIcon(s)} ${getSphereRuName(s)}`).join(' · ')}
                                    </span>
                                  </div>
                                )}

                                {/* Best date */}
                                {fn.bestDate && (
                                  <div className="flex gap-3 items-start">
                                    <span className="text-green-400 shrink-0 text-lg">✨</span>
                                    <div>
                                      <span className="text-green-400 font-semibold text-xs">Лучшая дата: </span>
                                      <span className={`text-xs font-bold ${theme.accent}`}>
                                        {formatEventDate(fn.bestDate)}
                                      </span>
                                      <p className={`text-xs ${theme.text} opacity-70 mt-0.5`}>{fn.bestDateAction}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Caution */}
                                {fn.cautionDate && (
                                  <div className="flex gap-3 items-start">
                                    <span className="text-orange-400 shrink-0 text-lg">⚠️</span>
                                    <div>
                                      <span className="text-orange-400 font-semibold text-xs">Осторожно: </span>
                                      <span className={`text-xs font-bold text-orange-400`}>
                                        {formatEventDate(fn.cautionDate)}
                                      </span>
                                      <p className={`text-xs ${theme.text} opacity-70 mt-0.5`}>{fn.cautionReason}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Moon phases */}
                                {fn.moonPhases.length > 0 && (
                                  <div className="space-y-1">
                                    {fn.moonPhases.map((m, mi) => (
                                      <div key={mi} className={`text-xs p-2 rounded-lg bg-white/5 ${theme.text}`}>
                                        <span className="mr-1">{m.type === 'new' ? '🌑' : '🌕'}</span>
                                        <span className="font-medium">{m.title} ({formatEventDate(m.date)})</span>
                                        <span className="opacity-60"> — {m.ritual}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Key events */}
                                {fn.keyEvents.filter(e => e.power >= 2).map((ev, ei) => (
                                  <div key={ei} className={`text-xs p-2 rounded-lg ${
                                    ev.effect === 'boost' ? 'bg-green-500/10' :
                                    ev.effect === 'warning' ? 'bg-orange-500/10' :
                                    ev.effect === 'challenge' ? 'bg-red-500/10' : 'bg-white/5'
                                  } ${theme.text}`}>
                                    <span className="font-medium">{ev.title}</span>
                                    <span className="opacity-60"> — {ev.advice}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sphere calendar */}
                  <div className={`rounded-xl border ${theme.card} p-4`}>
                    <h4 className={`text-sm font-semibold ${theme.accent} mb-3`}>🌐 Прогноз по сферам</h4>
                    {/* Sphere selector */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {forecast.sphereForecasts.map(sf => (
                        <button key={sf.sphereId}
                          onClick={() => setForecastSphere(sf.sphereId)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            forecastSphere === sf.sphereId ? theme.tabActive : theme.tabInactive
                          }`}>
                          <span>{getSphereIcon(sf.sphereId)}</span>
                          <span>{getSphereRuName(sf.sphereId)}</span>
                        </button>
                      ))}
                    </div>

                    {/* Selected sphere forecast */}
                    {forecastSphere && (() => {
                      const sf = forecast.sphereForecasts.find(s => s.sphereId === forecastSphere);
                      const ss = sphereScores.find(s => s.sphere.id === forecastSphere);
                      if (!sf || !ss) return null;
                      return (
                        <div className="space-y-4">
                          {/* Best dates */}
                          {sf.bestDates.length > 0 && (
                            <div>
                              <h5 className={`text-xs font-semibold text-green-400 mb-2`}>
                                ✨ Благоприятные даты для «{getSphereRuName(forecastSphere)}»
                              </h5>
                              <div className="space-y-2">
                                {sf.bestDates.slice(0, 4).map((bd, i) => (
                                  <div key={i} className="flex gap-3 items-start text-xs bg-green-500/10 rounded-lg p-2">
                                    <span className="font-bold text-green-400 shrink-0 min-w-[90px]">
                                      {formatEventDate(bd.date, bd.endDate)}
                                    </span>
                                    <span className={`${theme.text} opacity-80 leading-relaxed`}>{bd.action}</span>
                                    <span className="text-yellow-400">{'⭐'.repeat(bd.power)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Caution dates */}
                          {sf.cautionDates.length > 0 && (
                            <div>
                              <h5 className={`text-xs font-semibold text-orange-400 mb-2`}>
                                ⚠️ Даты осторожности для «{getSphereRuName(forecastSphere)}»
                              </h5>
                              <div className="space-y-2">
                                {sf.cautionDates.map((cd, i) => (
                                  <div key={i} className="flex gap-3 items-start text-xs bg-orange-500/10 rounded-lg p-2">
                                    <span className="font-bold text-orange-400 shrink-0 min-w-[90px]">
                                      {formatEventDate(cd.date, cd.endDate)}
                                    </span>
                                    <span className={`${theme.text} opacity-80`}>{cd.action}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Monthly advice */}
                          {sf.monthSummaries.length > 0 && (
                            <div>
                              <h5 className={`text-xs font-semibold ${theme.accent} mb-2`}>
                                📆 По месяцам
                              </h5>
                              <div className="space-y-2">
                                {sf.monthSummaries.map((ms, i) => (
                                  <div key={i} className={`rounded-lg p-3 text-xs ${theme.card} border`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`font-bold capitalize ${
                                        ms.energy === 'high' ? 'text-green-400' :
                                        ms.energy === 'low'  ? 'text-orange-400' : theme.accent
                                      }`}>{ms.month}</span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        ms.energy === 'high' ? 'bg-green-500/20 text-green-400' :
                                        ms.energy === 'low'  ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-yellow-500/20 text-yellow-400'
                                      }`}>
                                        {ms.energy === 'high' ? '▲ Благоприятно' : ms.energy === 'low' ? '▼ Осторожно' : '→ Умеренно'}
                                      </span>
                                    </div>
                                    <p className={`${theme.text} opacity-70 leading-relaxed`}>{ms.advice}</p>
                                    {ms.action && (
                                      <div className={`mt-1.5 flex gap-1.5 items-start`}>
                                        <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-yellow-400" />
                                        <span className={`${theme.text} opacity-80`}>{ms.action}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Synastry-based compensation for this sphere in this period */}
                          <div className={`rounded-lg p-3 bg-white/5`}>
                            <h5 className={`text-xs font-semibold ${theme.accent} mb-2 flex items-center gap-1.5`}>
                              <Lightbulb className="h-3.5 w-3.5" />
                              Компенсаторика сферы в этот период
                            </h5>
                            <p className={`text-xs ${theme.text} opacity-70 mb-2`}>{getSphereInterpretation(ss)}</p>
                            <div className="space-y-1">
                              {getSphereActions(ss).slice(0, 3).map((a, ai) => (
                                <div key={ai} className={`flex gap-2 text-xs ${theme.text}`}>
                                  <span className={`${theme.accent} font-bold shrink-0`}>{ai + 1}.</span>
                                  <span className="opacity-80">{a}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {!forecastSphere && (
                      <p className={`text-xs ${theme.text} opacity-50 text-center py-4`}>
                        Выберите сферу жизни для детального прогноза
                      </p>
                    )}
                  </div>

                  {/* ── Charts + Calendar + Best Days ── */}
                  <div className={`rounded-xl border ${theme.card} p-4`}>
                    <h4 className={`font-semibold ${theme.header} mb-3`}>📊 Визуализация и лучшие дни</h4>
                    <SynastryForecast
                      startStr={forecastStart}
                      endStr={forecastEnd}
                      synastryScores={sphereScores}
                      isDark={theme.wheelTheme === 'dark'}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ADVANCED: SYNASTRY + TRANSITS ── */}
          {tab === 'advanced' && (
            <div className="space-y-4">
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <h4 className={`font-semibold ${theme.header} mb-1`}>🧠 Продвинутый уровень: Синастрия + транзиты</h4>
                <p className={`text-xs ${theme.text} opacity-70`}>
                  Что это: влияние другого человека + текущие движения планет. Этот блок показывает,
                  как базовая совместимость пары модифицируется транзитным фоном "здесь и сейчас".
                </p>
                <div className="mt-3 flex flex-wrap gap-3 items-end">
                  <div>
                    <label className={`text-xs ${theme.text} mb-1 block`}>Дата транзитов</label>
                    <DateSegmentInput
                      value={advancedDate}
                      onChange={setAdvancedDate}
                      className={`px-3 py-2 rounded-lg border text-sm ${theme.card}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${theme.text} mb-1 block`}>Время (UTC)</label>
                    <input
                      type="time"
                      value={advancedTime}
                      onChange={e => setAdvancedTime(e.target.value || '12:00')}
                      className={`px-3 py-2 rounded-lg border text-sm ${theme.card}`}
                    />
                  </div>
                  <button
                    onClick={runAdvanced}
                    disabled={advancedLoading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme.btn}`}
                  >
                    {advancedLoading ? <><Spin />Считаю двойные транзиты…</> : 'Обновить продвинутый анализ'}
                  </button>
                </div>
              </div>

              {advancedError && <Err msg={advancedError} />}

              {advancedSummary ? (
                <>
                  <div className={`rounded-xl border ${theme.card} p-5`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h5 className={`font-semibold ${theme.header}`}>Баланс транзитного фона пары</h5>
                        <p className={`text-xs ${theme.text} opacity-70 mt-0.5`}>{advancedSummary.balanceLabel}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm ${theme.text}`}>Аспектов учтено: {advancedSummary.totalAspects}</div>
                        <div className={`text-xs ${theme.text} opacity-70`}>
                          Поддержка {advancedSummary.supportive} · Напряжение {advancedSummary.tense}
                        </div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 mt-3">
                      <div
                        className={`h-2 rounded-full ${advancedSummary.ratio >= 0.5 ? 'bg-green-500' : 'bg-orange-500'}`}
                        style={{ width: `${Math.round(advancedSummary.ratio * 100)}%` }}
                      />
                    </div>
                    <p className={`text-sm leading-relaxed ${theme.text} mt-3`}>
                      База пары: {overallScore}% совместимости. Сильная сфера: {advancedSummary.strongestSphere?.sphere.name ?? '—'}.
                      Зона риска: {advancedSummary.weakSphere?.sphere.name ?? '—'}.
                      Сейчас транзитный фон: {advancedSummary.balanceLabel.toLowerCase()}.
                    </p>
                  </div>

                  <div className={`rounded-xl border ${theme.card} p-4`}>
                    <h5 className={`text-sm font-semibold ${theme.accent} mb-2`}>Как читать результат</h5>
                    <div className="space-y-1.5 text-xs">
                      <p className={theme.text}>1. Синастрия показывает устойчивую базу отношений (долгий контур).</p>
                      <p className={theme.text}>2. Транзиты показывают текущую погоду (когда легче договариваться, а когда лучше снизить напряжение).</p>
                      <p className={theme.text}>3. Если база сильная, но транзиты напряжённые: действуйте мягче, откладывайте острые решения.</p>
                      <p className={theme.text}>4. Если база средняя, но транзиты поддерживающие: это окно для укрепления договорённостей и сближения.</p>
                    </div>
                  </div>

                  <div className={`rounded-xl border ${theme.card} p-4`}>
                    <h5 className={`text-sm font-semibold ${theme.accent} mb-3`}>Топ текущих движений (по силе влияния)</h5>
                    <div className="space-y-2">
                      {advancedSummary.top.map((item, idx) => (
                        <div key={`${item.transit}-${item.natal}-${idx}`} className={`rounded-lg border ${theme.card} p-2 text-xs`}>
                          <div className={`font-medium ${theme.header}`}>
                            {pname(item.transit)} {ASPECT_SYMBOLS[item.aspect] || item.aspect} {pname(item.natal)}
                          </div>
                          <div className={`${theme.text} opacity-70`}>
                            orb {item.orb.toFixed(2)}° · интенсивность {item.intensity.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-xl border ${theme.card} p-4`}>
                    <h5 className={`text-sm font-semibold ${theme.accent} mb-1`}>📅 Окна 14 дней</h5>
                    <p className={`text-xs ${theme.text} opacity-60 mb-3`}>
                      Прогноз транзитного фона пары по дням — на основе текущих аспектов и средней скорости планет.
                      Зелёный = хорошо обсуждать важное. Оранжевый = лучше не эскалировать.
                    </p>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {advancedSummary.windowStrip.map((day, idx) => (
                        <button
                          key={idx}
                          onClick={() => setWindowDayIndex(windowDayIndex === idx ? null : idx)}
                          className={`
                            flex-shrink-0 w-12 rounded-lg border text-center py-1.5 transition-all
                            ${windowDayIndex === idx ? 'ring-2 ring-white/40 scale-105' : 'opacity-80 hover:opacity-100'}
                            ${day.tone === 'green'
                              ? 'bg-green-500/20 border-green-500/50 text-green-300'
                              : day.tone === 'orange'
                              ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                              : 'bg-white/5 border-white/15 ' + theme.text}
                          `}
                        >
                          <div className="text-xs font-bold leading-tight">{day.dateLabel.split(' ')[0]}</div>
                          <div className="text-[10px] leading-tight opacity-80">{day.dateLabel.split(' ')[1] ?? ''}</div>
                          <div className="mt-0.5 text-[10px]">
                            {day.tone === 'green' ? '✓' : day.tone === 'orange' ? '!' : '·'}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px] opacity-60">
                      <span className="text-green-400">■ благоприятно</span>
                      <span className="text-orange-400">■ напряжённо</span>
                      <span className={theme.text}>■ нейтрально</span>
                    </div>
                    {windowDayIndex !== null && advancedSummary.windowStrip[windowDayIndex] && (
                      <div className={`mt-3 rounded-lg border p-3 ${theme.card}`}>
                        <div className={`text-xs font-semibold ${theme.header} mb-2`}>
                          {advancedSummary.windowStrip[windowDayIndex].dateLabel} —{' '}
                          {advancedSummary.windowStrip[windowDayIndex].tone === 'green'
                            ? '🟢 Хороший день для диалога'
                            : advancedSummary.windowStrip[windowDayIndex].tone === 'orange'
                            ? '🟠 Лучше не эскалировать'
                            : '⚪ Нейтральный фон'}
                        </div>
                        {advancedSummary.windowStrip[windowDayIndex].aspects.length > 0 ? (
                          <div className="space-y-1">
                            {advancedSummary.windowStrip[windowDayIndex].aspects
                              .sort((a, b) => a.orb - b.orb)
                              .slice(0, 6)
                              .map((asp, i) => (
                                <div key={i} className={`flex items-center gap-1.5 text-[11px] ${theme.text}`}>
                                  <span className={asp.tone === 'green' ? 'text-green-400' : asp.tone === 'orange' ? 'text-orange-400' : 'opacity-60'}>
                                    {asp.tone === 'green' ? '▲' : asp.tone === 'orange' ? '▼' : '●'}
                                  </span>
                                  <span>{pname(asp.transit)} {ASPECT_SYMBOLS[asp.aspect] || asp.aspect} {pname(asp.natal)}</span>
                                  <span className="opacity-50 ml-auto">{asp.orb.toFixed(1)}°</span>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className={`text-xs ${theme.text} opacity-50`}>В этот день крупных аспектов нет.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`rounded-xl border ${theme.card} p-4`}>
                    <h5 className={`text-sm font-semibold ${theme.accent} mb-2`}>Практика на период</h5>
                    <div className="space-y-1.5 text-xs">
                      <p className={theme.text}>• В дни напряжения: обсуждать правила и факты, а не претензии и оценки.</p>
                      <p className={theme.text}>• В дни поддержки: планировать шаги в ключевой сфере пары и фиксировать договорённости письменно.</p>
                      <p className={theme.text}>• Еженедельно: 1 разговор о чувствах, 1 разговор о быте/ресурсах, 1 совместная восстановительная активность.</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className={`rounded-xl border ${theme.card} p-8 text-center`}>
                  <p className={`text-sm ${theme.text} opacity-70`}>
                    Нажмите «Обновить продвинутый анализ», чтобы объединить синастрию с текущими транзитами.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'interaction-engine' && (
            <SynastryInteractionEngine
              birthA={birth}
              birthB={partner}
              synastry={result}
              advancedDate={advancedDate}
              selfTransits={advancedSelfTransits}
              partnerTransits={advancedPartnerTransits}
              compositeChart={compositeChart}
              theme={theme}
            />
          )}

          {/* ── COMPOSITE CHART ── */}
          {tab === 'composite' && compositeChart && (
            <div className="space-y-3">
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <h4 className={`text-sm font-semibold ${theme.header} mb-1`}>Композитная карта</h4>
                <p className={`text-xs ${theme.text} opacity-60`}>
                  Метод мидпоинтов — карта отношений как самостоятельной сущности.
                  Отражает природу и потенциал союза, а не индивидуальные черты партнёров.
                </p>
              </div>
              <div className="flex justify-center">
                <ChartWheel chart={compositeChart} size={440} theme={theme.wheelTheme} />
              </div>
              <PlanetTable chart={compositeChart} theme={theme} />
            </div>
          )}

          {/* ── DAVISON CHART ── */}
          {tab === 'davison' && davisonChart && (
            <div className="space-y-3">
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <h4 className={`text-sm font-semibold ${theme.header} mb-1`}>Карта Дэвисона</h4>
                <p className={`text-xs ${theme.text} opacity-60`}>
                  Реальная карта в реальный момент времени и месте — точка соприкосновения судеб.
                  Дополняет композит и часто точнее описывает внешние обстоятельства союза.
                </p>
              </div>
              <div className="flex justify-center">
                <ChartWheel chart={davisonChart} size={440} theme={theme.wheelTheme} />
              </div>
              <PlanetTable chart={davisonChart} theme={theme} />
            </div>
          )}

          {/* Loading state for charts */}
          {(tab === 'composite' && !compositeChart) || (tab === 'davison' && !davisonChart) ? (
            <div className={`rounded-xl border ${theme.card} p-8 text-center`}>
              <Spin />
              <span className={`text-sm ${theme.text} opacity-60`}>Загрузка карты…</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// ─── Language Toggle ──────────────────────────────────────────────────────────
function LangToggle({ theme }: { theme: typeof chartThemes[ThemeKey] }) {
  const { lang, setLang, tr } = useLang();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
      className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${theme.tabActive}`}
      title={lang === 'en' ? 'Переключить на русский' : 'Switch to English'}
    >
      {tr.langToggle}
    </button>
  );
}

// AstroSummaryBlock is now in its own file: AstroSummaryBlock.tsx (imported above)

// ─── Main Component ───────────────────────────────────────────────────────────
interface ClientPortalProps {
  initialParams?: URLSearchParams;
}

export default function ClientPortal({ initialParams }: ClientPortalProps) {
  const { tr } = useLang();
  const [themeKey, setThemeKey] = useState<ThemeKey>('cosmic');
  const theme = chartThemes[themeKey];
  const transitionSeqRef = React.useRef(0);

  // ─── Auth & people list ───────────────────────────────────────────────────
  const { user, signOut: authSignOut, configured } = useAuth();
  const [people, setPeople] = useState<SavedPerson[]>([]);
  useEffect(() => {
    if (!user || !configured) return;
    return subscribePeople(user.uid, setPeople);
  }, [user, configured]);

  const handleSavePerson = useCallback(async (p: Omit<SavedPerson, 'id'>) => {
    if (!user) return;
    await addPerson(user.uid, p);
  }, [user]);

  const handleDeletePerson = useCallback(async (id: string) => {
    if (!user) return;
    await deletePerson(user.uid, id);
  }, [user]);

  const [birth, setBirth] = useState<BirthInput & { name?: string }>(() => ({
    name:  initialParams?.get('name') || '',
    date:  initialParams?.get('date') || '',
    time:  initialParams?.get('time') || '12:00',
    lat:   parseFloat(initialParams?.get('lat') || '0'),
    lon:   parseFloat(initialParams?.get('lon') || '0'),
    utc:   parseFloat(initialParams?.get('utc') || '0'),
  }));
  // Match birth form name to a saved person for the History tab
  const currentPerson = useMemo(
    () => people.find(p => p.name === birth.name) ?? null,
    [people, birth.name],
  );
  const [activeTab, setActiveTab]= useState<'dashboard'|'natal'|'human-design'|'horoscope'|'synastry'|'analysis'|'jyotish'|'navigation'|'holos'|'numerology'|'asteroids'|'planetary-hours'|'sidereal'|'zodiacal-releasing'|'primary-directions'|'probability'|'gene-keys'|'history'|'daily'|'ingress'|'voc'|'saturn-cycle'|'fixed-stars'|'heliocentric'|'kabbalah-tree'|'planetary-nodes'|'compensatory'|'eclipse-personal'|'ingress-personal'>('dashboard');
  const [humanDesignMode, setHumanDesignMode] = useState<HumanDesignContentMode>('analyst');
  const [natalChart, setNatalChart] = useState<NatalChart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const prevTransitionRef = React.useRef<{ activeTab: string; humanDesignMode: HumanDesignContentMode } | null>(null);
  useEffect(() => {
    const prev = prevTransitionRef.current;
    const next = { activeTab, humanDesignMode };
    if (!prev) {
      prevTransitionRef.current = next;
      return;
    }
    if (prev.activeTab === next.activeTab && prev.humanDesignMode === next.humanDesignMode) {
      return;
    }

    transitionSeqRef.current += 1;
    const snapshot = {
      seq: transitionSeqRef.current,
      from: prev,
      to: next,
      loading,
      isExporting,
      hasNatal: Boolean(natalChart),
      hasError: Boolean(error),
      timestamp: new Date().toISOString(),
    };

    console.info('[runtime-guard] portal-transition', snapshot);
    try {
      (window as Window & { __HOLO_RUNTIME_LOG__?: unknown[] }).__HOLO_RUNTIME_LOG__ ??= [];
      (window as Window & { __HOLO_RUNTIME_LOG__?: unknown[] }).__HOLO_RUNTIME_LOG__!.push(snapshot);
    } catch {
      // Ignore storage errors in restricted browser contexts.
    }

    prevTransitionRef.current = next;
  }, [activeTab, humanDesignMode, loading, isExporting, natalChart, error]);

  const calcNatal = useCallback(async () => {
    if (!birth.date || !birth.time) { setError(tr.dateTimeRequired); return; }
    setLoading(true); setError(null);
    try { setNatalChart(await getNatalChart(birth)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [birth, tr]);

  const { exporting: reportExporting, exportFullReport } = usePdfExport();

  const handleFullReport = useCallback(async (depth: 'brief' | 'full' | 'professional' = 'full') => {
    await exportFullReport(birth, birth.name || 'Клиент', depth);
  }, [exportFullReport, birth]);

  const handleExportAll = useCallback(async () => {
    setIsExporting(true);
    const savedTab = activeTab;
    const titles: Record<string, string> = {
      natal: tr.natalChart, 'human-design': `Human Design (${HD_MODE_LABELS[humanDesignMode]})`, horoscope: '🔮 Гороскоп', synastry: tr.synastry,
      interpretation: tr.interpretation,
    };
    try {
      await downloadTabsPDF(
        (['natal', 'human-design', 'horoscope', 'synastry', 'interpretation'] as const).map(
          k => ({ id: `pdf-section-${k}`, title: titles[k] }),
        ),
        async (id) => {
          const key = id.replace('pdf-section-', '') as typeof activeTab;
          setActiveTab(key);
          // Wait until the requested tab is fully painted before capture.
          await new Promise(r => setTimeout(r, 220));
        },
        `${birth.name ? birth.name.replace(/\s+/g, '-') : 'holo'}-report-${humanDesignMode}.pdf`,
      );
    } finally {
      setIsExporting(false);
      setActiveTab(savedTab);
    }
  }, [activeTab, birth.name, humanDesignMode, tr]);

  const handleExportHumanDesign = useCallback(async () => {
    setIsExporting(true);
    const savedTab = activeTab;
    try {
      await downloadTabsPDF(
        [{ id: 'pdf-section-human-design', title: `Human Design (${HD_MODE_LABELS[humanDesignMode]})` }],
        async () => {
          setActiveTab('human-design');
          await new Promise(r => setTimeout(r, 220));
        },
        `${birth.name ? birth.name.replace(/\s+/g, '-') : 'holo'}-human-design-${humanDesignMode}.pdf`,
      );
    } finally {
      setIsExporting(false);
      setActiveTab(savedTab);
    }
  }, [activeTab, birth.name, humanDesignMode]);

  const tabs = [
    { key: 'dashboard',      icon: Zap,       label: '⚡ Дашборд' },
    { key: 'natal',          icon: Star,      label: tr.natalChart },
    { key: 'horoscope',      icon: Sun,       label: '🔮 Гороскоп' },
    { key: 'synastry',       icon: Heart,     label: tr.synastry },
    { key: 'navigation',     icon: Globe,     label: '🌍 Релокация' },
    { key: 'analysis',        icon: BookOpen,  label: '✦ Анализ' },
    { key: 'human-design',   icon: Layers,    label: 'Human Design' },
    { key: 'jyotish',        icon: Star,      label: 'Джйотиш' },
    { key: 'numerology',     icon: Sparkles,  label: '🔢 Нумерология' },
    { key: 'asteroids',      icon: Star,      label: '⚳ Астероиды' },
    { key: 'planetary-hours', icon: Clock,    label: '⏱ Планет.часы' },
    { key: 'sidereal',            icon: Globe,     label: '🌐 Сидерич.' },
    { key: 'zodiacal-releasing',  icon: Clock,     label: '⏳ Зод.Высв.' },
    { key: 'primary-directions',  icon: Star,      label: '✦ Примарные' },
    { key: 'probability',         icon: Sparkles,  label: '🌀 Вероятн.' },
    { key: 'gene-keys',           icon: Sparkles,  label: '✦ Gene Keys' },
    { key: 'history',             icon: Sparkles,  label: '📋 История' },
    { key: 'daily',               icon: Zap,       label: '📅 День' },
    { key: 'ingress',             icon: Globe,     label: '🌠 Ингрессы' },
    { key: 'voc',                 icon: Clock,     label: '🌙 VoC Луна' },
    { key: 'saturn-cycle',        icon: Clock,     label: '♄ Цикл Сатурна' },
    { key: 'fixed-stars',         icon: Star,      label: '✦ Неп. звёзды' },
    { key: 'heliocentric',        icon: Globe,     label: '☉ Гелиоцентр.' },
    { key: 'kabbalah-tree',       icon: Sparkles,  label: '✡ Каббала' },
    { key: 'planetary-nodes',     icon: Globe,     label: '☊ Планет. узлы' },
    { key: 'compensatory',        icon: Sparkles,  label: '🌿 Компенсация' },
    { key: 'eclipse-personal',     icon: Star,      label: '🌑 Затмения' },
    { key: 'ingress-personal',     icon: Globe,     label: '🌠 Ингрессии·домов' },
    { key: 'holos',               icon: Sparkles,  label: '✦ HOLOS' },
  ] as const;

  return (
    <div className={`relative min-h-screen ${theme.container} transition-all duration-500`}>
      {/* Navbar */}
      <nav className={`sticky top-0 z-10 border-b backdrop-blur-md ${theme.container}`}
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className={`h-6 w-6 ${theme.symbol}`} />
            <span className={`text-lg font-bold font-serif ${theme.header}`}>{tr.appName}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme selector */}
            <div className="flex gap-1">
              {(Object.keys(chartThemes) as ThemeKey[]).map(k => (
                <button key={k} onClick={() => setThemeKey(k)}
                  title={chartThemes[k].name}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${k === themeKey ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{
                    background: k === 'cosmic' ? '#4f46e5' : k === 'ethereal' ? '#d97706'
                              : k === 'vintage' ? '#8b5a2b' : '#06b6d4',
                  }}
                />
              ))}
            </div>
            {/* Language toggle */}
            <LangToggle theme={theme} />
            <Link to="/crm" className={`text-sm ${theme.accent} hover:underline`}>
              {tr.crmLink}
            </Link>
            {/* User menu */}
            {configured && user && (
              <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <UserCircle className={`h-4 w-4 ${theme.text} opacity-50`} />
                <span className={`text-xs ${theme.text} opacity-60 max-w-[120px] truncate hidden sm:block`}>{user.email}</span>
                <button
                  onClick={authSignOut}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors ${theme.tabInactive}`}
                  title="Выйти"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Выйти</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-6">
        <BirthForm
          value={birth}
          onChange={setBirth}
          label={tr.birthData}
          theme={theme}
          people={people}
          onSave={user ? handleSavePerson : undefined}
          onDelete={user ? handleDeletePerson : undefined}
        />

        <div className="flex gap-3 flex-wrap">
          <button onClick={calcNatal} disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme.btn} shadow-lg`}>
            {loading ? <><Spin /><span>{tr.calculating}</span></> : <><Star className="h-4 w-4 inline mr-1.5" /><span>{tr.calcNatal}</span></>}
          </button>
          {natalChart && (
            <button onClick={handleExportAll} disabled={isExporting}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${theme.card} disabled:opacity-50`}>
              {isExporting
                ? <><Spin /><span>{tr.exportPdf}…</span></>
                : <><Download className="h-4 w-4 inline mr-1.5" /><span>{tr.exportPdf}</span></>}
            </button>
          )}
          {birth.date && (
            <button onClick={() => handleFullReport('full')} disabled={reportExporting}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50`}>
              {reportExporting
                ? <><Spin /><span>Генерация…</span></>
                : <><Download className="h-4 w-4 inline mr-1.5" /><span>Полный отчёт PDF</span></>}
            </button>
          )}
          {activeTab === 'human-design' && (
            <button onClick={handleExportHumanDesign} disabled={isExporting}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${theme.card} disabled:opacity-50`}>
              {isExporting
                ? <><Spin /><span>PDF Human Design…</span></>
                : <><Download className="h-4 w-4 inline mr-1.5" /><span>PDF Human Design</span></>}
            </button>
          )}
        </div>

        {error && <Err msg={error} />}

        <div className="flex gap-2 border-b pb-1 overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          {tabs.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(prev => (prev === key ? prev : key))}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border whitespace-nowrap transition-all duration-300 ${key === 'human-design' ? 'ml-6 border-2 border-cyan-400/70 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]' : ''} ${activeTab === key ? theme.tabActive : theme.tabInactive}`}>
              <Icon className="h-4 w-4" /><span>{label}</span>
            </button>
          ))}
        </div>

        <div key={activeTab}>
          {activeTab === 'dashboard' && (
            <div id="pdf-section-dashboard">
              {birth.date && birth.time ? (
                <DashboardView birthData={birth} theme={theme} />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Zap className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите данные рождения для дашборда</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'natal' && (
            <div id="pdf-section-natal" className="space-y-4">
              {natalChart ? (
                <>
                  <div className={`rounded-xl border ${theme.card} p-3 text-xs ${theme.text}`}>
                    <span className={theme.accent}>{tr.chart}: </span>
                    {natalChart.metadata.date} {natalChart.metadata.time} · Lat {natalChart.metadata.lat} / Lon {natalChart.metadata.lon} · UTC {natalChart.metadata.utc > 0 ? '+' : ''}{natalChart.metadata.utc} · {natalChart.metadata.houses_system}
                  </div>
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex justify-center lg:justify-start shrink-0">
                      <ChartWheelResponsive chart={natalChart} size={480} theme={theme.wheelTheme} />
                    </div>
                    <div className="flex-1 space-y-3">
                      <PlanetTable chart={natalChart} theme={theme} />
                      <HouseTable chart={natalChart} theme={theme} />
                    </div>
                  </div>
                  <AspectList aspects={natalChart.aspects} theme={theme} />
                  <ExtraInfo chart={natalChart} theme={theme} />
                  {natalChart.chart_analysis && (
                    <ChartAnalysisSection analysis={natalChart.chart_analysis} />
                  )}
                  {natalChart.fixed_stars && natalChart.fixed_stars.length > 0 && (
                    <FixedStarsBlock stars={natalChart.fixed_stars} />
                  )}
                </>
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Star className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>{tr.enterBirthData}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'human-design' && (
            <div id="pdf-section-human-design">
              <HumanDesignBlock
                birth={birth}
                theme={theme}
                contentMode={humanDesignMode}
                onContentModeChange={setHumanDesignMode}
              />
            </div>
          )}

          {activeTab === 'jyotish' && (
            <div id="pdf-section-jyotish">
              {birth.date && birth.time ? (
                <div className={`rounded-xl border ${theme.card} p-4 md:p-6`}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">✦</span>
                    <h2 className={`text-base font-bold font-serif ${theme.header}`}>Джйотиш — Ведическая астрология</h2>
                  </div>
                  <JyotishBlock birthData={birth} />
                </div>
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Star className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>{tr.enterBirthData}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div id="pdf-section-history">
              {user ? (
                <ClientHistoryPanel uid={user.uid} person={currentPerson} />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <p className={`${theme.text} text-sm`}>Войдите в систему для доступа к истории</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'daily' && (
            <div id="pdf-section-daily">
              {birth.date && birth.time ? (
                <DailyPersonalBlock birthData={birth} />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Zap className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите дату и время рождения для персонального дня</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ingress' && (
            <div id="pdf-section-ingress">
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🌠</span>
                  <h2 className={`text-base font-bold font-serif ${theme.header}`}>Календарь ингрессов планет</h2>
                </div>
                <IngressCalendarBlock />
              </div>
            </div>
          )}

          {activeTab === 'voc' && (
            <div id="pdf-section-voc">
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <VoCWindowsPanel birthData={birth} />
              </div>
            </div>
          )}

          {activeTab === 'saturn-cycle' && (
            <div id="pdf-section-saturn-cycle">
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">♄</span>
                  <h2 className={`text-base font-bold font-serif ${theme.header}`}>Цикл Сатурна</h2>
                </div>
                <SaturnCycleBlock birthData={birth} />
              </div>
            </div>
          )}

          {activeTab === 'fixed-stars' && (
            <div id="pdf-section-fixed-stars">
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">✦</span>
                  <h2 className={`text-base font-bold font-serif ${theme.header}`}>Неподвижные звёзды</h2>
                </div>
                {natalChart?.fixed_stars ? (
                  <FixedStarsBlock stars={natalChart.fixed_stars} />
                ) : (
                  <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                    <Star className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                    <p className={`${theme.text} text-sm`}>Рассчитайте натальную карту для анализа звёзд</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'heliocentric' && (
            <div id="pdf-section-heliocentric">
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">☉</span>
                  <h2 className={`text-base font-bold font-serif ${theme.header}`}>Гелиоцентрическая карта</h2>
                </div>
                <HeliocentricBlock birthData={birth} />
              </div>
            </div>
          )}

          {activeTab === 'kabbalah-tree' && (
            <div id="pdf-section-kabbalah-tree">
              <KabbalahTreeBlock birthData={birth} />
            </div>
          )}

          {activeTab === 'planetary-nodes' && (
            <div id="pdf-section-planetary-nodes">
              <PlanetaryNodesBlock birthData={birth} />
            </div>
          )}

          {activeTab === 'compensatory' && (
            <div id="pdf-section-compensatory">
              <div className={`rounded-xl border ${theme.card} p-4`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🌿</span>
                  <h2 className={`text-base font-bold font-serif ${theme.header}`}>Компенсаторные практики</h2>
                  <span className={`text-xs ${theme.text} opacity-50 ml-auto`}>
                    Три слоя: фон · транзиты · аспекты
                  </span>
                </div>
                <CompensatoryPracticesCard birthData={birth} />
              </div>
            </div>
          )}

          {activeTab === 'eclipse-personal' && (
            <div id="pdf-section-eclipse-personal">
              {birth.date && birth.time ? (
                <EclipsePersonalBlock birth={birth} theme={theme} />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Star className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите дату и время рождения для анализа затмений в натальных домах</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ingress-personal' && (
            <div id="pdf-section-ingress-personal">
              {birth.date && birth.time ? (
                <IngressPersonalBlock birth={birth} theme={theme} />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Globe className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите дату и время рождения для анализа ингрессий</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'holos' && (
            <div id="pdf-section-holos">
              {natalChart ? (
                <HolosBlock chart={natalChart} birthDate={birth.date} />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Sparkles className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Рассчитайте натальную карту чтобы открыть анализ HOLOS</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'numerology' && (
            <div id="pdf-section-numerology">
              {birth.date ? (
                <NumerologyBlock
                  birthData={birth}
                  theme={theme}
                  natalChart={natalChart ?? undefined}
                />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Sparkles className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите дату рождения для нумерологического профиля</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'asteroids' && (
            <div id="pdf-section-asteroids">
              {birth.date && birth.time ? (
                <AsteroidsLilithBlock birthData={birth} theme={theme} />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Star className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите данные рождения для расчёта астероидов и Лилит</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'planetary-hours' && (
            <div id="pdf-section-planetary-hours">
              <PlanetaryHoursBlock
                birthData={{ lat: birth.lat, lon: birth.lon, utc: birth.utc }}
                theme={theme}
              />
            </div>
          )}

          {activeTab === 'sidereal' && (
            <div id="pdf-section-sidereal">
              {birth.date && birth.time ? (
                <SiderealBlock birthData={birth} theme={theme} />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Globe className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите данные рождения для сидерической карты</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'zodiacal-releasing' && (
            <div id="pdf-section-zodiacal-releasing">
              {birth.date && birth.time ? (
                <ZodiacalReleasingBlock
                  birthDate={birth.date}
                  birthTime={birth.time}
                  lat={birth.lat ?? 0}
                  lon={birth.lon ?? 0}
                  utc={birth.utc ?? 0}
                />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Clock className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите данные рождения для Зодиакального Высвобождения</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'primary-directions' && (
            <div id="pdf-section-primary-directions">
              {birth.date && birth.time ? (
                <PrimaryDirectionsBlock
                  birthDate={birth.date}
                  birthTime={birth.time}
                  lat={birth.lat ?? 0}
                  lon={birth.lon ?? 0}
                  utc={birth.utc ?? 0}
                />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Star className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите данные рождения для Примарных Дирекций</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'probability' && (
            <div id="pdf-section-probability">
              {birth.date && birth.time ? (
                <ProbabilityTreeBlock
                  birthDate={birth.date}
                  birthTime={birth.time}
                  lat={birth.lat ?? 0}
                  lon={birth.lon ?? 0}
                  utc={birth.utc ?? 0}
                />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Sparkles className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите данные рождения для Матрицы Вероятностей</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'gene-keys' && (
            <div id="pdf-section-gene-keys">
              {birth.date && birth.time ? (
                <GeneKeysBlock
                  birthDate={birth.date}
                  birthTime={birth.time}
                  lat={birth.lat ?? 0}
                  lon={birth.lon ?? 0}
                  utc={birth.utc ?? 0}
                />
              ) : (
                <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                  <Sparkles className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                  <p className={`${theme.text} text-sm`}>Введите данные рождения для Gene Keys профиля</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'horoscope' && (
            <div id="pdf-section-horoscope">
              <HoroscopeBlock birth={birth} theme={theme} />
            </div>
          )}

          {activeTab === 'synastry' && (
            <div id="pdf-section-synastry">
              {natalChart
                ? <SynastryPanel birth={birth} theme={theme} people={people} />
                : <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                    <Heart className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                    <p className={`${theme.text} text-sm`}>{tr.calcNatalFirst}</p>
                  </div>
              }
            </div>
          )}

          {activeTab === 'navigation' && (
            <div>
              <InteractionRelocationEngine birth={birth} theme={theme} people={people} />
            </div>
          )}

          {activeTab === 'analysis' && (
            <div id="pdf-section-analysis">
              {natalChart
                ? (
                  <div className={`rounded-xl border ${theme.card} p-4`}>
                    <PAReportBlock
                      chart={natalChart}
                      name={birth.name}
                      theme={theme.wheelTheme}
                      birthDate={birth.date}
                    />
                  </div>
                )
                : <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
                    <BookOpen className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-40`} />
                    <p className={`${theme.text} text-sm`}>{tr.calcNatalFirst}</p>
                  </div>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

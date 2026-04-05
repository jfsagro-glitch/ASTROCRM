// ─── Interaction + Relocation Forecast Engine ────────────────────────────────
// Сравнение сценариев: один / с партнёром / на расстоянии по разным локациям.
import React, { useState, useCallback, useMemo } from 'react';
import {
  MapPin, Users, Target, Clock, Zap, ChevronDown, ChevronUp,
  ArrowRight, Star, AlertCircle, Loader2, Globe, Heart,
  Briefcase, Navigation, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  CITIES, GOALS, PARTNER_TYPES, STAY_MODES, SPHERE_LABELS, SPHERE_KEYS,
  REGION_LABELS, SCENARIO_LABELS, PARTNER_TYPE_INTERPS, STAY_EFFECT_TEXT,
  scoreColor, scoreBg, scoreLabel, getGoalInterpretation,
  type CompareResponse, type ScenarioResult,
} from '../data/interactionData';
import {
  compareScenarios, getPersonalForecastInteraction,
  type InteractionPersonInput, type LocationInput,
} from '../services/astrologyService';
import type { BirthInput } from '../types/astro';
import type { SavedPerson } from '../services/peopleService';

// ── Types ─────────────────────────────────────────────────────────────────────

type ScenarioMode = 'alone' | 'with_partner' | 'partner_distance';

interface PartnerData {
  name: string;
  date: string;
  time: string;
  lat: number;
  lon: number;
  utc: number;
  partnerType: string;
  currentLat: number | null;
  currentLon: number | null;
}

type TabKey = 'setup' | 'scenarios' | 'locations' | 'channels' | 'summary';

interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
  wheelTheme: 'dark' | 'light';
}

interface Props {
  birth: BirthInput;
  theme: ThemeLike;
  people?: SavedPerson[];
}

interface SetupPanelProps {
  theme: ThemeLike;
  isDark: boolean;
  partner: PartnerData;
  setPartner: React.Dispatch<React.SetStateAction<PartnerData>>;
  partnerCityName: string;
  setPartnerCityName: (v: string) => void;
  targetCities: Array<{ name: string; lat: number; lon: number }>;
  setTargetCities: React.Dispatch<React.SetStateAction<Array<{ name: string; lat: number; lon: number }>>>;
  goal: string;
  setGoal: (v: string) => void;
  stayDays: number;
  setStayDays: (v: number) => void;
  periodStart: string;
  setPeriodStart: (v: string) => void;
  periodEnd: string;
  setPeriodEnd: (v: string) => void;
  run: () => void;
  loading: boolean;
  people?: SavedPerson[];
}

// ── Mini helpers ──────────────────────────────────────────────────────────────

const Spin = () => <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" />;
const Err = ({ msg }: { msg: string }) => (
  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
    <AlertCircle className="h-4 w-4 shrink-0" />{msg}
  </div>
);

function ScoreBar({ score, color }: { score: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden bg-slate-700/40 w-full">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${score}%`, backgroundColor: color ?? scoreBg(score) }}
      />
    </div>
  );
}

function ScoreBadge({ score, isDark }: { score: number; isDark: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-bold ${scoreColor(score, isDark)}`}>
      {score}
    </span>
  );
}

function ScoreDelta({ base, value, isDark }: { base: number; value: number; isDark: boolean }) {
  const delta = value - base;
  if (Math.abs(delta) < 2) return <span className={`text-xs opacity-50 ${isDark ? 'text-white' : 'text-black'}`}>—</span>;
  return (
    <span className={`text-xs font-bold ${delta > 0
      ? (isDark ? 'text-green-400' : 'text-green-600')
      : (isDark ? 'text-red-400' : 'text-red-500')}`}>
      {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}

// ── City picker ───────────────────────────────────────────────────────────────

function CityPicker({
  label, value, onChange, isDark, theme,
}: {
  label: string;
  value: string;
  onChange: (name: string, lat: number, lon: number, utc: number) => void;
  isDark: boolean;
  theme: ThemeLike;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return CITIES.slice(0, 12);
    return CITIES.filter(c =>
      c.nameRu.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [search]);

  return (
    <div className="relative">
      <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>{label}</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left ${theme.card} ${theme.text}`}
      >
        <MapPin className="h-3.5 w-3.5 opacity-50 shrink-0" />
        <span className="flex-1 truncate">{value || 'Выбрать город...'}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
      </button>
      {open && (
        <div className={`absolute z-50 left-0 right-0 mt-1 rounded-xl border shadow-xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} overflow-hidden`}>
          <div className="p-2 border-b border-slate-700/30">
            <input
              autoFocus
              type="text"
              placeholder="Поиск города..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full px-2 py-1.5 text-xs rounded-lg ${theme.card} ${theme.text} outline-none border-0`}
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {matches.map(city => (
              <button
                key={city.name}
                type="button"
                onClick={() => { onChange(city.nameRu, city.lat, city.lon, city.utc); setOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 text-left`}
              >
                <span className={`font-medium ${theme.header}`}>{city.nameRu}</span>
                <span className={`opacity-50 ${theme.text}`}>{city.country}</span>
                <span className={`ml-auto opacity-40 ${theme.text}`}>UTC{city.utc >= 0 ? '+' : ''}{city.utc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scenario Card ─────────────────────────────────────────────────────────────

function LocationCard({
  loc, baseline, goal, partnerType, activeMode, isDark, theme,
}: {
  loc: ScenarioResult;
  baseline: ScenarioResult;
  goal: string;
  partnerType: string;
  activeMode: ScenarioMode;
  isDark: boolean;
  theme: ThemeLike;
}) {
  const [expanded, setExpanded] = useState(false);
  const score = loc.scores[activeMode];
  const baseScore = baseline.scores[activeMode];
  const spheres = activeMode === 'alone' ? loc.sphere_alone
    : activeMode === 'with_partner' ? loc.sphere_with
    : loc.sphere_distance;
  const through = activeMode === 'alone' ? loc.through_alone
    : activeMode === 'with_partner' ? loc.through_with
    : loc.through_distance;
  const interp = getGoalInterpretation(goal, score, activeMode);
  const goalInfo = GOALS.find(g => g.id === goal);

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${isDark
      ? 'bg-slate-900/60 border-slate-700/60'
      : 'bg-white border-slate-200'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-3.5 w-3.5 opacity-50 shrink-0" />
            <span className={`font-bold text-sm ${theme.header} truncate`}>{loc.location}</span>
            {loc.distance_km > 0 && (
              <span className={`text-[10px] opacity-50 ${theme.text}`}>{loc.distance_km.toLocaleString()} км</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ScoreBar score={score} color={goalInfo?.sphereColor} />
            <ScoreBadge score={score} isDark={isDark} />
            <ScoreDelta base={baseScore} value={score} isDark={isDark} />
          </div>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <div className={`text-xs ${theme.text} opacity-60`}>↑ {loc.asc_shift}° ASC</div>
          <div className={`text-xs ${theme.text} opacity-60`}>↑ {loc.mc_shift}° MC</div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 opacity-40 shrink-0" /> : <ChevronDown className="h-4 w-4 opacity-40 shrink-0" />}
      </button>

      {expanded && (
        <div className={`px-4 pb-4 space-y-4 border-t ${isDark ? 'border-slate-700/40' : 'border-slate-100'}`}>
          {/* Interpretation */}
          <p className={`text-xs leading-relaxed pt-3 ${theme.text}`}>{interp}</p>

          {/* Sphere scores */}
          <div>
            <p className={`text-xs font-semibold ${theme.accent} mb-2`}>Сферы жизни в этой локации:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {SPHERE_KEYS.map(sk => {
                const sv = spheres[sk] ?? 50;
                const si = SPHERE_LABELS[sk];
                return (
                  <div key={sk} className="flex items-center gap-2">
                    <span className="text-sm w-5 text-center">{si.icon}</span>
                    <span className={`text-[11px] flex-1 ${theme.text} opacity-70`}>{si.label}</span>
                    <div className="w-16">
                      <ScoreBar score={sv} color={si.color} />
                    </div>
                    <span className={`text-[10px] font-mono font-bold w-6 text-right`} style={{ color: si.color }}>{sv}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key planet activations */}
          {loc.key_planet_activations.length > 0 && (
            <div>
              <p className={`text-xs font-semibold ${theme.accent} mb-2`}>Планеты на углах карты:</p>
              <div className="flex flex-wrap gap-1.5">
                {loc.key_planet_activations.map((ka, i) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded-lg border ${isDark ? 'bg-indigo-900/20 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
                    {ka.planet} на {ka.angle} ({ka.orb}°)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Through whom what comes/leaves */}
          {through.comes.length > 0 && (
            <div className={`rounded-lg p-3 ${isDark ? 'bg-green-900/15 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
              <p className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-green-400' : 'text-green-700'}`}>✅ Через это место может прийти:</p>
              {through.comes.map((c, i) => <p key={i} className={`text-xs ${theme.text}`}>• {c}</p>)}
            </div>
          )}
          {through.leaves.length > 0 && (
            <div className={`rounded-lg p-3 ${isDark ? 'bg-orange-900/15 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
              <p className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>⬅️ Через это место может уйти:</p>
              {through.leaves.map((l, i) => <p key={i} className={`text-xs ${theme.text}`}>• {l}</p>)}
            </div>
          )}

          {/* All scenarios scores for this location */}
          <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
            <p className={`text-xs font-semibold ${theme.accent} mb-2`}>Все сценарии в этой локации:</p>
            <div className="space-y-1.5">
              {(['alone', 'with_partner', 'partner_distance'] as ScenarioMode[]).map(mode => {
                const sc = mode === 'alone' ? loc.scores.alone : mode === 'with_partner' ? loc.scores.with_partner : loc.scores.partner_distance;
                const si = SCENARIO_LABELS[mode];
                return (
                  <div key={mode} className="flex items-center gap-2">
                    <span className="text-sm w-5">{si.icon}</span>
                    <span className={`text-xs flex-1 ${theme.text} opacity-70`}>{si.label}</span>
                    <div className="w-20">
                      <ScoreBar score={sc} />
                    </div>
                    <ScoreBadge score={sc} isDark={isDark} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Partner type influence */}
          {activeMode !== 'alone' && (
            <div className={`rounded-lg p-3 ${isDark ? 'bg-purple-900/15 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
              <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                Через партнёра в этой локации:
              </p>
              <p className={`text-xs ${theme.text} opacity-80`}>
                {PARTNER_TYPE_INTERPS[partnerType]?.arrive ?? 'Взаимодействие через партнёра формирует уникальный контекст места.'}
              </p>
              {loc.synastry_percent > 0 && (
                <p className={`text-[10px] mt-1 ${theme.text} opacity-50`}>
                  Синастрия: {loc.synastry_percent}%
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Scenario Comparison Table ─────────────────────────────────────────────────

function ScenariosTab({
  data, isDark, theme,
}: { data: CompareResponse; isDark: boolean; theme: ThemeLike }) {
  const allLocs = data.all_locations;
  const goalInfo = GOALS.find(g => g.id === data.goal);
  const modes: ScenarioMode[] = ['alone', 'with_partner', 'partner_distance'];

  return (
    <div className="space-y-4">
      {/* Goal + Stay info */}
      <div className={`rounded-xl border ${theme.card} p-4 flex items-start gap-3`}>
        <span className="text-3xl">{goalInfo?.icon ?? '🎯'}</span>
        <div>
          <p className={`font-bold text-sm ${theme.header}`}>Цель: {goalInfo?.label ?? data.goal}</p>
          <p className={`text-xs ${theme.text} opacity-70 mt-0.5`}>{goalInfo?.description}</p>
          <p className={`text-xs ${theme.accent} mt-1`}>{goalInfo?.hint}</p>
        </div>
      </div>

      {/* Comparison table */}
      <div className={`rounded-xl border ${theme.card} overflow-hidden`}>
        <div className={`px-4 py-2 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
          <p className={`text-xs font-semibold ${theme.accent}`}>📊 Сравнение по сценариям</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={isDark ? 'bg-slate-800/60' : 'bg-slate-50'}>
                <th className={`text-left px-4 py-2.5 font-semibold ${theme.text} opacity-70`}>Локация</th>
                {modes.map(m => (
                  <th key={m} className={`text-center px-3 py-2.5 font-semibold ${theme.text} opacity-70`}>
                    {SCENARIO_LABELS[m].icon} {SCENARIO_LABELS[m].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allLocs.map((loc, i) => (
                <tr
                  key={loc.location}
                  className={`border-t ${isDark ? 'border-slate-700/30' : 'border-slate-100'} ${i === 0 ? (isDark ? 'bg-slate-800/30' : 'bg-slate-50/50') : ''}`}
                >
                  <td className={`px-4 py-2.5 font-medium ${theme.header}`}>
                    {i === 0 ? '📍 ' : ''}{loc.location}
                    {i === 0 && <span className={`ml-1 text-[10px] opacity-50 ${theme.text}`}>(базовая)</span>}
                  </td>
                  {modes.map(m => {
                    const sc = m === 'alone' ? loc.scores.alone : m === 'with_partner' ? loc.scores.with_partner : loc.scores.partner_distance;
                    const base = m === 'alone' ? allLocs[0].scores.alone : m === 'with_partner' ? allLocs[0].scores.with_partner : allLocs[0].scores.partner_distance;
                    return (
                      <td key={m} className="px-3 py-2.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <ScoreBadge score={sc} isDark={isDark} />
                          {i > 0 && <ScoreDelta base={base} value={sc} isDark={isDark} />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best recommendation */}
      {data.recommendation && (
        <div className={`rounded-xl border p-4 ${isDark ? 'bg-amber-900/15 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            <Star className="h-4 w-4" />
            Рекомендуемая локация: {data.recommendation}
          </p>
          <p className={`text-xs mt-1 ${theme.text} opacity-70`}>
            Наивысший совокупный потенциал с учётом цели «{goalInfo?.label}» и взаимодействия с партнёром.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Locations Detail Tab ──────────────────────────────────────────────────────

function LocationsTab({
  data, isDark, theme,
}: { data: CompareResponse; isDark: boolean; theme: ThemeLike }) {
  const [activeMode, setActiveMode] = useState<ScenarioMode>('with_partner');

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-1.5 flex-wrap">
        {(['alone', 'with_partner', 'partner_distance'] as ScenarioMode[]).map(m => (
          <button
            key={m}
            onClick={() => setActiveMode(m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all ${activeMode === m ? theme.tabActive : theme.tabInactive}`}
          >
            <span>{SCENARIO_LABELS[m].icon}</span>
            <span>{SCENARIO_LABELS[m].label}</span>
          </button>
        ))}
      </div>
      <p className={`text-xs ${theme.text} opacity-60`}>{SCENARIO_LABELS[activeMode].desc}</p>

      {/* Baseline */}
      <LocationCard
        loc={data.baseline}
        baseline={data.baseline}
        goal={data.goal}
        partnerType={data.partner_type}
        activeMode={activeMode}
        isDark={isDark}
        theme={theme}
      />

      {/* Ranked locations */}
      {[...data.locations]
        .sort((a, b) => {
          const sa = activeMode === 'alone' ? a.scores.alone : activeMode === 'with_partner' ? a.scores.with_partner : a.scores.partner_distance;
          const sb = activeMode === 'alone' ? b.scores.alone : activeMode === 'with_partner' ? b.scores.with_partner : b.scores.partner_distance;
          return sb - sa;
        })
        .map((loc, i) => (
          <div key={loc.location} className="relative">
            {i === 0 && (
              <div className={`absolute -top-1 -right-1 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-amber-500 text-slate-950' : 'bg-amber-400 text-white'}`}>
                ★ №1
              </div>
            )}
            <LocationCard
              loc={loc}
              baseline={data.baseline}
              goal={data.goal}
              partnerType={data.partner_type}
              activeMode={activeMode}
              isDark={isDark}
              theme={theme}
            />
          </div>
        ))}
    </div>
  );
}

// ── Channels Tab ──────────────────────────────────────────────────────────────

function ChannelsTab({
  channels, isDark, theme,
}: {
  channels: Array<Record<string, unknown>>;
  isDark: boolean;
  theme: ThemeLike;
}) {
  const [filter, setFilter] = useState<'all' | 'love' | 'project' | 'conflict'>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return channels.slice(0, 20);
    const loveWords = ['love', 'emotional'];
    const projWords  = ['project', 'money', 'decisions'];
    const confWords  = ['conflict'];
    return channels.filter(c => {
      const t = String(c.topic ?? '');
      if (filter === 'love') return loveWords.some(w => t.includes(w));
      if (filter === 'project') return projWords.some(w => t.includes(w));
      if (filter === 'conflict') return confWords.some(w => t.includes(w));
      return true;
    }).slice(0, 20);
  }, [channels, filter]);

  const TOPIC_ICON: Record<string, string> = {
    love: '❤️', project: '💼', money: '💰', conflict: '⚡',
    emotional_state: '🌊', decisions: '🔀',
  };

  if (channels.length === 0) return (
    <div className={`text-center py-8 ${theme.text} opacity-50 text-sm`}>
      Каналы влияния появятся после расчёта взаимодействия
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {(['all', 'love', 'project', 'conflict'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-xs rounded-full border ${filter === f ? theme.tabActive : theme.tabInactive}`}>
            {f === 'all' ? '🌐 Все' : f === 'love' ? '❤️ Любовь' : f === 'project' ? '💼 Работа' : '⚡ Конфликт'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((ch, i) => {
          const prob = Math.round((ch.realization_probability as number) * 100);
          const active = ch.active_now as boolean;
          const topic = String(ch.topic ?? 'emotional_state');
          return (
            <div key={String(ch.id ?? i)} className={`rounded-xl border p-3 ${isDark ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">{TOPIC_ICON[topic] ?? '●'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold ${theme.header}`}>
                      {String(ch.source_point_in_B ?? ch.entry_point_in_A ?? 'B')} → {String(ch.entry_point_in_A ?? '')}
                    </span>
                    {active && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isDark ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-600 border border-green-200'}`}>
                        АКТИВЕН
                      </span>
                    )}
                    {ch.entry_house_in_A != null && (
                      <span className={`text-[10px] opacity-50 ${theme.text}`}>Дом {String(ch.entry_house_in_A)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-700/30">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${prob}%`,
                          backgroundColor: prob >= 65 ? '#22c55e' : prob >= 45 ? '#eab308' : '#ef4444',
                        }}
                      />
                    </div>
                    <span className={`text-[11px] font-mono font-bold ${theme.accent} shrink-0`}>{prob}%</span>
                    <span className={`text-[10px] ${theme.text} opacity-50 shrink-0`}>×{((ch.transit_amplifier as number) ?? 1).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Summary Tab ───────────────────────────────────────────────────────────────

function SummaryTab({
  data, forecastResult, partnerType, stayDays, isDark, theme,
}: {
  data: CompareResponse;
  forecastResult: Record<string, unknown> | null;
  partnerType: string;
  stayDays: number;
  isDark: boolean;
  theme: ThemeLike;
}) {
  const stayMode = STAY_MODES.find(s => s.days <= stayDays && stayDays <= s.days * 3) ?? STAY_MODES[1];
  const ptInfo = PARTNER_TYPES.find(p => p.id === partnerType);
  const goalInfo = GOALS.find(g => g.id === data.goal);
  const best = data.locations[0];

  const canDo = forecastResult?.recommendations
    ? (forecastResult.recommendations as { can_do?: string[] }).can_do ?? []
    : [];
  const avoid = forecastResult?.recommendations
    ? (forecastResult.recommendations as { avoid?: string[] }).avoid ?? []
    : [];
  const comesB: string[] = (forecastResult?.through_b_may_come as string[] | null) ?? [];
  const leavesB: string[] = (forecastResult?.through_b_may_leave as string[] | null) ?? [];

  return (
    <div className="space-y-4">
      {/* Decision matrix */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <h4 className={`font-bold text-sm ${theme.header} mb-3 flex items-center gap-2`}>
          <Target className="h-4 w-4" /> Матрица решений
        </h4>
        <div className={`overflow-x-auto rounded-lg border ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <table className="w-full text-xs">
            <thead className={isDark ? 'bg-slate-800/60' : 'bg-slate-50'}>
              <tr>
                <th className={`text-left px-3 py-2 ${theme.text} opacity-60`}>Сценарий</th>
                <th className={`text-center px-2 py-2 ${theme.text} opacity-60`}>Базово</th>
                {data.locations.slice(0, 3).map(l => (
                  <th key={l.location} className={`text-center px-2 py-2 ${theme.text} opacity-60`}>{l.location}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['alone', 'with_partner', 'partner_distance'] as ScenarioMode[]).map(m => (
                <tr key={m} className={`border-t ${isDark ? 'border-slate-700/30' : 'border-slate-100'}`}>
                  <td className={`px-3 py-2 ${theme.text}`}>
                    {SCENARIO_LABELS[m].icon} {SCENARIO_LABELS[m].label}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <ScoreBadge score={data.baseline.scores[m]} isDark={isDark} />
                  </td>
                  {data.locations.slice(0, 3).map(l => (
                    <td key={l.location} className="px-2 py-2 text-center">
                      <ScoreBadge score={l.scores[m]} isDark={isDark} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Through B */}
      {(comesB.length > 0 || leavesB.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {comesB.length > 0 && (
            <div className={`rounded-xl border p-4 ${isDark ? 'bg-green-900/15 border-green-500/25' : 'bg-green-50 border-green-200'}`}>
              <p className={`font-semibold text-sm mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                ✅ Через {ptInfo?.label ?? 'партнёра'} может прийти:
              </p>
              {comesB.map((s, i) => <p key={i} className={`text-xs ${theme.text} mb-1`}>• {s}</p>)}
            </div>
          )}
          {leavesB.length > 0 && (
            <div className={`rounded-xl border p-4 ${isDark ? 'bg-orange-900/15 border-orange-500/25' : 'bg-orange-50 border-orange-200'}`}>
              <p className={`font-semibold text-sm mb-2 ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                ⬅️ Через {ptInfo?.label ?? 'партнёра'} может уйти:
              </p>
              {leavesB.map((s, i) => <p key={i} className={`text-xs ${theme.text} mb-1`}>• {s}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Stay effect */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <p className={`font-semibold text-xs ${theme.accent} mb-1`}>
          {stayMode.icon} Эффект длительности: {stayMode.label}
        </p>
        <p className={`text-xs ${theme.text} leading-relaxed`}>{STAY_EFFECT_TEXT[stayMode.id]}</p>
      </div>

      {/* Best city */}
      {best && (
        <div className={`rounded-xl border ${isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'} p-4`}>
          <p className={`font-bold text-sm mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
            🌟 Лучшая локация для цели «{goalInfo?.label}»:
          </p>
          <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{best.location}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className={`text-sm ${theme.text}`}>Один: <b>{best.scores.alone}</b></span>
            <span className={`text-sm ${theme.text}`}>С партнёром: <b>{best.scores.with_partner}</b></span>
            <span className={`text-sm ${theme.text}`}>На расстоянии: <b>{best.scores.partner_distance}</b></span>
          </div>
        </div>
      )}

      {/* Can do / Avoid */}
      {(canDo.length > 0 || avoid.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {canDo.length > 0 && (
            <div className={`rounded-xl border ${theme.card} p-3`}>
              <p className={`text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-700'} mb-2`}>✅ Можно делать:</p>
              {canDo.map((s, i) => <p key={i} className={`text-xs ${theme.text} mb-1`}>• {s}</p>)}
            </div>
          )}
          {avoid.length > 0 && (
            <div className={`rounded-xl border ${theme.card} p-3`}>
              <p className={`text-xs font-semibold text-orange-400 mb-2`}>⛔ Стоит избегать:</p>
              {avoid.map((s, i) => <p key={i} className={`text-xs ${theme.text} mb-1`}>• {s}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SETUP PANEL (external component — prevents focus loss on re-render) ───────

function SetupPanel({
  theme, isDark, partner, setPartner, partnerCityName, setPartnerCityName,
  targetCities, setTargetCities, goal, setGoal, stayDays, setStayDays,
  periodStart, setPeriodStart, periodEnd, setPeriodEnd, run, loading, people,
}: SetupPanelProps) {
  return (
    <div className="space-y-5">
      {/* Partner block */}
      <div className={`rounded-xl border ${theme.card} p-4 space-y-4`}>
        <h4 className={`font-bold text-sm ${theme.header} flex items-center gap-2`}>
          <Users className="h-4 w-4" /> Партнёр / второй человек
        </h4>

        {/* Partner type */}
        <div>
          <label className={`text-xs ${theme.text} opacity-60 mb-2 block`}>Тип отношений</label>
          <div className="flex flex-wrap gap-1.5">
            {PARTNER_TYPES.map(pt => (
              <button
                key={pt.id}
                onClick={() => setPartner(p => ({ ...p, partnerType: pt.id }))}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-all ${partner.partnerType === pt.id ? theme.tabActive : theme.tabInactive}`}
              >
                <span>{pt.icon}</span><span>{pt.label}</span>
              </button>
            ))}
          </div>
          <div className={`text-[11px] mt-1.5 ${theme.text} opacity-50`}>
            {PARTNER_TYPES.find(p => p.id === partner.partnerType)?.description}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Name field with saved people picker */}
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>Имя партнёра</label>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Имя (необязательно)"
                value={partner.name}
                onChange={e => setPartner(p => ({ ...p, name: e.target.value }))}
                className={`flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm ${theme.card} ${theme.text}`}
              />
              {people && people.length > 0 && (
                <select
                  title="Выбрать сохранённого пользователя"
                  defaultValue=""
                  onChange={e => {
                    const person = people.find(x => x.id === e.target.value);
                    if (person) setPartner(p => ({
                      ...p,
                      name: person.name,
                      date: person.date,
                      time: person.time,
                      lat: person.lat,
                      lon: person.lon,
                      utc: person.utc,
                    }));
                    e.target.value = '';
                  }}
                  className={`w-8 px-0 py-2 rounded-lg border text-sm ${theme.card} ${theme.text} cursor-pointer`}
                  style={{ appearance: 'auto' }}
                >
                  <option value="" disabled>▾</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>Дата рождения</label>
            <input
              type="date"
              value={partner.date}
              onChange={e => setPartner(p => ({ ...p, date: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${theme.card} ${theme.text}`}
            />
          </div>
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>Время рождения</label>
            <input
              type="time"
              value={partner.time}
              onChange={e => setPartner(p => ({ ...p, time: e.target.value }))}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${theme.card} ${theme.text}`}
            />
          </div>
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>UTC рождения</label>
            <input
              type="number" step="0.5" min="-12" max="14"
              value={partner.utc}
              onChange={e => setPartner(p => ({ ...p, utc: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${theme.card} ${theme.text}`}
            />
          </div>
        </div>

        {/* Partner's natal city */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <CityPicker
              label="Город рождения партнёра"
              value={partnerCityName}
              onChange={(name, lat, lon, utc) => {
                setPartnerCityName(name);
                setPartner(p => ({ ...p, lat, lon, utc }));
              }}
              isDark={isDark}
              theme={theme}
            />
          </div>
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>Широта</label>
            <input type="number" step="0.001" value={partner.lat}
              onChange={e => setPartner(p => ({ ...p, lat: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${theme.card} ${theme.text}`}
            />
          </div>
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>Долгота</label>
            <input type="number" step="0.001" value={partner.lon}
              onChange={e => setPartner(p => ({ ...p, lon: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${theme.card} ${theme.text}`}
            />
          </div>
        </div>
      </div>

      {/* Target locations */}
      <div className={`rounded-xl border ${theme.card} p-4 space-y-3`}>
        <div className="flex items-center justify-between">
          <h4 className={`font-bold text-sm ${theme.header} flex items-center gap-2`}>
            <Globe className="h-4 w-4" /> Целевые локации (до 5)
          </h4>
          {targetCities.length < 5 && (
            <button
              onClick={() => setTargetCities(c => [...c, { name: '', lat: 0, lon: 0 }])}
              className={`text-xs px-2.5 py-1 rounded-full border ${theme.tabInactive}`}
            >
              + Добавить
            </button>
          )}
        </div>
        {targetCities.length === 0 && (
          <div className={`text-xs ${theme.text} opacity-50`}>
            Добавьте города для сравнения. Без них расчёт покажет только базовую локацию.
          </div>
        )}
        {targetCities.map((city, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1">
              <CityPicker
                label={`Город ${i + 1}`}
                value={city.name}
                onChange={(name, lat, lon) => {
                  setTargetCities(c => c.map((x, j) => j === i ? { name, lat, lon } : x));
                }}
                isDark={isDark}
                theme={theme}
              />
            </div>
            <button
              onClick={() => setTargetCities(c => c.filter((_, j) => j !== i))}
              className="mb-0.5 p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Quick city presets */}
        <div>
          <div className={`text-[11px] ${theme.text} opacity-50 mb-1.5`}>Быстро добавить:</div>
          <div className="flex flex-wrap gap-1">
            {['Белград', 'Берлин', 'Тбилиси', 'Стамбул', 'Дубай', 'Бали', 'Лиссабон', 'Барселона'].map(cn => {
              const city = CITIES.find(c => c.nameRu === cn);
              if (!city) return null;
              const added = targetCities.some(c => c.name === cn);
              return (
                <button
                  key={cn}
                  disabled={added || targetCities.length >= 5}
                  onClick={() => setTargetCities(c => [...c, { name: cn, lat: city.lat, lon: city.lon }])}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${added ? 'opacity-30' : theme.tabInactive}`}
                >
                  {cn}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Goal + Stay */}
      <div className={`rounded-xl border ${theme.card} p-4 space-y-4`}>
        <h4 className={`font-bold text-sm ${theme.header} flex items-center gap-2`}>
          <Target className="h-4 w-4" /> Цель и длительность
        </h4>
        <div>
          <label className={`text-xs ${theme.text} opacity-60 mb-2 block`}>Главная цель</label>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map(g => (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-all ${goal === g.id ? theme.tabActive : theme.tabInactive}`}
              >
                <span>{g.icon}</span><span>{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={`text-xs ${theme.text} opacity-60 mb-2 block`}>Длительность пребывания</label>
          <div className="flex flex-wrap gap-1.5">
            {STAY_MODES.map(sm => (
              <button
                key={sm.id}
                onClick={() => setStayDays(sm.days)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-all ${stayDays === sm.days ? theme.tabActive : theme.tabInactive}`}
              >
                <span>{sm.icon}</span><span>{sm.label}</span>
              </button>
            ))}
          </div>
          <div className={`text-[11px] mt-1.5 ${theme.text} opacity-50`}>
            {STAY_MODES.find(s => s.days === stayDays)?.effect}
          </div>
        </div>

        {/* Period */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>Период с</label>
            <input type="date" value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${theme.card} ${theme.text}`}
            />
          </div>
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>Период по</label>
            <input type="date" value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${theme.card} ${theme.text}`}
            />
          </div>
        </div>
      </div>

      {/* Calculate button */}
      <button
        onClick={run}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${theme.btn}`}
      >
        {loading ? <><Spin />Вычисляю сценарии...</> : <><Navigation className="h-4 w-4" />Рассчитать астро-навигацию</>}
      </button>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'setup',     icon: '⚙️', label: 'Настройка' },
  { key: 'scenarios', icon: '📊', label: 'Сценарии' },
  { key: 'locations', icon: '🌍', label: 'Локации' },
  { key: 'channels',  icon: '📡', label: 'Каналы' },
  { key: 'summary',   icon: '📋', label: 'Сводка' },
];

const DEFAULT_PARTNER: PartnerData = {
  name: '',
  date: '1990-01-01',
  time: '12:00',
  lat: 55.7558,
  lon: 37.6173,
  utc: 3,
  partnerType: 'romantic',
  currentLat: null,
  currentLon: null,
};

export default function InteractionRelocationEngine({ birth, theme, people }: Props) {
  const isDark = theme.wheelTheme === 'dark';

  // ── State ──
  const [tab, setTab]               = useState<TabKey>('setup');
  const [partner, setPartner]       = useState<PartnerData>(DEFAULT_PARTNER);
  const [targetCities, setTargetCities] = useState<Array<{ name: string; lat: number; lon: number }>>([]);
  const [goal, setGoal]             = useState('love');
  const [stayDays, setStayDays]     = useState(90);
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd]   = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [result, setResult]         = useState<CompareResponse | null>(null);
  const [forecastResult, setForecastResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Partner city picker state ──
  const [partnerCityName, setPartnerCityName] = useState('Москва');

  // ── Helpers ──
  const pInput = useCallback((): InteractionPersonInput => ({
    date: birth.date, time: birth.time, lat: birth.lat, lon: birth.lon, utc: birth.utc,
    name: 'Я', houses: 'placidus', julian: false,
  }), [birth]);

  const bInput = useCallback((): InteractionPersonInput => ({
    date: partner.date, time: partner.time, lat: partner.lat, lon: partner.lon, utc: partner.utc,
    name: partner.name || 'Партнёр', houses: 'placidus', julian: false,
    current_lat: partner.currentLat ?? undefined,
    current_lon: partner.currentLon ?? undefined,
  }), [partner]);

  const run = useCallback(async () => {
    if (!partner.date) { setError('Укажите данные партнёра'); return; }
    setLoading(true); setError(null); setResult(null); setForecastResult(null);
    try {
      const locs: LocationInput[] = targetCities.map(c => ({ name: c.name, lat: c.lat, lon: c.lon }));
      const [scenRes, forecastRes] = await Promise.allSettled([
        compareScenarios(pInput(), bInput(), periodStart, periodEnd, locs, goal, stayDays, partner.partnerType),
        getPersonalForecastInteraction(pInput(), bInput(), periodStart, periodEnd),
      ]);
      if (scenRes.status === 'fulfilled') setResult(scenRes.value as CompareResponse);
      else throw new Error((scenRes.reason as Error).message);
      if (forecastRes.status === 'fulfilled') setForecastResult(forecastRes.value as Record<string, unknown>);
      setTab('scenarios');
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [partner, targetCities, goal, stayDays, periodStart, periodEnd, pInput, bInput]);

  const channels = useMemo(
    () => (forecastResult?.channels as Array<Record<string, unknown>> | null) ?? [],
    [forecastResult],
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            disabled={t.key !== 'setup' && !result}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border font-medium transition-all disabled:opacity-30 ${tab === t.key ? theme.tabActive : theme.tabInactive}`}
          >
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {error && <Err msg={error} />}

      {tab === 'setup' && (
        <SetupPanel
          theme={theme}
          isDark={isDark}
          partner={partner}
          setPartner={setPartner}
          partnerCityName={partnerCityName}
          setPartnerCityName={setPartnerCityName}
          targetCities={targetCities}
          setTargetCities={setTargetCities}
          goal={goal}
          setGoal={setGoal}
          stayDays={stayDays}
          setStayDays={setStayDays}
          periodStart={periodStart}
          setPeriodStart={setPeriodStart}
          periodEnd={periodEnd}
          setPeriodEnd={setPeriodEnd}
          run={run}
          loading={loading}
          people={people}
        />
      )}

      {tab === 'scenarios' && result && (
        <ScenariosTab data={result} isDark={isDark} theme={theme} />
      )}

      {tab === 'locations' && result && (
        <LocationsTab data={result} isDark={isDark} theme={theme} />
      )}

      {tab === 'channels' && (
        <ChannelsTab channels={channels} isDark={isDark} theme={theme} />
      )}

      {tab === 'summary' && result && (
        <SummaryTab
          data={result}
          forecastResult={forecastResult}
          partnerType={partner.partnerType}
          stayDays={stayDays}
          isDark={isDark}
          theme={theme}
        />
      )}
    </div>
  );
}

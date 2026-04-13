// ─── Interaction + Relocation Forecast Engine ────────────────────────────────
// Сравнение сценариев: один / с партнёром / на расстоянии по разным локациям.
import React, { useState, useCallback, useMemo } from 'react';
import {
  MapPin, Users, Target, Clock, Zap, ChevronDown, ChevronUp,
  ArrowRight, Star, AlertCircle, Loader2, Globe, Heart,
  Briefcase, Navigation, ChevronLeft, ChevronRight,
} from 'lucide-react';
import ChartWheel from './ChartWheel';
import {
  CITIES, GOALS, PARTNER_TYPES, STAY_MODES, SPHERE_LABELS, SPHERE_KEYS,
  REGION_LABELS, SCENARIO_LABELS, PARTNER_TYPE_INTERPS, STAY_EFFECT_TEXT,
  scoreColor, scoreBg, scoreLabel, getGoalInterpretation,
  rankCitiesLocally, computeLocalCityScores, SPHERE_STAY_ADVICE, CITY_SPHERE_BIAS,
  buildNatalSnapshot, buildTransitSnapshot,
  type CompareResponse, type ScenarioResult, type LocalCityScore,
  type NatalSnapshot, type TransitSnapshot, type AcgHit,
} from '../data/interactionData';
import { getNatalChart, getTransits, getRelocatedChart } from '../services/astrologyService';
import {
  compareScenarios, getPersonalForecastInteraction,
  type InteractionPersonInput, type LocationInput,
} from '../services/astrologyService';
import type { BirthInput, NatalChart } from '../types/astro';
import { SIGN_COLORS } from '../types/astro';
import type { SavedPerson } from '../services/peopleService';
import DateSegmentInput from './DateSegmentInput';

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

type TabKey = 'map' | 'setup' | 'explore' | 'scenarios' | 'locations' | 'channels' | 'summary';

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
              <p className={`text-xs font-semibold ${theme.accent} mb-2`}>🗺 Планеты на углах карты (ACG):</p>
              <div className="space-y-1.5">
                {loc.key_planet_activations.map((ka, i) => {
                  // planet_key is English (sun/moon/…) for ACG lookup; fallback to Russian→English map
                  const RU_TO_EN: Record<string, string> = {
                    'солнце':'sun','луна':'moon','венера':'venus','марс':'mars',
                    'юпитер':'jupiter','сатурн':'saturn','уран':'uranus',
                    'нептун':'neptune','плутон':'pluto','хирон':'chiron',
                    'лилит':'lilith','сев.узел':'node',
                  };
                  const planetKey = (ka as { planet_key?: string }).planet_key
                    ?? RU_TO_EN[ka.planet.toLowerCase()]
                    ?? ka.planet.toLowerCase();
                  const kaInterp = getAcgInterp(planetKey, ka.angle.toUpperCase());
                  const isMalefic = ['mars','saturn','pluto'].includes(planetKey);
                  const kaSign = (ka as { sign?: string }).sign;
                  return (
                    <div key={i} className={`rounded-lg p-2.5 ${isMalefic
                      ? (isDark ? 'bg-orange-900/15 border border-orange-500/20' : 'bg-orange-50 border border-orange-100')
                      : (isDark ? 'bg-indigo-900/15 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100')}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-semibold ${isMalefic
                          ? (isDark ? 'text-orange-300' : 'text-orange-700')
                          : (isDark ? 'text-indigo-300' : 'text-indigo-700')}`}>
                          {isMalefic ? '⚠️ ' : '⭐ '}{ka.planet}{kaSign ? ` в ${kaSign}` : ''} / {ka.angle}
                        </span>
                        <span className={`text-[10px] ${theme.text} opacity-40`}>{ka.orb}° орбис</span>
                      </div>
                      {kaInterp && (
                        <p className={`text-[11px] leading-relaxed ${theme.text} opacity-65`}>{kaInterp}</p>
                      )}
                    </div>
                  );
                })}
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

          {/* Stay period advice */}
          {(SPHERE_STAY_ADVICE[goal] ?? []).length > 0 && (
            <div>
              <p className={`text-xs font-semibold ${theme.accent} mb-2`}>⏱ Оптимальные периоды пребывания для цели «{goalInfo?.label}»:</p>
              <div className="space-y-1.5">
                {(SPHERE_STAY_ADVICE[goal] ?? []).map((a, i) => (
                  <div key={i} className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold ${theme.header}`}>{a.label}</span>
                      <span className={`text-[10px] px-1.5 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>{a.planetaryCycle}</span>
                    </div>
                    <p className={`text-[11px] ${theme.text} opacity-75`}>{a.reason}</p>
                    <p className={`text-[10px] mt-0.5 ${theme.accent} opacity-60`}>🌙 {a.optimalWindow}</p>
                  </div>
                ))}
              </div>
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

// ── Explore Tab ──────────────────────────────────────────────────────────────
// Оффлайн-рейтинг + опциональная точность: натальная карта и транзиты

const PLANET_NAMES_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун',
  pluto: 'Плутон', node: 'Сев.Узел', chiron: 'Хирон', lilith: 'Лилит',
};

// ── ACG интерпретации: планета × угол ────────────────────────────────────────
// Ключ: "<planet>_<angle>" (нижний регистр), значение: краткая интерпретация на русском
const ACG_INTERP: Record<string, string> = {
  // SUN
  sun_mc:  'Место признания и карьерного сияния. Личность раскрывается публично — высокая видимость, репутационный рост.',
  sun_ic:  'Глубокое ощущение "своей земли". Укоренение, семейное тепло, но меньше внешней заметности.',
  sun_asc: 'Личность светит ярко. Жизненная энергия и уверенность в себе заметно усиливаются.',
  sun_dsc: 'Притягивает ярких и влиятельных партнёров. Союзы и совместные проекты выходят на первый план.',
  // MOON
  moon_mc:  'Публичный образ связан с эмоциями и заботой. Высокая популярность, чуткость к запросам аудитории.',
  moon_ic:  'Сильная эмоциональная связь с местом — ощущение "второго дома". Благоприятно для семьи и частной жизни.',
  moon_asc: 'Обострённая интуиция и чувствительность к среде. Окружение реагирует на эмоциональную открытость.',
  moon_dsc: 'Нежные, поддерживающие партнёрства. Связи строятся на эмоциональной близости и взаимной заботе.',
  // MERCURY
  mercury_mc:  'Карьера в коммуникациях, медиа или образовании. Интеллект и речь работают на репутацию.',
  mercury_ic:  'Умственная работа дома. Удалённая деятельность, переговоры, обучение — всё это процветает.',
  mercury_asc: 'Остроумие и слово — главный инструмент влияния. Среда стимулирует быстрый обмен идеями.',
  mercury_dsc: 'Интеллектуальные партнёрства. Общение и совместный поиск истины — основа союзов.',
  // VENUS
  venus_mc:  'Признание через красоту, дипломатию или искусство. Харизма работает на публичный успех.',
  venus_ic:  'Уютный, гармоничный дом. Место для отдыха, эстетики и восстановления.',
  venus_asc: 'Обаяние и магнетизм усилены. Высокий потенциал романтических знакомств в этом месте.',
  venus_dsc: 'Гармоничные любовные союзы. Место благоприятствует романтике, браку и творческим партнёрствам.',
  // MARS
  mars_mc:  'Амбиции и активность в карьере. Конкуренция, лидерство, готовность идти на риск.',
  mars_ic:  'Энергия дома высока. Хорошо для спорта и ремёсел, но возможны напряжения в семейном быту.',
  mars_asc: 'Среда насыщена энергией и напором. Личная инициатива даёт быстрый отклик, но важен самоконтроль.',
  mars_dsc: 'Страстные, решительные партнёры. Высокая химия притяжения, иногда — конкуренция в паре.',
  // JUPITER
  jupiter_mc:  'Расширение карьеры, удача и рост репутации. Отличное место для бизнеса и публичной деятельности.',
  jupiter_ic:  'Ощущение изобилия и поддержки дома. Семья и окружение приносят возможности.',
  jupiter_asc: 'Оптимизм, везение и рост личных возможностей. Среда щедра и открыта к сотрудничеству.',
  jupiter_dsc: 'Партнёры привносят удачу и расширение горизонтов. Благоприятные деловые и личные союзы.',
  // SATURN
  saturn_mc:  'Строгая карьерная дисциплина. Медленный, но надёжный профессиональный рост и авторитет.',
  saturn_ic:  'Ответственность за семью и дом. Структура и стабильность, но возможно ощущение бремени.',
  saturn_asc: 'Среда требует серьёзности и терпения. Подходит для долгосрочных структурных проектов.',
  saturn_dsc: 'Стабильные, надёжные партнёры. Отношения строятся медленно, но выдерживают испытания временем.',
  // URANUS
  uranus_mc:  'Неожиданные карьерные перемены, инновации. Место для революционных идей и нестандартных ролей.',
  uranus_ic:  'Нестандартный образ жизни. Неожиданные перемены в семье и бытовом укладе.',
  uranus_asc: 'Среда непредсказуема и стимулирующа. Оригинальность и эксцентричность — сила, не недостаток.',
  uranus_dsc: 'Нестандартные партнёры и неожиданные встречи. Отношения могут быть яркими, но непостоянными.',
  // NEPTUNE
  neptune_mc:  'Творческое вдохновение и духовность в карьере. Важно не терять почву под ногами — сильны иллюзии.',
  neptune_ic:  'Мистическая связь с домом. Духовные практики процветают, но нужны чёткие границы.',
  neptune_asc: 'Высокая чувствительность и интуиция. Творчество и духовный рост — главные усилители среды.',
  neptune_dsc: 'Идеализация партнёров. Духовные связи глубоки, но важно видеть реальность без иллюзий.',
  // PLUTO
  pluto_mc:  'Трансформация карьеры и репутации. Мощная тяга к власти, кризисы ведут к перерождению.',
  pluto_ic:  'Глубокая трансформация уклада жизни. Процессы подземны и интенсивны — место кардинальных перемен.',
  pluto_asc: 'Интенсивная среда, притягивает сильных людей. Личность трансформируется через встречи и вызовы.',
  pluto_dsc: 'Трансформирующие партнёрства. Глубокие, иногда болезненные связи, ведущие к переосмыслению себя.',
  // NODE (Северный Узел)
  node_mc:  'Кармическое призвание через публичность и карьеру. Место, где раскрывается жизненная миссия.',
  node_ic:  'Кармические корни в этом месте. Связь с предназначением через семью и внутренний мир.',
  node_asc: 'Место судьбоносных знакомств. Кармические союзники появляются именно здесь.',
  node_dsc: 'Кармические партнёрства — встречи, меняющие жизнь. Судьбоносные союзы.',
  // CHIRON
  chiron_mc:  'Исцеление через профессиональную реализацию. Работа с чужими ранами даёт карьерный смысл.',
  chiron_ic:  'Место для исцеления глубинных травм и семейных паттернов. Внутренняя работа здесь наиболее эффективна.',
  chiron_asc: 'Особая уязвимость и открытость. Среда способствует трансформации через принятие своей раны.',
  chiron_dsc: 'Исцеляющие партнёрства. Встречи с людьми, помогающими расти через боль и уязвимость.',
  // LILITH
  lilith_mc:  'Тёмная сила и индивидуальность — на виду. Провокационная карьера или роль аутсайдера в системе.',
  lilith_ic:  'Тёмные семейные паттерны выходят на поверхность. Место для их осознания и трансформации.',
  lilith_asc: 'Магнетизм и тёмное притяжение усилены. Среда интенсивна, провокационна, полна скрытых сил.',
  lilith_dsc: 'Интенсивные, страстные связи с тёмным оттенком. Партнёры пробуждают архетипические силы.',
};

function getAcgInterp(planet: string, angle: string): string | null {
  const key = `${planet.toLowerCase()}_${angle.toLowerCase()}`;
  return ACG_INTERP[key] ?? null;
}

function AcgHitBadge({ hit, isDark }: { hit: AcgHit; isDark: boolean }) {
  const pn = PLANET_NAMES_RU[hit.planet] ?? hit.planet;
  const isGood = Object.values(hit.sphereImpact).some(v => (v ?? 0) > 0);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${
      hit.isTransit
        ? (isDark ? 'bg-cyan-900/25 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700')
        : isGood
          ? (isDark ? 'bg-indigo-900/25 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
          : (isDark ? 'bg-orange-900/20 border-orange-500/25 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-600')
    }`}>
      {hit.isTransit ? '🌍' : '⭐'} {pn}/{hit.angle} {hit.orb.toFixed(1)}°
    </span>
  );
}

function ExploreTab({ isDark, theme, birth }: { isDark: boolean; theme: ThemeLike; birth: BirthInput }) {
  const [goal, setGoal]           = useState('love');
  const [stayDays, setStayDays]   = useState(90);
  const [regionFilter, setRegion] = useState<string>('all');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<LocalCityScore | null>(null);

  // ── Точность: натальная карта ─────────────────────────────────────────────
  const [useNatal, setUseNatal]           = useState(false);
  const [natalSnap, setNatalSnap]         = useState<NatalSnapshot | null>(null);
  const [natalLoading, setNatalLoading]   = useState(false);
  const [natalError, setNatalError]       = useState<string | null>(null);

  // ── Точность: транзиты ────────────────────────────────────────────────────
  const [useTransit, setUseTransit]             = useState(false);
  const [transitSnap, setTransitSnap]           = useState<TransitSnapshot | null>(null);
  const [transitLoading, setTransitLoading]     = useState(false);
  const [transitError, setTransitError]         = useState<string | null>(null);
  const [transitDate, setTransitDate]           = useState(new Date().toISOString().slice(0, 10));

  // Загрузка натальной карты
  const loadNatal = useCallback(async () => {
    if (!birth.date) return;
    setNatalLoading(true); setNatalError(null);
    try {
      const chart = await getNatalChart(birth);
      const snap = buildNatalSnapshot(
        chart as Parameters<typeof buildNatalSnapshot>[0],
        birth.lat, birth.lon,
      );
      setNatalSnap(snap);
    } catch (e) {
      setNatalError((e as Error).message);
      setUseNatal(false);
    } finally {
      setNatalLoading(false);
    }
  }, [birth]);

  // Загрузка транзитных планет
  const loadTransit = useCallback(async (date: string) => {
    if (!birth.date) return;
    setTransitLoading(true); setTransitError(null);
    try {
      // getTransits returns transit positions keyed by planet name
      const raw = await getTransits(birth, date) as {
        transits?: Record<string, { transit_planet?: { lon?: number; dec?: number; retrograde?: boolean } }>;
        transit_planets?: Record<string, { lon?: number; dec?: number; retrograde?: boolean }>;
        planets?: Record<string, { lon?: number; dec?: number; retrograde?: boolean }>;
      };
      // Try to extract planet positions from various response formats
      let planetsRaw: Record<string, { lon: number; dec?: number; retrograde?: boolean }> = {};
      if (raw.transit_planets) {
        for (const [k, v] of Object.entries(raw.transit_planets)) {
          if (typeof v.lon === 'number') planetsRaw[k] = v as { lon: number; dec?: number; retrograde?: boolean };
        }
      } else if (raw.transits) {
        for (const [k, v] of Object.entries(raw.transits)) {
          if (v.transit_planet && typeof v.transit_planet.lon === 'number') {
            planetsRaw[k] = { lon: v.transit_planet.lon, dec: v.transit_planet.dec, retrograde: v.transit_planet.retrograde };
          }
        }
      } else if (raw.planets) {
        for (const [k, v] of Object.entries(raw.planets)) {
          if (typeof v.lon === 'number') planetsRaw[k] = v as { lon: number; dec?: number; retrograde?: boolean };
        }
      }
      if (Object.keys(planetsRaw).length === 0) throw new Error('Транзитные позиции не найдены в ответе');
      setTransitSnap(buildTransitSnapshot(date, planetsRaw));
    } catch (e) {
      setTransitError((e as Error).message);
      setUseTransit(false);
    } finally {
      setTransitLoading(false);
    }
  }, [birth]);

  // Реакция на чекбоксы
  const handleNatalToggle = useCallback((checked: boolean) => {
    setUseNatal(checked);
    if (checked && !natalSnap) loadNatal();
  }, [natalSnap, loadNatal]);

  const handleTransitToggle = useCallback((checked: boolean) => {
    setUseTransit(checked);
    if (checked && !transitSnap) loadTransit(transitDate);
  }, [transitSnap, loadTransit, transitDate]);

  const activeNatal   = useNatal   && !!natalSnap;
  const activeTransit = useTransit && !!transitSnap;

  const ranked = useMemo(
    () => rankCitiesLocally(
      goal, stayDays, 60,
      regionFilter === 'all' ? undefined : regionFilter,
      activeNatal ? natalSnap : null,
      activeTransit ? transitSnap : null,
    ),
    [goal, stayDays, regionFilter, activeNatal, natalSnap, activeTransit, transitSnap],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return ranked;
    const q = search.toLowerCase();
    return ranked.filter(r =>
      r.city.nameRu.toLowerCase().includes(q) ||
      r.city.name.toLowerCase().includes(q) ||
      r.city.country.toLowerCase().includes(q),
    );
  }, [ranked, search]);

  const goalInfo   = GOALS.find(g => g.id === goal);
  const stayMode   = STAY_MODES.find(s => s.days === stayDays) ?? STAY_MODES[1];
  const stayAdvice = SPHERE_STAY_ADVICE[goal] ?? [];

  return (
    <div className="space-y-4">
      {/* Goal selector */}
      <div className={`rounded-xl border ${theme.card} p-4 space-y-3`}>
        <h4 className={`font-bold text-sm ${theme.header} flex items-center gap-2`}>
          <Target className="h-4 w-4" /> Цель и длительность
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {GOALS.map(g => (
            <button key={g.id} onClick={() => setGoal(g.id)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all ${goal === g.id ? theme.tabActive : theme.tabInactive}`}>
              <span>{g.icon}</span><span>{g.label}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STAY_MODES.map(sm => (
            <button key={sm.id} onClick={() => setStayDays(sm.days)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all ${stayDays === sm.days ? theme.tabActive : theme.tabInactive}`}>
              <span>{sm.icon}</span><span>{sm.label}</span>
            </button>
          ))}
        </div>
        <p className={`text-[11px] ${theme.text} opacity-50`}>{stayMode.effect}</p>
      </div>

      {/* ── Точность: натальная карта + транзиты ── */}
      <div className={`rounded-xl border ${theme.card} p-4 space-y-3`}>
        <h4 className={`font-bold text-sm ${theme.header} flex items-center gap-2`}>
          <Zap className="h-4 w-4" /> Уточнение расчёта
          {(activeNatal || activeTransit) && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 ${isDark ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'}`}>
              ACG активен
            </span>
          )}
        </h4>
        <p className={`text-[11px] ${theme.text} opacity-50 -mt-1`}>
          Включи для учёта астрокартографии (ACG) по натальной карте и/или транзитам — рейтинг пересчитается.
        </p>

        {/* Натальная карта */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => handleNatalToggle(!useNatal)}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
              useNatal
                ? (isDark ? 'bg-indigo-500' : 'bg-indigo-600')
                : (isDark ? 'bg-slate-600' : 'bg-slate-300')
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useNatal ? 'left-4' : 'left-0.5'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-semibold ${theme.header}`}>
              ⭐ Натальная карта {natalLoading && <Spin />}
            </span>
            {useNatal && natalSnap && (
              <span className={`ml-2 text-[10px] ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                ✓ загружена · {Object.keys(natalSnap.planets).length} планет · RAMC {natalSnap.ramc.toFixed(1)}°
              </span>
            )}
            {natalError && <span className="ml-2 text-[10px] text-red-400">{natalError}</span>}
          </div>
          {useNatal && !natalSnap && !natalLoading && (
            <button onClick={() => loadNatal()}
              className={`text-[10px] px-2 py-0.5 rounded-full border ${theme.tabInactive}`}>
              Загрузить
            </button>
          )}
        </label>
        <p className={`text-[11px] ${theme.text} opacity-40 ml-12 -mt-2`}>
          Рассчитывает, через какие планетарные линии ACG (MC/IC/ASC/DSC) проходит каждый город.
        </p>

        {/* Транзиты */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => handleTransitToggle(!useTransit)}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
              useTransit
                ? (isDark ? 'bg-cyan-500' : 'bg-cyan-600')
                : (isDark ? 'bg-slate-600' : 'bg-slate-300')
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useTransit ? 'left-4' : 'left-0.5'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-semibold ${theme.header}`}>
              🌍 Текущие транзиты {transitLoading && <Spin />}
            </span>
            {useTransit && transitSnap && (
              <span className={`ml-2 text-[10px] ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                ✓ {transitSnap.date} · {Object.keys(transitSnap.planets).length} планет
              </span>
            )}
            {transitError && <span className="ml-2 text-[10px] text-red-400">{transitError}</span>}
          </div>
        </label>
        {useTransit && (
          <div className="ml-12 flex items-center gap-2 -mt-1">
            <input
              type="date"
              value={transitDate}
              onChange={e => {
                setTransitDate(e.target.value);
                setTransitSnap(null);
                if (useTransit) loadTransit(e.target.value);
              }}
              className={`px-2 py-1 rounded-lg border text-xs ${theme.card} ${theme.text}`}
            />
            <button
              onClick={() => loadTransit(transitDate)}
              disabled={transitLoading}
              className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${theme.tabInactive}`}>
              {transitLoading ? <Spin /> : 'Обновить'}
            </button>
          </div>
        )}
        <p className={`text-[11px] ${theme.text} opacity-40 ml-12 -mt-2`}>
          Добавляет ACG-слой транзитных планет — показывает, какие города усилены здесь и сейчас.
        </p>
      </div>

      {/* Stay period advice for goal */}
      {stayAdvice.length > 0 && (
        <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'bg-indigo-900/15 border-indigo-500/25' : 'bg-indigo-50 border-indigo-200'}`}>
          <p className={`text-xs font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-700'} mb-1`}>
            ⏱ Рекомендуемые периоды для цели «{goalInfo?.label}»:
          </p>
          {stayAdvice.map((a, i) => (
            <div key={i} className={`rounded-lg p-2.5 ${isDark ? 'bg-slate-800/60' : 'bg-white border border-slate-100'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold ${theme.header}`}>{a.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                  {a.planetaryCycle}
                </span>
              </div>
              <p className={`text-[11px] ${theme.text} opacity-75`}>{a.reason}</p>
              <p className={`text-[10px] mt-1 ${theme.accent} opacity-70`}>🌙 {a.optimalWindow}</p>
            </div>
          ))}
        </div>
      )}

      {/* Region filter + search */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <input
          type="text" placeholder="🔍 Поиск города..."
          value={search} onChange={e => setSearch(e.target.value)}
          className={`flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border text-xs ${theme.card} ${theme.text}`}
        />
        {['all', 'cis', 'europe', 'mena', 'asia', 'americas', 'oceania', 'africa'].map(r => (
          <button key={r} onClick={() => setRegion(r)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-all ${regionFilter === r ? theme.tabActive : theme.tabInactive}`}>
            {r === 'all' ? '🌍 Все' : REGION_LABELS[r] ?? r}
          </button>
        ))}
      </div>

      {/* City list */}
      <div className="space-y-2">
        {filtered.map((item, idx) => {
          const goalScore = item.sphereScores[goal] ?? 50;
          const gi = GOALS.find(g => g.id === goal);
          const isSel = selected?.city.name === item.city.name && selected?.city.country === item.city.country;
          // Top ACG hits for compact display
          const topHits = item.acgHits.filter(h => h.orb <= 8).slice(0, 4);
          return (
            <div key={`${item.city.name}-${item.city.country}`}
              className={`rounded-xl border overflow-hidden transition-all cursor-pointer ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200'} ${isSel ? (isDark ? 'ring-1 ring-indigo-500/50' : 'ring-1 ring-indigo-300') : ''}`}
              onClick={() => setSelected(isSel ? null : item)}>
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="shrink-0 w-6 text-center">
                  {idx < 3
                    ? <span className="text-sm">{['🥇','🥈','🥉'][idx]}</span>
                    : <span className={`text-xs font-mono opacity-40 ${theme.text}`}>{idx + 1}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${theme.header} truncate`}>{item.city.nameRu}</span>
                    <span className={`text-[10px] opacity-40 ${theme.text}`}>{item.city.country}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-700/30">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${goalScore}%`, backgroundColor: gi?.sphereColor ?? '#6366f1' }} />
                    </div>
                    <span className={`text-xs font-bold shrink-0`} style={{ color: gi?.sphereColor }}>
                      {goalScore}
                    </span>
                  </div>
                  {/* Compact ACG hits on list row */}
                  {topHits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {topHits.map((h, i) => <AcgHitBadge key={i} hit={h} isDark={isDark} />)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {item.topSpheres.slice(0, 3).map(sk => (
                    <span key={sk} className="text-sm">{SPHERE_LABELS[sk]?.icon}</span>
                  ))}
                </div>
                <ChevronDown className={`h-4 w-4 opacity-40 shrink-0 transition-transform ${isSel ? 'rotate-180' : ''}`} />
              </div>

              {/* Expanded detail */}
              {isSel && (
                <div className={`px-4 pb-4 space-y-4 border-t ${isDark ? 'border-slate-700/40' : 'border-slate-100'}`}>

                  {/* Full ACG hits */}
                  {item.acgHits.length > 0 && (
                    <div className="pt-3">
                      <p className={`text-xs font-semibold ${theme.accent} mb-2`}>
                        🗺 ACG — планетарные линии через город:
                      </p>
                      <div className="space-y-2">
                        {item.acgHits.slice(0, 10).map((h, i) => {
                          const pn = PLANET_NAMES_RU[h.planet] ?? h.planet;
                          const topImpact = Object.entries(h.sphereImpact)
                            .filter(([,v]) => (v ?? 0) !== 0)
                            .sort((a, b) => Math.abs(b[1] ?? 0) - Math.abs(a[1] ?? 0))
                            .slice(0, 3);
                          const interp = getAcgInterp(h.planet, h.angle);
                          const isGoodHit = topImpact.some(([,v]) => (v ?? 0) > 0);
                          return (
                            <div key={i} className={`rounded-lg p-3 ${
                              h.isTransit
                                ? (isDark ? 'bg-cyan-900/15 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-100')
                                : isGoodHit
                                  ? (isDark ? 'bg-indigo-900/15 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100')
                                  : (isDark ? 'bg-orange-900/10 border border-orange-500/15' : 'bg-orange-50 border border-orange-100')
                            }`}>
                              {/* Header row: planet/angle + orb + type + sphere chips */}
                              <div className="flex items-start gap-3">
                                <div className="shrink-0 text-center w-16">
                                  <div className={`text-[11px] font-bold ${h.isTransit ? (isDark ? 'text-cyan-300' : 'text-cyan-700') : isGoodHit ? (isDark ? 'text-indigo-300' : 'text-indigo-700') : (isDark ? 'text-orange-300' : 'text-orange-700')}`}>
                                    {pn}/{h.angle}
                                  </div>
                                  <div className={`text-[10px] ${theme.text} opacity-50`}>{h.orb.toFixed(1)}° орбис</div>
                                  <div className={`text-[9px] mt-0.5 ${h.isTransit ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : (isDark ? 'text-indigo-400' : 'text-indigo-500')}`}>
                                    {h.isTransit ? 'транзит' : 'натал'}
                                  </div>
                                </div>
                                <div className="flex-1 flex flex-wrap gap-1 items-start">
                                  {topImpact.map(([sk, v]) => {
                                    const si = SPHERE_LABELS[sk];
                                    if (!si) return null;
                                    const pos = (v ?? 0) > 0;
                                    return (
                                      <span key={sk} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                        pos
                                          ? (isDark ? 'bg-green-900/20 border-green-500/25 text-green-300' : 'bg-green-50 border-green-200 text-green-700')
                                          : (isDark ? 'bg-red-900/20 border-red-500/25 text-red-300' : 'bg-red-50 border-red-200 text-red-700')
                                      }`}>
                                        {si.icon} {pos ? '+' : ''}{v}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                              {/* Interpretation text */}
                              {interp && (
                                <p className={`mt-2 text-[11px] leading-relaxed ${theme.text} opacity-70`}>
                                  {interp}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* All spheres */}
                  <div className={item.acgHits.length > 0 ? '' : 'pt-3'}>
                    <p className={`text-xs font-semibold ${theme.accent} mb-2`}>Все сферы жизни в этой локации:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {SPHERE_KEYS.map(sk => {
                        const sv  = item.sphereScores[sk] ?? 50;
                        const si  = SPHERE_LABELS[sk];
                        const na  = (item.natalAcgBonus[sk as keyof typeof item.natalAcgBonus] ?? 0) as number;
                        const ta  = (item.transitAcgBonus[sk as keyof typeof item.transitAcgBonus] ?? 0) as number;
                        return (
                          <div key={sk} className="flex items-center gap-2">
                            <span className="text-sm w-5 text-center">{si.icon}</span>
                            <span className={`text-[11px] flex-1 ${theme.text} opacity-70`}>{si.label}</span>
                            {(Math.abs(na) >= 1 || Math.abs(ta) >= 1) && (
                              <span className={`text-[9px] ${na + ta > 0 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-orange-400' : 'text-orange-600')}`}>
                                {na + ta > 0 ? '+' : ''}{Math.round(na + ta)}
                              </span>
                            )}
                            <div className="w-14">
                              <div className="h-1.5 rounded-full overflow-hidden bg-slate-700/30">
                                <div className="h-full rounded-full" style={{ width: `${sv}%`, backgroundColor: si.color }} />
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold w-6 text-right" style={{ color: si.color }}>{sv}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stay advice for this city+goal */}
                  {stayAdvice.length > 0 && (
                    <div>
                      <p className={`text-xs font-semibold ${theme.accent} mb-2`}>⏱ Сколько быть в {item.city.nameRu}?</p>
                      <div className="space-y-2">
                        {stayAdvice.map((a, i) => (
                          <div key={i} className={`rounded-lg p-2.5 text-xs ${isDark ? 'bg-slate-800/50' : 'bg-slate-50 border border-slate-100'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-bold ${theme.header}`}>{a.label}</span>
                              <span className={`text-[10px] px-1.5 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>
                                {a.planetaryCycle}
                              </span>
                            </div>
                            <p className={`${theme.text} opacity-75 text-[11px]`}>{a.reason}</p>
                            <p className={`text-[10px] mt-1 opacity-60 ${theme.accent}`}>🌙 {a.optimalWindow}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* City sphere profile notes */}
                  {CITY_SPHERE_BIAS[item.city.nameRu] && (
                    <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50 border border-slate-100'}`}>
                      <p className={`text-xs font-semibold ${theme.accent} mb-1.5`}>Характер локации:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(CITY_SPHERE_BIAS[item.city.nameRu] ?? {})
                          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                          .slice(0, 6)
                          .map(([sk, val]) => {
                            const si = SPHERE_LABELS[sk];
                            if (!si) return null;
                            const positive = (val as number) >= 0;
                            return (
                              <span key={sk} className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                positive
                                  ? (isDark ? 'bg-green-900/20 border-green-500/30 text-green-300' : 'bg-green-50 border-green-200 text-green-700')
                                  : (isDark ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700')
                              }`}>
                                {si.icon} {si.label} {positive ? `+${val}` : val}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <p className={`text-[11px] ${theme.text} opacity-40`}>
                    UTC{item.city.utc >= 0 ? '+' : ''}{item.city.utc} · {item.city.lat.toFixed(2)}°, {item.city.lon.toFixed(2)}°
                  </p>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className={`text-center py-8 ${theme.text} opacity-40 text-sm`}>Нет городов по вашему запросу</p>
        )}
      </div>
    </div>
  );
}

// ── Map Tab (Relocated Chart) ─────────────────────────────────────────────────
// Простая релокация: один город → смещённая натальная карта + куспиды домов

function MapTab({ birth, isDark, theme }: { birth: BirthInput; isDark: boolean; theme: ThemeLike }) {
  const [cityName, setCityName] = useState('');
  const [lat, setLat]           = useState('');
  const [lon, setLon]           = useState('');
  const [relocChart, setRelocChart] = useState<NatalChart | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const run = useCallback(async () => {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    if (isNaN(la) || isNaN(lo)) { setError('Выберите город из списка или введите координаты'); return; }
    setLoading(true); setError(null);
    try {
      setRelocChart(await getRelocatedChart(birth, la, lo) as NatalChart);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [birth, lat, lon]);

  const hd = (n: number) =>
    (relocChart?.houses as Record<string, { sign: string; deg_min: string } | undefined> | undefined)?.[`h${n}`];

  return (
    <div className="space-y-4">
      {/* Input block */}
      <div className={`rounded-xl border ${theme.card} p-4 space-y-3`}>
        <h4 className={`font-bold text-sm ${theme.header} flex items-center gap-2`}>
          <MapPin className="h-4 w-4" /> Переезд: новая карта места
        </h4>
        <p className={`text-xs ${theme.text} opacity-60`}>
          Выбери город — карта пересчитается с новым ASC и MC для этой локации.
        </p>
        <CityPicker
          label="Город для переезда"
          value={cityName}
          onChange={(name, la, lo) => { setCityName(name); setLat(String(la)); setLon(String(lo)); }}
          isDark={isDark}
          theme={theme}
        />
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>Широта</label>
            <input type="number" step="0.0001" value={lat}
              onChange={e => setLat(e.target.value)} placeholder="48.85"
              className={`px-3 py-2 rounded-lg border text-sm w-28 ${theme.card} ${theme.text}`} />
          </div>
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>Долгота</label>
            <input type="number" step="0.0001" value={lon}
              onChange={e => setLon(e.target.value)} placeholder="2.35"
              className={`px-3 py-2 rounded-lg border text-sm w-28 ${theme.card} ${theme.text}`} />
          </div>
          <button onClick={run} disabled={loading || !lat}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${theme.btn} disabled:opacity-40`}>
            {loading ? <><Spin />Считаю...</> : '🗺 Рассчитать карту'}
          </button>
        </div>
      </div>

      {error && <Err msg={error} />}

      {relocChart && (
        <div className="space-y-3">
          {/* ASC / MC summary */}
          <div className={`rounded-xl border ${theme.card} p-3 flex flex-wrap gap-4`}>
            <div>
              <span className={`text-[10px] ${theme.text} opacity-50 block`}>Асцендент (ASC)</span>
              <span className={`text-sm font-bold ${theme.accent}`}
                style={{ color: hd(1) ? SIGN_COLORS[hd(1)!.sign] : undefined }}>
                {hd(1)?.sign ?? '—'} {hd(1)?.deg_min ?? ''}
              </span>
            </div>
            <div>
              <span className={`text-[10px] ${theme.text} opacity-50 block`}>Середина неба (MC)</span>
              <span className={`text-sm font-bold ${theme.accent}`}
                style={{ color: hd(10) ? SIGN_COLORS[hd(10)!.sign] : undefined }}>
                {hd(10)?.sign ?? '—'} {hd(10)?.deg_min ?? ''}
              </span>
            </div>
            <div>
              <span className={`text-[10px] ${theme.text} opacity-50 block`}>DSC (7 дом)</span>
              <span className={`text-sm font-bold ${theme.accent}`}
                style={{ color: hd(7) ? SIGN_COLORS[hd(7)!.sign] : undefined }}>
                {hd(7)?.sign ?? '—'} {hd(7)?.deg_min ?? ''}
              </span>
            </div>
            <div>
              <span className={`text-[10px] ${theme.text} opacity-50 block`}>IC (4 дом)</span>
              <span className={`text-sm font-bold ${theme.accent}`}
                style={{ color: hd(4) ? SIGN_COLORS[hd(4)!.sign] : undefined }}>
                {hd(4)?.sign ?? '—'} {hd(4)?.deg_min ?? ''}
              </span>
            </div>
          </div>

          {/* Chart wheel */}
          <div className="flex justify-center">
            <ChartWheel chart={relocChart} size={420} theme={theme.wheelTheme} />
          </div>

          {/* House cusps table */}
          <div className={`rounded-xl border ${theme.card} p-3`}>
            <h4 className={`text-xs font-semibold ${theme.accent} mb-2`}>Куспиды домов в новой локации</h4>
            <div className="grid grid-cols-3 gap-1 text-xs">
              {Array.from({ length: 12 }, (_, i) => {
                const h = hd(i + 1);
                return h ? (
                  <div key={i} className={`flex gap-1 ${theme.text}`}>
                    <span className="opacity-50 w-4">H{i + 1}</span>
                    <span style={{ color: SIGN_COLORS[h.sign] || '#888' }}>{h.sign}</span>
                    <span className={`ml-auto font-mono text-[10px] ${theme.accent}`}>{h.deg_min}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* Quick ACG hint */}
          <div className={`rounded-xl border ${isDark ? 'bg-indigo-900/15 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'} p-3`}>
            <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
              💡 Что изменилось при переезде?
            </p>
            <p className={`text-xs ${theme.text} opacity-70 leading-relaxed`}>
              При переезде планеты сохраняют свои градусы, но меняются дома и углы карты (ASC, MC, DSC, IC).
              Новый ASC определяет, как тебя видит окружение в этом городе.
              Новый MC — карьерная энергия и публичный образ.
              Используй вкладку <span className={theme.accent}>«Исследовать»</span> для рейтинга городов по сферам жизни.
            </p>
          </div>
        </div>
      )}

      {!relocChart && !loading && (
        <div className={`rounded-xl border ${theme.card} p-10 text-center`}>
          <Globe className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-30`} />
          <p className={`text-sm ${theme.text} opacity-50`}>
            Выбери город выше — увидишь смещённую натальную карту
          </p>
          <p className={`text-xs mt-1 ${theme.text} opacity-30`}>
            Или перейди в «Исследовать» для рейтинга по сферам жизни
          </p>
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
            <DateSegmentInput
              value={partner.date}
              onChange={d => setPartner(p => ({ ...p, date: d }))}
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
            <DateSegmentInput value={periodStart} onChange={setPeriodStart}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${theme.card} ${theme.text}`}
            />
          </div>
          <div>
            <label className={`text-xs ${theme.text} opacity-60 mb-1 block`}>Период по</label>
            <DateSegmentInput value={periodEnd} onChange={setPeriodEnd}
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

const TABS: { key: TabKey; icon: string; label: string; alwaysEnabled?: boolean }[] = [
  { key: 'map',       icon: '🗺',  label: 'Карта',        alwaysEnabled: true },
  { key: 'explore',   icon: '🔍', label: 'Рейтинг',      alwaysEnabled: true },
  { key: 'setup',     icon: '⚙️', label: 'Настройка',    alwaysEnabled: true },
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
  const [tab, setTab]               = useState<TabKey>('map');
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
            disabled={!t.alwaysEnabled && !result}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border font-medium transition-all disabled:opacity-30 ${tab === t.key ? theme.tabActive : theme.tabInactive}`}
          >
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {error && <Err msg={error} />}

      {tab === 'map' && (
        <MapTab birth={birth} isDark={isDark} theme={theme} />
      )}

      {tab === 'explore' && (
        <ExploreTab isDark={isDark} theme={theme} birth={birth} />
      )}

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

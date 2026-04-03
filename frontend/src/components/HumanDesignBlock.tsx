import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Aperture, Cpu, Fingerprint, GitBranch, Sparkles } from 'lucide-react';
import type { BirthInput } from '../types/astro';
import type { HumanDesignContentMode, HumanDesignResult } from '../types/humanDesign';
import { getHumanDesign } from '../services/humanDesignService';

type ThemeLike = {
  card: string;
  header: string;
  accent: string;
  text: string;
  btn: string;
  tabActive: string;
  tabInactive: string;
  symbol: string;
};

const HD_MODE_OPTIONS: Array<{ key: HumanDesignContentMode; label: string; subtitle: string }> = [
  { key: 'reader', label: 'Reader', subtitle: 'Коротко и ясно' },
  { key: 'analyst', label: 'Analyst', subtitle: 'Структурный разбор' },
  { key: 'practitioner', label: 'Practitioner', subtitle: 'Прикладной фокус' },
];

function StatCard({ title, value, subtitle, theme }: { title: string; value: string; subtitle?: string; theme: ThemeLike }) {
  return (
    <div className={`rounded-xl border ${theme.card} p-4`}>
      <div className={`text-[11px] uppercase tracking-[0.18em] ${theme.text}`}>{title}</div>
      <div className={`mt-2 text-lg font-semibold ${theme.header}`}>{value}</div>
      {subtitle ? <div className={`mt-1 text-sm ${theme.text}`}>{subtitle}</div> : null}
    </div>
  );
}

function ActivationTable({
  title,
  items,
  theme,
}: {
  title: string;
  items: HumanDesignResult['activations']['personality'];
  theme: ThemeLike;
}) {
  return (
    <div className={`rounded-xl border ${theme.card} overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${theme.header}`} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={theme.text}>
              <th className="px-4 py-2 text-left font-medium">Planet</th>
              <th className="px-4 py-2 text-left font-medium">Gate</th>
              <th className="px-4 py-2 text-left font-medium">L/C/T/B</th>
              <th className="px-4 py-2 text-left font-medium">Theme</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={`${title}-${item.planet}`} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <td className="px-4 py-2 capitalize">{item.planet.replace('_', ' ')}</td>
                <td className="px-4 py-2">{item.gate}.{item.line}</td>
                <td className="px-4 py-2">{item.color}/{item.tone}/{item.base}</td>
                <td className="px-4 py-2">{item.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HumanDesignBlock({
  birth,
  theme,
  contentMode,
  onContentModeChange,
}: {
  birth: BirthInput & { name?: string };
  theme: ThemeLike;
  contentMode: HumanDesignContentMode;
  onContentModeChange: (mode: HumanDesignContentMode) => void;
}) {
  const [result, setResult] = useState<HumanDesignResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref so event handlers can read current result without adding it to deps
  const resultRef = React.useRef<HumanDesignResult | null>(null);
  resultRef.current = result;

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [birth.date, birth.time, birth.lat, birth.lon, birth.utc]);

  const canCalculate = Boolean(birth.date && birth.time && Number.isFinite(birth.lat) && Number.isFinite(birth.lon));

  // Accepts an optional explicit mode so mode-change handler can pass the new
  // value directly before the prop update propagates — avoids a second render.
  const calculate = useCallback(async (explicitMode?: HumanDesignContentMode) => {
    const modeToUse = explicitMode ?? contentMode;
    if (!canCalculate) {
      setError('Укажите дату, время и город рождения.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await getHumanDesign(birth, modeToUse));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось рассчитать Human Design');
    } finally {
      setLoading(false);
    }
  }, [birth, canCalculate, contentMode]);

  // Single handler for mode-button clicks: notify parent AND auto-refetch
  // without any useEffect cascade that could cause React reconciliation errors.
  const handleModeChange = useCallback((newMode: HumanDesignContentMode) => {
    onContentModeChange(newMode);
    if (resultRef.current) {
      void calculate(newMode);
    }
  }, [onContentModeChange, calculate]);

  const centerGroups = useMemo(() => {
    if (!result) return [];
    return result.centers.map(center => ({
      ...center,
      badgeClass: center.defined ? theme.tabActive : theme.tabInactive,
    }));
  }, [result, theme.tabActive, theme.tabInactive]);

  const selectedModeOption = HD_MODE_OPTIONS.find(option => option.key === contentMode) ?? HD_MODE_OPTIONS[1];

  const crossTitle = result?.incarnation_cross.primary_title || result?.incarnation_cross.cross_name_ru || result?.incarnation_cross.name;
  const crossText = result?.incarnation_cross.primary_text || result?.incarnation_cross.description;
  const profileContext = result?.incarnation_cross.profile_context_ru;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border ${theme.card} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className={`text-xs uppercase tracking-[0.22em] ${theme.text}`}>Human Design</div>
            <h2 className={`mt-2 text-2xl font-semibold ${theme.header}`}>Bodygraph & Incarnation Cross</h2>
            <p className={`mt-2 max-w-3xl text-sm ${theme.text}`}>
              Отдельный расчётный блок: тип, стратегия, внутренний авторитет, профиль, определённости центров,
              каналы, активные ворота и инкарнационный крест. Не зависит от натальной интерпретации и считается отдельно.
            </p>
            <div className={`mt-4 rounded-xl border ${theme.card} p-3`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] uppercase tracking-[0.18em] ${theme.text}`}>Режим текста для экрана и PDF</span>
                <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.16em] ${theme.tabActive}`}>
                  {selectedModeOption.label}
                </span>
              </div>
              <p className={`mt-2 text-sm ${theme.text}`}>
                {selectedModeOption.subtitle}. В отчёт экспортируется этот же серверный формат интерпретации Human Design.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {HD_MODE_OPTIONS.map(option => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleModeChange(option.key)}
                  disabled={loading}
                  className={`rounded-full border px-3 py-2 text-left text-xs transition-all ${contentMode === option.key ? theme.tabActive : theme.tabInactive} ${loading ? 'opacity-70' : ''}`}
                >
                  <span className="block font-semibold">{option.label}</span>
                  <span className={`mt-0.5 block ${theme.text}`}>{option.subtitle}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => calculate()}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${theme.btn}`}
          >
            <Sparkles className="h-4 w-4" />
            {loading ? 'Считаю Human Design...' : 'Рассчитать Human Design'}
          </button>
        </div>
        {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      </div>

      {!result && !loading ? (
        <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
          <Fingerprint className={`mx-auto mb-3 h-12 w-12 ${theme.symbol} opacity-40`} />
          <p className={`${theme.text} text-sm`}>
            Human Design считается отдельно от астрологических вкладок. Используются те же данные рождения.
          </p>
        </div>
      ) : null}

      {result ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Type" value={result.overview.type} subtitle={result.overview.type_description} theme={theme} />
            <StatCard title="Strategy" value={result.overview.strategy} subtitle={`Authority: ${result.overview.authority}`} theme={theme} />
            <StatCard title="Profile" value={result.overview.profile_name} subtitle={result.overview.description} theme={theme} />
            <StatCard title="Definition" value={result.overview.definition} subtitle={`Signature: ${result.overview.signature} | Not-self: ${result.overview.not_self}`} theme={theme} />
          </div>

          <div className={`rounded-2xl border ${theme.card} p-5`}>
            <h3 className={`text-lg font-semibold ${theme.header}`}>Calculation Quality & Verification</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Quality" value={result.calculation_quality.quality_level} subtitle={`Verified: ${result.calculation_quality.verification_passed ? 'yes' : 'no'}`} theme={theme} />
              <StatCard title="Ephemeris" value={result.calculation_quality.ephemeris_primary} subtitle={`Fallback: ${result.calculation_quality.ephemeris_fallback}`} theme={theme} />
              <StatCard title="Max Delta" value={`${result.calculation_quality.max_longitude_delta_deg.toFixed(6)}°`} subtitle="SWIEPH vs MOSEPH" theme={theme} />
              <StatCard title="Design Error" value={`${result.calculation_quality.design_offset_error_deg.toFixed(6)}°`} subtitle="88° offset precision" theme={theme} />
            </div>
          </div>

          <div className={`rounded-2xl border ${theme.card} p-5`}>
            <h3 className={`text-lg font-semibold ${theme.header}`}>Detailed Human Design Synthesis</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Identity</div>
                <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.identity}</div>
              </div>
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Decision Making</div>
                <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.decision_making}</div>
              </div>
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Strengths</div>
                <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.strengths}</div>
              </div>
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Risk Patterns</div>
                <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.risk_patterns}</div>
              </div>
            </div>
            <div className={`mt-3 rounded-xl border ${theme.card} p-3`}>
              <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Recommendations</div>
              <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.recommendations}</div>
            </div>
          </div>

          <div className={`rounded-2xl border ${theme.card} p-5`}>
            <div className="flex items-center gap-2">
              <GitBranch className={`h-5 w-5 ${theme.symbol}`} />
              <h3 className={`text-lg font-semibold ${theme.header}`}>Incarnation Cross</h3>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className={`text-base font-medium ${theme.accent}`}>{crossTitle}</div>
              <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.16em] ${theme.tabActive}`}>
                {result.meta.mode}
              </span>
            </div>
            <p className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{crossText}</p>
            {profileContext ? <p className={`mt-2 text-xs leading-relaxed ${theme.text}`}>{profileContext}</p> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {result.incarnation_cross.gates.map(item => (
                <div key={`${item.role}-${item.gate}`} className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-[11px] uppercase tracking-[0.18em] ${theme.text}`}>{item.role}</div>
                  <div className={`mt-1 text-lg font-semibold ${theme.header}`}>Gate {item.gate}.{item.line}</div>
                  <div className={`mt-1 text-sm ${theme.text}`}>{item.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <div className={`rounded-2xl border ${theme.card} p-5`}>
              <div className="flex items-center gap-2">
                <Aperture className={`h-5 w-5 ${theme.symbol}`} />
                <h3 className={`text-lg font-semibold ${theme.header}`}>Centers</h3>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {centerGroups.map(center => (
                  <div key={center.key} className={`rounded-xl border ${theme.card} p-3`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className={`font-semibold ${theme.header}`}>{center.name}</div>
                      <span className={`rounded-full border px-2 py-1 text-[11px] ${center.badgeClass}`}>
                        {center.defined ? 'Defined' : 'Open'}
                      </span>
                    </div>
                    <div className={`mt-2 text-xs ${theme.text}`}>{center.interpretation}</div>
                    <div className={`mt-2 text-xs leading-relaxed ${theme.text}`}>{center.encyclopedic}</div>
                    <div className={`mt-3 text-xs ${theme.text}`}>
                      Gates: {center.active_gates.length ? center.active_gates.join(', ') : 'none'}
                    </div>
                    <div className={`mt-1 text-xs ${theme.text}`}>
                      Channels: {center.channels.length ? center.channels.join(', ') : 'none'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl border ${theme.card} p-5`}>
              <div className="flex items-center gap-2">
                <Activity className={`h-5 w-5 ${theme.symbol}`} />
                <h3 className={`text-lg font-semibold ${theme.header}`}>Defined Channels</h3>
              </div>
              <div className="mt-4 space-y-3">
                {result.channels.length ? result.channels.map(channel => (
                  <div key={channel.label} className={`rounded-xl border ${theme.card} p-3`}>
                    <div className={`font-semibold ${theme.header}`}>{channel.label} · {channel.name}</div>
                    <div className={`mt-1 text-sm ${theme.text}`}>{channel.summary}</div>
                    <div className={`mt-2 text-xs leading-relaxed ${theme.text}`}>{channel.encyclopedic}</div>
                    <div className={`mt-2 text-xs ${theme.text}`}>{channel.centers.join(' → ')}</div>
                  </div>
                )) : <div className={`text-sm ${theme.text}`}>No full channels. This usually indicates a highly open or selective bodygraph structure.</div>}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ActivationTable title="Personality Activations" items={result.activations.personality} theme={theme} />
            <ActivationTable title="Design Activations" items={result.activations.design} theme={theme} />
          </div>

          <div className={`rounded-2xl border ${theme.card} p-5`}>
            <h3 className={`text-lg font-semibold ${theme.header}`}>Forecast by Periods</h3>
            <p className={`mt-1 text-sm ${theme.text}`}>
              Transit-based Human Design periods for tactical planning: Sun-gate cycles (90 days) and Moon-gate windows (14 days).
            </p>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-sm font-semibold ${theme.header}`}>Sun Gate Periods (90d)</div>
                <div className="mt-3 space-y-2 max-h-80 overflow-auto pr-1">
                  {result.forecast.sun_gate_periods_90d.map((p, idx) => (
                    <div key={`${p.start_date}-${p.gate}-${idx}`} className={`rounded-lg border ${theme.card} p-2`}>
                      <div className={`text-xs ${theme.text}`}>{p.start_date} - {p.end_date}</div>
                      <div className={`text-sm ${theme.header}`}>Gate {p.gate} · {p.focus}</div>
                      <div className={`text-xs ${theme.text}`}>
                        Resonance: {p.resonates_with_natal ? 'matches natal activation' : 'background transit'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-sm font-semibold ${theme.header}`}>Moon Gate Windows (14d)</div>
                <div className="mt-3 space-y-2 max-h-80 overflow-auto pr-1">
                  {result.forecast.moon_gate_windows_14d.map((m, idx) => (
                    <div key={`${m.date}-${m.gate}-${idx}`} className={`rounded-lg border ${theme.card} p-2`}>
                      <div className={`text-xs ${theme.text}`}>{m.date}</div>
                      <div className={`text-sm ${theme.header}`}>Gate {m.gate} · {m.focus}</div>
                      <div className={`text-xs ${theme.text}`}>
                        Resonance: {m.resonates_with_natal ? 'natal gate amplified' : 'transit-only emphasis'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border ${theme.card} p-5`}>
            <div className="flex items-center gap-2">
              <Cpu className={`h-5 w-5 ${theme.symbol}`} />
              <h3 className={`text-lg font-semibold ${theme.header}`}>Active Gates</h3>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {result.gates.map(gate => (
                <div key={gate.gate} className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`font-semibold ${theme.header}`}>Gate {gate.gate} · {gate.name}</div>
                  <div className={`mt-1 text-sm ${theme.text}`}>{gate.keynote}</div>
                  <div className={`mt-2 text-xs ${theme.text}`}>{gate.description}</div>
                  <div className={`mt-2 text-xs leading-relaxed ${theme.text}`}>{gate.encyclopedic}</div>
                  <div className={`mt-3 text-xs ${theme.text}`}>Personality: {gate.personality.length ? gate.personality.map(item => `${item.planet} ${item.label}`).join(', ') : 'none'}</div>
                  <div className={`mt-1 text-xs ${theme.text}`}>Design: {gate.design.length ? gate.design.map(item => `${item.planet} ${item.label}`).join(', ') : 'none'}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
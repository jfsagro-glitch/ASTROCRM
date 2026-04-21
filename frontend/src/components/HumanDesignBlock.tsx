import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Aperture, Cpu, Fingerprint, GitBranch, Sparkles } from 'lucide-react';
import type { BirthInput } from '../types/astro';
import type { HumanDesignCenter, HumanDesignChannel, HumanDesignContentMode, HumanDesignHangingGate, HumanDesignResult } from '../types/humanDesign';
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
  wheelTheme?: string;
};

const HD_MODE_OPTIONS: Array<{ key: HumanDesignContentMode; label: string; subtitle: string }> = [
  { key: 'reader', label: 'Простой', subtitle: 'Для жизни — понятно и по делу' },
  { key: 'analyst', label: 'Аналитик', subtitle: 'Полный структурный разбор' },
  { key: 'practitioner', label: 'Практик', subtitle: 'Инструментальный фокус' },
];

type ReaderSphere = {
  key: string;
  title: string;
  potential: string;
  risks: string;
  compensation: string;
};

// ─── Bodygraph SVG ─────────────────────────────────────────────────────────────

function normalizeCenterKey(s: string): string {
  const t = s.toLowerCase().replace(/[\s\-_]/g, '').replace('center', '');
  if (t.startsWith('head')) return 'head';
  if (t.startsWith('ajna')) return 'ajna';
  if (t.startsWith('throat')) return 'throat';
  if (t === 'g' || t.startsWith('gcent') || t.startsWith('self') || t.startsWith('iident')) return 'g';
  if (t.startsWith('ego') || t.startsWith('heart') || t.startsWith('will')) return 'ego';
  if (t.startsWith('sacral')) return 'sacral';
  if (t.startsWith('solar') || t.startsWith('emotion') || t.startsWith('solarplexus')) return 'solar';
  if (t.startsWith('spleen') || t.startsWith('selen')) return 'spleen';
  if (t.startsWith('root')) return 'root';
  return t;
}

const BG_POS: Record<string, [number, number]> = {
  head:   [190, 40],
  ajna:   [190, 108],
  throat: [190, 186],
  g:      [142, 268],
  ego:    [272, 224],
  sacral: [190, 348],
  solar:  [272, 318],
  spleen: [104, 318],
  root:   [190, 422],
};

const BG_SZ: Record<string, { w: number; h: number; diamond?: boolean }> = {
  head:   { w: 54, h: 34 },
  ajna:   { w: 54, h: 34 },
  throat: { w: 66, h: 40 },
  g:      { w: 60, h: 60, diamond: true },
  ego:    { w: 54, h: 36 },
  sacral: { w: 68, h: 44 },
  solar:  { w: 56, h: 40 },
  spleen: { w: 56, h: 40 },
  root:   { w: 68, h: 38 },
};

const BG_CLR: Record<string, { light: string; dark: string; stroke: string }> = {
  head:   { light: '#fbbf24', dark: '#f59e0b', stroke: '#b45309' },
  ajna:   { light: '#a78bfa', dark: '#8b5cf6', stroke: '#6d28d9' },
  throat: { light: '#f97316', dark: '#fb923c', stroke: '#c2410c' },
  g:      { light: '#fde047', dark: '#fbbf24', stroke: '#b45309' },
  ego:    { light: '#f87171', dark: '#f87171', stroke: '#b91c1c' },
  sacral: { light: '#f87171', dark: '#ef4444', stroke: '#991b1b' },
  solar:  { light: '#fb923c', dark: '#f97316', stroke: '#c2410c' },
  spleen: { light: '#4ade80', dark: '#4ade80', stroke: '#166534' },
  root:   { light: '#a16207', dark: '#a16207', stroke: '#78350f' },
};

const BG_NAME: Record<string, string> = {
  head: 'ГОЛОВА', ajna: 'АДЖНА', throat: 'ГОРЛО',
  g: 'Я-ЦЕН', ego: 'ЭГО', sacral: 'САКРАЛ',
  solar: 'СП', spleen: 'СЕЛЕЗ', root: 'КОРЕНЬ',
};

const BG_EDGES: [string, string][] = [
  ['head','ajna'], ['ajna','throat'],
  ['throat','g'], ['throat','ego'], ['throat','solar'], ['throat','sacral'], ['throat','spleen'],
  ['g','ego'], ['g','spleen'], ['g','sacral'],
  ['ego','solar'],
  ['sacral','solar'], ['sacral','spleen'], ['sacral','root'],
  ['spleen','root'],
];

function BodygraphSVG({
  centers, channels, isDark,
}: {
  centers: HumanDesignCenter[];
  channels: HumanDesignChannel[];
  isDark: boolean;
}) {
  const definedKeys = new Set(centers.filter(c => c.defined).map(c => normalizeCenterKey(c.key)));

  const activeEdges = new Set<string>();
  for (const ch of channels) {
    const k1 = normalizeCenterKey(ch.centers[0]);
    const k2 = normalizeCenterKey(ch.centers[1]);
    activeEdges.add([k1, k2].sort().join('|'));
  }
  const isActive = (a: string, b: string) => activeEdges.has([a,b].sort().join('|'));

  const openFill   = isDark ? '#1e293b' : '#f1f5f9';
  const openStroke = isDark ? '#475569' : '#94a3b8';
  const openText   = isDark ? '#64748b' : '#94a3b8';
  const edgeOff    = isDark ? '#334155' : '#d1d5db';
  const edgeOn     = '#6366f1';
  const bg         = isDark ? '#0f172a' : '#f8fafc';

  return (
    <svg viewBox="0 0 380 462" className="w-full max-w-[260px] mx-auto select-none">
      <rect width="380" height="462" fill={bg} rx="14" />

      {BG_EDGES.map(([a, b]) => {
        const [ax, ay] = BG_POS[a] ?? [0,0];
        const [bx, by] = BG_POS[b] ?? [0,0];
        const on = isActive(a, b);
        return (
          <line key={`${a}-${b}`}
            x1={ax} y1={ay} x2={bx} y2={by}
            stroke={on ? edgeOn : edgeOff}
            strokeWidth={on ? 11 : 2}
            strokeLinecap="round"
            opacity={on ? 0.88 : 0.38}
          />
        );
      })}

      {Object.entries(BG_POS).map(([key, [cx, cy]]) => {
        const sz   = BG_SZ[key]; if (!sz) return null;
        const def  = definedKeys.has(key);
        const clr  = BG_CLR[key];
        const fill = def ? (isDark ? clr.dark : clr.light) : openFill;
        const strk = def ? clr.stroke : openStroke;
        const txtC = def ? (key === 'root' ? '#fef3c7' : '#1e293b') : openText;
        const lbl  = BG_NAME[key] ?? key.toUpperCase();

        if (sz.diamond) {
          const d = sz.w / 2;
          return (
            <g key={key}>
              <polygon
                points={`${cx},${cy-d} ${cx+d},${cy} ${cx},${cy+d} ${cx-d},${cy}`}
                fill={fill} stroke={strk} strokeWidth={2.5}
              />
              <text x={cx} y={cy+4} textAnchor="middle" fontSize="9" fontWeight="900"
                fontFamily="system-ui,sans-serif" fill={txtC}>
                {lbl}
              </text>
            </g>
          );
        }

        return (
          <g key={key}>
            <rect x={cx-sz.w/2} y={cy-sz.h/2} width={sz.w} height={sz.h}
              rx={5} fill={fill} stroke={strk} strokeWidth={2.5}
            />
            <text x={cx} y={cy+4} textAnchor="middle" fontSize="9" fontWeight="900"
              fontFamily="system-ui,sans-serif" fill={txtC}>
              {lbl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Hanging Gates Section ─────────────────────────────────────────────────────

function HangingGatesSection({
  gates, theme, isDark,
}: {
  gates: HumanDesignHangingGate[];
  theme: ThemeLike;
  isDark: boolean;
}) {
  if (gates.length === 0) return null;
  return (
    <div className={`rounded-2xl border ${theme.card} p-5`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔗</span>
        <h3 className={`text-lg font-semibold ${theme.header}`}>Висячие ворота</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${theme.tabInactive}`}>{gates.length}</span>
      </div>
      <p className={`text-xs ${theme.text} opacity-50 mb-4`}>
        Активные ворота без второй половины канала. Ищут партнёра для завершения связи — через человека, место или время.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {gates.map(g => (
          <div key={g.gate} className={`rounded-xl border ${theme.card} p-3`}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-base font-black ${theme.header}`}>{g.gate}</span>
                <div className="flex gap-1">
                  {g.sides.map(s => (
                    <span key={s} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                      s === 'personality'
                        ? (isDark ? 'bg-sky-900/30 border-sky-500/30 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-700')
                        : (isDark ? 'bg-red-900/30 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700')
                    }`}>
                      {s === 'personality' ? 'Л' : 'Д'}
                    </span>
                  ))}
                </div>
              </div>
              {g.partner_gate && (
                <span className={`text-[9px] ${theme.text} opacity-40 shrink-0`}>→ {g.partner_gate}</span>
              )}
            </div>
            <p className={`text-xs font-semibold ${theme.accent} mb-0.5`}>{g.name}</p>
            <p className={`text-[11px] ${theme.text} opacity-60 leading-relaxed mb-1.5`}>{g.keynote}</p>
            {g.partner_gate && (
              <p className={`text-[10px] ${theme.text} opacity-40`}>
                Ищет ворота <b className={theme.accent}>{g.partner_gate}</b> для завершения канала
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
              <th className="px-4 py-2 text-left font-medium">Планета</th>
              <th className="px-4 py-2 text-left font-medium">Ворота</th>
              <th className="px-4 py-2 text-left font-medium">Л/Ц/Т/О</th>
              <th className="px-4 py-2 text-left font-medium">Тема</th>
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

const CROSS_ROLE_MAP: Record<string, string> = {
  'Conscious Sun':    'Сознат. Солнце',
  'Conscious Earth':  'Сознат. Земля',
  'Unconscious Sun':  'Бессознат. Солнце',
  'Unconscious Earth':'Бессознат. Земля',
};

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

  // Tracks whether we already have a rendered result and can safely refetch by mode.
  const hasResultRef = React.useRef(false);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [birth.date, birth.time, birth.lat, birth.lon, birth.utc]);

  useEffect(() => {
    hasResultRef.current = Boolean(result);
  }, [result]);

  const canCalculate = Boolean(birth.date && birth.time && Number.isFinite(birth.lat) && Number.isFinite(birth.lon));

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

  const handleModeChange = useCallback((newMode: HumanDesignContentMode) => {
    if (newMode === contentMode) return;
    onContentModeChange(newMode);
  }, [contentMode, onContentModeChange]);

  useEffect(() => {
    if (!hasResultRef.current) return;
    void calculate(contentMode);
  }, [contentMode, calculate]);

  const centerGroups = useMemo(() => {
    if (!result) return [];
    return result.centers.map(center => ({
      ...center,
      badgeClass: center.defined ? theme.tabActive : theme.tabInactive,
    }));
  }, [result, theme.tabActive, theme.tabInactive]);

  const selectedModeOption = HD_MODE_OPTIONS.find(option => option.key === contentMode) ?? HD_MODE_OPTIONS[1];
  const isReaderMode = contentMode === 'reader';

  const crossTitle = result?.incarnation_cross?.primary_title || result?.incarnation_cross?.cross_name_ru || result?.incarnation_cross?.name;
  const crossText = result?.incarnation_cross?.primary_text || result?.incarnation_cross?.description;
  const readerCrossFullText = result?.incarnation_cross?.reader_full_report_ru;
  const profileContext = result?.incarnation_cross?.profile_context_ru;

  const definedCenters = useMemo(() => result?.centers?.filter(center => center.defined) ?? [], [result]);
  const openCenters = useMemo(() => result?.centers?.filter(center => !center.defined) ?? [], [result]);
  const topGateNames = useMemo(() => (result?.gates ?? []).slice(0, 4).map(g => `${g.gate} ${g.name}`), [result]);

  const readerNutrition = useMemo(() => {
    if (!result) return '';
    const hasDefinedSacral = definedCenters.some(c => c.key === 'sacral');
    const hasOpenSolar = openCenters.some(c => c.key === 'solar');
    const hasOpenRoot = openCenters.some(c => c.key === 'root');
    const base = hasDefinedSacral
      ? 'Вашему телу лучше подходит ритмичное питание: 3-4 понятных приёма пищи, стабильный сон и регулярная физическая нагрузка средней интенсивности.'
      : 'Вашему телу важнее гибкий режим: небольшие порции, паузы на восстановление, меньше перегрузок и больше наблюдения за реакцией организма.';
    const emotional = hasOpenSolar
      ? 'При сильных эмоциях не принимайте решения о питании «сгоряча»: сначала вода, пауза, затем простой тёплый приём пищи.'
      : 'Эмоциональные волны могут влиять на аппетит, поэтому держите базовый «антикризисный» набор продуктов и стабильные окна питания.';
    const stress = hasOpenRoot
      ? 'Стресс может толкать в переедание или пропуск еды: ставьте напоминания на еду и короткие паузы дыхания каждые 2-3 часа.'
      : 'Высокий темп лучше поддерживать сочетанием белка, сложных углеводов и воды, чтобы не проваливаться по энергии к вечеру.';
    return `${base} ${emotional} ${stress}`;
  }, [result, definedCenters, openCenters]);

  const readerLocation = useMemo(() => {
    if (!result) return '';
    const hasOpenG = openCenters.some(c => c.key === 'g');
    const hasDefinedSpleen = definedCenters.some(c => c.key === 'spleen');
    const placeAdvice = hasOpenG
      ? 'Для вас место критически важно: выбирайте локации, где телу спокойно, есть "свои" люди и понятный ритм. В токсичной среде мотивация и самоощущение быстро падают.'
      : 'Вам подходят локации, где можно удерживать свой вектор и долгие проекты: стабильная инфраструктура, рабочий фокус и минимум хаоса.';
    const bodyAdvice = hasDefinedSpleen
      ? 'Ориентируйтесь на телесный сигнал безопасности: если пространство «не ваше», вы это чувствуете сразу.'
      : 'Проверяйте место не по идее, а по факту: 2-3 дня теста ритма (сон, аппетит, продуктивность, настроение) дают честный ответ.';
    return `${placeAdvice} ${bodyAdvice}`;
  }, [result, definedCenters, openCenters]);

  const readerRelationships = useMemo(() => {
    if (!result) return '';
    const hasOpenEgo = openCenters.some(c => c.key === 'ego');
    const hasOpenSolar = openCenters.some(c => c.key === 'solar');
    const base = 'В отношениях ключ — не доказывать ценность, а строить ясные договорённости: ритм общения, ожидания, личные границы и зоны ответственности.';
    const egoAdvice = hasOpenEgo
      ? 'Не обещайте из желания понравиться: сначала проверка ресурсом, потом обязательство.'
      : 'Ваше слово весомо, поэтому важно обещать меньше, а выполнять стабильно.';
    const emoAdvice = hasOpenSolar
      ? 'Чужие эмоции вы можете усиливать: полезны паузы перед сложными разговорами и «правило 24 часов» для конфликтных решений.'
      : 'Ваши эмоции проживаются волнами: обсуждать важное лучше после эмоционального выравнивания.';
    return `${base} ${egoAdvice} ${emoAdvice}`;
  }, [result, openCenters]);

  const readerSpheres = useMemo<ReaderSphere[]>(() => {
    if (!result) return [];
    return [
      {
        key: 'work',
        title: 'Работа и реализация',
        potential: `Сильная зона: ${result.person_summary.strengths}`,
        risks: `Риск: ${result.person_summary.risk_patterns}`,
        compensation: 'Компенсаторика: делите задачи на 2 горизонта (быстрые/долгие), принимайте ключевые решения только по стратегии и авторитету, раз в неделю фиксируйте, что дало состояние сигнатуры.',
      },
      {
        key: 'money',
        title: 'Деньги и ресурсы',
        potential: `Ресурсный потенциал усиливается через темы ворот: ${topGateNames.join(', ') || 'ваши активные ворота'}.`,
        risks: 'Риск потерь обычно возникает в решениях под давлением, спешке и попытке соответствовать чужим ожиданиям.',
        compensation: 'Компенсаторика: правило 2 шагов для денег — сначала проверка телесного отклика, потом финансовое действие; лимиты риска, прозрачный бюджет, отказ от импульсивных обязательств.',
      },
      {
        key: 'relationships',
        title: 'Личные отношения',
        potential: readerRelationships || 'Ваш потенциал раскрывается через честный диалог, эмоциональную зрелость и уважение к разным ритмам близости.',
        risks: 'Риск: эмоциональные качели, спасательство, обещания выше ресурса, замалчивание границ.',
        compensation: 'Компенсаторика: еженедельная сверка ожиданий, язык фактов вместо обвинений, отдельные личные восстановительные окна для каждого партнёра.',
      },
      {
        key: 'health',
        title: 'Энергия и здоровье',
        potential: 'Потенциал: при правильном ритме тело быстро возвращает ясность, устойчивость и продуктивность.',
        risks: 'Риск: накопление усталости, тревожность из-за перегруза, несвоевременные решения на фоне эмоционального/стрессового пика.',
        compensation: `Компенсаторика: ${readerNutrition || 'стабильный режим сна, питания и движения.'}`,
      },
      {
        key: 'place',
        title: 'Место жизни и окружение',
        potential: 'Потенциал: правильно выбранная локация ускоряет реализацию, улучшает отношения и снижает внутренний шум.',
        risks: 'Риск: «не своё» окружение вызывает постоянные сомнения, утомление и потерю направления.',
        compensation: `Компенсаторика: ${readerLocation || 'тестируйте места и выбирайте то, где есть устойчивость и внутреннее спокойствие.'}`,
      },
    ];
  }, [result, topGateNames, readerNutrition, readerLocation, readerRelationships]);

  const [selectedSphereKey, setSelectedSphereKey] = useState('work');
  const selectedSphere = useMemo(
    () => readerSpheres.find(s => s.key === selectedSphereKey) ?? readerSpheres[0],
    [readerSpheres, selectedSphereKey],
  );

  const [selectedSunPeriodIndex, setSelectedSunPeriodIndex] = useState(0);
  const [selectedMoonWindowIndex, setSelectedMoonWindowIndex] = useState(0);
  const [readerCrossView, setReaderCrossView] = useState<'short' | 'full'>('short');
  const selectedSunPeriod = result?.forecast.sun_gate_periods_90d[selectedSunPeriodIndex] ?? null;
  const selectedMoonWindow = result?.forecast.moon_gate_windows_14d[selectedMoonWindowIndex] ?? null;
  const crossDisplayText = isReaderMode && readerCrossView === 'full' && readerCrossFullText
    ? readerCrossFullText
    : crossText;

  useEffect(() => {
    setSelectedSphereKey('work');
    setSelectedSunPeriodIndex(0);
    setSelectedMoonWindowIndex(0);
    setReaderCrossView('short');
  }, [result?.meta.calculated_at]);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border ${theme.card} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className={`text-xs uppercase tracking-[0.22em] ${theme.text}`}>Human Design</div>
            <h2 className={`mt-2 text-2xl font-semibold ${theme.header}`}>Bodygraph & Incarnation Cross</h2>
            <p className={`mt-2 max-w-3xl text-sm ${theme.text}`}>
              Хьюман Дизайн — система самопознания, основанная на точном времени рождения. Здесь рассчитывается ваш тип, стратегия, внутренний авторитет, профиль, центры бодиграфа, каналы и инкарнационный крест. Всё это помогает понять, как вам принимать решения, куда направлять энергию и почему одни ситуации даются легко, а другие — нет.
            </p>
            <div className={`mt-4 rounded-xl border ${theme.card} p-3`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] uppercase tracking-[0.18em] ${theme.text}`}>Режим текста для экрана и PDF</span>
                <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.16em] ${theme.tabActive}`}>
                  {selectedModeOption.label}
                </span>
              </div>
              <p className={`mt-2 text-sm ${theme.text}`}>
                {selectedModeOption.subtitle}. Режим влияет на глубину и стиль интерпретации — как на экране, так и в PDF-отчёте.
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
            <span>{loading ? 'Считаю Human Design...' : 'Рассчитать Human Design'}</span>
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
            <StatCard title="Тип" value={result.overview.type} subtitle={result.overview.type_description} theme={theme} />
            <StatCard title="Стратегия" value={result.overview.strategy} subtitle={`Авторитет: ${result.overview.authority}`} theme={theme} />
            <StatCard title="Профиль" value={result.overview.profile_name} subtitle={result.overview.description} theme={theme} />
            <StatCard title="Определённость" value={result.overview.definition} subtitle={`Сигнатура: ${result.overview.signature} · Не-я: ${result.overview.not_self}`} theme={theme} />
          </div>

          {/* ─── Bodygraph visual ───────────────────────────────────────────── */}
          <div className={`rounded-2xl border ${theme.card} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <Aperture className={`h-5 w-5 ${theme.symbol}`} />
              <h3 className={`text-lg font-semibold ${theme.header}`}>Бодиграф</h3>
              <div className="flex gap-3 ml-auto text-[10px] flex-wrap">
                <span className={`flex items-center gap-1 ${theme.text} opacity-60`}>
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" /> Определён
                </span>
                <span className={`flex items-center gap-1 ${theme.text} opacity-60`}>
                  <span className={`inline-block w-3 h-3 rounded-sm border ${theme.card}`} style={{backgroundColor: 'transparent'}} /> Открыт
                </span>
                <span className={`flex items-center gap-1 ${theme.text} opacity-60`}>
                  <span className="inline-block w-8 h-1.5 rounded-full bg-indigo-500" /> Канал
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-64 shrink-0">
                <BodygraphSVG centers={result.centers} channels={result.channels} isDark={theme.wheelTheme === 'dark'} />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                {/* Center legend */}
                <div className={`text-[10px] uppercase tracking-widest ${theme.text} opacity-40 mb-1`}>Центры</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {result.centers.map(c => (
                    <div key={c.key} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${
                      c.defined
                        ? (theme.wheelTheme === 'dark' ? 'bg-indigo-900/20 border-indigo-500/25' : 'bg-indigo-50 border-indigo-200')
                        : theme.card
                    }`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${c.defined ? 'bg-indigo-400' : 'bg-slate-500/40'}`} />
                      <span className={`text-[11px] font-medium truncate ${c.defined ? (theme.wheelTheme === 'dark' ? 'text-indigo-200' : 'text-indigo-700') : theme.text}`}>
                        {c.name}
                      </span>
                      <span className={`text-[9px] ml-auto shrink-0 ${theme.text} opacity-40`}>
                        {c.defined ? 'опр' : 'откр'}
                      </span>
                    </div>
                  ))}
                </div>
                {result.channels.length > 0 && (
                  <div className="mt-2">
                    <div className={`text-[10px] uppercase tracking-widest ${theme.text} opacity-40 mb-1`}>
                      Активные каналы ({result.channels.length})
                    </div>
                    <div className="space-y-1">
                      {result.channels.slice(0, 6).map(ch => (
                        <div key={ch.label} className={`text-[11px] ${theme.text} opacity-70`}>
                          <span className="font-bold">{ch.label}</span> — {ch.name}
                        </div>
                      ))}
                      {result.channels.length > 6 && (
                        <div className={`text-[10px] ${theme.text} opacity-40`}>+{result.channels.length - 6} ещё</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border ${theme.card} p-5`}>
            <h3 className={`text-lg font-semibold ${theme.header}`}>Ваш Хьюман Дизайн: разбор по ключевым блокам</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Кто вы по системе</div>
                <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.identity}</div>
              </div>
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Как принимать решения</div>
                <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.decision_making}</div>
              </div>
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Природные силы и таланты</div>
                <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.strengths}</div>
              </div>
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Зоны уязвимости и типичные ловушки</div>
                <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.risk_patterns}</div>
              </div>
            </div>
            <div className={`mt-3 rounded-xl border ${theme.card} p-3`}>
              <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Практические рекомендации</div>
              <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.recommendations}</div>
            </div>
          </div>

          {isReaderMode ? (
            <div className={`rounded-2xl border ${theme.card} p-5`}>
              <h3 className={`text-lg font-semibold ${theme.header}`}>Подробно и простым языком: как вам жить свой дизайн</h3>
              <p className={`mt-1 text-sm ${theme.text}`}>
                Ниже практичный разбор: кто вы, где ваши сильные стороны, где риски, как их снизить и как выйти в стабильную реализацию.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Кто вы по системе</div>
                  <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>
                    Вы — {result.overview.type}, профиль {result.overview.profile_name}. Ваша стратегия: {result.overview.strategy}. Внутренний авторитет: {result.overview.authority}.
                  </div>
                </div>
                <div className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Что дает ваш дизайн</div>
                  <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.strengths}</div>
                </div>
                <div className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Где могут быть проблемы</div>
                  <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.risk_patterns}</div>
                </div>
                <div className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Как исправить и избежать</div>
                  <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{result.person_summary.recommendations}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Как питаться и держать энергию</div>
                  <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{readerNutrition}</div>
                </div>
                <div className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Какие локации выбирать</div>
                  <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{readerLocation}</div>
                </div>
              </div>

              <div className={`mt-3 rounded-xl border ${theme.card} p-3`}>
                <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Личные отношения</div>
                <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{readerRelationships}</div>
              </div>

              <div className="mt-4">
                <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Потенциал и риски по сферам жизни</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {readerSpheres.map(sphere => (
                    <button
                      key={sphere.key}
                      type="button"
                      onClick={() => setSelectedSphereKey(sphere.key)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-all ${selectedSphere?.key === sphere.key ? theme.tabActive : theme.tabInactive}`}
                    >
                      {sphere.title}
                    </button>
                  ))}
                </div>
                {selectedSphere ? (
                  <div className={`mt-3 rounded-xl border ${theme.card} p-3`}>
                    <div className={`text-sm font-semibold ${theme.header}`}>{selectedSphere.title}</div>
                    <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}><b>Потенциал:</b> {selectedSphere.potential}</div>
                    <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}><b>Риски:</b> {selectedSphere.risks}</div>
                    <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}><b>Компенсаторика:</b> {selectedSphere.compensation}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className={`rounded-2xl border ${theme.card} p-5`}>
            <div className="flex items-center gap-2">
              <GitBranch className={`h-5 w-5 ${theme.symbol}`} />
              <h3 className={`text-lg font-semibold ${theme.header}`}>Инкарнационный Крест</h3>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className={`text-base font-medium ${theme.accent}`}>{crossTitle}</div>
              <span className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.16em] ${theme.tabActive}`}>
                {result.meta.mode}
              </span>
            </div>
            {isReaderMode && readerCrossFullText ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReaderCrossView('short')}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-all ${readerCrossView === 'short' ? theme.tabActive : theme.tabInactive}`}
                >
                  Кратко
                </button>
                <button
                  type="button"
                  onClick={() => setReaderCrossView('full')}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-all ${readerCrossView === 'full' ? theme.tabActive : theme.tabInactive}`}
                >
                  Подробно
                </button>
              </div>
            ) : null}
            <p className={`mt-2 whitespace-pre-line text-sm leading-relaxed ${theme.text}`}>{crossDisplayText}</p>
            {profileContext ? <p className={`mt-2 text-xs leading-relaxed ${theme.text}`}>{profileContext}</p> : null}
            {isReaderMode ? (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Суть креста</div>
                  <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>{crossText}</div>
                </div>
                <div className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Что дает и какой потенциал</div>
                  <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>
                    Потенциал креста раскрывается, когда вы живете по стратегии и авторитету, а ключевые ворота проявляете через конкретные действия, а не через спешку.
                  </div>
                </div>
                <div className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-xs uppercase tracking-[0.16em] ${theme.text}`}>Что требует и как реализовать</div>
                  <div className={`mt-2 text-sm leading-relaxed ${theme.text}`}>
                    Крест требует дисциплины выбора: меньше импульсивных решений, больше повторяемых шагов, регулярная сверка с тем, что дает состояние {result.overview.signature.toLowerCase()} вместо {result.overview.not_self.toLowerCase()}.
                  </div>
                </div>
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {(result.incarnation_cross?.gates ?? []).map(item => (
                <div key={`${item.role}-${item.gate}`} className={`rounded-xl border ${theme.card} p-3`}>
                  <div className={`text-[11px] uppercase tracking-[0.18em] ${theme.text}`}>{CROSS_ROLE_MAP[item.role] ?? item.role}</div>
                  <div className={`mt-1 text-lg font-semibold ${theme.header}`}>Ворота {item.gate}.{item.line}</div>
                  <div className={`mt-1 text-sm ${theme.text}`}>{item.name}</div>
                </div>
              ))}
            </div>
          </div>

          {!isReaderMode ? (
          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <div className={`rounded-2xl border ${theme.card} p-5`}>
              <div className="flex items-center gap-2">
                <Aperture className={`h-5 w-5 ${theme.symbol}`} />
                <h3 className={`text-lg font-semibold ${theme.header}`}>Центры Бодиграфа</h3>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {centerGroups.map(center => (
                  <div key={center.key} className={`rounded-xl border ${theme.card} p-3`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className={`font-semibold ${theme.header}`}>{center.name}</div>
                      <span className={`rounded-full border px-2 py-1 text-[11px] ${center.badgeClass}`}>
                        {center.defined ? 'Определён' : 'Открыт'}
                      </span>
                    </div>
                    <div className={`mt-2 text-xs ${theme.text}`}>{center.interpretation}</div>
                    <div className={`mt-2 text-xs leading-relaxed ${theme.text}`}>{center.encyclopedic}</div>
                    <div className={`mt-3 text-xs ${theme.text}`}>
                      Ворота: {center.active_gates.length ? center.active_gates.join(', ') : 'нет'}
                    </div>
                    <div className={`mt-1 text-xs ${theme.text}`}>
                      Каналы: {center.channels.length ? center.channels.join(', ') : 'нет'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl border ${theme.card} p-5`}>
              <div className="flex items-center gap-2">
                <Activity className={`h-5 w-5 ${theme.symbol}`} />
                <h3 className={`text-lg font-semibold ${theme.header}`}>Определённые Каналы</h3>
              </div>
              <div className="mt-4 space-y-3">
                {result.channels.length ? result.channels.map(channel => (
                  <div key={channel.label} className={`rounded-xl border ${theme.card} p-3`}>
                    <div className={`font-semibold ${theme.header}`}>{channel.label} · {channel.name}</div>
                    <div className={`mt-1 text-sm ${theme.text}`}>{channel.summary}</div>
                    <div className={`mt-2 text-xs leading-relaxed ${theme.text}`}>{channel.encyclopedic}</div>
                    <div className={`mt-2 text-xs ${theme.text}`}>{channel.centers.join(' → ')}</div>
                  </div>
                )) : <div className={`text-sm ${theme.text}`}>Определённых каналов не обнаружено. Это указывает на очень открытый или избирательный бодиграф — вы легко усиливаете чужую энергию, но важно не путать её со своей.</div>}
              </div>
            </div>
          </div>
          ) : null}

          {!isReaderMode ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <ActivationTable title="Активации личности (сознательное)" items={result.activations.personality} theme={theme} />
              <ActivationTable title="Активации дизайна (бессознательное)" items={result.activations.design} theme={theme} />
            </div>
          ) : null}

          {!isReaderMode && result.hanging_gates && result.hanging_gates.length > 0 ? (
            <HangingGatesSection
              gates={result.hanging_gates}
              theme={theme}
              isDark={theme.wheelTheme === 'dark'}
            />
          ) : null}

          <div className={`rounded-2xl border ${theme.card} p-5`}>
            <h3 className={`text-lg font-semibold ${theme.header}`}>Прогноз по энергетическим периодам</h3>
            <p className={`mt-1 text-sm ${theme.text}`}>
              {isReaderMode
                ? 'Простой и подробный прогноз: что делать по периодам, где возможности, где риски и как мягко корректировать курс.'
                : 'Transit-based Human Design periods for tactical planning: Sun-gate cycles (90 days) and Moon-gate windows (14 days).'}
            </p>

            <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-sm font-semibold ${theme.header}`}>Солнечные периоды ворот (90 дней)</div>
                <div className="mt-3 space-y-2 max-h-80 overflow-auto pr-1">
                  {result.forecast.sun_gate_periods_90d.map((p, idx) => (
                    <button
                      key={`${p.start_date}-${p.gate}-${idx}`}
                      type="button"
                      onClick={() => setSelectedSunPeriodIndex(idx)}
                      className={`w-full rounded-lg border p-2 text-left transition-all ${selectedSunPeriodIndex === idx ? theme.tabActive : theme.card}`}
                    >
                      <div className={`text-xs ${theme.text}`}>{p.start_date} - {p.end_date}</div>
                      <div className={`text-sm ${theme.header}`}>Gate {p.gate} · {p.focus}</div>
                      <div className={`text-xs ${theme.text}`}>
                        {p.resonates_with_natal ? '✦ Усиливает вашу тему' : '○ Фоновый транзит'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl border ${theme.card} p-3`}>
                <div className={`text-sm font-semibold ${theme.header}`}>Разбор выбранного солнечного периода</div>
                {selectedSunPeriod ? (
                  <div className="mt-3 space-y-2">
                    <div className={`rounded-lg border ${theme.card} p-3`}>
                      <div className={`text-xs ${theme.text}`}>{selectedSunPeriod.start_date} - {selectedSunPeriod.end_date}</div>
                      <div className={`mt-1 text-base font-semibold ${theme.header}`}>Gate {selectedSunPeriod.gate} · {selectedSunPeriod.focus}</div>
                      <p className={`mt-2 text-sm leading-relaxed ${theme.text}`}>
                        {selectedSunPeriod.resonates_with_natal
                          ? 'Это резонансный период: ваша врождённая тема усиливается, легче выйти в ощутимый результат при последовательных действиях.'
                          : 'Это фоновый обучающий период: хорошо тестировать новые подходы без жестких ожиданий и собирать обратную связь.'}
                      </p>
                      <p className={`mt-2 text-sm leading-relaxed ${theme.text}`}>
                        Возможность: сфокусировать 1-2 ключевые задачи на тему ворот {selectedSunPeriod.gate}. Риск: распыление и импульсивные решения.
                      </p>
                      <p className={`mt-2 text-sm leading-relaxed ${theme.text}`}>
                        Как избегать проблем: ежедневный короткий план, приоритет по энергии тела, вечерняя ревизия "что сработало" и "что убрать".
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={`mt-4 rounded-xl border ${theme.card} p-3`}>
              <div className={`text-sm font-semibold ${theme.header}`}>Лунные окна (14 дней) — быстрые тактические периоды</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {result.forecast.moon_gate_windows_14d.map((m, idx) => (
                  <button
                    key={`${m.date}-${m.gate}-${idx}`}
                    type="button"
                    onClick={() => setSelectedMoonWindowIndex(idx)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition-all ${selectedMoonWindowIndex === idx ? theme.tabActive : theme.tabInactive}`}
                  >
                    <div className={theme.text}>{m.date}</div>
                    <div className={`mt-1 font-semibold ${theme.header}`}>Gate {m.gate}</div>
                    <div className={`${m.resonates_with_natal ? 'text-green-400' : theme.text}`}>
                      {m.resonates_with_natal ? 'Усиление вашей темы' : 'Фоновая тема дня'}
                    </div>
                  </button>
                ))}
              </div>

              {selectedMoonWindow ? (
                <div className={`mt-3 rounded-lg border ${theme.card} p-3`}>
                  <div className={`text-sm font-semibold ${theme.header}`}>{selectedMoonWindow.date} · Gate {selectedMoonWindow.gate} · {selectedMoonWindow.focus}</div>
                  <p className={`mt-2 text-sm leading-relaxed ${theme.text}`}>
                    {selectedMoonWindow.resonates_with_natal
                      ? 'День усиления: хороший момент для переговоров, презентаций, запуска коротких задач и закрепления привычек.'
                      : 'День наблюдения: тестируйте гипотезы маленькими шагами, не перегружайте расписание и оставьте время на корректировку.'}
                  </p>
                  <p className={`mt-2 text-sm leading-relaxed ${theme.text}`}>
                    Практика дня: 1 главная задача, 1 поддерживающее действие для отношений, 1 действие для здоровья/восстановления.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {!isReaderMode ? (
            <div className={`rounded-2xl border ${theme.card} p-5`}>
              <div className="flex items-center gap-2">
                <Cpu className={`h-5 w-5 ${theme.symbol}`} />
                <h3 className={`text-lg font-semibold ${theme.header}`}>Активные Ворота</h3>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {result.gates.map(gate => (
                  <div key={gate.gate} className={`rounded-xl border ${theme.card} p-3`}>
                    <div className={`font-semibold ${theme.header}`}>Gate {gate.gate} · {gate.name}</div>
                    <div className={`mt-1 text-sm ${theme.text}`}>{gate.keynote}</div>
                    <div className={`mt-2 text-xs ${theme.text}`}>{gate.description}</div>
                    <div className={`mt-2 text-xs leading-relaxed ${theme.text}`}>{gate.encyclopedic}</div>
                    <div className={`mt-3 text-xs ${theme.text}`}>Личность: {gate.personality.length ? gate.personality.map(item => `${item.planet} ${item.label}`).join(', ') : 'нет'}</div>
                    <div className={`mt-1 text-xs ${theme.text}`}>Дизайн: {gate.design.length ? gate.design.map(item => `${item.planet} ${item.label}`).join(', ') : 'нет'}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
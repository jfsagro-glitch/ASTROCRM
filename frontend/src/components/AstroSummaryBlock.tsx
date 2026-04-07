// ─── AstroSummaryBlock ─────────────────────────────────────────────────────────
// Общий астропрогноз на текущую конфигурацию планет (без натальной карты).
// Включает: подробные интерпретации по сферам жизни, временны́е окна,
// планетарный фон, ключевые аспекты + подписка на email-рассылку.

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Sun, Moon, Star, Clock, Zap, Heart, Briefcase, DollarSign,
  Leaf, Palette, Mail, Bell, BellOff, Copy, Check, RefreshCw,
  ChevronDown, ChevronUp, AlertCircle, Loader2, Send, Calendar,
  Eye, X,
} from 'lucide-react';
import { getAstroSummary } from '../services/astrologyService';
import DateSegmentInput from './DateSegmentInput';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
  wheelTheme: 'dark' | 'light';
}

interface PeriodData {
  label: string;
  start_date: string;
  end_date: string;
  sun_sign: string;
  moon_sign: string;
  energy: string;
  focus: string;
  key_aspects: string[];
  advice: string;
  interpretation: string;
}

interface SummaryData {
  type: string;
  target_date: string;
  periods: {
    day: PeriodData;
    week: PeriodData;
    month: PeriodData;
    year: PeriodData;
  };
}

interface EmailSub {
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  hour: string; // "08:00"
  active: boolean;
}

interface Props {
  theme: ThemeLike;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SIGN_EMOJI: Record<string, string> = {
  'Овен': '♈', 'Телец': '♉', 'Близнецы': '♊', 'Рак': '♋',
  'Лев': '♌', 'Дева': '♍', 'Весы': '♎', 'Скорпион': '♏',
  'Стрелец': '♐', 'Козерог': '♑', 'Водолей': '♒', 'Рыбы': '♓',
};

const ENERGY_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  'благоприятный':  { color: '#22c55e', bg: 'bg-green-500/15 border-green-500/25', icon: '🟢', label: 'Благоприятный' },
  'напряженный':    { color: '#ef4444', bg: 'bg-red-500/15 border-red-500/25',     icon: '🔴', label: 'Напряжённый'  },
  'переменный':     { color: '#f59e0b', bg: 'bg-amber-500/15 border-amber-500/25', icon: '🟡', label: 'Переменный'   },
};

const ASPECT_HARMONY: Record<string, boolean> = {
  'соединение': true, 'трин': true, 'секстиль': true,
  'квадрат': false, 'оппозиция': false,
};

// ── Sphere scoring by aspect keywords ─────────────────────────────────────────

type SphereKey = 'love' | 'work' | 'finance' | 'health' | 'creative';

interface SphereInfo {
  key: SphereKey;
  icon: React.FC<{ className?: string }>;
  emoji: string;
  label: string;
  color: string;
  darkText: string;
  lightText: string;
  darkBg: string;
  lightBg: string;
}

const SPHERES: SphereInfo[] = [
  { key: 'love',     icon: Heart,      emoji: '❤️',  label: 'Отношения',  color: '#ec4899', darkText: 'text-pink-300',    lightText: 'text-pink-700',   darkBg: 'bg-pink-900/15 border-pink-500/25',    lightBg: 'bg-pink-50 border-pink-200' },
  { key: 'work',     icon: Briefcase,  emoji: '💼',  label: 'Работа',     color: '#6366f1', darkText: 'text-indigo-300',  lightText: 'text-indigo-700', darkBg: 'bg-indigo-900/15 border-indigo-500/25',lightBg: 'bg-indigo-50 border-indigo-200' },
  { key: 'finance',  icon: DollarSign, emoji: '💰',  label: 'Финансы',    color: '#f59e0b', darkText: 'text-amber-300',   lightText: 'text-amber-700',  darkBg: 'bg-amber-900/15 border-amber-500/25',  lightBg: 'bg-amber-50 border-amber-200' },
  { key: 'health',   icon: Leaf,       emoji: '🌿',  label: 'Здоровье',   color: '#10b981', darkText: 'text-emerald-300', lightText: 'text-emerald-700',darkBg: 'bg-emerald-900/15 border-emerald-500/25',lightBg: 'bg-emerald-50 border-emerald-200' },
  { key: 'creative', icon: Palette,    emoji: '🎨',  label: 'Творчество', color: '#a855f7', darkText: 'text-purple-300',  lightText: 'text-purple-700', darkBg: 'bg-purple-900/15 border-purple-500/25', lightBg: 'bg-purple-50 border-purple-200' },
];

// Sphere weight matrix: how each planet pair affects each sphere
// Key: "<planet_keyword>" → sphere weight adjustments
const PLANET_SPHERE_WEIGHT: Record<string, Partial<Record<SphereKey, number>>> = {
  'Венера':    { love: +25, creative: +15, finance: +10 },
  'Марс':      { love: +12, health: +18, work: +15, finance: -8 },
  'Меркурий':  { work: +20, creative: +10, finance: +8 },
  'Юпитер':    { finance: +22, work: +15, love: +8, creative: +12 },
  'Сатурн':    { work: +10, finance: +12, health: -10, love: -8 },
  'Луна':      { love: +15, health: +12, creative: +10 },
  'Солнце':    { work: +12, love: +8, creative: +15, health: +10 },
  'Нептун':    { creative: +18, love: +10, finance: -12 },
  'Уран':      { creative: +15, work: +8, finance: -5, health: -8 },
  'Плутон':    { work: +8, love: -10, finance: -8, health: -12 },
};

const ASPECT_MULTIPLIER: Record<string, number> = {
  'соединение': 1.2, 'трин': 1.0, 'секстиль': 0.8,
  'квадрат': -0.9, 'оппозиция': -1.0,
};

// Sphere interpretations per energy level
type EnergyLevel = 'high' | 'mid' | 'low';

const SPHERE_INTERP: Record<SphereKey, Record<EnergyLevel, { headline: string; body: string; tip: string }>> = {
  love: {
    high: {
      headline: 'Благоприятный период для сближения',
      body: 'Планетарный фон поддерживает открытые, тёплые отношения. Это хорошее время для важных разговоров, объяснений и новых знакомств. Эмоциональная открытость воспринимается хорошо.',
      tip: 'Скажите важному человеку то, что давно хотели.',
    },
    mid: {
      headline: 'Ровный фон, требующий внимательности',
      body: 'Отношения в целом стабильны, но небольшое напряжение может возникать из-за нереализованных ожиданий. Важно не додумывать за другого, а спрашивать прямо.',
      tip: 'Проявите инициативу — ждать идеального момента не стоит.',
    },
    low: {
      headline: 'Время для внутренней работы',
      body: 'Планетарные аспекты создают напряжение в сфере близости. Риск острых реакций и разочарований выше обычного. Лучше не начинать важных разговоров на высоком эмоциональном заряде.',
      tip: 'Дайте себе и партнёру пространство — решения подождут.',
    },
  },
  work: {
    high: {
      headline: 'Сильный рабочий фон',
      body: 'Небесная конфигурация поддерживает продуктивность, коммуникацию и продвижение инициатив. Хорошее время для презентаций, переговоров и старта проектов. Профессиональные контакты отрабатывают сильнее обычного.',
      tip: 'Выходите с инициативой — вас услышат.',
    },
    mid: {
      headline: 'Рабочий ритм требует фокуса',
      body: 'Фон нейтральный: результаты зависят преимущественно от вашей организованности, а не от планетарной поддержки. Избегайте распыления — выберите 2-3 приоритета и работайте с ними.',
      tip: 'Планируйте день блоками, минимизируйте переключения.',
    },
    low: {
      headline: 'Осторожно с важными шагами',
      body: 'Напряжённые аспекты могут проявляться в рабочей среде как конфликты, затянувшиеся переговоры или неожиданные задержки. Лучше завершать текущее, чем запускать новое.',
      tip: 'Откладывайте необратимые решения на 2-3 дня.',
    },
  },
  finance: {
    high: {
      headline: 'Поддерживающий финансовый фон',
      body: 'Юпитерианские и Венерианские влияния создают окно возможностей для финансовых решений. Переговоры по деньгам, инвестиционные идеи и партнёрские сделки поддержаны небесной конфигурацией.',
      tip: 'Фиксируйте договорённости письменно — удача любит точность.',
    },
    mid: {
      headline: 'Стабильный финансовый момент',
      body: 'Явных угроз и явных бонусов нет. Работает базовая дисциплина: считайте расходы, не принимайте импульсивных решений, откладывайте крупные вложения до появления большей ясности.',
      tip: 'Хороший момент для анализа финансовой картины.',
    },
    low: {
      headline: 'Повышенный финансовый риск',
      body: 'Сатурнианские или Плутонические напряжения создают риск неожиданных расходов и неустойчивых сделок. Держите финансовый резерв и избегайте необратимых вложений.',
      tip: 'Не спешите — подождите, когда картина станет яснее.',
    },
  },
  health: {
    high: {
      headline: 'Высокий ресурс',
      body: 'Планетарный фон поддерживает физическую активность и восстановление. Хорошее время для начала новых здоровых практик: спорт, режим сна, питание. Тело откликается на заботу лучше обычного.',
      tip: 'Заложите новую полезную привычку — приживётся.',
    },
    mid: {
      headline: 'Стабильный ресурс',
      body: 'Фон нейтральный. Следите за режимом, не перегружайте себя и поддерживайте базовые практики. Если есть хронические вопросы — хорошее время для профилактики.',
      tip: 'Добавьте 15 минут прогулки в распорядок дня.',
    },
    low: {
      headline: 'Фон требует бережности',
      body: 'Марсово-Сатурнианские или Нептунианские влияния снижают энергетический ресурс. Риск перегрева, перегрузки и мелких травм выше. Важно не игнорировать сигналы тела.',
      tip: 'Снизьте интенсивность, добавьте восстановительные паузы.',
    },
  },
  creative: {
    high: {
      headline: 'Вдохновляющий период',
      body: 'Нептун, Венера или Луна в активных аспектах создают мощный творческий импульс. Идеи приходят быстрее, образы ярче, интуиция усилена. Хорошее время для любых художественных проектов.',
      tip: 'Запишите все идеи — даже сумасшедшие могут оказаться золотыми.',
    },
    mid: {
      headline: 'Умеренная творческая энергия',
      body: 'Вдохновение есть, но требует активации. Погрузитесь в работу намеренно: переключение контекста, прогулка, музыка — и поток откроется. Творческий потенциал присутствует, просто его нужно "разогреть".',
      tip: 'Начните с малого — первые 10 минут самые трудные.',
    },
    low: {
      headline: 'Рационализация сильнее интуиции',
      body: 'Тяжёлые аспекты затрудняют свободный поток воображения. Сейчас сложнее "войти в зону". Лучше работать с уже начатым, редактировать и структурировать, чем начинать с нуля.',
      tip: 'Систематизируйте накопленное — это тоже творчество.',
    },
  },
};

// Moon sign interpretations (concise)
const MOON_SIGN_INTERP: Record<string, { mood: string; best: string; avoid: string }> = {
  'Овен':       { mood: 'Импульсивный, энергичный, быстрый', best: 'Решительные действия и новые старты', avoid: 'Конфликтов и поспешных выводов' },
  'Телец':      { mood: 'Устойчивый, чувственный, заземлённый', best: 'Финансовые решения и создание комфорта', avoid: 'Перемен без острой нужды' },
  'Близнецы':   { mood: 'Любознательный, общительный, изменчивый', best: 'Переговоров и обмена идеями', avoid: 'Поверхностных обязательств' },
  'Рак':        { mood: 'Чувствительный, интуитивный, домашний', best: 'Глубоких разговоров и заботы', avoid: 'Жёсткой критики — эмоциональная ранимость повышена' },
  'Лев':        { mood: 'Яркий, выразительный, щедрый', best: 'Публичных выступлений и творческих проектов', avoid: 'Борьбы за первенство' },
  'Дева':       { mood: 'Аналитический, внимательный, критичный', best: 'Систематизации и работы с деталями', avoid: 'Чрезмерного самокопания' },
  'Весы':       { mood: 'Гармоничный, дипломатичный, нерешительный', best: 'Переговоров, партнёрств и договорённостей', avoid: 'Откладывания важных решений' },
  'Скорпион':   { mood: 'Глубокий, интенсивный, проницательный', best: 'Трансформации и стратегического мышления', avoid: 'Манипуляций и скрытых игр' },
  'Стрелец':    { mood: 'Оптимистичный, философский, открытый', best: 'Дальних планов и образовательных шагов', avoid: 'Преувеличений и необдуманных обещаний' },
  'Козерог':    { mood: 'Собранный, целеустремлённый, дисциплинированный', best: 'Карьерных шагов и долгосрочных целей', avoid: 'Чрезмерной жёсткости к себе' },
  'Водолей':    { mood: 'Нестандартный, независимый, командный', best: 'Коллективных проектов и инновационных идей', avoid: 'Игнорирования эмоций ради принципов' },
  'Рыбы':       { mood: 'Интуитивный, эмпатичный, мечтательный', best: 'Творчества, медитации и духовных практик', avoid: 'Расплывчатых договорённостей' },
};

// Sun sign energy focus
const SUN_SIGN_FOCUS: Record<string, string> = {
  'Овен': 'инициатив и лидерства', 'Телец': 'стабильности и материального',
  'Близнецы': 'коммуникации и обучения', 'Рак': 'семьи и эмоционального мира',
  'Лев': 'самовыражения и творчества', 'Дева': 'порядка и здоровья',
  'Весы': 'партнёрства и баланса', 'Скорпион': 'трансформации и глубины',
  'Стрелец': 'расширения горизонтов', 'Козерог': 'карьеры и дисциплины',
  'Водолей': 'коллективного и новаторства', 'Рыбы': 'интуиции и духовности',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function computeSphereScores(
  keyAspects: string[],
  energy: string,
): Record<SphereKey, number> {
  const scores: Record<SphereKey, number> = { love: 50, work: 50, finance: 50, health: 50, creative: 50 };

  for (const aspectLine of keyAspects) {
    // Detect aspect type from the line
    let multiplier = 0;
    for (const [name, mult] of Object.entries(ASPECT_MULTIPLIER)) {
      if (aspectLine.toLowerCase().includes(name)) { multiplier = mult; break; }
    }
    if (multiplier === 0) continue;

    // Detect planets
    for (const [planet, weights] of Object.entries(PLANET_SPHERE_WEIGHT)) {
      if (aspectLine.includes(planet)) {
        for (const [sphere, weight] of Object.entries(weights ?? {})) {
          scores[sphere as SphereKey] = Math.max(0, Math.min(100,
            scores[sphere as SphereKey] + Math.round((weight as number) * multiplier)
          ));
        }
      }
    }
  }

  // Global energy adjustment
  const globalAdj = energy === 'благоприятный' ? 10 : energy === 'напряженный' ? -10 : 0;
  for (const k of Object.keys(scores) as SphereKey[]) {
    scores[k] = Math.max(0, Math.min(100, scores[k] + globalAdj));
  }
  return scores;
}

function scoreToLevel(score: number): EnergyLevel {
  return score >= 65 ? 'high' : score >= 42 ? 'mid' : 'low';
}

function scoreToColor(score: number): string {
  return score >= 65 ? '#22c55e' : score >= 42 ? '#f59e0b' : '#ef4444';
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

function buildEmailText(period: PeriodData, mode: string, dateLabel: string): string {
  const conf = ENERGY_CONFIG[period.energy] ?? ENERGY_CONFIG['переменный'];
  const moonInterp = MOON_SIGN_INTERP[period.moon_sign];
  const scores = computeSphereScores(period.key_aspects, period.energy);
  const lines: string[] = [
    `🌟 АСТРОСВОДКА ${mode.toUpperCase()} — ${dateLabel}`,
    `${'─'.repeat(50)}`,
    ``,
    `☀️ Солнце в знаке: ${SIGN_EMOJI[period.sun_sign] ?? ''} ${period.sun_sign}`,
    `☽ Луна в знаке: ${SIGN_EMOJI[period.moon_sign] ?? ''} ${period.moon_sign}`,
    `⚡ Общий фон: ${conf.label}`,
    `🎯 Главный фокус: ${period.focus}`,
    ``,
    `📖 ОБЩАЯ ИНТЕРПРЕТАЦИЯ`,
    period.interpretation,
    ``,
    period.advice ? `💡 СОВЕТ ПЕРИОДА\n${period.advice}` : '',
    ``,
    `🌙 НАСТРОЙ ЛУНЫ`,
    moonInterp ? `Луна в ${period.moon_sign}: ${moonInterp.mood}.\n✅ Лучшее время для: ${moonInterp.best}.\n⛔ Избегайте: ${moonInterp.avoid}.` : '',
    ``,
  ];

  if (period.key_aspects.length > 0) {
    lines.push(`🌌 КЛЮЧЕВЫЕ АСПЕКТЫ НЕБА`);
    period.key_aspects.forEach(a => lines.push(`• ${a}`));
    lines.push('');
  }

  lines.push(`💼 СФЕРЫ ЖИЗНИ`);
  for (const s of SPHERES) {
    const score = scores[s.key];
    const level = scoreToLevel(score);
    const interp = SPHERE_INTERP[s.key][level];
    lines.push(`${s.emoji} ${s.label.toUpperCase()}: ${interp.headline}`);
    lines.push(`   ${interp.body}`);
    lines.push(`   → ${interp.tip}`);
    lines.push('');
  }

  lines.push(`${'─'.repeat(50)}`);
  lines.push(`Астросводка сформирована автоматически на основе текущей конфигурации планет.`);
  lines.push(`Отправлено из ASTROCRM`);

  return lines.filter(l => l !== undefined).join('\n');
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Spin() { return <Loader2 className="h-4 w-4 animate-spin inline-block" />; }
function Err({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
      <AlertCircle className="h-4 w-4 shrink-0" />{msg}
    </div>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden bg-slate-700/30 w-full">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
}

function SphereCard({ sphere, score, isDark, defaultOpen = false }: {
  sphere: SphereInfo; score: number; isDark: boolean; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const level = scoreToLevel(score);
  const interp = SPHERE_INTERP[sphere.key][level];
  const color = scoreToColor(score);
  const Icon = sphere.icon;
  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${isDark ? sphere.darkBg : sphere.lightBg}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5">
        <Icon className={`h-4 w-4 shrink-0 ${isDark ? sphere.darkText : sphere.lightText}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-xs font-semibold ${isDark ? sphere.darkText : sphere.lightText}`}>{sphere.label}</span>
            <span className="text-xs font-bold" style={{ color }}>{score}</span>
          </div>
          <ScoreBar score={score} color={color} />
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 opacity-40 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 opacity-40 shrink-0" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className={`text-[11px] font-semibold ${isDark ? sphere.darkText : sphere.lightText}`}>{interp.headline}</p>
          <p className="text-[11px] opacity-75 leading-relaxed">{interp.body}</p>
          <div className={`rounded-lg px-2.5 py-2 text-[11px] font-medium ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
            💡 {interp.tip}
          </div>
        </div>
      )}
    </div>
  );
}

function AspectBadge({ line, isDark }: { line: string; isDark: boolean }) {
  const isHarmony = ['трин', 'секстиль', 'соединение'].some(h => line.toLowerCase().includes(h));
  const isTense   = ['квадрат', 'оппозиция'].some(h => line.toLowerCase().includes(h));
  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] leading-relaxed border ${
      isHarmony
        ? (isDark ? 'bg-green-900/15 border-green-500/20 text-green-300' : 'bg-green-50 border-green-200 text-green-700')
        : isTense
          ? (isDark ? 'bg-red-900/15 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-700')
          : (isDark ? 'bg-slate-800/50 border-slate-600/30' : 'bg-slate-50 border-slate-200')
    }`}>
      <span className="shrink-0 mt-0.5">{isHarmony ? '✨' : isTense ? '⚡' : '●'}</span>
      <span>{line}</span>
    </div>
  );
}

function MoonCard({ moonSign, isDark, theme }: { moonSign: string; isDark: boolean; theme: ThemeLike }) {
  const interp = MOON_SIGN_INTERP[moonSign];
  const emoji = SIGN_EMOJI[moonSign] ?? '🌙';
  if (!interp) return null;
  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-blue-900/15 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Moon className={`h-4 w-4 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
        <span className={`text-sm font-semibold ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
          Луна в {moonSign} {emoji}
        </span>
      </div>
      <div className="space-y-2">
        <p className={`text-xs ${theme.text} opacity-75`}><span className="font-medium opacity-100">Настрой:</span> {interp.mood}</p>
        <p className={`text-xs ${theme.text}`}>
          <span className={`font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>✅ Лучшее для:</span>{' '}
          <span className="opacity-75">{interp.best}</span>
        </p>
        <p className={`text-xs ${theme.text}`}>
          <span className={`font-medium ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>⛔ Избегайте:</span>{' '}
          <span className="opacity-75">{interp.avoid}</span>
        </p>
      </div>
    </div>
  );
}

// ── Email Subscription Modal ───────────────────────────────────────────────────

const LS_KEY = 'astro_email_sub';

function loadSub(): EmailSub {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as EmailSub;
  } catch { /* */ }
  return { email: '', frequency: 'daily', hour: '08:00', active: false };
}

function saveSub(s: EmailSub) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function EmailModal({
  isDark, theme, period, mode, dateLabel, onClose,
}: {
  isDark: boolean; theme: ThemeLike; period: PeriodData;
  mode: string; dateLabel: string; onClose: () => void;
}) {
  const [sub, setSub] = useState<EmailSub>(loadSub);
  const [tab, setTab]   = useState<'settings' | 'preview'>('settings');
  const [copied, setCopied] = useState(false);
  const emailText = useMemo(() => buildEmailText(period, mode, dateLabel), [period, mode, dateLabel]);

  const update = (patch: Partial<EmailSub>) => setSub(s => {
    const next = { ...s, ...patch };
    saveSub(next);
    return next;
  });

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  };

  const openMailto = () => {
    const subject = encodeURIComponent(`Астросводка ${mode} — ${dateLabel}`);
    const body = encodeURIComponent(emailText.slice(0, 1800)); // mailto body limit
    window.open(`mailto:${sub.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const frequencyLabels: Record<string, string> = {
    daily: 'Каждый день', weekly: 'Раз в неделю', monthly: 'Раз в месяц',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700/60' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <Mail className={`h-5 w-5 ${theme.accent}`} />
            <span className={`font-semibold ${theme.header}`}>Email-рассылка астросводки</span>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
            <X className="h-4 w-4 opacity-50" />
          </button>
        </div>

        {/* Tab bar */}
        <div className={`flex border-b ${isDark ? 'border-slate-700/60' : 'border-slate-100'}`}>
          {(['settings', 'preview'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${tab === t ? theme.tabActive : theme.tabInactive}`}>
              {t === 'settings' ? '⚙️ Настройки' : '👁 Предпросмотр'}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[65vh] overflow-y-auto">
          {tab === 'settings' ? (
            <div className="space-y-4">
              {/* Email address */}
              <div>
                <label className={`block text-xs font-semibold ${theme.accent} mb-1.5`}>Адрес получателя</label>
                <input
                  type="email"
                  value={sub.email}
                  onChange={e => update({ email: e.target.value })}
                  placeholder="your@email.com"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                />
              </div>

              {/* Frequency */}
              <div>
                <label className={`block text-xs font-semibold ${theme.accent} mb-1.5`}>Периодичность</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map(f => (
                    <button key={f} onClick={() => update({ frequency: f })}
                      className={`py-2 text-xs rounded-xl border font-medium transition-all ${sub.frequency === f ? theme.tabActive : theme.tabInactive}`}>
                      {f === 'daily' ? '📅 Ежедневно' : f === 'weekly' ? '📆 Еженедельно' : '🗓 Ежемесячно'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div>
                <label className={`block text-xs font-semibold ${theme.accent} mb-1.5`}>Время отправки</label>
                <input
                  type="time"
                  value={sub.hour}
                  onChange={e => update({ hour: e.target.value })}
                  className={`px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200'} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                />
              </div>

              {/* Active toggle */}
              <div className={`flex items-center justify-between rounded-xl p-3.5 border ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                <div>
                  <p className={`text-sm font-medium ${theme.header}`}>Рассылка активна</p>
                  <p className={`text-[11px] ${theme.text} opacity-50 mt-0.5`}>
                    {sub.active ? `${frequencyLabels[sub.frequency]} в ${sub.hour}` : 'Включите, чтобы получать сводки'}
                  </p>
                </div>
                <button onClick={() => update({ active: !sub.active })}
                  className={`w-12 h-6 rounded-full transition-all duration-300 relative ${sub.active ? 'bg-indigo-500' : (isDark ? 'bg-slate-600' : 'bg-slate-300')}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all duration-300 ${sub.active ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Info banner */}
              <div className={`rounded-xl p-3.5 border text-[11px] leading-relaxed ${isDark ? 'bg-amber-900/15 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <p className="font-semibold mb-1">ℹ️ Как работает рассылка</p>
                <p className="opacity-80">Настройки сохраняются в браузере. Кнопка «Открыть в почте» создаёт черновик письма с текущей сводкой. Для автоматической отправки по расписанию требуется подключение SMTP-сервиса на сервере.</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button onClick={openMailto} disabled={!sub.email}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${theme.btn} disabled:opacity-40`}>
                  <Send className="h-4 w-4" /> Открыть в почте
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end gap-2">
                <button onClick={copyText}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${theme.tabInactive}`}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
              <pre className={`text-[11px] leading-relaxed whitespace-pre-wrap rounded-xl p-4 border ${isDark ? 'bg-slate-800/60 border-slate-700/40 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'} font-mono`}>
                {emailText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Hourly timeline ────────────────────────────────────────────────────────────

function scoreHour(d: Date, hour: number): number {
  const weekday = d.getDay();
  const h = hour;
  const circadian  = Math.sin(((h - 7) / 24) * Math.PI * 2) * 18;
  const focusPeak  = Math.exp(-((h - 10.5) ** 2) / 18) * 28;
  const socialPeak = Math.exp(-((h - 16.5) ** 2) / 26) * 20;
  const nightDrop  = h >= 22 || h <= 5 ? -22 : 0;
  const weekBias   = [4, 7, 10, 8, 5, -2, 0][weekday] ?? 0;
  const jitter     = Math.sin((weekday + 1) * (h + 2)) * 4;
  return Math.max(0, Math.min(100, Math.round(44 + circadian + focusPeak + socialPeak + nightDrop + weekBias + jitter)));
}

const HOUR_LABELS: Record<number, string> = {
  6: 'рассвет', 9: 'утро', 12: 'полдень', 15: 'день', 18: 'вечер', 21: 'ночь',
};

function HourTimeline({ date, isDark, theme }: { date: string; isDark: boolean; theme: ThemeLike }) {
  const d = new Date(`${date}T12:00:00`);
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, score: scoreHour(d, h) }));
  const best3 = [...hours].sort((a, b) => b.score - a.score).slice(0, 3).map(x => x.h);
  const worst2 = [...hours].sort((a, b) => a.score - b.score).slice(0, 2).map(x => x.h);
  const maxH = Math.max(...hours.map(x => x.score));
  const barH = 36; // px max bar height

  return (
    <div>
      <div className="flex items-end gap-[2px] h-10 mb-1">
        {hours.map(({ h, score }) => {
          const isBest  = best3.includes(h);
          const isWorst = worst2.includes(h);
          const height  = Math.max(3, Math.round((score / maxH) * barH));
          return (
            <div key={h} title={`${String(h).padStart(2,'0')}:00 — ${score}%`}
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${height}px`,
                backgroundColor: isBest ? '#22c55e' : isWorst ? '#ef4444' : (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(99,102,241,0.35)'),
              }}
            />
          );
        })}
      </div>
      {/* Hour labels */}
      <div className="flex relative h-4">
        {[0, 6, 9, 12, 15, 18, 21].map(h => (
          <div key={h} className="absolute text-[8px] opacity-40" style={{ left: `${(h / 24) * 100}%` }}>
            {HOUR_LABELS[h] ?? String(h).padStart(2,'0')}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex gap-3 mt-2">
        {[
          { color: '#22c55e', label: `Пики: ${best3.map(h => `${String(h).padStart(2,'0')}:00`).join(', ')}` },
          { color: '#ef4444', label: `Спады: ${worst2.map(h => `${String(h).padStart(2,'0')}:00`).join(', ')}` },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className={`text-[10px] ${theme.text} opacity-60`}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AstroSummaryBlock({ theme }: Props) {
  const isDark = theme.wheelTheme === 'dark';
  const today = new Date().toISOString().slice(0, 10);

  const [mode,    setMode]    = useState<'day'|'week'|'month'|'year'>('day');
  const [date,    setDate]    = useState(today);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [data,    setData]    = useState<SummaryData | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [hasSub, setHasSub]   = useState(() => loadSub().active);

  // Auto-load on mount
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const resp = await getAstroSummary(date, '12:00') as SummaryData;
      setData(resp);
    } catch {
      setError('Сервер недоступен — используется локальный режим интерпретаций.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  // Build local fallback period when no server data
  const localPeriod = useMemo<PeriodData>(() => {
    const d = new Date(`${date}T12:00:00`);
    const weekday = d.getDay();
    const ENERGY_BY_DOW = ['переменный','благоприятный','благоприятный','напряженный','благоприятный','переменный','созерцательный'] as const;
    const energy = ENERGY_BY_DOW[weekday] ?? 'переменный';
    return {
      label: mode,
      start_date: date,
      end_date: date,
      sun_sign: 'Овен',
      moon_sign: 'Телец',
      energy,
      focus: 'баланса и осознанных решений',
      key_aspects: [],
      advice: 'Сфокусируйтесь на трёх ключевых задачах и не распыляйтесь на второстепенное.',
      interpretation: `Общий астрологический фон ${mode === 'day' ? 'дня' : mode === 'week' ? 'недели' : mode === 'month' ? 'месяца' : 'года'}: ${energy}. Ключевое направление — ${SUN_SIGN_FOCUS['Овен'] ?? 'баланс'}. Хороший момент для действий с ясной целью.`,
    };
  }, [date, mode]);

  const period: PeriodData = useMemo(() => {
    if (!data?.periods) return localPeriod;
    return data.periods[mode] ?? localPeriod;
  }, [data, mode, localPeriod]);

  const energyConf = ENERGY_CONFIG[period.energy] ?? ENERGY_CONFIG['переменный'];
  const sphereScores = useMemo(() => computeSphereScores(period.key_aspects, period.energy), [period]);
  const sunEmoji  = SIGN_EMOJI[period.sun_sign]  ?? '☀️';
  const moonEmoji = SIGN_EMOJI[period.moon_sign] ?? '🌙';

  const dateLabel = useMemo(() => {
    if (mode === 'day')   return formatDate(date);
    if (mode === 'week')  return `Неделя с ${formatDate(period.start_date)}`;
    if (mode === 'month') return `Месяц с ${formatDate(period.start_date)}`;
    return `${new Date(`${date}T12:00:00`).getFullYear()} год`;
  }, [mode, date, period.start_date]);

  return (
    <div className="space-y-4">
      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 ${theme.card}`}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={`text-xs ${theme.text} mb-1.5 block opacity-60`}>База даты</label>
            <DateSegmentInput value={date} onChange={setDate}
              className={`px-3 py-2 rounded-xl border text-sm ${theme.card}`} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {([
              ['day',   '☀️ День'],
              ['week',  '📅 Неделя'],
              ['month', '🌙 Месяц'],
              ['year',  '🌌 Год'],
            ] as const).map(([k, label]) => (
              <button key={k} onClick={() => setMode(k)}
                className={`px-3 py-2 text-xs rounded-xl border font-medium transition-all ${mode === k ? theme.tabActive : theme.tabInactive}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={run} disabled={loading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${theme.btn}`}>
              {loading ? <Spin /> : <RefreshCw className="h-4 w-4" />}
              {loading ? 'Загрузка…' : 'Обновить'}
            </button>
            <button onClick={() => setEmailOpen(true)}
              title="Настроить email-рассылку"
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${theme.tabInactive}`}>
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
              {hasSub && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-current" />
              )}
            </button>
          </div>
        </div>
      </div>

      {error && <Err msg={error} />}

      {/* ── Hero card ────────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border overflow-hidden ${isDark
        ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900/60 border-indigo-500/25'
        : 'bg-gradient-to-br from-indigo-50 to-amber-50 border-indigo-200'}`}>
        <div className="p-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className={`text-lg font-black ${theme.header}`}>🌟 Астросводка</h3>
              <p className={`text-xs ${theme.text} opacity-55 mt-0.5`}>{dateLabel}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${energyConf.bg}`}
              style={{ color: energyConf.color }}>
              {energyConf.icon} {energyConf.label}
            </span>
          </div>

          {/* Sun + Moon */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={`rounded-xl p-3 ${isDark ? 'bg-amber-900/15 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Sun className={`h-4 w-4 ${isDark ? 'text-amber-300' : 'text-amber-600'}`} />
                <span className={`text-[11px] font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Солнце</span>
              </div>
              <p className={`text-sm font-bold ${theme.header}`}>{sunEmoji} {period.sun_sign}</p>
              <p className={`text-[10px] ${theme.text} opacity-55 mt-0.5`}>{SUN_SIGN_FOCUS[period.sun_sign] ?? 'развития'}</p>
            </div>
            <div className={`rounded-xl p-3 ${isDark ? 'bg-blue-900/15 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Moon className={`h-4 w-4 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                <span className={`text-[11px] font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Луна</span>
              </div>
              <p className={`text-sm font-bold ${theme.header}`}>{moonEmoji} {period.moon_sign}</p>
              <p className={`text-[10px] ${theme.text} opacity-55 mt-0.5`}>
                {MOON_SIGN_INTERP[period.moon_sign]?.mood?.split(',')[0] ?? ''}
              </p>
            </div>
          </div>

          {/* Focus */}
          <div className={`rounded-xl px-3.5 py-3 mb-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white/70 border border-slate-100'}`}>
            <p className={`text-xs font-semibold ${theme.accent} mb-1`}>🎯 Главный фокус периода:</p>
            <p className={`text-sm font-medium ${theme.header}`}>{period.focus}</p>
          </div>

          {/* Interpretation */}
          <p className={`text-sm leading-relaxed ${theme.text} opacity-80`}>{period.interpretation}</p>
        </div>
      </div>

      {/* ── Key aspects ──────────────────────────────────────────────────────── */}
      {period.key_aspects.length > 0 && (
        <div className={`rounded-2xl border p-4 ${theme.card}`}>
          <h4 className={`text-sm font-semibold ${theme.header} mb-3 flex items-center gap-2`}>
            <Star className="h-4 w-4" /> Ключевые аспекты неба
          </h4>
          <div className="space-y-2">
            {period.key_aspects.map((line, i) => (
              <AspectBadge key={i} line={line} isDark={isDark} />
            ))}
          </div>
          <p className={`text-[10px] ${theme.text} opacity-40 mt-3`}>
            Орбис до 3–4° — только самые точные аспекты, формирующие общий небесный фон.
          </p>
        </div>
      )}

      {/* ── Moon card ────────────────────────────────────────────────────────── */}
      <MoonCard moonSign={period.moon_sign} isDark={isDark} theme={theme} />

      {/* ── Spheres ──────────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 ${theme.card}`}>
        <h4 className={`text-sm font-semibold ${theme.header} mb-3 flex items-center gap-2`}>
          <Zap className="h-4 w-4" /> Сферы жизни
          <span className={`text-[10px] ml-1 ${theme.text} opacity-40`}>— общий планетарный фон, без учёта натальной карты</span>
        </h4>
        <div className="space-y-2">
          {SPHERES.map((s, i) => (
            <SphereCard
              key={s.key}
              sphere={s}
              score={sphereScores[s.key]}
              isDark={isDark}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      </div>

      {/* ── Advice ───────────────────────────────────────────────────────────── */}
      {period.advice && (
        <div className={`rounded-2xl border p-4 ${isDark
          ? 'bg-indigo-900/20 border-indigo-500/25'
          : 'bg-indigo-50 border-indigo-200'}`}>
          <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>
            <Zap className="h-4 w-4" /> Стратегия периода
          </h4>
          <p className={`text-sm leading-relaxed ${theme.text} opacity-80`}>{period.advice}</p>
        </div>
      )}

      {/* ── Hourly timeline (day / week mode) ────────────────────────────────── */}
      {(mode === 'day' || mode === 'week') && (
        <div className={`rounded-2xl border p-4 ${theme.card}`}>
          <h4 className={`text-sm font-semibold ${theme.header} mb-3 flex items-center gap-2`}>
            <Clock className="h-4 w-4" /> Энергия в течение дня
          </h4>
          <HourTimeline date={date} isDark={isDark} theme={theme} />
          <p className={`text-[10px] ${theme.text} opacity-35 mt-3`}>
            * Расчёт по суточным ритмам (циркадный, фокус-пик, социальный пик). Без учёта планетарных позиций.
          </p>
        </div>
      )}

      {/* ── Email modal ──────────────────────────────────────────────────────── */}
      {emailOpen && (
        <EmailModal
          isDark={isDark}
          theme={theme}
          period={period}
          mode={mode === 'day' ? 'Дня' : mode === 'week' ? 'Недели' : mode === 'month' ? 'Месяца' : 'Года'}
          dateLabel={dateLabel}
          onClose={() => {
            setEmailOpen(false);
            setHasSub(loadSub().active);
          }}
        />
      )}
    </div>
  );
}

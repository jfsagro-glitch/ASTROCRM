// ─── DashboardView — Redesigned bento-grid daily dashboard ──────────────────
// Rebuilt for better information hierarchy, visual clarity, and usability.
import React, { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import {
  Moon, Star, Zap, TrendingUp, Sparkles, Shield,
  AlertTriangle, CheckCircle, RefreshCw, Info, ChevronDown, ChevronUp,
  AlertCircle, Calendar, Globe, Heart, Briefcase, DollarSign,
  Activity, Palette, MapPin, Clock,
} from 'lucide-react';
import {
  getDashboard, invalidateDashboardCache, getDailyGlobal, getCompensatoryForecast,
  DailyGlobalResult, CompensatoryForecastResult, ForecastWindow,
} from '../services/astrologyService';
import type { DashboardData } from '../services/astrologyService';
import type { BirthInput } from '../types/astro';
import NowStrip from './NowStrip';
import HourlyTimeline from './HourlyTimeline';
import LunationCard from './LunationCard';
// Lazy-loaded — these aren't above the fold and add ~50KB+ to initial bundle.
const LunarCalendarCard   = lazy(() => import('./LunarCalendarCard'));
const SolarReturnDashCard = lazy(() => import('./SolarReturnDashCard'));
const DashboardCharts     = lazy(() => import('./DashboardCharts'));
const DayCardShare        = lazy(() => import('./DayCardShare'));
const NotificationTimeSettings = lazy(() => import('./NotificationTimeSettings'));
import { useAppMode } from '../hooks/useAppMode';
import { useVisitStreak } from '../hooks/useVisitStreak';
import { haptic } from '../hooks/useHaptic';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import AnimatedNumber from './AnimatedNumber';
import { getFirdariaSubInterpretation } from '../data/firdariaSubPeriods';

// ─── Theme type ───────────────────────────────────────────────────────────────
interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
}

interface Props {
  birthData: BirthInput;
  theme: ThemeLike;
  userId?: string;
}

function _isDark(theme: ThemeLike): boolean {
  return theme.card.includes('bg-gray-9') || theme.card.includes('bg-slate-9')
    || theme.card.includes('bg-zinc-9') || theme.card.includes('bg-neutral-9')
    || theme.card.includes('border-white') || theme.card.includes('bg-gray-8')
    || theme.header.includes('text-white') || theme.text.includes('text-gray-3')
    || theme.text.includes('text-slate-3') || theme.text.includes('text-white');
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PHASE_EMOJI: Record<string, string> = {
  new_moon: '🌑', waxing_crescent: '🌒', first_quarter: '🌓',
  waxing_gibbous: '🌔', full_moon: '🌕', waning_gibbous: '🌖',
  last_quarter: '🌗', waning_crescent: '🌘',
};
const PHASE_RU: Record<string, string> = {
  new_moon: 'Новолуние', waxing_crescent: 'Растущий серп',
  first_quarter: 'Первая четверть', waxing_gibbous: 'Растущая луна',
  full_moon: 'Полнолуние', waning_gibbous: 'Убывающая луна',
  last_quarter: 'Последняя четверть', waning_crescent: 'Убывающий серп',
};
const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};
const PLANET_GL: Record<string, string> = {
  sun:'☀', moon:'☽', mercury:'☿', venus:'♀', mars:'♂', jupiter:'♃',
  saturn:'♄', uranus:'⛢', neptune:'♆', pluto:'♇', node:'☊', chiron:'⚷',
  lilith:'⚸', asc:'AC', mc:'MC', dc:'DC', ic:'IC', southnode:'☋', ceres:'⚳',
};
const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран',
  neptune: 'Нептун', pluto: 'Плутон', node: 'Узел', chiron: 'Хирон',
  lilith: 'Лилит', asc: 'Асц', mc: 'MC', dc: 'Десц', ic: 'IC',
  southnode: 'Ю.Узел', ceres: 'Церера',
};
const ASPECT_SYM: Record<string, string> = {
  conjunction:'☌', opposition:'☍', trine:'△', square:'□',
  sextile:'⚹', quincunx:'⚻', semisextile:'⌲', semisquare:'∠',
  sesquiquadrate:'⌓', sesquisquare:'⌓', biquintile:'⬡', quintile:'⬠',
  novile:'⬟', semi_square:'∠', bi_quintile:'⬡',
};
const ASPECT_NAME: Record<string, string> = {
  conjunction:'соединение', opposition:'оппозиция', trine:'трин',
  square:'квадрат', sextile:'секстиль', quincunx:'квиникункс',
  semisextile:'полусекстиль', semisquare:'полуквадрат',
  sesquiquadrate:'полутораквадрат', sesquisquare:'полутораквадрат',
  biquintile:'биквинтиль', quintile:'квинтиль', novile:'новиль',
  semi_square:'полуквадрат', bi_quintile:'биквинтиль',
};
const ASPECT_COLOR: Record<string, string> = {
  trine: 'text-blue-400', sextile: 'text-cyan-400',
  conjunction: 'text-violet-400',
  square: 'text-red-400', opposition: 'text-orange-400',
  quincunx: 'text-amber-400',
};
const NATURE_CONFIG = {
  benefic: { label:'Благоприятный', color:'text-emerald-400', bg:'bg-emerald-500/10 border-emerald-500/30', dot:'bg-emerald-400', icon:'▲' },
  malefic: { label:'Напряжённый',   color:'text-red-400',     bg:'bg-red-500/10 border-red-500/30',         dot:'bg-red-400',     icon:'▼' },
  mixed:   { label:'Смешанный',     color:'text-amber-400',   bg:'bg-amber-500/10 border-amber-500/30',     dot:'bg-amber-400',   icon:'~' },
};
// Per-planet color tone — used for retro badges, glyph accents, transit chips.
const PLANET_TONE: Record<string, { text: string; bg: string; border: string; ring: string }> = {
  sun:     { text: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   ring: '#f59e0b' },
  moon:    { text: 'text-slate-200',   bg: 'bg-slate-400/10',   border: 'border-slate-400/30',   ring: '#cbd5e1' },
  mercury: { text: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    ring: '#06b6d4' },
  venus:   { text: 'text-pink-300',    bg: 'bg-pink-500/10',    border: 'border-pink-500/30',    ring: '#ec4899' },
  mars:    { text: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     ring: '#ef4444' },
  jupiter: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', ring: '#10b981' },
  saturn:  { text: 'text-stone-300',   bg: 'bg-stone-500/10',   border: 'border-stone-500/30',   ring: '#a8a29e' },
  uranus:  { text: 'text-sky-300',     bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     ring: '#0ea5e9' },
  neptune: { text: 'text-indigo-300',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',  ring: '#6366f1' },
  pluto:   { text: 'text-fuchsia-300', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', ring: '#d946ef' },
  chiron:  { text: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  ring: '#f97316' },
  lilith:  { text: 'text-purple-300',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  ring: '#a855f7' },
};
function planetTone(p: string) {
  return PLANET_TONE[p] ?? { text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/30', ring: '#8b5cf6' };
}

const RETRO_MEANING: Record<string, string> = {
  mercury: 'пересмотр планов, техника капризна',
  venus:   'прошлое в отношениях всплывает',
  mars:    'энергия уходит внутрь, не во вне',
  jupiter: 'расширение через переосмысление',
  saturn:  'уроки прошлых ограничений',
  uranus:  'революция ревизии',
  neptune: 'иллюзии обнажаются',
  pluto:   'власть переосмысливается',
};
const TRANSIT_QUICK_THEME: Partial<Record<string, Partial<Record<string, string>>>> = {
  jupiter: { conjunction: 'расширение и рост', trine: 'попутный ветер удачи', sextile: 'возможность', square: 'рост через преодоление', opposition: 'баланс и поиск меры' },
  saturn:  { conjunction: 'структурный экзамен', trine: 'плоды дисциплины', square: 'ограничение → рост', opposition: 'проверка зрелости' },
  mars:    { conjunction: 'мощный импульс', trine: 'энергия в ресурсе', square: 'трение → действие', opposition: 'конкуренция / конфликт' },
  venus:   { conjunction: 'притяжение', trine: 'гармония', square: 'проверка ценностей', sextile: 'приятное совпадение' },
  mercury: { conjunction: 'ясность мышления', trine: 'договорённости идут', square: 'путаница в словах', opposition: 'точки зрения расходятся' },
  moon:    { conjunction: 'эмоциональный пик', trine: 'интуиция работает', square: 'перепады настроения', opposition: 'зеркало чувств' },
  uranus:  { conjunction: 'неожиданный поворот', trine: 'прорыв', square: 'нестабильность' },
  neptune: { conjunction: 'туман / вдохновение', trine: 'интуиция / мистика', square: 'иллюзии' },
  pluto:   { conjunction: 'трансформация', trine: 'глубина', square: 'контроль / кризис' },
};
const FIRDARIA_NARRATIVE: Record<string, string> = {
  sun:     'Ваш солнечный период: пора самовыражения, лидерства, признания.',
  moon:    'Лунный цикл: всё внутреннее выходит наружу. Семья, дом, интуиция.',
  mercury: 'Меркурианское время: переговоры, обучение, связи.',
  venus:   'Венерианский период: отношения, деньги, творчество.',
  mars:    'Марсианский цикл: энергия высокая, конкуренция жёсткая.',
  jupiter: 'Период Юпитера: расширение, рост, удача. Один из лучших периодов.',
  saturn:  'Сатурнианский цикл: уроки, ограничения, строительство.',
  uranus:  'Уранический период: перемены без предупреждения. Гибкость — ваш навык.',
  neptune: 'Нептунианское время: растворение старого, духовный поиск.',
  pluto:   'Плутонианский цикл: трансформация в глубину. Рождается то, что настоящее.',
};
const HOUSE_THEME: Record<number, string> = {
  1:'идентичность и тело', 2:'ресурсы и ценности', 3:'коммуникации',
  4:'дом и семья', 5:'творчество и дети', 6:'здоровье и работа',
  7:'партнёрство', 8:'трансформация', 9:'путешествия и философия',
  10:'карьера и статус', 11:'друзья и цели', 12:'тайны и уединение',
};
const FORTUNE_SIGN_INTERP: Record<string, string> = {
  aries:       'Удача приходит через действие и инициативу — не через ожидание.',
  taurus:      'Фортуна улыбается терпеливым. Деньги идут к тем, кто строит медленно.',
  gemini:      'Везение в словах, связях и информации. Нужный человек — рядом.',
  cancer:      'Удача приходит через заботу и семейные связи.',
  leo:         'Фортуна любит тех, кто выходит на сцену. Не прячьтесь.',
  virgo:       'Везение — в деталях и мастерстве. Делайте лучше других.',
  libra:       'Удача через партнёрство. Правильный союз — ключ к фортуне.',
  scorpio:     'Фортуна скрыта. Ищите возможности там, где другие боятся смотреть.',
  sagittarius: 'Везение в дальних горизонтах. Путешествуйте, учитесь, расширяйтесь.',
  capricorn:   'Удача приходит к тем, кто работает, когда другие отдыхают.',
  aquarius:    'Фортуна в неожиданных связях и нестандартных решениях.',
  pisces:      'Интуиция — ваш навигатор к удаче. Слушайте сны и предчувствия.',
};
const PLANET_DIRECTION: Record<string, { dir: string; places: string; travel: string }> = {
  sun:     { dir: 'Восток', places: 'столичные города, горные регионы, открытые пространства', travel: 'Путешествие на восток или в места силы укрепит солнечную энергию' },
  moon:    { dir: 'Запад / побережье', places: 'города у воды, острова, курорты', travel: 'Вода и прибрежные места питают лунную энергию — поезжайте к морю или реке' },
  mercury: { dir: 'Северо-восток', places: 'торговые хабы, университетские города, транспортные узлы', travel: 'Деловые поездки и короткие путешествия в год Меркурия особенно продуктивны' },
  venus:   { dir: 'Юго-восток / юг', places: 'культурные столицы, spa-курорты, цветущие города', travel: 'Путешествие в красивые места — не роскошь, а компенсаторная практика года Венеры' },
  mars:    { dir: 'Юг', places: 'спортивные и горные регионы, динамичные города', travel: 'Активный отдых, поход в горы или на природу даст нужную разрядку Марса' },
  jupiter: { dir: 'Северо-запад / заграница', places: 'иностранные страны, университетские города, религиозные центры', travel: 'Год Юпитера — обязательно одно зарубежное или дальнее путешествие' },
  saturn:  { dir: 'Запад / север', places: 'деловые центры, исторические города, уединённые места', travel: 'Сатурн не любит бесцельных поездок — путешествуйте с конкретной целью' },
  uranus:  { dir: 'Север', places: 'технологические хабы, нестандартные места, авангардные города', travel: 'Неожиданная поездка в непривычное место — именно то, что нужно в год Урана' },
  neptune: { dir: 'Запад / океан', places: 'прибрежные курорты, духовные центры, острова', travel: 'Ретрит у воды, остров, тихое место — идеальная поездка для нептунианского года' },
  pluto:   { dir: 'Юго-запад / далеко', places: 'места трансформации, дальние путешествия, пустыня', travel: 'Поездка в кардинально иную среду может запустить глубокую трансформацию' },
  node:    { dir: 'Новые горизонты', places: 'незнакомые места, непривычные культуры', travel: 'Год Узла благоприятствует поездкам в новые, незнакомые места' },
  lilith:  { dir: 'Дикие, нетронутые места', places: 'природа, уединённые локации', travel: 'Природа и уединение помогают интегрировать энергию Лилит' },
};
const HOUSE_LOCATION_ADVICE: Record<number, string> = {
  1: 'Ваша текущая локация работает на вас — вы заметны и притягательны там, где уже есть.',
  2: 'Стабильное место — залог финансового роста. Не уезжайте надолго в год 2-го дома.',
  3: 'Короткие поездки и переезды особенно благоприятны. Смена обстановки питает.',
  4: 'Год 4-го дома — год обустройства места. Путешествуйте, но возвращайтесь к своей базе.',
  5: 'Курорты, творческие места, романтические локации — идеальны для поездок года.',
  6: 'Путешествия работают только как отдых и восстановление. Не берите работу в поездки.',
  7: 'Партнёрские поездки усиливают связь. Съездите куда-то вдвоём — это лучше любого разговора.',
  8: 'Поездки в трансформирующие места — горы, пустыни, монастыри — дают глубину.',
  9: 'Год путешествий по определению. Запланируйте минимум одну дальнюю поездку.',
  10: 'Профессиональные поездки и командировки особенно результативны в год 10-го дома.',
  11: 'Коллективные путешествия, конференции, фестивали — лучший формат поездок года.',
  12: 'Уединённые ретриты и тихие места — то, что нужно. Избегайте шумных туристических мест.',
};
const DAY_NARRATIVES: Record<string, string[]> = {
  high: [
    'Небо работает на вас — используйте каждый час.',
    'Юпитер расчищает путь. Действуйте смело.',
    'Такие дни бывают раз в месяц. Не сидите дома.',
  ],
  mid: [
    'День без особого попутного ветра — чистая личная воля.',
    'Планеты нейтральны. Всё, что получится — вашими руками.',
    'Тихий фон: хорошо для глубокой работы, плохо для стартов.',
  ],
  low: [
    'Давление есть — это не сигнал остановиться, а сигнал замедлиться.',
    'Напряжённый фон. Важные решения — не сегодня.',
    'Сохраняйте силы. Конфликты сейчас стоят дороже.',
  ],
};
function getDayNarrative(score: number): string {
  const pool = score >= 65 ? DAY_NARRATIVES.high : score <= 40 ? DAY_NARRATIVES.low : DAY_NARRATIVES.mid;
  return pool[new Date().getDate() % pool.length];
}
function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 17) return 'Добрый день';
  if (h < 22) return 'Добрый вечер';
  return 'Доброй ночи';
}

// ─── VoC countdown ────────────────────────────────────────────────────────────
function useVocCountdown(vocEndJd: number | null): string | null {
  const [label, setLabel] = useState<string | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!vocEndJd) { setLabel(null); return; }
    const endMs = (vocEndJd - 2440587.5) * 86400000;
    function tick() {
      const diff = endMs - Date.now();
      if (diff <= 0) { setLabel(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(h > 0 ? `${h}ч ${m}м` : `${m}м`);
      rafRef.current = window.setTimeout(tick, 30000);
    }
    tick();
    return () => { if (rafRef.current) clearTimeout(rafRef.current); };
  }, [vocEndJd]);
  return label;
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, children, className = '', theme, badge, accent }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  className?: string; theme: ThemeLike; badge?: React.ReactNode; accent?: string;
}) {
  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden card-lift ${className}`}>
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10">
        <Icon size={16} className={accent ?? theme.accent} aria-hidden="true" />
        <h3 className={`text-sm font-semibold ${theme.header} m-0`}>{title}</h3>
        {badge && <div className="ml-auto flex items-center gap-1.5">{badge}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Circular score ring ──────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 56, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  const color = score >= 65 ? '#22c55e' : score <= 40 ? '#ef4444' : '#f59e0b';
  const label = score >= 65 ? 'Удача' : score <= 40 ? 'Стой' : 'Нейтр';
  const labelFull = score >= 65 ? 'благоприятно' : score <= 40 ? 'неблагоприятно' : 'нейтрально';
  const isLucky = score >= 65;
  return (
    <div
      className={`relative w-[140px] h-[140px] shrink-0 ${isLucky ? 'score-ring-pulse' : ''}`}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${score} из 100 — ${labelFull}`}
      aria-label="Общий астрологический балл дня"
    >
      <svg width="140" height="140" className="-rotate-90" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`ring-grad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#ring-grad-${score})`} strokeWidth="9"
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 10px ${color}aa)`, transition: 'stroke-dasharray 700ms ease-out' }}>
          {isLucky && (
            <animate
              attributeName="stroke-dashoffset"
              values={`0;${-circumference * 0.05};0`}
              dur="3s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true" style={{ color }}>
        <AnimatedNumber value={score} className="text-4xl font-bold leading-none tracking-tight" />
        <span className="text-xs leading-none mt-1 font-semibold uppercase tracking-widest" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

// ─── Trend3d ──────────────────────────────────────────────────────────────────
function Trend3d({ trend }: { trend: { yesterday: number; today: number; tomorrow: number } }) {
  const items: Array<[string, number]> = [
    ['вчера',   trend.yesterday],
    ['сегодня', trend.today],
    ['завтра',  trend.tomorrow],
  ];
  const max = Math.max(...items.map(([, v]) => v));
  const arrow = trend.tomorrow > trend.today + 5 ? '↗' : trend.tomorrow < trend.today - 5 ? '↘' : '→';
  const arrowColor = trend.tomorrow > trend.today + 5 ? '#22c55e' : trend.tomorrow < trend.today - 5 ? '#ef4444' : '#94a3b8';
  return (
    <div className="mt-2 flex items-end gap-1.5" aria-label="Динамика 3 дня">
      {items.map(([label, val], i) => {
        const isToday = i === 1;
        const c = val >= 65 ? '#22c55e' : val <= 40 ? '#ef4444' : '#f59e0b';
        const h = 12 + (val / max) * 18;
        return (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] tabular-nums font-semibold" style={{ color: isToday ? c : 'rgba(255,255,255,0.55)' }}>
              {val}
            </span>
            <div
              className="w-3 rounded-sm transition-all"
              style={{
                height: `${h}px`,
                background: c,
                opacity: isToday ? 1 : 0.55,
                outline: isToday ? '1px solid rgba(255,255,255,0.4)' : 'none',
              }}
            />
            <span className={`text-[8px] uppercase tracking-wider ${isToday ? 'text-white/80 font-semibold' : 'text-white/40'}`}>
              {label}
            </span>
          </div>
        );
      })}
      <span className="ml-1 text-base leading-none" style={{ color: arrowColor }} aria-hidden="true">{arrow}</span>
    </div>
  );
}

// ─── SphereBar ────────────────────────────────────────────────────────────────
function SphereBar({ icon: Icon, label, score, color }: {
  icon: React.ElementType; label: string; score: number; color: string;
}) {
  const barColor = score >= 65 ? '#22c55e' : score <= 40 ? '#ef4444' : '#f59e0b';
  const tone = score >= 65 ? 'благоприятно' : score <= 40 ? 'неблагоприятно' : 'нейтрально';
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={16} className={color} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] text-white/70">{label}</span>
          <span className="text-[11px] font-bold" style={{ color: barColor }} aria-hidden="true">{score}</span>
        </div>
        <div
          className="h-1.5 rounded-full bg-white/10 overflow-hidden"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${score} из 100 — ${tone}`}
          aria-label={`${label}: прогноз дня`}
        >
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: barColor, boxShadow: `0 0 6px ${barColor}60` }} />
        </div>
      </div>
    </div>
  );
}

// ─── HeroCard ─────────────────────────────────────────────────────────────────
// ─── Practice shape helper ────────────────────────────────────────────────────
// Backend may return practices as string[] (per-planet) or object[] (pair).
// Normalize to {practice, why?, timing?} for uniform rendering.
type NormPractice = { practice: string; why?: string; timing?: string };
function normalizePractices(raw: unknown): NormPractice[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p): NormPractice | null => {
      if (typeof p === 'string') return p.trim() ? { practice: p.trim() } : null;
      if (p && typeof p === 'object') {
        const o = p as Record<string, unknown>;
        const practice = String(o.practice ?? o.action ?? o.title ?? '').trim();
        if (!practice) return null;
        return {
          practice,
          why: o.why ? String(o.why) : undefined,
          timing: o.timing ? String(o.timing) : undefined,
        };
      }
      return null;
    })
    .filter((p): p is NormPractice => p !== null);
}

// Timing hint based on orb + applying flag (personalized to the transit)
function orbTiming(orb: number | undefined, applying: boolean | undefined): string {
  if (orb === undefined || isNaN(orb)) return '';
  if (orb <= 0.3) return applying ? 'точный — пик сегодня' : 'точный — уходит сегодня';
  if (orb <= 1.0) return applying ? 'пик ближайшие 1–3 дня' : 'ослабевает 1–3 дня';
  if (orb <= 2.0) return applying ? 'нарастает, пик через 3–7 дней' : 'отходит 3–7 дней';
  return applying ? 'подходит, пик через 7–14 дней' : 'удаляется';
}

// Small badge for PERSONAL vs GENERAL marker
function ScopeBadge({ scope }: { scope: 'personal' | 'general' }) {
  const isP = scope === 'personal';
  const label = isP ? 'Рассчитано по натальным данным этого клиента' : 'Общий астрофон, одинаковый для всех';
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={
        'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-widest font-semibold border ' +
        (isP
          ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/15'
          : 'border-sky-400/40 text-sky-200 bg-sky-500/15')
      }
    >
      <span aria-hidden="true">{isP ? '● персональное' : '○ общее'}</span>
    </span>
  );
}

// ─── ELEMENT_RU / MODALITY_RU for PersonalIdentityCard ───────────────────────
const ELEMENT_RU: Record<string, string> = {
  fire: 'огонь', earth: 'земля', air: 'воздух', water: 'вода',
};
const ELEMENT_EMOJI: Record<string, string> = {
  fire: '🔥', earth: '⛰', air: '💨', water: '💧',
};
const MODALITY_RU: Record<string, string> = {
  cardinal: 'кардинальная', fixed: 'фиксированная', mutable: 'мутабельная',
};
const SHAPE_RU: Record<string, string> = {
  bundle: 'узкий фокус (до 120°)',
  bowl: 'чаша — полусфера',
  bucket: 'ведро — с «ручкой»',
  locomotive: 'локомотив — 240° заполнено',
  seesaw: 'качели — две группы',
  splash: 'всплеск — равномерно',
  splay: 'разветвление — несколько групп',
};

// ─── PersonalIdentityCard ─────────────────────────────────────────────────────
// Top-of-dashboard personal anchor: who this report is for + natal essence.
function PersonalIdentityCard({
  data, birthData, theme,
}: { data: DashboardData; birthData: BirthInput; theme: ThemeLike }) {
  const essence = (data.natal_essence ?? {}) as NonNullable<DashboardData['natal_essence']>;
  const analysis = (data.chart_analysis ?? {}) as Record<string, unknown>;
  const sun = essence.sun  ?? {};
  const moon = essence.moon ?? {};
  const asc = essence.asc  ?? {};
  const domEl = String(analysis.dominant_element ?? '');
  const domMod = String(analysis.dominant_modality ?? '');
  const shape = String(analysis.shape ?? '');
  const unaspected = (analysis.unaspected_planets ?? []) as string[];
  const sect = essence.sect;
  const name = birthData.name?.trim() || 'Персональный профиль';
  const birthDate = birthData.date
    ? new Date(birthData.date + 'T00:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className={`relative rounded-2xl border ${theme.card} overflow-hidden card-lift`}>
      <div className="absolute inset-0 pointer-events-none opacity-65"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 0% 0%, rgba(251,191,36,0.12) 0%, transparent 35%)',
            'radial-gradient(circle at 100% 0%, rgba(59,130,246,0.14) 0%, transparent 40%)',
            'radial-gradient(circle at 50% 100%, rgba(168,85,247,0.12) 0%, transparent 50%)',
          ].join(', '),
        }}
      />
      <div className="relative px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" aria-hidden="true">🧬</span>
          <div className="min-w-0">
            <div className={`text-sm font-bold bg-gradient-to-r from-amber-200 via-fuchsia-200 to-sky-200 bg-clip-text text-transparent truncate`}>{name}</div>
            {birthDate && (
              <div className={`text-[10px] ${theme.text} opacity-65`}>
                {birthDate}{birthData.time ? ` · ${birthData.time}` : ''}
              </div>
            )}
          </div>
        </div>
        <ScopeBadge scope="personal" />
      </div>

      <div className="relative px-5 py-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
        {sun.sign && (
          <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2">
            <div className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">☉ Солнце</div>
            <div className={`text-sm font-bold ${theme.header}`}>{SIGN_RU[sun.sign] ?? sun.sign}</div>
            {sun.house ? <div className={`text-[10px] ${theme.text} opacity-70`}>Дом {sun.house} · {HOUSE_THEME[sun.house] ?? ''}</div> : null}
          </div>
        )}
        {moon.sign && (
          <div className="rounded-xl bg-blue-500/8 border border-blue-500/20 px-3 py-2">
            <div className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">☽ Луна</div>
            <div className={`text-sm font-bold ${theme.header}`}>{SIGN_RU[moon.sign] ?? moon.sign}</div>
            {moon.house ? <div className={`text-[10px] ${theme.text} opacity-70`}>Дом {moon.house} · {HOUSE_THEME[moon.house] ?? ''}</div> : null}
          </div>
        )}
        {asc.sign && (
          <div className="rounded-xl bg-violet-500/8 border border-violet-500/20 px-3 py-2">
            <div className="text-[10px] text-violet-400 uppercase tracking-wider font-semibold">↑ Асцендент</div>
            <div className={`text-sm font-bold ${theme.header}`}>{SIGN_RU[asc.sign] ?? asc.sign}</div>
            <div className={`text-[10px] ${theme.text} opacity-70`}>маска, тело, первая реакция</div>
          </div>
        )}
        {domEl && (
          <div className="rounded-xl bg-rose-500/8 border border-rose-500/20 px-3 py-2">
            <div className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">Стихия</div>
            <div className={`text-sm font-bold ${theme.header}`}>
              {ELEMENT_EMOJI[domEl] ?? ''} {ELEMENT_RU[domEl] ?? domEl}
            </div>
            {domMod && <div className={`text-[10px] ${theme.text} opacity-70`}>{MODALITY_RU[domMod] ?? domMod}</div>}
          </div>
        )}
        {(shape || sect || unaspected.length > 0) && (
          <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-3 py-2">
            <div className="text-[10px] text-white/65 uppercase tracking-wider font-semibold">Форма карты</div>
            {shape && <div className={`text-sm font-bold ${theme.header}`}>{SHAPE_RU[shape] ?? shape}</div>}
            {sect && <div className={`text-[10px] ${theme.text} opacity-70`}>секта: {sect === 'day' ? 'дневная' : 'ночная'}</div>}
            {unaspected.length > 0 && (
              <div className={`text-[10px] ${theme.text} opacity-70`}>без аспектов: {unaspected.map(p => PLANET_RU[p] ?? p).join(', ')}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STRATEGIC DICTIONARIES ───────────────────────────────────────────────────
// Что делать / не делать в профекционном доме года (персональная стратегия)
const HOUSE_YEAR_STRATEGY: Record<number, { theme: string; do: string[]; avoid: string[] }> = {
  1:  { theme: 'Пересборка себя', do: ['заявить о себе публично','переделать имидж, тело, имя','начать проект от своего имени'], avoid: ['прятаться за других','откладывать личную инициативу'] },
  2:  { theme: 'Деньги и ресурсы', do: ['навести порядок в финансах','освоить новый навык-кормилец','поднять цену на свою работу'], avoid: ['импульсивные крупные траты','жить за чужой счёт'] },
  3:  { theme: 'Связи и информация', do: ['написать/записать/опубликовать','восстановить контакт с братьями, сёстрами, соседями','пройти короткий курс'], avoid: ['молчать о проектах','терять нужные связи'] },
  4:  { theme: 'Дом и семья', do: ['переехать или обустроить текущее жильё','разобраться с семейными узлами','инвестировать в недвижимость'], avoid: ['масштабных перемен вне дома','конфликтов с родителями'] },
  5:  { theme: 'Творчество и дети', do: ['запустить творческий проект','быть на виду','разрешить себе радость, романы, игру'], avoid: ['формализма','подавления желаний'] },
  6:  { theme: 'Здоровье и рутина', do: ['наладить режим сна, питания, тренировок','оптимизировать рабочий процесс','сменить подчинённую роль'], avoid: ['перегрузок','игнорирования симптомов'] },
  7:  { theme: 'Партнёрство', do: ['заключить ключевой союз (брак/бизнес)','проговорить условия отношений','работать с партнёром, а не против'], avoid: ['одиноких решений с большой ценой','скрытых договорённостей'] },
  8:  { theme: 'Трансформация и чужой ресурс', do: ['закрыть долги или перекредитоваться','проработать глубокие страхи','получить инвестиции, наследство, доход партнёра'], avoid: ['тайных обязательств','контроля над другими'] },
  9:  { theme: 'Горизонты', do: ['дальнее путешествие','образование, второе высшее, сертификация','выйти в публичное пространство идей'], avoid: ['местечковости','догматизма'] },
  10: { theme: 'Карьера и статус', do: ['идти на повышение / публичность','взять на себя ответственность','показаться тем, кто решает'], avoid: ['невидимой работы','конфликтов с начальством'] },
  11: { theme: 'Круг и большие цели', do: ['войти в сильный круг','поставить цель на 3–5 лет','масштабировать через команду'], avoid: ['одиночки-героя','токсичных групп'] },
  12: { theme: 'Внутренняя работа и завершения', do: ['закрыть незакрытое','пройти терапию/ретрит','освободить энергию для нового цикла'], avoid: ['крупных публичных стартов','самообмана'] },
};
// Область жизни, за которую отвечает планета — для «открытой двери» / «зоны риска»
const PLANET_LIFE_AREA: Record<string, string> = {
  sun: 'самовыражение, статус, витальность',
  moon: 'семья, дом, эмоциональная база',
  mercury: 'обучение, переговоры, связи, слово',
  venus: 'отношения, деньги, красота, удовольствие',
  mars: 'энергия, действие, спорт, конкуренция',
  jupiter: 'рост, путешествия, образование, удача',
  saturn: 'структура, карьера, дисциплина, время',
  uranus: 'перемены, технологии, свобода',
  neptune: 'творчество, духовность, сны',
  pluto: 'глубина, власть, трансформация',
  node: 'судьба, направление роста',
  lilith: 'тень, запретное желание',
  chiron: 'рана и мастерство',
};
// Конкретные ходы под бенефик-транзит планеты
const PLANET_PLAY_MOVES: Record<string, string[]> = {
  sun:     ['Выйти публично: презентация, пост, выступление','Попросить то, что нужно — у руководителя, клиента, близких','Сделать фото-контент о своей работе'],
  moon:    ['Укрепить семейные связи — ужин, звонок родителям','Навести порядок дома, перестановка','Вести дневник эмоций 3 дня'],
  mercury: ['Провести важный разговор, подписать договор','Опубликовать текст, записать короткое видео','Начать учиться чему-то новому сегодня'],
  venus:   ['Назначить свидание / роскошный ужин','Вложиться в визуал — гардероб, дом, портфолио','Попросить прибавку, поднять цену'],
  mars:    ['Закрыть задачу, требующую напора','Тренировка высокой интенсивности','Поставить границу там, где её размывали'],
  jupiter: ['Сделать большой шаг — подать документы, выйти на новый рынок','Купить билет в дальнее путешествие','Пойти учиться у лучшего, даже дорого'],
  saturn:  ['Зафиксировать структуру — план, контракт, roadmap','Закрыть долг или обязательство','Пойти к эксперту / ментору'],
  uranus:  ['Сделать резкий шаг, который давно откладывали','Попробовать новый формат, канал, инструмент','Освободиться от устаревшего'],
  neptune: ['Творческая сессия без плана','Медитация / ретрит / тишина','Работа с образами, музыкой, водой'],
  pluto:   ['Провести глубокий разговор с собой или партнёром','Закрыть один старый паттерн осознанно','Войти в процесс, который давно пугает'],
};
// Проявления малефиков (что ждать и откуда)
const MALEFIC_MANIFEST: Record<string, string> = {
  mars:    'раздражительность, конфликты на пустом месте, риск травмы и ошибки от спешки',
  saturn:  'ощущение блокировки, формальные отказы, апатия, «тяжёлая» атмосфера',
  pluto:   'давление, манипуляции, ощущение «меня используют», скрытый контроль',
  neptune: 'туман, обман, потеря ориентиров, иллюзии и разочарования',
  uranus:  'резкий сбой, неожиданный поворот, нестабильность',
  sun:     'давление авторитетов, потребность в признании',
  moon:    'эмоциональные качели, перегруз',
};
// Митигация под малефик-транзит — конкретное действие
const MALEFIC_MITIGATE: Record<string, string> = {
  mars:    'Сбросить Марс: 40-минутная тренировка до пота, холодный душ, не садиться за руль уставшим',
  saturn:  'Принять ограничение как вызов: выбрать 1 задачу, доделать до конца, не перескакивая',
  pluto:   'Не входить сегодня в разговоры о власти и контроле. Отложить выяснения на 48 часов',
  neptune: 'Не подписывать договоры, не давать обещаний. Оставить день для сна, воды, прогулки',
  uranus:  'Освободить 2 часа буфера в расписании. Не держаться за «как обычно» — будет сбой',
  sun:     'Не доказывать значимость. Делать свою работу — её заметят потом',
  moon:    'Дать эмоциям 24 часа прежде чем реагировать. Не принимать решений на пике',
};
// Жребий Фортуны — конкретный ход дня
const FORTUNE_SIGN_ACTION: Record<string, string> = {
  aries:       'Сделать первый шаг в том, что давно откладывали — сегодня он окупится',
  taurus:      'Вложиться в то, что даст стабильный ручеёк — а не во вспышку',
  gemini:      'Написать/позвонить тому, с кем давно собирались — нужный человек откроется сам',
  cancer:      'Навести тепло в кругу близких — именно оттуда придёт опора',
  leo:         'Выйти на сцену — реальную или виртуальную. Быть ярким',
  virgo:       'Довести до идеала одну деталь — именно её заметят',
  libra:       'Найти союзника в текущей задаче — в паре это решится',
  scorpio:     'Посмотреть туда, куда избегали смотреть — там ресурс',
  sagittarius: 'Расширить горизонт — записаться на курс, купить билет, открыть карту',
  capricorn:   'Поработать на 1 час дольше других — это конвертируется',
  aquarius:    'Предложить нестандартное — именно это сработает',
  pisces:      'Прислушаться к первой интуитивной реакции и следовать ей',
};

// Category styling for action plan cards
const CAT_CONFIG: Record<'leverage'|'mitigate'|'strategic', {
  label: string; border: string; bg: string; numBg: string; numText: string; chipBorder: string; chipText: string;
}> = {
  leverage:  { label: 'Использовать',  border: 'border-emerald-500/25', bg: 'bg-emerald-500/5',  numBg: 'bg-emerald-500/20 border border-emerald-500/40', numText: 'text-emerald-300', chipBorder: 'border-emerald-500/30', chipText: 'text-emerald-300' },
  mitigate:  { label: 'Нейтрализовать', border: 'border-red-500/25',     bg: 'bg-red-500/5',      numBg: 'bg-red-500/20 border border-red-500/40',         numText: 'text-red-300',     chipBorder: 'border-red-500/30',     chipText: 'text-red-300' },
  strategic: { label: 'Стратегия',      border: 'border-violet-500/25',  bg: 'bg-violet-500/5',   numBg: 'bg-violet-500/20 border border-violet-500/40',   numText: 'text-violet-300',  chipBorder: 'border-violet-500/30',  chipText: 'text-violet-300' },
};

// Shared mesh-gradient backdrop (inline, no tailwind config changes needed)
const MESH_BG_STYLE: React.CSSProperties = {
  backgroundImage: [
    'radial-gradient(circle at 15% 20%, rgba(168,85,247,0.18) 0%, transparent 45%)',
    'radial-gradient(circle at 85% 10%, rgba(251,191,36,0.12) 0%, transparent 40%)',
    'radial-gradient(circle at 60% 90%, rgba(59,130,246,0.16) 0%, transparent 50%)',
    'radial-gradient(circle at 10% 95%, rgba(16,185,129,0.10) 0%, transparent 45%)',
  ].join(', '),
};

// ─── StrategicFocusCard ───────────────────────────────────────────────────────
// Верхне-уровневый персональный синтез: тема года × приоритет дня × зона риска
function StrategicFocusCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
  const prof = data.profections as Record<string, unknown>;
  const fir  = data.firdaria   as Record<string, Record<string, string>>;
  const profHouse = Number(prof?.annual_house ?? prof?.profected_house ?? 0);
  const profLord  = String(prof?.annual_lord ?? prof?.lord_of_year ?? '');
  const firLord   = String(fir?.main_period?.planet ?? '');
  const firSub    = String(fir?.sub_period?.planet ?? '');
  const strategy  = profHouse ? HOUSE_YEAR_STRATEGY[profHouse] : null;

  const transits = data.top_transits as Array<Record<string, unknown>>;
  const topBenefic = transits.find(t => t.nature === 'benefic' && t.applying)
                  ?? transits.find(t => t.nature === 'benefic');
  const topMalefic = transits.find(t => t.nature === 'malefic' && t.applying)
                  ?? transits.find(t => t.nature === 'malefic');
  const score = data.day_score ?? 50;

  return (
    <div className={`relative rounded-2xl border ${theme.card} overflow-hidden card-lift`}>
      <div className="absolute inset-0 pointer-events-none opacity-70" style={MESH_BG_STYLE} />
      <div className="relative p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none" aria-hidden="true">🎯</span>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] bg-gradient-to-r from-amber-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent m-0">
              Стратегический фокус
            </h2>
          </div>
          <ScopeBadge scope="personal" />
        </div>

        {/* 3-column synthesis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Year theme */}
          <div className="relative rounded-xl border border-violet-500/25 bg-violet-500/6 p-3 overflow-hidden">
            <div className="text-[10px] uppercase tracking-widest text-violet-300 font-bold mb-1">Тема года</div>
            {profHouse ? (
              <>
                <div className={`text-sm font-bold ${theme.header}`}>
                  Дом {profHouse} · {strategy?.theme ?? HOUSE_THEME[profHouse] ?? ''}
                </div>
                {profLord && (
                  <div className={`text-[10px] ${theme.text} opacity-55 mt-1`}>
                    Лорд года: <span className="text-violet-300 font-semibold">{PLANET_GL[profLord] ?? ''} {PLANET_RU[profLord] ?? profLord}</span>
                    <span className="opacity-70"> — {PLANET_LIFE_AREA[profLord] ?? ''}</span>
                  </div>
                )}
                {firLord && (
                  <div className={`text-[10px] ${theme.text} opacity-55`}>
                    Фирдарий: <span className="text-violet-300 font-semibold">{PLANET_RU[firLord] ?? firLord}</span>
                    {firSub && <> → <span className="opacity-80">{PLANET_RU[firSub] ?? firSub}</span></>}
                  </div>
                )}
              </>
            ) : (
              <div className={`text-xs ${theme.text} opacity-70 italic`}>Профекция не определена</div>
            )}
          </div>

          {/* Today's priority */}
          {topBenefic ? (
            <div className="relative rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-3 overflow-hidden">
              <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold mb-1">Открытая дверь сегодня</div>
              <div className={`text-sm font-bold ${theme.header}`}>
                {PLANET_GL[String(topBenefic.transit_planet)] ?? ''} {PLANET_RU[String(topBenefic.transit_planet)] ?? ''}
                <span className="text-emerald-300 mx-1">{ASPECT_SYM[String(topBenefic.aspect)] ?? ''}</span>
                {PLANET_RU[String(topBenefic.natal_planet)] ?? ''}
              </div>
              <div className={`text-[10px] ${theme.text} opacity-55 mt-1`}>
                Канал в: <span className="text-emerald-300">{PLANET_LIFE_AREA[String(topBenefic.natal_planet)] ?? ''}</span>
              </div>
              <div className="text-[10px] text-amber-300/70 mt-0.5">
                ⏰ {orbTiming(Number(topBenefic.orb), Boolean(topBenefic.applying)) || 'активно'}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-3">
              <div className="text-[10px] uppercase tracking-widest text-white/65 font-bold mb-1">Открытая дверь сегодня</div>
              <div className={`text-xs ${theme.text} opacity-55 italic`}>Попутных транзитов нет — результат только личной волей</div>
            </div>
          )}

          {/* Risk zone */}
          {topMalefic ? (
            <div className="relative rounded-xl border border-red-500/25 bg-red-500/6 p-3 overflow-hidden">
              <div className="text-[10px] uppercase tracking-widest text-red-300 font-bold mb-1">Зона осторожности</div>
              <div className={`text-sm font-bold ${theme.header}`}>
                {PLANET_GL[String(topMalefic.transit_planet)] ?? ''} {PLANET_RU[String(topMalefic.transit_planet)] ?? ''}
                <span className="text-red-300 mx-1">{ASPECT_SYM[String(topMalefic.aspect)] ?? ''}</span>
                {PLANET_RU[String(topMalefic.natal_planet)] ?? ''}
              </div>
              <div className={`text-[10px] ${theme.text} opacity-55 mt-1`}>
                Давление на: <span className="text-red-300">{PLANET_LIFE_AREA[String(topMalefic.natal_planet)] ?? ''}</span>
              </div>
              {MALEFIC_MANIFEST[String(topMalefic.transit_planet)] && (
                <div className={`text-[10px] ${theme.text} opacity-55 mt-0.5 italic`}>
                  {MALEFIC_MANIFEST[String(topMalefic.transit_planet)]}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-3">
              <div className="text-[10px] uppercase tracking-widest text-white/65 font-bold mb-1">Зона осторожности</div>
              <div className={`text-xs ${theme.text} opacity-55 italic`}>Серьёзных напряжений нет</div>
            </div>
          )}
        </div>

        {/* Year do / avoid strip */}
        {strategy && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-1.5">◢ Делать в этом году</div>
              <ul className="space-y-1">
                {strategy.do.slice(0, 3).map((a, i) => (
                  <li key={i} className={`text-[11px] ${theme.header} flex gap-1.5 leading-snug`}>
                    <span className="text-emerald-400 shrink-0">›</span><span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-rose-400 font-bold mb-1.5">◣ Не тратить год на</div>
              <ul className="space-y-1">
                {strategy.avoid.slice(0, 2).map((a, i) => (
                  <li key={i} className={`text-[11px] ${theme.text} opacity-70 flex gap-1.5 leading-snug`}>
                    <span className="text-rose-400 shrink-0">×</span><span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Energy meta-bar */}
        <div className="flex items-center gap-3 pt-3 border-t border-white/10">
          <div className="text-[10px] uppercase tracking-widest text-white/65 font-bold">Энергия дня</div>
          <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${score}%`,
                background: score >= 65
                  ? 'linear-gradient(90deg, #34d399, #10b981)'
                  : score <= 40
                  ? 'linear-gradient(90deg, #fb7185, #ef4444)'
                  : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                boxShadow: score >= 65 ? '0 0 10px rgba(16,185,129,0.5)' : score <= 40 ? '0 0 10px rgba(239,68,68,0.5)' : '0 0 10px rgba(245,158,11,0.5)',
              }}
            />
          </div>
          <div className={`text-xs font-black bg-gradient-to-r ${score >= 65 ? 'from-emerald-300 to-emerald-500' : score <= 40 ? 'from-rose-300 to-red-500' : 'from-amber-300 to-orange-500'} bg-clip-text text-transparent`}>
            {score}/100
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PersonalActionPlanCard ───────────────────────────────────────────────────
// 3–5 персональных действий, собранных из: топ-транзит × лорд года × фирдарий × жребий × фаза Луны
function PersonalActionPlanCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
  type Action = { num: number; title: string; why: string; when: string; category: 'leverage'|'mitigate'|'strategic' };
  const actions: Action[] = [];

  const prof = data.profections as Record<string, unknown>;
  const profLord  = String(prof?.annual_lord ?? prof?.lord_of_year ?? '');
  const profHouse = Number(prof?.annual_house ?? prof?.profected_house ?? 0);
  const transits  = data.top_transits as Array<Record<string, unknown>>;
  const topBenefic = transits.find(t => t.nature === 'benefic' && t.applying)
                  ?? transits.find(t => t.nature === 'benefic');
  const topMalefic = transits.find(t => t.nature === 'malefic' && t.applying)
                  ?? transits.find(t => t.nature === 'malefic');
  const fortuneSign = data.fortune_today?.sign;
  const moonPhase   = data.moon.phase;
  const fir = data.firdaria as Record<string, Record<string, string>>;
  const firSub = String(fir?.sub_period?.planet ?? '');

  // 1. Леверидж топ-бенефика
  if (topBenefic) {
    const tp = String(topBenefic.transit_planet);
    const moves = PLANET_PLAY_MOVES[tp];
    if (moves?.length) {
      actions.push({
        num: actions.length + 1,
        title: moves[0],
        why: `${PLANET_RU[tp] ?? tp} ${ASPECT_NAME[String(topBenefic.aspect)] ?? ''} ${PLANET_RU[String(topBenefic.natal_planet)] ?? ''} — открывает канал в «${PLANET_LIFE_AREA[String(topBenefic.natal_planet)] ?? 'ключевую область'}»`,
        when: orbTiming(Number(topBenefic.orb), Boolean(topBenefic.applying)) || 'сегодня',
        category: 'leverage',
      });
    }
  }

  // 2. Митигация топ-малефика
  if (topMalefic) {
    const tp = String(topMalefic.transit_planet);
    const mit = MALEFIC_MITIGATE[tp];
    if (mit) {
      actions.push({
        num: actions.length + 1,
        title: mit,
        why: `${PLANET_RU[tp] ?? tp} ${ASPECT_NAME[String(topMalefic.aspect)] ?? ''} ${PLANET_RU[String(topMalefic.natal_planet)] ?? ''} — ${MALEFIC_MANIFEST[tp] ?? 'напряжение'}`,
        when: orbTiming(Number(topMalefic.orb), Boolean(topMalefic.applying)) || 'сегодня',
        category: 'mitigate',
      });
    }
  }

  // 3. Стратегический ход лорда года
  if (profLord && PLANET_PLAY_MOVES[profLord]?.length) {
    const moves = PLANET_PLAY_MOVES[profLord];
    const move = topBenefic && String(topBenefic.transit_planet) === profLord ? moves[1] ?? moves[0] : moves[0];
    // избегаем полного дубля title
    if (!actions.some(a => a.title === move)) {
      actions.push({
        num: actions.length + 1,
        title: move,
        why: `Лорд года — ${PLANET_RU[profLord] ?? profLord}${profHouse ? `. Дом ${profHouse} (${HOUSE_THEME[profHouse] ?? ''})` : ''} — куда направлен год`,
        when: 'весь год; усиливается в месяцы активации лорда',
        category: 'strategic',
      });
    }
  }

  // 4. Суб-период фирдария (если отличается от лорда года)
  if (firSub && firSub !== profLord && PLANET_PLAY_MOVES[firSub]?.length) {
    const moves = PLANET_PLAY_MOVES[firSub];
    actions.push({
      num: actions.length + 1,
      title: moves[moves.length - 1],
      why: `Суб-период фирдария: ${PLANET_RU[firSub] ?? firSub} — краска ближайших месяцев`,
      when: 'ближайшие недели–месяцы',
      category: 'strategic',
    });
  }

  // 5. Жребий Фортуны
  if (fortuneSign && FORTUNE_SIGN_ACTION[fortuneSign]) {
    actions.push({
      num: actions.length + 1,
      title: FORTUNE_SIGN_ACTION[fortuneSign],
      why: `Жребий Фортуны сегодня — ${SIGN_RU[fortuneSign] ?? fortuneSign}`,
      when: 'сегодня',
      category: 'leverage',
    });
  }

  // 6. Фаза Луны (дополнение)
  if (actions.length < 5) {
    if (['new_moon','waxing_crescent'].includes(moonPhase)) {
      actions.push({
        num: actions.length + 1,
        title: 'Задать одно чёткое намерение на ближайшие 2 недели и сделать к нему первый шаг',
        why: `Растущая Луна в ${SIGN_RU[data.moon.sign] ?? data.moon.sign} — фаза посева`,
        when: 'сегодня–завтра',
        category: 'strategic',
      });
    } else if (['full_moon','waning_gibbous'].includes(moonPhase)) {
      actions.push({
        num: actions.length + 1,
        title: 'Закрыть одну затянувшуюся задачу, вывести текущий проект к кульминации',
        why: `${PHASE_RU[moonPhase] ?? moonPhase} — фаза сбора и результата`,
        when: 'ближайшие 2–3 дня',
        category: 'strategic',
      });
    }
  }

  const plan = actions.slice(0, 5);

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden card-lift`}>
      <div>
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-400" aria-hidden="true" />
            <h2 className={`text-sm font-bold ${theme.header} m-0`}>Персональный план на ближайшие дни</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${theme.text} opacity-60 uppercase tracking-wide`}>{plan.length} конкретных ходов</span>
            <ScopeBadge scope="personal" />
          </div>
        </div>

        <div className="p-5 space-y-2.5">
          {plan.length === 0 ? (
            <p className={`text-xs ${theme.text} opacity-65 italic text-center py-4`}>
              Ярких стратегических рычагов нет — фокус на рутине и восстановлении.
            </p>
          ) : plan.map(a => {
            const cfg = CAT_CONFIG[a.category];
            return (
              <div key={a.num} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 flex items-start gap-3 transition-all hover:border-white/30`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.numBg} ${cfg.numText} font-black text-sm`}>
                  {a.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold ${theme.header} leading-snug`}>{a.title}</div>
                  <div className={`text-[10px] ${theme.text} opacity-55 mt-0.5 italic leading-snug`}>— {a.why}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${cfg.chipBorder} ${cfg.chipText} uppercase tracking-wider font-bold`}>
                      {cfg.label}
                    </span>
                    {a.when && <span className="text-[10px] text-amber-300/60">⏰ {a.when}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HeroCard({ data, birthData, theme }: { data: DashboardData; birthData: BirthInput; theme: ThemeLike }) {
  const score = data.day_score ?? 50;
  const narrative = getDayNarrative(score);
  const spheres = data.sphere_scores;
  const retros = data.retrograde_planets ?? [];
  const vocEndJd = data.moon.is_void ? ((data.moon as Record<string,unknown>).void_end_utc as number | null ?? null) : null;
  const vocCountdown = useVocCountdown(data.moon.is_void ? vocEndJd : null);

  const today = new Date();
  const weekday = today.toLocaleDateString('ru-RU', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const greeting = getTimeGreeting();

  // ── Solar year progress (day X of 365 since last birthday) ──────────────────
  const solarYear = (() => {
    if (!birthData.date) return null;
    const [, mm, dd] = birthData.date.split('-').map(Number);
    if (!mm || !dd) return null;
    const y = today.getFullYear();
    const thisBday = new Date(y, mm - 1, dd);
    const lastBday = today >= thisBday ? thisBday : new Date(y - 1, mm - 1, dd);
    const nextBday = today >= thisBday ? new Date(y + 1, mm - 1, dd) : thisBday;
    const total = Math.round((nextBday.getTime() - lastBday.getTime()) / 86400000);
    const passed = Math.round((today.getTime() - lastBday.getTime()) / 86400000);
    const left = Math.max(0, total - passed);
    return { passed, total, left, pct: Math.min(100, Math.max(0, (passed / total) * 100)) };
  })();

  // ── Firdaria main → sub period ──────────────────────────────────────────────
  const firdaria = data.firdaria as Record<string, Record<string, string> | undefined>;
  const firMain = firdaria?.main_period;
  const firSub  = firdaria?.sub_period;
  const firSubInterp = (firMain?.planet && firSub?.planet)
    ? getFirdariaSubInterpretation(firMain.planet, firSub.planet)
    : null;

  // ── Profected year ──────────────────────────────────────────────────────────
  const prof = data.profections as Record<string, unknown>;
  const profHouse = Number(prof?.annual_house ?? prof?.profected_house ?? 0);
  const profLord  = String(prof?.annual_lord ?? prof?.lord_of_year ?? '');

  // ── Top transit highlight ───────────────────────────────────────────────────
  const topT = (data.top_transits ?? [])[0] as Record<string, unknown> | undefined;
  const topTNature = (topT?.nature as string) ?? 'mixed';
  const topTColor = topTNature === 'benefic' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                  : topTNature === 'malefic' ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
                  : 'text-amber-300 border-amber-500/30 bg-amber-500/10';

  // ── Personal day tip ────────────────────────────────────────────────────────
  const dayTip = (() => {
    const sunSign = data.natal_essence?.sun?.sign;
    const moonSign = data.natal_essence?.moon?.sign;
    const lowest = spheres
      ? (Object.entries(spheres) as Array<[keyof typeof spheres, number]>)
          .reduce((a, b) => (b[1] < a[1] ? b : a))
      : null;
    const lowestLabel: Record<string, string> = {
      love: 'отношения', work: 'дела', finance: 'деньги', health: 'тело', creative: 'творчество',
    };
    const parts: string[] = [];
    if (data.moon.is_void) {
      parts.push('Луна без курса — отложите старты, завершайте начатое.');
    } else if (score >= 65) {
      parts.push('День поддерживает — действуйте на полной мощности.');
    } else if (score <= 40) {
      parts.push('Не форсируйте — день для сохранения, не атаки.');
    } else {
      parts.push('Ровный день — двигайтесь по плану без рывков.');
    }
    if (lowest && lowest[1] < 45) {
      parts.push(`Уязвимая зона — ${lowestLabel[lowest[0] as string] ?? lowest[0]}: бережно.`);
    }
    if (retros.length >= 2) {
      parts.push('Много ретро — пересмотр и доработка важнее запусков.');
    } else if (retros.some(r => r.planet === 'mercury')) {
      parts.push('Меркурий ретро — перепроверяйте слова и документы.');
    }
    if (sunSign && moonSign) {
      parts.push(`Опора дня — ваше Солнце в ${SIGN_RU[sunSign] ?? sunSign} и Луна в ${SIGN_RU[moonSign] ?? moonSign}.`);
    }
    return parts.join(' ');
  })();

  const scoreColor = score >= 65 ? '#22c55e' : score <= 40 ? '#ef4444' : '#f59e0b';
  const scoreBg = score >= 65
    ? 'from-emerald-950/40 to-slate-950/0'
    : score <= 40
    ? 'from-red-950/40 to-slate-950/0'
    : 'from-amber-950/40 to-slate-950/0';

  return (
    <div className={`relative rounded-2xl border ${theme.card} overflow-hidden card-lift`}>
      {/* Mesh backdrop */}
      <div className="absolute inset-0 pointer-events-none opacity-60" style={MESH_BG_STYLE} />
      {/* Gradient header strip */}
      <div className={`relative bg-gradient-to-r ${scoreBg} px-5 pt-5 pb-4`}>
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          {/* Left: greeting + date + narrative */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-medium ${theme.text} opacity-70`}>{greeting} ·</span>
              <span className={`text-base font-bold ${theme.header} capitalize`}>{weekday},</span>
              <span className={`text-base font-bold ${theme.header}`}>{dateStr}</span>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                style={{ color: scoreColor, borderColor: `${scoreColor}40`, backgroundColor: `${scoreColor}10` }}
              >
                {score >= 65 ? '✦ Благоприятный день' : score <= 40 ? '⚠ Напряжённый день' : '~ Нейтральный день'}
              </span>
              {data.moon.is_void && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                  <AlertTriangle size={12} aria-hidden="true" />
                  ВоК{vocCountdown ? ` ещё ${vocCountdown}` : ' активен'}
                </span>
              )}
              {retros.slice(0, 3).map(r => {
                const t = planetTone(r.planet);
                return (
                  <span
                    key={r.planet}
                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${t.bg} border ${t.border} ${t.text} font-medium`}
                    title={`${PLANET_RU[r.planet] ?? r.planet} ретроградный — ${RETRO_MEANING[r.planet] ?? 'пересмотр темы планеты'}`}
                  >
                    ⟲ {PLANET_RU[r.planet] ?? r.planet}
                  </span>
                );
              })}
            </div>

            <p className={`text-base ${theme.text} opacity-90 leading-relaxed max-w-md font-medium`}>{narrative}</p>
          </div>

          {/* Center: ring + 3-day trend */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <ScoreRing score={score} />
            <span className="text-[10px] text-white/55 uppercase tracking-wider">энергия дня</span>
            {data.trend_3d && (
              <Trend3d trend={data.trend_3d} />
            )}
          </div>

          {/* Right: sphere scores */}
          {spheres && (
            <div className="flex flex-col gap-2.5 w-full sm:w-48 shrink-0">
              <SphereBar icon={Heart}     label="Любовь"     score={spheres.love}     color="text-rose-400" />
              <SphereBar icon={Briefcase} label="Работа"     score={spheres.work}     color="text-blue-400" />
              <SphereBar icon={DollarSign}label="Финансы"    score={spheres.finance}  color="text-emerald-400" />
              <SphereBar icon={Activity}  label="Здоровье"   score={spheres.health}   color="text-teal-400" />
              <SphereBar icon={Palette}   label="Творчество" score={spheres.creative} color="text-purple-400" />
            </div>
          )}
        </div>
      </div>

      {/* Personal context strip — solar year + firdaria + profection + top transit */}
      <div className="relative px-5 py-3 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-2">
        {solarYear && (
          <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-amber-300/85 mb-1">
              <span>Солнечный год</span>
              <span className="text-white/60 normal-case tracking-normal">{solarYear.passed}/{solarYear.total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mb-1">
              <div className="h-full bg-gradient-to-r from-amber-400 to-rose-400" style={{ width: `${solarYear.pct}%` }} />
            </div>
            <div className={`text-[10px] ${theme.text} opacity-70`}>До соляра — {solarYear.left} дн.</div>
          </div>
        )}

        {firMain?.planet && (
          <div className="rounded-lg bg-violet-500/8 border border-violet-500/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-violet-300/85 mb-1">Период жизни</div>
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none" title={PLANET_RU[firMain.planet] ?? firMain.planet}>{PLANET_GL[firMain.planet] ?? '✦'}</span>
              <span className={`text-xs font-bold ${theme.header}`}>{PLANET_RU[firMain.planet] ?? firMain.planet}</span>
              {firSub?.planet && (
                <>
                  <span className="text-white/35 text-[10px]">→</span>
                  <span className="text-[11px] text-violet-200/90" title={`Суб-период: ${PLANET_RU[firSub.planet] ?? firSub.planet}`}>{PLANET_GL[firSub.planet] ?? ''} {PLANET_RU[firSub.planet] ?? firSub.planet}</span>
                </>
              )}
            </div>
            {firSubInterp?.tone && (
              <div className={`text-[10px] ${theme.text} opacity-70 mt-0.5 leading-snug line-clamp-2`}>{firSubInterp.tone}</div>
            )}
          </div>
        )}

        {profHouse > 0 && (
          <div className="rounded-lg bg-sky-500/8 border border-sky-500/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-sky-300/85 mb-1">Тема года</div>
            <div className={`text-xs font-bold ${theme.header}`}>Дом {profHouse}</div>
            <div className={`text-[10px] ${theme.text} opacity-70 leading-snug`}>{HOUSE_THEME[profHouse] ?? ''}</div>
            {profLord && (
              <div className="text-[10px] text-sky-200/80 mt-0.5">Управитель: {PLANET_RU[profLord] ?? profLord}</div>
            )}
          </div>
        )}

        {topT && (
          <div className={`rounded-lg border px-3 py-2 ${topTColor}`}>
            <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">Главный транзит</div>
            <div className="text-xs font-bold leading-snug">
              <span title={`${PLANET_RU[String(topT.transit_planet)] ?? topT.transit_planet} (транзит)`}>
                {PLANET_GL[String(topT.transit_planet)] ?? ''} {PLANET_RU[String(topT.transit_planet)] ?? topT.transit_planet}
              </span>{' '}
              <span title={ASPECT_NAME[String(topT.aspect)] ?? String(topT.aspect)}>{ASPECT_SYM[String(topT.aspect)] ?? ''}</span>{' '}
              <span title={`${PLANET_RU[String(topT.natal_planet)] ?? topT.natal_planet} (натальная)`}>
                {PLANET_GL[String(topT.natal_planet)] ?? ''} {PLANET_RU[String(topT.natal_planet)] ?? topT.natal_planet}
              </span>
            </div>
            <div className="text-[10px] opacity-80 mt-0.5 italic">{ASPECT_NAME[String(topT.aspect)] ?? String(topT.aspect)}</div>
            <div className="text-[10px] opacity-75 mt-0.5">
              орб {Number(topT.orb).toFixed(1)}° {topT.applying ? '· сходящийся' : '· расходящийся'}
            </div>
          </div>
        )}
      </div>

      {/* Day tip — synthesized personal advice */}
      {dayTip && (
        <div className="relative px-5 pb-3 pt-1">
          <div className="rounded-xl bg-gradient-to-r from-fuchsia-500/10 via-amber-500/8 to-emerald-500/10 border border-white/10 px-3 py-2.5 flex items-start gap-2">
            <span className="text-base leading-none mt-0.5" aria-hidden="true">💡</span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-white/60 mb-0.5">Подсказка дня</div>
              <p className={`text-[11px] ${theme.text} opacity-90 leading-relaxed m-0`}>{dayTip}</p>
            </div>
          </div>
        </div>
      )}

      {/* Retrogrades strip */}
      {retros.length > 0 && (
        <div className="relative px-5 pb-4 pt-3 border-t border-white/10">
          <div className="text-[10px] uppercase tracking-wider text-white/55 mb-2">Ретроградные планеты</div>
          <div className="flex flex-wrap gap-2">
            {retros.map(r => {
              const tone = planetTone(r.planet);
              return (
                <div key={r.planet} className={`flex items-center gap-1.5 rounded-lg ${tone.bg} border ${tone.border} px-2.5 py-1.5`}>
                  <span className={`${tone.text} font-bold text-xs`} title={`${PLANET_RU[r.planet] ?? r.planet} ретроградный`}>⟲</span>
                  <span className={`text-xs font-semibold ${theme.header}`} title={PLANET_RU[r.planet] ?? r.planet}>
                    {PLANET_GL[r.planet] ?? ''} {PLANET_RU[r.planet] ?? r.planet}
                  </span>
                  <span className={`text-[10px] ${theme.text} opacity-70`}>{SIGN_RU[r.sign] ?? r.sign} {r.degree}°</span>
                  {RETRO_MEANING[r.planet] && (
                    <span className={`text-[10px] italic ${theme.text} opacity-65`}>— {RETRO_MEANING[r.planet]}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Moon Card ────────────────────────────────────────────────────────────────
function MoonCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
  const { moon } = data;
  const mansion = moon.mansion;
  const illumination = moon.illumination ?? Math.round(((1 - Math.cos(moon.phase_angle * Math.PI / 180)) / 2) * 100);
  const isWaxing = ['waxing_crescent','first_quarter','waxing_gibbous','full_moon'].includes(moon.phase);

  return (
    <Card title="Луна сегодня" icon={Moon} theme={theme} accent="text-blue-300" badge={<ScopeBadge scope="general" />}>
      <div className="space-y-3">
        {/* Phase display */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <span
              className="text-5xl leading-none select-none"
              style={{ filter: 'drop-shadow(0 0 12px rgba(147,197,253,0.5))' }}
            >
              {PHASE_EMOJI[moon.phase] ?? '🌙'}
            </span>
          </div>
          <div className="flex-1">
            <div className={`text-base font-bold ${theme.header}`}>
              {SIGN_RU[moon.sign] ?? moon.sign} · {moon.degree.toFixed(1)}°
            </div>
            <div className={`text-xs ${theme.text} opacity-60`}>
              {PHASE_RU[moon.phase] ?? moon.phase}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"
                role="progressbar"
                aria-valuenow={illumination}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={`Освещённость Луны ${illumination}%, ${isWaxing ? 'растёт' : 'убывает'}`}
                aria-label="Освещённость Луны"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${illumination}%`,
                    background: 'linear-gradient(90deg, rgba(253,224,71,0.6) 0%, rgba(253,224,71,0.95) 100%)',
                    boxShadow: '0 0 8px rgba(253,224,71,0.4)',
                  }}
                />
              </div>
              <span className={`text-[11px] font-bold ${theme.accent}`}>{illumination}%</span>
              <span className={`text-[10px] ${theme.text} opacity-65`}>{isWaxing ? '↑ растёт' : '↓ убывает'}</span>
            </div>
          </div>
        </div>

        {/* VoC banner */}
        {moon.is_void && (
          <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h4 className="text-xs font-semibold text-amber-300 m-0">Луна Пустого Хода</h4>
              {moon.void_end_sign && (
                <div className="text-[10px] text-amber-300/80 mt-0.5">
                  Закончится при входе Луны в {SIGN_RU[moon.void_end_sign] ?? moon.void_end_sign}
                </div>
              )}
              <div className="text-[10px] text-amber-300/70 mt-0.5">Новые начинания не рекомендуются</div>
            </div>
          </div>
        )}

        {/* Mansion */}
        {mansion && (
          <div className="border-t border-white/10 pt-3">
            <h4 className={`flex items-center gap-1.5 text-xs font-semibold ${theme.accent} mb-1.5 m-0`}>
              <Star size={12} aria-hidden="true" />
              Мансия #{mansion.number} · {mansion.name_ru}
            </h4>
            <div className={`text-xs ${theme.text} opacity-70 italic mb-2.5`}>{mansion.theme}</div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-2">
                <div className="text-[10px] text-emerald-400 font-semibold mb-1">✓ Сегодня хорошо</div>
                <ul className="space-y-0.5 m-0 p-0 list-none">
                  {mansion.do.slice(0, 2).map((a, i) => (
                    <li key={i} className={`text-[11px] ${theme.text} opacity-70 flex gap-1`}>
                      <span className="text-emerald-400 shrink-0" aria-hidden="true">›</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg bg-red-500/8 border border-red-500/20 p-2">
                <div className="text-[10px] text-red-400 font-semibold mb-1">✗ Избегать</div>
                <ul className="space-y-0.5 m-0 p-0 list-none">
                  {mansion.avoid.slice(0, 2).map((a, i) => (
                    <li key={i} className={`text-[11px] ${theme.text} opacity-70 flex gap-1`}>
                      <span className="text-red-400 shrink-0" aria-hidden="true">›</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── TransitRow — expandable ──────────────────────────────────────────────────
function TransitRow({ transit, theme }: { transit: Record<string, unknown>; theme: ThemeLike }) {
  const [expanded, setExpanded] = useState(false);
  const tp     = String(transit.transit_planet ?? '');
  const np     = String(transit.natal_planet ?? '');
  const asp    = String(transit.aspect ?? '');
  const orb    = typeof transit.orb === 'number' ? transit.orb : 0;
  const app    = Boolean(transit.applying);
  const nature = (transit.nature as 'benefic'|'malefic'|'mixed') ?? 'mixed';
  const cfg    = NATURE_CONFIG[nature] ?? NATURE_CONFIG.mixed;
  const hint   = transit.compensatory_hint as { tension_signal: string; top_practice: Record<string,unknown>|null } | undefined;
  const quickTheme = TRANSIT_QUICK_THEME[tp]?.[asp];

  return (
    <div className={`rounded-xl border mb-2 last:mb-0 ${cfg.bg} overflow-hidden`}>
      <button
        onClick={() => hint && setExpanded(e => !e)}
        aria-expanded={hint ? expanded : undefined}
        aria-label={hint ? `${PLANET_RU[tp] ?? tp} ${ASPECT_NAME[asp] ?? asp} ${PLANET_RU[np] ?? np} — ${expanded ? 'свернуть' : 'развернуть'} детали` : undefined}
        className={`w-full flex items-start gap-2.5 px-3 py-2.5 min-h-[44px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset ${hint ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'} transition-colors`}
      >
        {/* Nature dot */}
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mt-1.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-bold ${theme.header}`}>
              {PLANET_GL[tp] ?? ''} {PLANET_RU[tp] ?? tp}
            </span>
            <span className={`text-xs font-semibold ${ASPECT_COLOR[asp] ?? 'text-gray-400'}`}>
              {ASPECT_SYM[asp] ?? ''} {ASPECT_NAME[asp] ?? asp}
            </span>
            <span className={`text-xs ${theme.text} opacity-60`}>
              {PLANET_GL[np] ?? ''} {PLANET_RU[np] ?? np}
            </span>
            <span className={`text-[10px] ml-auto ${app ? 'text-amber-300' : 'text-slate-500'}`}>
              {app ? '→' : '↘'} {orb.toFixed(1)}°
            </span>
          </div>
          {(quickTheme || hint?.tension_signal) && (
            <div className={`text-[11px] mt-0.5 italic ${cfg.color} opacity-75`}>
              {quickTheme ?? hint?.tension_signal}
            </div>
          )}
        </div>
        {hint && (
          <span className={`${theme.text} opacity-60 shrink-0 mt-0.5`}>
            {expanded ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
          </span>
        )}
      </button>

      {expanded && hint?.top_practice && (
        <div className="px-3 pb-3 pt-2 border-t border-white/10">
          {Boolean(hint.top_practice['practice']) && (
            <div className={`text-[11px] font-semibold ${theme.header} flex gap-1.5 mb-1`}>
              <Sparkles size={12} className={`${cfg.color} mt-0.5 shrink-0`} aria-hidden="true" />
              {String(hint.top_practice['practice'])}
            </div>
          )}
          {Boolean(hint.top_practice['why']) && (
            <div className={`text-[10px] ${theme.text} opacity-70 pl-3.5 leading-relaxed`}>
              {String(hint.top_practice['why'])}
            </div>
          )}
          {Boolean(hint.top_practice['timing']) && (
            <div className="text-[10px] text-amber-300/60 pl-3.5 mt-0.5">
              ⏰ {String(hint.top_practice['timing'])}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── KeyTransitsCard ──────────────────────────────────────────────────────────
function KeyTransitsCard({ data, theme, isPro }: { data: DashboardData; theme: ThemeLike; isPro: boolean }) {
  const transits = data.top_transits;
  const beneficCount = transits.filter(t => (t as Record<string,unknown>).nature === 'benefic').length;
  const maleficCount = transits.filter(t => (t as Record<string,unknown>).nature === 'malefic').length;

  return (
    <Card
      title="Ключевые транзиты"
      icon={Zap}
      theme={theme}
      accent="text-amber-400"
      badge={
        <div className="flex items-center gap-2">
          {beneficCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              ▲{beneficCount}
            </span>
          )}
          {maleficCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded">
              ▼{maleficCount}
            </span>
          )}
          <ScopeBadge scope="personal" />
        </div>
      }
    >
      {transits.length === 0 ? (
        <div className="text-center py-4">
          <CheckCircle size={16} className="text-emerald-400 mx-auto mb-1.5" aria-hidden="true" />
          <p className={`text-xs ${theme.text} opacity-70`}>Активных транзитов нет — спокойный день</p>
        </div>
      ) : (
        <div>
          {transits.slice(0, isPro ? 6 : 4).map((t, i) => (
            <TransitRow key={i} transit={t as unknown as Record<string, unknown>} theme={theme} />
          ))}
          {!isPro && transits.length > 4 && (
            <div className={`text-[10px] ${theme.text} opacity-60 text-center mt-1`}>
              + ещё {transits.length - 4} в режиме Профи
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── UpcomingEventsCard ───────────────────────────────────────────────────────
function UpcomingEventsCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
  const lunation = data.next_lunation;
  const retros = data.retrograde_planets ?? [];

  const events: Array<{ emoji: string; label: string; sub: string; color: string; urgency: number }> = [];
  if (lunation && lunation.days_to_full <= 7) {
    events.push({ emoji: '🌕', label: `Полнолуние через ${lunation.days_to_full} дн.`, sub: lunation.full_moon, color: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-300', urgency: 3 });
  } else if (lunation && lunation.days_to_full <= 14) {
    events.push({ emoji: '🌕', label: `Полнолуние через ${lunation.days_to_full} дн.`, sub: lunation.full_moon, color: 'bg-yellow-500/8 border-yellow-500/20 text-yellow-300/80', urgency: 2 });
  }
  if (lunation && lunation.days_to_new <= 7) {
    events.push({ emoji: '🌑', label: `Новолуние через ${lunation.days_to_new} дн.`, sub: lunation.new_moon, color: 'bg-slate-500/15 border-slate-500/25 text-slate-300', urgency: 3 });
  } else if (lunation && lunation.days_to_new <= 14) {
    events.push({ emoji: '🌑', label: `Новолуние через ${lunation.days_to_new} дн.`, sub: lunation.new_moon, color: 'bg-slate-500/10 border-slate-500/20 text-slate-300/80', urgency: 2 });
  }
  if (data.moon.is_void) {
    events.push({ emoji: '🌙', label: 'Луна Пустого Хода', sub: data.moon.void_end_sign ? `До входа в ${SIGN_RU[data.moon.void_end_sign] ?? data.moon.void_end_sign}` : 'Активен', color: 'bg-amber-500/10 border-amber-500/25 text-amber-300', urgency: 3 });
  }
  if (retros.length > 0) {
    events.push({ emoji: '⟲', label: `Ретро: ${retros.map(r => PLANET_RU[r.planet] ?? r.planet).join(', ')}`, sub: 'переосмысление и пересмотр', color: 'bg-violet-500/10 border-violet-500/25 text-violet-300', urgency: 2 });
  }

  if (events.length === 0) return (
    <Card title="Ближайшие события" icon={Calendar} theme={theme}>
      <div className="text-center py-4">
        <span className="text-2xl block mb-1">📅</span>
        <p className={`text-xs ${theme.text} opacity-65`}>Особых событий в ближайшие 2 недели нет</p>
      </div>
    </Card>
  );

  return (
    <Card title="Ближайшие события" icon={Calendar} theme={theme} accent="text-blue-400" badge={<ScopeBadge scope="general" />}>
      <div className="space-y-2">
        {events.sort((a,b) => b.urgency - a.urgency).map((ev, i) => (
          <div key={i} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${ev.color}`}>
            <span className="text-xl leading-none shrink-0">{ev.emoji}</span>
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-tight">{ev.label}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{ev.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── PeriodsCard (Firdaria + Profections) ─────────────────────────────────────
function PeriodsCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
  const firdaria   = data.firdaria as Record<string, Record<string,string>>;
  const profections = data.profections as Record<string, unknown>;
  const firPeriod  = firdaria?.main_period;
  const firSub     = firdaria?.sub_period;
  const profYear   = (profections?.annual_house ?? profections?.profected_house) as number;
  const profLord   = (profections?.annual_lord ?? profections?.lord_of_year) as string;
  const profSign   = profections?.annual_sign as string;

  return (
    <Card title="Периоды · Профекции" icon={TrendingUp} theme={theme} accent="text-violet-400" badge={<ScopeBadge scope="personal" />}>
      <div className="space-y-3">
        {firPeriod ? (
          <div className="rounded-xl bg-violet-500/8 border border-violet-500/20 p-3">
            <div className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-1.5">
              ⏳ Фирдарий — главный период
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">{PLANET_GL[firPeriod.planet ?? ''] ?? '✦'}</span>
              <div>
                <div className={`text-sm font-bold ${theme.header}`}>
                  {PLANET_RU[firPeriod.planet ?? ''] ?? firPeriod.planet ?? '—'}
                </div>
                {firPeriod.start && firPeriod.end && (
                  <div className={`text-[10px] ${theme.text} opacity-65`}>{firPeriod.start} – {firPeriod.end}</div>
                )}
              </div>
            </div>
            {firSub && (
              <div className={`text-[11px] ${theme.accent} mb-1.5`}>
                Суб-период: {PLANET_GL[firSub.planet ?? ''] ?? ''} {PLANET_RU[firSub.planet ?? ''] ?? firSub.planet}
                {firSub.start && firSub.end && (
                  <span className={`${theme.text} opacity-60 ml-2`}>· {firSub.start} – {firSub.end}</span>
                )}
              </div>
            )}
            {firPeriod.planet && FIRDARIA_NARRATIVE[firPeriod.planet] && (
              <p className={`text-[11px] ${theme.text} opacity-65 leading-relaxed border-l-2 border-violet-500/30 pl-2`}>
                {FIRDARIA_NARRATIVE[firPeriod.planet]}
              </p>
            )}
            {(() => {
              const sub = getFirdariaSubInterpretation(firPeriod.planet, firSub?.planet);
              if (!sub) return null;
              return (
                <div className={`mt-2 pt-2 border-t border-violet-500/20 space-y-1`}>
                  <div className={`text-[11px] font-semibold ${theme.header}`}>{sub.tone}</div>
                  <p className={`text-[11px] ${theme.text} opacity-70 leading-relaxed m-0`}>
                    {sub.sub_mode}
                  </p>
                  <p className={`text-[11px] ${theme.accent} leading-relaxed m-0`}>
                    → {sub.practice}
                  </p>
                </div>
              );
            })()}
          </div>
        ) : (
          <p className={`text-xs ${theme.text} opacity-60 italic`}>Фирдарий не определён</p>
        )}

        {profYear ? (
          <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 p-3">
            <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide mb-1.5">
              🔄 Профекция года
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`text-2xl font-black ${theme.accent}`}>Дом {profYear}</span>
              {profSign && <span className={`text-sm ${theme.text} opacity-55`}>{SIGN_RU[profSign] ?? profSign}</span>}
            </div>
            {profLord && (
              <div className={`text-xs ${theme.header} mb-1`}>
                Лорд года: {PLANET_GL[profLord] ?? ''} {PLANET_RU[profLord] ?? profLord}
              </div>
            )}
            {profYear && HOUSE_THEME[profYear] && (
              <p className={`text-[11px] ${theme.text} opacity-55 italic`}>
                Тема года: {HOUSE_THEME[profYear]}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

// ─── TodayCommandCard — FULL-WIDTH priorities block ───────────────────────────
// 3 columns: USE IT (benefics) | COMPENSATE (practices) | WATCH OUT (malefics + VoC)
function TodayCommandCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
  const compensatory = data.compensatory as Record<string, unknown>;
  const active = (compensatory.active_transits ?? []) as Array<Record<string, unknown>>;
  const topTransits = data.top_transits as Array<Record<string, unknown>>;

  // Benefic transits to leverage (applying first)
  const benefics = topTransits
    .filter(t => t.nature === 'benefic')
    .sort((a, b) => (b.applying ? 1 : 0) - (a.applying ? 1 : 0))
    .slice(0, 3);

  // Malefic warnings (applying first)
  const malefics = topTransits
    .filter(t => t.nature === 'malefic')
    .sort((a, b) => (b.applying ? 1 : 0) - (a.applying ? 1 : 0))
    .slice(0, 3);

  // Compensatory practices from active transits — personalized per transit.
  // Normalize to handle both string[] and object[] shapes from backend.
  const compItems: Array<{
    planet: string; sign: string; actions: string[]; function: string;
    tension: string; nature: string; natalPlanet: string; aspect: string;
    applying: boolean; orb: number;
  }> = [];
  active.slice(0, 4).forEach(at => {
    const actions = normalizePractices(at.practices).slice(0, 3).map(p => p.practice);
    if (!actions.length) return;
    const matchedTransit = topTransits.find(t => String(t.transit_planet ?? '') === String(at.planet ?? ''));
    compItems.push({
      planet: String(at.planet ?? ''),
      sign: String(at.sign ?? ''),
      actions,
      function: String(at.function ?? ''),
      tension: String(at.tension_signal ?? ''),
      nature: String(matchedTransit?.nature ?? 'mixed'),
      natalPlanet: matchedTransit ? String(matchedTransit.natal_planet ?? '') : '',
      aspect:      matchedTransit ? String(matchedTransit.aspect ?? '')       : '',
      applying:    matchedTransit ? Boolean(matchedTransit.applying)          : false,
      orb:         matchedTransit ? Number(matchedTransit.orb ?? 99)          : 99,
    });
  });

  const hasContent = benefics.length > 0 || malefics.length > 0 || compItems.length > 0;
  const moonVoid = data.moon.is_void;
  const moonVoidSign = data.moon.void_end_sign;

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden card-lift`}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-400" aria-hidden="true" />
          <h2 className={`text-sm font-bold ${theme.header} m-0`}>Рекомендации на сегодня</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${theme.text} opacity-60 uppercase tracking-wide`}>синтез ваших транзитов</span>
          <ScopeBadge scope="personal" />
        </div>
      </div>

      {!hasContent && !moonVoid ? (
        <div className="px-5 py-8 text-center">
          <span className="text-3xl block mb-2">✨</span>
          <p className={`text-sm ${theme.text} opacity-70`}>День без активных транзитов — действуйте свободно</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/8">

          {/* ── COL 1: ДЕЙСТВУЙТЕ ─────────────────────────────────────────── */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#4ade80]" />
              <h3 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest m-0">Используйте</h3>
            </div>
            {benefics.length === 0 ? (
              <p className={`text-xs ${theme.text} opacity-60 italic`}>Благоприятных транзитов нет — чистая воля</p>
            ) : benefics.map((t, i) => {
              const tp = String(t.transit_planet ?? '');
              const np = String(t.natal_planet ?? '');
              const asp = String(t.aspect ?? '');
              const quick = TRANSIT_QUICK_THEME[tp]?.[asp];
              return (
                <div key={i} className="rounded-xl border border-emerald-500/20 bg-emerald-500/6 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-emerald-400 font-bold text-sm">{PLANET_GL[tp] ?? ''}</span>
                    <span className={`text-xs font-semibold ${theme.header}`}>{PLANET_RU[tp] ?? tp}</span>
                    <span className={`text-xs ${ASPECT_COLOR[asp] ?? 'text-gray-400'}`}>
                      {ASPECT_SYM[asp] ?? ''} {PLANET_RU[np] ?? np}
                    </span>
                    {Boolean(t.applying) && (
                      <span className="ml-auto text-[10px] text-amber-300/80 font-medium">→ нарастает</span>
                    )}
                  </div>
                  {quick && (
                    <p className="text-[11px] text-emerald-300/80 font-medium leading-snug">{quick}</p>
                  )}
                  {Boolean(t.compensatory_hint) && Boolean((t.compensatory_hint as Record<string,unknown>).tension_signal) && !quick && (
                    <p className="text-[11px] text-emerald-300/60 italic leading-snug">
                      {String((t.compensatory_hint as Record<string,unknown>).tension_signal)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── COL 2: КОМПЕНСИРУЙТЕ ──────────────────────────────────────── */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
              <h3 className="text-[11px] font-bold text-amber-400 uppercase tracking-widest m-0">Компенсируйте</h3>
            </div>
            {compItems.length === 0 ? (
              <p className={`text-xs ${theme.text} opacity-60 italic`}>Компенсирующих практик нет</p>
            ) : compItems.map((item, i) => {
              const isPos = item.nature === 'benefic';
              const accentCls = isPos ? 'text-blue-400' : item.nature === 'malefic' ? 'text-red-300' : 'text-amber-300';
              const timing = orbTiming(item.orb, item.applying);
              return (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-3">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`text-[11px] font-bold ${accentCls}`}>
                      {PLANET_GL[item.planet] ?? ''} {PLANET_RU[item.planet] ?? item.planet}
                    </span>
                    <span className={`text-[10px] ${theme.text} opacity-65`}>в {SIGN_RU[item.sign] ?? item.sign}</span>
                    {item.natalPlanet && (
                      <span className={`text-[10px] ${ASPECT_COLOR[item.aspect] ?? 'text-white/65'}`}>
                        {ASPECT_SYM[item.aspect] ?? ''} натал. {PLANET_RU[item.natalPlanet] ?? item.natalPlanet}
                      </span>
                    )}
                  </div>
                  {item.tension && (
                    <p className={`text-[10px] italic ${accentCls} opacity-75 mb-1.5 leading-snug`}>
                      Симптом: {item.tension}
                    </p>
                  )}
                  <div className="space-y-1 mt-1">
                    {item.actions.map((a, j) => (
                      <div key={j} className="flex items-start gap-1.5">
                        <span className={`${accentCls} text-[10px] font-bold mt-0.5 shrink-0`}>{j + 1}.</span>
                        <p className={`text-[11px] ${theme.header} leading-snug`}>{a}</p>
                      </div>
                    ))}
                  </div>
                  {timing && (
                    <p className="text-[10px] text-amber-300/60 mt-1.5">⏰ {timing}{item.orb < 99 ? ` · орб ${item.orb.toFixed(1)}°` : ''}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── COL 3: ОСТОРОЖНО ─────────────────────────────────────────── */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_#f87171]" />
              <h3 className="text-[11px] font-bold text-red-400 uppercase tracking-widest m-0">Осторожно</h3>
            </div>

            {/* VoC warning at top of this column */}
            {moonVoid && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} className="text-amber-400 shrink-0" aria-hidden="true" />
                  <span className="text-[11px] font-bold text-amber-400">Луна Пустого Хода</span>
                </div>
                <p className="text-[11px] text-amber-300/70 leading-snug">
                  Новые начинания потеряются. Завершайте начатое, не подписывайте договоры.
                  {moonVoidSign ? ` Закончится в ${SIGN_RU[moonVoidSign] ?? moonVoidSign}.` : ''}
                </p>
              </div>
            )}

            {malefics.length === 0 && !moonVoid ? (
              <p className={`text-xs ${theme.text} opacity-60 italic`}>Серьёзных напряжений нет</p>
            ) : malefics.map((t, i) => {
              const tp = String(t.transit_planet ?? '');
              const np = String(t.natal_planet ?? '');
              const asp = String(t.aspect ?? '');
              const quick = TRANSIT_QUICK_THEME[tp]?.[asp];
              const hint = t.compensatory_hint as Record<string, unknown> | undefined;
              return (
                <div key={i} className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-red-400 font-bold text-sm">{PLANET_GL[tp] ?? ''}</span>
                    <span className={`text-xs font-semibold ${theme.header}`}>{PLANET_RU[tp] ?? tp}</span>
                    <span className={`text-xs ${ASPECT_COLOR[asp] ?? 'text-gray-400'}`}>
                      {ASPECT_SYM[asp] ?? ''} {PLANET_RU[np] ?? np}
                    </span>
                    {Boolean(t.applying) && (
                      <span className="ml-auto text-[10px] text-red-400/70 font-medium">→ нарастает</span>
                    )}
                  </div>
                  {quick && (
                    <p className="text-[11px] text-red-300/80 font-medium leading-snug">{quick}</p>
                  )}
                  {Boolean(hint?.tension_signal) && !quick && (
                    <p className="text-[11px] text-red-300/60 italic leading-snug">{String(hint!.tension_signal)}</p>
                  )}
                  {Boolean(hint?.top_practice) && Boolean((hint!.top_practice as Record<string,unknown>).practice) && (
                    <div className="mt-1.5 flex items-start gap-1">
                      <Sparkles size={12} className="text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="text-[10px] text-amber-300/70">
                        {String((hint?.top_practice as Record<string,unknown>).practice)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}


// ─── FortuneAndPeriodRow — Fortune Lot + Firdaria in a row ───────────────────
function FortuneLotCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
  const { fortune_today } = data;
  if (!fortune_today?.sign) return null;
  return (
    <Card title="Жребий Фортуны" icon={Star} theme={theme} accent="text-yellow-400" badge={<ScopeBadge scope="personal" />}>
      <div className="flex items-start gap-3">
        <span className="text-4xl leading-none" style={{ filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.5))' }}>🎯</span>
        <div className="flex-1">
          <div className={`text-base font-bold ${theme.header} mb-0.5`}>
            {SIGN_RU[fortune_today.sign] ?? fortune_today.sign}
            {fortune_today.deg_min ? ` · ${fortune_today.deg_min}` : ''}
          </div>
          <div className={`text-xs ${theme.text} opacity-70 mb-2`}>Фокус удачи на сегодня</div>
          {FORTUNE_SIGN_INTERP[fortune_today.sign] && (
            <p className={`text-[11px] italic ${theme.text} opacity-65 leading-relaxed border-l-2 border-yellow-500/30 pl-2.5`}>
              {FORTUNE_SIGN_INTERP[fortune_today.sign]}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── CompensatoryNow ──────────────────────────────────────────────────────────
function CompensatoryNow({ comp, theme, topTransits }: {
  comp: Record<string, unknown>;
  theme: ThemeLike;
  topTransits: Array<Record<string, unknown>>;
}) {
  const active  = (comp.active_transits ?? []) as Array<Record<string, unknown>>;
  const pairs   = (comp.aspect_pairs ?? []) as Array<Record<string, unknown>>;
  const opening = comp.opening as string | undefined;

  const enriched = active.slice(0, 4).map(at => {
    const planet = String(at.planet ?? '');
    const sign   = String(at.sign ?? '');
    const match  = topTransits.find(t => String(t.transit_planet ?? '') === planet);
    const natalPlanet = match ? String(match.natal_planet ?? '') : '';
    const aspect      = match ? String(match.aspect ?? '') : '';
    const nature      = match ? String(match.nature ?? 'mixed') : 'mixed';
    const applying    = match ? Boolean(match.applying) : false;
    const orb         = match ? Number(match.orb ?? 99) : 99;
    return { raw: at, natalPlanet, aspect, nature, applying, orb, planet, sign };
  });

  if (enriched.length === 0 && pairs.length === 0) {
    return (
      <div className="text-center py-4">
        <span className="text-3xl block mb-2">✨</span>
        <p className={`text-xs ${theme.text} opacity-70`}>Активных напряжений нет — хороший день для действий</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {opening && (
        <div className="rounded-xl bg-white/4 border border-white/10 px-3 py-2.5">
          <p className={`text-[11px] italic ${theme.text} opacity-70 leading-relaxed`}>{opening}</p>
        </div>
      )}
      {enriched.map((at, i) => {
        const practices = (at.raw.practices ?? []) as Array<Record<string, unknown>>;
        const isNeg = at.nature === 'malefic';
        const isPos = at.nature === 'benefic';
        const borderCls = isNeg ? 'border-red-500/25 bg-red-500/5' : isPos ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5';
        const accentCls = isNeg ? 'text-red-300' : isPos ? 'text-emerald-300' : 'text-amber-300';
        const labelCls  = isNeg ? '↓ нейтрализовать' : isPos ? '↑ усилить' : '→ практика';

        return (
          <div key={i} className={`rounded-xl border ${borderCls} overflow-hidden`}>
            <div className="px-3 pt-2.5 pb-2">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className={`text-xs font-bold ${theme.header}`}>
                  {PLANET_GL[at.planet] ?? ''} {PLANET_RU[at.planet] ?? at.planet} в {SIGN_RU[at.sign] ?? at.sign}
                </span>
                {at.natalPlanet && (
                  <span className={`text-[10px] ${theme.text} opacity-70`}>
                    {ASPECT_SYM[at.aspect] ?? ''} {PLANET_GL[at.natalPlanet] ?? ''} {PLANET_RU[at.natalPlanet] ?? at.natalPlanet}
                  </span>
                )}
                <span className={`text-[10px] ml-auto px-1.5 py-px rounded-full border ${at.applying ? 'border-amber-500/30 text-amber-400' : 'border-white/15 text-white/55'}`}>
                  {at.applying ? '→ нарастает' : '↘ слабеет'}
                </span>
              </div>
              {Boolean(at.raw.tension_signal) && (
                <p className={`text-[11px] italic ${accentCls} opacity-80 leading-relaxed`}>
                  {String(at.raw.tension_signal)}
                </p>
              )}
            </div>
            {practices.length > 0 && (
              <div className="px-3 pb-2.5 space-y-1.5 border-t border-white/6 pt-2">
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-[10px] uppercase tracking-wider ${theme.text} opacity-65`}>{labelCls}</div>
                  {(() => {
                    const t = orbTiming(at.orb, at.applying);
                    return t ? <div className="text-[10px] text-amber-300/60">⏰ {t}</div> : null;
                  })()}
                </div>
                {normalizePractices(practices).slice(0, 3).map((pr, j) => (
                  <div key={j} className="flex items-start gap-1.5">
                    <span className={`text-[10px] mt-0.5 ${accentCls} shrink-0 font-bold`}>{j + 1}.</span>
                    <div className="min-w-0">
                      <div className={`text-[11px] font-medium ${theme.header} leading-tight`}>{pr.practice}</div>
                      {pr.why && <div className={`text-[10px] ${theme.text} opacity-65 leading-tight mt-px`}>{pr.why}</div>}
                      {pr.timing && <div className="text-[10px] text-amber-300/55 leading-tight mt-px">⏰ {pr.timing}</div>}
                    </div>
                  </div>
                ))}
                {Boolean(at.raw.function) && (
                  <div className={`text-[10px] ${theme.text} opacity-65 italic border-t border-white/5 pt-1.5 mt-1`}>
                    Функция планеты: {String(at.raw.function)}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {pairs.slice(0,1).map((p, i) => {
        const pairPractices = normalizePractices(p.practices);
        return (
          <div key={`pair-${i}`} className="rounded-xl bg-indigo-500/8 border border-indigo-500/20 p-3">
            <div className="text-[10px] font-semibold text-indigo-300 mb-1 flex items-center gap-1">
              <span>⚗</span> {String(p.name ?? p.pair ?? '')}
            </div>
            {Boolean(p.tension) && <p className={`text-[11px] italic ${theme.text} opacity-55 mb-1.5`}>{String(p.tension)}</p>}
            {pairPractices.slice(0, 3).map((pr, j) => (
              <div key={j} className={`text-[11px] ${theme.header} flex gap-1.5 mb-0.5`}>
                <CheckCircle size={12} className="text-indigo-400 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{pr.practice}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── LocationAdviceCard ───────────────────────────────────────────────────────
function LocationAdviceCard({ data, birthData, theme }: { data: DashboardData; birthData: BirthInput; theme: ThemeLike }) {
  const [open, setOpen] = useState(false);
  const profections = data.profections as Record<string, unknown>;
  const lord  = String(profections?.annual_lord ?? profections?.lord_of_year ?? '');
  const house = Number(profections?.annual_house ?? profections?.profected_house ?? 0);
  const dirInfo = lord ? PLANET_DIRECTION[lord] : null;
  const houseAdvice = house ? HOUSE_LOCATION_ADVICE[house] : null;
  const topTransits = (data.top_transits ?? []) as Array<Record<string, unknown>>;
  const beneficJupiter = topTransits.find(t => String(t.transit_planet ?? '') === 'jupiter' && String(t.nature ?? '') === 'benefic');
  const activeMalefic = topTransits.filter(t => String(t.nature ?? '') === 'malefic').length;
  const cityName = (birthData as unknown as Record<string, unknown>).city as string || '';

  if (!dirInfo && !houseAdvice) return null;

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden card-lift`}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={open ? 'Свернуть блок локаций' : 'Развернуть блок локаций'}
        className="w-full px-4 py-3 min-h-[44px] flex items-center justify-between gap-2 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin size={16} className={theme.accent} aria-hidden="true" />
          <span className={`text-sm font-semibold ${theme.header}`}><span aria-hidden="true">📍 </span>Локации · Куда ехать в этот период</span>
          <ScopeBadge scope="personal" />
          {lord && <span className={`text-[10px] ${theme.text} opacity-65`}>Лорд: {PLANET_RU[lord] ?? lord}</span>}
        </div>
        {open ? <ChevronUp size={16} className={`${theme.text} opacity-65`} aria-hidden="true" /> : <ChevronDown size={16} className={`${theme.text} opacity-65`} aria-hidden="true" />}
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
          {dirInfo && lord && (
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/8 p-3">
              <div className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-1.5">
                {PLANET_GL[lord] ?? ''} {PLANET_RU[lord] ?? lord} — лорд вашего года
              </div>
              <div className="flex items-start gap-2.5 mb-2">
                <span className="text-2xl">🧭</span>
                <div>
                  <div className={`text-sm font-bold ${theme.header}`}>{dirInfo.dir}</div>
                  <div className={`text-xs ${theme.text} opacity-55`}>{dirInfo.places}</div>
                </div>
              </div>
              <p className={`text-[11px] ${theme.text} opacity-65 leading-relaxed border-l-2 border-violet-500/30 pl-2`}>{dirInfo.travel}</p>
            </div>
          )}
          {houseAdvice && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide mb-1">Дом {house} — тема года</div>
              <p className={`text-xs ${theme.text} opacity-65 leading-relaxed`}>{houseAdvice}</p>
            </div>
          )}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-3 space-y-2">
            <div className="text-[10px] text-white/60 font-semibold uppercase tracking-wide">⏰ Прямо сейчас</div>
            {beneficJupiter ? (
              <div className="flex items-start gap-2">
                <span className="text-base">✈️</span>
                <p className={`text-xs ${theme.text} opacity-65`}>Юпитер делает благоприятный аспект — отличное время для путешествий.</p>
              </div>
            ) : activeMalefic >= 3 ? (
              <div className="flex items-start gap-2">
                <span className="text-base">🏠</span>
                <p className={`text-xs ${theme.text} opacity-65`}>Несколько напряжённых транзитов — лучше оставаться на знакомой территории.</p>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <span className="text-base">🗺️</span>
                <p className={`text-xs ${theme.text} opacity-65`}>Нейтральный фон — поездки не против. Ориентируйтесь на рекомендацию лорда года.</p>
              </div>
            )}
            {cityName && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/65">
                <MapPin size={12} aria-hidden="true" />
                <span>Текущая локация: <span className={theme.header}>{cityName}</span></span>
                {dirInfo ? <span className="opacity-60">· Направление энергии: {dirInfo.dir}</span> : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CompensatoryForecast (lazy 3-window accordion) ───────────────────────────
function CompensatoryForecast({ birthData, theme }: { birthData: BirthInput; theme: ThemeLike }) {
  const [data, setData]       = useState<CompensatoryForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [open, setOpen]       = useState<Record<string, boolean>>({});
  const WINDOW_BORDER: Record<string, string> = {
    now:'border-amber-500/30 bg-amber-500/5', near:'border-blue-500/30 bg-blue-500/5', medium:'border-violet-500/30 bg-violet-500/5',
  };
  const WINDOW_ACCENT: Record<string, string> = { now:'text-amber-300', near:'text-blue-300', medium:'text-violet-300' };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await getCompensatoryForecast(birthData)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [birthData]);

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden card-lift`}>
      <button
        onClick={() => { if (!data && !loading) load(); setOpen(o => ({...o, __h: !o.__h})); }}
        aria-expanded={Boolean(open.__h)}
        aria-label={open.__h ? 'Свернуть компенсаторный прогноз' : 'Развернуть компенсаторный прогноз'}
        className="w-full px-4 py-3 min-h-[44px] flex items-center justify-between gap-2 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Shield size={16} className={theme.accent} aria-hidden="true" />
          <span className={`text-sm font-semibold ${theme.header}`}>Компенсаторный прогноз</span>
          <ScopeBadge scope="personal" />
          <span className={`text-[10px] ${theme.text} opacity-65`}>1–6 месяцев, по вашим транзитам</span>
          {data && <span className={`text-[10px] text-emerald-400`}>· {data.windows.length} окна</span>}
        </div>
        {open.__h ? <ChevronUp size={16} className={`${theme.text} opacity-65`} aria-hidden="true" /> : <ChevronDown size={16} className={`${theme.text} opacity-65`} aria-hidden="true" />}
      </button>

      {open.__h && (
        <div className="border-t border-white/10 px-4 pb-4 space-y-3 pt-3">
          {loading && (
            <div className="py-6 text-center">
              <RefreshCw size={16} className={`${theme.accent} animate-spin mx-auto mb-2`} aria-hidden="true" />
              <p className={`text-xs ${theme.text} opacity-70`}>Анализирую транзиты ближайших месяцев…</p>
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
          {data && data.windows.map((win: ForecastWindow) => (
            <div key={win.window} className={`rounded-xl border ${WINDOW_BORDER[win.window] ?? theme.card} overflow-hidden`}>
              <button
                onClick={() => setOpen(o => ({...o, [win.window]: !o[win.window]}))}
                aria-expanded={Boolean(open[win.window])}
                aria-label={`${win.label} — ${open[win.window] ? 'свернуть' : 'развернуть'}`}
                className="w-full px-3 py-2.5 min-h-[44px] flex items-center justify-between hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset"
              >
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${WINDOW_ACCENT[win.window]}`}>{win.label}</span>
                  <span className={`text-[10px] ${theme.text} opacity-60`}>{win.key_transits.length} транзитов</span>
                </div>
                {open[win.window] ? <ChevronUp size={12} className={`${theme.text} opacity-65`} aria-hidden="true" /> : <ChevronDown size={12} className={`${theme.text} opacity-65`} aria-hidden="true" />}
              </button>
              {open[win.window] && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/10">
                  {win.key_transits.length > 0 && (
                    <div className="pt-2">
                      <p className={`text-[10px] uppercase tracking-wider ${theme.text} opacity-60 mb-1.5`}>Ключевые транзиты</p>
                      {win.key_transits.map((kt, i) => {
                        const nc = NATURE_CONFIG[kt.nature] ?? NATURE_CONFIG.mixed;
                        return (
                          <div key={i} className={`flex items-center gap-2 text-[11px] rounded-lg px-2 py-1.5 mb-1 ${nc.bg}`}>
                            <span className={`font-bold ${nc.color}`}>{nc.icon}</span>
                            <span className={`font-semibold ${theme.header}`}>{PLANET_GL[kt.transit_planet] ?? ''} {PLANET_RU[kt.transit_planet] ?? kt.transit_planet}</span>
                            <span className={ASPECT_COLOR[kt.aspect] ?? ''}>{ASPECT_SYM[kt.aspect] ?? ''} {ASPECT_NAME[kt.aspect] ?? kt.aspect}</span>
                            <span className={`${theme.text} opacity-55`}>{PLANET_GL[kt.natal_planet] ?? ''} {PLANET_RU[kt.natal_planet] ?? kt.natal_planet}</span>
                            <span className={`ml-auto text-[10px] ${kt.applying ? 'text-amber-300' : 'text-slate-400'}`}>{kt.applying ? '→' : '↘'} {kt.orb.toFixed(1)}°</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {win.opening && <p className={`text-[11px] italic ${theme.text} opacity-55 border-l-2 border-white/15 pl-2`}>{win.opening}</p>}
                  {win.active_transits.slice(0, 3).map((at, i) => {
                    const pList = at.practices as Array<Record<string,unknown>>;
                    if (!pList?.length) return null;
                    const top = pList[0];
                    return (
                      <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                        <div className={`text-[10px] font-semibold ${theme.accent} mb-1`}>
                          {PLANET_GL[String(at.planet ?? '')] ?? ''} {PLANET_RU[String(at.planet ?? '')] ?? String(at.planet)} · {at.tension_signal as string}
                        </div>
                        <div className={`text-[11px] font-semibold ${theme.header}`}>{Boolean(top.practice) && String(top.practice)}</div>
                        {Boolean(top.why) && <div className={`text-[10px] ${theme.text} opacity-70 mt-0.5`}>{String(top.why)}</div>}
                        {Boolean(top.timing) && <div className="text-[10px] text-amber-300/60 mt-0.5">⏰ {String(top.timing)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {data && data.windows.length === 0 && (
            <p className={`text-sm ${theme.text} opacity-60 text-center py-3`}>Значимых транзитов в ближайшие 6 месяцев не обнаружено</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── GlobalAstroPanel ─────────────────────────────────────────────────────────
const PLANET_GLYPH_G: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
};
const PLANET_RU_G: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн',
  uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
};
const SIGN_RU_G: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};
const ASP_COLOR_G: Record<string, string> = {
  conjunction: 'text-violet-400', opposition: 'text-orange-400',
  trine: 'text-blue-400', square: 'text-red-400', sextile: 'text-cyan-400',
  quincunx: 'text-amber-400', semisquare: 'text-rose-400', sesquiquadrate: 'text-rose-400',
  sesquisquare: 'text-rose-400', biquintile: 'text-purple-400', quintile: 'text-purple-400',
  semi_square: 'text-rose-400', bi_quintile: 'text-purple-400',
};
const ASP_RU_G: Record<string, string> = {
  conjunction: '☌', opposition: '☍', trine: '△', square: '□', sextile: '⚹',
  quincunx: '⚻', semisquare: '∠', sesquiquadrate: '⌓', sesquisquare: '⌓',
  biquintile: '⬡', quintile: '⬠', semi_square: '∠', bi_quintile: '⬡',
};
function GlobalAstroPanel({ theme }: { theme: ThemeLike }) {
  const [data, setData]   = useState<DailyGlobalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]   = useState(false);

  const load = useCallback(async () => {
    if (loading || data) return;
    setLoading(true);
    try { setData(await getDailyGlobal()); }
    catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [loading, data]);

  const handleToggle = useCallback(() => {
    if (!open && !data && !loading) load();
    setOpen(v => !v);
  }, [open, data, loading, load]);

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden card-lift`}>
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 min-h-[44px] flex items-center justify-between gap-2 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset"
        aria-expanded={open}
        aria-label={open ? 'Свернуть глобальный астрофон' : 'Развернуть глобальный астрофон'}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Globe size={16} className={theme.accent} aria-hidden="true" />
          <span className={`text-sm font-semibold ${theme.header}`}>Глобальный астрофон</span>
          <ScopeBadge scope="general" />
          {data && (
            <span className={`text-[10px] ${theme.text} opacity-60`}>
              {data.planets?.length ?? 0} планет · {data.mutual_aspects?.length ?? 0} аспектов
            </span>
          )}
          {!data && !loading && <span className={`text-[10px] ${theme.text} opacity-60`}>нажмите чтобы загрузить</span>}
        </div>
        {open ? <ChevronUp size={16} className={`${theme.text} opacity-65`} aria-hidden="true" /> : <ChevronDown size={16} className={`${theme.text} opacity-65`} aria-hidden="true" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10">
          {loading && (
            <div className="py-4 text-center">
              <RefreshCw size={16} className={`${theme.accent} animate-spin mx-auto`} aria-hidden="true" />
            </div>
          )}
          {data && (
            <div className="space-y-3 pt-3">
              <div>
                <div className="text-[10px] text-white/55 uppercase tracking-wider mb-2">Позиции планет</div>
                <div className="flex flex-wrap gap-1.5">
                  {(data.planets ?? []).map(p => (
                    <div key={p.planet} className="flex items-center gap-1 text-[11px] border border-white/10 rounded-full px-2.5 py-0.5 bg-white/5 backdrop-blur-sm">
                      <span className="text-white/65">{PLANET_GLYPH_G[p.planet] ?? ''}</span>
                      <span className="text-white/65">{SIGN_RU_G[p.sign] ?? p.sign}</span>
                      <span className="text-white/55">{p.degree.toFixed(1)}°</span>
                    </div>
                  ))}
                </div>
              </div>
              {(data.mutual_aspects ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] text-white/55 uppercase tracking-wider mb-2">Транзитные аспекты (орб ≤ 5°)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(data.mutual_aspects ?? []).slice(0, 8).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] border border-white/10 rounded-xl px-2.5 py-1.5 bg-white/5 backdrop-blur-sm">
                        <span className={`font-bold text-base leading-none ${ASP_COLOR_G[a.aspect] ?? 'text-white/70'}`}>{ASP_RU_G[a.aspect] ?? a.aspect}</span>
                        <span className="text-white/55">{PLANET_RU_G[a.planet1] ?? a.planet1} – {PLANET_RU_G[a.planet2] ?? a.planet2}</span>
                        <span className="text-white/55 ml-auto">{a.orb.toFixed(1)}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.interpretation && (() => {
                let interp = String(data.interpretation);
                const simpleIdx = interp.indexOf(' Просто: ');
                if (simpleIdx > 0) interp = interp.slice(0, simpleIdx);
                interp = interp.replace(/^Глобальный астрофон \d{4}-\d{2}-\d{2}:\s*/i, '');
                const signMap: Record<string,string> = { 'aries':'Овен','taurus':'Телец','gemini':'Близнецы','cancer':'Рак','leo':'Лев','virgo':'Дева','libra':'Весы','scorpio':'Скорпион','sagittarius':'Стрелец','capricorn':'Козерог','aquarius':'Водолей','pisces':'Рыбы' };
                Object.entries(signMap).forEach(([en, ru]) => { interp = interp.replace(new RegExp(`\\b${en}\\b`, 'gi'), ru); });
                interp = interp.trim();
                if (!interp) return null;
                return (
                  <div className="border-t border-white/10 pt-3">
                    <p className={`text-xs ${theme.text} opacity-60 leading-relaxed`}>{interp}</p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PlanetPositionsCard (Pro) ────────────────────────────────────────────────
function PlanetPositionsCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
  const retros = data.retrograde_planets ?? [];
  const retroSet = new Set(retros.map(r => r.planet));
  const transitPlanets = useMemo(() => {
    const seen = new Set<string>();
    return (data.top_transits as Array<Record<string, unknown>>).reduce<Array<{planet: string}>>((acc, t) => {
      const p = t.transit_planet as string;
      if (p && !seen.has(p)) { seen.add(p); acc.push({ planet: p }); }
      return acc;
    }, []);
  }, [data.top_transits]);
  retros.forEach(r => {
    if (!transitPlanets.find(tp => tp.planet === r.planet)) transitPlanets.push({ planet: r.planet });
  });
  if (transitPlanets.length === 0) return null;
  return (
    <Card title="Планеты сегодня" icon={Info} theme={theme} badge={<ScopeBadge scope="general" />}>
      <div className="flex flex-wrap gap-1.5">
        {transitPlanets.map(({ planet }) => {
          const retroData = retros.find(r => r.planet === planet);
          const isRetro = retroSet.has(planet);
          return (
            <div key={planet} className={`flex items-center gap-1 text-[11px] rounded-full px-2.5 py-0.5 border ${isRetro ? 'bg-violet-500/10 border-violet-500/30 text-violet-300' : 'bg-white/5 backdrop-blur-sm border-white/10 text-white/65'}`}>
              <span className={isRetro ? 'text-violet-400' : 'text-white/65'}>{PLANET_GL[planet] ?? ''}</span>
              <span>{PLANET_RU[planet] ?? planet}</span>
              {retroData && <span className="text-[10px] opacity-55">{SIGN_RU[retroData.sign] ?? retroData.sign} {retroData.degree}°</span>}
              {isRetro && <span className="text-violet-400 font-bold">⟲</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function DashboardView({ birthData, theme, userId }: Props) {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const { mode, toggle: toggleMode, isPro } = useAppMode();
  const { streak, longest } = useVisitStreak();

  const load = useCallback(async (force = false) => {
    setLoading(true); setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (force) invalidateDashboardCache(birthData);
      setData(await getDashboard(birthData, today));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData]);

  useEffect(() => { load(); }, [load]);

  const ptr = usePullToRefresh(() => load(true));

  if (loading) return (
    <div role="status" aria-live="polite" aria-label="Загрузка дашборда" className="space-y-4">
      {/* Hero skeleton */}
      <div className={`rounded-2xl border ${theme.card} overflow-hidden card-lift`}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            <div className="flex-1 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <div className="h-4 w-24 rounded-full skeleton-shimmer" />
                <div className="h-4 w-32 rounded-full skeleton-shimmer" />
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-32 rounded-full bg-white/8" />
                <div className="h-5 w-20 rounded-full bg-white/8" />
              </div>
              <div className="h-3 w-64 rounded-full bg-white/6" />
            </div>
            <div className="w-[100px] h-[100px] rounded-full bg-white/8 shrink-0" />
            <div className="flex flex-col gap-2.5 w-full sm:w-48 shrink-0">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="w-3 h-3 rounded bg-white/10" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-16 rounded bg-white/8" />
                    <div className="h-1.5 rounded-full bg-white/8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* NowStrip skeleton */}
      <div className={`rounded-2xl border ${theme.card} p-3`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 p-3 space-y-2">
              <div className="h-2.5 w-16 rounded bg-white/10" />
              <div className="h-4 w-32 rounded bg-white/12" />
              <div className="h-2 w-full rounded bg-white/6" />
            </div>
          ))}
        </div>
      </div>
      {/* Timeline skeleton */}
      <div className={`rounded-2xl border ${theme.card} p-4`}>
        <div className="flex justify-between mb-3">
          <div className="h-3 w-40 rounded bg-white/10" />
          <div className="h-3 w-32 rounded bg-white/8" />
        </div>
        <div className="h-[140px] rounded-xl skeleton-shimmer relative overflow-hidden">
          <svg viewBox="0 0 720 140" className="w-full h-full" preserveAspectRatio="none">
            <path
              d="M 28 100 Q 120 60 200 80 T 360 50 T 540 90 T 692 70"
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
      {/* Command skeleton */}
      <div className={`rounded-2xl border ${theme.card} p-4`}>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-white/10" />
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-2.5 rounded bg-white/6" />
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`rounded-2xl border ${theme.card} overflow-hidden card-lift`}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-white/15" />
              <div className="h-3 w-24 rounded bg-white/10" />
            </div>
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-2.5 rounded bg-white/6" style={{ width: `${70 + j * 7}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div role="alert" className={`rounded-2xl border ${theme.card} p-8 text-center`}>
      <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" aria-hidden="true" />
      <p className="text-red-300 text-sm mb-4">{error}</p>
      <button
        onClick={() => load(true)}
        className={`text-xs px-5 py-2 min-h-[40px] rounded-xl ${theme.btn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
      >
        Повторить
      </button>
    </div>
  );

  if (!data) return null;

  const { moon, top_transits, compensatory, fortune_today } = data;

  return (
    <div className="space-y-4" style={{ transform: ptr.pull > 0 ? `translateY(${ptr.pull}px)` : undefined, transition: ptr.busy || ptr.pull === 0 ? 'transform 220ms ease-out' : undefined }}>

      {(ptr.pull > 0 || ptr.busy) && (
        <div
          className="fixed left-0 right-0 top-0 flex justify-center pointer-events-none z-50"
          style={{ transform: `translateY(${Math.max(8, ptr.pull - 32)}px)` }}
          aria-hidden="true"
        >
          <div className="bg-white/10 backdrop-blur border border-white/15 rounded-full px-3 py-1.5 flex items-center gap-2 text-xs text-white/85">
            <RefreshCw size={12} className={ptr.busy ? 'animate-spin' : ''} style={{ transform: !ptr.busy ? `rotate(${ptr.progress * 360}deg)` : undefined, transition: 'transform 80ms linear' }} aria-hidden="true" />
            {ptr.busy ? 'Обновляю…' : ptr.progress >= 1 ? 'Отпустите для обновления' : 'Тяните для обновления'}
          </div>
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock size={16} className={`${theme.accent} opacity-60`} aria-hidden="true" />
          <h1 className={`text-sm font-semibold ${theme.header} opacity-80 m-0`}>Ежедневный дашборд</h1>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Режим отображения" className="flex rounded-xl overflow-hidden border border-white/10 text-xs">
            <button
              onClick={() => { if (mode !== 'simple') { haptic('select'); toggleMode(); } }}
              aria-pressed={mode === 'simple'}
              className={`px-3 py-2 min-h-[40px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset ${mode === 'simple' ? 'bg-white/15 text-white font-semibold' : 'text-white/70 hover:text-white'}`}
            >
              Простой
            </button>
            <button
              onClick={() => { if (mode !== 'pro') { haptic('select'); toggleMode(); } }}
              aria-pressed={mode === 'pro'}
              className={`px-3 py-2 min-h-[40px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset ${mode === 'pro' ? 'bg-white/15 text-white font-semibold' : 'text-white/70 hover:text-white'}`}
            >
              Профи <span aria-hidden="true">✦</span>
            </button>
          </div>
          <Suspense fallback={null}>
            <DayCardShare data={data} theme={theme} />
          </Suspense>
          {streak >= 2 && (
            <span
              className="inline-flex items-center gap-1 text-xs px-2.5 py-2 min-h-[40px] rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 font-semibold tabular-nums"
              title={`Подряд: ${streak} ${streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}. Рекорд: ${longest}.`}
              aria-label={`Серия посещений: ${streak} дней подряд`}
            >
              <span aria-hidden="true">🔥</span>
              {streak}
            </span>
          )}
          <button
            onClick={() => { haptic('tap'); load(true); }}
            aria-label="Обновить дашборд"
            className={`flex items-center gap-1.5 text-xs px-3 py-2 min-h-[40px] rounded-xl ${theme.btn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
          >
            <RefreshCw size={12} aria-hidden="true" /> Обновить
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          УРОВЕНЬ 0 — СЕЙЧАС: hour-grain панель (час, а не день)
      ══════════════════════════════════════════════════════════════════ */}
      <NowStrip data={data} theme={theme} userId={userId} />

      <HourlyTimeline data={data} theme={theme} />

      <LunationCard data={data} theme={theme} />

      <Suspense fallback={null}>
        <NotificationTimeSettings
          theme={theme}
          userId={userId}
          bodyHint={(() => {
            const sc = data.day_score ?? 50;
            const tone = sc >= 65 ? 'благоприятный' : sc <= 40 ? 'осторожный' : 'нейтральный';
            const top = data.top_transits?.[0];
            const tail = top ? ` · ${top.transit_planet} ${top.aspect} ${top.natal_planet}` : '';
            return `Сегодня ${tone} день · балл ${sc}${tail}`.slice(0, 140);
          })()}
        />
      </Suspense>

      {/* ══════════════════════════════════════════════════════════════════
          УРОВЕНЬ 1 — ГЛАВНЫЙ ЭКРАН: Score + сферы (above-the-fold якорь)
      ══════════════════════════════════════════════════════════════════ */}
      <HeroCard data={data} birthData={birthData} theme={theme} />

      {/* ══════════════════════════════════════════════════════════════════
          УРОВЕНЬ 2 — Личность клиента (натальная суть)
      ══════════════════════════════════════════════════════════════════ */}
      <PersonalIdentityCard data={data} birthData={birthData} theme={theme} />

      {/* ══════════════════════════════════════════════════════════════════
          УРОВЕНЬ 3 — Стратегический фокус (тема года × день × риск)
      ══════════════════════════════════════════════════════════════════ */}
      <StrategicFocusCard data={data} theme={theme} />

      {/* ══════════════════════════════════════════════════════════════════
          ВИЗУАЛЬНАЯ ПАНЕЛЬ — графики/диаграммы текущей ситуации
      ══════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={<div className={`rounded-2xl border ${theme.card} p-8 text-center text-xs ${theme.text} opacity-50`}>Загружаю графики…</div>}>
        <DashboardCharts data={data} theme={theme} />
      </Suspense>

      {/* ══════════════════════════════════════════════════════════════════
          УРОВЕНЬ 4 — Тактические рекомендации (FULL WIDTH, 3 колонки)
          Используйте | Компенсируйте | Осторожно
          (PersonalActionPlan удалён — дублировал этот блок)
      ══════════════════════════════════════════════════════════════════ */}
      <TodayCommandCard data={data} theme={theme} />

      {/* ══════════════════════════════════════════════════════════════════
          УРОВЕНЬ 3 — Контекст (3-колоночная сетка)
          Луна | Транзиты | Ближайшие события
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <MoonCard data={data} theme={theme} />
        <KeyTransitsCard data={data} theme={theme} isPro={isPro} />
        <UpcomingEventsCard data={data} theme={theme} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          УРОВЕНЬ 4 — Детали и периоды (смешанная сетка)
          Соляр года | Периоды | Фортуна | [Позиции планет — Pro]
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Solar Return — compact dashboard summary */}
        <div className="md:col-span-1 xl:col-span-1">
          <Suspense fallback={<div className={`rounded-2xl border ${theme.card} p-6 text-xs ${theme.text} opacity-50`}>Соляр…</div>}>
            <SolarReturnDashCard birth={birthData} theme={theme} />
          </Suspense>
        </div>

        {/* Periods — wider */}
        <div className="md:col-span-1 xl:col-span-1">
          <PeriodsCard data={data} theme={theme} />
        </div>

        {/* Fortune */}
        {fortune_today?.sign && (
          <div className="md:col-span-1 xl:col-span-1">
            <FortuneLotCard data={data} theme={theme} />
          </div>
        )}

        {/* Planet Positions (Pro) */}
        {isPro && <PlanetPositionsCard data={data} theme={theme} />}

        {/* Lunar mini-calendar — full row span */}
        <div className="md:col-span-2 xl:col-span-3">
          <Suspense fallback={<div className={`rounded-2xl border ${theme.card} p-6 text-xs ${theme.text} opacity-50`}>Лунный календарь…</div>}>
            <LunarCalendarCard
              theme={theme}
              utc={birthData.utc}
              lat={birthData.lat}
              lon={birthData.lon}
              days={7}
            />
          </Suspense>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          УРОВЕНЬ 5 — Аккордеоны (дополнительная информация)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <LocationAdviceCard data={data} birthData={birthData} theme={theme} />
        <CompensatoryForecast birthData={birthData} theme={theme} />
        <GlobalAstroPanel theme={theme} />
      </div>

    </div>
  );
}

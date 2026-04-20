// ─── DashboardView — Redesigned bento-grid daily dashboard ──────────────────
// Rebuilt for better information hierarchy, visual clarity, and usability.
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Moon, Star, Zap, TrendingUp, Sparkles, Shield,
  AlertTriangle, CheckCircle, RefreshCw, Info, ChevronDown, ChevronUp,
  AlertCircle, Calendar, Globe, Heart, Briefcase, DollarSign,
  Activity, Palette, MapPin, Clock,
} from 'lucide-react';
import {
  getDashboard, getDailyGlobal, getCompensatoryForecast,
  DailyGlobalResult, CompensatoryForecastResult, ForecastWindow,
} from '../services/astrologyService';
import type { DashboardData } from '../services/astrologyService';
import type { BirthInput } from '../types/astro';
import LunarCalendarCard from './LunarCalendarCard';
import { useAppMode } from '../hooks/useAppMode';

// ─── Theme type ───────────────────────────────────────────────────────────────
interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
}

interface Props {
  birthData: BirthInput;
  theme: ThemeLike;
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
    <div className={`rounded-2xl border ${theme.card} overflow-hidden ${className}`}>
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10">
        <Icon size={14} className={accent ?? theme.accent} />
        <span className={`text-sm font-semibold ${theme.header}`}>{title}</span>
        {badge && <div className="ml-auto flex items-center gap-1.5">{badge}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Circular score ring ──────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 40, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  const color = score >= 65 ? '#22c55e' : score <= 40 ? '#ef4444' : '#f59e0b';
  const label = score >= 65 ? 'Удача' : score <= 40 ? 'Стой' : 'Нейтр';
  return (
    <div className="relative w-[100px] h-[100px] shrink-0">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] leading-none mt-0.5 font-medium" style={{ color: `${color}80` }}>{label}</span>
      </div>
    </div>
  );
}

// ─── SphereBar ────────────────────────────────────────────────────────────────
function SphereBar({ icon: Icon, label, score, color }: {
  icon: React.ElementType; label: string; score: number; color: string;
}) {
  const barColor = score >= 65 ? '#22c55e' : score <= 40 ? '#ef4444' : '#f59e0b';
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={13} className={color} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] text-white/60">{label}</span>
          <span className="text-[11px] font-bold" style={{ color: barColor }}>{score}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: barColor, boxShadow: `0 0 6px ${barColor}60` }} />
        </div>
      </div>
    </div>
  );
}

// ─── HeroCard ─────────────────────────────────────────────────────────────────
function HeroCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
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

  const scoreColor = score >= 65 ? '#22c55e' : score <= 40 ? '#ef4444' : '#f59e0b';
  const scoreBg = score >= 65
    ? 'from-emerald-950/40 to-slate-950/0'
    : score <= 40
    ? 'from-red-950/40 to-slate-950/0'
    : 'from-amber-950/40 to-slate-950/0';

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden`}>
      {/* Gradient header strip */}
      <div className={`bg-gradient-to-r ${scoreBg} px-5 pt-5 pb-4`}>
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          {/* Left: greeting + date + narrative */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-medium ${theme.text} opacity-50`}>{greeting} ·</span>
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
                  <AlertTriangle size={8} />
                  ВоК{vocCountdown ? ` ещё ${vocCountdown}` : ' активен'}
                </span>
              )}
              {retros.slice(0, 3).map(r => (
                <span key={r.planet} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-medium">
                  ⟲ {PLANET_RU[r.planet] ?? r.planet}
                </span>
              ))}
            </div>

            <p className={`text-sm italic ${theme.text} opacity-65 leading-relaxed max-w-md`}>{narrative}</p>
          </div>

          {/* Center: ring */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <ScoreRing score={score} />
            <span className="text-[9px] text-white/30 uppercase tracking-wider">энергия дня</span>
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

      {/* Retrogrades strip */}
      {retros.length > 0 && (
        <div className="px-5 pb-4 pt-3 border-t border-white/8">
          <div className="text-[10px] uppercase tracking-wider text-white/25 mb-2">Ретроградные планеты</div>
          <div className="flex flex-wrap gap-2">
            {retros.map(r => (
              <div key={r.planet} className="flex items-center gap-1.5 rounded-lg bg-violet-500/8 border border-violet-500/20 px-2.5 py-1.5">
                <span className="text-violet-400 font-bold text-xs">⟲</span>
                <span className={`text-xs font-semibold ${theme.header}`}>
                  {PLANET_GL[r.planet] ?? ''} {PLANET_RU[r.planet] ?? r.planet}
                </span>
                <span className={`text-[10px] ${theme.text} opacity-50`}>{SIGN_RU[r.sign] ?? r.sign} {r.degree}°</span>
                {RETRO_MEANING[r.planet] && (
                  <span className={`text-[10px] italic ${theme.text} opacity-40`}>— {RETRO_MEANING[r.planet]}</span>
                )}
              </div>
            ))}
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
    <Card title="Луна сегодня" icon={Moon} theme={theme} accent="text-blue-300">
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
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
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
              <span className={`text-[10px] ${theme.text} opacity-40`}>{isWaxing ? '↑ растёт' : '↓ убывает'}</span>
            </div>
          </div>
        </div>

        {/* VoC banner */}
        {moon.is_void && (
          <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-amber-300">Луна Пустого Хода</div>
              {moon.void_end_sign && (
                <div className="text-[10px] text-amber-300/60 mt-0.5">
                  Закончится при входе Луны в {SIGN_RU[moon.void_end_sign] ?? moon.void_end_sign}
                </div>
              )}
              <div className="text-[10px] text-amber-300/50 mt-0.5">Новые начинания не рекомендуются</div>
            </div>
          </div>
        )}

        {/* Mansion */}
        {mansion && (
          <div className="border-t border-white/10 pt-3">
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${theme.accent} mb-1.5`}>
              <Star size={11} />
              Мансия #{mansion.number} · {mansion.name_ru}
            </div>
            <div className={`text-xs ${theme.text} opacity-55 italic mb-2.5`}>{mansion.theme}</div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-2">
                <div className="text-[10px] text-emerald-400 font-semibold mb-1">✓ Сегодня хорошо</div>
                {mansion.do.slice(0, 2).map((a, i) => (
                  <div key={i} className={`text-[11px] ${theme.text} opacity-70 flex gap-1 mb-0.5`}>
                    <span className="text-emerald-400 shrink-0">›</span>{a}
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-red-500/8 border border-red-500/20 p-2">
                <div className="text-[10px] text-red-400 font-semibold mb-1">✗ Избегать</div>
                {mansion.avoid.slice(0, 2).map((a, i) => (
                  <div key={i} className={`text-[11px] ${theme.text} opacity-70 flex gap-1 mb-0.5`}>
                    <span className="text-red-400 shrink-0">›</span>{a}
                  </div>
                ))}
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
        className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left ${hint ? 'cursor-pointer hover:bg-white/3' : 'cursor-default'} transition-colors`}
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
          <span className={`${theme.text} opacity-30 shrink-0 mt-0.5`}>
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </span>
        )}
      </button>

      {expanded && hint?.top_practice && (
        <div className="px-3 pb-3 pt-2 border-t border-white/8">
          {Boolean(hint.top_practice['practice']) && (
            <div className={`text-[11px] font-semibold ${theme.header} flex gap-1.5 mb-1`}>
              <Sparkles size={9} className={`${cfg.color} mt-0.5 shrink-0`} />
              {String(hint.top_practice['practice'])}
            </div>
          )}
          {Boolean(hint.top_practice['why']) && (
            <div className={`text-[10px] ${theme.text} opacity-50 pl-3.5 leading-relaxed`}>
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
        </div>
      }
    >
      {transits.length === 0 ? (
        <div className="text-center py-4">
          <CheckCircle size={20} className="text-emerald-400 mx-auto mb-1.5" />
          <p className={`text-xs ${theme.text} opacity-50`}>Активных транзитов нет — спокойный день</p>
        </div>
      ) : (
        <div>
          {transits.slice(0, isPro ? 6 : 4).map((t, i) => (
            <TransitRow key={i} transit={t as unknown as Record<string, unknown>} theme={theme} />
          ))}
          {!isPro && transits.length > 4 && (
            <div className={`text-[10px] ${theme.text} opacity-30 text-center mt-1`}>
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
        <p className={`text-xs ${theme.text} opacity-40`}>Особых событий в ближайшие 2 недели нет</p>
      </div>
    </Card>
  );

  return (
    <Card title="Ближайшие события" icon={Calendar} theme={theme} accent="text-blue-400">
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
    <Card title="Периоды · Профекции" icon={TrendingUp} theme={theme} accent="text-violet-400">
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
                  <div className={`text-[10px] ${theme.text} opacity-40`}>{firPeriod.start} – {firPeriod.end}</div>
                )}
              </div>
            </div>
            {firSub && (
              <div className={`text-[11px] ${theme.accent} mb-1.5`}>
                Суб-период: {PLANET_GL[firSub.planet ?? ''] ?? ''} {PLANET_RU[firSub.planet ?? ''] ?? firSub.planet}
              </div>
            )}
            {firPeriod.planet && FIRDARIA_NARRATIVE[firPeriod.planet] && (
              <p className={`text-[11px] ${theme.text} opacity-65 leading-relaxed border-l-2 border-violet-500/30 pl-2`}>
                {FIRDARIA_NARRATIVE[firPeriod.planet]}
              </p>
            )}
          </div>
        ) : (
          <p className={`text-xs ${theme.text} opacity-30 italic`}>Фирдарий не определён</p>
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

  // Compensatory practices from active transits
  const compItems: Array<{
    planet: string; sign: string; practice: string; why: string; timing: string;
    tension: string; nature: string;
  }> = [];
  active.slice(0, 4).forEach(at => {
    const pList = (at.practices ?? []) as Array<Record<string, unknown>>;
    if (!pList.length) return;
    const top = pList[0];
    if (!top.practice) return;
    const matchedTransit = topTransits.find(t => String(t.transit_planet ?? '') === String(at.planet ?? ''));
    compItems.push({
      planet: String(at.planet ?? ''),
      sign: String(at.sign ?? ''),
      practice: String(top.practice),
      why: String(top.why ?? ''),
      timing: String(top.timing ?? ''),
      tension: String(at.tension_signal ?? ''),
      nature: String(matchedTransit?.nature ?? 'mixed'),
    });
  });

  const hasContent = benefics.length > 0 || malefics.length > 0 || compItems.length > 0;
  const moonVoid = data.moon.is_void;
  const moonVoidSign = data.moon.void_end_sign;

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-400" />
          <span className={`text-sm font-bold ${theme.header}`}>Рекомендации на сегодня</span>
        </div>
        <span className={`text-[10px] ${theme.text} opacity-35 uppercase tracking-wide`}>синтез транзитов</span>
      </div>

      {!hasContent && !moonVoid ? (
        <div className="px-5 py-8 text-center">
          <span className="text-3xl block mb-2">✨</span>
          <p className={`text-sm ${theme.text} opacity-50`}>День без активных транзитов — действуйте свободно</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/8">

          {/* ── COL 1: ДЕЙСТВУЙТЕ ─────────────────────────────────────────── */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#4ade80]" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Используйте</span>
            </div>
            {benefics.length === 0 ? (
              <p className={`text-xs ${theme.text} opacity-35 italic`}>Благоприятных транзитов нет — чистая воля</p>
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
                      <span className="ml-auto text-[9px] text-amber-300/80 font-medium">→ нарастает</span>
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
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">Компенсируйте</span>
            </div>
            {compItems.length === 0 ? (
              <p className={`text-xs ${theme.text} opacity-35 italic`}>Компенсирующих практик нет</p>
            ) : compItems.map((item, i) => {
              const isPos = item.nature === 'benefic';
              const accentCls = isPos ? 'text-blue-400' : item.nature === 'malefic' ? 'text-red-300' : 'text-amber-300';
              return (
                <div key={i} className="rounded-xl border border-white/10 bg-white/3 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`text-[11px] font-bold ${accentCls}`}>
                      {PLANET_GL[item.planet] ?? ''} {PLANET_RU[item.planet] ?? item.planet}
                    </span>
                    <span className={`text-[10px] ${theme.text} opacity-40`}>в {SIGN_RU[item.sign] ?? item.sign}</span>
                  </div>
                  {item.tension && (
                    <p className={`text-[10px] italic ${accentCls} opacity-70 mb-1.5 leading-snug`}>{item.tension}</p>
                  )}
                  <p className={`text-xs font-semibold ${theme.header} leading-snug`}>{item.practice}</p>
                  {item.why && (
                    <p className={`text-[10px] ${theme.text} opacity-45 mt-1 leading-snug`}>{item.why}</p>
                  )}
                  {item.timing && (
                    <p className="text-[10px] text-amber-300/55 mt-1">⏰ {item.timing}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── COL 3: ОСТОРОЖНО ─────────────────────────────────────────── */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_#f87171]" />
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest">Осторожно</span>
            </div>

            {/* VoC warning at top of this column */}
            {moonVoid && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-amber-400">Луна Пустого Хода</span>
                </div>
                <p className="text-[11px] text-amber-300/70 leading-snug">
                  Новые начинания потеряются. Завершайте начатое, не подписывайте договоры.
                  {moonVoidSign ? ` Закончится в ${SIGN_RU[moonVoidSign] ?? moonVoidSign}.` : ''}
                </p>
              </div>
            )}

            {malefics.length === 0 && !moonVoid ? (
              <p className={`text-xs ${theme.text} opacity-35 italic`}>Серьёзных напряжений нет</p>
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
                      <span className="ml-auto text-[9px] text-red-400/70 font-medium">→ нарастает</span>
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
                      <Sparkles size={9} className="text-amber-400 mt-0.5 shrink-0" />
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
    <Card title="Жребий Фортуны" icon={Star} theme={theme} accent="text-yellow-400">
      <div className="flex items-start gap-3">
        <span className="text-4xl leading-none" style={{ filter: 'drop-shadow(0 0 8px rgba(253,224,71,0.5))' }}>🎯</span>
        <div className="flex-1">
          <div className={`text-base font-bold ${theme.header} mb-0.5`}>
            {SIGN_RU[fortune_today.sign] ?? fortune_today.sign}
            {fortune_today.deg_min ? ` · ${fortune_today.deg_min}` : ''}
          </div>
          <div className={`text-xs ${theme.text} opacity-50 mb-2`}>Фокус удачи на сегодня</div>
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
    return { raw: at, natalPlanet, aspect, nature, applying, planet, sign };
  });

  if (enriched.length === 0 && pairs.length === 0) {
    return (
      <div className="text-center py-4">
        <span className="text-3xl block mb-2">✨</span>
        <p className={`text-xs ${theme.text} opacity-50`}>Активных напряжений нет — хороший день для действий</p>
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
                  <span className={`text-[10px] ${theme.text} opacity-50`}>
                    {ASPECT_SYM[at.aspect] ?? ''} {PLANET_GL[at.natalPlanet] ?? ''} {PLANET_RU[at.natalPlanet] ?? at.natalPlanet}
                  </span>
                )}
                <span className={`text-[9px] ml-auto px-1.5 py-px rounded-full border ${at.applying ? 'border-amber-500/30 text-amber-400' : 'border-white/15 text-white/30'}`}>
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
                <div className={`text-[9px] uppercase tracking-wider ${theme.text} opacity-30 mb-1`}>{labelCls}</div>
                {practices.slice(0, 2).map((pr, j) => (
                  <div key={j} className="flex items-start gap-1.5">
                    <span className={`text-[10px] mt-0.5 ${accentCls} shrink-0`}>›</span>
                    <div className="min-w-0">
                      <div className={`text-[11px] font-medium ${theme.header} leading-tight`}>{Boolean(pr.practice) ? String(pr.practice) : ''}</div>
                      {Boolean(pr.why) && <div className={`text-[10px] ${theme.text} opacity-45 leading-tight mt-px`}>{String(pr.why)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {pairs.slice(0,1).map((p, i) => (
        <div key={`pair-${i}`} className="rounded-xl bg-indigo-500/8 border border-indigo-500/20 p-3">
          <div className="text-[10px] font-semibold text-indigo-300 mb-1 flex items-center gap-1">
            <span>⚗</span> {String(p.name ?? p.pair ?? '')}
          </div>
          {Boolean(p.tension) && <p className={`text-[11px] italic ${theme.text} opacity-55 mb-1.5`}>{String(p.tension)}</p>}
          {Array.isArray(p.practices) && (p.practices as Array<Record<string,unknown>>).slice(0,2).map((pr, j) => (
            <div key={j} className={`text-[11px] ${theme.header} flex gap-1.5 mb-0.5`}>
              <CheckCircle size={9} className="text-indigo-400 mt-0.5 shrink-0" />
              {Boolean(pr.practice) ? String(pr.practice) : String(pr)}
            </div>
          ))}
        </div>
      ))}
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
    <div className={`rounded-2xl border ${theme.card} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin size={14} className={theme.accent} />
          <span className={`text-sm font-semibold ${theme.header}`}>📍 Локации · Куда ехать в этот период</span>
          {lord && <span className={`text-[10px] ${theme.text} opacity-40`}>Лорд: {PLANET_RU[lord] ?? lord}</span>}
        </div>
        {open ? <ChevronUp size={14} className={`${theme.text} opacity-40`} /> : <ChevronDown size={14} className={`${theme.text} opacity-40`} />}
      </button>

      {open && (
        <div className="border-t border-white/8 px-4 pb-4 pt-3 space-y-3">
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
          <div className="rounded-xl border border-white/10 bg-white/3 p-3 space-y-2">
            <div className="text-[10px] text-white/35 font-semibold uppercase tracking-wide">⏰ Прямо сейчас</div>
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
              <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                <MapPin size={10} />
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
    <div className={`rounded-2xl border ${theme.card} overflow-hidden`}>
      <button
        onClick={() => { if (!data && !loading) load(); setOpen(o => ({...o, __h: !o.__h})); }}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className={theme.accent} />
          <span className={`text-sm font-semibold ${theme.header}`}>🛡 Компенсаторный прогноз</span>
          <span className={`text-[10px] ${theme.text} opacity-40`}>1–6 месяцев</span>
          {data && <span className={`text-[10px] text-emerald-400`}>· {data.windows.length} окна</span>}
        </div>
        {open.__h ? <ChevronUp size={14} className={`${theme.text} opacity-40`} /> : <ChevronDown size={14} className={`${theme.text} opacity-40`} />}
      </button>

      {open.__h && (
        <div className="border-t border-white/8 px-4 pb-4 space-y-3 pt-3">
          {loading && (
            <div className="py-6 text-center">
              <RefreshCw size={18} className={`${theme.accent} animate-spin mx-auto mb-2`} />
              <p className={`text-xs ${theme.text} opacity-50`}>Анализирую транзиты ближайших месяцев…</p>
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
          {data && data.windows.map((win: ForecastWindow) => (
            <div key={win.window} className={`rounded-xl border ${WINDOW_BORDER[win.window] ?? theme.card} overflow-hidden`}>
              <button
                onClick={() => setOpen(o => ({...o, [win.window]: !o[win.window]}))}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white/3 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${WINDOW_ACCENT[win.window]}`}>{win.label}</span>
                  <span className={`text-[10px] ${theme.text} opacity-35`}>{win.key_transits.length} транзитов</span>
                </div>
                {open[win.window] ? <ChevronUp size={12} className={`${theme.text} opacity-40`} /> : <ChevronDown size={12} className={`${theme.text} opacity-40`} />}
              </button>
              {open[win.window] && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/8">
                  {win.key_transits.length > 0 && (
                    <div className="pt-2">
                      <p className={`text-[10px] uppercase tracking-wider ${theme.text} opacity-35 mb-1.5`}>Ключевые транзиты</p>
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
                      <div key={i} className="rounded-lg bg-white/5 border border-white/8 p-2.5">
                        <div className={`text-[10px] font-semibold ${theme.accent} mb-1`}>
                          {PLANET_GL[String(at.planet ?? '')] ?? ''} {PLANET_RU[String(at.planet ?? '')] ?? String(at.planet)} · {at.tension_signal as string}
                        </div>
                        <div className={`text-[11px] font-semibold ${theme.header}`}>{Boolean(top.practice) && String(top.practice)}</div>
                        {Boolean(top.why) && <div className={`text-[10px] ${theme.text} opacity-50 mt-0.5`}>{String(top.why)}</div>}
                        {Boolean(top.timing) && <div className="text-[10px] text-amber-300/60 mt-0.5">⏰ {String(top.timing)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {data && data.windows.length === 0 && (
            <p className={`text-sm ${theme.text} opacity-35 text-center py-3`}>Значимых транзитов в ближайшие 6 месяцев не обнаружено</p>
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
    <div className={`rounded-2xl border ${theme.card} overflow-hidden`}>
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-white/3 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Globe size={14} className={theme.accent} />
          <span className={`text-sm font-semibold ${theme.header}`}>🌍 Глобальный астрофон</span>
          {data && (
            <span className={`text-[10px] ${theme.text} opacity-35`}>
              {data.planets?.length ?? 0} планет · {data.mutual_aspects?.length ?? 0} аспектов
            </span>
          )}
          {!data && !loading && <span className={`text-[10px] ${theme.text} opacity-30`}>нажмите чтобы загрузить</span>}
        </div>
        {open ? <ChevronUp size={14} className={`${theme.text} opacity-40`} /> : <ChevronDown size={14} className={`${theme.text} opacity-40`} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/8">
          {loading && (
            <div className="py-4 text-center">
              <RefreshCw size={16} className={`${theme.accent} animate-spin mx-auto`} />
            </div>
          )}
          {data && (
            <div className="space-y-3 pt-3">
              <div>
                <div className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Позиции планет</div>
                <div className="flex flex-wrap gap-1.5">
                  {(data.planets ?? []).map(p => (
                    <div key={p.planet} className="flex items-center gap-1 text-[11px] border border-white/10 rounded-full px-2.5 py-0.5 bg-white/3">
                      <span className="text-white/45">{PLANET_GLYPH_G[p.planet] ?? ''}</span>
                      <span className="text-white/65">{SIGN_RU_G[p.sign] ?? p.sign}</span>
                      <span className="text-white/25">{p.degree.toFixed(1)}°</span>
                    </div>
                  ))}
                </div>
              </div>
              {(data.mutual_aspects ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Транзитные аспекты (орб ≤ 5°)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(data.mutual_aspects ?? []).slice(0, 8).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] border border-white/8 rounded-xl px-2.5 py-1.5 bg-white/3">
                        <span className={`font-bold text-base leading-none ${ASP_COLOR_G[a.aspect] ?? 'text-white/50'}`}>{ASP_RU_G[a.aspect] ?? a.aspect}</span>
                        <span className="text-white/55">{PLANET_RU_G[a.planet1] ?? a.planet1} – {PLANET_RU_G[a.planet2] ?? a.planet2}</span>
                        <span className="text-white/20 ml-auto">{a.orb.toFixed(1)}°</span>
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
                  <div className="border-t border-white/8 pt-3">
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
    <Card title="Планеты сегодня" icon={Info} theme={theme}>
      <div className="flex flex-wrap gap-1.5">
        {transitPlanets.map(({ planet }) => {
          const retroData = retros.find(r => r.planet === planet);
          const isRetro = retroSet.has(planet);
          return (
            <div key={planet} className={`flex items-center gap-1 text-[11px] rounded-full px-2.5 py-0.5 border ${isRetro ? 'bg-violet-500/10 border-violet-500/30 text-violet-300' : 'bg-white/3 border-white/10 text-white/65'}`}>
              <span className={isRetro ? 'text-violet-400' : 'text-white/45'}>{PLANET_GL[planet] ?? ''}</span>
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
export default function DashboardView({ birthData, theme }: Props) {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const { mode, toggle: toggleMode, isPro } = useAppMode();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      setData(await getDashboard(birthData, today));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex flex-col items-center gap-3 py-16">
      <div className="relative">
        <RefreshCw size={24} className={`${theme.accent} animate-spin`} />
      </div>
      <span className={`text-sm ${theme.text} opacity-50`}>Загрузка дашборда…</span>
    </div>
  );

  if (error) return (
    <div className={`rounded-2xl border ${theme.card} p-8 text-center`}>
      <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
      <p className="text-red-400 text-sm mb-4">{error}</p>
      <button onClick={load} className={`text-xs px-5 py-2 rounded-xl ${theme.btn}`}>
        Повторить
      </button>
    </div>
  );

  if (!data) return null;

  const { moon, top_transits, compensatory, fortune_today } = data;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock size={14} className={`${theme.accent} opacity-60`} />
          <h2 className={`text-sm font-semibold ${theme.header} opacity-70`}>Ежедневный дашборд</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/10 text-xs">
            <button
              onClick={() => mode !== 'simple' && toggleMode()}
              className={`px-3 py-1.5 transition-all ${mode === 'simple' ? 'bg-white/15 text-white font-semibold' : 'text-white/35 hover:text-white/60'}`}
            >
              Простой
            </button>
            <button
              onClick={() => mode !== 'pro' && toggleMode()}
              className={`px-3 py-1.5 transition-all ${mode === 'pro' ? 'bg-white/15 text-white font-semibold' : 'text-white/35 hover:text-white/60'}`}
            >
              Профи ✦
            </button>
          </div>
          <button onClick={load} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl ${theme.btn}`}>
            <RefreshCw size={11} /> Обновить
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          УРОВЕНЬ 1 — Статус дня (FULL WIDTH)
      ══════════════════════════════════════════════════════════════════ */}
      <HeroCard data={data} theme={theme} />

      {/* ══════════════════════════════════════════════════════════════════
          УРОВЕНЬ 2 — Рекомендации (FULL WIDTH, 3 колонки)
          Используйте | Компенсируйте | Осторожно
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
          Периоды (2 cols) | Фортуна | [Позиции планет — Pro]
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

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

        {/* Компенсаторика — детальный разбор (Pro) */}
        {isPro && (
          <Card
            title="Компенсаторика · детали"
            icon={Sparkles}
            theme={theme}
            accent="text-amber-400"
            badge={
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/25 text-amber-300/60">
                активные транзиты
              </span>
            }
          >
            <CompensatoryNow
              comp={compensatory as unknown as Record<string,unknown>}
              theme={theme}
              topTransits={top_transits as unknown as Array<Record<string, unknown>>}
            />
          </Card>
        )}

        {/* Planet Positions (Pro) */}
        {isPro && <PlanetPositionsCard data={data} theme={theme} />}

        {/* Lunar mini-calendar — full row span */}
        <div className="md:col-span-2 xl:col-span-3">
          <LunarCalendarCard
            theme={theme}
            utc={birthData.utc}
            lat={birthData.lat}
            lon={birthData.lon}
            days={7}
          />
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

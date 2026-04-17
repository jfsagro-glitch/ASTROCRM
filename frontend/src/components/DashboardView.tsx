// ─── DashboardView — Bento-grid daily dashboard ───────────────────────────────
// Shows: HeroCard (score + sphere bars + retrogrades), Moon card, key transits,
// upcoming events, firdaria/profections, fortune lot, planet positions, 7-day
// lunar mini-calendar, compensatory forecast, global astro panel.
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Moon, Star, Zap, TrendingUp, Sparkles, Shield,
  AlertTriangle, CheckCircle, RefreshCw, Info, ChevronDown, ChevronUp, AlertCircle,
  Calendar, Globe,
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

// ─── isDark helper ────────────────────────────────────────────────────────────
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
const PLANET_FIRD_INTERP: Record<string, string> = {
  sun:     'фокус на самореализации, лидерстве и витальности',
  moon:    'эмоции, интуиция и семейные темы на первом плане',
  mercury: 'коммуникации, обучение, деловые переговоры активизированы',
  venus:   'отношения, творчество, финансы — время для гармонии',
  mars:    'энергия действия высокая, риск конфликтов — направляй силу',
  jupiter: 'расширение, рост, удача и духовные откровения',
  saturn:  'уроки, ограничения, долгосрочное строительство судьбы',
  uranus:  'неожиданные перемены, свобода, прорывы',
  neptune: 'мистика, растворение границ, духовный поиск',
  pluto:   'глубокая трансформация, власть, скрытые процессы',
};
const HOUSE_THEME: Record<number, string> = {
  1:'идентичность и тело', 2:'ресурсы и ценности', 3:'коммуникации',
  4:'дом и семья', 5:'творчество и дети', 6:'здоровье и работа',
  7:'партнёрство', 8:'трансформация', 9:'путешествия и философия',
  10:'карьера и статус', 11:'друзья и цели', 12:'тайны и уединение',
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
  benefic: { label:'Благоприятный', color:'text-emerald-400', bg:'bg-emerald-500/10 border-emerald-500/30', icon:'▲' },
  malefic: { label:'Напряжённый',   color:'text-red-400',     bg:'bg-red-500/10 border-red-500/30',         icon:'▼' },
  mixed:   { label:'Смешанный',     color:'text-amber-400',   bg:'bg-amber-500/10 border-amber-500/30',     icon:'~' },
};

// ─── Day narrative ────────────────────────────────────────────────────────────
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

// ─── Retrograde meanings ──────────────────────────────────────────────────────
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

// ─── Transit quick theme ──────────────────────────────────────────────────────
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

// ─── Firdaria narrative ───────────────────────────────────────────────────────
const FIRDARIA_NARRATIVE: Record<string, string> = {
  sun:     'Ваш солнечный период: пора самовыражения, лидерства, признания. Собирайте плоды — если сеяли.',
  moon:    'Лунный цикл: всё внутреннее выходит наружу. Семья, дом, интуиция, прошлое.',
  mercury: 'Меркурианское время: переговоры, обучение, связи. Слова решают больше, чем действия.',
  venus:   'Венерианский период: отношения, деньги, творчество. Жизнь становится красивее — если вложить усилие.',
  mars:    'Марсианский цикл: энергия высокая, конкуренция жёсткая. Побеждает дисциплина, не импульс.',
  jupiter: 'Период Юпитера: расширение, рост, удача, смысл. Один из лучших периодов жизни — если не транжирить.',
  saturn:  'Сатурнианский цикл: уроки, ограничения, строительство. Медленно, но навсегда.',
  uranus:  'Уранический период: перемены без предупреждения. Гибкость — ваш главный навык.',
  neptune: 'Нептунианское время: растворение старого, духовный поиск. Искусство и интуиция в ресурсе.',
  pluto:   'Плутонианский цикл: трансформация в глубину. Умирает то, что изжило. Рождается то, что настоящее.',
};

// ─── Fortune sign interpretations ────────────────────────────────────────────
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children, className = '', theme, badge }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  className?: string; theme: ThemeLike; badge?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden ${className}`}>
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10">
        <Icon size={14} className={theme.accent} />
        <span className={`text-sm font-medium ${theme.header}`}>{title}</span>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── VoC countdown hook ───────────────────────────────────────────────────────
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
      setLabel(h > 0 ? `ВоК ещё ${h}ч ${m}м` : `ВоК ещё ${m}м`);
      rafRef.current = window.setTimeout(tick, 30000);
    }
    tick();
    return () => { if (rafRef.current) clearTimeout(rafRef.current); };
  }, [vocEndJd]);

  return label;
}

// ─── VocBadge sub-component ───────────────────────────────────────────────────
function VocBadge({ isVoid, vocEndJd }: { isVoid: boolean; vocEndJd: number | null }) {
  const countdown = useVocCountdown(isVoid ? vocEndJd : null);
  if (!isVoid) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium whitespace-nowrap">
      <AlertTriangle size={9} className="shrink-0" />
      {countdown ?? 'ВоК активен'}
    </span>
  );
}

// ─── CircularScore — SVG ring ─────────────────────────────────────────────────
function CircularScore({ score, isDark }: { score: number; isDark: boolean }) {
  const r = 36, cx = 44, cy = 44;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  const color = score >= 65 ? '#22c55e' : score <= 40 ? '#ef4444' : '#f59e0b';
  return (
    <div className="relative w-[88px] h-[88px] shrink-0">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] opacity-40 leading-none mt-0.5" style={{ color: isDark ? 'white' : '#333' }}>/ 100</span>
      </div>
    </div>
  );
}

// ─── SphereMini ───────────────────────────────────────────────────────────────
function SphereMini({ emoji, label, score, isDark }: { emoji: string; label: string; score: number; isDark: boolean }) {
  const color = score >= 65 ? '#22c55e' : score <= 40 ? '#ef4444' : '#f59e0b';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-base shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[10px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{label}</span>
          <span className="text-[10px] font-bold" style={{ color }}>{score}</span>
        </div>
        <div className={`h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
          <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

// ─── HeroCard — full-width first block ───────────────────────────────────────
function HeroCard({ data, theme, isDark }: { data: DashboardData; theme: ThemeLike; isDark: boolean }) {
  const score = data.day_score ?? 50;
  const narrative = getDayNarrative(score);
  const spheres = data.sphere_scores;
  const retros = data.retrograde_planets ?? [];
  const vocEndJd = data.moon.is_void ? ((data.moon as Record<string,unknown>).void_end_utc as number | null ?? null) : null;

  const today = new Date();
  const weekday = today.toLocaleDateString('ru-RU', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const scoreColor = score >= 65 ? 'text-emerald-400' : score <= 40 ? 'text-red-400' : 'text-amber-400';

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden`}>
      <div className="p-5">
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">

          {/* Left: date + badges + narrative */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-lg font-bold ${theme.header} capitalize`}>{weekday},</span>
              <span className={`text-lg font-bold ${theme.header}`}>{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <VocBadge isVoid={data.moon.is_void} vocEndJd={vocEndJd} />
              {retros.slice(0, 3).map(r => (
                <span key={r.planet} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-medium">
                  ⟲ {PLANET_RU[r.planet] ?? r.planet}
                </span>
              ))}
              <span className={`text-xs font-semibold ${scoreColor}`}>
                {score >= 65 ? 'Благоприятный день' : score <= 40 ? 'Напряжённый день' : 'Нейтральный день'}
              </span>
            </div>
            <p className={`text-sm italic ${theme.text} opacity-70 leading-relaxed`}>
              {narrative}
            </p>
          </div>

          {/* Center: circular score */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <CircularScore score={score} isDark={isDark} />
            <span className={`text-[10px] ${theme.text} opacity-40 text-center`}>энергия дня</span>
          </div>

          {/* Right: sphere bars */}
          {spheres && (
            <div className="flex flex-col gap-2 w-full sm:w-44 shrink-0">
              <SphereMini emoji="❤️" label="Любовь" score={spheres.love} isDark={isDark} />
              <SphereMini emoji="💼" label="Работа" score={spheres.work} isDark={isDark} />
              <SphereMini emoji="💰" label="Финансы" score={spheres.finance} isDark={isDark} />
              <SphereMini emoji="🌿" label="Здоровье" score={spheres.health} isDark={isDark} />
              <SphereMini emoji="🎨" label="Творчество" score={spheres.creative} isDark={isDark} />
            </div>
          )}
        </div>

        {/* Retrogrades detail row */}
        {retros.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/8">
            <div className={`text-[10px] uppercase tracking-wider ${theme.text} opacity-30 mb-2`}>Ретроградные планеты</div>
            <div className="flex flex-wrap gap-2">
              {retros.map(r => (
                <div key={r.planet} className="flex items-center gap-1.5 rounded-lg bg-violet-500/8 border border-violet-500/20 px-2.5 py-1.5">
                  <span className="text-violet-300 font-bold text-xs">⟲</span>
                  <span className={`text-xs font-semibold ${theme.header}`}>
                    {PLANET_GL[r.planet] ?? ''} {PLANET_RU[r.planet] ?? r.planet}
                  </span>
                  <span className={`text-[10px] ${theme.text} opacity-50`}>
                    {SIGN_RU[r.sign] ?? r.sign} {r.degree}°
                  </span>
                  {RETRO_MEANING[r.planet] && (
                    <span className={`text-[10px] italic ${theme.text} opacity-40`}>— {RETRO_MEANING[r.planet]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── UpcomingEventsCard ───────────────────────────────────────────────────────
function UpcomingEventsCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
  const lunation = data.next_lunation;
  const retros = data.retrograde_planets ?? [];
  const vocEndJd = data.moon.is_void ? ((data.moon as Record<string,unknown>).void_end_utc as number | null ?? null) : null;

  const events: Array<{ emoji: string; label: string; sub: string; color: string }> = [];

  if (lunation && lunation.days_to_full <= 14) {
    events.push({
      emoji: '🌕',
      label: `Полнолуние через ${lunation.days_to_full} дн.`,
      sub: lunation.full_moon,
      color: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-300',
    });
  }
  if (lunation && lunation.days_to_new <= 14) {
    events.push({
      emoji: '🌑',
      label: `Новолуние через ${lunation.days_to_new} дн.`,
      sub: lunation.new_moon,
      color: 'bg-slate-500/15 border-slate-500/25 text-slate-300',
    });
  }
  if (retros.length > 0) {
    events.push({
      emoji: '⟲',
      label: `Ретро: ${retros.map(r => PLANET_RU[r.planet] ?? r.planet).join(', ')}`,
      sub: 'переосмысление и пересмотр',
      color: 'bg-violet-500/10 border-violet-500/25 text-violet-300',
    });
  }
  if (data.moon.is_void) {
    const countdown = vocEndJd ? '' : '';
    events.push({
      emoji: '🌙',
      label: `Луна Пустого Хода`,
      sub: data.moon.void_end_sign ? `→ до ${SIGN_RU[data.moon.void_end_sign] ?? data.moon.void_end_sign}` : (countdown || 'активен'),
      color: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
    });
  }

  if (events.length === 0) return null;

  return (
    <Card title="Ближайшие события" icon={Calendar} theme={theme}>
      <div className="grid grid-cols-1 gap-2">
        {events.map((ev, i) => (
          <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${ev.color}`}>
            <span className="text-lg leading-none shrink-0">{ev.emoji}</span>
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

// ─── PlanetPositionsCard — compact planet grid (Pro) ──────────────────────────
function PlanetPositionsCard({ data, theme }: { data: DashboardData; theme: ThemeLike }) {
  const retros = data.retrograde_planets ?? [];
  const retroSet = new Set(retros.map(r => r.planet));

  // Build unique planet list from top_transits
  const transitPlanets = useMemo(() => {
    const seen = new Set<string>();
    return (data.top_transits as Array<Record<string, unknown>>).reduce<Array<{planet: string}>>((acc, t) => {
      const p = t.transit_planet as string;
      if (p && !seen.has(p)) { seen.add(p); acc.push({ planet: p }); }
      return acc;
    }, []);
  }, [data.top_transits]);

  // Also add retrogrades not in top_transits
  retros.forEach(r => {
    if (!transitPlanets.find(tp => tp.planet === r.planet)) {
      transitPlanets.push({ planet: r.planet });
    }
  });

  if (transitPlanets.length === 0) return null;

  return (
    <Card title="Планеты сегодня" icon={Globe} theme={theme}>
      <div className="flex flex-wrap gap-1.5">
        {transitPlanets.map(({ planet }) => {
          const retroData = retros.find(r => r.planet === planet);
          const isRetro = retroSet.has(planet);
          return (
            <div
              key={planet}
              className={`flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border ${
                isRetro
                  ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                  : 'bg-white/3 border-white/12 text-white/70'
              }`}
            >
              <span className={isRetro ? 'text-violet-400' : 'text-white/50'}>
                {PLANET_GL[planet] ?? ''}
              </span>
              <span>{PLANET_RU[planet] ?? planet}</span>
              {retroData && <span className="text-[10px] opacity-60">{SIGN_RU[retroData.sign] ?? retroData.sign} {retroData.degree}°</span>}
              {isRetro && <span className="text-violet-400 font-bold">⟲</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── TransitRow — expandable transit with nature badge + compensatory_hint ────
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

  // Quick theme phrase
  const quickTheme = TRANSIT_QUICK_THEME[tp]?.[asp];

  return (
    <div className={`rounded-lg border mb-2 last:mb-0 ${cfg.bg} overflow-hidden`}>
      <button
        onClick={() => hint && setExpanded(e => !e)}
        className={`w-full flex items-start gap-2 px-3 py-2.5 text-left ${hint ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`text-xs mt-0.5 shrink-0 font-bold ${cfg.color}`}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-semibold ${theme.header}`}>
              {PLANET_GL[tp] ?? ''} {PLANET_RU[tp] ?? tp}
            </span>
            <span className={`text-xs font-medium ${ASPECT_COLOR[asp] ?? 'text-gray-400'}`}>
              {ASPECT_SYM[asp] ?? ''} {ASPECT_NAME[asp] ?? asp}
            </span>
            <span className={`text-xs ${theme.text} opacity-70`}>
              {PLANET_GL[np] ?? ''} {PLANET_RU[np] ?? np}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] ${theme.text} opacity-40`}>орб {orb.toFixed(2)}°</span>
            <span className={`text-[10px] ${app ? 'text-amber-300' : 'text-slate-400'}`}>
              {app ? '→ нарастает' : '↘ слабеет'}
            </span>
            {quickTheme && (
              <span className={`text-[10px] font-medium ${cfg.color} opacity-80`}>{quickTheme}</span>
            )}
            {hint?.tension_signal && !quickTheme && (
              <span className={`text-[10px] italic ${cfg.color} opacity-70`}>{hint.tension_signal}</span>
            )}
          </div>
        </div>
        {hint && (
          expanded
            ? <ChevronUp size={12} className={`${theme.text} opacity-40 shrink-0`} />
            : <ChevronDown size={12} className={`${theme.text} opacity-40 shrink-0`} />
        )}
      </button>

      {expanded && hint?.top_practice && (
        <div className="px-3 pb-3 pt-2 border-t border-white/8 space-y-0.5">
          {Boolean(hint.top_practice['practice']) && (
            <div className={`text-[11px] ${theme.header} font-medium flex gap-1.5`}>
              <Sparkles size={9} className={`${cfg.color} mt-0.5 shrink-0`} />
              {String(hint.top_practice['practice'])}
            </div>
          )}
          {Boolean(hint.top_practice['why']) && (
            <div className={`text-[10px] ${theme.text} opacity-55 pl-4`}>
              {String(hint.top_practice['why'])}
            </div>
          )}
          {Boolean(hint.top_practice['timing']) && (
            <div className="text-[10px] text-amber-300/60 pl-4">
              ⏰ {String(hint.top_practice['timing'])}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CompensatoryNow — reads active_transits/aspect_pairs from dashboard ─────
function CompensatoryNow({ comp, theme }: { comp: Record<string, unknown>; theme: ThemeLike }) {
  const active  = (comp.active_transits ?? []) as Array<Record<string, unknown>>;
  const pairs   = (comp.aspect_pairs ?? []) as Array<Record<string, unknown>>;
  const opening = comp.opening as string | undefined;

  if (active.length === 0 && pairs.length === 0) {
    return <p className={`text-xs ${theme.text} opacity-40`}>Нет рекомендаций на сегодня</p>;
  }
  return (
    <div className="space-y-2.5">
      {opening && (
        <p className={`text-[11px] italic ${theme.text} opacity-60 border-l-2 border-white/20 pl-2`}>
          {opening}
        </p>
      )}
      {active.slice(0, 4).map((at, i) => {
        const practices = (at.practices ?? []) as Array<Record<string,unknown>>;
        const top = practices[0];
        if (!top) return null;
        return (
          <div key={i} className="rounded-lg bg-white/5 border border-white/8 p-2.5">
            <div className={`text-[10px] font-semibold ${theme.accent} mb-1`}>
              {PLANET_GL[String(at.planet ?? '')] ?? ''} {PLANET_RU[String(at.planet ?? '')] ?? String(at.planet ?? '')}
              {' в '}{SIGN_RU[String(at.sign ?? '')] ?? String(at.sign ?? '')}
            </div>
            {Boolean(at.tension_signal) && (
              <div className="text-[10px] text-amber-300/80 mb-1 italic">{String(at.tension_signal)}</div>
            )}
            <div className={`text-[11px] font-medium ${theme.header}`}>
              {Boolean(top.practice) && String(top.practice)}
            </div>
            {Boolean(top.why) && (
              <div className={`text-[10px] ${theme.text} opacity-55 mt-0.5`}>{String(top.why)}</div>
            )}
            {Boolean(top.timing) && (
              <div className="text-[10px] text-amber-300/60 mt-0.5">⏰ {String(top.timing)}</div>
            )}
            {practices.length > 1 && (
              <div className={`text-[10px] ${theme.text} opacity-30 mt-1`}>+ ещё {practices.length - 1} практик</div>
            )}
          </div>
        );
      })}
      {pairs.slice(0, 2).map((p, i) => (
        <div key={`pair-${i}`} className="rounded-lg bg-indigo-500/8 border border-indigo-500/20 p-2.5">
          <div className="text-[10px] font-semibold text-indigo-300 mb-1">
            Аспектная пара: {String(p.name ?? p.pair ?? '')}
          </div>
          {Boolean(p.tension) && (
            <div className={`text-[10px] ${theme.text} opacity-60 mb-1`}>{String(p.tension)}</div>
          )}
          {Array.isArray(p.practices) && (p.practices as Array<Record<string,unknown>>).slice(0,2).map((pr, j) => (
            <div key={j} className={`text-[11px] ${theme.header} flex gap-1.5`}>
              <CheckCircle size={9} className="text-indigo-400 mt-0.5 shrink-0" />
              {Boolean(pr.practice) ? String(pr.practice) : String(pr)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── CompensatoryForecast — lazy 3-window accordion ──────────────────────────
function CompensatoryForecast({ birthData, theme }: { birthData: BirthInput; theme: ThemeLike }) {
  const [data, setData]       = useState<CompensatoryForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [open, setOpen]       = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await getCompensatoryForecast(birthData)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [birthData]);

  const WINDOW_BORDER: Record<string, string> = {
    now:'border-amber-500/30 bg-amber-500/5', near:'border-blue-500/30 bg-blue-500/5', medium:'border-violet-500/30 bg-violet-500/5',
  };
  const WINDOW_ACCENT: Record<string, string> = { now:'text-amber-300', near:'text-blue-300', medium:'text-violet-300' };

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden`}>
      <button
        onClick={() => { if (!data && !loading) load(); setOpen(o => ({...o, __h: !o.__h})); }}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className={theme.accent} />
          <span className={`text-sm font-medium ${theme.header}`}>🛡 Компенсаторный прогноз · 1–6 месяцев</span>
          {data && <span className={`text-[10px] ${theme.text} opacity-40`}>{data.windows.length} окна</span>}
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
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
          {data && data.windows.map((win: ForecastWindow) => (
            <div key={win.window} className={`rounded-xl border ${WINDOW_BORDER[win.window] ?? theme.card} overflow-hidden`}>
              <button
                onClick={() => setOpen(o => ({...o, [win.window]: !o[win.window]}))}
                className="w-full px-3 py-2.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${WINDOW_ACCENT[win.window]}`}>{win.label}</span>
                  <span className={`text-[10px] ${theme.text} opacity-40`}>{win.key_transits.length} транзитов</span>
                </div>
                {open[win.window] ? <ChevronUp size={12} className={`${theme.text} opacity-40`} /> : <ChevronDown size={12} className={`${theme.text} opacity-40`} />}
              </button>

              {open[win.window] && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/8">
                  {win.key_transits.length > 0 && (
                    <div className="pt-2">
                      <p className={`text-[10px] uppercase tracking-wider ${theme.text} opacity-40 mb-1.5`}>Ключевые транзиты</p>
                      {win.key_transits.map((kt, i) => {
                        const nc = NATURE_CONFIG[kt.nature] ?? NATURE_CONFIG.mixed;
                        return (
                          <div key={i} className={`flex items-center gap-2 text-[11px] rounded px-2 py-1 mb-1 ${nc.bg}`}>
                            <span className={`font-bold ${nc.color}`}>{nc.icon}</span>
                            <span className={`font-medium ${theme.header}`}>{PLANET_GL[kt.transit_planet] ?? ''} {PLANET_RU[kt.transit_planet] ?? kt.transit_planet}</span>
                            <span className={ASPECT_COLOR[kt.aspect] ?? ''}>{ASPECT_SYM[kt.aspect] ?? ''} {ASPECT_NAME[kt.aspect] ?? kt.aspect}</span>
                            <span className={`${theme.text} opacity-60`}>{PLANET_GL[kt.natal_planet] ?? ''} {PLANET_RU[kt.natal_planet] ?? kt.natal_planet}</span>
                            <span className={`ml-auto text-[10px] ${kt.applying ? 'text-amber-300' : 'text-slate-400'}`}>{kt.applying ? '→' : '↘'} {kt.orb.toFixed(1)}°</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {win.opening && (
                    <p className={`text-[11px] italic ${theme.text} opacity-60 border-l-2 border-white/15 pl-2`}>{win.opening}</p>
                  )}
                  {win.active_transits.slice(0, 3).map((at, i) => {
                    const pList = at.practices as Array<Record<string,unknown>>;
                    if (!pList?.length) return null;
                    const top = pList[0];
                    return (
                      <div key={i} className="rounded-lg bg-white/5 p-2.5">
                        <div className={`text-[10px] font-semibold ${theme.accent} mb-1`}>
                          {PLANET_GL[String(at.planet ?? '')] ?? ''} {PLANET_RU[String(at.planet ?? '')] ?? String(at.planet)} · {at.tension_signal as string}
                        </div>
                        <div className={`text-[11px] font-medium ${theme.header}`}>{Boolean(top.practice) && String(top.practice)}</div>
                        {Boolean(top.why) && <div className={`text-[10px] ${theme.text} opacity-55 mt-0.5`}>{String(top.why)}</div>}
                        {Boolean(top.timing) && <div className="text-[10px] text-amber-300/60 mt-0.5">⏰ {String(top.timing)}</div>}
                        {pList.length > 1 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {pList.slice(1, 3).map((pr, j) => (
                              <li key={j} className={`text-[10px] ${theme.text} opacity-50 flex gap-1.5`}>
                                <span className={theme.accent}>›</span>
                                {Boolean(pr.practice) ? String(pr.practice) : String(pr)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {data && data.windows.length === 0 && (
            <p className={`text-sm ${theme.text} opacity-40 text-center py-3`}>Значимых транзитов в ближайшие 6 месяцев не обнаружено</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardView({ birthData, theme }: Props) {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const { mode, toggle: toggleMode, isPro } = useAppMode();

  const isDark = _isDark(theme);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await getDashboard(birthData, today);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex flex-col items-center gap-3 py-12">
      <RefreshCw size={24} className={`${theme.accent} animate-spin`} />
      <span className={`text-sm ${theme.text}`}>Загрузка дашборда…</span>
    </div>
  );

  if (error) return (
    <div className={`rounded-2xl border ${theme.card} p-6 text-center`}>
      <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
      <p className="text-red-400 text-sm mb-3">{error}</p>
      <button onClick={load} className={`text-xs px-4 py-2 rounded-lg ${theme.btn}`}>
        Повторить
      </button>
    </div>
  );

  if (!data) return null;

  const { moon, top_transits, compensatory, firdaria, profections, fortune_today } = data;
  const mansion = moon.mansion;

  // Extract firdaria info
  const firPeriod  = (firdaria as Record<string, Record<string,string>>)?.main_period;
  const firSub     = (firdaria as Record<string, Record<string,string>>)?.sub_period;

  // Extract profections
  const profYear  = (profections as Record<string, number>)?.annual_house
                 ?? (profections as Record<string, number>)?.profected_house;
  const profLord  = (profections as Record<string, string>)?.annual_lord
                 ?? (profections as Record<string, string>)?.lord_of_year;
  const profSign  = (profections as Record<string, string>)?.annual_sign;

  // VoC countdown
  const vocEndJd = moon.is_void ? ((moon as Record<string,unknown>).void_end_utc as number | null ?? null) : null;

  // Illumination %
  const illumination = moon.illumination ?? Math.round(((1 - Math.cos(moon.phase_angle * Math.PI / 180)) / 2) * 100);

  // Transit counts for badge
  const maleficCount = top_transits.filter(t => (t as Record<string,unknown>).nature === 'malefic').length;
  const beneficCount = top_transits.filter(t => (t as Record<string,unknown>).nature === 'benefic').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className={`text-base font-semibold ${theme.header}`}>Дашборд</h2>
        <div className="flex items-center gap-2">
          {/* Простой / Профи switcher */}
          <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
            <button
              onClick={() => mode !== 'simple' && toggleMode()}
              className={`px-2.5 py-1 transition-colors ${mode === 'simple' ? 'bg-white/15 text-white font-medium' : 'text-white/40 hover:text-white/70'}`}
            >
              Простой
            </button>
            <button
              onClick={() => mode !== 'pro' && toggleMode()}
              className={`px-2.5 py-1 transition-colors ${mode === 'pro' ? 'bg-white/15 text-white font-medium' : 'text-white/40 hover:text-white/70'}`}
            >
              Профи
            </button>
          </div>
          <button
            onClick={load}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${theme.btn}`}
          >
            <RefreshCw size={12} /> Обновить
          </button>
        </div>
      </div>

      {/* ── HeroCard — FULL WIDTH ─────────────────────────────────────────────── */}
      <HeroCard data={data} theme={theme} isDark={isDark} />

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* ── MOON CARD ──────────────────────────────────────────────────────── */}
        <Card title="Луна сегодня" icon={Moon} theme={theme}>
          <div className="space-y-3">
            {/* Phase + sign */}
            <div className="flex items-center gap-3">
              <span className="text-4xl leading-none">{PHASE_EMOJI[moon.phase] ?? '🌙'}</span>
              <div className="flex-1">
                <div className={`text-base font-semibold ${theme.header}`}>
                  {SIGN_RU[moon.sign] ?? moon.sign} · {moon.degree.toFixed(1)}°
                </div>
                <div className={`text-xs ${theme.text} opacity-70`}>
                  {PHASE_RU[moon.phase] ?? moon.phase}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-lg font-bold ${theme.accent}`}>{illumination}%</div>
                <div className={`text-[10px] ${theme.text} opacity-40`}>освещ.</div>
              </div>
            </div>
            {/* Illumination bar */}
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-yellow-500/60 to-yellow-300/90 transition-all duration-500"
                style={{ width: `${illumination}%` }} />
            </div>

            {/* VoC status */}
            {moon.is_void && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300">
                  Луна Пустого Хода
                  {moon.void_end_sign ? ` → до входа в ${SIGN_RU[moon.void_end_sign] ?? moon.void_end_sign}` : ''}
                </span>
              </div>
            )}

            {/* Mansion */}
            {mansion && (
              <div className="border-t border-white/10 pt-3">
                <div className={`text-xs font-medium ${theme.accent} mb-1`}>
                  Мансия #{mansion.number} · {mansion.name_ru}
                </div>
                <div className={`text-xs ${theme.text} opacity-60 italic mb-2`}>
                  {mansion.theme}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-emerald-400 mb-0.5">Сегодня хорошо:</div>
                    {mansion.do.slice(0, 2).map((a, i) => (
                      <div key={i} className={`text-[11px] ${theme.text} opacity-70 flex gap-1`}>
                        <span className="text-emerald-400">›</span>{a}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[10px] text-red-400 mb-0.5">Избегать:</div>
                    {mansion.avoid.slice(0, 2).map((a, i) => (
                      <div key={i} className={`text-[11px] ${theme.text} opacity-70 flex gap-1`}>
                        <span className="text-red-400">›</span>{a}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── TOP TRANSITS ───────────────────────────────────────────────────── */}
        <Card title="Ключевые транзиты дня" icon={Zap} theme={theme}
          badge={
            <div className="flex gap-1 ml-auto">
              {beneficCount > 0 && <span className="text-[10px] text-emerald-400 font-medium">▲{beneficCount}</span>}
              {maleficCount > 0 && <span className="text-[10px] text-red-400 font-medium ml-1">▼{maleficCount}</span>}
            </div>
          }
        >
          {top_transits.length === 0 ? (
            <p className={`text-xs ${theme.text} opacity-50`}>Нет активных транзитов</p>
          ) : (
            <div>
              {top_transits.slice(0, isPro ? 6 : 4).map((t, i) => (
                <TransitRow key={i} transit={t as unknown as Record<string, unknown>} theme={theme} />
              ))}
            </div>
          )}
        </Card>

        {/* ── UPCOMING EVENTS ────────────────────────────────────────────────── */}
        <UpcomingEventsCard data={data} theme={theme} />

        {/* ── COMPENSATORY PRACTICES (NOW) ────────────────────────────────────── */}
        <Card title="Компенсаторика сейчас" icon={Sparkles} theme={theme}
          badge={
            <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-500/30 text-amber-300 ml-auto">
              активные транзиты
            </span>
          }
        >
          <CompensatoryNow comp={compensatory as unknown as Record<string,unknown>} theme={theme} />
        </Card>

        {/* ── FIRDARIA + PROFECTIONS ─────────────────────────────────────────── */}
        <Card title="Периоды · Профекции" icon={TrendingUp} theme={theme}>
          <div className="space-y-3">
            {/* Firdaria */}
            {firPeriod ? (
              <div className="rounded-lg bg-violet-500/8 border border-violet-500/20 p-3">
                <div className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-1">Фирдарий</div>
                <div className={`text-sm font-bold ${theme.header}`}>
                  {PLANET_GL[firPeriod.planet ?? ''] ?? ''} {PLANET_RU[firPeriod.planet ?? ''] ?? firPeriod.planet ?? '—'}
                </div>
                {firPeriod.start && firPeriod.end && (
                  <div className={`text-[11px] ${theme.text} opacity-50`}>{firPeriod.start} – {firPeriod.end}</div>
                )}
                {firSub && (
                  <div className={`text-[11px] ${theme.accent} mt-1`}>
                    Суб-период: {PLANET_GL[firSub.planet ?? ''] ?? ''} {PLANET_RU[firSub.planet ?? ''] ?? firSub.planet}
                  </div>
                )}
                {/* Enhanced firdaria narrative */}
                {firPeriod.planet && FIRDARIA_NARRATIVE[firPeriod.planet] ? (
                  <div className={`text-[11px] ${theme.text} opacity-70 mt-2 leading-relaxed border-l-2 border-violet-500/30 pl-2`}>
                    {FIRDARIA_NARRATIVE[firPeriod.planet]}
                  </div>
                ) : firPeriod.planet && PLANET_FIRD_INTERP[firPeriod.planet] ? (
                  <div className={`text-[10px] ${theme.text} opacity-55 mt-1.5 italic`}>
                    → {PLANET_FIRD_INTERP[firPeriod.planet]}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className={`text-xs ${theme.text} opacity-40`}>Фирдарий не определён</p>
            )}

            {/* Profections */}
            {profYear ? (
              <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3">
                <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide mb-1">Профекция года</div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${theme.accent}`}>Дом {profYear}</span>
                  {profSign && <span className={`text-sm ${theme.text} opacity-60`}>{SIGN_RU[profSign] ?? profSign}</span>}
                </div>
                {profLord && (
                  <div className={`text-xs ${theme.header} mt-0.5`}>
                    Лорд: {PLANET_GL[profLord] ?? ''} {PLANET_RU[profLord] ?? profLord}
                  </div>
                )}
                {profYear && HOUSE_THEME[profYear] && (
                  <div className={`text-[10px] ${theme.text} opacity-55 mt-1.5 italic`}>
                    → тема года: {HOUSE_THEME[profYear]}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </Card>

        {/* ── FORTUNE LOT ────────────────────────────────────────────────────── */}
        {fortune_today?.sign && (
          <Card title="Жребий Фортуны сегодня" icon={Star} theme={theme}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎯</span>
                <div>
                  <div className={`text-base font-semibold ${theme.header}`}>
                    {SIGN_RU[fortune_today.sign] ?? fortune_today.sign}
                    {fortune_today.deg_min ? ` · ${fortune_today.deg_min}` : ''}
                  </div>
                  <div className={`text-xs ${theme.text} opacity-60 mt-0.5`}>
                    Фокус удачи на сегодня
                  </div>
                </div>
              </div>
              {FORTUNE_SIGN_INTERP[fortune_today.sign] && (
                <div className={`text-[11px] ${theme.text} opacity-65 leading-relaxed border-l-2 border-yellow-500/30 pl-2.5 italic`}>
                  {FORTUNE_SIGN_INTERP[fortune_today.sign]}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── PLANET POSITIONS (Pro) ─────────────────────────────────────────── */}
        {isPro && <PlanetPositionsCard data={data} theme={theme} />}

        {/* ── LUNAR MINI-CALENDAR ────────────────────────────────────────────── */}
        <div className={isPro ? 'md:col-span-2 xl:col-span-2' : 'md:col-span-2 xl:col-span-1'}>
          <LunarCalendarCard
            theme={theme}
            utc={birthData.utc}
            lat={birthData.lat}
            lon={birthData.lon}
            days={7}
          />
        </div>

        {/* ── COMPENSATORY FORECAST (lazy 3-window) ──────────────────────────── */}
        <div className="md:col-span-2 xl:col-span-3">
          <CompensatoryForecast birthData={birthData} theme={theme} />
        </div>

        {/* ── GLOBAL ASTRO BACKGROUND ──────────────────────────────────────────── */}
        <div className="md:col-span-2 xl:col-span-3">
          <GlobalAstroPanel theme={theme} />
        </div>

      </div>
    </div>
  );
}

// ─── GlobalAstroPanel ─────────────────────────────────────────────────────────
// Sprint 6 — calls GET /daily/global, shows transit sky + mutual aspects
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
  const [data, setData] = useState<DailyGlobalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    if (loading || data) return;
    setLoading(true);
    try {
      setData(await getDailyGlobal());
    } catch {
      // silently fail — panel stays collapsed
    } finally {
      setLoading(false);
    }
  }, [loading, data]);

  // Load on mount (open by default)
  useEffect(() => { load(); }, [load]);

  const handleToggle = useCallback(() => {
    setOpen(v => !v);
  }, []);

  return (
    <div className={`rounded-2xl border ${theme.card} overflow-hidden`}>
      {/* Collapsible header */}
      <button
        onClick={handleToggle}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-white/3 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Info size={14} className={theme.accent} />
          <span className={`text-sm font-medium ${theme.header}`}>🌍 Глобальный астрофон сегодня</span>
          {data && (
            <span className={`text-[10px] ${theme.text} opacity-40`}>
              {data.planets?.length ?? 0} планет · {data.mutual_aspects?.length ?? 0} аспектов
            </span>
          )}
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
              {/* Planet positions */}
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
                  Позиции планет
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(data.planets ?? []).map(p => (
                    <div
                      key={p.planet}
                      className="flex items-center gap-1 text-[11px] border border-white/12 rounded-full px-2 py-0.5 bg-white/3"
                    >
                      <span className="text-white/50">{PLANET_GLYPH_G[p.planet] ?? ''}</span>
                      <span className="text-white/70">{SIGN_RU_G[p.sign] ?? p.sign}</span>
                      <span className="text-white/30">{p.degree.toFixed(1)}°</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mutual aspects */}
              {(data.mutual_aspects ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
                    Транзитные аспекты (орб ≤ 5°)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(data.mutual_aspects ?? []).slice(0, 8).map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[11px] border border-white/8 rounded-lg px-2.5 py-1.5 bg-white/3"
                      >
                        <span className={`font-bold ${ASP_COLOR_G[a.aspect] ?? 'text-white/50'}`}>
                          {ASP_RU_G[a.aspect] ?? a.aspect}
                        </span>
                        <span className="text-white/60">
                          {PLANET_RU_G[a.planet1] ?? a.planet1}
                          {' – '}
                          {PLANET_RU_G[a.planet2] ?? a.planet2}
                        </span>
                        <span className="text-white/25 ml-auto">{a.orb.toFixed(1)}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interpretation */}
              {data.interpretation && (
                <p className={`text-[11px] ${theme.text} opacity-50 leading-relaxed border-t border-white/8 pt-3`}>
                  {data.interpretation}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

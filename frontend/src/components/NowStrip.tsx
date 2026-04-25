// ─── NowStrip — top-of-dashboard "сейчас и впереди" panel ────────────────────
// Hour-grain hierarchy: what's happening right now, what's the next concrete
// event with exact time, and what's the best window to act today.
import { useEffect, useState } from 'react';
import { Clock, Hourglass, Compass } from 'lucide-react';
import type { DashboardData } from '../services/astrologyService';

interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
}

interface Props { data: DashboardData; theme: ThemeLike; }

const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const PHASE_RU: Record<string, string> = {
  new_moon: 'новолуние', waxing_crescent: 'растущий серп',
  first_quarter: 'первая четверть', waxing_gibbous: 'растущая луна',
  full_moon: 'полнолуние', waning_gibbous: 'убывающая луна',
  last_quarter: 'последняя четверть', waning_crescent: 'убывающий серп',
};

// JD → Date (UTC)
function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

function fmtHM(d: Date): string {
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function hourBand(h: number): { label: string; tone: string } {
  if (h < 6)  return { label: 'Ночь',     tone: 'Тихие часы — для интуиции и заметок, не для решений.' };
  if (h < 12) return { label: 'Утро',     tone: 'Чистая голова — лучшее время для самых важных задач дня.' };
  if (h < 17) return { label: 'День',     tone: 'Пик активности — звонки, встречи, действия с людьми.' };
  if (h < 21) return { label: 'Вечер',    tone: 'Подведение итогов и завершения — не открывайте новых фронтов.' };
  return       { label: 'Поздний вечер', tone: 'Время восстановления — дайте телу и психике остыть.' };
}

interface NowEvent {
  label: string;
  when: string;     // human time
  hint: string;
  tone: 'calm' | 'warn' | 'good';
}

export default function NowStrip({ data, theme }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());

  // tick every minute so the "next event" countdowns stay fresh
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const band = hourBand(h);

  // ── Next concrete event ────────────────────────────────────────────────────
  const events: NowEvent[] = [];

  // VoC end — most actionable, exact JD
  const moon = data.moon as DashboardData['moon'] & { void_end_utc?: number | null };
  if (moon.is_void && typeof moon.void_end_utc === 'number') {
    const end = jdToDate(moon.void_end_utc);
    if (end.getTime() > now.getTime()) {
      const minsTo = Math.round((end.getTime() - now.getTime()) / 60000);
      const intoSign = moon.void_end_sign ? SIGN_RU[moon.void_end_sign] ?? moon.void_end_sign : null;
      events.push({
        label: 'Луна без курса',
        when:  minsTo < 60 ? `до ${fmtHM(end)} (через ${minsTo} мин)` : `до ${fmtHM(end)} (${Math.floor(minsTo/60)}ч ${minsTo%60}м)`,
        hint:  intoSign ? `Старты после — Луна войдёт в ${intoSign}.` : 'Старты после окончания ВоК.',
        tone:  'warn',
      });
    }
  }

  // Lunations within ~5 days
  const lun = data.next_lunation;
  if (lun) {
    if (lun.days_to_full <= 3) {
      events.push({
        label: 'Полнолуние близко',
        when:  `через ${lun.days_to_full} дн. · ${lun.full_moon}`,
        hint:  'Время кульминации — завершайте, не начинайте.',
        tone:  'warn',
      });
    } else if (lun.days_to_new <= 3) {
      events.push({
        label: 'Новолуние близко',
        when:  `через ${lun.days_to_new} дн. · ${lun.new_moon}`,
        hint:  'Окно посева целей — формулируйте намерение.',
        tone:  'good',
      });
    }
  }

  // Top transit highlight
  const topT = (data.top_transits ?? [])[0] as Record<string, unknown> | undefined;
  if (topT && events.length === 0) {
    const tp = String(topT.transit_planet ?? '');
    const np = String(topT.natal_planet ?? '');
    const asp = String(topT.aspect ?? '');
    const nature = String(topT.nature ?? 'mixed');
    const orb = Number(topT.orb ?? 0);
    events.push({
      label: 'Активный транзит',
      when:  `орб ${orb.toFixed(1)}° · ${topT.applying ? 'нарастает' : 'убывает'}`,
      hint:  `${tp} ${asp} ${np} — ${nature === 'benefic' ? 'попутный ветер' : nature === 'malefic' ? 'тугая зона' : 'смешанный фон'}.`,
      tone:  nature === 'benefic' ? 'good' : nature === 'malefic' ? 'warn' : 'calm',
    });
  }

  if (events.length === 0) {
    events.push({
      label: 'Спокойный фон',
      when:  'до конца дня',
      hint:  'Острых пиков нет — обычный рабочий ритм.',
      tone:  'calm',
    });
  }

  const next = events[0];

  // ── Best window heuristic ─────────────────────────────────────────────────
  const score = data.day_score ?? 50;
  const window = (() => {
    if (moon.is_void) {
      return { label: 'После ВоК', detail: 'Подождите окончания пустого хода Луны для серьёзных стартов.' };
    }
    if (score >= 65) {
      if (h < 12)  return { label: 'Сейчас и до вечера', detail: 'День поддерживает — двигайте важное на полной мощности.' };
      if (h < 18)  return { label: 'Текущие часы',         detail: 'Окно ещё открыто — успевайте главное до сумерек.' };
      return { label: 'Завтра утром',  detail: 'День был сильным; завтра утром продолжите на той же волне.' };
    }
    if (score <= 40) {
      return { label: 'Сберегайте силы', detail: 'Сложный фон — переносите крупные ходы на 1–2 дня.' };
    }
    if (h < 12) return { label: 'До 14:00',  detail: 'Лучшее окно — первая половина дня, на чистой голове.' };
    if (h < 17) return { label: 'Текущие часы', detail: 'Сейчас рабочий ритм; вечером — сворачивайтесь.' };
    return { label: 'Завтра утром',  detail: 'Сегодня — закрывать хвосты; запуски — утром.' };
  })();

  const toneCls = (t: NowEvent['tone']) =>
    t === 'good' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
  : t === 'warn' ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
  :                'text-sky-300 border-sky-500/30 bg-sky-500/10';

  const moonSignRu = SIGN_RU[data.moon.sign] ?? data.moon.sign;
  const phaseRu    = PHASE_RU[data.moon.phase] ?? data.moon.phase;

  return (
    <section
      aria-label="Сейчас и впереди"
      className={`rounded-2xl border ${theme.card} card-lift overflow-hidden`}
    >
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2">
        <Clock size={14} className="text-violet-300" aria-hidden="true" />
        <h3 className={`m-0 text-xs font-semibold ${theme.header} uppercase tracking-wider`}>Сейчас и впереди</h3>
        <span className="ml-auto text-[11px] text-white/55 tabular-nums">{fmtHM(now)}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3">
        {/* СЕЙЧАС */}
        <div className="rounded-xl bg-violet-500/8 border border-violet-500/20 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-violet-300/85 mb-1">
            <Compass size={11} aria-hidden="true" /> Сейчас
          </div>
          <div className={`text-sm font-bold ${theme.header}`}>{band.label} · Луна в {moonSignRu}</div>
          <div className={`text-[11px] ${theme.text} opacity-65 capitalize`}>{phaseRu}</div>
          <p className={`text-[11px] ${theme.text} opacity-85 mt-1.5 leading-relaxed m-0`}>{band.tone}</p>
        </div>

        {/* СЛЕДУЮЩЕЕ СОБЫТИЕ */}
        <div className={`rounded-xl border px-3 py-2.5 ${toneCls(next.tone)}`}>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-85 mb-1">
            <Hourglass size={11} aria-hidden="true" /> Следующее
          </div>
          <div className="text-sm font-bold leading-snug">{next.label}</div>
          <div className="text-[11px] opacity-80 tabular-nums">{next.when}</div>
          <p className="text-[11px] opacity-90 mt-1.5 leading-relaxed m-0">{next.hint}</p>
        </div>

        {/* ЛУЧШЕЕ ОКНО */}
        <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-300/85 mb-1">
            <Clock size={11} aria-hidden="true" /> Лучшее окно
          </div>
          <div className={`text-sm font-bold ${theme.header}`}>{window.label}</div>
          <p className={`text-[11px] ${theme.text} opacity-85 mt-1.5 leading-relaxed m-0`}>{window.detail}</p>
        </div>
      </div>
    </section>
  );
}

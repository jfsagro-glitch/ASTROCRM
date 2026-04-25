// ─── NowStrip — top-of-dashboard "сейчас и впереди" panel ────────────────────
// Hour-grain hierarchy: what's happening right now, what's the next concrete
// event with exact time, and what's the best window to act today.
import { useEffect, useState } from 'react';
import { Clock, Hourglass, Compass, BookOpen, Flame, ArrowRight } from 'lucide-react';
import type { DashboardData } from '../services/astrologyService';
import { getEntry, getStats, type DayEntryStored, type JournalStats } from '../services/journalService';

interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
}

interface Props { data: DashboardData; theme: ThemeLike; userId?: string; }

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function scrollToJournal() {
  const el = document.getElementById('daily-journal');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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

export default function NowStrip({ data, theme, userId }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [journalEntry, setJournalEntry] = useState<DayEntryStored | null>(null);
  const [journalStats, setJournalStats] = useState<JournalStats | null>(null);

  // tick every minute so the "next event" countdowns stay fresh
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // load today's journal entry + stats for the nudge strip (best-effort)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [entry, stats] = await Promise.all([
          getEntry(todayISO(), userId).catch(() => null),
          getStats(userId, 30).catch(() => null),
        ]);
        if (!cancelled) {
          setJournalEntry(entry);
          setJournalStats(stats);
        }
      } catch { /* journal API offline — silently hide nudge */ }
    })();
    return () => { cancelled = true; };
  }, [userId]);

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

  // ── Journal nudge: contextual prompt based on hour-band & today's entry ─
  const morningDone = !!journalEntry?.morning_note?.trim();
  const eveningDone = !!journalEntry?.evening_note?.trim();
  const streak = journalStats?.streak ?? 0;
  const journalNudge: { kind: 'morning' | 'evening' | 'streak' | null; text: string; cta: string } = (() => {
    if (h >= 6 && h < 12 && !morningDone) {
      return { kind: 'morning', text: 'Утреннее намерение задаёт ритм всего дня. 1 строка — этого хватит.', cta: 'Записать утро' };
    }
    if (h >= 19 && h < 24 && !eveningDone) {
      return { kind: 'evening', text: 'Вечерний итог закрывает день и проявляет паттерны со временем.', cta: 'Подвести итог' };
    }
    if (streak >= 3) {
      return { kind: 'streak', text: `Вы ведёте журнал ${streak} ${streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд. Не теряйте ритм.`, cta: 'Открыть журнал' };
    }
    return { kind: null, text: '', cta: '' };
  })();

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

      {/* Journal nudge — only when contextually meaningful */}
      {journalNudge.kind && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={scrollToJournal}
            className={`w-full rounded-xl border px-3 py-2.5 flex items-center gap-3 text-left transition-colors hover:border-white/30 ${
              journalNudge.kind === 'morning' ? 'border-amber-500/30 bg-amber-500/8 hover:bg-amber-500/12'
            : journalNudge.kind === 'evening' ? 'border-indigo-500/30 bg-indigo-500/8 hover:bg-indigo-500/12'
            :                                     'border-orange-500/30 bg-orange-500/8 hover:bg-orange-500/12'
            }`}
            aria-label={journalNudge.cta}
          >
            <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
              journalNudge.kind === 'morning' ? 'bg-amber-500/15 text-amber-300'
            : journalNudge.kind === 'evening' ? 'bg-indigo-500/15 text-indigo-300'
            :                                     'bg-orange-500/15 text-orange-300'
            }`}>
              {journalNudge.kind === 'streak'
                ? <Flame size={16} aria-hidden="true" />
                : <BookOpen size={16} aria-hidden="true" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold ${theme.header} flex items-center gap-2 flex-wrap`}>
                {journalNudge.kind === 'morning' ? 'Утреннее намерение'
               : journalNudge.kind === 'evening' ? 'Итог дня'
               :                                    `Серия — ${streak} дн.`}
                {streak > 0 && journalNudge.kind !== 'streak' && (
                  <span className="text-[10px] text-orange-300/85 inline-flex items-center gap-1">
                    <Flame size={10} aria-hidden="true" /> {streak}
                  </span>
                )}
              </div>
              <p className={`text-[11px] ${theme.text} opacity-75 m-0 mt-0.5 leading-snug`}>{journalNudge.text}</p>
            </div>
            <span className="shrink-0 text-[11px] text-white/65 inline-flex items-center gap-1">
              {journalNudge.cta} <ArrowRight size={12} aria-hidden="true" />
            </span>
          </button>
        </div>
      )}
    </section>
  );
}

// ─── OnboardingFlow — 3-step welcome + natal "wow" screen ────────────────────
// Shown on first visit when user has no birth data. Steps:
//   1) Name (+ gentle welcome copy)
//   2) Birth date & time (with "I don't know the time" → 12:00 fallback)
//   3) Birth city (geocoded via existing service)
//  →  Wow screen: computes natal chart and shows 3 highlights
//     (Sun sign, Moon sign, Ascendant) + CTA to open dashboard.
// Dismissal flag: localStorage.holo_onboarding_done = "1".
import { useCallback, useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, X, Loader2, Sun, Moon, Compass } from 'lucide-react';
import type { BirthInput, NatalChart } from '../types/astro';
import { getNatalChart, geocodeCity } from '../services/astrologyService';

type Step = 0 | 1 | 2 | 3; // 0..2 = form steps, 3 = wow

interface Props {
  onComplete: (birth: BirthInput & { name?: string }) => void;
  onSkip: () => void;
}

const SIGN_RU: Record<string, string> = {
  Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнецы', Cancer: 'Рак',
  Leo: 'Лев', Virgo: 'Дева', Libra: 'Весы', Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец', Capricorn: 'Козерог', Aquarius: 'Водолей', Pisces: 'Рыбы',
};

const SUN_VIBE: Record<string, string> = {
  Aries: 'Ядро энергии — инициатива и прямое действие.',
  Taurus: 'Ядро энергии — устойчивость, ритуалы и материальный вкус.',
  Gemini: 'Ядро энергии — любознательность и скорость мысли.',
  Cancer: 'Ядро энергии — чувственная память и забота о «своих».',
  Leo: 'Ядро энергии — творческая щедрость и желание сиять.',
  Virgo: 'Ядро энергии — внимание к деталям и полезность.',
  Libra: 'Ядро энергии — баланс, красота и союзы.',
  Scorpio: 'Ядро энергии — глубина, интенсивность, трансформация.',
  Sagittarius: 'Ядро энергии — поиск смысла и горизонтов.',
  Capricorn: 'Ядро энергии — стратегия, дисциплина и рост.',
  Aquarius: 'Ядро энергии — нестандартность, сети, будущее.',
  Pisces: 'Ядро энергии — воображение, эмпатия и потоки.',
};

const MOON_VIBE: Record<string, string> = {
  Aries: 'Эмоции быстрые и прямые; важно действовать, а не держать внутри.',
  Taurus: 'Эмоциональная опора — комфорт, тело, знакомые запахи и вкусы.',
  Gemini: 'Эмоции идут через речь и разговор; нужен «воздух» обмена.',
  Cancer: 'Эмоции глубокие и цикличные; дом и память — якорь.',
  Leo: 'Эмоции театральны, нужны признание и тёплый круг.',
  Virgo: 'Эмоции — через порядок и полезные рутины.',
  Libra: 'Эмоции стабилизируются в диалоге и гармонии пространства.',
  Scorpio: 'Эмоции глубокие и всё-или-ничего; нужна честность с собой.',
  Sagittarius: 'Эмоциональная подпитка — движение, идеи, простор.',
  Capricorn: 'Эмоции сдержанны; опора — результат и структура.',
  Aquarius: 'Эмоции через концепции и сообщества; нужна свобода.',
  Pisces: 'Эмоции — поток; важна защита границ и творческий выход.',
};

const ASC_VIBE: Record<string, string> = {
  Aries: 'Мир видит вас как быстрого и прямого.',
  Taurus: 'Мир видит вас как спокойного и осязаемого.',
  Gemini: 'Мир видит вас как лёгкого в коммуникации.',
  Cancer: 'Мир видит вас как тёплого и «домашнего».',
  Leo: 'Мир видит вас как заметного и тёплого лидера.',
  Virgo: 'Мир видит вас как внимательного и аккуратного.',
  Libra: 'Мир видит вас как дипломатичного и эстетичного.',
  Scorpio: 'Мир видит вас как сдержанно-магнетичного.',
  Sagittarius: 'Мир видит вас как открытого и подвижного.',
  Capricorn: 'Мир видит вас как собранного и надёжного.',
  Aquarius: 'Мир видит вас как нестандартного и дружелюбного.',
  Pisces: 'Мир видит вас как мягкого и вдохновляющего.',
};

export default function OnboardingFlow({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [name, setName]   = useState('');
  const [date, setDate]   = useState('');
  const [time, setTime]   = useState('12:00');
  const [unknownTime, setUnknownTime] = useState(false);
  const [city, setCity]   = useState('');
  const [geo, setGeo]     = useState<{ lat: number; lon: number; utc: number; displayName: string } | null>(null);

  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chart, setChart] = useState<NatalChart | null>(null);

  const resolveCity = useCallback(async (): Promise<typeof geo | null> => {
    if (!city.trim()) { setError('Введите город'); return null; }
    setLoadingGeo(true); setError(null);
    try {
      const data = await geocodeCity(city.trim(), date, time);
      setGeo(data);
      return data;
    } catch (e) {
      setError((e as Error).message === 'City not found' ? 'Город не найден — уточните название' : (e as Error).message);
      return null;
    } finally {
      setLoadingGeo(false);
    }
  }, [city, date, time, geo]);

  const computeWow = useCallback(async (g: NonNullable<typeof geo>) => {
    setLoadingChart(true); setError(null);
    try {
      const birth: BirthInput = {
        date,
        time: unknownTime ? '12:00' : time,
        lat: g.lat, lon: g.lon, utc: g.utc,
        name: name.trim() || undefined,
      };
      const c = await getNatalChart(birth);
      setChart(c);
      return c;
    } catch (e) {
      setError((e as Error).message || 'Не удалось рассчитать карту');
      return null;
    } finally {
      setLoadingChart(false);
    }
  }, [date, time, unknownTime, name]);

  const next = useCallback(async () => {
    setError(null);
    if (step === 0) {
      if (!name.trim()) { setError('Введите имя'); return; }
      setStep(1);
    } else if (step === 1) {
      if (!date) { setError('Укажите дату рождения'); return; }
      setStep(2);
    } else if (step === 2) {
      const g = geo ?? await resolveCity();
      if (!g) return;
      setStep(3);
      await computeWow(g);
    }
  }, [step, name, date, geo, resolveCity, computeWow]);

  const back = useCallback(() => {
    setError(null);
    setStep(s => (s > 0 ? (s - 1) as Step : s));
  }, []);

  const finish = useCallback(() => {
    if (!geo) return;
    try { localStorage.setItem('holo_onboarding_done', '1'); } catch { /* noop */ }
    onComplete({
      name: name.trim() || undefined,
      date,
      time: unknownTime ? '12:00' : time,
      lat: geo.lat, lon: geo.lon, utc: geo.utc,
    });
  }, [geo, name, date, time, unknownTime, onComplete]);

  const skip = useCallback(() => {
    try { localStorage.setItem('holo_onboarding_done', '1'); } catch { /* noop */ }
    onSkip();
  }, [onSkip]);

  // Wow-screen extractions
  const highlights = useMemo(() => {
    if (!chart) return null;
    const sunSign  = chart.planets.sun?.sign || '';
    const moonSign = chart.planets.moon?.sign || '';
    const ascSign  = chart.houses['1']?.sign || '';
    return {
      sun:  { sign: sunSign,  ru: SIGN_RU[sunSign]  ?? sunSign,  vibe: SUN_VIBE[sunSign]  ?? '' },
      moon: { sign: moonSign, ru: SIGN_RU[moonSign] ?? moonSign, vibe: MOON_VIBE[moonSign] ?? '' },
      asc:  { sign: ascSign,  ru: SIGN_RU[ascSign]  ?? ascSign,  vibe: ASC_VIBE[ascSign]  ?? '' },
    };
  }, [chart]);

  const progressPct = step === 3 ? 100 : Math.round(((step + 1) / 4) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Приветственный онбординг HOLO"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-amber-300/25 bg-slate-900/95 shadow-2xl overflow-hidden">
        {/* dismiss */}
        <button
          onClick={skip}
          aria-label="Пропустить онбординг"
          className="absolute top-3 right-3 w-9 h-9 rounded-full text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* progress */}
        <div className="h-1 bg-white/10" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Прогресс онбординга">
          <div className="h-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-500" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="p-6 sm:p-8">
          {/* STEP 0 — NAME */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-amber-300">
                <Sparkles size={18} aria-hidden="true" />
                <span className="text-xs uppercase tracking-widest font-semibold">Шаг 1 из 3</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight m-0">
                Добро пожаловать в HOLO
              </h1>
              <p className="text-sm text-white/80 leading-relaxed m-0">
                Это персональный астрологический штаб: ежедневный брифинг, личный прогноз и компенсирующие практики.
                Займёт 45 секунд — и откроется дашборд вашего дня.
              </p>
              <label className="block">
                <span className="text-xs text-white/60 uppercase tracking-wider">Как вас зовут?</span>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()}
                  autoFocus
                  placeholder="Имя"
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-300 text-base"
                />
              </label>
            </div>
          )}

          {/* STEP 1 — DATE & TIME */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-amber-300">
                <Sparkles size={18} aria-hidden="true" />
                <span className="text-xs uppercase tracking-widest font-semibold">Шаг 2 из 3</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white m-0">Когда вы родились?</h2>
              <p className="text-sm text-white/70 m-0">Дата — точно. Время — если знаете; если нет, возьмём полдень.</p>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-white/60 uppercase tracking-wider">Дата</span>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="mt-2 w-full px-3 py-3 rounded-xl border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-base min-h-[44px]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/60 uppercase tracking-wider">Время</span>
                  <input
                    type="time"
                    value={time}
                    disabled={unknownTime}
                    onChange={e => setTime(e.target.value)}
                    className="mt-2 w-full px-3 py-3 rounded-xl border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-base min-h-[44px] disabled:opacity-50"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unknownTime}
                  onChange={e => setUnknownTime(e.target.checked)}
                  className="w-4 h-4 accent-amber-400"
                />
                Не знаю точное время (возьмём 12:00 — асцендент будет примерным)
              </label>
            </div>
          )}

          {/* STEP 2 — CITY */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-amber-300">
                <Sparkles size={18} aria-hidden="true" />
                <span className="text-xs uppercase tracking-widest font-semibold">Шаг 3 из 3</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white m-0">Где вы родились?</h2>
              <p className="text-sm text-white/70 m-0">Город поможет определить координаты и часовой пояс на дату рождения.</p>

              <label className="block">
                <span className="text-xs text-white/60 uppercase tracking-wider">Город</span>
                <div className="mt-2 flex gap-2">
                  <input
                    value={city}
                    onChange={e => { setCity(e.target.value); setGeo(null); }}
                    onKeyDown={e => e.key === 'Enter' && resolveCity()}
                    placeholder="Москва, Санкт-Петербург, Алматы…"
                    autoFocus
                    className="flex-1 px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-300 text-base min-h-[44px]"
                  />
                  <button
                    onClick={resolveCity}
                    disabled={loadingGeo || !city.trim()}
                    className="px-4 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 disabled:opacity-40 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    {loadingGeo ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : 'Найти'}
                  </button>
                </div>
              </label>

              {geo && (
                <div className="text-sm text-emerald-300">
                  ✓ {geo.displayName} · UTC{geo.utc >= 0 ? '+' : ''}{geo.utc}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — WOW */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-amber-300">
                <Sparkles size={18} aria-hidden="true" />
                <span className="text-xs uppercase tracking-widest font-semibold">Ваш астрологический отпечаток</span>
              </div>

              {loadingChart && (
                <div className="py-12 flex flex-col items-center text-white/70">
                  <Loader2 size={32} className="animate-spin text-amber-300" aria-hidden="true" />
                  <div className="mt-4 text-sm">Рассчитываем карту…</div>
                </div>
              )}

              {!loadingChart && highlights && (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-white m-0">
                    {name ? `${name}, вот ваши ключи:` : 'Вот ваши ключи:'}
                  </h2>

                  <div className="space-y-3">
                    <HighlightRow icon={<Sun size={18} aria-hidden="true" />} label="Солнце" sign={highlights.sun.ru} vibe={highlights.sun.vibe} />
                    <HighlightRow icon={<Moon size={18} aria-hidden="true" />} label="Луна" sign={highlights.moon.ru} vibe={highlights.moon.vibe} />
                    <HighlightRow icon={<Compass size={18} aria-hidden="true" />} label="Асцендент" sign={highlights.asc.ru} vibe={highlights.asc.vibe} />
                  </div>

                  <p className="text-xs text-white/60 m-0 pt-2 border-t border-white/10">
                    Это только старт. В дашборде — ежедневный брифинг, прогноз по сферам, мансия Луны и компенсирующие практики.
                  </p>
                </>
              )}

              {!loadingChart && !highlights && error && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* error line for form steps */}
          {step < 3 && error && (
            <div className="mt-4 text-xs text-red-300">{error}</div>
          )}

          {/* footer buttons */}
          <div className="mt-7 flex items-center justify-between gap-2">
            {step > 0 && step < 3 ? (
              <button
                onClick={back}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-white/70 hover:text-white hover:bg-white/5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <ArrowLeft size={16} aria-hidden="true" /> Назад
              </button>
            ) : <span />}

            {step < 3 && (
              <button
                onClick={next}
                disabled={loadingGeo}
                className="inline-flex items-center gap-1.5 px-5 py-3 min-h-[44px] rounded-xl bg-amber-400 text-slate-900 text-sm font-semibold hover:bg-amber-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                {step === 2 ? 'Рассчитать' : 'Далее'} <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}

            {step === 3 && !loadingChart && (
              <button
                onClick={finish}
                className="ml-auto inline-flex items-center gap-1.5 px-5 py-3 min-h-[44px] rounded-xl bg-amber-400 text-slate-900 text-sm font-semibold hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                Открыть дашборд <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HighlightRow({
  icon, label, sign, vibe,
}: { icon: React.ReactNode; label: string; sign: string; vibe: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="w-9 h-9 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-white/60 uppercase tracking-wider">{label}</span>
          <span className="text-base font-semibold text-white">{sign || '—'}</span>
        </div>
        {vibe && <p className="text-sm text-white/75 mt-1 m-0 leading-relaxed">{vibe}</p>}
      </div>
    </div>
  );
}

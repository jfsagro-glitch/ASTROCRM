// ─── InsightStrip — one-sentence "что важно сегодня" above the fold ──────────
import { Sparkles } from 'lucide-react';
import type { DashboardData } from '../services/astrologyService';

interface ThemeLike { card: string; header: string; accent: string; text: string; symbol: string; }
interface Props { data: DashboardData; theme: ThemeLike; }

const SIGN_RU: Record<string, string> = {
  aries: 'Овне', taurus: 'Тельце', gemini: 'Близнецах', cancer: 'Раке',
  leo: 'Льве', virgo: 'Деве', libra: 'Весах', scorpio: 'Скорпионе',
  sagittarius: 'Стрельце', capricorn: 'Козероге', aquarius: 'Водолее', pisces: 'Рыбах',
};
function pickSentence(d: DashboardData): string {
  const sc = d.day_score ?? 50;
  const moonSign  = d.moon?.sign;
  const moonVoid  = d.moon?.is_void;
  const top       = d.top_transits?.[0];
  const lun       = d.next_lunation;

  // Lunation within 24h — strongest cue
  if (lun && lun.days_to_new === 0)  return `Сегодня новолуние${lun.new_moon_sign ? ` в ${SIGN_RU[lun.new_moon_sign] ?? lun.new_moon_sign}` : ''} — закладывайте, не подводите итоги.`;
  if (lun && lun.days_to_full === 0) return `Сегодня полнолуние${lun.full_moon_sign ? ` в ${SIGN_RU[lun.full_moon_sign] ?? lun.full_moon_sign}` : ''} — закрывайте, не запускайте.`;

  // Strong day with clear top transit
  if (sc >= 70 && top) {
    return `Сильный день — действуйте: ${top.transit_planet} ${top.aspect} ${top.natal_planet} даёт окно для шага вперёд.`;
  }
  if (sc <= 35 && top) {
    return `Аккуратный день — наблюдайте: ${top.transit_planet} ${top.aspect} ${top.natal_planet} провоцирует напряжение.`;
  }

  // Void-of-course Moon — strong cue
  if (moonVoid) {
    return 'Луна без курса — не запускайте новое, доделывайте начатое.';
  }
  // Moon sign hint
  if (moonSign && SIGN_RU[moonSign]) {
    return `Луна сегодня в ${SIGN_RU[moonSign]} — настройтесь на её ритм.`;
  }

  return sc >= 65
    ? 'День в плюсе — самое время для важных разговоров.'
    : sc <= 40
      ? 'День скорее тренировочный — берегите силы и не торопитесь.'
      : 'Ровный день — выберите одно дело и завершите его.';
}

export default function InsightStrip({ data, theme }: Props) {
  const text = pickSentence(data);
  const sc = data.day_score ?? 50;
  const tint = sc >= 65
    ? 'from-emerald-500/12 to-emerald-500/0 border-emerald-500/25'
    : sc <= 40
      ? 'from-red-500/12 to-red-500/0 border-red-500/25'
      : 'from-amber-500/10 to-amber-500/0 border-amber-500/20';
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-r ${tint} px-4 py-3 flex items-start gap-2.5`}
      role="note"
      aria-label="Главное на сегодня"
    >
      <Sparkles size={14} className={`${theme.symbol} mt-0.5 shrink-0`} aria-hidden="true" />
      <p className={`text-sm leading-snug ${theme.header} m-0 font-medium`}>
        {text}
      </p>
    </div>
  );
}

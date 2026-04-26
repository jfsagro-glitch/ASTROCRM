// ─── LunationCard — next new/full moon with effect on natal planets ──────────
import { Moon, Circle } from 'lucide-react';
import type { DashboardData } from '../services/astrologyService';

interface ThemeLike { card: string; header: string; accent: string; text: string; symbol: string; }
interface Props { data: DashboardData; theme: ThemeLike; }

const PLANET_GL: Record<string, string> = {
  sun: '☉', moon: '☾', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};
const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран',
  neptune: 'Нептун', pluto: 'Плутон',
};
const SIGN_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};
const HOUSE_THEME: Record<number, string> = {
  1: 'тело и образ', 2: 'деньги и ресурсы', 3: 'связи и обучение',
  4: 'дом и корни', 5: 'творчество и любовь', 6: 'работа и здоровье',
  7: 'партнёрства', 8: 'трансформация', 9: 'мировоззрение',
  10: 'карьера', 11: 'круг и цели', 12: 'уход и тайны',
};

interface Lunation {
  kind: 'new' | 'full';
  date: string;
  days: number;
  sign?: string;
  house?: number;
  hits: Array<{ planet: string; angle: number; orb: number }>;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  } catch { return iso; }
}

function LunationBlock({ lun, theme }: { lun: Lunation; theme: ThemeLike }) {
  const isNew = lun.kind === 'new';
  const Icon = isNew ? Circle : Moon;
  const accent = isNew ? 'text-slate-200' : 'text-amber-200';
  const accentBg = isNew ? 'bg-slate-500/8 border-slate-500/20' : 'bg-amber-500/8 border-amber-500/20';
  const tone = isNew ? 'Новый виток' : 'Кульминация';
  const advice = isNew
    ? 'Время задумок и стартов. То, что заложите сейчас, проявится через ~2 недели.'
    : 'Время проявления и итогов. Эмоции на пике — закрывайте циклы, не запускайте новые.';

  return (
    <div className={`rounded-xl border ${accentBg} px-3 py-3 space-y-2`}>
      <div className="flex items-center gap-2">
        <Icon size={14} className={accent} aria-hidden="true" />
        <span className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>
          {isNew ? 'Новолуние' : 'Полнолуние'}
        </span>
        <span className={`ml-auto text-[10px] ${theme.text} opacity-60 tabular-nums`}>
          через {lun.days} {lun.days === 1 ? 'день' : lun.days < 5 ? 'дня' : 'дней'}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-base font-bold ${theme.header}`}>{fmtDate(lun.date)}</span>
        {lun.sign && (
          <span className={`text-xs ${theme.text} opacity-75`}>в {SIGN_RU[lun.sign] ?? lun.sign}</span>
        )}
        {lun.house ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 border border-white/10 ${theme.text} opacity-80`}>
            ваш {lun.house}-й дом · {HOUSE_THEME[lun.house]}
          </span>
        ) : null}
      </div>

      <p className={`text-[11px] ${theme.text} opacity-75 leading-relaxed m-0`}>
        <span className={`font-semibold ${accent}`}>{tone}.</span> {advice}
      </p>

      {lun.hits.length > 0 && (
        <div className={`text-[11px] pt-1.5 border-t border-white/8 ${theme.text}`}>
          <span className="opacity-60">Активирует у вас: </span>
          {lun.hits.map((h, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 mr-1.5"
              title={`${h.angle === 0 ? 'Соединение' : 'Оппозиция'} к натальной ${PLANET_RU[h.planet] ?? h.planet} (орб ${h.orb}°)`}
            >
              <span className="font-bold">{PLANET_GL[h.planet] ?? ''}</span>
              <span className="opacity-80">{PLANET_RU[h.planet] ?? h.planet}</span>
              {h.angle === 180 && <span className="opacity-50 text-[9px]">(оп.)</span>}
              {i < lun.hits.length - 1 && <span className="opacity-40">·</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LunationCard({ data, theme }: Props) {
  const nl = data.next_lunation;
  if (!nl) return null;

  const newL: Lunation = {
    kind: 'new',  date: nl.new_moon,  days: nl.days_to_new,
    sign: nl.new_moon_sign, house: nl.new_moon_house,
    hits: nl.new_moon_hits ?? [],
  };
  const fullL: Lunation = {
    kind: 'full', date: nl.full_moon, days: nl.days_to_full,
    sign: nl.full_moon_sign, house: nl.full_moon_house,
    hits: nl.full_moon_hits ?? [],
  };
  // Show the closer one first
  const ordered = newL.days <= fullL.days ? [newL, fullL] : [fullL, newL];

  return (
    <div className={`rounded-2xl border ${theme.card} p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <Moon size={14} className={theme.symbol} aria-hidden="true" />
        <h3 className={`text-sm font-semibold ${theme.header} m-0`}>Ближайшие лунации</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ordered.map((l) => <LunationBlock key={l.kind} lun={l} theme={theme} />)}
      </div>
    </div>
  );
}

/**
 * FixedStarsBlock — Display fixed star conjunctions in the natal chart.
 * Reads from natalChart.fixed_stars (already computed by /natal with include_fixed_stars=true).
 */
import React, { useState } from 'react';
import type { FixedStar } from '../types/astro';

// ── constants ────────────────────────────────────────────────────────────────

const PLANET_GLYPH: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  node: '☊', true_node: '☊', chiron: '⚷', lilith: '⚸',
};

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран',
  neptune: 'Нептун', pluto: 'Плутон', node: 'Узел', true_node: 'Узел',
  chiron: 'Хирон', lilith: 'Лилит',
};

const SIGN_NAMES = [
  'Овен','Телец','Близнецы','Рак','Лев','Дева',
  'Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы',
];

const STAR_DESCRIPTIONS: Record<string, { summary: string; keywords: string[] }> = {
  Algol:          { summary: 'Голова Медузы. Самая злополучная звезда. Насилие, потери, кризисы.', keywords: ['трансформация','кризис','опасность'] },
  Alcyone:        { summary: 'Главная из Плеяд. Утраты, слёзы, но и мистические откровения.', keywords: ['интуиция','печаль','духовность'] },
  Aldebaran:      { summary: 'Глаз Быка. Королевская звезда. Честь, успех при высокой нравственности.', keywords: ['успех','честь','лидерство'] },
  Rigel:          { summary: 'Нога Ориона. Достижения, образование, изобретательность.', keywords: ['таланты','знания','технологии'] },
  Capella:        { summary: 'Коза. Любопытство, непоседливость, независимость.', keywords: ['любопытство','свобода','поиск'] },
  Bellatrix:      { summary: 'Женщина-воин. Успех через смелость, но и риск самоуничтожения.', keywords: ['смелость','конкуренция','импульс'] },
  Betelgeuse:     { summary: 'Плечо Ориона. Богатство, удача, но непостоянство.', keywords: ['удача','переменчивость','ресурсы'] },
  Sirius:         { summary: 'Пёс, ярчайшая звезда. Защита, преданность, честь и слава.', keywords: ['слава','защита','преданность'] },
  Pollux:         { summary: 'Близнец-воин. Смелость, жестокость, конфликт.', keywords: ['конфликт','борьба','прямота'] },
  Procyon:        { summary: 'Малый пёс. Трудолюбие, но поспешность.', keywords: ['трудолюбие','скорость','риск'] },
  Regulus:        { summary: 'Сердце Льва. Королевская звезда. Успех, власть, великодушие.', keywords: ['власть','великодушие','успех'] },
  Denebola:       { summary: 'Хвост Льва. Неудачи при самонадеянности, потеря репутации.', keywords: ['самонадеянность','нестабильность','предупреждение'] },
  Spica:          { summary: 'Колос Девы. Исключительные таланты, удача, защита.', keywords: ['талант','удача','искусство'] },
  Arcturus:       { summary: 'Страж. Успех на чужбине, путешествия, мудрость.', keywords: ['путешествия','мудрость','успех'] },
  Alphecca:       { summary: 'Альфа Северной Короны. Артистизм, поэзия, изящество.', keywords: ['искусство','изящество','творчество'] },
  Antares:        { summary: 'Сердце Скорпиона. Королевская звезда. Опасность при чрезмерности.', keywords: ['интенсивность','страсть','опасность'] },
  Vega:           { summary: 'Лира. Магические способности, харизма, артистизм.', keywords: ['харизма','магия','артистизм'] },
  Altair:         { summary: 'Орёл. Смелость, дерзость, внезапный взлёт.', keywords: ['смелость','взлёт','дерзость'] },
  Fomalhaut:      { summary: 'Рыбий рот. Королевская звезда. Идеализм, мистика, тайны.', keywords: ['идеализм','тайны','мистика'] },
  Achernar:       { summary: 'Конец реки. Успех в публичной сфере, религиозные почести.', keywords: ['публичность','почёт','религия'] },
  Scheat:         { summary: 'Нога Пегаса. Утопление, катастрофы, безрассудство.', keywords: ['риск','утрата','безрассудство'] },
  Markab:         { summary: 'Седло Пегаса. Почести, затем беды при злоупотреблении.', keywords: ['почести','предупреждение','умеренность'] },
  Alphard:        { summary: 'Сердце Водяной Змеи. Страсть, яды, скрытые враги.', keywords: ['скрытность','страсть','яд'] },
  Canopus:        { summary: 'Штурман. Мудрость, дальние путешествия, философия.', keywords: ['мудрость','путешествие','философия'] },
  Castor:         { summary: 'Один из Близнецов. Интеллект, поэзия, но внезапные потери.', keywords: ['интеллект','поэзия','потери'] },
  Deneb:          { summary: 'Хвост Лебедя. Покровительство, интеллект, духовность.', keywords: ['духовность','покровительство','интеллект'] },
  Alhena:         { summary: 'Нога Близнецов. Миссия, цель, переговорный дар.', keywords: ['миссия','переговоры','цель'] },
};

const NATURE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  benefic: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-300', label: 'Благ.' },
  malefic: { bg: 'bg-red-500/15 border-red-500/30',         text: 'text-red-300',     label: 'Злок.' },
  mixed:   { bg: 'bg-amber-500/15 border-amber-500/30',     text: 'text-amber-300',   label: 'Смеш.' },
};

function lonToDisplay(lon: number): string {
  const sign = Math.floor(lon / 30);
  const deg  = Math.floor(lon % 30);
  const min  = Math.floor((lon % 1) * 60);
  return `${SIGN_NAMES[sign] ?? '?'} ${deg}°${String(min).padStart(2, '0')}'`;
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  stars: FixedStar[];
}

export function FixedStarsBlock({ stars }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!stars || stars.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/3 p-6 text-center">
        <p className="text-white/30 text-sm">Нет значимых соединений с неподвижными звёздами (орб 1°)</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">✦</span>
        <h3 className="text-sm font-semibold text-white/80">Неподвижные звёзды</h3>
        <span className="ml-auto text-xs text-white/30">{stars.length} соединение{stars.length > 1 ? 'й' : ''}</span>
      </div>

      <div className="space-y-2">
        {stars.map((s, i) => {
          const key = `${s.star}-${s.planet}`;
          const isOpen = expanded === key;
          const nature = NATURE_BADGE[s.nature] ?? NATURE_BADGE.mixed;
          const desc = STAR_DESCRIPTIONS[s.star];

          return (
            <div key={i} className="rounded-lg border border-white/8 bg-white/3 overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => setExpanded(isOpen ? null : key)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
              >
                {/* Star name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white/90">{s.star}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${nature.bg} ${nature.text}`}>
                      {nature.label}
                    </span>
                    {/* Magnitude dot */}
                    <span className="text-[10px] text-white/30">
                      ★ {s.magnitude.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {PLANET_GLYPH[s.planet] ?? ''} {PLANET_RU[s.planet] ?? s.planet}
                    {' '}→ {lonToDisplay(s.star_lon)}
                  </div>
                </div>

                {/* Orb */}
                <div className="flex-shrink-0 text-right">
                  <div className={`text-xs font-medium ${s.orb <= 0.5 ? 'text-amber-300' : 'text-white/50'}`}>
                    {s.orb <= 0.5 ? '●' : '○'} {s.orb.toFixed(2)}°
                  </div>
                  <div className="text-[10px] text-white/20">{isOpen ? '▲' : '▼'}</div>
                </div>
              </button>

              {/* Expanded details */}
              {isOpen && desc && (
                <div className="px-3 pb-3 border-t border-white/8 pt-2 space-y-2">
                  <p className="text-xs text-white/60 leading-relaxed">{desc.summary}</p>
                  <div className="flex flex-wrap gap-1">
                    {desc.keywords.map(kw => (
                      <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/40">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                    <div>
                      <span className="text-white/30">Позиция звезды: </span>
                      <span className="text-white/60">{lonToDisplay(s.star_lon)}</span>
                    </div>
                    <div>
                      <span className="text-white/30">Позиция планеты: </span>
                      <span className="text-white/60">{lonToDisplay(s.planet_lon)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-white/20 px-1">
        Орб 1°. Источники: Алиса Бейли, Вивьен Робсон, Диана Розенберг. Показаны только соединения.
      </p>
    </div>
  );
}

export default FixedStarsBlock;

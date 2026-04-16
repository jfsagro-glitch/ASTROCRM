/**
 * ChartAnalysisSection — chart shape, elements, modalities, unaspected planets.
 * Shows data from NatalChart.chart_analysis returned by /natal endpoint.
 */
import React from 'react';
import type { ChartAnalysis } from '../types/astro';

// ── helpers ─────────────────────────────────────────────────────────────────

const SHAPE_INFO: Record<string, { emoji: string; name_ru: string; desc: string }> = {
  bundle:     { emoji: '🔮', name_ru: 'Букет',      desc: 'Все планеты сосредоточены в 120°. Узкая специализация, большая сила в одной сфере.' },
  bowl:       { emoji: '🥣', name_ru: 'Чаша',       desc: 'Планеты в пределах 180°. Сильная субъективность, стремление к самодостаточности.' },
  bucket:     { emoji: '🪣', name_ru: 'Ведро',      desc: 'Все планеты в 180°, одна — напротив. Планета-ручка = главный акцент жизни.' },
  locomotive: { emoji: '🚂', name_ru: 'Локомотив',  desc: 'Планеты в 240°, одно пустое трине. Стремительная движущая сила, настойчивость.' },
  seesaw:     { emoji: '⚖️', name_ru: 'Качели',     desc: '2 группы планет напротив. Поиск баланса между противоположными потребностями.' },
  splay:      { emoji: '🌟', name_ru: 'Распыление', desc: '3+ рассеянные группы. Разносторонность, индивидуализм, независимость.' },
  splash:     { emoji: '💫', name_ru: 'Всплеск',    desc: 'Планеты равномерно по кругу. Широкий охват интересов, универсальность.' },
};

// WCAG 2.1 SC 1.4.1: each element has a distinct shape marker (not just color)
const ELEMENT_INFO: Record<string, { ru: string; color: string; bg: string; shape: string; pattern: string }> = {
  fire:  { ru: 'Огонь',  color: 'text-orange-400',  bg: 'bg-orange-400',  shape: '▲', pattern: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,.18) 3px,rgba(255,255,255,.18) 4px)' },
  earth: { ru: 'Земля',  color: 'text-emerald-400', bg: 'bg-emerald-400', shape: '■', pattern: 'repeating-linear-gradient(90deg,transparent,transparent 5px,rgba(255,255,255,.18) 5px,rgba(255,255,255,.18) 6px)' },
  air:   { ru: 'Воздух', color: 'text-sky-400',     bg: 'bg-sky-400',     shape: '●', pattern: 'repeating-linear-gradient(0deg,transparent,transparent 5px,rgba(255,255,255,.18) 5px,rgba(255,255,255,.18) 6px)' },
  water: { ru: 'Вода',   color: 'text-blue-500',    bg: 'bg-blue-500',    shape: '▼', pattern: 'repeating-linear-gradient(-45deg,transparent,transparent 3px,rgba(255,255,255,.18) 3px,rgba(255,255,255,.18) 4px)' },
};

// WCAG 2.1 SC 1.4.1: each modality has a distinct shape/pattern in addition to color
const MODALITY_INFO: Record<string, { ru: string; color: string; bg: string; shape: string; pattern: string }> = {
  cardinal: { ru: 'Кардинальные', color: 'text-red-400',    bg: 'bg-red-400',    shape: '→', pattern: 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,.18) 4px,rgba(255,255,255,.18) 5px)' },
  fixed:    { ru: 'Фиксированные', color: 'text-amber-400', bg: 'bg-amber-400',  shape: '◆', pattern: 'repeating-linear-gradient(90deg,transparent,transparent 4px,rgba(255,255,255,.18) 4px,rgba(255,255,255,.18) 5px)' },
  mutable:  { ru: 'Мутабельные',   color: 'text-purple-400',bg: 'bg-purple-400', shape: '~', pattern: 'repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(255,255,255,.18) 4px,rgba(255,255,255,.18) 5px)' },
};

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн',
  uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
};

const PLANET_GLYPH: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};

interface ScoreBarProps {
  label: string;
  shape: string;       // WCAG 2.1: distinct shape marker (not just color)
  pattern: string;     // WCAG 2.1: repeating-gradient pattern for colorblind users
  score: number;
  maxScore: number;
  color: string;
  bg: string;
  isDominant: boolean;
  ariaLabel: string;
}

function ScoreBar({ label, shape, pattern, score, maxScore, color, bg, isDominant, ariaLabel }: ScoreBarProps) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <div
      className="flex items-center gap-2"
      role="img"
      aria-label={ariaLabel}
    >
      {/* Shape marker — primary non-color visual differentiator */}
      <span
        className={`text-[11px] w-4 text-center flex-shrink-0 ${isDominant ? color : 'text-white/30'}`}
        aria-hidden="true"
      >{shape}</span>
      <span className={`text-xs w-24 flex-shrink-0 ${isDominant ? color + ' font-semibold' : 'text-white/60'}`}>
        {label}
        {isDominant && <span className="ml-1 text-[10px] opacity-70">★</span>}
      </span>
      {/* Bar with pattern overlay for colorblindness support */}
      <div
        className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden"
        role="presentation"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${isDominant ? bg : 'bg-white/25'}`}
          style={{
            width: `${pct}%`,
            backgroundImage: isDominant ? pattern : undefined,
          }}
        />
      </div>
      <span className="text-xs text-white/40 w-8 text-right tabular-nums">{score.toFixed(1)}</span>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

interface Props {
  analysis: ChartAnalysis;
}

export function ChartAnalysisSection({ analysis }: Props) {
  const shapeInfo = SHAPE_INFO[analysis.shape] ?? { emoji: '✦', name_ru: analysis.shape, desc: '' };

  const maxElem = Math.max(...Object.values(analysis.element_scores));
  const maxMod  = Math.max(...Object.values(analysis.modality_scores));

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white/80">Анализ карты</h3>

      {/* Chart shape */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{shapeInfo.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {shapeInfo.name_ru}
              </span>
              <span className="text-xs text-white/40">
                (охват {analysis.spread_deg}° / разрыв {analysis.max_gap_deg}°)
              </span>
            </div>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">{shapeInfo.desc}</p>
          </div>
        </div>
      </div>

      {/* Elements + Modalities side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Elements */}
        <div>
          <h4 className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">Стихии</h4>
          <div className="space-y-1.5">
            {Object.entries(ELEMENT_INFO).map(([key, info]) => (
              <ScoreBar
                key={key}
                label={info.ru}
                shape={info.shape}
                pattern={info.pattern}
                score={analysis.element_scores[key] ?? 0}
                maxScore={maxElem}
                color={info.color}
                bg={info.bg}
                isDominant={analysis.dominant_element === key}
                ariaLabel={`${info.ru}: ${(analysis.element_scores[key] ?? 0).toFixed(1)} баллов${analysis.dominant_element === key ? ', доминирующая стихия' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Modalities */}
        <div>
          <h4 className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">Модальности</h4>
          <div className="space-y-1.5">
            {Object.entries(MODALITY_INFO).map(([key, info]) => (
              <ScoreBar
                key={key}
                label={info.ru}
                shape={info.shape}
                pattern={info.pattern}
                score={analysis.modality_scores[key] ?? 0}
                maxScore={maxMod}
                color={info.color}
                bg={info.bg}
                isDominant={analysis.dominant_modality === key}
                ariaLabel={`${info.ru}: ${(analysis.modality_scores[key] ?? 0).toFixed(1)} баллов${analysis.dominant_modality === key ? ', доминирующая модальность' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Unaspected planets */}
      {analysis.unaspected_planets.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wide">
            Не аспектированные планеты
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.unaspected_planets.map(p => (
              <div
                key={p}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs"
                title="Планета без мажорных аспектов — работает независимо, может проявляться неожиданно"
              >
                <span>{PLANET_GLYPH[p] ?? ''}</span>
                <span>{PLANET_RU[p] ?? p}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-1.5">
            Не аспектированная планета работает независимо — её энергия выражается непредсказуемо.
          </p>
        </div>
      )}
    </div>
  );
}

export default ChartAnalysisSection;

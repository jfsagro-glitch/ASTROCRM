import React, { useState } from 'react';

interface ProbBranch {
  transit_id: string;
  transiting_planet: string;
  natal_planet: string;
  aspect: string;
  orb: number;
  weight: number;
  probability: number;
  spheres: string[];
  manifestation_types: string[];
  recommendations: string[];
  compensatory_actions: string[];
  seth_vector: string;
  castaneda_impact: string;
  monroe_level: string;
}

interface AssemblyPoint {
  index: number;
  zone: string;
  zone_description: string;
  tonal_weight: number;
  nagual_weight: number;
  balance_ratio: number;
  recommendation: string;
}

interface ProbabilityTreeData {
  target_date: string;
  total_branches: number;
  dominant_spheres: string[];
  summary: string;
  assembly_point: AssemblyPoint;
  branches: ProbBranch[];
  probability_spectrum: { sphere: string; score: number }[];
}

interface ProbabilityTreeBlockProps {
  birthDate: string;
  birthTime: string;
  lat: number;
  lon: number;
  utc: number;
}

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
  node: 'С. Узел', lilith: 'Лилит', chiron: 'Хирон',
};

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  node: '☊', lilith: '⚸', chiron: '⚷',
};

const SPHERE_RU: Record<string, string> = {
  relationships: 'Отношения', finances: 'Финансы', career: 'Карьера',
  health: 'Здоровье', spirituality: 'Духовность', creativity: 'Творчество',
  communication: 'Коммуникации', home_family: 'Дом/Семья', transformation: 'Трансформация',
  travel: 'Путешествия', education: 'Обучение', social: 'Социальное',
};

const SPHERE_COLORS: Record<string, string> = {
  relationships: '#e91e63', finances: '#ffd700', career: '#1e88e5',
  health: '#43a047', spirituality: '#7e57c2', creativity: '#fb8c00',
  communication: '#00acc1', home_family: '#8d6e63', transformation: '#6a1b9a',
};

const ZONE_COLORS: Record<string, string> = {
  'Глубокий Тональ': '#1e88e5',
  'Тональ': '#43a047',
  'Равновесие': '#ffd700',
  'Нагуаль': '#fb8c00',
  'Глубокий Нагуаль': '#e53935',
  'Unknown': '#6a6a8a',
};

const ASPECT_COLOR: Record<string, string> = {
  conjunction: '#7e57c2', opposition: '#e53935', square: '#e53935',
  trine: '#1e88e5', sextile: '#1e88e5', quincunx: '#90a4ae', semisquare: '#ff7043',
};

export const ProbabilityTreeBlock: React.FC<ProbabilityTreeBlockProps> = ({
  birthDate, birthTime, lat, lon, utc,
}) => {
  const [data, setData] = useState<ProbabilityTreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [context, setContext] = useState('');
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [showSpectrum, setShowSpectrum] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/predictive/probability-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: birthDate, time: birthTime, lat, lon, utc,
          target_date: targetDate, context,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setData(await resp.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const apiGaugeColor = (idx: number) => {
    if (idx < -1.5) return '#1e88e5';
    if (idx < -0.5) return '#43a047';
    if (idx < 0.5) return '#ffd700';
    if (idx < 1.5) return '#fb8c00';
    return '#e53935';
  };

  const apiGaugePos = (idx: number) => {
    // Map -3..+3 to 0..100%
    return Math.max(0, Math.min(100, ((idx + 3) / 6) * 100));
  };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'Georgia, serif', color: '#e8d5a3' }}>
      <h2 style={{ color: '#ffd700', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
        🌀 Матрица Вероятностей
      </h2>
      <div style={{ color: '#6a6a8a', fontSize: '0.8rem', marginBottom: '1rem' }}>
        По концепции Сета (вероятностные реальности) · Монро (I-There) · Кастанеды (точка сборки)
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <input
          type="date" value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          style={{ background: '#1a1a3a', color: '#e8d5a3', border: '1px solid #ffd70040', borderRadius: 6, padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
        />
        <input
          placeholder="Контекст (необязательно)"
          value={context}
          onChange={e => setContext(e.target.value)}
          style={{ background: '#1a1a3a', color: '#e8d5a3', border: '1px solid #ffd70040', borderRadius: 6, padding: '0.4rem 0.7rem', fontSize: '0.85rem', flex: 1, minWidth: 180 }}
        />
        <button
          onClick={load} disabled={loading}
          style={{ background: '#ffd700', color: '#0a0a1a', border: 'none', borderRadius: 6, padding: '0.4rem 1rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          {loading ? '...' : 'Рассчитать'}
        </button>
      </div>

      {error && <div style={{ color: '#ef5350', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}

      {data && (
        <>
          {/* Assembly Point Gauge */}
          <div style={{ background: '#0f0f2a', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${ZONE_COLORS[data.assembly_point.zone] || '#ffd700'}40` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6a6a8a', marginBottom: 2 }}>ТОЧКА СБОРКИ (Кастанеда)</div>
                <div style={{ fontWeight: 'bold', color: ZONE_COLORS[data.assembly_point.zone] || '#ffd700', fontSize: '1.1rem' }}>
                  {data.assembly_point.zone}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#b0bec5', marginTop: 2 }}>{data.assembly_point.zone_description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#6a6a8a' }}>Индекс</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: apiGaugeColor(data.assembly_point.index) }}>
                  {data.assembly_point.index > 0 ? '+' : ''}{data.assembly_point.index.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Gauge bar */}
            <div style={{ position: 'relative', background: '#1a1a3a', borderRadius: 6, height: 14, overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${apiGaugePos(data.assembly_point.index)}%`,
                background: `linear-gradient(90deg, #1e88e5, #43a047, #ffd700, #fb8c00, #e53935)`,
                transition: 'width 0.5s',
              }} />
              <div style={{
                position: 'absolute', left: `${apiGaugePos(data.assembly_point.index)}%`,
                top: 0, bottom: 0, width: 2, background: '#fff',
                transform: 'translateX(-1px)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#4a4a6a' }}>
              <span>Тональ</span><span>Равновесие</span><span>Нагуаль</span>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
              <span><span style={{ color: '#1e88e5' }}>Т:</span> {(data.assembly_point.tonal_weight * 100).toFixed(0)}%</span>
              <span><span style={{ color: '#e53935' }}>Н:</span> {(data.assembly_point.nagual_weight * 100).toFixed(0)}%</span>
              <span style={{ color: '#b0bec5', marginLeft: 'auto', fontStyle: 'italic' }}>{data.assembly_point.recommendation}</span>
            </div>
          </div>

          {/* Summary */}
          {data.summary && (
            <div style={{ background: '#0f0f2a', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', border: '1px solid #ffd70020', fontSize: '0.85rem', lineHeight: 1.5, color: '#d4af37' }}>
              {data.summary}
            </div>
          )}

          {/* Dominant spheres */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
            {data.dominant_spheres.map((s, i) => (
              <span key={i} style={{
                background: (SPHERE_COLORS[s] || '#4a4a6a') + '30',
                color: SPHERE_COLORS[s] || '#e8d5a3',
                border: `1px solid ${SPHERE_COLORS[s] || '#4a4a6a'}50`,
                borderRadius: 20, padding: '0.25rem 0.6rem',
                fontSize: '0.78rem', fontWeight: 'bold',
              }}>
                {SPHERE_RU[s] || s}
              </span>
            ))}
          </div>

          {/* Probability branches */}
          {data.branches.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#d4af37', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                ВЕТВИ ВЕРОЯТНОСТЕЙ ({data.branches.length})
              </h3>
              {data.branches.map((b, i) => {
                const isOpen = expandedBranch === b.transit_id;
                const acol = ASPECT_COLOR[b.aspect] || '#90a4ae';
                return (
                  <div key={i} style={{ marginBottom: '0.5rem', borderRadius: 8, overflow: 'hidden', border: `1px solid ${acol}30` }}>
                    {/* Branch header */}
                    <div
                      onClick={() => setExpandedBranch(isOpen ? null : b.transit_id)}
                      style={{
                        background: '#0f0f2a', padding: '0.6rem 0.8rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        cursor: 'pointer', userSelect: 'none',
                      }}
                    >
                      <span style={{ color: '#d4af37', fontSize: '0.9rem' }}>
                        {PLANET_GLYPHS[b.transiting_planet] || b.transiting_planet} {PLANET_RU[b.transiting_planet] || b.transiting_planet}
                      </span>
                      <span style={{ color: acol, fontWeight: 'bold' }}>
                        {b.aspect === 'conjunction' ? '☌' : b.aspect === 'opposition' ? '☍' : b.aspect === 'square' ? '□' : b.aspect === 'trine' ? '△' : b.aspect === 'sextile' ? '⚹' : b.aspect}
                      </span>
                      <span style={{ color: '#e8d5a3', fontSize: '0.85rem' }}>
                        {PLANET_GLYPHS[b.natal_planet] || b.natal_planet} {PLANET_RU[b.natal_planet] || b.natal_planet}
                      </span>
                      <span style={{ color: '#6a6a8a', fontSize: '0.75rem' }}>{b.orb.toFixed(2)}°</span>

                      {/* Probability bar */}
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ background: '#1a1a3a', borderRadius: 3, height: 6, width: 60, overflow: 'hidden' }}>
                          <div style={{ background: acol, width: `${b.probability * 100}%`, height: '100%' }} />
                        </div>
                        <span style={{ color: acol, fontSize: '0.78rem', fontWeight: 'bold' }}>{(b.probability * 100).toFixed(0)}%</span>
                        <span style={{ color: '#6a6a8a', fontSize: '0.75rem' }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Branch details */}
                    {isOpen && (
                      <div style={{ background: '#080818', padding: '0.75rem 1rem', borderTop: `1px solid ${acol}20` }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                          {b.spheres.map((s, j) => (
                            <span key={j} style={{
                              background: (SPHERE_COLORS[s] || '#4a4a6a') + '25',
                              color: SPHERE_COLORS[s] || '#e8d5a3',
                              borderRadius: 12, padding: '0.15rem 0.45rem',
                              fontSize: '0.75rem',
                            }}>{SPHERE_RU[s] || s}</span>
                          ))}
                        </div>

                        {b.seth_vector && (
                          <div style={{ fontSize: '0.8rem', color: '#b0bec5', marginBottom: '0.25rem' }}>
                            <span style={{ color: '#ffd700' }}>Сет:</span> {b.seth_vector}
                          </div>
                        )}
                        {b.castaneda_impact && (
                          <div style={{ fontSize: '0.8rem', color: '#b0bec5', marginBottom: '0.25rem' }}>
                            <span style={{ color: '#ab47bc' }}>Кастанеда:</span> {b.castaneda_impact}
                          </div>
                        )}
                        {b.monroe_level && (
                          <div style={{ fontSize: '0.8rem', color: '#b0bec5', marginBottom: '0.5rem' }}>
                            <span style={{ color: '#00bcd4' }}>Монро:</span> {b.monroe_level}
                          </div>
                        )}

                        {b.recommendations.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6a6a8a', marginBottom: '0.25rem' }}>💡 КОМПЕНСАЦИЯ:</div>
                            {b.recommendations.map((r, j) => (
                              <div key={j} style={{ fontSize: '0.82rem', color: '#d4af37', paddingLeft: '0.5rem', marginBottom: '0.15rem' }}>
                                • {r}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Probability spectrum */}
          {data.probability_spectrum && data.probability_spectrum.length > 0 && (
            <div>
              <button
                onClick={() => setShowSpectrum(!showSpectrum)}
                style={{ background: 'transparent', border: '1px solid #ffd70030', color: '#d4af37', borderRadius: 6, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', marginBottom: '0.5rem' }}
              >
                {showSpectrum ? '▲' : '▼'} Спектр вероятностей по сферам
              </button>
              {showSpectrum && (
                <div style={{ background: '#0f0f2a', borderRadius: 8, padding: '0.75rem', border: '1px solid #ffffff10' }}>
                  {data.probability_spectrum.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: SPHERE_COLORS[s.sphere] || '#e8d5a3', fontSize: '0.8rem', width: 100, flexShrink: 0 }}>
                        {SPHERE_RU[s.sphere] || s.sphere}
                      </span>
                      <div style={{ flex: 1, background: '#1a1a3a', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                        <div style={{
                          background: SPHERE_COLORS[s.sphere] || '#ffd700',
                          width: `${Math.max(0, Math.min(100, s.score * 100))}%`,
                          height: '100%',
                        }} />
                      </div>
                      <span style={{ color: '#6a6a8a', fontSize: '0.75rem', width: 36, textAlign: 'right' }}>
                        {(s.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!data && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6a6a8a' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌀</div>
          <div>Нажмите «Рассчитать» для анализа матрицы вероятностей</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#4a4a6a' }}>
            Транзиты генерируют ветви вероятностей · Точка сборки показывает баланс Тональ/Нагуаль
          </div>
        </div>
      )}
    </div>
  );
};

export default ProbabilityTreeBlock;

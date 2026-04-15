import React, { useState } from 'react';

interface DirectedAspect {
  directed_planet: string;
  natal_point: string;
  aspect: string;
  orb: number;
  applying: boolean;
  exact_date?: string;
}

interface PDData {
  target_date: string;
  age_years: number;
  key: string;
  arc_per_year: number;
  total_arc: number;
  directed_planets: Record<string, { natal_lon: number; directed_lon: number; sign: string; deg_min: string }>;
  aspects: DirectedAspect[];
}

interface PrimaryDirectionsBlockProps {
  birthDate: string;
  birthTime: string;
  lat: number;
  lon: number;
  utc: number;
}

const PLANET_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
  node: 'С. Узел', lilith: 'Лилит', chiron: 'Хирон', asc: 'АСЦ', mc: 'МЦ',
};

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  node: '☊', lilith: '⚸', chiron: '⚷', asc: 'Asc', mc: 'MC',
};

const SIGN_GLYPHS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const ASPECT_SYMBOLS: Record<string, { symbol: string; color: string }> = {
  conjunction: { symbol: '☌', color: '#7e57c2' },
  opposition:  { symbol: '☍', color: '#e53935' },
  square:      { symbol: '□', color: '#e53935' },
  trine:       { symbol: '△', color: '#1e88e5' },
  sextile:     { symbol: '⚹', color: '#1e88e5' },
};

export const PrimaryDirectionsBlock: React.FC<PrimaryDirectionsBlockProps> = ({
  birthDate, birthTime, lat, lon, utc,
}) => {
  const [data, setData] = useState<PDData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<'naibod' | 'ptolemy'>('naibod');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [orb, setOrb] = useState(1.5);
  const [showAllPlanets, setShowAllPlanets] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/predictive/primary-directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: birthDate, time: birthTime, lat, lon, utc,
          target_date: targetDate, key, orb,
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

  const aspectInfo = (a: string) => ASPECT_SYMBOLS[a] || { symbol: a, color: '#90a4ae' };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'Georgia, serif', color: '#e8d5a3' }}>
      <h2 style={{ color: '#ffd700', marginBottom: '1rem', fontSize: '1.1rem' }}>
        ✦ Примарные Дирекции (Птолемей)
      </h2>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <select
          value={key}
          onChange={e => setKey(e.target.value as any)}
          style={{ background: '#1a1a3a', color: '#e8d5a3', border: '1px solid #ffd70040', borderRadius: 6, padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
        >
          <option value="naibod">Ключ Найбода (0.9856°/год)</option>
          <option value="ptolemy">Ключ Птолемея (1°/год)</option>
        </select>
        <input
          type="date" value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          style={{ background: '#1a1a3a', color: '#e8d5a3', border: '1px solid #ffd70040', borderRadius: 6, padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
        />
        <select
          value={orb}
          onChange={e => setOrb(Number(e.target.value))}
          style={{ background: '#1a1a3a', color: '#e8d5a3', border: '1px solid #ffd70040', borderRadius: 6, padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
        >
          <option value={0.5}>Орб 0.5°</option>
          <option value={1.0}>Орб 1.0°</option>
          <option value={1.5}>Орб 1.5°</option>
          <option value={2.0}>Орб 2.0°</option>
        </select>
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
          {/* Summary */}
          <div style={{ background: '#0f0f2a', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', border: '1px solid #ffd70030', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ color: '#6a6a8a', fontSize: '0.75rem', marginBottom: 2 }}>ВОЗРАСТ</div>
              <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.1rem' }}>{data.age_years.toFixed(1)} лет</div>
            </div>
            <div>
              <div style={{ color: '#6a6a8a', fontSize: '0.75rem', marginBottom: 2 }}>ДУГА</div>
              <div style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '1.1rem' }}>{data.total_arc.toFixed(2)}°</div>
            </div>
            <div>
              <div style={{ color: '#6a6a8a', fontSize: '0.75rem', marginBottom: 2 }}>КЛЮЧ</div>
              <div style={{ color: '#e8d5a3', fontSize: '0.9rem' }}>{data.key === 'naibod' ? 'Найбод' : 'Птолемей'} ({data.arc_per_year}°/год)</div>
            </div>
            <div>
              <div style={{ color: '#6a6a8a', fontSize: '0.75rem', marginBottom: 2 }}>АСПЕКТЫ</div>
              <div style={{ color: '#e8d5a3', fontSize: '0.9rem' }}>{data.aspects.length} в орбе {orb}°</div>
            </div>
          </div>

          {/* Aspects */}
          {data.aspects.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#d4af37', fontSize: '0.9rem', marginBottom: '0.5rem' }}>АСПЕКТЫ ДИРЕКЦИЙ</h3>
              {data.aspects.map((a, i) => {
                const asp = aspectInfo(a.aspect);
                return (
                  <div key={i} style={{
                    background: '#0f0f2a', borderRadius: 6, padding: '0.6rem 0.8rem',
                    marginBottom: '0.35rem', border: `1px solid ${asp.color}25`,
                    display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                  }}>
                    <span style={{ color: '#d4af37', fontSize: '0.85rem' }}>
                      {PLANET_GLYPHS[a.directed_planet] || a.directed_planet} <span style={{ color: '#6a6a8a', fontSize: '0.7rem' }}>d-</span>{PLANET_RU[a.directed_planet] || a.directed_planet}
                    </span>
                    <span style={{ color: asp.color, fontSize: '1rem', fontWeight: 'bold' }}>{asp.symbol}</span>
                    <span style={{ color: '#e8d5a3', fontSize: '0.85rem' }}>
                      {PLANET_GLYPHS[a.natal_point] || a.natal_point} {PLANET_RU[a.natal_point] || a.natal_point}
                    </span>
                    <span style={{ color: '#6a6a8a', fontSize: '0.75rem' }}>орб {a.orb.toFixed(2)}°</span>
                    {a.applying && <span style={{ color: '#43a047', fontSize: '0.7rem' }}>▼ сходится</span>}
                    {a.exact_date && (
                      <span style={{ marginLeft: 'auto', color: '#b0bec5', fontSize: '0.78rem' }}>
                        точно {a.exact_date.slice(0, 7)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {data.aspects.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#6a6a8a', fontSize: '0.85rem' }}>
              Нет аспектов в орбе {orb}°. Попробуйте увеличить орб.
            </div>
          )}

          {/* Directed planets table (collapsible) */}
          <div>
            <button
              onClick={() => setShowAllPlanets(!showAllPlanets)}
              style={{ background: 'transparent', border: '1px solid #ffd70030', color: '#d4af37', borderRadius: 6, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              {showAllPlanets ? '▲' : '▼'} Все дирекции ({Object.keys(data.directed_planets).length} планет)
            </button>

            {showAllPlanets && (
              <div style={{ marginTop: '0.5rem', background: '#0f0f2a', borderRadius: 8, padding: '0.75rem', border: '1px solid #ffffff10', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      {['Планета', 'Натальная', 'Дирекция', 'Знак', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', color: '#6a6a8a', padding: '0.25rem 0.5rem', borderBottom: '1px solid #ffffff10' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.directed_planets).map(([pname, pd]) => (
                      <tr key={pname}>
                        <td style={{ padding: '0.25rem 0.5rem', color: '#d4af37' }}>
                          {PLANET_GLYPHS[pname] || ''} {PLANET_RU[pname] || pname}
                        </td>
                        <td style={{ padding: '0.25rem 0.5rem', color: '#b0bec5' }}>{pd.natal_lon.toFixed(2)}°</td>
                        <td style={{ padding: '0.25rem 0.5rem', color: '#e8d5a3' }}>{pd.directed_lon.toFixed(2)}°</td>
                        <td style={{ padding: '0.25rem 0.5rem', color: '#e8d5a3' }}>
                          {SIGN_GLYPHS[pd.sign] || ''} {pd.deg_min}
                        </td>
                        <td style={{ padding: '0.25rem 0.5rem', color: '#43a047', fontSize: '0.75rem' }}>
                          +{(pd.directed_lon - pd.natal_lon).toFixed(2)}°
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!data && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6a6a8a' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✦</div>
          <div>Нажмите «Рассчитать» для расчёта примарных дирекций</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#4a4a6a' }}>
            Точнейший метод датировки (до месяца). Дуга = возраст × ключ Найбода/Птолемея
          </div>
        </div>
      )}
    </div>
  );
};

export default PrimaryDirectionsBlock;

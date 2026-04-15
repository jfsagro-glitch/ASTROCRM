import React, { useState } from 'react';

interface ZRPeriod {
  level: number;
  sign: string;
  sign_ru: string;
  years: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_loosing: boolean;
  sub_periods?: ZRPeriod[];
}

interface ZRData {
  lot: string;
  lot_sign: string;
  lot_lon: number;
  target_date: string;
  current_period?: ZRPeriod;
  current_sub?: ZRPeriod;
  upcoming_periods: ZRPeriod[];
  loosing_of_bond: Array<{ date: string; sign: string; sign_ru: string; description: string }>;
  period_context?: string;
}

interface ZodiacalReleasingBlockProps {
  birthDate: string;
  birthTime: string;
  lat: number;
  lon: number;
  utc: number;
}

const SIGN_GLYPHS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const SIGN_COLORS: Record<string, string> = {
  aries: '#e53935', taurus: '#43a047', gemini: '#fdd835', cancer: '#b0bec5',
  leo: '#fb8c00', virgo: '#827717', libra: '#00acc1', scorpio: '#6a1b9a',
  sagittarius: '#8d6e63', capricorn: '#455a64', aquarius: '#1e88e5', pisces: '#7b1fa2',
};

const LOT_OPTIONS = [
  { value: 'fortune', label: '⚙ Фортуна (обстоятельства)' },
  { value: 'spirit',  label: '✦ Дух (карьера/духовное)' },
];

export const ZodiacalReleasingBlock: React.FC<ZodiacalReleasingBlockProps> = ({
  birthDate, birthTime, lat, lon, utc,
}) => {
  const [data, setData] = useState<ZRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lot, setLot] = useState<'fortune' | 'spirit'>('fortune');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/predictive/zodiacal-releasing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: birthDate, time: birthTime, lat, lon, utc,
          target_date: targetDate, lot, lookahead_years: 20,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const periodProgress = (p: ZRPeriod) => {
    const start = new Date(p.start_date).getTime();
    const end   = new Date(p.end_date).getTime();
    const now   = new Date(targetDate).getTime();
    return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'Georgia, serif', color: '#e8d5a3' }}>
      <h2 style={{ color: '#ffd700', marginBottom: '1rem', fontSize: '1.1rem' }}>
        ⏳ Зодиакальное Высвобождение (Валенс)
      </h2>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <select
          value={lot}
          onChange={e => setLot(e.target.value as any)}
          style={{ background: '#1a1a3a', color: '#e8d5a3', border: '1px solid #ffd70040', borderRadius: 6, padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
        >
          {LOT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="date" value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          style={{ background: '#1a1a3a', color: '#e8d5a3', border: '1px solid #ffd70040', borderRadius: 6, padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
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
          {/* Lot info */}
          <div style={{ background: '#0f0f2a', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', border: '1px solid #ffd70030' }}>
            <span style={{ color: '#b0bec5', fontSize: '0.8rem' }}>Жребий </span>
            <strong style={{ color: '#ffd700' }}>{lot === 'fortune' ? 'Фортуны' : 'Духа'}</strong>
            <span style={{ margin: '0 0.5rem', color: '#6a6a8a' }}>→</span>
            <span style={{ fontSize: '1.1rem' }}>{SIGN_GLYPHS[data.lot_sign] || ''}</span>
            <strong style={{ color: SIGN_COLORS[data.lot_sign] || '#e8d5a3', marginLeft: 4 }}>{data.lot_sign} {data.lot_lon.toFixed(1)}°</strong>
          </div>

          {/* Current Period */}
          {data.current_period && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#d4af37', fontSize: '0.9rem', marginBottom: '0.5rem' }}>ТЕКУЩИЙ ПЕРИОД (L1)</h3>
              <div style={{ background: '#0f0f2a', borderRadius: 8, padding: '1rem', border: `1px solid ${SIGN_COLORS[data.current_period.sign] || '#ffd700'}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{SIGN_GLYPHS[data.current_period.sign] || ''}</span>
                  <strong style={{ color: SIGN_COLORS[data.current_period.sign] || '#e8d5a3', fontSize: '1.1rem' }}>
                    {data.current_period.sign_ru}
                  </strong>
                  <span style={{ color: '#b0bec5', fontSize: '0.85rem', marginLeft: 'auto' }}>
                    {data.current_period.years} лет
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#b0bec5', marginBottom: '0.5rem' }}>
                  {data.current_period.start_date} — {data.current_period.end_date}
                </div>
                {/* Progress bar */}
                <div style={{ background: '#1a1a3a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    background: SIGN_COLORS[data.current_period.sign] || '#ffd700',
                    width: `${periodProgress(data.current_period)}%`,
                    height: '100%',
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6a6a8a', marginTop: 4 }}>
                  Пройдено: {periodProgress(data.current_period).toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Current Sub-period */}
          {data.current_sub && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#d4af37', fontSize: '0.9rem', marginBottom: '0.5rem' }}>СУБПЕРИОД (L2)</h3>
              <div style={{ background: '#0f0f2a', borderRadius: 8, padding: '0.75rem 1rem', border: '1px solid #ffd70020' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{SIGN_GLYPHS[data.current_sub.sign] || ''}</span>
                  <strong style={{ color: SIGN_COLORS[data.current_sub.sign] || '#e8d5a3' }}>
                    {data.current_sub.sign_ru}
                  </strong>
                  <span style={{ color: '#b0bec5', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    {data.current_sub.start_date} – {data.current_sub.end_date}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming periods */}
          {data.upcoming_periods.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#d4af37', fontSize: '0.9rem', marginBottom: '0.5rem' }}>ПРЕДСТОЯЩИЕ ПЕРИОДЫ</h3>
              {data.upcoming_periods.slice(0, 6).map((p, i) => (
                <div key={i} style={{
                  background: '#0f0f2a', borderRadius: 6, padding: '0.5rem 0.75rem',
                  marginBottom: '0.35rem', border: '1px solid #ffffff10',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <span style={{ color: '#6a6a8a', fontSize: '0.75rem', width: 20 }}>{i + 1}</span>
                  <span style={{ fontSize: '0.95rem' }}>{SIGN_GLYPHS[p.sign] || ''}</span>
                  <span style={{ color: SIGN_COLORS[p.sign] || '#e8d5a3', fontSize: '0.9rem' }}>{p.sign_ru}</span>
                  <span style={{ color: '#b0bec5', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    {p.start_date.slice(0, 7)}
                  </span>
                  <span style={{ color: '#6a6a8a', fontSize: '0.75rem' }}>{p.years}л</span>
                </div>
              ))}
            </div>
          )}

          {/* Loosing of Bond */}
          {data.loosing_of_bond.length > 0 && (
            <div>
              <h3 style={{ color: '#ef5350', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                🔓 LOOSING OF THE BOND (пиковые смены)
              </h3>
              {data.loosing_of_bond.slice(0, 5).map((lob, i) => (
                <div key={i} style={{
                  background: '#1a0a0a', borderRadius: 6, padding: '0.5rem 0.75rem',
                  marginBottom: '0.35rem', border: '1px solid #ef535030',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <span style={{ color: '#ef5350', fontSize: '0.85rem', fontWeight: 'bold' }}>{lob.date.slice(0, 7)}</span>
                  <span style={{ fontSize: '0.9rem' }}>{SIGN_GLYPHS[lob.sign] || ''}</span>
                  <span style={{ color: SIGN_COLORS[lob.sign] || '#e8d5a3', fontSize: '0.85rem' }}>{lob.sign_ru}</span>
                  <span style={{ color: '#b0bec5', fontSize: '0.78rem', marginLeft: 'auto' }}>{lob.description}</span>
                </div>
              ))}
            </div>
          )}

          {data.period_context && (
            <div style={{ marginTop: '1rem', background: '#0f0f2a', borderRadius: 8, padding: '0.75rem', border: '1px solid #ffd70020', fontSize: '0.85rem', color: '#b0bec5', lineHeight: 1.5 }}>
              {data.period_context}
            </div>
          )}
        </>
      )}

      {!data && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6a6a8a' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <div>Выберите жребий и нажмите «Рассчитать»</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#4a4a6a' }}>
            Техника Веттия Валенса (II в. н.э.) — периоды знаков от жребия
          </div>
        </div>
      )}
    </div>
  );
};

export default ZodiacalReleasingBlock;

import React, { useState } from 'react';

interface GKSphere {
  key: string;
  sphere_name: string;
  description: string;
  planet: string;
  gate: number;
  line: number;
  iching: string;
  gk_name: string;
  shadow: string;
  gift: string;
  siddhi: string;
  keywords: string[];
  codon_ring: string;
  partner: number;
}

interface GKSequence {
  name: string;
  description: string;
  spheres: GKSphere[];
}

interface GKProfile {
  name: string;
  birth_date: string;
  design_date: string;
  activation_sequence: GKSequence;
  venus_sequence: GKSequence;
  pearl_sequence: GKSequence;
  life_purpose: string;
  prime_gift: GKSphere;
  all_active_gates: GKSphere[];
  active_codon_rings: Array<{ ring: string; gates: number[]; description: string }>;
  total_activated_gates: number;
}

interface GeneKeysBlockProps {
  birthDate: string;
  birthTime: string;
  lat: number;
  lon: number;
  utc: number;
}

// Colors for the triad levels
const LEVEL_COLORS = {
  shadow: { bg: '#1a0a0a', border: '#ef535040', text: '#ef5350', label: 'ТЕНЬ' },
  gift:   { bg: '#0a1a0a', border: '#43a04740', text: '#43a047', label: 'ДАР' },
  siddhi: { bg: '#0a0a2a', border: '#7e57c240', text: '#ce93d8', label: 'СИДДХИ' },
};

const PLANET_RU: Record<string, string> = {
  birth_sun: '☉ Солнце (рожд.)', birth_earth: '⊕ Земля (рожд.)',
  birth_moon: '☽ Луна (рожд.)', birth_mercury: '☿ Меркурий (рожд.)',
  birth_venus: '♀ Венера (рожд.)', birth_mars: '♂ Марс (рожд.)',
  birth_jupiter: '♃ Юпитер (рожд.)', birth_saturn: '♄ Сатурн (рожд.)',
  design_sun: '☉ Солнце (дизайн)', design_earth: '⊕ Земля (дизайн)',
  design_moon: '☽ Луна (дизайн)', design_mercury: '☿ Меркурий (дизайн)',
  design_venus: '♀ Венера (дизайн)',
};

const SEQ_ICONS = {
  activation_sequence: '◆',
  venus_sequence: '♀',
  pearl_sequence: '○',
};

const SphereCard: React.FC<{ sphere: GKSphere; expanded?: boolean }> = ({ sphere, expanded = false }) => {
  const [open, setOpen] = useState(expanded);

  return (
    <div
      style={{
        background: '#0f0f2a',
        borderRadius: 10,
        border: '1px solid #ffd70025',
        overflow: 'hidden',
        marginBottom: '0.5rem',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '0.75rem 1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          userSelect: 'none',
        }}
      >
        {/* Gate number */}
        <div style={{
          background: '#ffd70015',
          border: '1px solid #ffd70030',
          borderRadius: 8,
          width: 42,
          height: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '1rem',
          fontWeight: 'bold',
          color: '#ffd700',
        }}>
          {sphere.gate}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', color: '#6a6a8a', marginBottom: 2 }}>
            {sphere.sphere_name}
          </div>
          <div style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '0.95rem' }}>
            GK {sphere.gate} · {sphere.gk_name || sphere.iching}
          </div>
          <div style={{ color: '#b0bec5', fontSize: '0.78rem', marginTop: 1 }}>
            {PLANET_RU[sphere.planet] || sphere.planet}
          </div>
        </div>
        {/* Compact triad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', flexShrink: 0 }}>
          <span style={{ fontSize: '0.68rem', color: LEVEL_COLORS.shadow.text, background: '#1a0a0a', padding: '1px 5px', borderRadius: 3 }}>{sphere.shadow}</span>
          <span style={{ fontSize: '0.68rem', color: LEVEL_COLORS.gift.text, background: '#0a1a0a', padding: '1px 5px', borderRadius: 3 }}>{sphere.gift}</span>
          <span style={{ fontSize: '0.68rem', color: LEVEL_COLORS.siddhi.text, background: '#0a0a2a', padding: '1px 5px', borderRadius: 3 }}>{sphere.siddhi}</span>
        </div>
        <span style={{ color: '#6a6a8a', fontSize: '0.75rem', alignSelf: 'center' }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Expanded details */}
      {open && (
        <div style={{ borderTop: '1px solid #ffd70015', padding: '0.75rem 1rem', background: '#080818' }}>
          {/* Context */}
          <div style={{ color: '#b0bec5', fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            {sphere.description}
          </div>
          <div style={{ color: '#6a6a8a', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            I Ching: <span style={{ color: '#e8d5a3' }}>{sphere.iching}</span>
            {sphere.codon_ring && <> · Ring: <span style={{ color: '#ab47bc' }}>{sphere.codon_ring}</span></>}
            {sphere.partner > 0 && <> · Партнёр: GK <span style={{ color: '#d4af37' }}>{sphere.partner}</span></>}
          </div>

          {/* Triad */}
          {(['shadow', 'gift', 'siddhi'] as const).map(level => (
            <div key={level} style={{
              background: LEVEL_COLORS[level].bg,
              border: `1px solid ${LEVEL_COLORS[level].border}`,
              borderRadius: 6,
              padding: '0.5rem 0.75rem',
              marginBottom: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ color: LEVEL_COLORS[level].text, fontSize: '0.7rem', fontWeight: 'bold', width: 56, flexShrink: 0 }}>
                {LEVEL_COLORS[level].label}
              </span>
              <span style={{ color: '#e8d5a3', fontSize: '0.88rem', fontWeight: level === 'gift' ? 'bold' : 'normal' }}>
                {sphere[level]}
              </span>
            </div>
          ))}

          {/* Keywords */}
          {sphere.keywords?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
              {sphere.keywords.map((kw, i) => (
                <span key={i} style={{
                  background: '#ffffff0a', border: '1px solid #ffffff15',
                  borderRadius: 12, padding: '0.15rem 0.5rem',
                  fontSize: '0.72rem', color: '#90a4ae',
                }}>{kw}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const GeneKeysBlock: React.FC<GeneKeysBlockProps> = ({
  birthDate, birthTime, lat, lon, utc,
}) => {
  const [data, setData] = useState<GKProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [activeSeq, setActiveSeq] = useState<'activation' | 'venus' | 'pearl' | 'gates'>('activation');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/gene-keys/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: birthDate, time: birthTime, lat, lon, utc, name }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setData(await resp.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const sequenceTabs = [
    { key: 'activation' as const, label: '◆ Активация', count: data?.activation_sequence.spheres.length },
    { key: 'venus' as const,      label: '♀ Венера',    count: data?.venus_sequence.spheres.length },
    { key: 'pearl' as const,      label: '○ Жемчуг',    count: data?.pearl_sequence.spheres.length },
    { key: 'gates' as const,      label: '✦ Все врата', count: data?.total_activated_gates },
  ];

  const activeSequence = activeSeq === 'activation' ? data?.activation_sequence :
                         activeSeq === 'venus'      ? data?.venus_sequence :
                         activeSeq === 'pearl'      ? data?.pearl_sequence : null;

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'Georgia, serif', color: '#e8d5a3' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ color: '#ffd700', fontSize: '1.1rem', marginBottom: '0.2rem' }}>
            ✦ Gene Keys — Золотой Путь
          </h2>
          <div style={{ color: '#6a6a8a', fontSize: '0.78rem' }}>
            64 Ключа · Тень → Дар → Сиддхи · I Ching мандала
          </div>
        </div>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          placeholder="Имя (необязательно)"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ background: '#1a1a3a', color: '#e8d5a3', border: '1px solid #ffd70040', borderRadius: 6, padding: '0.4rem 0.7rem', fontSize: '0.85rem', flex: 1, minWidth: 160 }}
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
          {/* Life Purpose */}
          <div style={{ background: '#0f0f2a', borderRadius: 10, padding: '1rem', marginBottom: '1rem', border: '1px solid #ffd70030' }}>
            <div style={{ fontSize: '0.75rem', color: '#6a6a8a', marginBottom: '0.4rem' }}>ЦЕЛЬ ЖИЗНИ — Генетический Ключ {data.prime_gift.gate}</div>
            <div style={{ color: '#d4af37', fontSize: '0.92rem', lineHeight: 1.6 }}>{data.life_purpose}</div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ background: '#1a0a0a', color: '#ef5350', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem' }}>Тень: {data.prime_gift.shadow}</span>
              <span style={{ background: '#0a1a0a', color: '#43a047', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem' }}>Дар: {data.prime_gift.gift}</span>
              <span style={{ background: '#0a0a2a', color: '#ce93d8', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem' }}>Сиддхи: {data.prime_gift.siddhi}</span>
            </div>
          </div>

          {/* Codon Rings */}
          {data.active_codon_rings.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {data.active_codon_rings.slice(0, 4).map((r, i) => (
                <div key={i} title={r.description} style={{
                  background: '#0f0f2a', border: '1px solid #ab47bc40',
                  borderRadius: 6, padding: '0.3rem 0.6rem',
                  fontSize: '0.73rem', color: '#ce93d8',
                }}>
                  {r.ring} [{r.gates.join(', ')}]
                </div>
              ))}
            </div>
          )}

          {/* Sequence selector tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem', borderBottom: '1px solid #ffd70020', paddingBottom: '0.5rem' }}>
            {sequenceTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSeq(tab.key)}
                style={{
                  background: activeSeq === tab.key ? '#ffd70020' : 'transparent',
                  color: activeSeq === tab.key ? '#ffd700' : '#6a6a8a',
                  border: `1px solid ${activeSeq === tab.key ? '#ffd70050' : '#ffffff15'}`,
                  borderRadius: 6, padding: '0.35rem 0.7rem',
                  cursor: 'pointer', fontSize: '0.82rem',
                }}
              >
                {tab.label} {tab.count !== undefined && <span style={{ opacity: 0.6 }}>({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Sequence content */}
          {activeSeq !== 'gates' && activeSequence && (
            <div>
              <div style={{ color: '#b0bec5', fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {activeSequence.description}
              </div>
              {activeSequence.spheres.map((sphere, i) => (
                <SphereCard key={sphere.key} sphere={sphere} expanded={i === 0 && activeSeq === 'activation'} />
              ))}
            </div>
          )}

          {/* All active gates view */}
          {activeSeq === 'gates' && (
            <div>
              <div style={{ color: '#b0bec5', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                Всего активировано ворот: <strong style={{ color: '#ffd700' }}>{data.total_activated_gates}</strong>
                {' '}(рождение + дизайн {data.design_date})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.4rem' }}>
                {data.all_active_gates.map((g, i) => (
                  <div key={i} style={{
                    background: '#0f0f2a', borderRadius: 8, padding: '0.5rem 0.6rem',
                    border: '1px solid #ffffff10',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '0.95rem' }}>GK {g.gate}</span>
                      <span style={{ color: '#6a6a8a', fontSize: '0.7rem' }}>/{g.line}</span>
                    </div>
                    <div style={{ color: '#d4af37', fontSize: '0.78rem' }}>{g.gk_name || g.iching}</div>
                    <div style={{ color: '#43a047', fontSize: '0.72rem', marginTop: 2 }}>{g.gift}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!data && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6a6a8a' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✦</div>
          <div style={{ fontSize: '0.95rem' }}>Нажмите «Рассчитать» для вашего профиля Gene Keys</div>
          <div style={{ fontSize: '0.78rem', marginTop: '0.5rem', color: '#4a4a6a', maxWidth: 380, margin: '0.5rem auto 0' }}>
            64 ключа сознания · 3 последовательности Золотого Пути ·
            Тень → Дар → Сиддхи для каждой сферы жизни
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneKeysBlock;

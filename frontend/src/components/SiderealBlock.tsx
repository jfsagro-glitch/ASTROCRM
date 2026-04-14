import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import type { BirthInput } from '../types/astro';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

const SIGN_GLYPHS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍',
  libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const SIGN_NAME_RU: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнецы', cancer: 'Рак',
  leo: 'Лев', virgo: 'Дева', libra: 'Весы', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козерог', aquarius: 'Водолей', pisces: 'Рыбы',
};

const PLANET_NAME_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн',
  uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
  node: 'Сев. Узел', lilith: 'Лилит', chiron: 'Хирон',
};

const PLANET_GLYPH: Record<string, string> = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  node: '☊', lilith: '⚸', chiron: '⚷',
};

const SYSTEM_DESCRIPTIONS: Record<string, string> = {
  lahiri:       'Лахири — официальная индийская система (Читрапакша). Наиболее распространена в Джйотиш.',
  raman:        'Раман — система Б.В. Рамана. Популярна среди западных астрологов Джйотиш.',
  fagan_bradley:'Фаган–Брэдли — западная сидерическая система. База для западной сидерической астрологии.',
  krishnamurti: 'Кришнамурти (KP) — точная система для предиктивной астрологии КП.',
  yukteshwar:   'Йуктешвар — система Свами Йуктешвара из "Святой Науки".',
  de_luce:      'Де Люс — историческая западная система.',
  djwhal_khul:  'Джвал Кхул — основана на учениях Алисы Бейли/ТД.',
};

interface PlanetEntry {
  tropical_lon: number;
  sidereal_lon: number;
  sign_tropical: string;
  sign_sidereal: string;
  deg_in_sign: number;
  deg_min: string;
  ayanamsa: number;
}

interface SiderealData {
  date: string;
  system: string;
  ayanamsa_deg: number;
  ayanamsa_str: string;
  planets: Record<string, PlanetEntry>;
  available_systems: string[];
}

interface Props {
  birthData: BirthInput;
  theme: Record<string, string>;
}

const PLANET_ORDER = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','node','lilith','chiron'];

export default function SiderealBlock({ birthData, theme }: Props) {
  const [data, setData]         = useState<SiderealData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [system, setSystem]     = useState('lahiri');
  const [showDiff, setShowDiff] = useState(false);

  const load = useCallback(async () => {
    if (!birthData.date || !birthData.time) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/natal/sidereal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: birthData.date, time: birthData.time,
          lat: birthData.lat, lon: birthData.lon, utc: birthData.utc,
          system,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData, system]);

  useEffect(() => { load(); }, [birthData.date, birthData.time, system]);

  const systems = data?.available_systems ?? ['lahiri', 'raman', 'fagan_bradley', 'krishnamurti', 'yukteshwar', 'de_luce', 'djwhal_khul'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <Globe className={`h-5 w-5 ${theme.symbol}`} />
          <h2 className={`font-bold ${theme.text}`}>Сидерическая Карта</h2>
          <button onClick={load} className={`ml-auto ${theme.symbol}`} title="Обновить">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* System selector */}
        <div className="flex flex-wrap gap-1.5">
          {systems.map(s => (
            <button
              key={s}
              onClick={() => setSystem(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                system === s
                  ? `${theme.symbol} bg-white/15 border border-white/20`
                  : `${theme.muted ?? 'text-white/50'} hover:bg-white/10`
              }`}
            >
              {s === 'lahiri' ? 'Лахири' : s === 'raman' ? 'Раман' :
               s === 'fagan_bradley' ? 'Фаган-Брэдли' : s === 'krishnamurti' ? 'KP' :
               s === 'yukteshwar' ? 'Йуктешвар' : s === 'de_luce' ? 'Де Люс' :
               s === 'djwhal_khul' ? 'Д.К.' : s}
            </button>
          ))}
        </div>

        {data && (
          <div className="mt-3 flex items-center gap-3">
            <div className={`rounded-lg px-3 py-1.5 bg-white/5 border border-white/10`}>
              <p className={`text-xs ${theme.muted ?? 'text-white/50'}`}>Аянамша</p>
              <p className={`font-mono text-sm font-bold ${theme.symbol}`}>{data.ayanamsa_str}</p>
            </div>
            <p className={`text-xs ${theme.muted ?? 'text-white/50'} flex-1`}>
              {SYSTEM_DESCRIPTIONS[system] ?? ''}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className={`rounded-xl border ${theme.card} p-4 flex gap-2`}>
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className={`rounded-xl border ${theme.card} p-8 flex justify-center`}>
          <Loader2 className={`h-8 w-8 animate-spin ${theme.symbol}`} />
        </div>
      )}

      {/* Toggle diff */}
      {data && (
        <div className="flex items-center gap-2">
          <label className={`flex items-center gap-2 text-sm cursor-pointer ${theme.text}`}>
            <input
              type="checkbox"
              checked={showDiff}
              onChange={e => setShowDiff(e.target.checked)}
              className="rounded"
            />
            Показать тропические позиции для сравнения
          </label>
        </div>
      )}

      {/* Planets table */}
      {data && (
        <div className={`rounded-xl border ${theme.card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b border-white/10 text-xs ${theme.muted ?? 'text-white/50'} uppercase tracking-wider`}>
                  <th className="px-4 py-2.5 text-left">Планета</th>
                  <th className="px-3 py-2.5 text-center">Сидер.</th>
                  <th className="px-3 py-2.5 text-center">Знак (С)</th>
                  {showDiff && <>
                    <th className="px-3 py-2.5 text-center">Тропич.</th>
                    <th className="px-3 py-2.5 text-center">Знак (Т)</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.filter(p => p in data.planets).map((planet, i) => {
                  const entry = data.planets[planet];
                  const signChanged = entry.sign_tropical !== entry.sign_sidereal;
                  return (
                    <tr key={planet} className={`border-b border-white/5 hover:bg-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-base ${theme.symbol}`}>{PLANET_GLYPH[planet] ?? '•'}</span>
                          <span className={theme.text}>{PLANET_NAME_RU[planet] ?? planet}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        <span className={`text-sm font-medium ${theme.symbol}`}>{entry.deg_min}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-base ${signChanged ? 'text-amber-400' : theme.symbol}`} title={SIGN_NAME_RU[entry.sign_sidereal] ?? entry.sign_sidereal}>
                          {SIGN_GLYPHS[entry.sign_sidereal] ?? entry.sign_sidereal}
                        </span>
                        <span className={`ml-1 text-xs ${theme.muted ?? 'text-white/50'}`}>
                          {SIGN_NAME_RU[entry.sign_sidereal] ?? entry.sign_sidereal}
                        </span>
                      </td>
                      {showDiff && <>
                        <td className="px-3 py-2 text-center font-mono">
                          <span className={`text-sm ${theme.muted ?? 'text-white/50'}`}>
                            {Math.floor(entry.tropical_lon % 30)}°{Math.floor((entry.tropical_lon % 1) * 60).toString().padStart(2,'0')}'
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-base ${signChanged ? 'text-white/40' : theme.muted ?? 'text-white/40'}`} title={SIGN_NAME_RU[entry.sign_tropical] ?? entry.sign_tropical}>
                            {SIGN_GLYPHS[entry.sign_tropical] ?? entry.sign_tropical}
                          </span>
                          {signChanged && (
                            <span className="ml-1 text-xs text-amber-400/70">≠</span>
                          )}
                        </td>
                      </>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {showDiff && (
            <div className={`px-4 py-2 border-t border-white/5 text-xs ${theme.muted ?? 'text-white/50'}`}>
              <span className="text-amber-400">≠</span> — знак отличается от тропического
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';
import type { BirthInput } from '../types/astro';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

interface PlanetaryHour {
  hour_number: number;
  period: 'day' | 'night';
  planet: string;
  planet_ru: string;
  glyph: string;
  start_str: string;
  end_str: string;
  keyword: string;
  is_current: boolean;
}

interface PlanetaryHoursData {
  date: string;
  day_ruler: string;
  day_ruler_ru: string;
  day_ruler_glyph: string;
  sunrise_local: string;
  sunset_local: string;
  day_hour_len_min: number;
  night_hour_len_min: number;
  hours: PlanetaryHour[];
  current_hour: PlanetaryHour | null;
}

const PLANET_COLORS: Record<string, string> = {
  sun:      'text-amber-400 border-amber-400/30 bg-amber-400/10',
  moon:     'text-slate-300 border-slate-300/30 bg-slate-300/10',
  mars:     'text-red-400 border-red-400/30 bg-red-400/10',
  mercury:  'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  jupiter:  'text-blue-400 border-blue-400/30 bg-blue-400/10',
  venus:    'text-pink-400 border-pink-400/30 bg-pink-400/10',
  saturn:   'text-violet-400 border-violet-400/30 bg-violet-400/10',
};

const PLANET_BG: Record<string, string> = {
  sun:     'bg-amber-400',
  moon:    'bg-slate-300',
  mars:    'bg-red-400',
  mercury: 'bg-emerald-400',
  jupiter: 'bg-blue-400',
  venus:   'bg-pink-400',
  saturn:  'bg-violet-400',
};

interface Props {
  birthData: Pick<BirthInput, 'lat' | 'lon' | 'utc'>;
  theme: Record<string, string>;
  date?: string;
}

export default function PlanetaryHoursBlock({ birthData, theme, date }: Props) {
  const [data, setData]         = useState<PlanetaryHoursData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selectedDate, setDate] = useState(date ?? new Date().toISOString().slice(0, 10));
  const [view, setView]         = useState<'current' | 'all'>('current');

  const load = useCallback(async () => {
    if (!birthData.lat || !birthData.lon) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/planetary-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, lat: birthData.lat, lon: birthData.lon, utc: birthData.utc }),
      });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData, selectedDate]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className={`rounded-xl border ${theme.card} p-8 flex justify-center`}>
        <Loader2 className={`h-8 w-8 animate-spin ${theme.symbol}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl border ${theme.card} p-4 flex items-center gap-2`}>
        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${theme.symbol}`} />
            <h2 className={`font-bold ${theme.text}`}>Планетарные Часы</h2>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setDate(e.target.value)}
            className={`px-2 py-1 rounded text-sm border ${theme.input ?? 'bg-white/10 border-white/20 text-white'}`}
          />
        </div>

        {data && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${PLANET_COLORS[data.day_ruler]} border`}>
              <span className="text-lg">{data.day_ruler_glyph}</span>
              <div>
                <p className="text-xs opacity-70">Правитель дня</p>
                <p className="font-semibold text-sm">{data.day_ruler_ru}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span className={theme.muted ?? 'text-white/60'}>{data.sunrise_local}</span>
              </span>
              <span className="flex items-center gap-1">
                <Moon className="h-3.5 w-3.5 text-slate-400" />
                <span className={theme.muted ?? 'text-white/60'}>{data.sunset_local}</span>
              </span>
              <span className={`text-xs ${theme.muted ?? 'text-white/50'}`}>
                День {data.day_hour_len_min}мин · Ночь {data.night_hour_len_min}мин
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Current hour highlight */}
      {data?.current_hour && (
        <div className={`rounded-xl border-2 border-${PLANET_BG[data.current_hour.planet]?.replace('bg-', '')}/50 ${PLANET_COLORS[data.current_hour.planet]} p-4`}>
          <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Текущий час</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{data.current_hour.glyph}</span>
              <div>
                <p className="font-bold text-lg">{data.current_hour.planet_ru}</p>
                <p className="text-sm opacity-80">{data.current_hour.keyword}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm">{data.current_hour.start_str} – {data.current_hour.end_str}</p>
              <p className="text-xs opacity-70">Час {data.current_hour.hour_number} ({data.current_hour.period === 'day' ? '☀' : '☾'})</p>
            </div>
          </div>
        </div>
      )}

      {/* View toggle */}
      {data && (
        <div className="flex gap-2">
          <button
            onClick={() => setView('current')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'current' ? `${theme.symbol} bg-white/15` : `${theme.muted ?? 'text-white/50'} hover:bg-white/10`}`}
          >
            Ближайшие
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'all' ? `${theme.symbol} bg-white/15` : `${theme.muted ?? 'text-white/50'} hover:bg-white/10`}`}
          >
            Все 24 часа
          </button>
        </div>
      )}

      {/* Hours grid */}
      {data && (
        <div className={`rounded-xl border ${theme.card} p-4`}>
          {view === 'current' ? (
            // Show next 6 hours around current
            <div className="space-y-1">
              {(() => {
                const curIdx = data.current_hour
                  ? data.hours.findIndex(h => h.hour_number === data.current_hour!.hour_number)
                  : 0;
                const start = Math.max(0, curIdx - 1);
                const slice = data.hours.slice(start, start + 8);
                return slice.map(h => (
                  <div
                    key={h.hour_number}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                      h.is_current ? `${PLANET_COLORS[h.planet]} border` : 'hover:bg-white/5'
                    }`}
                  >
                    <span className={`text-lg w-6 text-center ${PLANET_COLORS[h.planet].split(' ')[0]}`}>{h.glyph}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${h.is_current ? '' : theme.text}`}>{h.planet_ru}</span>
                      {h.is_current && <span className="ml-2 text-xs opacity-70">← сейчас</span>}
                      <p className={`text-xs truncate ${theme.muted ?? 'text-white/50'}`}>{h.keyword}</p>
                    </div>
                    <span className={`font-mono text-xs ${theme.muted ?? 'text-white/50'} shrink-0`}>
                      {h.start_str}
                    </span>
                    <span className="text-xs opacity-40">{h.period === 'day' ? '☀' : '☾'}</span>
                  </div>
                ));
              })()}
            </div>
          ) : (
            // All 24 hours in compact grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
              {data.hours.map(h => (
                <div
                  key={h.hour_number}
                  className={`rounded-lg px-2.5 py-2 text-center ${
                    h.is_current
                      ? `${PLANET_COLORS[h.planet]} border font-semibold`
                      : 'bg-white/5 hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs opacity-50">{h.hour_number}</span>
                    <span className="text-xs opacity-40">{h.period === 'day' ? '☀' : '☾'}</span>
                  </div>
                  <span className={`text-base ${PLANET_COLORS[h.planet].split(' ')[0]}`}>{h.glyph}</span>
                  <p className={`text-xs mt-0.5 ${theme.muted ?? 'text-white/60'}`}>{h.planet_ru}</p>
                  <p className={`font-mono text-xs ${theme.muted ?? 'text-white/50'}`}>{h.start_str}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

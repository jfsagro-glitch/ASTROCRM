import React, { useState, useCallback } from 'react';
import type { BirthInput } from '../types/astro';
import { getJyotish } from '../services/astrologyService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GrahaData {
  key: string;
  name_ru: string;
  glyph: string;
  rasi: number;
  rasi_name_ru: string;
  rasi_glyph: string;
  deg_in_rasi: number;
  bhava: number;
  bhava_name: string;
  bhava_theme: string;
  retrograde: boolean;
  nakshatra_ru: string;
  nakshatra_en: string;
  nakshatra_lord: string;
  pada: number;
  dignity: string;
  dignity_ru: string;
  strength: number;
  bav: number[];
  interpretation: string;
  general_meaning: string;
}

interface AntarDasha {
  lord: string;
  lord_ru: string;
  lord_glyph: string;
  start: string;
  end: string;
  active: boolean;
  antar_interp?: string;
}

interface Dasha {
  lord: string;
  lord_ru: string;
  lord_glyph: string;
  start: string;
  end: string;
  years: number;
  active: boolean;
  dasha_interp?: string;
  antardasha: AntarDasha[];
}

interface Yoga {
  name_ru: string;
  name_en: string;
  type: string;
  strength: string;
  grahas: string[];
  interpretation: string;
}

interface LagnaInfo {
  title: string;
  rasi: number;
  rasi_name_ru: string;
  rasi_glyph: string;
  deg: number;
  lord: string;
  lord_ru: string;
  element?: string;
  quality?: string;
  keywords?: string;
  general?: string;
  strengths?: string;
  challenges?: string;
  dharma?: string;
  career?: string;
  health?: string;
  relationships?: string;
}

interface RasiCell {
  bhava: number;
  rasi_name_ru: string;
  rasi_glyph: string;
  grahas: string[];
  is_lagna: boolean;
}

interface JyotishResult {
  meta: { ayanamsha_lahiri: number; date: string; time: string; lat: number; lon: number; utc: number };
  lagna: LagnaInfo;
  grahas: Record<string, GrahaData>;
  dashas: Dasha[];
  current_dasha: Dasha | null;
  current_antar: AntarDasha | null;
  yogas: Yoga[];
  rasi_chart: Record<string, RasiCell>;
  sav: number[];
  navamsha_rasi: number;
  navamsha_rasi_name_ru: string;
  summary: {
    lagna_summary: string;
    current_dasha_summary: string;
    current_antar_summary: string;
    strong_grahas: string[];
    weak_grahas: string[];
    yoga_count: number;
    top_yogas: string[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function hasMinimalJyotishContract(v: unknown): v is JyotishResult {
  if (!isObj(v)) return false;

  const meta = v.meta;
  const lagna = v.lagna;
  const grahas = v.grahas;
  const dashas = v.dashas;
  const yogas = v.yogas;
  const sav = v.sav;
  const summary = v.summary;

  if (!isObj(meta) || !isObj(lagna) || !isObj(grahas) || !isObj(summary)) return false;
  if (!Array.isArray(dashas) || !Array.isArray(yogas) || !Array.isArray(sav)) return false;

  const requiredGrahas = ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu'];
  const grahaKeys = Object.keys(grahas);
  return requiredGrahas.every(g => grahaKeys.includes(g));
}

const DIGNITY_COLORS: Record<string, string> = {
  uccha:        'text-amber-300',
  neecha:       'text-red-400',
  moolatrikona: 'text-sky-300',
  sva:          'text-emerald-400',
  neutral:      'text-slate-400',
};

const YOGA_TYPE_COLORS: Record<string, string> = {
  mahapurusha: 'bg-violet-900/60 border-violet-500/40',
  rajyoga:     'bg-amber-900/60 border-amber-500/40',
  dhana:       'bg-emerald-900/60 border-emerald-500/40',
  auspicious:  'bg-sky-900/60 border-sky-500/40',
  mixed:       'bg-orange-900/60 border-orange-500/40',
  challenging: 'bg-red-900/60 border-red-500/40',
};

const YOGA_STRENGTH_LABELS: Record<string, string> = {
  strong:   'Сильная',
  moderate: 'Умеренная',
  weak:     'Слабая',
};

const GRAHA_COLORS: Record<string, string> = {
  sun:     'text-amber-300',
  moon:    'text-slate-200',
  mars:    'text-red-400',
  mercury: 'text-emerald-400',
  jupiter: 'text-yellow-300',
  venus:   'text-pink-300',
  saturn:  'text-blue-300',
  rahu:    'text-violet-300',
  ketu:    'text-orange-300',
};

function StrengthDots({ val }: { val: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= val ? 'bg-amber-400' : 'bg-slate-600'}`} />
      ))}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-violet-300 uppercase tracking-widest mb-3">{children}</h3>;
}

// ─── Rasi Chart Grid ──────────────────────────────────────────────────────────

function RasiChartGrid({ rasiChart, grahas, lagnaRasi }: {
  rasiChart: Record<string, RasiCell>;
  grahas: Record<string, GrahaData>;
  lagnaRasi: number;
}) {
  // North Indian diamond layout (top=10, right=1, bottom=4, left=7 traditionally)
  // We use a simple 4x4 grid with rasis arranged in South Indian style
  const ORDER = [
    11, 0, 1, 2,
    10, null, null, 3,
    9, null, null, 4,
    8, 7, 6, 5,
  ];

  const getCell = (rasi: number) => rasiChart[String(rasi)];

  return (
    <div className="grid grid-cols-4 gap-0.5 aspect-square w-full max-w-xs mx-auto">
      {ORDER.map((rasi, idx) => {
        if (rasi === null) {
          return (
            <div key={`empty-${idx}`} className="bg-slate-900/30 rounded flex items-center justify-center">
              <span className="text-slate-500 text-xs">✦</span>
            </div>
          );
        }
        const cell = getCell(rasi);
        const isLagna = rasi === lagnaRasi;
        return (
          <div
            key={rasi}
            className={`relative p-1 rounded text-center min-h-[60px] border ${
              isLagna
                ? 'bg-violet-900/40 border-violet-500/50'
                : 'bg-slate-800/50 border-slate-700/30'
            }`}
          >
            <div className={`text-[9px] font-medium mb-0.5 ${isLagna ? 'text-violet-300' : 'text-slate-500'}`}>
              {cell?.bhava}H {cell?.rasi_glyph}
            </div>
            {isLagna && <div className="text-[8px] text-violet-400 font-bold">Лагна</div>}
            <div className="flex flex-wrap justify-center gap-0.5">
              {(cell?.grahas || []).map(g => (
                <span key={g} className={`text-xs font-bold ${GRAHA_COLORS[g] || 'text-slate-300'}`}>
                  {grahas[g]?.glyph}{grahas[g]?.retrograde ? '℞' : ''}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Graha Table ──────────────────────────────────────────────────────────────

function GrahaTable({ grahas, selectedGraha, onSelect }: {
  grahas: Record<string, GrahaData>;
  selectedGraha: string | null;
  onSelect: (g: string) => void;
}) {
  const order = ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 border-b border-slate-700/50">
            <th className="text-left py-1.5 pr-2">Граха</th>
            <th className="text-left py-1.5 pr-2">Раши</th>
            <th className="text-left py-1.5 pr-2">Дом</th>
            <th className="text-left py-1.5 pr-2">Накшатра</th>
            <th className="text-left py-1.5 pr-2">Пада</th>
            <th className="text-left py-1.5 pr-2">Достоинство</th>
            <th className="text-left py-1.5">Сила</th>
          </tr>
        </thead>
        <tbody>
          {order.map(key => {
            const g = grahas[key];
            if (!g) return null;
            const isSelected = selectedGraha === key;
            return (
              <tr
                key={key}
                className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                  isSelected ? 'bg-violet-900/30' : 'hover:bg-slate-800/30'
                }`}
                onClick={() => onSelect(key)}
              >
                <td className="py-1.5 pr-2">
                  <span className={`font-bold ${GRAHA_COLORS[key] || 'text-slate-300'}`}>
                    {g.glyph} {g.name_ru.split(' ')[0]}
                  </span>
                  {g.retrograde && <span className="text-red-400 text-[9px] ml-1">℞</span>}
                </td>
                <td className="py-1.5 pr-2 text-slate-300">
                  {g.rasi_glyph} {g.deg_in_rasi.toFixed(1)}°
                </td>
                <td className="py-1.5 pr-2 text-slate-400">{g.bhava}</td>
                <td className="py-1.5 pr-2 text-slate-300">{g.nakshatra_ru}</td>
                <td className="py-1.5 pr-2 text-slate-400">{g.pada}</td>
                <td className={`py-1.5 pr-2 ${DIGNITY_COLORS[g.dignity] || 'text-slate-400'}`}>
                  {g.dignity === 'uccha' ? 'Уча' :
                   g.dignity === 'neecha' ? 'Нича' :
                   g.dignity === 'moolatrikona' ? 'Мула' :
                   g.dignity === 'sva' ? 'Сва' : '—'}
                </td>
                <td className="py-1.5"><StrengthDots val={g.strength} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Graha Detail Panel ───────────────────────────────────────────────────────

function GrahaDetail({ g }: { g: GrahaData }) {
  return (
    <div className="mt-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/40 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xl font-bold ${GRAHA_COLORS[g.key] || 'text-slate-300'}`}>{g.glyph}</span>
        <span className="text-sm font-semibold text-white">{g.name_ru}</span>
        {g.retrograde && <span className="text-xs text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">℞ Ретро</span>}
        <span className={`text-xs px-1.5 py-0.5 rounded bg-slate-700/50 ${DIGNITY_COLORS[g.dignity]}`}>
          {g.dignity_ru.split(' ')[0]}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div><span className="text-slate-500">Раши:</span> <span className="text-slate-200">{g.rasi_glyph} {g.rasi_name_ru} {g.deg_in_rasi.toFixed(2)}°</span></div>
        <div><span className="text-slate-500">Бхава:</span> <span className="text-slate-200">{g.bhava_name}</span></div>
        <div><span className="text-slate-500">Накшатра:</span> <span className="text-slate-200">{g.nakshatra_ru} (Пада {g.pada})</span></div>
        <div><span className="text-slate-500">Сила:</span> <StrengthDots val={g.strength} /></div>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">{g.interpretation}</p>
      <p className="text-xs text-slate-400 leading-relaxed italic">{g.general_meaning}</p>
    </div>
  );
}

// ─── Nakshatra Tab ────────────────────────────────────────────────────────────

function NakshatraTab({ grahas }: { grahas: Record<string, GrahaData> }) {
  const order = ['moon','sun','mars','mercury','jupiter','venus','saturn','rahu','ketu'];
  const moonNak = grahas['moon'];

  return (
    <div className="space-y-4">
      {moonNak && (
        <div className="p-3 bg-slate-800/40 rounded-lg border border-sky-700/40">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sky-300 text-lg">☽</span>
            <span className="text-sm font-semibold text-sky-200">Джанма Накшатра (Накшатра рождения)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div><span className="text-slate-500">Накшатра:</span> <span className="font-semibold text-white">{moonNak.nakshatra_ru}</span> ({moonNak.nakshatra_en})</div>
            <div><span className="text-slate-500">Пада:</span> <span className="text-white">{moonNak.pada}</span></div>
            <div><span className="text-slate-500">Господин накшатры:</span> <span className="text-white">{moonNak.nakshatra_lord}</span></div>
            <div><span className="text-slate-500">Раши Луны:</span> <span className="text-white">{moonNak.rasi_glyph} {moonNak.rasi_name_ru}</span></div>
          </div>
          <p className="text-xs text-slate-300">
            Джанма накшатра определяет вашу эмоциональную природу, инстинктивные реакции и связь с матерью. 
            Накшатра Луны является основой для расчёта Вимшоттари Даша — системы предсказательных периодов.
          </p>
        </div>
      )}

      <SectionTitle>Накшатры всех граха</SectionTitle>
      <div className="space-y-2">
        {order.map(key => {
          const g = grahas[key];
          if (!g) return null;
          return (
            <div key={key} className="flex items-start gap-3 p-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <span className={`text-base font-bold w-6 text-center flex-shrink-0 ${GRAHA_COLORS[key]}`}>{g.glyph}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-white">{g.name_ru.split(' ')[0]}</span>
                  <span className="text-xs text-violet-300">{g.nakshatra_ru}</span>
                  <span className="text-xs text-slate-500">Пада {g.pada}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Господин: <span className="text-slate-300">{g.nakshatra_lord}</span> · 
                  Позиция: <span className="text-slate-300">{g.rasi_glyph} {g.deg_in_rasi.toFixed(2)}°</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-slate-300 font-medium">О накшатрах:</span> 27 лунных домов (накшатра) — 
          сидерический зодиак Джйотиш. Каждая накшатра охватывает 13°20' и имеет своего управляющего господина, 
          дейти (божество), символ и качество. Пада (четверть) указывает на навамша-знак, 
          который уточняет интерпретацию. Накшатра Луны особенно важна для Вимшоттари Даша.
        </p>
      </div>
    </div>
  );
}

// ─── Dasha Tab ────────────────────────────────────────────────────────────────

function DashaTab({ dashas, currentDasha, currentAntar }: {
  dashas: Dasha[];
  currentDasha: Dasha | null;
  currentAntar: AntarDasha | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(currentDasha?.lord || null);

  return (
    <div className="space-y-4">
      {currentDasha && (
        <div className="p-3 bg-violet-900/30 rounded-lg border border-violet-500/40">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-violet-300 text-sm font-semibold">▶ Текущая Маха Даша</span>
            <span className={`text-sm font-bold ${GRAHA_COLORS[currentDasha.lord]}`}>
              {currentDasha.lord_glyph} {currentDasha.lord_ru}
            </span>
          </div>
          <div className="text-xs text-slate-400 mb-2">
            {currentDasha.start} — {currentDasha.end}
          </div>
          {currentAntar && (
            <div className="flex items-center gap-2 mb-2 text-xs">
              <span className="text-slate-400">Антардаша:</span>
              <span className={`font-semibold ${GRAHA_COLORS[currentAntar.lord]}`}>
                {currentAntar.lord_glyph} {currentAntar.lord_ru}
              </span>
              <span className="text-slate-500">до {currentAntar.end}</span>
            </div>
          )}
          {currentDasha.dasha_interp && (
            <p className="text-xs text-slate-300 leading-relaxed">{currentDasha.dasha_interp}</p>
          )}
        </div>
      )}

      <SectionTitle>Вимшоттари Даша — 120-летний цикл</SectionTitle>
      <div className="space-y-1.5">
        {dashas.map(d => (
          <div key={d.lord} className={`rounded-lg border transition-all ${
            d.active
              ? 'border-violet-500/50 bg-violet-900/20'
              : 'border-slate-700/30 bg-slate-800/20'
          }`}>
            <button
              className="w-full flex items-center gap-3 p-2.5 text-left"
              onClick={() => setExpanded(expanded === d.lord ? null : d.lord)}
            >
              <span className={`text-sm font-bold ${GRAHA_COLORS[d.lord]}`}>{d.lord_glyph}</span>
              <span className={`text-xs font-semibold flex-1 ${d.active ? 'text-white' : 'text-slate-300'}`}>
                {d.lord_ru}
              </span>
              <span className="text-[10px] text-slate-500">{d.years.toFixed(1)} лет</span>
              <span className="text-[10px] text-slate-500">{d.start.slice(0,4)}–{d.end.slice(0,4)}</span>
              {d.active && <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded">СЕЙЧАС</span>}
              <span className="text-slate-500 text-xs">{expanded === d.lord ? '▲' : '▼'}</span>
            </button>

            {expanded === d.lord && (
              <div className="border-t border-slate-700/40 px-3 pb-3 pt-2">
                <div className="space-y-1 mb-3">
                  {d.antardasha.map(a => (
                    <div key={a.lord} className={`flex items-center gap-2 text-xs py-0.5 px-2 rounded ${
                      a.active ? 'bg-sky-900/30 text-sky-200' : 'text-slate-400'
                    }`}>
                      <span className={`font-bold ${GRAHA_COLORS[a.lord]}`}>{a.lord_glyph}</span>
                      <span className="flex-1">{a.lord_ru}</span>
                      <span className="text-slate-500 text-[10px]">{a.start.slice(0,7)} – {a.end.slice(0,7)}</span>
                      {a.active && <span className="text-sky-300 text-[9px]">◀</span>}
                    </div>
                  ))}
                </div>
                {d.dasha_interp && (
                  <p className="text-xs text-slate-400 leading-relaxed italic border-t border-slate-700/40 pt-2">
                    {d.dasha_interp}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Yoga Tab ─────────────────────────────────────────────────────────────────

function YogaTab({ yogas, grahas }: { yogas: Yoga[]; grahas: Record<string, GrahaData> }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (yogas.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Выраженные йоги в натальной карте не обнаружены
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 mb-3">
        Обнаружено <span className="text-violet-300 font-semibold">{yogas.length}</span> йог
      </div>
      {yogas.map((yoga, idx) => (
        <div
          key={idx}
          className={`rounded-lg border ${YOGA_TYPE_COLORS[yoga.type] || 'bg-slate-800/50 border-slate-700/40'}`}
        >
          <button
            className="w-full flex items-center gap-3 p-3 text-left"
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-white">{yoga.name_ru}</span>
                <span className="text-[10px] text-slate-400">{yoga.name_en}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  {YOGA_STRENGTH_LABELS[yoga.strength] || yoga.strength}
                </span>
                <span className="flex gap-1">
                  {yoga.grahas.map(g => (
                    <span key={g} className={`text-xs font-bold ${GRAHA_COLORS[g] || 'text-slate-300'}`}>
                      {grahas[g]?.glyph || g}
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <span className="text-slate-500 text-xs">{expandedIdx === idx ? '▲' : '▼'}</span>
          </button>
          {expandedIdx === idx && (
            <div className="border-t border-slate-700/30 px-3 pb-3 pt-2">
              <p className="text-xs text-slate-300 leading-relaxed">{yoga.interpretation}</p>
            </div>
          )}
        </div>
      ))}

      <div className="mt-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-slate-300 font-medium">О йогах:</span> Йоги — планетарные комбинации, 
          модифицирующие натальную карту. Панча Махапуруша Йоги (великие люди) — сильнейшие из них. 
          Раджайоги дают власть и признание. Дхана Йоги — богатство. 
          Все йоги активируются в Дашу/Антардашу соответствующих граха.
        </p>
      </div>
    </div>
  );
}

// ─── Ashtakavarga Tab ─────────────────────────────────────────────────────────

function AshtakavargaTab({ grahas, sav, lagnaRasi }: {
  grahas: Record<string, GrahaData>;
  sav: number[];
  lagnaRasi: number;
}) {
  const grahaOrder = ['sun','moon','mars','mercury','jupiter','venus','saturn'];
  const rasisInOrder = Array.from({length:12}, (_,i) => (lagnaRasi + i) % 12);

  return (
    <div className="space-y-4">
      <SectionTitle>Сарваштакаварга (SAV)</SectionTitle>
      <div className="grid grid-cols-12 gap-px text-center mb-2">
        {rasisInOrder.map((rasi, bhavaIdx) => {
          const score = sav[rasi] || 0;
          const strong = score >= 30;
          const weak = score <= 25;
          return (
            <div key={rasi} className={`p-1 rounded text-xs ${
              strong ? 'bg-emerald-900/50' : weak ? 'bg-red-900/40' : 'bg-slate-800/40'
            }`}>
              <div className="text-[9px] text-slate-500">{bhavaIdx+1}H</div>
              <div className={`font-bold ${strong ? 'text-emerald-300' : weak ? 'text-red-400' : 'text-slate-300'}`}>
                {score}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-slate-400 text-center mb-4">
        (28+ сильно, 25- слабо; дома отсчитываются от Лагны)
      </div>

      <SectionTitle>Бхинна Аштакаварга (BAV) по граха</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700/50">
              <th className="text-left py-1 pr-2">Граха</th>
              {rasisInOrder.map((_, i) => (
                <th key={i} className="py-1 px-0.5 text-center text-[10px]">{i+1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grahaOrder.map(key => {
              const g = grahas[key];
              if (!g) return null;
              return (
                <tr key={key} className="border-b border-slate-800/40">
                  <td className={`py-1 pr-2 font-bold ${GRAHA_COLORS[key]}`}>{g.glyph}</td>
                  {rasisInOrder.map((rasi, i) => {
                    const val = g.bav[rasi] || 0;
                    return (
                      <td key={i} className={`py-1 px-0.5 text-center ${
                        val >= 5 ? 'text-emerald-400' :
                        val <= 2 ? 'text-red-400' :
                        'text-slate-400'
                      }`}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-slate-300 font-medium">Об Аштакаварге:</span> Система оценки силы 
          транзитирующих планет через дома карты. Числа 0–8 для BAV, сумма по всем планетам — SAV. 
          Высокие значения (6-8/30+) говорят о благоприятных периодах, низкие — осложнениях. 
          Применяется вместе с расчётом Даш для прогнозирования.
        </p>
      </div>
    </div>
  );
}

// ─── Interpretation Tab ───────────────────────────────────────────────────────

function InterpretationTab({ data }: { data: JyotishResult }) {
  const { lagna, summary, grahas, yogas, current_dasha, current_antar, meta } = data;

  return (
    <div className="space-y-5">
      <div className="p-4 bg-gradient-to-br from-violet-900/40 to-slate-800/40 rounded-xl border border-violet-500/30">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{lagna.rasi_glyph}</span>
          <div>
            <div className="text-base font-bold text-white">{lagna.title}</div>
            <div className="text-xs text-violet-300">Лагна · Аяnamша Лахири {meta.ayanamsha_lahiri.toFixed(2)}°</div>
          </div>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed mb-3">{lagna.general}</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {lagna.element && <div><span className="text-slate-500">Стихия:</span> <span className="text-slate-200">{lagna.element}</span></div>}
          {lagna.quality && <div><span className="text-slate-500">Качество:</span> <span className="text-slate-200">{lagna.quality}</span></div>}
          {lagna.lord_ru && <div><span className="text-slate-500">Господин:</span> <span className="text-slate-200">{lagna.lord_ru}</span></div>}
          {lagna.keywords && <div className="col-span-2"><span className="text-slate-500">Ключевые слова:</span> <span className="text-slate-200">{lagna.keywords}</span></div>}
        </div>
      </div>

      {lagna.dharma && (
        <div className="p-3 bg-amber-900/20 rounded-lg border border-amber-700/30">
          <div className="text-xs text-amber-300 font-semibold mb-1">Дхарма (жизненное предназначение):</div>
          <p className="text-xs text-slate-300">{lagna.dharma}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {lagna.strengths && (
          <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-700/30">
            <div className="text-xs text-emerald-300 font-semibold mb-1">Сильные стороны:</div>
            <p className="text-xs text-slate-300">{lagna.strengths}</p>
          </div>
        )}
        {lagna.challenges && (
          <div className="p-3 bg-red-900/20 rounded-lg border border-red-700/30">
            <div className="text-xs text-red-300 font-semibold mb-1">Вызовы к росту:</div>
            <p className="text-xs text-slate-300">{lagna.challenges}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs">
        {lagna.career && (
          <div className="flex gap-2">
            <span className="text-slate-500 flex-shrink-0">Карьера:</span>
            <span className="text-slate-300">{lagna.career}</span>
          </div>
        )}
        {lagna.health && (
          <div className="flex gap-2">
            <span className="text-slate-500 flex-shrink-0">Здоровье:</span>
            <span className="text-slate-300">{lagna.health}</span>
          </div>
        )}
        {lagna.relationships && (
          <div className="flex gap-2">
            <span className="text-slate-500 flex-shrink-0">Отношения:</span>
            <span className="text-slate-300">{lagna.relationships}</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-700/40 pt-4">
        <SectionTitle>Текущий период Даша</SectionTitle>
        <p className="text-sm text-slate-200 leading-relaxed mb-2">{summary.current_dasha_summary}</p>
        {summary.current_antar_summary && (
          <p className="text-xs text-slate-400 leading-relaxed">{summary.current_antar_summary}</p>
        )}
      </div>

      {summary.strong_grahas.length > 0 && (
        <div className="border-t border-slate-700/40 pt-4">
          <SectionTitle>Анализ сильных и слабых граха</SectionTitle>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-emerald-400 font-medium">Сильные граха: </span>
              <span className="text-slate-300">{summary.strong_grahas.join(', ')}</span>
            </div>
            {summary.weak_grahas.length > 0 && (
              <div>
                <span className="text-red-400 font-medium">Требуют усиления: </span>
                <span className="text-slate-300">{summary.weak_grahas.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {yogas.length > 0 && (
        <div className="border-t border-slate-700/40 pt-4">
          <SectionTitle>Ключевые йоги</SectionTitle>
          <div className="space-y-2">
            {yogas.slice(0, 4).map((y, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-violet-400 flex-shrink-0 font-semibold">{y.name_ru}:</span>
                <span className="text-slate-400">{y.interpretation.slice(0, 120)}…</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-slate-300 font-medium">Техническая информация:</span>{' '}
          Карта вычислена для {meta.date} {meta.time} UTC{meta.utc >= 0 ? '+' : ''}{meta.utc}, 
          координаты {meta.lat.toFixed(3)}° с.ш. / {meta.lon.toFixed(3)}° в.д. 
          Применяется Лахири аяnamша {meta.ayanamsha_lahiri.toFixed(4)}°. 
          Домовая система — Цельный знак (Whole Sign). Навамша Лагна: {data.navamsha_rasi_name_ru}.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  birthData: BirthInput;
}

const TABS = [
  { id: 'chart',  label: 'Карта' },
  { id: 'nakshatra', label: 'Накшатры' },
  { id: 'dasha',  label: 'Даши' },
  { id: 'yoga',   label: 'Йоги' },
  { id: 'ashtak', label: 'Аштакаварга' },
  { id: 'interp', label: 'Интерпретация' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function JyotishBlock({ birthData }: Props) {
  const [tab, setTab] = useState<TabId>('chart');
  const [data, setData] = useState<JyotishResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGraha, setSelectedGraha] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getJyotish(birthData);
      if (!hasMinimalJyotishContract(result)) {
        throw new Error('Неполный ответ /jyotish: не хватает обязательных данных для рендера');
      }
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [birthData]);

  React.useEffect(() => {
    if (birthData?.date && birthData?.time != null) {
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthData?.date, birthData?.time, birthData?.lat, birthData?.lon, birthData?.utc]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <span className="animate-spin mr-2 text-lg">⟳</span>
        <span className="text-sm">Вычисление джйотиш карты…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <button
          onClick={load}
          className="text-xs bg-slate-700 text-slate-200 px-3 py-1.5 rounded hover:bg-slate-600"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!data) return null;

  if (!hasMinimalJyotishContract(data)) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400 text-sm mb-2">Неполный ответ Джйотиш. Рендер прерван для защиты от падения UI.</p>
        <button
          onClick={load}
          className="text-xs bg-slate-700 text-slate-200 px-3 py-1.5 rounded hover:bg-slate-600"
        >
          Повторить
        </button>
      </div>
    );
  }

  const lagnaRasi = data.lagna.rasi;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-all ${
              tab === t.id
                ? 'bg-violet-800/70 text-white border border-violet-500/50'
                : 'text-slate-400 border border-slate-700/30 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart Tab */}
      {tab === 'chart' && (
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-52">
              <div className="text-xs text-center text-slate-500 mb-1">Раши Чакра</div>
              <RasiChartGrid
                rasiChart={data.rasi_chart}
                grahas={data.grahas}
                lagnaRasi={lagnaRasi}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="p-3 bg-violet-900/20 rounded-lg border border-violet-500/30 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{data.lagna.rasi_glyph}</span>
                  <span className="text-sm font-bold text-white">{data.lagna.title}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {data.lagna.deg.toFixed(2)}° · Господин: {data.lagna.lord_ru}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Аяnamша Лахири: {data.meta.ayanamsha_lahiri.toFixed(4)}°
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Навамша Лагна: <span className="text-slate-300">{data.navamsha_rasi_name_ru}</span>
              </div>
            </div>
          </div>

          <GrahaTable
            grahas={data.grahas}
            selectedGraha={selectedGraha}
            onSelect={k => setSelectedGraha(selectedGraha === k ? null : k)}
          />

          {selectedGraha && data.grahas[selectedGraha] && (
            <GrahaDetail g={data.grahas[selectedGraha]} />
          )}
        </div>
      )}

      {/* Nakshatra Tab */}
      {tab === 'nakshatra' && <NakshatraTab grahas={data.grahas} />}

      {/* Dasha Tab */}
      {tab === 'dasha' && (
        <DashaTab
          dashas={data.dashas}
          currentDasha={data.current_dasha}
          currentAntar={data.current_antar}
        />
      )}

      {/* Yoga Tab */}
      {tab === 'yoga' && <YogaTab yogas={data.yogas} grahas={data.grahas} />}

      {/* Ashtakavarga Tab */}
      {tab === 'ashtak' && (
        <AshtakavargaTab
          grahas={data.grahas}
          sav={data.sav}
          lagnaRasi={lagnaRasi}
        />
      )}

      {/* Interpretation Tab */}
      {tab === 'interp' && <InterpretationTab data={data} />}
    </div>
  );
}

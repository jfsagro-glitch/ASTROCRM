import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Star, Map, Heart, Sparkles, ArrowRight, Palette, Download, Layers } from 'lucide-react';
import { getNatalChart, getSynastry, getRelocation, getHoroscope, getTarotReading } from '../services/astrologyService';
import { downloadPDF } from '../lib/pdfUtils';
import { Link } from 'react-router-dom';

const planetSymbols: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  Ascendant: 'Asc', Rising: 'Asc', Midheaven: 'MC', NorthNode: '☊', SouthNode: '☋',
  Chiron: '⚷'
};

const chartThemes = {
  cosmic: {
    name: 'Cosmic Midnight',
    container: 'bg-slate-900 text-slate-200 border-slate-700 shadow-2xl shadow-purple-900/20',
    header: 'text-purple-300',
    card: 'bg-slate-800/60 border-slate-700/50 backdrop-blur-md',
    accent: 'text-purple-400',
    text: 'text-slate-300',
    symbol: 'text-indigo-400',
    font: 'font-serif'
  },
  ethereal: {
    name: 'Ethereal Light',
    container: 'bg-stone-50 text-stone-800 border-stone-200 shadow-xl shadow-stone-200/50',
    header: 'text-amber-700',
    card: 'bg-white border-stone-100 shadow-sm',
    accent: 'text-amber-600',
    text: 'text-stone-600',
    symbol: 'text-amber-500',
    font: 'font-serif'
  },
  vintage: {
    name: 'Mystic Vintage',
    container: 'bg-[#f4ecd8] text-[#4a3b32] border-[#d4c4a8] shadow-xl shadow-[#d4c4a8]/30',
    header: 'text-[#8b5a2b]',
    card: 'bg-[#fdfbf7] border-[#e6d5b8] shadow-[inset_0_0_20px_rgba(139,90,43,0.03)]',
    accent: 'text-[#8b5a2b]',
    text: 'text-[#5c4033]',
    symbol: 'text-[#a0522d]',
    font: 'font-serif'
  },
  cyber: {
    name: 'Neon Cyber',
    container: 'bg-black text-cyan-50 border-cyan-900/50 shadow-2xl shadow-cyan-900/20',
    header: 'text-fuchsia-400',
    card: 'bg-zinc-950 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]',
    accent: 'text-cyan-400',
    text: 'text-cyan-100/70',
    symbol: 'text-fuchsia-500',
    font: 'font-mono'
  }
};

type ChartTheme = keyof typeof chartThemes;

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState<'natal' | 'synastry' | 'relocation' | 'horoscope' | 'tarot'>('natal');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [chartTheme, setChartTheme] = useState<ChartTheme>('cosmic');

  const handleNatalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const formData = new FormData(e.currentTarget);
    try {
      const data = await getNatalChart(
        formData.get('name') as string,
        formData.get('date') as string,
        formData.get('time') as string,
        formData.get('location') as string
      );
      setResult({ type: 'natal', data });
    } catch (error) {
      console.error(error);
      setResult({ type: 'error', message: 'Failed to generate reading. Please try again.' });
    }
    setLoading(false);
  };

  const handleSynastrySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const formData = new FormData(e.currentTarget);
    try {
      const data = await getSynastry(
        formData.get('name1') as string,
        formData.get('date1') as string,
        formData.get('name2') as string,
        formData.get('date2') as string
      );
      setResult({ type: 'synastry', data });
    } catch (error) {
      console.error(error);
      setResult({ type: 'error', message: 'Failed to generate reading. Please try again.' });
    }
    setLoading(false);
  };

  const handleRelocationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const formData = new FormData(e.currentTarget);
    try {
      const data = await getRelocation(
        formData.get('name') as string,
        formData.get('date') as string,
        formData.get('birthLocation') as string,
        formData.get('targetLocation') as string
      );
      setResult({ type: 'relocation', data });
    } catch (error) {
      console.error(error);
      setResult({ type: 'error', message: 'Failed to generate reading. Please try again.' });
    }
    setLoading(false);
  };

  const handleTarotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const formData = new FormData(e.currentTarget);
    try {
      const data = await getTarotReading(
        formData.get('question') as string,
        formData.get('spread') as '1-card' | '3-card'
      );
      setResult({ type: 'tarot', data });
    } catch (error) {
      console.error(error);
      setResult({ type: 'error', message: 'Failed to generate reading. Please try again.' });
    }
    setLoading(false);
  };

  const handleHoroscopeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const formData = new FormData(e.currentTarget);
    try {
      const data = await getHoroscope(
        formData.get('sign') as string,
        formData.get('timeframe') as 'daily' | 'weekly'
      );
      setResult({ type: 'horoscope', data });
    } catch (error) {
      console.error(error);
      setResult({ type: 'error', message: 'Failed to generate reading. Please try again.' });
    }
    setLoading(false);
  };

  const renderResult = () => {
    if (!result) return null;
    if (result.type === 'error') {
      return <div className="text-red-400 mt-8 text-center">{result.message}</div>;
    }

    if (result.type === 'natal') {
      const { sunSign, moonSign, risingSign, placements, reading } = result.data;
      const t = chartThemes[chartTheme];
      
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-8">
          
          {/* Theme Switcher */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {Object.entries(chartThemes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setChartTheme(key as ChartTheme)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center ${
                  chartTheme === key 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Palette className="w-3 h-3 mr-2" />
                {theme.name}
              </button>
            ))}
          </div>

          <div className={`p-8 md:p-12 rounded-[2.5rem] border transition-all duration-500 ${t.container}`}>
            <div className="text-center mb-12">
              <h2 className={`text-3xl md:text-5xl ${t.font} ${t.header} mb-4`}>Natal Chart</h2>
              <div className={`h-px w-24 mx-auto ${t.card} border-t`}></div>
            </div>

            {/* Big 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className={`p-6 rounded-2xl border text-center ${t.card}`}>
                <div className={`text-4xl mb-3 ${t.symbol}`}>☉</div>
                <h3 className={`text-sm uppercase tracking-widest mb-1 ${t.text} opacity-70`}>Sun</h3>
                <p className={`text-2xl ${t.font} ${t.accent}`}>{sunSign}</p>
              </div>
              <div className={`p-6 rounded-2xl border text-center ${t.card}`}>
                <div className={`text-4xl mb-3 ${t.symbol}`}>☽</div>
                <h3 className={`text-sm uppercase tracking-widest mb-1 ${t.text} opacity-70`}>Moon</h3>
                <p className={`text-2xl ${t.font} ${t.accent}`}>{moonSign}</p>
              </div>
              <div className={`p-6 rounded-2xl border text-center ${t.card}`}>
                <div className={`text-4xl mb-3 ${t.symbol}`}>Asc</div>
                <h3 className={`text-sm uppercase tracking-widest mb-1 ${t.text} opacity-70`}>Rising</h3>
                <p className={`text-2xl ${t.font} ${t.accent}`}>{risingSign}</p>
              </div>
            </div>
            
            {/* Placements Grid */}
            <div className="mb-12">
              <h3 className={`text-xl ${t.font} ${t.header} mb-6 text-center`}>Planetary Placements</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {placements?.map((p: any, i: number) => {
                  const symbol = Object.entries(planetSymbols).find(([key]) => p.planet.toLowerCase().includes(key.toLowerCase()))?.[1] || '✨';
                  return (
                    <div key={i} className={`p-5 rounded-2xl border flex items-start space-x-4 ${t.card}`}>
                      <div className={`text-3xl ${t.symbol}`}>{symbol}</div>
                      <div>
                        <h4 className={`font-medium ${t.accent}`}>{p.planet} in {p.sign}</h4>
                        <p className={`text-xs uppercase tracking-wider mt-1 ${t.text} opacity-70`}>{p.house ? `House ${p.house}` : 'Placement'}</p>
                        <p className={`text-sm mt-2 ${t.text} leading-relaxed`}>{p.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reading */}
            <div className={`p-8 md:p-10 rounded-3xl border ${t.card}`}>
              <h3 className={`text-2xl ${t.font} ${t.header} mb-6 text-center flex items-center justify-center`}>
                <Sparkles className="w-6 h-6 mr-3" /> Cosmic Blueprint
              </h3>
              <p className={`leading-loose whitespace-pre-wrap ${t.text} text-lg`}>{reading}</p>
            </div>
          </div>
        </motion.div>
      );
    }

    if (result.type === 'synastry') {
      const { score, strengths, challenges, reading } = result.data;
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-pink-500/30 bg-pink-500/10 mb-4">
              <span className="text-4xl font-serif text-pink-300">{score}%</span>
            </div>
            <h3 className="text-xl font-medium text-slate-200">Cosmic Compatibility</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-emerald-500/20">
              <h4 className="text-emerald-400 font-medium mb-4 flex items-center"><Heart className="w-4 h-4 mr-2" /> Strengths</h4>
              <ul className="space-y-2">
                {strengths?.map((s: string, i: number) => <li key={i} className="text-slate-300 text-sm flex items-start"><span className="text-emerald-500 mr-2">•</span>{s}</li>)}
              </ul>
            </div>
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-rose-500/20">
              <h4 className="text-rose-400 font-medium mb-4 flex items-center"><Star className="w-4 h-4 mr-2" /> Challenges</h4>
              <ul className="space-y-2">
                {challenges?.map((s: string, i: number) => <li key={i} className="text-slate-300 text-sm flex items-start"><span className="text-rose-500 mr-2">•</span>{s}</li>)}
              </ul>
            </div>
          </div>

          <div className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-md">
            <h3 className="text-xl font-serif text-pink-300 mb-4">Relationship Reading</h3>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{reading}</p>
          </div>
        </motion.div>
      );
    }

    if (result.type === 'relocation') {
      const { cityVibe, careerImpact, loveImpact, reading } = result.data;
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
              <h3 className="text-indigo-400 font-medium mb-2">City Vibe</h3>
              <p className="text-slate-300 text-sm">{cityVibe}</p>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
              <h3 className="text-emerald-400 font-medium mb-2">Career Impact</h3>
              <p className="text-slate-300 text-sm">{careerImpact}</p>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
              <h3 className="text-pink-400 font-medium mb-2">Love & Social</h3>
              <p className="text-slate-300 text-sm">{loveImpact}</p>
            </div>
          </div>
          <div className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-md">
            <h3 className="text-xl font-serif text-indigo-300 mb-4">Astrocartography Reading</h3>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{reading}</p>
          </div>
        </motion.div>
      );
    }

    if (result.type === 'tarot') {
      const { cards, reading } = result.data;
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards?.map((c: any, i: number) => (
              <div key={i} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 text-center">
                <h3 className="text-indigo-400 text-sm uppercase tracking-wider mb-2">{c.position}</h3>
                <div className="w-24 h-36 mx-auto bg-slate-900 border border-slate-700 rounded-xl mb-4 flex items-center justify-center shadow-lg">
                  <Layers className={`w-8 h-8 ${c.orientation === 'Reversed' ? 'text-rose-400 rotate-180' : 'text-emerald-400'}`} />
                </div>
                <p className="text-lg font-serif text-slate-200">{c.name}</p>
                <p className="text-xs text-slate-400 mb-3">{c.orientation}</p>
                <p className="text-sm text-slate-300">{c.meaning}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-md">
            <h3 className="text-xl font-serif text-purple-300 mb-4">Tarot Reading</h3>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{reading}</p>
          </div>
        </motion.div>
      );
    }

    if (result.type === 'horoscope') {
      const { general, love, career, luckyColor, luckyNumber } = result.data;
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-6">
          <div className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-md">
            <h3 className="text-xl font-serif text-purple-300 mb-4">General Outlook</h3>
            <p className="text-slate-300 leading-relaxed">{general}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/30">
              <h4 className="text-pink-400 font-medium mb-2">Love & Relationships</h4>
              <p className="text-slate-300 text-sm">{love}</p>
            </div>
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/30">
              <h4 className="text-emerald-400 font-medium mb-2">Career & Money</h4>
              <p className="text-slate-300 text-sm">{career}</p>
            </div>
          </div>
          <div className="flex justify-center space-x-8 mt-4">
            <div className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Lucky Color</p>
              <p className="text-lg font-medium text-slate-200 mt-1">{luckyColor}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wider">Lucky Number</p>
              <p className="text-lg font-medium text-slate-200 mt-1">{luckyNumber}</p>
            </div>
          </div>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative overflow-hidden">
      {/* Starry Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[150px]"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <header className="text-center mb-16">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-6" />
            <h1 className="text-4xl md:text-6xl font-serif font-medium tracking-tight text-white mb-4">
              Cosmic Insights
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Discover your astrological blueprint, explore relationship compatibility, and find your place in the universe.
            </p>
          </motion.div>
        </header>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {[
            { id: 'natal', label: 'Natal Chart', icon: Sun },
            { id: 'synastry', label: 'Synastry', icon: Heart },
            { id: 'relocation', label: 'Relocation', icon: Map },
            { id: 'horoscope', label: 'Horoscope', icon: Star },
            { id: 'tarot', label: 'Tarot', icon: Layers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setResult(null); }}
              className={`flex items-center px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          {activeTab === 'natal' && (
            <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleNatalSubmit} className="space-y-4 bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                  <input required name="name" type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all" placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Birth Date</label>
                  <input required name="date" type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Birth Time</label>
                  <input required name="time" type="time" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Birth Location</label>
                  <input required name="location" type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all" placeholder="City, Country" />
                </div>
              </div>
              <button disabled={loading} className="w-full mt-6 bg-purple-600 hover:bg-purple-500 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50">
                {loading ? 'Consulting the Stars...' : 'Generate Natal Chart'} <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </motion.form>
          )}

          {activeTab === 'synastry' && (
            <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSynastrySubmit} className="space-y-6 bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-300 border-b border-slate-800 pb-2">Person 1</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required name="name1" type="text" placeholder="Name" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-pink-500/50 outline-none" />
                  <input required name="date1" type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-pink-500/50 outline-none" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-300 border-b border-slate-800 pb-2">Person 2</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required name="name2" type="text" placeholder="Name" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-pink-500/50 outline-none" />
                  <input required name="date2" type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-pink-500/50 outline-none" />
                </div>
              </div>
              <button disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50">
                {loading ? 'Analyzing Compatibility...' : 'Check Compatibility'} <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </motion.form>
          )}

          {activeTab === 'relocation' && (
            <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleRelocationSubmit} className="space-y-4 bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                  <input required name="name" type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Birth Date</label>
                  <input required name="date" type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Birth Location</label>
                  <input required name="birthLocation" type="text" placeholder="City, Country" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Target Location</label>
                  <input required name="targetLocation" type="text" placeholder="City to move to" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none" />
                </div>
              </div>
              <button disabled={loading} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50">
                {loading ? 'Mapping the Stars...' : 'Analyze Relocation'} <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </motion.form>
          )}

          {activeTab === 'horoscope' && (
            <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleHoroscopeSubmit} className="space-y-4 bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Zodiac Sign</label>
                  <select required name="sign" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500/50 outline-none">
                    {['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Timeframe</label>
                  <select required name="timeframe" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500/50 outline-none">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <button disabled={loading} className="w-full mt-6 bg-purple-600 hover:bg-purple-500 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50">
                {loading ? 'Reading the Stars...' : 'Get Horoscope'} <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </motion.form>
          )}
          {activeTab === 'tarot' && (
            <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleTarotSubmit} className="space-y-4 bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Your Question or Focus</label>
                <input required name="question" type="text" placeholder="What should I focus on today?" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Spread Type</label>
                <select required name="spread" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500/50 outline-none">
                  <option value="1-card">1 Card (Quick Insight)</option>
                  <option value="3-card">3 Cards (Past, Present, Future)</option>
                </select>
              </div>
              <button disabled={loading} className="w-full mt-6 bg-purple-600 hover:bg-purple-500 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50">
                {loading ? 'Drawing Cards...' : 'Draw Cards'} <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </motion.form>
          )}
        </div>

        {loading && (
          <div className="mt-12 flex flex-col items-center justify-center text-purple-400">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <p className="animate-pulse">Consulting the cosmos...</p>
          </div>
        )}

        {result && result.type !== 'error' && (
          <div className="mt-8 flex justify-center md:justify-end">
            <button
              onClick={() => downloadPDF('astrology-result', `${result.type}-reading.pdf`, true)}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors border border-slate-700 shadow-lg"
            >
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </button>
          </div>
        )}

        <div id="astrology-result" className="pb-8 pt-4">
          {renderResult()}
        </div>

      </div>

      <footer className="relative z-10 border-t border-slate-800/50 mt-20 py-8 text-center">
        <p className="text-slate-500 text-sm">
          © {new Date().getFullYear()} Cosmic Insights. All rights reserved.
        </p>
        <Link to="/crm" className="text-slate-600 hover:text-slate-400 text-xs mt-4 inline-block transition-colors">
          Astrologer Login
        </Link>
      </footer>
    </div>
  );
}

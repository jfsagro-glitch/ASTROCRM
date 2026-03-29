import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Star, Map, Heart, Sparkles, ArrowRight } from 'lucide-react';
import { getNatalChart, getSynastry, getRelocation, getHoroscope } from '../services/astrologyService';
import { Link } from 'react-router-dom';

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState<'natal' | 'synastry' | 'relocation' | 'horoscope'>('natal');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm text-center">
              <Sun className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-slate-400 text-sm uppercase tracking-wider">Sun Sign</h3>
              <p className="text-2xl font-serif text-slate-100 mt-1">{sunSign}</p>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm text-center">
              <Moon className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <h3 className="text-slate-400 text-sm uppercase tracking-wider">Moon Sign</h3>
              <p className="text-2xl font-serif text-slate-100 mt-1">{moonSign}</p>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm text-center">
              <Star className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-slate-400 text-sm uppercase tracking-wider">Rising Sign</h3>
              <p className="text-2xl font-serif text-slate-100 mt-1">{risingSign}</p>
            </div>
          </div>
          
          <div className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-md">
            <h3 className="text-xl font-serif text-purple-300 mb-4 flex items-center"><Sparkles className="w-5 h-5 mr-2" /> Your Cosmic Blueprint</h3>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{reading}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {placements?.map((p: any, i: number) => (
              <div key={i} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/30">
                <h4 className="text-indigo-300 font-medium">{p.planet} in {p.sign}</h4>
                <p className="text-slate-400 text-sm mt-1">{p.house ? `House ${p.house}` : ''}</p>
                <p className="text-slate-300 text-sm mt-2">{p.description}</p>
              </div>
            ))}
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
        </div>

        {loading && (
          <div className="mt-12 flex flex-col items-center justify-center text-purple-400">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <p className="animate-pulse">Consulting the cosmos...</p>
          </div>
        )}

        {renderResult()}

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

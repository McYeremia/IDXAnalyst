'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import strategyRegistry from '../../strategies_local/registry.json';

interface BacktestResult {
  strategy_id: string;
  metrics?: {
    win_rate: number;
    total_return_pct: number;
    total_trades: number;
    wins: number;
    losses: number;
  };
}

export default function BacktestPage() {
  const [results, setResults] = useState<Record<string, BacktestResult>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState('BBCA');
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runSingleTest = async (strategyId: string) => {
    setLoading(strategyId);
    try {
      const res = await api.runBacktest(selectedTicker, strategyId);
      setResults(prev => ({ ...prev, [strategyId]: res }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    for (const strat of strategyRegistry) {
      await runSingleTest(strat.id);
    }
    setIsRunningAll(false);
  };

  const validResults = Object.values(results).filter(r => r.metrics);
  const bestStrategy = validResults.length > 0 
    ? [...validResults].sort((a, b) => (b.metrics?.win_rate || 0) - (a.metrics?.win_rate || 0))[0] 
    : null;
    
  const bestStratInfo = strategyRegistry.find(s => s.id === bestStrategy?.strategy_id);

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-10 pt-24 md:pt-28">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">Quant <span className="text-blue-500">Intelligence</span></h1>
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest italic">Statistical Validation Center</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                <span className="text-[10px] font-bold text-gray-500 ml-4 uppercase tracking-widest">Asset</span>
                <input 
                  type="text" 
                  value={selectedTicker} 
                  onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 font-mono font-bold text-blue-400 w-24 focus:outline-none"
                />
             </div>
             <button 
               onClick={runAllTests}
               disabled={isRunningAll}
               className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl text-[10px] font-black tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
             >
               {isRunningAll ? 'SIMULATING ALL...' : 'RUN FULL SCAN'}
             </button>
          </div>
        </div>

        {bestStrategy && bestStrategy.metrics && (
          <div className="mb-12 p-10 rounded-[3rem] bg-gradient-to-br from-blue-600/20 to-teal-500/10 border border-blue-500/30 backdrop-blur-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <svg className="w-40 h-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
             </div>
             <div className="relative z-10">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mb-4 block">Recommended Screener Setting</span>
                <h2 className="text-4xl font-black mb-4">
                  For {selectedTicker}, Use <span className="text-blue-500">{bestStratInfo?.indicator}</span>
                </h2>
                <p className="text-gray-400 max-w-2xl text-base leading-relaxed mb-8">
                   Statistical evidence suggests that <span className="text-white font-bold">{bestStratInfo?.name}</span> is the superior model for this asset 
                   with a <span className="text-green-400 font-black">{bestStrategy.metrics.win_rate}% success rate</span>.
                </p>
                <Link href={`/stocks/${selectedTicker}`} className="inline-flex items-center gap-3 bg-white text-black px-8 py-3 rounded-2xl text-[10px] font-black tracking-widest hover:bg-blue-400 hover:text-white transition-all shadow-xl shadow-white/5 uppercase">
                   Switch to Trading Hub
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Link>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {strategyRegistry.map((strat) => {
            const res = results[strat.id];
            const isExpanded = expandedId === strat.id;
            
            return (
              <div key={strat.id} className={`rounded-3xl border transition-all duration-300 ${isExpanded ? 'bg-white/5 border-blue-500/30 ring-1 ring-blue-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}>
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">{strat.indicator}</p>
                      <h3 className="text-2xl font-black tracking-tight">{strat.name}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      {res?.metrics && (
                        <span className={`text-xl font-mono font-black ${res.metrics.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {res.metrics.win_rate}%
                        </span>
                      )}
                      <button 
                        onClick={() => setExpandedId(isExpanded ? null : strat.id)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <svg className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 leading-relaxed mb-6">{strat.description}</p>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => runSingleTest(strat.id)}
                      disabled={!!loading}
                      className="bg-white/5 hover:bg-blue-600 border border-white/10 px-6 py-2.5 rounded-xl text-[9px] font-black tracking-widest transition-all"
                    >
                      {loading === strat.id ? 'TESTING...' : 'RUN TEST'}
                    </button>
                  </div>

                  {/* EXPANDED CONTENT: RULES & LOGIC */}
                  {isExpanded && (
                    <div className="mt-8 pt-8 border-t border-white/10 animate-in fade-in slide-in-from-top-4">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Execution Rules & Intelligence</h4>
                       <div className="space-y-3">
                          {strat.rules.map((rule, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs font-mono">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></div>
                               <span className={rule.startsWith('ENTRY') ? 'text-green-400' : rule.startsWith('EXIT') ? 'text-red-400' : 'text-gray-400 italic'}>
                                 {rule}
                               </span>
                            </div>
                          ))}
                       </div>
                       
                       {res?.metrics && (
                         <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/5 pt-8">
                            <div className="text-center">
                              <p className="text-[8px] text-gray-600 font-bold uppercase mb-1">Trades</p>
                              <p className="text-sm font-bold font-mono">{res.metrics.total_trades}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[8px] text-gray-600 font-bold uppercase mb-1">Return</p>
                              <p className={`text-sm font-bold font-mono ${res.metrics.total_return_pct >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                {res.metrics.total_return_pct}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[8px] text-gray-600 font-bold uppercase mb-1">Win/Loss</p>
                              <p className="text-sm font-bold font-mono text-gray-400">{res.metrics.wins}/{res.metrics.losses}</p>
                            </div>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

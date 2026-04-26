'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import strategyRegistry from '../../strategies_local/registry.json';

export default function ScreenerPage() {
  const [selectedStratId, setSelectedStratId] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});

  // Fungsi untuk mengambil live count untuk setiap strategi di dashboard overview
  useEffect(() => {
    if (!selectedStratId) {
      // Kita bisa buat endpoint bulk count nanti, untuk sekarang kita load satu per satu secara ringan
      // (Optimasi: Hanya ambil 3 strategi pertama untuk demo cepat)
    }
  }, [selectedStratId]);

  const runScreener = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.screenStocks(id);
      setMatches(res.matches || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStratId) {
      runScreener(selectedStratId);
    }
  }, [selectedStratId]);

  const activeStrat = strategyRegistry.find(s => s.id === selectedStratId);

  // VIEW 1: SCREENER DASHBOARD (OVERVIEW)
  if (!selectedStratId) {
    return (
      <main className="min-h-screen bg-[#050505] text-white p-6 md:p-10 pt-24 md:pt-28">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-black tracking-tighter mb-2">Strategy <span className="text-blue-500">Screener</span></h1>
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.4em]">Select an algorithm to scan the market</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategyRegistry.map((strat) => (
              <button 
                key={strat.id} 
                onClick={() => setSelectedStratId(strat.id)}
                className="group p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-blue-500/40 hover:bg-white/[0.04] transition-all text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
                   <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{strat.indicator}</span>
                <h3 className="text-2xl font-black mt-2 mb-4 group-hover:text-blue-400 transition-colors">{strat.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-6">{strat.description}</p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                   START SCANNING →
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // VIEW 2: STRATEGY DETAIL (CONTEXT-AWARE TABLE)
  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-10 pt-24 md:pt-28">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          <div className="flex items-center gap-6">
             <button onClick={() => setSelectedStratId(null)} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
             </button>
             <div>
                <h1 className="text-3xl font-black tracking-tighter mb-1 text-blue-500">{activeStrat?.name}</h1>
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">Real-time Scanner: {matches.length} Assets Found</p>
             </div>
          </div>

          <div className="p-1 bg-white/5 rounded-2xl border border-white/10 hidden md:flex">
             <select 
               value={selectedStratId} 
               onChange={(e) => setSelectedStratId(e.target.value)}
               className="bg-transparent text-white px-6 py-2 text-[10px] font-black tracking-widest uppercase focus:outline-none cursor-pointer"
             >
               {strategyRegistry.map(s => (
                 <option key={s.id} value={s.id} className="bg-black">{s.name}</option>
               ))}
             </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-1 space-y-6">
              <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 shadow-xl">
                 <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Execution Logic</h3>
                 <div className="space-y-4">
                    {activeStrat?.rules?.map((rule: string, i: number) => (
                      <div key={i} className="flex gap-3 items-start">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 mt-1"></div>
                         <span className={`text-[10px] font-mono leading-tight ${rule.startsWith('ENTRY') ? 'text-green-400' : 'text-gray-500'}`}>{rule}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="lg:col-span-3">
              <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md relative shadow-2xl">
                 {loading && (
                   <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-4">
                         <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-[9px] font-black tracking-widest text-blue-500 uppercase">Scanning 400+ Assets...</p>
                      </div>
                   </div>
                 )}
                 
                 <div className="overflow-x-auto">
                    <table className="min-w-full">
                       <thead>
                          <tr className="border-b border-white/5 text-[9px] font-black text-gray-600 uppercase tracking-[0.4em]">
                             <th className="px-10 py-8 text-left">Instrument</th>
                             {/* DYNAMIC COLUMNS BASED ON STRATEGY */}
                             {activeStrat?.display_columns.map(col => (
                               <th key={col} className="px-10 py-8 text-left">{col.replace('_', ' ')}</th>
                             ))}
                             <th className="px-10 py-8 text-right">Terminal</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 font-mono">
                          {matches.length === 0 ? (
                            <tr>
                               <td colSpan={10} className="px-10 py-32 text-center text-gray-700 italic text-sm">
                                  No assets currently meet this criteria. Market is neutral.
                               </td>
                            </tr>
                          ) : (
                            matches.map((m) => (
                              <tr key={m.ticker} className="group hover:bg-white/[0.02] transition-all">
                                 <td className="px-10 py-6 whitespace-nowrap">
                                    <span className="text-base font-black text-white group-hover:text-blue-400 transition-colors block">{m.ticker}</span>
                                    <span className="text-[8px] text-gray-600 uppercase truncate w-32 block mt-1">{m.name}</span>
                                 </td>
                                 
                                 {/* RENDER DYNAMIC VALUES */}
                                 {activeStrat?.display_columns.map(col => (
                                   <td key={col} className="px-10 py-6 whitespace-nowrap">
                                      <span className={`text-xs font-bold ${
                                        typeof m[col] === 'number' && m[col] > 0 ? 'text-blue-400' : 
                                        typeof m[col] === 'number' && m[col] < 0 ? 'text-red-400' : 'text-gray-300'
                                      }`}>
                                        {typeof m[col] === 'number' ? m[col].toLocaleString('id-ID', { maximumFractionDigits: 2 }) : m[col]}
                                        {col.includes('Dist') || col.includes('Surge') ? '%' : ''}
                                      </span>
                                   </td>
                                 ))}

                                 <td className="px-10 py-6 text-right">
                                    <Link href={`/stocks/${m.ticker}`} className="inline-block bg-white/5 hover:bg-blue-600 border border-white/10 px-6 py-2 rounded-xl text-[8px] font-black tracking-widest transition-all">
                                       TRADE
                                    </Link>
                                 </td>
                              </tr>
                            ))
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </main>
  );
}

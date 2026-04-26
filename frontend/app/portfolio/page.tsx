'use client';

import { useEffect, useState } from 'react';
import { api, MultiPortfolioResponse, PortfolioItem, EquityPoint } from '@/lib/api';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const EquityChart = dynamic(() => import("@/components/StockChart"), { ssr: false });

type PortfolioTab = 'USER' | 'GEMINI' | 'CLAUDE';

export default function PortfolioPage() {
  const [data, setData] = useState<MultiPortfolioResponse>({ 
    summary: { USER: [], GEMINI: [], CLAUDE: [] }, 
    history: { USER: [], GEMINI: [], CLAUDE: [] } 
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PortfolioTab>('USER');

  useEffect(() => {
    api.getPortfolio()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const currentSummary = data.summary[activeTab] || [];
  const currentHistory = data.history[activeTab] || [];
  
  const totalUnrealized = currentSummary.reduce((sum, item) => sum + (item.unrealized_pnl || 0), 0);
  const totalRealized = currentSummary.reduce((sum, item) => sum + (item.realized_pnl || 0), 0);
  const totalCapitalUsed = currentSummary.reduce((sum, item) => sum + (item.shares > 0 ? (item.cost_basis || 0) : 0), 0);

  const getTabStyle = (tab: PortfolioTab) => {
    const isActive = activeTab === tab;
    const base = "px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ";
    if (!isActive) return base + "text-gray-500 hover:text-white";
    
    if (tab === 'USER') return base + "bg-blue-600 text-white shadow-lg shadow-blue-600/20";
    if (tab === 'GEMINI') return base + "bg-teal-600 text-white shadow-lg shadow-teal-600/20";
    if (tab === 'CLAUDE') return base + "bg-purple-600 text-white shadow-lg shadow-purple-600/20";
    return base;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center animate-pulse text-blue-500 font-mono tracking-widest uppercase text-xs">
      Syncing Capital Records...
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-10 pt-24 md:pt-28 text-left">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2 text-white italic">Portfolio <span className="text-blue-500">Dynamics</span></h1>
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest leading-loose">Comparing Execution Accuracy & Capital Deployment</p>
          </div>
          
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 overflow-x-auto max-w-full shadow-inner">
            <button onClick={() => setActiveTab('USER')} className={getTabStyle('USER')}>USER STRATEGY</button>
            <button onClick={() => setActiveTab('GEMINI')} className={getTabStyle('GEMINI')}>GEMINI CORE</button>
            <button onClick={() => setActiveTab('CLAUDE')} className={getTabStyle('CLAUDE')}>CLAUDE CORE</button>
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group shadow-xl">
             <p className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-2">Deployed Capital</p>
             <p className="text-3xl font-black font-mono text-white">Rp {(totalCapitalUsed || 0).toLocaleString('id-ID')}</p>
             <div className="mt-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">Active Market Exposure</span>
             </div>
          </div>
          <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group shadow-xl">
             <p className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-2">Unrealized Performance</p>
             <p className={`text-3xl font-black font-mono ${(totalUnrealized || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
               {(totalUnrealized || 0) >= 0 ? '+' : ''}Rp {(totalUnrealized || 0).toLocaleString('id-ID')}
             </p>
             {totalCapitalUsed > 0 && (
               <p className={`text-[10px] font-black mt-4 ${(totalUnrealized || 0) >= 0 ? 'text-green-500/50' : 'text-red-500/50'} tracking-widest`}>
                 {((totalUnrealized / totalCapitalUsed) * 100).toFixed(2)}% ROI
               </p>
             )}
          </div>
          <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group shadow-xl">
             <p className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-2">Booked Profit/Loss</p>
             <p className={`text-3xl font-black font-mono ${(totalRealized || 0) >= 0 ? 'text-white' : 'text-red-400'}`}>
               {(totalRealized || 0) >= 0 ? '+' : ''}Rp {(totalRealized || 0).toLocaleString('id-ID')}
             </p>
          </div>
        </div>

        {/* ASSETS TABLE */}
        <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl mb-20">
          <table className="min-w-full text-left font-mono">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black text-gray-700 uppercase tracking-[0.4em] bg-white/[0.02]">
                <th className="px-10 py-10">Instrument</th>
                <th className="px-10 py-10 text-center">Capital</th>
                <th className="px-10 py-10 text-center">Avg Cost</th>
                <th className="px-10 py-10 text-center">Current</th>
                <th className="px-10 py-10 text-center">P&L Status</th>
                <th className="px-10 py-10 text-right">Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentSummary.filter(p => p.shares > 0).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-10 py-32 text-center text-gray-700 italic text-[10px] uppercase tracking-widest font-black opacity-30">
                    No active positions currently tracked for {activeTab}
                  </td>
                </tr>
              ) : (
                currentSummary.filter(p => p.shares > 0).map((item) => (
                  <tr key={item.ticker} className="group hover:bg-white/[0.02] transition-all">
                    <td className="px-10 py-8 whitespace-nowrap">
                       <span className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors block leading-none">{item.ticker}</span>
                       <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest mt-2 block">{item.shares / 100} LOTS</span>
                    </td>
                    <td className="px-10 py-8 text-center text-sm font-black text-blue-500/60 italic">
                       Rp {(item.cost_basis || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-10 py-8 text-center text-sm font-bold text-gray-600">
                       Rp {(item.avg_buy_price || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-10 py-8 text-center text-sm font-bold text-gray-300">
                       Rp {(item.current_price || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-10 py-8 text-center">
                       <span className={`text-sm font-black ${(item.unrealized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                          {(item.unrealized_pnl || 0) >= 0 ? '▲' : '▼'} Rp {Math.abs(item.unrealized_pnl || 0).toLocaleString('id-ID')}
                       </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <Link href={`/stocks/${item.ticker}`} className="inline-block bg-white/5 border border-white/10 px-6 py-2.5 rounded-xl text-[9px] font-black tracking-widest hover:bg-blue-600 hover:text-white transition-all uppercase shadow-lg">Open</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

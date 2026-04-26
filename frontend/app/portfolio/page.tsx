'use client';

import { useEffect, useState } from 'react';
import { api, MultiPortfolio, PortfolioItem } from '@/lib/api';
import Link from 'next/link';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<MultiPortfolio>({ MANUAL: [], AUTO: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'AUTO'>('MANUAL');

  useEffect(() => {
    api.getPortfolio()
      .then(setPortfolio)
      .finally(() => setLoading(false));
  }, []);

  const currentData = activeTab === 'MANUAL' ? portfolio.MANUAL : portfolio.AUTO;
  
  const totalUnrealized = currentData.reduce((sum, item) => sum + item.unrealized_pnl, 0);
  const totalRealized = currentData.reduce((sum, item) => sum + item.realized_pnl, 0);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-10 pt-24 md:pt-28">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">Strategy <span className="text-blue-500">Analytics</span></h1>
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">Compare Performance: User vs AI</p>
          </div>
          
          {/* Strategy Toggle */}
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
            <button 
              onClick={() => setActiveTab('MANUAL')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'MANUAL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'}`}
            >
              USER STRATEGY
            </button>
            <button 
              onClick={() => setActiveTab('AUTO')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === 'AUTO' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20' : 'text-gray-500 hover:text-white'}`}
            >
              AI INTELLIGENCE
            </button>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className={`p-8 rounded-3xl border relative overflow-hidden transition-all ${activeTab === 'MANUAL' ? 'bg-blue-600/5 border-blue-500/20' : 'bg-teal-600/5 border-teal-500/20'}`}>
            <p className="text-gray-500 text-[9px] font-mono uppercase tracking-[0.3em] mb-2">Portfolio Unrealized</p>
            <p className={`text-5xl font-black font-mono ${totalUnrealized >= 0 ? (activeTab === 'MANUAL' ? 'text-blue-400' : 'text-teal-400') : 'text-red-500'}`}>
              {totalUnrealized >= 0 ? '+' : ''}Rp {totalUnrealized.toLocaleString('id-ID')}
            </p>
            <div className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-10 blur-3xl rounded-full ${activeTab === 'MANUAL' ? 'bg-blue-500' : 'bg-teal-500'}`}></div>
          </div>
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
            <p className="text-gray-500 text-[9px] font-mono uppercase tracking-[0.3em] mb-2">Total Realized P&L</p>
            <p className={`text-5xl font-black font-mono ${totalRealized >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalRealized >= 0 ? '+' : ''}Rp {totalRealized.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">
                <th className="px-10 py-8 text-left">Instrument</th>
                <th className="px-10 py-8 text-left">Quantity</th>
                <th className="px-10 py-8 text-left">Avg Cost</th>
                <th className="px-10 py-8 text-left">Market</th>
                <th className="px-10 py-8 text-left">P&L Status</th>
                <th className="px-10 py-8 text-right">Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentData.filter(p => p.shares > 0).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-10 py-20 text-center text-gray-600 font-mono text-xs uppercase tracking-widest">
                    No active positions in {activeTab === 'MANUAL' ? 'User Strategy' : 'AI Intelligence'}
                  </td>
                </tr>
              ) : (
                currentData.filter(p => p.shares > 0).map((item) => (
                  <tr key={item.ticker} className="group hover:bg-white/[0.02] transition-all">
                    <td className="px-10 py-8 whitespace-nowrap">
                      <span className="text-xl font-black text-white group-hover:text-blue-400 transition-colors">{item.ticker}</span>
                    </td>
                    <td className="px-10 py-8 whitespace-nowrap font-mono text-sm text-gray-400">
                      {item.shares / 100} LOTS
                    </td>
                    <td className="px-10 py-8 whitespace-nowrap font-mono text-sm text-gray-500">
                      Rp {item.avg_buy_price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-10 py-8 whitespace-nowrap font-mono text-sm text-gray-300">
                      Rp {item.current_price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-10 py-8 whitespace-nowrap">
                      <span className={`text-sm font-black font-mono ${item.unrealized_pnl >= 0 ? (activeTab === 'MANUAL' ? 'text-blue-400' : 'text-teal-400') : 'text-red-500'}`}>
                        {item.unrealized_pnl >= 0 ? '▲' : '▼'} Rp {Math.abs(item.unrealized_pnl).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-10 py-8 whitespace-nowrap text-right">
                      <Link href={`/stocks/${item.ticker}`} className="inline-block bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2 rounded-xl text-[9px] font-black tracking-widest transition-all">
                        OPEN
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Trade History Section for Closed Positions */}
        {currentData.filter(p => p.shares === 0).length > 0 && (
          <div className="mt-20">
            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em] mb-8">Completed Operations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
               {currentData.filter(p => p.shares === 0).map(item => (
                 <div key={item.ticker} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex justify-between items-center">
                    <span className="font-black text-gray-400">{item.ticker}</span>
                    <span className={`font-mono text-xs font-bold ${item.realized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                       {item.realized_pnl >= 0 ? '+' : ''}Rp {item.realized_pnl.toLocaleString('id-ID')}
                    </span>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

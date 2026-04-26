'use client';

import { useEffect, useState } from 'react';
import { api, Stock, PortfolioItem } from '@/lib/api';
import Link from 'next/link';

export default function Dashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    Promise.all([api.getStocks(), api.getPortfolio()])
      .then(([stocksData, portfolioData]) => {
        setStocks(stocksData);
        setPortfolio(portfolioData);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalUnrealized = portfolio.reduce((sum, item) => sum + item.unrealized_pnl, 0);
  const filteredStocks = stocks.filter(s => 
    s.ticker.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-10">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Market <span className="text-blue-500">Terminal</span></h1>
            <p className="text-gray-500 text-sm font-mono">Real-time IDX80 Analysis & Simulation</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <input 
              type="text"
              placeholder="Search ticker or name..."
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 w-full md:w-64 transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              onClick={() => api.refreshData().then(() => window.location.reload())}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 whitespace-nowrap"
            >
              Sync Data
            </button>
          </div>
        </div>
      </div>

      {/* Portfolio Summary Widgets */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="col-span-1 md:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-blue-600/20 to-teal-500/5 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-2">Portfolio Unrealized P&L</p>
          <p className={`text-4xl font-bold font-mono ${totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalUnrealized >= 0 ? '+' : ''}Rp {totalUnrealized.toLocaleString('id-ID')}
          </p>
          <Link href="/portfolio" className="mt-4 inline-block text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
            GO TO PORTFOLIO →
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Active Positions</p>
          <p className="text-3xl font-bold font-mono">{portfolio.filter(p => p.shares > 0).length}</p>
          <p className="text-gray-600 text-xs mt-1">Stocks currently held</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Market Scope</p>
          <p className="text-3xl font-bold font-mono">{stocks.length}</p>
          <p className="text-gray-600 text-xs mt-1">IDX80 Component stocks</p>
        </div>
      </div>

      {/* Stock Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-gray-400">Stock Watchlist</h2>
          <div className="flex gap-2">
             <span className="w-3 h-3 rounded-full bg-green-500/50 animate-pulse"></span>
             <span className="text-[10px] text-gray-500 font-mono">LIVE FEED ACTIVE</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredStocks.map((stock) => {
            const inPortfolio = portfolio.find(p => p.ticker === stock.ticker && p.shares > 0);
            return (
              <Link 
                key={stock.ticker} 
                href={`/stocks/${stock.ticker}`}
                className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-500/40 hover:bg-white/[0.06] transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">{stock.ticker}</h3>
                    <p className="text-[10px] text-gray-500 font-mono uppercase truncate w-32">{stock.name}</p>
                  </div>
                  {inPortfolio && (
                    <div className="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-bold uppercase tracking-tighter">
                      HOLDING
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-gray-600 text-[10px] font-mono mb-1">LAST PRICE</p>
                    <p className="text-lg font-mono font-bold">
                      {stock.last_price ? `Rp ${stock.last_price.toLocaleString('id-ID')}` : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

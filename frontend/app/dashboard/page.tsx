'use client';

import { useEffect, useState } from 'react';
import { api, Stock, MultiPortfolio, OHLCV } from '@/lib/api';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const StockChart = dynamic(() => import("@/components/StockChart"), { ssr: false });

export default function Dashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [portfolio, setPortfolio] = useState<MultiPortfolio>({ MANUAL: [], AUTO: [] });
  const [ihsgData, setIhsgData] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newTicker, setNewTicker] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const loadData = async () => {
    try {
      const [stocksData, portfolioData, ihsg] = await Promise.all([
        api.getStocks(),
        api.getPortfolio(),
        api.getOHLCV('^JKSE')
      ]);
      setStocks(stocksData);
      setPortfolio(portfolioData);
      setIhsgData(ihsg.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh otomatis setiap 10 detik untuk memantau background addition
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddStock = async () => {
    if (!newTicker) return;
    setIsAdding(true);
    try {
      await api.addStock(newTicker);
      setNewTicker('');
      loadData();
    } catch (err) {
      alert("Failed to add stock.");
    } finally {
      setIsAdding(false);
    }
  };

  const totalUnrealized = [...portfolio.MANUAL, ...portfolio.AUTO].reduce((sum, item) => sum + item.unrealized_pnl, 0);
  const filteredStocks = stocks.filter(s => s.ticker !== '^JKSE' && (s.ticker.toLowerCase().includes(searchTerm.toLowerCase()) || s.name.toLowerCase().includes(searchTerm.toLowerCase())));

  if (loading && stocks.length === 0) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  const currentIhsg = ihsgData[ihsgData.length - 1]?.close || 0;
  const prevIhsg = ihsgData[ihsgData.length - 2]?.close || 0;
  const ihsgChange = currentIhsg - prevIhsg;
  const ihsgChangePct = (ihsgChange / prevIhsg) * 100;

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-10 pt-24 md:pt-28">
      <div className="max-w-7xl mx-auto">
        
        {/* IHSG MARKET OVERVIEW SECTION */}
        <div className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-2">Market Benchmark</h2>
                    <h1 className="text-3xl font-black tracking-tighter">IHSG COMPOSITE</h1>
                 </div>
                 <div className="text-right">
                    <p className="text-2xl font-mono font-bold italic">Rp {currentIhsg.toLocaleString('id-ID')}</p>
                    <p className={`text-xs font-bold font-mono ${ihsgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                       {ihsgChange >= 0 ? '▲' : '▼'} {Math.abs(ihsgChangePct).toFixed(2)}%
                    </p>
                 </div>
              </div>
              <div className="h-64">
                 {ihsgData.length > 0 && (
                   <StockChart 
                     data={ihsgData} 
                     height={250} 
                     transparent={true} 
                   />
                 )}
              </div>
           </div>

           <div className="flex flex-col gap-6">
              <div className="flex-1 bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/20 rounded-[2rem] p-8 flex flex-col justify-center">
                 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Live Assets Tracked</p>
                 <p className="text-6xl font-black font-mono text-white">{stocks.length}</p>
                 <p className="text-[10px] text-blue-400 font-bold mt-4 uppercase tracking-[0.2em]">Sourcing from IDX & Global Market</p>
              </div>
              <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                 <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4">Quick Add Asset</p>
                 <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-xl">
                    <input 
                      type="text" 
                      value={newTicker}
                      onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                      placeholder="TICKER" 
                      className="bg-transparent px-4 py-2 text-xs font-bold focus:outline-none w-full"
                    />
                    <button onClick={handleAddStock} disabled={isAdding} className="bg-blue-600 px-4 py-2 rounded-lg text-[9px] font-black tracking-widest">
                       {isAdding ? '...' : 'ADD'}
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* STATS SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="col-span-1 md:col-span-2 p-8 rounded-3xl bg-white/[0.03] border border-white/5 relative overflow-hidden group">
            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-2">Portfolio Combined P&L</p>
            <p className={`text-4xl font-black font-mono ${totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalUnrealized >= 0 ? '+' : ''}Rp {totalUnrealized.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-center">
            <p className="text-gray-600 text-[9px] font-mono uppercase mb-1">User Strategy</p>
            <p className="text-2xl font-black font-mono">{portfolio.MANUAL.filter(p => p.shares > 0).length} <span className="text-xs text-gray-600 font-normal">Active</span></p>
          </div>
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-center text-right">
            <p className="text-gray-600 text-[9px] font-mono uppercase mb-1">AI Intelligence</p>
            <p className="text-2xl font-black font-mono text-teal-400">{portfolio.AUTO.filter(p => p.shares > 0).length} <span className="text-xs text-gray-600 font-normal">Active</span></p>
          </div>
        </div>

        {/* MARKET LIST */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
           <h2 className="text-xs font-black font-mono uppercase tracking-[0.4em] text-gray-500">Market Intelligence Terminal</h2>
           <input 
              type="text"
              placeholder="Search assets..."
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-500/50 w-full md:w-64"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
          {filteredStocks.map((stock) => {
            const hasUser = portfolio.MANUAL.some(p => p.ticker === stock.ticker && p.shares > 0);
            const hasAi = portfolio.AUTO.some(p => p.ticker === stock.ticker && p.shares > 0);
            return (
              <Link key={stock.ticker} href={`/stocks/${stock.ticker}`} className="group p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.04] transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black group-hover:text-blue-400 transition-colors">{stock.ticker}</h3>
                    <p className="text-[9px] text-gray-600 font-mono uppercase truncate w-32">{stock.name}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {hasUser && <span className="px-2 py-0.5 rounded bg-blue-500 text-black text-[7px] font-black uppercase">User</span>}
                    {hasAi && <span className="px-2 py-0.5 rounded bg-teal-500 text-black text-[7px] font-black uppercase">AI</span>}
                  </div>
                </div>
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-[9px] font-mono text-gray-700 uppercase mb-1 font-bold">Last Price</p>
                      <p className="text-sm font-bold font-mono">Rp {stock.last_price?.toLocaleString('id-ID')}</p>
                   </div>
                   <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-7 7m7-7H6" /></svg></div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { api, Stock, MultiPortfolio, OHLCV } from '@/lib/api';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const StockChart = dynamic(() => import("@/components/StockChart"), { ssr: false });

interface Signal {
  ticker: string;
  type: string;
  strategy: string;
  description: string;
  strength: number;
  date: string;
}

export default function Dashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [portfolio, setPortfolio] = useState<MultiPortfolio>({ MANUAL: [], AUTO: [] });
  const [signals, setSignals] = useState<Signal[]>([]);
  const [ihsgData, setIhsgData] = useState<OHLCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsRunningScan] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newTicker, setNewTicker] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const loadData = async () => {
    try {
      const [stocksData, portfolioData, ihsg, signalsData] = await Promise.all([
        api.getStocks(),
        api.getPortfolio(),
        api.getOHLCV('^JKSE'),
        api.getSignals()
      ]);
      setStocks(stocksData);
      setPortfolio(portfolioData);
      setIhsgData(ihsg.data || []);
      setSignals(signalsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Sync every 30s
    return () => clearInterval(interval);
  }, []);

  const handleScan = async () => {
    setIsRunningScan(true);
    try {
      await api.triggerScan();
      await loadData();
    } catch (err) {
      alert("Scan failed.");
    } finally {
      setIsRunningScan(false);
    }
  };

  const handleAddStock = async () => {
    if (!newTicker) return;
    setIsAdding(true);
    try {
      await api.addStock(newTicker);
      setNewTicker('');
      loadData();
    } catch (err) {
      alert("Stock not found.");
    } finally {
      setIsAdding(false);
    }
  };

  const totalUnrealized = [...portfolio.MANUAL, ...portfolio.AUTO].reduce((sum, item) => sum + item.unrealized_pnl, 0);
  const filteredStocks = stocks.filter(s => s.ticker !== '^JKSE' && (s.ticker.toLowerCase().includes(searchTerm.toLowerCase()) || s.name.toLowerCase().includes(searchTerm.toLowerCase())));

  const currentIhsg = ihsgData[ihsgData.length - 1]?.close || 0;
  const prevIhsg = ihsgData[ihsgData.length - 2]?.close || 0;
  const ihsgChange = currentIhsg - prevIhsg;

  if (loading && stocks.length === 0) return <div className="min-h-screen bg-[#050505] flex items-center justify-center animate-pulse text-blue-500 font-mono tracking-widest uppercase">Initializing Intelligence Terminal...</div>;

  return (
    <main className="min-h-screen bg-[#050505] text-white p-4 md:p-8 pt-24 md:pt-28">
      <div className="max-w-7xl mx-auto">
        
        {/* TOP SECTION: IHSG & AI SIGNALS */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-10">
          {/* IHSG */}
          <div className="xl:col-span-7 bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">Jakarta Composite</p>
                  <h1 className="text-3xl font-black">IHSG INDEX</h1>
               </div>
               <div className="text-right">
                  <p className="text-2xl font-mono font-bold">Rp {currentIhsg.toLocaleString('id-ID')}</p>
                  <p className={`text-xs font-mono font-bold ${ihsgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {ihsgChange >= 0 ? '▲' : '▼'} {Math.abs((ihsgChange/prevIhsg)*100).toFixed(2)}%
                  </p>
               </div>
            </div>
            <div className="h-56">
               <StockChart data={ihsgData} height={220} transparent={true} />
            </div>
          </div>

          {/* AI SIGNALS CENTER */}
          <div className="xl:col-span-5 flex flex-col gap-6">
             <div className="bg-gradient-to-br from-teal-600/10 to-transparent border border-teal-500/20 rounded-[2.5rem] p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-[10px] font-black text-teal-400 uppercase tracking-[0.4em]">AI Intelligence Signals</h2>
                   <button 
                     onClick={handleScan} 
                     disabled={isScanning}
                     className="bg-teal-500 hover:bg-teal-400 text-black px-4 py-1.5 rounded-full text-[8px] font-black tracking-widest uppercase transition-all active:scale-95 disabled:opacity-50"
                   >
                      {isScanning ? 'SCANNING...' : 'AUTO SCAN'}
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[220px] custom-scrollbar pr-2">
                   {signals.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-xs">
                        <p>No active signals found.</p>
                        <p className="text-[10px] mt-1 uppercase">Run Auto Scan to find opportunities.</p>
                     </div>
                   ) : (
                     <div className="space-y-3">
                        {signals.map((sig, i) => (
                          <Link href={`/stocks/${sig.ticker}`} key={i} className="block group bg-white/5 border border-white/5 hover:border-teal-500/30 p-4 rounded-2xl transition-all">
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-black group-hover:text-teal-400 transition-colors">{sig.ticker}</span>
                                <span className="text-[8px] font-black bg-teal-500 text-black px-2 py-0.5 rounded uppercase tracking-tighter">Strength: {sig.strength}%</span>
                             </div>
                             <p className="text-[10px] text-gray-400 line-clamp-1 italic">{sig.description}</p>
                          </Link>
                        ))}
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>

        {/* STATS & QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="col-span-1 md:col-span-2 p-8 rounded-3xl bg-white/[0.03] border border-white/5 flex flex-col justify-center">
             <p className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-2">Assets in Database</p>
             <div className="flex items-baseline gap-4">
                <p className="text-5xl font-black font-mono">{stocks.length}</p>
                <span className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Active Trackers</span>
             </div>
          </div>
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-center">
             <p className="text-gray-500 text-[9px] font-mono uppercase mb-4 tracking-widest">Quick Asset Loader</p>
             <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-xl">
                <input type="text" value={newTicker} onChange={(e)=>setNewTicker(e.target.value.toUpperCase())} placeholder="TICKER" className="bg-transparent px-4 py-2 text-xs font-bold focus:outline-none w-full" />
                <button onClick={handleAddStock} disabled={isAdding} className="bg-blue-600 px-4 rounded-lg text-[9px] font-black uppercase">{isAdding ? '...' : 'ADD'}</button>
             </div>
          </div>
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-center text-right">
             <p className="text-gray-500 text-[9px] font-mono uppercase mb-1 tracking-widest">Performance</p>
             <p className={`text-2xl font-black font-mono ${totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalUnrealized >= 0 ? '+' : ''}Rp {totalUnrealized.toLocaleString('id-ID')}
             </p>
          </div>
        </div>

        {/* MARKET GRID */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 px-2">
           <h2 className="text-xs font-black font-mono uppercase tracking-[0.4em] text-gray-500 flex items-center gap-4">
              <span className="w-6 h-px bg-white/10"></span>
              Market Watchlist Terminal
           </h2>
           <input 
              type="text"
              placeholder="Filter assets by ticker or name..."
              className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-xs focus:outline-none focus:border-blue-500/50 w-full md:w-80 transition-all shadow-inner"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-20 px-2">
          {filteredStocks.map((stock) => {
            const hasUser = portfolio.MANUAL.some(p => p.ticker === stock.ticker && p.shares > 0);
            const hasAi = portfolio.AUTO.some(p => p.ticker === stock.ticker && p.shares > 0);
            return (
              <Link key={stock.ticker} href={`/stocks/${stock.ticker}`} className="group p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.04] transition-all relative overflow-hidden shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black group-hover:text-blue-400 transition-colors leading-none mb-1">{stock.ticker}</h3>
                    <p className="text-[9px] text-gray-600 font-mono uppercase truncate w-32">{stock.name}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {hasUser && <span className="px-2 py-0.5 rounded-md bg-blue-500 text-black text-[7px] font-black uppercase">User</span>}
                    {hasAi && <span className="px-2 py-0.5 rounded-md bg-teal-500 text-black text-[7px] font-black uppercase tracking-tighter">AI</span>}
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-white/[0.03] pt-4">
                   <div>
                      <p className="text-[8px] font-mono text-gray-700 uppercase mb-1 font-black">Quote Value</p>
                      <p className="text-sm font-bold font-mono">Rp {stock.last_price?.toLocaleString('id-ID')}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-mono text-gray-700 uppercase mb-1 font-black">Sector</p>
                      <p className="text-[9px] font-bold text-gray-500 truncate w-24">{stock.sector}</p>
                   </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>
    </main>
  );
}

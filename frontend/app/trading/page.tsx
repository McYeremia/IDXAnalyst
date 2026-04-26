'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, Stock, PortfolioItem, OHLCV } from '@/lib/api';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const StockChart = dynamic(() => import("@/components/StockChart"), { ssr: false });

interface Indicators {
  MA_20: number | null; MA_50: number | null; MA_200: number | null;
  EMA_12: number | null; EMA_26: number | null; RSI_14: number | null;
  MACD_LINE: number | null; MACD_SIGNAL: number | null; MACD_HIST: number | null;
  BB_UPPER: number | null; BB_MIDDLE: number | null; BB_LOWER: number | null;
  ATR_14: number | null; STOCH_K: number | null; STOCH_D: number | null;
  VOLUME_MA_20: number | null;
  [key: string]: number | null;
}

function rsiColor(v: number | null) {
  if (!v) return "text-gray-500";
  if (v < 30) return "text-green-400";
  if (v > 70) return "text-red-400";
  return "text-blue-400";
}

function fmt(v: number | null) {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export default function TradingTerminal() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedTicker, setSelectedTicker] = useState('BBCA');
  const [ohlcv, setOhlcv] = useState<OHLCV[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [tradeQty, setTradeQty] = useState(1);
  const [isTrading, setIsTrading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Chart Visibility State
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showEMA12, setShowEMA12] = useState(false);

  useEffect(() => {
    api.getStocks().then(setStocks);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ohlcvData, indData, portfolioData] = await Promise.all([
        api.getOHLCV(selectedTicker),
        api.getIndicators(selectedTicker),
        api.getPortfolio()
      ]);
      setOhlcv(ohlcvData.data || []);
      setIndicators(indData.indicators || null);
      setPortfolio(portfolioData.find(p => p.ticker === selectedTicker) || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedTicker]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTrade = async (action: 'BUY' | 'SELL') => {
    setIsTrading(true);
    try {
      await api.executeTrade(selectedTicker, action, tradeQty);
      await fetchData();
      alert(`Berhasil ${action} ${tradeQty} lot ${selectedTicker}`);
    } catch (err) {
      alert("Gagal melakukan transaksi");
    } finally {
      setIsTrading(false);
    }
  };

  const latestPrice = ohlcv[ohlcv.length - 1]?.close || 0;
  const filteredStocks = stocks.filter(s => s.ticker.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden">
      {/* Sidebar: Stock Selector */}
      <aside className="w-64 border-r border-white/10 flex flex-col bg-[#0a0a0a] shrink-0">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-[10px] text-black">IX</div>
            <span className="text-xs font-black tracking-widest uppercase">Trading Hub</span>
          </div>
          <input 
            type="text" 
            placeholder="Search Ticker..." 
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredStocks.map(stock => (
            <button
              key={stock.ticker}
              onClick={() => setSelectedTicker(stock.ticker)}
              className={`w-full p-4 flex justify-between items-center hover:bg-white/5 transition-all border-b border-white/[0.02] ${selectedTicker === stock.ticker ? 'bg-blue-600/10 border-r-4 border-r-blue-500' : ''}`}
            >
              <div className="text-left">
                <p className={`text-sm font-bold ${selectedTicker === stock.ticker ? 'text-blue-400' : ''}`}>{stock.ticker}</p>
                <p className="text-[9px] text-gray-600 uppercase truncate w-24">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono">Rp {stock.last_price?.toLocaleString('id-ID')}</p>
              </div>
            </button>
          ))}
        </div>
        <Link href="/" className="p-4 text-[10px] text-gray-600 hover:text-white text-center border-t border-white/10 uppercase tracking-widest font-bold">
          Exit Terminal
        </Link>
      </aside>

      {/* Main Terminal Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-4xl font-black tracking-tighter">{selectedTicker}</h1>
              <p className="text-gray-600 text-[10px] font-mono tracking-widest uppercase italic">Market Terminal</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-2xl font-mono font-bold text-blue-400 italic">Rp {latestPrice.toLocaleString('id-ID')}</span>
              <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Live Execution Price</span>
            </div>
          </div>

          {/* Simple Trade Panel */}
          <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
            <div className="flex flex-col px-4 border-r border-white/10">
              <span className="text-[9px] text-gray-500 font-mono uppercase">Position</span>
              <span className="text-xs font-bold text-blue-400 font-mono">{portfolio ? `${portfolio.shares / 100} Lot` : '0 Lot'}</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={tradeQty} 
                onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm w-20 text-center font-bold text-blue-400"
              />
              <button 
                onClick={() => handleTrade('BUY')}
                disabled={isTrading}
                className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-black px-5 py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
              >
                BUY
              </button>
              <button 
                onClick={() => handleTrade('SELL')}
                disabled={isTrading || !portfolio || portfolio.shares <= 0}
                className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-black px-5 py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
              >
                SELL
              </button>
            </div>
          </div>
        </header>

        {/* Workspace: Chart & Indicators */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#050505]">
          {/* Chart Controls */}
          <div className="flex gap-2 mb-4">
            {[
              { label: "MA 20", state: showMA20, toggle: () => setShowMA20(!showMA20), color: "border-yellow-500/50 text-yellow-500" },
              { label: "MA 50", state: showMA50, toggle: () => setShowMA50(!showMA50), color: "border-purple-500/50 text-purple-500" },
              { label: "EMA 12", state: showEMA12, toggle: () => setShowEMA12(!showEMA12), color: "border-blue-400/50 text-blue-400" },
            ].map(({ label, state, toggle, color }) => (
              <button
                key={label}
                onClick={toggle}
                className={`text-[9px] font-mono tracking-widest uppercase px-3 py-1.5 rounded-lg border transition-all ${
                  state ? `${color} bg-white/5` : "border-white/5 text-gray-600 hover:text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden mb-10 shadow-2xl relative">
            {loading ? (
              <div className="h-[450px] flex items-center justify-center text-gray-600 font-mono text-sm italic tracking-widest uppercase">Syncing Market Data...</div>
            ) : (
              <StockChart data={ohlcv} indicators={indicators ?? {}} showMA20={showMA20} showMA50={showMA50} showEMA12={showEMA12} />
            )}
          </div>

          {/* FULL INDICATORS Intelligence Grid (15 Kotak Lengkap) */}
          <h2 className="text-sm font-bold font-mono uppercase tracking-[0.4em] text-gray-600 mb-8 flex items-center gap-4">
            <span className="w-8 h-px bg-white/10"></span>
            Technical Intelligence Grid
            <span className="flex-1 h-px bg-white/10"></span>
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-10">
            {[
              { label: "RSI (14)", value: indicators?.RSI_14, valueClass: rsiColor(indicators?.RSI_14 ?? null), extra: indicators?.RSI_14 ? (indicators.RSI_14 < 30 ? "OVERSOLD" : indicators.RSI_14 > 70 ? "OVERBOUGHT" : "NEUTRAL") : null },
              { label: "MA 20", value: indicators?.MA_20 },
              { label: "MA 50", value: indicators?.MA_50 },
              { label: "MA 200", value: indicators?.MA_200 },
              { label: "EMA 12", value: indicators?.EMA_12 },
              { label: "EMA 26", value: indicators?.EMA_26 },
              { label: "MACD Line", value: indicators?.MACD_LINE },
              { label: "MACD Signal", value: indicators?.MACD_SIGNAL },
              { label: "MACD Hist", value: indicators?.MACD_HIST },
              { label: "BB Upper", value: indicators?.BB_UPPER },
              { label: "BB Middle", value: indicators?.BB_MIDDLE },
              { label: "BB Lower", value: indicators?.BB_LOWER },
              { label: "ATR (14)", value: indicators?.ATR_14 },
              { label: "Stoch %K", value: indicators?.STOCH_K },
              { label: "Stoch %D", value: indicators?.STOCH_D },
            ].map((ind, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl hover:bg-white/[0.06] transition-all">
                <p className="text-[9px] text-gray-600 font-mono uppercase mb-1 tracking-widest">{ind.label}</p>
                <p className={`text-sm font-bold font-mono ${ind.valueClass ?? "text-white"}`}>
                  {fmt(ind.value ?? null)}
                </p>
                {ind.extra && <p className={`text-[8px] mt-1 font-black ${ind.valueClass}`}>{ind.extra}</p>}
              </div>
            ))}
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
      `}</style>
    </div>
  );
}

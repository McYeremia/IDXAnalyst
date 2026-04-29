'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, TradeHistory, PortfolioItem } from '@/lib/api';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const EquityChart = dynamic(() => import('@/components/EquityChart'), { ssr: false });

type PortfolioTab = 'USER' | 'GEMINI' | 'CLAUDE';
type ViewMode = 'portfolio' | 'analytics';

const DONUT_COLORS = ['#3b82f6','#14b8a6','#a855f7','#f59e0b','#ef4444','#10b981','#f97316','#06b6d4','#8b5cf6'];

function buildDonutPath(s: number, e: number, cx: number, cy: number, ro: number, ri: number) {
  const x1 = cx + ro * Math.cos(s), y1 = cy + ro * Math.sin(s);
  const x2 = cx + ro * Math.cos(e), y2 = cy + ro * Math.sin(e);
  const ix1 = cx + ri * Math.cos(e), iy1 = cy + ri * Math.sin(e);
  const ix2 = cx + ri * Math.cos(s), iy2 = cy + ri * Math.sin(s);
  const la = e - s > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${ro} ${ro} 0 ${la} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ri} ${ri} 0 ${la} 0 ${ix2} ${iy2} Z`;
}

const TAB_COLORS: Record<PortfolioTab, string> = {
  USER: '#3b82f6',
  GEMINI: '#14b8a6',
  CLAUDE: '#a855f7',
};

const TAB_ACTIVE_CLASS: Record<PortfolioTab, string> = {
  USER: 'bg-blue-600 text-white',
  GEMINI: 'bg-teal-600 text-white',
  CLAUDE: 'bg-purple-600 text-white',
};

interface SellModal {
  open: boolean;
  ticker: string;
  maxLots: number;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [growth, setGrowth] = useState<Record<PortfolioTab, { date: string; value: number }[]> | null>(null);
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PortfolioTab>('USER');
  const [sellModal, setSellModal] = useState<SellModal>({ open: false, ticker: '', maxLots: 0 });
  const [sellQty, setSellQty] = useState(1);
  const [isSelling, setIsSelling] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('portfolio');

  const refresh = useCallback(async () => {
    const [portfolio, growthData, hist] = await Promise.all([
      api.getPortfolio(),
      api.getPortfolioGrowth(),
      api.getTradeHistory(activeTab),
    ]);
    setData(portfolio);
    setGrowth(growthData);
    setHistory(hist);
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const openSellModal = (ticker: string, shares: number) => {
    const maxLots = Math.floor(shares / 100);
    setSellQty(1);
    setSellModal({ open: true, ticker, maxLots });
  };

  const handleSell = async () => {
    if (sellQty < 1 || sellQty > sellModal.maxLots) return;
    setIsSelling(true);
    try {
      const res = await api.executeTrade(sellModal.ticker, 'SELL', sellQty, undefined, 'MANUAL', 'Sold from portfolio');
      if (res.status === 'ok') {
        setSellModal({ open: false, ticker: '', maxLots: 0 });
        await refresh();
      } else {
        alert(res.detail || 'Gagal menjual saham');
      }
    } catch {
      alert('Gagal menghubungi server');
    } finally {
      setIsSelling(false);
    }
  };

  if (loading || !data) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-blue-500 font-mono text-xs uppercase tracking-widest">
      Loading Combat Data...
    </div>
  );

  const current = data[activeTab];
  const growthData = growth?.[activeTab] ?? [];
  const INITIAL = 15_000_000;
  const totalReturn = current.total_value - INITIAL;
  const totalReturnPct = ((totalReturn / INITIAL) * 100).toFixed(2);

  // Analytics
  const sellTrades = history.filter(t => t.action === 'SELL' && t.pnl !== null);
  const winCount = sellTrades.filter(t => t.pnl! > 0).length;
  const winRate = sellTrades.length > 0 ? (winCount / sellTrades.length * 100) : null;

  let maxDrawdownPct = 0;
  if (growthData.length > 1) {
    let peak = growthData[0].value;
    for (const pt of growthData) {
      if (pt.value > peak) peak = pt.value;
      const dd = peak > 0 ? (peak - pt.value) / peak * 100 : 0;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }
  }

  const monthlyPnl: Record<string, number> = {};
  for (const t of sellTrades) {
    const month = t.date.substring(0, 7);
    monthlyPnl[month] = (monthlyPnl[month] || 0) + (t.pnl || 0);
  }
  const monthlyRows = Object.entries(monthlyPnl).sort(([a], [b]) => b.localeCompare(a));

  const totalInvested = current.assets.reduce((sum: number, a: PortfolioItem) => sum + a.cost_basis, 0);
  const allocData = [...current.assets]
    .sort((a: PortfolioItem, b: PortfolioItem) => b.cost_basis - a.cost_basis)
    .map((a: PortfolioItem, i: number) => ({
      ticker: a.ticker,
      pct: totalInvested > 0 ? a.cost_basis / totalInvested * 100 : 0,
      value: a.cost_basis,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-10 pt-24 md:pt-28 text-left font-mono">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">Portfolio <span className="text-blue-500">Battleground</span></h1>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest leading-loose font-bold">15 Million Capital Battle: Human vs Gemini vs Claude</p>
          </div>
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 overflow-x-auto shadow-inner">
            {(['USER', 'GEMINI', 'CLAUDE'] as PortfolioTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === tab ? TAB_ACTIVE_CLASS[tab] : 'text-gray-500 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* TOTAL VALUE — Hero Number */}
        <div className="bg-gradient-to-r from-white/[0.03] to-transparent border border-white/5 rounded-3xl p-8 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 mb-1">Total Portfolio Value</p>
            <p className="text-4xl font-black font-mono">Rp {current.total_value.toLocaleString('id-ID')}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">vs Modal Awal (15 Juta)</p>
            <p className={`text-2xl font-black ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalReturn >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(totalReturnPct))}%
            </p>
            <p className={`text-xs font-mono ${totalReturn >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
              {totalReturn >= 0 ? '+' : ''}Rp {totalReturn.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* CORE STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-xl">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 font-black">Kas Tersedia</p>
            <p className={`text-lg font-black ${current.modal < 0 ? 'text-red-400' : 'text-white'}`}>
              Rp {current.modal.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white/[0.02] border border-blue-500/20 p-6 rounded-2xl shadow-xl">
            <p className="text-[9px] text-blue-500 uppercase tracking-widest mb-1 font-black">Invested</p>
            <p className="text-lg font-black">Rp {current.invested.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-xl">
            <p className="text-[9px] text-green-500 uppercase tracking-widest mb-1 font-black">Unrealized</p>
            <p className={`text-lg font-black ${current.unrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {current.unrealized >= 0 ? '+' : ''}Rp {current.unrealized.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-xl">
            <p className="text-[9px] text-white uppercase tracking-widest mb-1 font-black">Realized</p>
            <p className={`text-lg font-black ${current.realized >= 0 ? 'text-white' : 'text-red-400'}`}>
              {current.realized >= 0 ? '+' : ''}Rp {current.realized.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* GROWTH CHART */}
        <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-8 mb-8 shadow-2xl">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 mb-6">Portfolio Growth</p>
          {growthData.length > 1 ? (
            <EquityChart data={growthData} color={TAB_COLORS[activeTab]} height={220} />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-700 text-xs uppercase font-black tracking-widest opacity-40 italic">
              No trade history to display
            </div>
          )}
        </div>

        {/* ACTIVE POSITIONS */}
        <div className="mb-10">
          <h2 className="text-xs font-black font-mono uppercase tracking-[0.4em] text-gray-500 mb-4 flex items-center gap-4">
            <span className="w-8 h-px bg-white/10" />
            Posisi Aktif
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-gray-700 normal-case tracking-normal">{current.assets.length} posisi</span>
          </h2>

          <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <table className="min-w-full text-left font-mono">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] bg-white/[0.02]">
                  <th className="px-6 py-5">Instrument</th>
                  <th className="px-6 py-5 text-right">Avg Buy</th>
                  <th className="px-6 py-5 text-right">Harga Kini</th>
                  <th className="px-6 py-5 text-right">Invested</th>
                  <th className="px-6 py-5 text-right">Unrealized</th>
                  <th className="px-6 py-5">Strategi</th>
                  <th className="px-6 py-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {current.assets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-24 text-center text-gray-700 italic text-[10px] uppercase font-black opacity-30">
                      Belum ada posisi aktif untuk {activeTab}
                    </td>
                  </tr>
                ) : (
                  current.assets.map((item: PortfolioItem) => (
                    <tr key={item.ticker} className="group hover:bg-white/[0.02] transition-all">
                      <td className="px-6 py-5">
                        <Link href={`/stocks/${item.ticker}`} className="block">
                          <span className="text-lg font-black text-white group-hover:text-blue-400 transition-colors block leading-none">{item.ticker}</span>
                          <span className="text-[9px] text-gray-600 uppercase font-black mt-1 block">{item.shares / 100} LOT</span>
                          {item.last_date && (
                            <span className="text-[8px] text-gray-700 font-mono block mt-0.5">data: {item.last_date}</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-6 py-5 text-right text-xs font-mono text-gray-400">
                        Rp {item.avg_price?.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-sm font-black font-mono text-white">
                          Rp {item.current_price?.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right text-sm font-black text-blue-500/60">
                        Rp {item.cost_basis.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div>
                          <span className={`text-sm font-black ${item.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item.unrealized_pnl >= 0 ? '▲' : '▼'} Rp {Math.abs(item.unrealized_pnl).toLocaleString('id-ID')}
                          </span>
                          <span className={`block text-[9px] font-mono ${item.unrealized_pnl >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                            {item.cost_basis > 0 ? ((item.unrealized_pnl / item.cost_basis) * 100).toFixed(2) : '0.00'}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[9px] font-black bg-white/5 px-2 py-1 rounded-full text-blue-400 uppercase">{item.strategy || 'MANUAL'}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {activeTab === 'USER' && (
                          <button
                            onClick={() => openSellModal(item.ticker, item.shares)}
                            className="text-[9px] font-black px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all uppercase tracking-widest"
                          >
                            SELL
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TRADE HISTORY */}
        <div className="mb-10">
          <h2 className="text-xs font-black font-mono uppercase tracking-[0.4em] text-gray-500 mb-4 flex items-center gap-4">
            <span className="w-8 h-px bg-white/10" />
            Trade History — {activeTab}
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-gray-700 normal-case tracking-normal">{history.length} transaksi</span>
          </h2>

          <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <table className="min-w-full text-left font-mono">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] bg-white/[0.02]">
                  <th className="px-6 py-5">Tanggal</th>
                  <th className="px-6 py-5">Ticker</th>
                  <th className="px-6 py-5 text-center">Aksi</th>
                  <th className="px-6 py-5 text-center">Lot</th>
                  <th className="px-6 py-5 text-right">Harga</th>
                  <th className="px-6 py-5 text-right">Total Nilai</th>
                  <th className="px-6 py-5 text-right">P&L</th>
                  <th className="px-6 py-5">Strategi</th>
                  <th className="px-6 py-5 text-xs text-gray-500 italic max-w-[160px]">Alasan</th>
                  <th className="px-6 py-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-8 py-24 text-center text-gray-700 italic text-[10px] uppercase font-black opacity-30">
                      Belum ada riwayat transaksi untuk {activeTab}
                    </td>
                  </tr>
                ) : (
                  history.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/portfolio/trade/${t.id}`)}
                      className="group hover:bg-white/[0.03] transition-all cursor-pointer"
                    >
                      <td className="px-6 py-4 text-xs text-gray-500">{t.date}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black group-hover:text-blue-400 transition-colors">
                          {t.ticker}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                          t.action === 'BUY'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {t.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold">{t.quantity}</td>
                      <td className="px-6 py-4 text-right text-sm font-mono">
                        Rp {t.price.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-black font-mono ${t.action === 'BUY' ? 'text-red-400/70' : 'text-green-400/70'}`}>
                          {t.action === 'BUY' ? '-' : '+'}Rp {t.total_value.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {t.pnl !== null ? (
                          <div>
                            <span className={`text-sm font-black font-mono ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {t.pnl >= 0 ? '+' : ''}Rp {Math.abs(t.pnl).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </span>
                            <span className={`block text-[9px] font-mono ${t.pnl_pct! >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                              {t.pnl_pct! >= 0 ? '+' : ''}{t.pnl_pct?.toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[9px] font-black bg-white/5 px-2 py-1 rounded-full text-blue-400 uppercase">{t.strategy}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 italic max-w-[160px] truncate">
                        {t.notes || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-gray-700 group-hover:text-white transition-colors text-sm font-black">→</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SELL MODAL */}
      {sellModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black mb-1">Jual <span className="text-red-400">{sellModal.ticker}</span></h3>
            <p className="text-gray-500 text-xs mb-6">Posisi: {sellModal.maxLots} lot tersedia</p>

            <div className="mb-6">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Jumlah Lot</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSellQty(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 font-black text-lg hover:bg-white/10 transition-all"
                >
                  −
                </button>
                <input
                  type="number"
                  value={sellQty}
                  min={1}
                  max={sellModal.maxLots}
                  onChange={(e) => setSellQty(Math.min(sellModal.maxLots, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-center font-black text-xl text-red-400 focus:outline-none focus:border-red-500/50"
                />
                <button
                  onClick={() => setSellQty(q => Math.min(sellModal.maxLots, q + 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 font-black text-lg hover:bg-white/10 transition-all"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => setSellQty(sellModal.maxLots)}
                className="mt-2 text-[9px] text-red-400/60 hover:text-red-400 font-black uppercase tracking-widest transition-colors"
              >
                Jual semua ({sellModal.maxLots} lot)
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSellModal({ open: false, ticker: '', maxLots: 0 })}
                className="flex-1 py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:border-white/20 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSell}
                disabled={isSelling}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isSelling ? 'Menjual...' : `Jual ${sellQty} Lot`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

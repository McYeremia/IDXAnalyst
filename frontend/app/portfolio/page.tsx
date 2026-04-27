'use client';

import { useEffect, useState } from 'react';
import { api, TradeHistory } from '@/lib/api';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const EquityChart = dynamic(() => import('@/components/EquityChart'), { ssr: false });

type PortfolioTab = 'USER' | 'GEMINI' | 'CLAUDE';

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

export default function PortfolioPage() {
  const [data, setData] = useState<any>(null);
  const [growth, setGrowth] = useState<Record<PortfolioTab, { date: string; value: number }[]> | null>(null);
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PortfolioTab>('USER');

  useEffect(() => {
    Promise.all([api.getPortfolio(), api.getPortfolioGrowth()])
      .then(([portfolio, growthData]) => {
        setData(portfolio);
        setGrowth(growthData);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.getTradeHistory(activeTab).then(setHistory);
  }, [activeTab]);

  if (loading || !data) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-blue-500 font-mono text-xs uppercase tracking-widest">
      Loading Combat Data...
    </div>
  );

  const current = data[activeTab];
  const growthData = growth?.[activeTab] ?? [];
  const INITIAL = 15_000_000;

  const latestValue = growthData.length > 0 ? growthData[growthData.length - 1].value : INITIAL;
  const totalReturn = latestValue - INITIAL;
  const totalReturnPct = ((totalReturn / INITIAL) * 100).toFixed(2);

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-10 pt-24 md:pt-28 text-left font-mono">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
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

        {/* CORE STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-xl">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 font-black">Kas Tersedia</p>
            <p className={`text-lg font-black ${current.modal < 0 ? 'text-red-400' : 'text-white'}`}>Rp {current.modal.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-xl border-blue-500/20">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 font-black text-blue-500">Invested</p>
            <p className="text-lg font-black">Rp {current.invested.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-xl">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 font-black text-green-500">Unrealized</p>
            <p className={`text-lg font-black ${current.unrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {current.unrealized >= 0 ? '+' : ''}Rp {current.unrealized.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl shadow-xl">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 font-black text-white">Realized</p>
            <p className={`text-lg font-black ${current.realized >= 0 ? 'text-white' : 'text-red-400'}`}>
              {current.realized >= 0 ? '+' : ''}Rp {current.realized.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* GROWTH CHART */}
        <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 mb-1">Portfolio Growth</p>
              <p className="text-2xl font-black">
                Rp {latestValue.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Return</p>
              <p className={`text-xl font-black ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalReturn >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(totalReturnPct))}%
              </p>
              <p className={`text-xs font-mono ${totalReturn >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                {totalReturn >= 0 ? '+' : ''}Rp {totalReturn.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {growthData.length > 1 ? (
            <EquityChart
              data={growthData}
              color={TAB_COLORS[activeTab]}
              height={260}
            />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-700 text-xs uppercase font-black tracking-widest opacity-40 italic">
              No trade history to display
            </div>
          )}
        </div>

        {/* ASSET TABLE */}
        <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
          <table className="min-w-full text-left font-mono">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] bg-white/[0.02]">
                <th className="px-8 py-6">Instrument</th>
                <th className="px-8 py-6 text-center">Invested</th>
                <th className="px-8 py-6 text-center">Unrealized</th>
                <th className="px-8 py-6 text-center">Strategy</th>
                <th className="px-8 py-6">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {current.assets.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-32 text-center text-gray-700 italic text-[10px] uppercase font-black opacity-30">No active positions for {activeTab}</td></tr>
              ) : (
                current.assets.map((item: any) => (
                  <tr key={item.ticker} className="group hover:bg-white/[0.02] transition-all">
                    <td className="px-8 py-6">
                      <span className="text-xl font-black text-white group-hover:text-blue-400 transition-colors block leading-none">{item.ticker}</span>
                      <span className="text-[9px] text-gray-600 uppercase font-black mt-2 block">{item.shares / 100} LOTS</span>
                    </td>
                    <td className="px-8 py-6 text-center text-sm font-black text-blue-500/60">
                      Rp {item.cost_basis.toLocaleString('id-ID')}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`text-sm font-black ${item.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.unrealized_pnl >= 0 ? '▲' : '▼'} Rp {Math.abs(item.unrealized_pnl).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-[9px] font-black bg-white/5 px-3 py-1 rounded-full text-blue-400 uppercase">{item.strategy || 'MANUAL'}</span>
                    </td>
                    <td className="px-8 py-6 text-xs text-gray-500 italic max-w-xs truncate">
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* TRADE HISTORY */}
        <div className="mt-10">
          <h2 className="text-xs font-black font-mono uppercase tracking-[0.4em] text-gray-500 mb-6 flex items-center gap-4">
            <span className="w-8 h-px bg-white/10" />
            Trade History — {activeTab}
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-gray-700 normal-case tracking-normal">{history.length} transaksi</span>
          </h2>

          <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <table className="min-w-full text-left font-mono">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] bg-white/[0.02]">
                  <th className="px-8 py-5">Tanggal</th>
                  <th className="px-8 py-5">Ticker</th>
                  <th className="px-8 py-5 text-center">Aksi</th>
                  <th className="px-8 py-5 text-center">Lot</th>
                  <th className="px-8 py-5 text-right">Harga</th>
                  <th className="px-8 py-5 text-right">Total Nilai</th>
                  <th className="px-8 py-5">Strategi</th>
                  <th className="px-8 py-5">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-8 py-24 text-center text-gray-700 italic text-[10px] uppercase font-black opacity-30">
                      Belum ada riwayat transaksi untuk {activeTab}
                    </td>
                  </tr>
                ) : (
                  history.map((t) => (
                    <tr key={t.id} className="group hover:bg-white/[0.02] transition-all">
                      <td className="px-8 py-5 text-xs text-gray-500">{t.date}</td>
                      <td className="px-8 py-5">
                        <span className="text-sm font-black group-hover:text-blue-400 transition-colors">{t.ticker}</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                          t.action === 'BUY'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {t.action}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center text-sm font-bold">{t.quantity}</td>
                      <td className="px-8 py-5 text-right text-sm font-mono font-bold">
                        Rp {t.price.toLocaleString('id-ID')}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className={`text-sm font-black font-mono ${t.action === 'BUY' ? 'text-red-400/80' : 'text-green-400/80'}`}>
                          {t.action === 'BUY' ? '-' : '+'}Rp {t.total_value.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[9px] font-black bg-white/5 px-2 py-1 rounded-full text-blue-400 uppercase">{t.strategy}</span>
                      </td>
                      <td className="px-8 py-5 text-xs text-gray-500 italic max-w-xs truncate">
                        {t.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}

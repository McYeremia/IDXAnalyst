'use client';

import { useEffect, useState } from 'react';
import { api, PortfolioItem } from '@/lib/api';
import Link from 'next/link';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPortfolio()
      .then(setPortfolio)
      .finally(() => setLoading(false));
  }, []);

  const totalUnrealized = portfolio.reduce((sum, item) => sum + item.unrealized_pnl, 0);
  const totalRealized = portfolio.reduce((sum, item) => sum + item.realized_pnl, 0);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <Link href="/dashboard" className="text-blue-500 text-xs font-mono mb-2 block hover:text-blue-400 transition-colors">← RETURN TO TERMINAL</Link>
            <h1 className="text-3xl font-extrabold tracking-tight">Trading <span className="text-blue-500">Portfolio</span></h1>
          </div>
          <div className="flex gap-4 p-1 bg-white/5 rounded-2xl border border-white/10">
            <div className="px-6 py-3 text-center">
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Portfolio Value</p>
              <p className="text-xl font-bold font-mono">Rp {(totalUnrealized + totalRealized).toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-green-500/10 blur-3xl rounded-full"></div>
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Unrealized P&L</p>
            <p className={`text-4xl font-bold font-mono ${totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalUnrealized >= 0 ? '+' : ''}Rp {totalUnrealized.toLocaleString('id-ID')}
            </p>
            <p className="text-gray-600 text-[10px] mt-4 font-mono">Current floating profit/loss based on market prices</p>
          </div>
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full"></div>
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-2">Realized P&L</p>
            <p className={`text-4xl font-bold font-mono ${totalRealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalRealized >= 0 ? '+' : ''}Rp {totalRealized.toLocaleString('id-ID')}
            </p>
            <p className="text-gray-600 text-[10px] mt-4 font-mono">Booked profit/loss from completed trades</p>
          </div>
        </div>

        {/* Holdings Table */}
        <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-gray-400 mb-6">Active Holdings</h2>
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                  <th className="px-8 py-6 text-left">Ticker</th>
                  <th className="px-8 py-6 text-left">Holdings</th>
                  <th className="px-8 py-6 text-left">Avg Price</th>
                  <th className="px-8 py-6 text-left">Current</th>
                  <th className="px-8 py-6 text-left">Unrealized P&L</th>
                  <th className="px-8 py-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {portfolio.filter(p => p.shares > 0).map((item) => (
                  <tr key={item.ticker} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{item.ticker}</span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-300">{item.shares / 100} Lot</span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-400">Rp {item.avg_buy_price.toLocaleString('id-ID')}</span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-400">Rp {item.current_price.toLocaleString('id-ID')}</span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`text-sm font-mono font-bold ${item.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.unrealized_pnl >= 0 ? '+' : ''}Rp {item.unrealized_pnl.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <Link href={`/stocks/${item.ticker}`} className="text-[10px] font-bold text-blue-500 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all">
                        TRADE
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Closed Positions */}
        {portfolio.filter(p => p.shares === 0).length > 0 && (
          <div className="mt-16">
            <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-gray-600 mb-6">Trade History (Closed)</h2>
            <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden opacity-60">
              <table className="min-w-full">
                <tbody className="divide-y divide-white/5">
                  {portfolio.filter(p => p.shares === 0).map((item) => (
                    <tr key={item.ticker} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-6 text-sm font-bold text-gray-400">{item.ticker}</td>
                      <td className="px-8 py-6 text-right">
                        <span className={`text-sm font-mono font-bold ${item.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.realized_pnl >= 0 ? 'Profit' : 'Loss'}: Rp {item.realized_pnl.toLocaleString('id-ID')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

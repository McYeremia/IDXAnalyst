"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchStocks } from "@/lib/api";

interface Stock {
  ticker: string;
  name: string;
  sector: string;
  last_price: number | null;
  last_date: string | null;
}

const SECTORS = [
  "Semua", "Finance", "Telecom", "Consumer Goods", "Retail", "Healthcare",
  "Automotive", "Machinery", "Mining", "Energy", "Property", "Technology",
  "Infrastructure", "Construction", "Construction Materials", "Chemical", "Paper",
  "Trade", "Media", "Plantation",
];

export default function Dashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sector, setSector] = useState("Semua");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStocks().then((data) => { setStocks(data); setLoading(false); });
  }, []);

  const filtered = stocks.filter((s) =>
    (sector === "Semua" || s.sector === sector) &&
    (s.ticker.includes(search.toUpperCase()) || s.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <Link href="/" className="text-sm font-mono font-bold text-white hover:text-blue-400 transition-colors">
          IDXAnalyst
        </Link>
        <span className="text-gray-600 text-xs">|</span>
        <span className="text-sm text-blue-400 font-medium">Dashboard</span>
      </nav>

      <div className="p-6">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold mb-0.5">IDX80</h1>
            <p className="text-gray-400 text-sm">{stocks.length} saham terdaftar</p>
          </div>
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            placeholder="Cari ticker atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-blue-500"
          />
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          >
            {SECTORS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-gray-500">Memuat data...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Ticker</th>
                  <th className="text-left py-2 pr-4">Nama</th>
                  <th className="text-left py-2 pr-4">Sektor</th>
                  <th className="text-right py-2 pr-4">Harga Terakhir</th>
                  <th className="text-right py-2">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.ticker} className="border-b border-gray-900 hover:bg-gray-800 transition-colors">
                    <td className="py-2 pr-4">
                      <Link href={`/stocks/${s.ticker}`} className="text-blue-400 font-mono font-semibold hover:underline">
                        {s.ticker}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-gray-300">{s.name}</td>
                    <td className="py-2 pr-4">
                      <span className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-gray-400">
                        {s.sector}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {s.last_price ? `Rp ${s.last_price.toLocaleString("id-ID")}` : "-"}
                    </td>
                    <td className="py-2 text-right text-gray-500 text-xs">{s.last_date ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-gray-500 mt-4">Tidak ada saham yang cocok.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

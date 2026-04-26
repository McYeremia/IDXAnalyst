"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { fetchOHLCV, fetchIndicators } from "@/lib/api";

const StockChart = dynamic(() => import("@/components/StockChart"), { ssr: false });

interface OHLCVRow {
  date: string; open: number; high: number; low: number; close: number; volume: number;
}

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
  if (!v) return "text-gray-400";
  if (v < 30) return "text-green-400";
  if (v > 70) return "text-red-400";
  return "text-yellow-400";
}

function fmt(v: number | null) {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export default function StockPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const [ohlcv, setOhlcv] = useState<OHLCVRow[]>([]);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showEMA12, setShowEMA12] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    Promise.all([
      fetchOHLCV(ticker),
      fetchIndicators(ticker),
    ]).then(([ohlcvData, indData]) => {
      setOhlcv(ohlcvData.data || []);
      setIndicators(indData.indicators || null);
      setLoading(false);
    });
  }, [ticker]);

  const latest = ohlcv[ohlcv.length - 1];
  const prev = ohlcv[ohlcv.length - 2];
  const change = latest && prev ? latest.close - prev.close : null;
  const changePct = change && prev ? (change / prev.close) * 100 : null;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <Link href="/" className="text-sm font-mono font-bold text-white hover:text-blue-400 transition-colors">
          IDXAnalyst
        </Link>
        <span className="text-gray-600 text-xs">|</span>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
          Dashboard
        </Link>
        <span className="text-gray-600 text-xs">|</span>
        <span className="text-sm text-blue-400 font-mono font-semibold">{ticker}</span>
      </nav>
      <div className="p-6">
      <Link href="/dashboard" className="text-blue-400 text-sm hover:underline mb-4 inline-block">← Kembali ke Dashboard</Link>

      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-3xl font-bold font-mono">{ticker}</h1>
        {latest && (
          <>
            <span className="text-2xl font-mono">Rp {latest.close.toLocaleString("id-ID")}</span>
            {changePct !== null && (
              <span className={`text-sm font-mono ${changePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
              </span>
            )}
          </>
        )}
      </div>
      {latest && <p className="text-gray-500 text-xs mb-6">{latest.date}</p>}

      {/* Chart Controls */}
      <div className="flex gap-2 mb-3">
        {[
          { label: "MA20", state: showMA20, toggle: () => setShowMA20(!showMA20), color: "text-yellow-400" },
          { label: "MA50", state: showMA50, toggle: () => setShowMA50(!showMA50), color: "text-purple-400" },
          { label: "EMA12", state: showEMA12, toggle: () => setShowEMA12(!showEMA12), color: "text-sky-400" },
        ].map(({ label, state, toggle, color }) => (
          <button
            key={label}
            onClick={toggle}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              state ? `border-current ${color} bg-gray-800` : "border-gray-700 text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gray-900 rounded-lg overflow-hidden mb-6">
        {loading ? (
          <div className="h-[420px] flex items-center justify-center text-gray-500">Memuat chart...</div>
        ) : (
          <StockChart data={ohlcv} indicators={indicators ?? {}} showMA20={showMA20} showMA50={showMA50} showEMA12={showEMA12} />
        )}
      </div>

      {/* Indicators Panel */}
      {indicators && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: "RSI (14)", value: indicators.RSI_14, extra: indicators.RSI_14 ? (indicators.RSI_14 < 30 ? "Oversold" : indicators.RSI_14 > 70 ? "Overbought" : "Netral") : null, valueClass: rsiColor(indicators.RSI_14) },
            { label: "MA 20", value: indicators.MA_20 },
            { label: "MA 50", value: indicators.MA_50 },
            { label: "MA 200", value: indicators.MA_200 },
            { label: "EMA 12", value: indicators.EMA_12 },
            { label: "EMA 26", value: indicators.EMA_26 },
            { label: "MACD Line", value: indicators.MACD_LINE },
            { label: "MACD Signal", value: indicators.MACD_SIGNAL },
            { label: "BB Upper", value: indicators.BB_UPPER },
            { label: "BB Middle", value: indicators.BB_MIDDLE },
            { label: "BB Lower", value: indicators.BB_LOWER },
            { label: "ATR (14)", value: indicators.ATR_14 },
            { label: "Stoch %K", value: indicators.STOCH_K },
            { label: "Stoch %D", value: indicators.STOCH_D },
          ].map(({ label, value, extra, valueClass }) => (
            <div key={label} className="bg-gray-900 rounded-lg p-3 border border-gray-800">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className={`font-mono text-sm font-semibold ${valueClass ?? "text-gray-100"}`}>
                {fmt(value)}
              </p>
              {extra && <p className="text-xs mt-0.5 text-gray-400">{extra}</p>}
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  );
}

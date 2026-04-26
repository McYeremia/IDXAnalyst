import Link from "next/link";

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Candlestick Chart",
    desc: "Visualisasi pergerakan harga OHLCV dengan overlay MA20, MA50, dan EMA12.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
    title: "16 Indikator Teknikal",
    desc: "RSI, MACD, Bollinger Bands, Stochastic, ATR, Moving Averages, dan lebih banyak.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
    title: "80 Saham IDX80",
    desc: "Cakupan penuh IDX80 — 80 saham blue-chip Indonesia dengan filter sektor.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    title: "Data EOD Otomatis",
    desc: "Data harga end-of-day diperbarui via yfinance dengan satu klik refresh.",
  },
];

const STATS = [
  { value: "80", label: "Saham IDX80" },
  { value: "16", label: "Indikator Teknikal" },
  { value: "EOD", label: "Data Harian" },
  { value: "Free", label: "Open Source" },
];

const SAMPLE_TICKERS = ["BBCA", "TLKM", "ASII", "BMRI", "GOTO"];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <span className="font-mono font-bold text-white tracking-tight">IDXAnalyst</span>
        <Link
          href="/dashboard"
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          Dashboard →
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-full px-3 py-1 text-xs text-gray-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
          IDX80 · Data End-of-Day
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 max-w-2xl leading-tight">
          Analisis Teknikal<br />
          <span className="text-blue-400">Saham Indonesia</span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg max-w-xl mb-10 leading-relaxed">
          Platform analisis saham IDX80 dengan candlestick chart, 16 indikator teknikal,
          dan data harian otomatis untuk investor Indonesia.
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-16">
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            Buka Dashboard
          </Link>
          <Link
            href="/stocks/BBCA"
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-medium px-6 py-2.5 rounded-lg transition-colors text-sm font-mono"
          >
            Lihat BBCA →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-800 rounded-xl overflow-hidden border border-gray-800 w-full max-w-2xl">
          {STATS.map(({ value, label }) => (
            <div key={label} className="bg-gray-900 px-6 py-4 text-center">
              <p className="text-2xl font-mono font-bold text-white mb-0.5">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest text-center mb-8">
          Fitur
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex gap-4">
              <div className="text-blue-400 mt-0.5 shrink-0">{icon}</div>
              <div>
                <h3 className="font-semibold text-sm text-gray-100 mb-1">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Jump */}
      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Saham Populer
        </h2>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_TICKERS.map((t) => (
            <Link
              key={t}
              href={`/stocks/${t}`}
              className="font-mono text-sm bg-gray-900 border border-gray-800 hover:border-blue-500 hover:text-blue-400 text-gray-300 px-4 py-2 rounded-lg transition-colors"
            >
              {t}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-300 px-4 py-2 transition-colors"
          >
            Lihat semua 80 saham →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 text-center text-xs text-gray-600">
        IDXAnalyst · Data EOD via yfinance · Hanya untuk keperluan pribadi
      </footer>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-[10px] text-black shadow-lg shadow-blue-600/20">
              IX
            </div>
            <span className="text-xl font-black tracking-tighter">IDX<span className="text-blue-500">Analyst</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black tracking-widest text-gray-500">
            <Link href="/dashboard" className="hover:text-white transition-colors">MARKET</Link>
            <Link href="/screener" className="hover:text-white transition-colors">SCREENER</Link>
            <Link href="/portfolio" className="hover:text-white transition-colors">BATTLEGROUND</Link>
          </div>
          <Link href="/dashboard" className="bg-white text-black px-6 py-2 rounded-full text-[10px] font-black tracking-widest hover:bg-blue-400 transition-all active:scale-95 shadow-lg shadow-white/5">
            LAUNCH TERMINAL
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black tracking-[0.2em] text-blue-400 mb-8 uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Next-Gen AI Trading Ecosystem
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
            AI Battleground. <br />
            <span className="text-blue-500">Quant Precision.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl mb-12 leading-relaxed font-medium">
            Platform intelijen saham IDX80 yang menggabungkan analisis fundamental dengan 10 algoritma quant otonom. Adu strategi Anda melawan Gemini dan Claude.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <Link href="/dashboard" className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl font-black text-xs tracking-[0.3em] transition-all shadow-2xl shadow-blue-600/20 active:scale-95">
              ENTER TERMINAL
            </Link>
            <Link href="/backtest" className="w-full md:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-10 py-5 rounded-2xl font-black text-xs tracking-[0.3em] transition-all backdrop-blur-sm">
              BACKTEST STRATEGY
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Section: The Battleground */}
      <section className="py-24 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {[
              {
                title: "AI Battleground",
                desc: "Pisahkan portofolio Anda dan biarkan Gemini serta Claude mengeksekusi strategi mereka sendiri secara otonom.",
                icon: "⚔️",
                color: "text-purple-400"
              },
              {
                title: "10 Quant Algorithms",
                desc: "Gunakan screener berbasis Triple Confirmation, Volatility Sniper, hingga Institutional Trend untuk menyaring 400+ aset.",
                icon: "🛡️",
                color: "text-blue-400"
              },
              {
                title: "Techno-Fundamental",
                desc: "AI memvalidasi setiap sinyal teknikal dengan rasio fundamental PE & PBV untuk memastikan keamanan aset.",
                icon: "🧬",
                color: "text-teal-400"
              }
            ].map((feat, i) => (
              <div key={i} className="group p-10 rounded-[3rem] bg-[#0a0a0a] border border-white/5 hover:border-white/20 transition-all shadow-2xl">
                <div className="text-5xl mb-6">{feat.icon}</div>
                <h3 className={`text-2xl font-black mb-4 ${feat.color}`}>{feat.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm font-medium">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ticker Tape */}
      <div className="border-y border-white/5 bg-black py-6 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap gap-16 text-[10px] font-black font-mono tracking-widest text-gray-700 uppercase">
          {['BBCA Stable', 'GOTO Volatile', 'IHSG Index', 'Quant Active', 'Gemini Trading', 'Claude Analyzing'].map((tick, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {tick}
            </span>
          ))}
          {/* Duplicate for loop */}
          {['BBCA Stable', 'GOTO Volatile', 'IHSG Index', 'Quant Active', 'Gemini Trading', 'Claude Analyzing'].map((tick, i) => (
            <span key={`dup-${i}`} className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {tick}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 text-center">
        <p className="text-gray-600 text-[10px] font-black tracking-[0.5em] uppercase mb-4">IDXAnalyst Intelligence Terminal</p>
        <p className="text-gray-800 text-[9px] font-mono">© 2026 Powered by Gemini & Claude AI Core.</p>
      </footer>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}

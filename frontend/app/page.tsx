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
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-400 rounded-lg flex items-center justify-center font-bold text-black shadow-lg shadow-blue-500/20">
              IX
            </div>
            <span className="text-xl font-bold tracking-tighter">IDX<span className="text-blue-400">Analyst</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Market</Link>
            <Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link>
          </div>
          <Link href="/trading" className="bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-400 transition-all active:scale-95">
            Launch Terminal
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-teal-500/10 blur-[100px] rounded-full -z-10" />

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-400 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Powered by Gemini & Claude AI
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent leading-tight">
            Analyze. Backtest. <br />
            <span className="text-blue-500">Trade Smarter.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg md:text-xl mb-10 leading-relaxed">
            Platform analisis saham IDX80 tercanggih yang menggabungkan presisi teknikal dengan kecerdasan AI. Pantau portofolio simulasi Anda secara real-time.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <Link href="/trading" className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl shadow-blue-600/20 active:scale-95">
              Get Started Now
            </Link>
            <button className="w-full md:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all backdrop-blur-sm">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Stats/Ticker Tape */}
      <div className="border-y border-white/5 bg-white/[0.02] py-4 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap gap-12 text-sm font-mono text-gray-500">
          {['BBCA +1.2%', 'ASII -0.5%', 'TLKM +2.4%', 'BMRI +0.8%', 'GOTO -4.2%', 'BBNI +1.5%', 'AMRT +3.1%', 'KLBF -1.1%'].map((tick, i) => (
            <span key={i} className={tick.includes('+') ? 'text-green-400/70' : 'text-red-400/70'}>
              {tick}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {['BBCA +1.2%', 'ASII -0.5%', 'TLKM +2.4%', 'BMRI +0.8%', 'GOTO -4.2%', 'BBNI +1.5%', 'AMRT +3.1%', 'KLBF -1.1%'].map((tick, i) => (
            <span key={`dup-${i}`} className={tick.includes('+') ? 'text-green-400/70' : 'text-red-400/70'}>
              {tick}
            </span>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "AI-Driven Insights",
              desc: "Claude & Gemini menganalisis ribuan data point untuk memberikan rekomendasi objektif.",
              icon: "🤖"
            },
            {
              title: "Real-time Backtesting",
              desc: "Uji strategi trading Anda di data historis IDX80 dalam hitungan detik.",
              icon: "📊"
            },
            {
              title: "Smart Simulation",
              desc: "Buka posisi trading simulasi dan biarkan AI membantu Anda mengelola risiko.",
              icon: "🛡️"
            }
          ].map((feat, i) => (
            <div key={i} className="group p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-500/50 transition-all hover:bg-white/[0.05]">
              <div className="text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all">{feat.icon}</div>
              <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-gray-600 text-sm">
        <p>© 2026 IDXAnalyst Terminal. All rights reserved.</p>
      </footer>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

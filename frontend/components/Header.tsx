'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  // Jangan tampilkan header di Landing Page (opsional, tapi biasanya Landing Page punya nav sendiri)
  // Namun agar user mudah berpindah, kita tampilkan header yang konsisten saja.
  if (pathname === '/') return null; 

  const navLinks = [
    { name: 'MARKET', href: '/dashboard' },
    { name: 'PORTFOLIO', href: '/portfolio' },
    { name: 'BACKTEST', href: '/backtest' },
    { name: 'TRADING', href: '/stocks/BBCA' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-bold text-[10px] text-black shadow-lg shadow-blue-600/20 group-hover:bg-blue-500 transition-colors">IX</div>
            <span className="text-sm font-black tracking-tighter text-white">IDX<span className="text-blue-500">Analyst</span></span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href.split('/')[1]); // Sederhana: cek segmen pertama
              const isTradeActive = link.name === 'TRADING' && pathname.startsWith('/stocks');
              const active = isActive || isTradeActive;

              return (
                <Link 
                  key={link.name} 
                  href={link.href}
                  className={`text-[10px] font-bold tracking-[0.2em] transition-all hover:text-white ${active ? 'text-blue-400' : 'text-gray-500'}`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Live</span>
            </div>
        </div>
      </div>
    </header>
  );
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Stock {
  ticker: string;
  name: string;
  sector: string;
  last_price: number | null;
  last_date: string | null;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PortfolioItem {
  ticker: string;
  shares: number;
  avg_buy_price: number;
  current_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
}

export const api = {
  // Stocks
  async getStocks(): Promise<Stock[]> {
    const res = await fetch(`${API_BASE_URL}/stocks`);
    return res.json();
  },

  async getOHLCV(ticker: string, from?: string): Promise<{ data: OHLCV[] }> {
    const url = from ? `${API_BASE_URL}/stocks/${ticker}/ohlcv?from=${from}` : `${API_BASE_URL}/stocks/${ticker}/ohlcv`;
    const res = await fetch(url);
    return res.json();
  },

  async getIndicators(ticker: string) {
    const res = await fetch(`${API_BASE_URL}/stocks/${ticker}/indicators`);
    return res.json();
  },

  // Trades & Portfolio
  async getPortfolio(): Promise<PortfolioItem[]> {
    // Kita akan buat endpoint ini di backend nanti, atau sementara bisa pakai mcp_server logic
    // Untuk sekarang kita asumsikan backend punya endpoint /trades/portfolio
    const res = await fetch(`${API_BASE_URL}/trades/portfolio`);
    if (!res.ok) return [];
    return res.json();
  },

  async executeTrade(ticker: string, action: 'BUY' | 'SELL', quantity: number, price?: number, notes?: string) {
    const res = await fetch(`${API_BASE_URL}/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        action,
        quantity,
        price,
        trade_type: 'MANUAL',
        notes
      }),
    });
    return res.json();
  },

  async refreshData(ticker?: string) {
    const url = ticker ? `${API_BASE_URL}/stocks/${ticker}/refresh` : `${API_BASE_URL}/stocks/refresh`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
  }
};

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

export interface MultiPortfolio {
  MANUAL: PortfolioItem[];
  AUTO: PortfolioItem[];
}

export const api = {
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

  async getPortfolio(): Promise<MultiPortfolio> {
    const res = await fetch(`${API_BASE_URL}/trades/portfolio`);
    if (!res.ok) return { MANUAL: [], AUTO: [] };
    return res.json();
  },

  async executeTrade(ticker: string, action: 'BUY' | 'SELL', quantity: number, price?: number, tradeType: 'MANUAL' | 'AUTO' = 'MANUAL', notes?: string) {
    const res = await fetch(`${API_BASE_URL}/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        action,
        quantity,
        price,
        trade_type: tradeType,
        notes
      }),
    });
    return res.json();
  },

  async refreshData(ticker?: string) {
    const url = ticker ? `${API_BASE_URL}/stocks/${ticker}/refresh` : `${API_BASE_URL}/stocks/refresh`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
  },

  async runBacktest(ticker: string, strategyId: string) {
    const res = await fetch(`${API_BASE_URL}/backtest/run/${ticker}/${strategyId}`);
    return res.json();
  },

  async screenStocks(strategyId: string) {
    const res = await fetch(`${API_BASE_URL}/backtest/screen/${strategyId}`);
    return res.json();
  },

  async addStock(ticker: string) {
    const res = await fetch(`${API_BASE_URL}/stocks/${ticker}`, { method: 'POST' });
    return res.json();
  },

  async getSignals() {
    const res = await fetch(`${API_BASE_URL}/stocks/signals`);
    return res.json();
  },

  async triggerScan() {
    const res = await fetch(`${API_BASE_URL}/stocks/scan`, { method: 'POST' });
    return res.json();
  }
};

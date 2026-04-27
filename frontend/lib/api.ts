const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export interface Stock {
  ticker: string;
  name: string;
  sector: string;
  last_price: number | null;
  last_date: string | null;
  pe_ratio: number | null;
  pbv_ratio: number | null;
  dividend_yield: number | null;
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
  avg_price: number;
  current_price: number;
  last_date: string | null;
  cost_basis: number;
  unrealized_pnl: number;
  strategy?: string;
  notes?: string;
}

export interface AgentPortfolio {
  modal: number;
  invested: number;
  unrealized: number;
  realized: number;
  total_value: number;
  assets: PortfolioItem[];
}

export interface MultiPortfolioResponse {
  USER: AgentPortfolio;
  GEMINI: AgentPortfolio;
  CLAUDE: AgentPortfolio;
}

export interface TradeHistory {
  id: number;
  ticker: string;
  action: 'BUY' | 'SELL';
  date: string;
  price: number;
  quantity: number;
  total_value: number;
  pnl: number | null;
  pnl_pct: number | null;
  strategy: string;
  notes: string;
}

export interface BacktestResult {
  strategy_id: string;
  ticker: string;
  metrics: {
    win_rate: number;
    total_return_pct: number;
    total_trades: number;
    wins: number;
    losses: number;
    max_drawdown_pct: number;
    initial_capital: number;
    final_value: number;
  };
  equity_curve: { date: string; value: number }[];
  trades: { date: string; type: string; price: number; pnl?: number; pnl_pct?: number }[];
}

export const api = {
  async getStocks(): Promise<Stock[]> {
    const res = await fetch(`${API_BASE_URL}/stocks`);
    return res.json();
  },

  async getOHLCV(ticker: string, from?: string): Promise<{ data: OHLCV[] }> {
    const url = from
      ? `${API_BASE_URL}/stocks/${ticker}/ohlcv?from=${from}`
      : `${API_BASE_URL}/stocks/${ticker}/ohlcv`;
    const res = await fetch(url);
    return res.json();
  },

  async getIndicators(ticker: string) {
    const res = await fetch(`${API_BASE_URL}/stocks/${ticker}/indicators`);
    return res.json();
  },

  async getPortfolio(): Promise<MultiPortfolioResponse> {
    const res = await fetch(`${API_BASE_URL}/trades/portfolio`);
    return res.json();
  },

  async executeTrade(
    ticker: string,
    action: 'BUY' | 'SELL',
    quantity: number,
    price?: number,
    tradeType: string = 'MANUAL',
    notes?: string,
    strategyId?: string
  ) {
    const res = await fetch(`${API_BASE_URL}/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        action,
        quantity,
        price,
        trade_type: tradeType,
        notes,
        strategy_id: strategyId,
      }),
    });
    return res.json();
  },

  async refreshData(ticker?: string) {
    const url = ticker
      ? `${API_BASE_URL}/stocks/${ticker}/refresh`
      : `${API_BASE_URL}/stocks/refresh`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
  },

  async runBacktest(ticker: string, strategyId: string): Promise<BacktestResult> {
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
  },

  async getPortfolioGrowth(): Promise<Record<'USER' | 'GEMINI' | 'CLAUDE', { date: string; value: number }[]>> {
    const res = await fetch(`${API_BASE_URL}/trades/growth`);
    return res.json();
  },

  async getTradeHistory(agent: 'USER' | 'GEMINI' | 'CLAUDE'): Promise<TradeHistory[]> {
    const res = await fetch(`${API_BASE_URL}/trades/history?agent=${agent}`);
    return res.json();
  },
};

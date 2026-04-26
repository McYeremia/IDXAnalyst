const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchStocks() {
  const res = await fetch(`${BASE_URL}/stocks`);
  return res.json();
}

export async function fetchOHLCV(ticker: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString() ? `?${params}` : "";
  const res = await fetch(`${BASE_URL}/stocks/${ticker}/ohlcv${query}`);
  return res.json();
}

export async function fetchIndicators(ticker: string) {
  const res = await fetch(`${BASE_URL}/stocks/${ticker}/indicators`);
  return res.json();
}

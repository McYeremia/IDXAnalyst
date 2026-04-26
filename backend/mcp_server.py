import os
import json
from datetime import date
from typing import Dict

from mcp.server.fastmcp import FastMCP
from sqlalchemy.orm import Session
from sqlalchemy import desc
import pandas as pd
import ta as ta_lib

import models
from database import SessionLocal
import services.backtester as bt_svc
from services.watcher import check_strategy_active

mcp = FastMCP("IDXAnalyst")

ALL_STRATEGIES = [
    "triple-confirmation", "volatility-sniper", "institutional-trend",
    "exhaustion-play", "trend-accelerator", "pure-momentum",
    "defensive-bull", "stoch-rsi-hybrid", "rsi-reversion", "ma-cross"
]


def _build_indicator_df(db: Session, stock_id: int) -> pd.DataFrame:
    rows = db.query(models.OHLCVDaily).filter(
        models.OHLCVDaily.stock_id == stock_id
    ).order_by(models.OHLCVDaily.date).all()

    if not rows or len(rows) < 50:
        return pd.DataFrame()

    df = pd.DataFrame([{
        "close": r.close, "high": r.high, "low": r.low, "volume": r.volume
    } for r in rows])

    close = df["close"]
    df["rsi"] = ta_lib.momentum.RSIIndicator(close).rsi()
    df["ma20"] = ta_lib.trend.SMAIndicator(close, window=20).sma_indicator()
    df["ma50"] = ta_lib.trend.SMAIndicator(close, window=50).sma_indicator()
    df["ma200"] = ta_lib.trend.SMAIndicator(close, window=200).sma_indicator()
    df["ema12"] = ta_lib.trend.EMAIndicator(close, window=12).ema_indicator()
    df["ema26"] = ta_lib.trend.EMAIndicator(close, window=26).ema_indicator()
    macd = ta_lib.trend.MACD(close)
    df["macd_line"] = macd.macd()
    df["macd_sig"] = macd.macd_signal()
    df["macd_hist"] = macd.macd_diff()
    bb = ta_lib.volatility.BollingerBands(close)
    df["bb_low"] = bb.bollinger_lband()
    df["bb_high"] = bb.bollinger_hband()
    stoch = ta_lib.momentum.StochasticOscillator(df["high"], df["low"], close)
    df["stoch_k"] = stoch.stoch()
    df["vol_ma20"] = ta_lib.trend.SMAIndicator(df["volume"], window=20).sma_indicator()

    return df


@mcp.tool()
def list_available_stocks() -> str:
    """List all stocks in the database with basic fundamentals."""
    db = SessionLocal()
    try:
        stocks = db.query(models.Stock).filter(models.Stock.ticker != "^JKSE").all()
        result = [
            {
                "ticker": s.ticker,
                "name": s.name,
                "sector": s.sector,
                "pe_ratio": s.pe_ratio,
                "pbv_ratio": s.pbv_ratio,
                "dividend_yield": s.dividend_yield,
            }
            for s in stocks
        ]
        return json.dumps(result)
    finally:
        db.close()


@mcp.tool()
def analyze_stock(ticker: str) -> str:
    """
    Analyze a single stock: current price, all technical indicators, and active strategy signals.
    Use this BEFORE executing a trade to understand the current market condition.
    """
    db = SessionLocal()
    ticker = ticker.upper()
    try:
        stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
        if not stock:
            return f"Stock {ticker} not found."

        df = _build_indicator_df(db, stock.id)
        if df.empty:
            return f"Insufficient data for {ticker} (need at least 50 candles)."

        curr = df.iloc[-1]
        prev = df.iloc[-2]

        active_signals = [s for s in ALL_STRATEGIES if check_strategy_active(df, s)]

        result = {
            "ticker": ticker,
            "name": stock.name,
            "sector": stock.sector,
            "fundamentals": {
                "pe_ratio": stock.pe_ratio,
                "pbv_ratio": stock.pbv_ratio,
                "dividend_yield": stock.dividend_yield,
            },
            "price": {
                "current": float(curr["close"]),
                "change_pct": round(float((curr["close"] - prev["close"]) / prev["close"] * 100), 2),
            },
            "indicators": {
                "rsi": round(float(curr["rsi"]), 2),
                "macd_hist": round(float(curr["macd_hist"]), 4),
                "macd_line": round(float(curr["macd_line"]), 4),
                "ma20": round(float(curr["ma20"]), 2),
                "ma50": round(float(curr["ma50"]), 2),
                "ma200": round(float(curr["ma200"]), 2),
                "bb_low": round(float(curr["bb_low"]), 2),
                "bb_high": round(float(curr["bb_high"]), 2),
                "stoch_k": round(float(curr["stoch_k"]), 2),
                "vol_surge": round(float(curr["volume"] / curr["vol_ma20"]) if curr["vol_ma20"] > 0 else 1.0, 2),
            },
            "active_signals": active_signals,
            "signal_count": len(active_signals),
        }
        return json.dumps(result, indent=2)
    finally:
        db.close()


@mcp.tool()
def execute_ai_trade(ticker: str, action: str, quantity_lots: int, agent_name: str, notes: str = "") -> str:
    """
    Execute a trade as an AI Agent.
    - ticker: stock ticker (e.g. BBRI, TLKM)
    - action: BUY or SELL
    - quantity_lots: number of lots (1 lot = 100 shares)
    - agent_name: CLAUDE or GEMINI
    - notes: reasoning or strategy used
    Trade will appear in the agent's portfolio on the frontend.
    """
    db = SessionLocal()
    ticker = ticker.upper()
    agent_name = agent_name.upper()

    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
    if not stock:
        return f"ERROR: Stock {ticker} not found in database."

    latest = (
        db.query(models.OHLCVDaily)
        .filter(models.OHLCVDaily.stock_id == stock.id)
        .order_by(desc(models.OHLCVDaily.date))
        .first()
    )
    if not latest:
        return f"ERROR: No market price data available for {ticker}."

    price = latest.close
    new_trade = models.TradeLog(
        stock_id=stock.id,
        action=action.upper(),
        date=date.today(),
        price=price,
        quantity=quantity_lots,
        trade_type=f"AUTO_{agent_name}",
        notes=f"[{agent_name} AI] {notes}",
    )

    try:
        db.add(new_trade)
        db.commit()
        total_value = price * quantity_lots * 100
        return (
            f"SUCCESS: {agent_name} executed {action} {quantity_lots} lots of {ticker} "
            f"@ Rp {price:,.0f} — Total Rp {total_value:,.0f}"
        )
    except Exception as e:
        db.rollback()
        return f"ERROR: {str(e)}"
    finally:
        db.close()


@mcp.tool()
def ai_smart_trade_scan_and_execute(agent_name: str, max_trades: int = 3) -> str:
    """
    Scan the entire market and auto-execute trades for the specified agent.
    For each stock, finds the best-performing strategy via backtest and executes
    if that strategy's signal is active today.
    - agent_name: CLAUDE or GEMINI
    - max_trades: cap on executions per run (default 3)
    """
    db = SessionLocal()
    agent_name = agent_name.upper()
    stocks = db.query(models.Stock).all()

    executed = []

    for stock in stocks:
        if stock.ticker == "^JKSE" or len(executed) >= max_trades:
            continue

        # Find best strategy via backtest
        best_win_rate = 0.0
        best_strat_id = None
        for strat_id in ALL_STRATEGIES:
            res = bt_svc.run_backtest(db, stock.ticker, strat_id)
            wr = res.get("metrics", {}).get("win_rate", 0.0)
            if wr > best_win_rate:
                best_win_rate = wr
                best_strat_id = strat_id

        if not best_strat_id or best_win_rate <= 50:
            continue

        df = _build_indicator_df(db, stock.id)
        if df.empty:
            continue

        if check_strategy_active(df, best_strat_id):
            curr_price = float(df.iloc[-1]["close"])
            result = execute_ai_trade(
                stock.ticker,
                "BUY",
                10,
                agent_name,
                f"Auto via {best_strat_id} (WR: {best_win_rate:.1f}%)",
            )
            executed.append(
                f"{stock.ticker} [{best_strat_id}, WR:{best_win_rate:.0f}%] @ Rp {curr_price:,.0f}"
            )

    db.close()

    if executed:
        lines = "\n".join(f"  - {e}" for e in executed)
        return f"SCAN COMPLETE: {agent_name} executed {len(executed)} trade(s):\n{lines}"
    return f"SCAN COMPLETE: {agent_name} found no high-probability signals across {len(stocks)} stocks."


@mcp.tool()
def get_portfolio_summary(agent_name: str) -> str:
    """
    Get full portfolio summary for a specific agent: open positions, unrealized P&L, realized P&L.
    - agent_name: CLAUDE, GEMINI, or USER
    """
    db = SessionLocal()
    agent_name = agent_name.upper()

    try:
        trades = db.query(models.TradeLog).order_by(models.TradeLog.date).all()
        holdings: Dict[str, dict] = {}

        for t in trades:
            raw_type = t.trade_type.upper()
            if agent_name == "CLAUDE" and "CLAUDE" not in raw_type:
                continue
            if agent_name == "GEMINI" and "GEMINI" not in raw_type:
                continue
            if agent_name == "USER" and ("CLAUDE" in raw_type or "GEMINI" in raw_type):
                continue

            ticker = t.stock.ticker
            if ticker not in holdings:
                holdings[ticker] = {"shares": 0, "avg_price": 0.0, "realized_pnl": 0.0}

            data = holdings[ticker]
            qty = t.quantity * 100
            if t.action == "BUY":
                total_cost = (data["shares"] * data["avg_price"]) + (qty * t.price)
                data["shares"] += qty
                data["avg_price"] = total_cost / data["shares"] if data["shares"] > 0 else 0.0
            else:
                data["realized_pnl"] += (t.price - data["avg_price"]) * qty
                data["shares"] -= qty

        positions = []
        total_unrealized = 0.0
        total_realized = 0.0

        for ticker, data in holdings.items():
            if data["shares"] <= 0 and data["realized_pnl"] == 0.0:
                continue

            stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
            latest = (
                db.query(models.OHLCVDaily)
                .filter(models.OHLCVDaily.stock_id == stock.id)
                .order_by(desc(models.OHLCVDaily.date))
                .first()
            )
            current_price = latest.close if latest else data["avg_price"]
            unrealized = (current_price - data["avg_price"]) * data["shares"]
            market_value = current_price * data["shares"]

            total_unrealized += unrealized
            total_realized += data["realized_pnl"]

            unrealized_pct = 0.0
            if data["shares"] > 0 and data["avg_price"] > 0:
                unrealized_pct = round(unrealized / (data["avg_price"] * data["shares"]) * 100, 2)

            positions.append({
                "ticker": ticker,
                "name": stock.name,
                "lots": data["shares"] // 100,
                "shares": data["shares"],
                "avg_buy_price": round(data["avg_price"], 2),
                "current_price": current_price,
                "market_value": round(market_value, 2),
                "unrealized_pnl": round(unrealized, 2),
                "unrealized_pct": unrealized_pct,
                "realized_pnl": round(data["realized_pnl"], 2),
            })

        result = {
            "agent": agent_name,
            "summary": {
                "open_positions": len([p for p in positions if p["shares"] > 0]),
                "total_unrealized_pnl": round(total_unrealized, 2),
                "total_realized_pnl": round(total_realized, 2),
                "total_pnl": round(total_unrealized + total_realized, 2),
            },
            "positions": positions,
        }
        return json.dumps(result, indent=2)
    finally:
        db.close()


@mcp.tool()
def get_trade_history(agent_name: str, limit: int = 20) -> str:
    """
    Get recent trade history for a specific agent.
    - agent_name: CLAUDE, GEMINI, or USER
    - limit: number of trades to return (default 20)
    """
    db = SessionLocal()
    agent_name = agent_name.upper()

    try:
        all_trades = (
            db.query(models.TradeLog)
            .order_by(desc(models.TradeLog.date), desc(models.TradeLog.id))
            .limit(limit * 4)
            .all()
        )

        result = []
        for t in all_trades:
            raw_type = t.trade_type.upper()
            if agent_name == "CLAUDE" and "CLAUDE" not in raw_type:
                continue
            if agent_name == "GEMINI" and "GEMINI" not in raw_type:
                continue
            if agent_name == "USER" and ("CLAUDE" in raw_type or "GEMINI" in raw_type):
                continue

            result.append({
                "date": str(t.date),
                "ticker": t.stock.ticker,
                "action": t.action,
                "price": t.price,
                "quantity_lots": t.quantity,
                "total_value": t.price * t.quantity * 100,
                "notes": t.notes,
            })

            if len(result) >= limit:
                break

        return json.dumps(result, indent=2)
    finally:
        db.close()


if __name__ == "__main__":
    mcp.run()

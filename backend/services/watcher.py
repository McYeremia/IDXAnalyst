import pandas as pd
import sys
import os
import ta as ta_lib
from sqlalchemy.orm import Session

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal
import models

def check_strategy_active(df: pd.DataFrame, strategy_id: str) -> bool:
    if df.empty or len(df) < 2: return False
    curr = df.iloc[-1]
    prev = df.iloc[-2]
    price = curr['close']

    try:
        if strategy_id == "triple-confirmation":
            return curr['rsi'] < 45 and curr['macd_hist'] > 0 and price > curr['ma20']
        if strategy_id == "volatility-sniper":
            return price < curr['bb_low'] and curr['stoch_k'] < 20
        if strategy_id == "institutional-trend":
            return price > curr['ma200'] and curr['ema12'] > curr['ema26'] and prev['ema12'] <= prev['ema26']
        if strategy_id == "exhaustion-play":
            return curr['rsi'] < 25 and price < curr['bb_low']
        if strategy_id == "trend-accelerator":
            return curr['macd_hist'] > 0 and price > curr['ma50'] and curr['volume'] > curr.get('vol_ma20', 0)
        if strategy_id == "pure-momentum":
            return curr['ema12'] > curr['ema26'] and curr['macd_line'] > curr['macd_sig']
        if strategy_id == "defensive-bull":
            return curr['ma50'] > curr['ma200'] and curr['rsi'] > 50
        if strategy_id == "stoch-rsi-hybrid":
            return curr['stoch_k'] > 20 and prev['stoch_k'] <= 20 and curr['rsi'] > 30
        if strategy_id == "rsi-reversion":
            return curr['rsi'] < 30
        if strategy_id == "ma-cross":
            return curr['ma20'] > curr['ma50'] and prev['ma20'] <= prev['ma50']
    except:
        return False
    return False

def screen_by_strategy(db: Session, strategy_id: str):
    stocks = db.query(models.Stock).all()
    matches = []
    
    for stock in stocks:
        if stock.ticker == "^JKSE": continue
        rows = db.query(models.OHLCVDaily).filter(models.OHLCVDaily.stock_id == stock.id).order_by(models.OHLCVDaily.date).all()
        if not rows or len(rows) < 50: continue
        
        df = pd.DataFrame([{
            "close": r.close, "high": r.high, "low": r.low, "volume": r.volume
        } for r in rows])

        # Pre-calculate
        close = df['close']
        df['rsi'] = ta_lib.momentum.RSIIndicator(close).rsi()
        df['ma20'] = ta_lib.trend.SMAIndicator(close, window=20).sma_indicator()
        df['ma50'] = ta_lib.trend.SMAIndicator(close, window=50).sma_indicator()
        df['ma200'] = ta_lib.trend.SMAIndicator(close, window=200).sma_indicator()
        df['ema12'] = ta_lib.trend.EMAIndicator(close, window=12).ema_indicator()
        df['ema26'] = ta_lib.trend.EMAIndicator(close, window=26).ema_indicator()
        macd = ta_lib.trend.MACD(close)
        df['macd_line'] = macd.macd()
        df['macd_sig'] = macd.macd_signal()
        df['macd_hist'] = macd.macd_diff()
        bb = ta_lib.volatility.BollingerBands(close)
        df['bb_low'] = bb.bollinger_lband()
        df['bb_high'] = bb.bollinger_hband()
        stoch = ta_lib.momentum.StochasticOscillator(df['high'], df['low'], close)
        df['stoch_k'] = stoch.stoch()
        df['vol_ma20'] = ta_lib.trend.SMAIndicator(df['volume'], window=20).sma_indicator()

        if check_strategy_active(df, strategy_id):
            curr = df.iloc[-1]
            # Kirim data indikator lengkap agar frontend bisa pilih kolom
            matches.append({
                "ticker": stock.ticker,
                "name": stock.name,
                "Price": float(curr['close']),
                "PBV": float(stock.pbv_ratio or 0),
                "PE": float(stock.pe_ratio or 0),
                "RSI": float(curr['rsi']),
                "MACD_Hist": float(curr['macd_hist']),
                "MACD_Line": float(curr['macd_line']),
                "MA20_Dist": float((curr['close'] - curr['ma20'])/curr['ma20']*100),
                "MA50_Dist": float((curr['close'] - curr['ma50'])/curr['ma50']*100),
                "MA200_Dist": float((curr['close'] - curr['ma200'])/curr['ma200']*100),
                "BB_Dist": float((curr['close'] - curr['bb_low'])/curr['bb_low']*100),
                "Stoch_K": float(curr['stoch_k']),
                "ATR": float(ta_lib.volatility.AverageTrueRange(df['high'], df['low'], close).average_true_range().iloc[-1]),
                "Div_Yield": float(stock.dividend_yield or 0),
                "Vol_Surge": float(curr['volume'] / curr['vol_ma20'] if curr['vol_ma20'] > 0 else 1)
            })
            
    return matches

def check_strategy_exit(df: pd.DataFrame, strategy_id: str) -> bool:
    """Returns True if the exit condition for the given strategy is met."""
    if df.empty or len(df) < 2: return False
    curr = df.iloc[-1]
    prev = df.iloc[-2]
    price = curr['close']

    try:
        if strategy_id == "triple-confirmation":
            return curr['rsi'] > 70 or price < curr['ma20']
        if strategy_id == "volatility-sniper":
            return price > curr['bb_high']
        if strategy_id == "institutional-trend":
            return curr['ema12'] < curr['ema26']
        if strategy_id == "exhaustion-play":
            return curr['rsi'] > 60
        if strategy_id == "trend-accelerator":
            return curr['macd_hist'] < 0
        if strategy_id == "pure-momentum":
            return curr['macd_line'] < curr['macd_sig']
        if strategy_id == "defensive-bull":
            return curr['ma50'] < curr['ma200']
        if strategy_id == "stoch-rsi-hybrid":
            return curr['stoch_k'] > 80 or curr['rsi'] > 70
        if strategy_id == "rsi-reversion":
            return curr['rsi'] > 70
        if strategy_id == "ma-cross":
            return curr['ma20'] < curr['ma50']
    except:
        return False
    return False


def scan_market_signals():
    """Scan all stocks for active buy signals and save to Signal table."""
    from database import SessionLocal
    from sqlalchemy import func
    import models as mdl
    from datetime import datetime

    db = SessionLocal()
    count = 0
    try:
        stocks = db.query(mdl.Stock).filter(mdl.Stock.ticker != "^JKSE").all()
        for stock in stocks:
            rows = db.query(mdl.OHLCVDaily).filter(
                mdl.OHLCVDaily.stock_id == stock.id
            ).order_by(mdl.OHLCVDaily.date).all()

            if not rows or len(rows) < 50:
                continue

            df = pd.DataFrame([{
                "close": r.close, "high": r.high, "low": r.low, "volume": r.volume
            } for r in rows])

            close = df['close']
            df['rsi'] = ta_lib.momentum.RSIIndicator(close).rsi()
            df['ma20'] = ta_lib.trend.SMAIndicator(close, window=20).sma_indicator()
            df['ma50'] = ta_lib.trend.SMAIndicator(close, window=50).sma_indicator()
            df['ma200'] = ta_lib.trend.SMAIndicator(close, window=200).sma_indicator()
            df['ema12'] = ta_lib.trend.EMAIndicator(close, window=12).ema_indicator()
            df['ema26'] = ta_lib.trend.EMAIndicator(close, window=26).ema_indicator()
            macd = ta_lib.trend.MACD(close)
            df['macd_line'] = macd.macd()
            df['macd_sig'] = macd.macd_signal()
            df['macd_hist'] = macd.macd_diff()
            bb = ta_lib.volatility.BollingerBands(close)
            df['bb_low'] = bb.bollinger_lband()
            df['bb_high'] = bb.bollinger_hband()
            stoch = ta_lib.momentum.StochasticOscillator(df['high'], df['low'], close)
            df['stoch_k'] = stoch.stoch()
            df['vol_ma20'] = ta_lib.trend.SMAIndicator(df['volume'], window=20).sma_indicator()

            curr = df.iloc[-1]
            active = [s for s in [
                "triple-confirmation", "volatility-sniper", "institutional-trend",
                "exhaustion-play", "trend-accelerator", "pure-momentum",
                "defensive-bull", "stoch-rsi-hybrid", "rsi-reversion", "ma-cross"
            ] if check_strategy_active(df, s)]

            for strategy_id in active:
                rsi = float(curr['rsi'])
                strength = max(0, min(100, round(
                    (30 - rsi) / 30 * 60 + 40 if rsi < 30 else
                    (45 - rsi) / 45 * 40 + 20 if rsi < 45 else 30
                )))

                sig = mdl.Signal(
                    stock_id=stock.id,
                    strategy_id=strategy_id,
                    type="BUY",
                    price=float(curr['close']),
                    strength=strength,
                    description=f"{strategy_id} signal active | RSI:{rsi:.1f} | MACD:{float(curr['macd_hist']):.4f}",
                    created_at=datetime.now(),
                )
                db.add(sig)
                count += 1

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Scan error: {e}")
    finally:
        db.close()

    return count

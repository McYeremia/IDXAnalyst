import pandas as pd
import sys
import os
import ta as ta_lib

# Fix pathing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models

def calculate_score(df: pd.DataFrame, stock: models.Stock) -> float:
    if df.empty or len(df) < 2: return 0
    curr = df.iloc[-1]
    score = 0
    pbv = stock.pbv_ratio or 5.0
    if pbv < 2.0: score += 40
    elif pbv < 4.0: score += 20
    
    # Ambil RSI secara aman
    rsi = curr.get('rsi')
    if rsi is not None:
        if rsi < 35: score += 40 
        elif rsi < 50: score += 20
        
    return score

def scan_market_signals():
    db = SessionLocal()
    stocks = db.query(models.Stock).all()
    print(f"DEBUG: Starting scan for {len(stocks)} stocks...", flush=True)
    
    db.query(models.Signal).delete()
    db.commit()
    
    signals_found = 0
    
    for stock in stocks:
        if stock.ticker == "^JKSE": continue
        
        try:
            # Ambil data OHLCV manual agar pasti terbaca
            rows = db.query(models.OHLCVDaily).filter(models.OHLCVDaily.stock_id == stock.id).order_by(models.OHLCVDaily.date).all()
            if not rows or len(rows) < 50:
                continue
            
            df = pd.DataFrame([{
                "close": r.close, "high": r.high, "low": r.low, "volume": r.volume
            } for r in rows])

            # Pre-calculate
            df['rsi'] = ta_lib.momentum.RSIIndicator(df['close']).rsi()
            
            score = calculate_score(df, stock)
            
            # SANGAT LONGGAR untuk membuktikan scanner bekerja
            if score >= 20: 
                new_signal = models.Signal(
                    stock_id=stock.id,
                    strategy_id="ai-v4",
                    type="BUY" if score > 40 else "WATCH",
                    price=float(df['close'].iloc[-1]),
                    strength=float(score),
                    description=f"AI Scoring: {score}/100. Potential Value Asset."
                )
                db.add(new_signal)
                signals_found += 1
                print(f"DEBUG: FOUND {stock.ticker} (Score: {score})", flush=True)

        except Exception as e:
            print(f"DEBUG ERROR {stock.ticker}: {e}", flush=True)
            continue

    db.commit()
    db.close()
    print(f"DEBUG: SCAN FINISHED. Found {signals_found} signals.", flush=True)
    return signals_found

if __name__ == "__main__":
    scan_market_signals()

import os
import json
from datetime import date
from typing import Optional

from mcp.server.fastmcp import FastMCP
from sqlalchemy.orm import Session
from sqlalchemy import desc

import models
from database import SessionLocal
import services.indicators as ind_svc

# Inisialisasi FastMCP server
mcp = FastMCP("IDXAnalyst")

def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()

@mcp.tool()
def get_stock_summary(ticker: str) -> str:
    """
    Mendapatkan ringkasan harga terakhir dan indikator teknikal utama untuk saham tertentu.
    Ticker harus tanpa .JK (contoh: BBCA, ASII).
    """
    db = SessionLocal()
    ticker = ticker.upper()
    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
    
    if not stock:
        return f"Saham {ticker} tidak ditemukan di database IDX80."
    
    # Ambil harga terakhir
    latest = db.query(models.OHLCVDaily)\
               .filter(models.OHLCVDaily.stock_id == stock.id)\
               .order_by(desc(models.OHLCVDaily.date)).first()
    
    if not latest:
        return f"Data harga untuk {ticker} belum tersedia."
    
    # Hitung indikator
    indicators = ind_svc.calculate_indicators(db, stock)
    
    summary = {
        "ticker": ticker,
        "name": stock.name,
        "sector": stock.sector,
        "last_price": latest.close,
        "date": str(latest.date),
        "indicators": indicators
    }
    
    db.close()
    return json.dumps(summary, indent=2)

@mcp.tool()
def get_historical_data(ticker: str, days: int = 30) -> str:
    """
    Mendapatkan data harian (OHLCV) untuk saham tertentu selama N hari terakhir.
    Berguna untuk analisis tren atau pola candlestick.
    """
    db = SessionLocal()
    ticker = ticker.upper()
    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
    
    if not stock:
        return f"Saham {ticker} tidak ditemukan."
    
    rows = db.query(models.OHLCVDaily)\
             .filter(models.OHLCVDaily.stock_id == stock.id)\
             .order_by(desc(models.OHLCVDaily.date))\
             .limit(days).all()
    
    data = [{
        "date": str(r.date),
        "open": r.open,
        "high": r.high,
        "low": r.low,
        "close": r.close,
        "volume": r.volume
    } for r in reversed(rows)]
    
    db.close()
    return json.dumps(data, indent=2)

@mcp.tool()
def execute_simulated_trade(ticker: str, action: str, quantity_lots: int, price: Optional[float] = None, notes: str = "") -> str:
    """
    Mencatat transaksi simulasi (Paper Trading).
    - action: 'BUY' atau 'SELL'
    - quantity_lots: Jumlah lot (1 lot = 100 lembar)
    - price: Harga transaksi. Jika kosong, akan menggunakan harga closing terakhir.
    """
    db = SessionLocal()
    ticker = ticker.upper()
    action = action.upper()
    
    if action not in ["BUY", "SELL"]:
        return "Action harus BUY atau SELL."
    
    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
    if not stock:
        return f"Saham {ticker} tidak ditemukan."
    
    # Jika harga tidak ditentukan, ambil harga terakhir
    if price is None:
        latest = db.query(models.OHLCVDaily)\
                   .filter(models.OHLCVDaily.stock_id == stock.id)\
                   .order_by(desc(models.OHLCVDaily.date)).first()
        if not latest:
            return "Tidak dapat menemukan harga market terakhir. Harap tentukan harga manual."
        price = latest.close
    
    new_trade = models.TradeLog(
        stock_id=stock.id,
        action=action,
        date=date.today(),
        price=price,
        quantity=quantity_lots,
        trade_type="MANUAL",
        notes=notes
    )
    
    try:
        db.add(new_trade)
        db.commit()
        res = f"Berhasil mencatat simulasi {action} {ticker}: {quantity_lots} lot pada harga {price}."
    except Exception as e:
        db.rollback()
        res = f"Gagal mencatat transaksi: {str(e)}"
    finally:
        db.close()
        
    return res

@mcp.tool()
def get_portfolio_status() -> str:
    """
    Melihat semua posisi terbuka dan ringkasan P&L dari simulasi trading.
    """
    db = SessionLocal()
    trades = db.query(models.TradeLog).order_by(models.TradeLog.date).all()
    
    if not trades:
        return "Belum ada riwayat transaksi simulasi."
    
    # Logic sederhana untuk menghitung posisi (perlu pengembangan lebih lanjut untuk FIFO)
    portfolio = {}
    for t in trades:
        ticker = t.stock.ticker
        if ticker not in portfolio:
            portfolio[ticker] = {"shares": 0, "avg_price": 0.0, "realized_pnl": 0.0}
        
        qty = t.quantity * 100
        if t.action == "BUY":
            total_cost = (portfolio[ticker]["shares"] * portfolio[ticker]["avg_price"]) + (qty * t.price)
            portfolio[ticker]["shares"] += qty
            portfolio[ticker]["avg_price"] = total_cost / portfolio[ticker]["shares"]
        else:
            profit = (t.price - portfolio[ticker]["avg_price"]) * qty
            portfolio[ticker]["shares"] -= qty
            portfolio[ticker]["realized_pnl"] += profit
            
    # Ambil harga market terakhir untuk unrealized pnl
    summary = []
    for ticker, data in portfolio.items():
        if data["shares"] > 0:
            stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
            latest = db.query(models.OHLCVDaily).filter(models.OHLCVDaily.stock_id == stock.id).order_by(desc(models.OHLCVDaily.date)).first()
            current_price = latest.close if latest else data["avg_price"]
            unrealized = (current_price - data["avg_price"]) * data["shares"]
            
            summary.append({
                "ticker": ticker,
                "shares": data["shares"],
                "avg_buy_price": round(data["avg_price"], 2),
                "current_price": current_price,
                "unrealized_pnl": round(unrealized, 2),
                "realized_pnl": round(data["realized_pnl"], 2)
            })
        elif data["realized_pnl"] != 0:
            summary.append({
                "ticker": ticker,
                "shares": 0,
                "realized_pnl": round(data["realized_pnl"], 2)
            })
            
    db.close()
    return json.dumps(summary, indent=2)

if __name__ == "__main__":
    mcp.run()

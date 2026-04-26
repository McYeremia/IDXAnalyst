from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import yfinance as yf

import models
import services.data_fetcher as fetcher
import services.indicators as ind_svc
from database import get_db

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("")
def list_stocks(db: Session = Depends(get_db)):
    stocks = db.query(models.Stock).order_by(models.Stock.ticker).all()
    result = []
    for stock in stocks:
        latest = (
            db.query(models.OHLCVDaily)
            .filter(models.OHLCVDaily.stock_id == stock.id)
            .order_by(models.OHLCVDaily.date.desc())
            .first()
        )
        result.append({
            "ticker": stock.ticker,
            "name": stock.name,
            "sector": stock.sector,
            "last_price": latest.close if latest else None,
            "last_date": str(latest.date) if latest else None,
        })
    return result

@router.post("/{ticker}")
def add_custom_stock(ticker: str, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    # Cek apakah sudah ada
    existing = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
    if existing:
        return {"status": "exists", "ticker": ticker}
    
    # Ambil info dari yfinance
    try:
        yf_ticker = yf.Ticker(f"{ticker}.JK")
        info = yf_ticker.info
        
        # Jika tidak ketemu dengan .JK, coba tanpa suffix (untuk US stocks)
        if not info or 'longName' not in info:
            yf_ticker = yf.Ticker(ticker)
            info = yf_ticker.info
            
        if not info or 'longName' not in info:
            raise HTTPException(status_code=404, detail="Stock not found on Yahoo Finance")

        new_stock = models.Stock(
            ticker=ticker,
            name=info.get('longName', ticker),
            sector=info.get('sector', 'Unknown'),
            market_cap_cat="custom"
        )
        db.add(new_stock)
        db.commit()
        db.refresh(new_stock)
        
        # Trigger refresh data awal (5 tahun)
        df = fetcher.fetch_ohlcv(ticker)
        fetcher.save_ohlcv(db, new_stock, df)
        
        return {"status": "added", "ticker": ticker, "name": new_stock.name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{ticker}/ohlcv")
def get_ohlcv(
    ticker: str,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker.upper()} not found")

    query = db.query(models.OHLCVDaily).filter(models.OHLCVDaily.stock_id == stock.id)
    if from_date:
        query = query.filter(models.OHLCVDaily.date >= from_date)
    if to_date:
        query = query.filter(models.OHLCVDaily.date <= to_date)

    rows = query.order_by(models.OHLCVDaily.date).all()
    return {
        "ticker": stock.ticker,
        "name": stock.name,
        "data": [
            {"date": str(r.date), "open": r.open, "high": r.high,
             "low": r.low, "close": r.close, "volume": r.volume}
            for r in rows
        ],
    }


@router.get("/{ticker}/indicators")
def get_indicators(ticker: str, db: Session = Depends(get_db)):
    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker.upper()} not found")
    return {"ticker": stock.ticker, "indicators": ind_svc.calculate_indicators(db, stock)}


@router.post("/refresh")
def refresh_all(db: Session = Depends(get_db)):
    fetcher.seed_stocks(db)
    results = {}
    for stock in db.query(models.Stock).all():
        try:
            df = fetcher.fetch_ohlcv(stock.ticker)
            count = fetcher.save_ohlcv(db, stock, df)
            results[stock.ticker] = {"status": "ok", "new_rows": count}
        except Exception as e:
            results[stock.ticker] = {"status": "error", "error": str(e)}
    return results


@router.post("/{ticker}/refresh")
def refresh_stock(ticker: str, db: Session = Depends(get_db)):
    stock = db.query(models.Stock).filter(models.Stock.ticker == ticker.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock {ticker.upper()} not found")
    try:
        df = fetcher.fetch_ohlcv(stock.ticker)
        count = fetcher.save_ohlcv(db, stock, df)
        return {"ticker": stock.ticker, "status": "ok", "new_rows": count}
    except Exception as e:
        return {"ticker": stock.ticker, "status": "error", "error": str(e)}

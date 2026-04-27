from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
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
            "market_cap": stock.market_cap,
            "pe_ratio": stock.pe_ratio,
            "pbv_ratio": stock.pbv_ratio,
            "dividend_yield": stock.dividend_yield
        })
    return result


# Static paths must come BEFORE parameterized /{ticker} routes
@router.get("/signals")
def get_ai_signals(db: Session = Depends(get_db)):
    signals = db.query(models.Signal).order_by(desc(models.Signal.created_at)).limit(20).all()
    result = []
    for s in signals:
        result.append({
            "ticker": s.stock.ticker,
            "type": s.type,
            "strategy": s.strategy_id,
            "description": s.description,
            "strength": s.strength,
            "date": s.created_at.strftime("%Y-%m-%d %H:%M")
        })
    return result


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


@router.post("/scan")
def trigger_scan(db: Session = Depends(get_db)):
    import services.watcher as watcher
    print("LOG: Triggering AI Market Scan via API...")
    count = watcher.scan_market_signals()
    return {"status": "ok", "message": f"Scan complete. Found {count} signals."}


# Parameterized routes after static ones
@router.post("/{ticker}")
def add_custom_stock(ticker: str, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    existing = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
    if existing:
        return {"status": "exists", "ticker": ticker}

    try:
        yf_ticker = yf.Ticker(f"{ticker}.JK")
        info = yf_ticker.info

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

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

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


# /refresh harus di atas /{ticker}/refresh agar tidak bentrok routing
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

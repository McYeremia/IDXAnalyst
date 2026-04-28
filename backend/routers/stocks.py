from datetime import date, timedelta
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import yfinance as yf

import models
import services.data_fetcher as fetcher
import services.indicators as ind_svc
from database import get_db

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("")
def list_stocks(db: Session = Depends(get_db)):
    stocks = db.query(models.Stock).order_by(models.Stock.ticker).all()

    # Satu query untuk semua latest OHLCV — hindari N+1
    latest_subq = (
        db.query(
            models.OHLCVDaily.stock_id,
            func.max(models.OHLCVDaily.date).label("max_date"),
        )
        .group_by(models.OHLCVDaily.stock_id)
        .subquery()
    )
    latest_rows = (
        db.query(models.OHLCVDaily)
        .join(latest_subq, (models.OHLCVDaily.stock_id == latest_subq.c.stock_id)
              & (models.OHLCVDaily.date == latest_subq.c.max_date))
        .all()
    )
    latest_map = {row.stock_id: row for row in latest_rows}

    result = []
    for stock in stocks:
        latest = latest_map.get(stock.id)
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
    signals = db.query(models.Signal).order_by(desc(models.Signal.created_at)).all()
    grouped: dict = {}
    for s in signals:
        ticker = s.stock.ticker
        if ticker not in grouped:
            grouped[ticker] = {
                "ticker": ticker,
                "type": s.type,
                "strategies": [],
                "max_strength": 0,
                "date": s.created_at.strftime("%Y-%m-%d %H:%M"),
            }
        grouped[ticker]["strategies"].append(s.strategy_id)
        if s.strength > grouped[ticker]["max_strength"]:
            grouped[ticker]["max_strength"] = s.strength
    return [
        g for g in sorted(grouped.values(), key=lambda x: x["max_strength"], reverse=True)
        if g["max_strength"] >= 80
    ]


def _fetch_only(ticker: str, start_date: date | None) -> tuple:
    """Hanya fetch HTTP dari Yahoo Finance — tanpa sentuh DB sama sekali."""
    try:
        if start_date is not None:
            df = fetcher.fetch_ohlcv(ticker, start=start_date)
        else:
            df = fetcher.fetch_ohlcv(ticker, period="5y")
        return ticker, df, None
    except Exception as e:
        return ticker, None, str(e)


@router.post("/refresh")
def refresh_all(db: Session = Depends(get_db)):
    fetcher.seed_stocks(db)
    stocks = db.query(models.Stock).all()

    # Ambil tanggal terakhir semua saham sekaligus — 1 query agregat
    from sqlalchemy import func
    latest_map: dict[int, date] = dict(
        db.query(models.OHLCVDaily.stock_id, func.max(models.OHLCVDaily.date))
        .group_by(models.OHLCVDaily.stock_id)
        .all()
    )

    # Tentukan start_date per saham (tanpa buka koneksi baru)
    fetch_tasks = []
    for stock in stocks:
        ld = latest_map.get(stock.id)
        start = ld if ld is not None and ld <= date.today() else None
        fetch_tasks.append((stock, start))

    # --- FASE 1: Fetch HTTP paralel, TANPA DB ---
    fetched: dict[int, tuple] = {}   # stock_id -> (df, error)
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(_fetch_only, stock.ticker, start): stock
            for stock, start in fetch_tasks
        }
        for future in as_completed(futures):
            stock = futures[future]
            _, df, err = future.result()
            fetched[stock.id] = (df, err)

    # --- FASE 2: Write DB sequential — SQLite hanya 1 writer ---
    results = {}
    for stock in stocks:
        df, err = fetched.get(stock.id, (None, "fetch not found"))
        if err:
            results[stock.ticker] = {"status": "error", "error": err}
            continue
        if df is None or df.empty:
            results[stock.ticker] = {"status": "ok", "new_rows": 0, "note": "no data"}
            continue
        try:
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

import os
import json
from datetime import date, timedelta

import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session

import models

def load_idx80() -> list[dict]:
    path = os.path.join(os.path.dirname(__file__), "../data/idx80.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def seed_stocks(db: Session) -> None:
    existing = {s.ticker for s in db.query(models.Stock).all()}
    new = [
        models.Stock(ticker=s["ticker"], name=s["name"], sector=s["sector"], market_cap_cat="large")
        for s in load_idx80() if s["ticker"] not in existing
    ]
    if new:
        db.add_all(new)
        db.commit()

def fetch_ohlcv(ticker: str, days: int = 365 * 5) -> pd.DataFrame:
    end = date.today()
    start = end - timedelta(days=days)
    df = yf.download(f"{ticker}.JK", start=start, end=end, progress=False, auto_adjust=True)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    return df

def save_ohlcv(db: Session, stock: models.Stock, df: pd.DataFrame) -> int:
    existing = {
        r.date for r in
        db.query(models.OHLCVDaily.date).filter(models.OHLCVDaily.stock_id == stock.id)
    }
    rows = []
    for ts, row in df.iterrows():
        d = ts.date() if hasattr(ts, "date") else ts
        if d in existing:
            continue
        rows.append(models.OHLCVDaily(
            stock_id=stock.id, date=d,
            open=float(row.get("Open") or 0),
            high=float(row.get("High") or 0),
            low=float(row.get("Low") or 0),
            close=float(row.get("Close") or 0),
            volume=int(row.get("Volume") or 0),
            adj_close=float(row.get("Adj Close") or row.get("Close") or 0),
        ))
    if rows:
        db.bulk_save_objects(rows)
        db.commit()
    return len(rows)

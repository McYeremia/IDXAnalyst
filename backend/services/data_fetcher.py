import yfinance as yf
import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models

def fetch_ohlcv(ticker: str, period: str = "5y") -> pd.DataFrame:
    """
    Fetch historical data from Yahoo Finance.
    """
    # Penanganan ticker: Jika tidak diawali ^ (index), tambahkan .JK untuk saham Indonesia
    symbol = ticker if ticker.startswith("^") else f"{ticker}.JK"
    
    try:
        df = yf.download(symbol, period=period, interval="1d", progress=False)
        return df
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return pd.DataFrame()

def save_ohlcv(db: Session, stock: models.Stock, df: pd.DataFrame) -> int:
    """
    Save OHLCV data to database, avoiding duplicates.
    """
    if df.empty:
        return 0

    count = 0
    for index, row in df.iterrows():
        # yfinance terbaru kadang mengembalikan MultiIndex atau Series
        # Kita pastikan mengambil nilai float murni
        try:
            # Handle possible Series or Single Value
            def get_val(val):
                if isinstance(val, pd.Series):
                    return float(val.iloc[0])
                return float(val)

            d = index.date() if hasattr(index, 'date') else index
            
            # Cek duplikat
            exists = db.query(models.OHLCVDaily).filter(
                models.OHLCVDaily.stock_id == stock.id,
                models.OHLCVDaily.date == d
            ).first()
            
            if not exists:
                new_row = models.OHLCVDaily(
                    stock_id=stock.id,
                    date=d,
                    open=get_val(row["Open"]),
                    high=get_val(row["High"]),
                    low=get_val(row["Low"]),
                    close=get_val(row["Close"]),
                    volume=int(get_val(row["Volume"])),
                    adj_close=get_val(row["Adj Close"]) if "Adj Close" in row else get_val(row["Close"])
                )
                db.add(new_row)
                count += 1
        except Exception as e:
            continue
            
    db.commit()
    # Update last_updated timestamp di tabel Stock
    stock.last_updated = datetime.now()
    db.commit()
    
    return count

def update_stock_fundamentals(db: Session, stock: models.Stock):
    """
    Fetch and update fundamental data for a stock.
    """
    symbol = stock.ticker if stock.ticker.startswith("^") else f"{stock.ticker}.JK"
    try:
        yf_ticker = yf.Ticker(symbol)
        info = yf_ticker.info
        
        stock.market_cap = info.get('marketCap')
        stock.pe_ratio = info.get('trailingPE')
        stock.pbv_ratio = info.get('priceToBook')
        stock.dividend_yield = info.get('dividendYield')
        stock.forward_pe = info.get('forwardPE')
        
        db.commit()
        return True
    except Exception as e:
        print(f"Error fundamental {stock.ticker}: {e}")
        return False

def seed_stocks(db: Session):
    """
    Initial seed for IDX80 if table is empty.
    """
    if db.query(models.Stock).count() > 0:
        return

    # Sederhanakan daftar awal, nanti akan ditambah via bulk script
    initial_stocks = [
        {"ticker": "BBCA", "name": "Bank Central Asia Tbk.", "sector": "Finance"},
        {"ticker": "BBRI", "name": "Bank Rakyat Indonesia (Persero) Tbk.", "sector": "Finance"},
        {"ticker": "TLKM", "name": "Telkom Indonesia (Persero) Tbk.", "sector": "Infrastruktur"},
        {"ticker": "ASII", "name": "Astra International Tbk.", "sector": "Industri"},
    ]
    
    for s in initial_stocks:
        new_stock = models.Stock(
            ticker=s["ticker"],
            name=s["name"],
            sector=s["sector"],
            market_cap_cat="major"
        )
        db.add(new_stock)
    db.commit()

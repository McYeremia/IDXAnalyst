import datetime
from sqlalchemy import Column, Integer, BigInteger, String, Float, Date, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from database import Base

class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    sector = Column(String(50), nullable=False)
    market_cap_cat = Column(String(10))
    last_updated = Column(DateTime)

    ohlcv = relationship("OHLCVDaily", back_populates="stock", cascade="all, delete-orphan")
    indicators = relationship("IndicatorCache", back_populates="stock", cascade="all, delete-orphan")

class OHLCVDaily(Base):
    __tablename__ = "ohlcv_daily"
    __table_args__ = (UniqueConstraint("stock_id", "date", name="uq_ohlcv_stock_date"),)

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float, nullable=False)
    volume = Column(BigInteger)
    adj_close = Column(Float)

    stock = relationship("Stock", back_populates="ohlcv")

class IndicatorCache(Base):
    __tablename__ = "indicators_cache"
    __table_args__ = (UniqueConstraint("stock_id", "date", "indicator_type", name="uq_indicator"),)

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    indicator_type = Column(String(30), nullable=False)
    value = Column(Float)
    calculated_at = Column(DateTime, server_default=func.now())

    stock = relationship("Stock", back_populates="indicators")

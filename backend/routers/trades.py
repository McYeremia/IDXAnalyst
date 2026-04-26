from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import date, timedelta
from pydantic import BaseModel
import pandas as pd

import models
from database import get_db

router = APIRouter(prefix="/trades", tags=["trades"])

class TradeRequest(BaseModel):
    ticker: str
    action: str
    quantity: int
    price: Optional[float] = None
    trade_type: str = "MANUAL" 
    notes: Optional[str] = None

def calculate_equity_curve(db: Session, agent_type: str, days: int = 30):
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    query = db.query(models.TradeLog).order_by(models.TradeLog.date)
    if agent_type == "GEMINI":
        query = query.filter(models.TradeLog.trade_type == "AUTO_GEMINI")
    elif agent_type == "CLAUDE":
        query = query.filter(models.TradeLog.trade_type == "AUTO_CLAUDE")
    else:
        query = query.filter(models.TradeLog.trade_type == "MANUAL")
    
    trades = query.all()
    if not trades:
        return []

    history = []
    current_cash = 100_000_000 # 100M Starting Capital
    holdings = {} 
    
    date_range = pd.date_range(start=start_date, end=end_date)
    for d in date_range:
        d_date = d.date()
        current_holdings_value = 0
        daily_trades = [t for t in trades if t.date == d_date]
        for t in daily_trades:
            qty = t.quantity * 100
            if t.action == "BUY":
                current_cash -= (qty * t.price)
                holdings[t.stock_id] = holdings.get(t.stock_id, 0) + qty
            else:
                current_cash += (qty * t.price)
                holdings[t.stock_id] = holdings.get(t.stock_id, 0) - qty

        for s_id, shares in holdings.items():
            if shares > 0:
                price_row = db.query(models.OHLCVDaily).filter(
                    models.OHLCVDaily.stock_id == s_id,
                    models.OHLCVDaily.date <= d_date
                ).order_by(desc(models.OHLCVDaily.date)).first()
                if price_row:
                    current_holdings_value += (shares * price_row.close)
        
        history.append({"date": str(d_date), "value": float(current_cash + current_holdings_value)})
    return history

@router.get("/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    trades = db.query(models.TradeLog).order_by(models.TradeLog.date).all()
    
    portfolios = {"USER": {}, "GEMINI": {}, "CLAUDE": {}}
    for t in trades:
        raw_type = t.trade_type.upper()
        if "GEMINI" in raw_type: p_cat = "GEMINI"
        elif "CLAUDE" in raw_type: p_cat = "CLAUDE"
        else: p_cat = "USER"
        
        ticker = t.stock.ticker
        if ticker not in portfolios[p_cat]:
            portfolios[p_cat][ticker] = {"shares": 0, "avg_price": 0.0, "realized_pnl": 0.0}
        
        data = portfolios[p_cat][ticker]
        qty = t.quantity * 100
        if t.action == "BUY":
            total_cost = (data["shares"] * data["avg_price"]) + (qty * t.price)
            data["shares"] += qty
            data["avg_price"] = total_cost / data["shares"] if data["shares"] > 0 else 0
        else:
            # Profit/Loss realized saat jual
            data["realized_pnl"] += (t.price - data["avg_price"]) * qty
            data["shares"] -= qty
            
    summary = {"USER": [], "GEMINI": [], "CLAUDE": []}
    history = {}

    for p_cat in summary.keys():
        for ticker, data in portfolios[p_cat].items():
            if data["shares"] > 0 or data["realized_pnl"] != 0:
                stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
                latest = db.query(models.OHLCVDaily).filter(models.OHLCVDaily.stock_id == stock.id).order_by(desc(models.OHLCVDaily.date)).first()
                current_price = latest.close if latest else data["avg_price"]
                unrealized = (current_price - data["avg_price"]) * data["shares"]
                cost_basis = data["shares"] * data["avg_price"]
                
                summary[p_cat].append({
                    "ticker": ticker,
                    "shares": data["shares"],
                    "avg_buy_price": round(data["avg_price"], 2),
                    "cost_basis": round(cost_basis, 2), # Modal terpakai
                    "current_price": current_price,
                    "unrealized_pnl": round(unrealized, 2),
                    "realized_pnl": round(data["realized_pnl"], 2)
                })
        
        history[p_cat] = calculate_equity_curve(db, p_cat)
            
    return {"summary": summary, "history": history}

@router.post("")
def create_trade(req: TradeRequest, db: Session = Depends(get_db)):
    stock = db.query(models.Stock).filter(models.Stock.ticker == req.ticker.upper()).first()
    if not stock: raise HTTPException(status_code=404, detail="Stock not found")
    
    price = req.price
    if price is None:
        latest = db.query(models.OHLCVDaily).filter(models.OHLCVDaily.stock_id == stock.id).order_by(desc(models.OHLCVDaily.date)).first()
        price = latest.close if latest else 0
        
    new_trade = models.TradeLog(
        stock_id=stock.id, action=req.action.upper(), date=date.today(),
        price=price, quantity=req.quantity, trade_type=req.trade_type.upper(), notes=req.notes
    )
    db.add(new_trade)
    db.commit()
    return {"status": "ok"}

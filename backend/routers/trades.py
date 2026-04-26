from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import date
from pydantic import BaseModel

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

@router.get("/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    trades = db.query(models.TradeLog).order_by(models.TradeLog.date).all()
    
    # Portfolio structure: { "MANUAL": { ticker: data }, "AUTO": { ticker: data } }
    portfolios = {"MANUAL": {}, "AUTO": {}}
    
    for t in trades:
        t_type = t.trade_type.upper()
        if t_type not in portfolios: portfolios[t_type] = {}
        
        ticker = t.stock.ticker
        if ticker not in portfolios[t_type]:
            portfolios[t_type][ticker] = {"shares": 0, "avg_price": 0.0, "realized_pnl": 0.0}
        
        data = portfolios[t_type][ticker]
        qty = t.quantity * 100
        if t.action == "BUY":
            total_cost = (data["shares"] * data["avg_price"]) + (qty * t.price)
            data["shares"] += qty
            data["avg_price"] = total_cost / data["shares"] if data["shares"] > 0 else 0
        else:
            profit = (t.price - data["avg_price"]) * qty
            data["shares"] -= qty
            data["realized_pnl"] += profit
            
    result = {"MANUAL": [], "AUTO": []}
    
    for p_type in ["MANUAL", "AUTO"]:
        for ticker, data in portfolios[p_type].items():
            if data["shares"] > 0 or data["realized_pnl"] != 0:
                stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
                latest = db.query(models.OHLCVDaily).filter(models.OHLCVDaily.stock_id == stock.id).order_by(desc(models.OHLCVDaily.date)).first()
                current_price = latest.close if latest else data["avg_price"]
                unrealized = (current_price - data["avg_price"]) * data["shares"]
                
                result[p_type].append({
                    "ticker": ticker,
                    "shares": data["shares"],
                    "avg_buy_price": round(data["avg_price"], 2),
                    "current_price": current_price,
                    "unrealized_pnl": round(unrealized, 2),
                    "realized_pnl": round(data["realized_pnl"], 2)
                })
            
    return result

@router.post("")
def create_trade(req: TradeRequest, db: Session = Depends(get_db)):
    stock = db.query(models.Stock).filter(models.Stock.ticker == req.ticker.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
        
    price = req.price
    if price is None:
        latest = db.query(models.OHLCVDaily).filter(models.OHLCVDaily.stock_id == stock.id).order_by(desc(models.OHLCVDaily.date)).first()
        if not latest:
            raise HTTPException(status_code=400, detail="Price not provided and no market price found")
        price = latest.close
        
    new_trade = models.TradeLog(
        stock_id=stock.id,
        action=req.action.upper(),
        date=date.today(),
        price=price,
        quantity=req.quantity,
        trade_type=req.trade_type.upper(),
        notes=req.notes
    )
    
    db.add(new_trade)
    db.commit()
    return {"status": "ok", "trade_id": new_trade.id}

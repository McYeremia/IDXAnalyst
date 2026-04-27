from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import date
from pydantic import BaseModel
import models
from database import get_db

router = APIRouter(prefix="/trades", tags=["trades"])

INITIAL_MODAL = 15_000_000

class TradeRequest(BaseModel):
    ticker: str
    action: str
    quantity: int
    price: Optional[float] = None
    trade_type: str = "MANUAL"
    strategy_id: Optional[str] = "custom"
    notes: Optional[str] = ""


@router.get("/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    all_trades = db.query(models.TradeLog).order_by(models.TradeLog.date).all()

    raw_portfolios = {"USER": {}, "GEMINI": {}, "CLAUDE": {}}

    for t in all_trades:
        if t.trade_type == "AUTO_GEMINI": p_key = "GEMINI"
        elif t.trade_type == "AUTO_CLAUDE": p_key = "CLAUDE"
        else: p_key = "USER"

        ticker = t.stock.ticker
        if ticker not in raw_portfolios[p_key]:
            raw_portfolios[p_key][ticker] = {"shares": 0, "avg_price": 0.0, "realized_pnl": 0.0, "strategy": "", "notes": ""}

        data = raw_portfolios[p_key][ticker]
        qty = t.quantity * 100
        if t.action == "BUY":
            total_cost = (data["shares"] * data["avg_price"]) + (qty * t.price)
            data["shares"] += qty
            data["avg_price"] = total_cost / data["shares"] if data["shares"] > 0 else 0
            data["strategy"] = t.strategy_id
            data["notes"] = t.notes
        else:
            data["realized_pnl"] += (t.price - data["avg_price"]) * qty
            data["shares"] -= qty

    result = {}
    for key in ["USER", "GEMINI", "CLAUDE"]:
        summary_list = []
        invested = 0.0
        total_realized = 0.0
        total_unrealized = 0.0

        for ticker, data in raw_portfolios[key].items():
            total_realized += data["realized_pnl"]

            if data["shares"] > 0:
                stock = db.query(models.Stock).filter(models.Stock.ticker == ticker).first()
                latest = db.query(models.OHLCVDaily).filter(models.OHLCVDaily.stock_id == stock.id).order_by(desc(models.OHLCVDaily.date)).first()
                curr_price = latest.close if latest else data["avg_price"]
                last_date = str(latest.date) if latest else None

                cost_basis = data["shares"] * data["avg_price"]
                unrealized = (curr_price - data["avg_price"]) * data["shares"]

                invested += cost_basis
                total_unrealized += unrealized

                summary_list.append({
                    "ticker": ticker,
                    "shares": data["shares"],
                    "avg_price": round(data["avg_price"], 2),
                    "current_price": round(curr_price, 2),
                    "last_date": last_date,
                    "cost_basis": round(cost_basis, 2),
                    "unrealized_pnl": round(unrealized, 2),
                    "strategy": data["strategy"],
                    "notes": data["notes"]
                })

        liquid = INITIAL_MODAL - invested + total_realized
        total_value = INITIAL_MODAL + total_realized + total_unrealized

        result[key] = {
            "modal": round(liquid, 2),
            "invested": round(invested, 2),
            "unrealized": round(total_unrealized, 2),
            "realized": round(total_realized, 2),
            "total_value": round(total_value, 2),
            "assets": summary_list
        }

    return result


@router.get("/growth")
def get_portfolio_growth(db: Session = Depends(get_db)):
    """Returns equity curve snapshots per agent for growth chart."""
    all_trades = db.query(models.TradeLog).order_by(models.TradeLog.date).all()
    result = {}

    for agent_key in ["USER", "GEMINI", "CLAUDE"]:
        positions: Dict[str, dict] = {}
        cash = float(INITIAL_MODAL)
        date_values: Dict[str, float] = {}

        for t in all_trades:
            if t.trade_type == "AUTO_GEMINI": trade_agent = "GEMINI"
            elif t.trade_type == "AUTO_CLAUDE": trade_agent = "CLAUDE"
            else: trade_agent = "USER"

            if trade_agent != agent_key:
                continue

            ticker = t.stock.ticker
            qty = t.quantity * 100

            if t.action == "BUY":
                cash -= qty * t.price
                if ticker not in positions:
                    positions[ticker] = {"shares": 0, "avg_price": 0.0, "stock_id": t.stock_id}
                total_shares = positions[ticker]["shares"] + qty
                total_cost = positions[ticker]["shares"] * positions[ticker]["avg_price"] + qty * t.price
                positions[ticker]["shares"] = total_shares
                positions[ticker]["avg_price"] = total_cost / total_shares
            elif t.action == "SELL" and ticker in positions:
                cash += qty * t.price
                positions[ticker]["shares"] -= qty
                if positions[ticker]["shares"] <= 0:
                    del positions[ticker]

            holdings_value = 0.0
            for tk, pos in positions.items():
                if pos["shares"] > 0:
                    closest = (
                        db.query(models.OHLCVDaily)
                        .filter(models.OHLCVDaily.stock_id == pos["stock_id"])
                        .filter(models.OHLCVDaily.date <= t.date)
                        .order_by(desc(models.OHLCVDaily.date))
                        .first()
                    )
                    price = closest.close if closest else pos["avg_price"]
                    holdings_value += pos["shares"] * price

            date_str = str(t.date)
            date_values[date_str] = round(cash + holdings_value, 0)

        result[agent_key] = [
            {"date": d, "value": v}
            for d, v in sorted(date_values.items())
        ]

    return result


@router.get("/history")
def get_trade_history(agent: str = "USER", db: Session = Depends(get_db)):
    """Returns all trade logs for a given agent with P&L on sell trades."""
    all_trades = db.query(models.TradeLog).order_by(models.TradeLog.date, models.TradeLog.created_at).all()

    # Track positions per agent to calculate P&L on sells
    positions: Dict[str, Dict[str, dict]] = {"USER": {}, "GEMINI": {}, "CLAUDE": {}}
    agent_result = []

    for t in all_trades:
        if t.trade_type == "AUTO_GEMINI": trade_agent = "GEMINI"
        elif t.trade_type == "AUTO_CLAUDE": trade_agent = "CLAUDE"
        else: trade_agent = "USER"

        ticker = t.stock.ticker
        qty = t.quantity * 100
        pos = positions[trade_agent]

        pnl = None
        pnl_pct = None

        if t.action == "BUY":
            if ticker not in pos:
                pos[ticker] = {"shares": 0, "avg_price": 0.0}
            total_shares = pos[ticker]["shares"] + qty
            total_cost = pos[ticker]["shares"] * pos[ticker]["avg_price"] + qty * t.price
            pos[ticker]["shares"] = total_shares
            pos[ticker]["avg_price"] = total_cost / total_shares
        elif t.action == "SELL" and ticker in pos and pos[ticker]["avg_price"] > 0:
            avg_buy = pos[ticker]["avg_price"]
            pnl = (t.price - avg_buy) * qty
            pnl_pct = ((t.price - avg_buy) / avg_buy) * 100
            pos[ticker]["shares"] -= qty
            if pos[ticker]["shares"] <= 0:
                del pos[ticker]

        if trade_agent == agent.upper():
            agent_result.append({
                "id": t.id,
                "ticker": ticker,
                "action": t.action,
                "date": str(t.date),
                "price": t.price,
                "quantity": t.quantity,
                "total_value": round(t.price * qty, 2),
                "pnl": round(pnl, 2) if pnl is not None else None,
                "pnl_pct": round(pnl_pct, 2) if pnl_pct is not None else None,
                "strategy": t.strategy_id or "MANUAL",
                "notes": t.notes or "",
            })

    # Return most recent first
    return sorted(agent_result, key=lambda x: (x["date"], x["id"]), reverse=True)


@router.post("")
def create_trade(req: TradeRequest, db: Session = Depends(get_db)):
    stock = db.query(models.Stock).filter(models.Stock.ticker == req.ticker.upper()).first()
    if not stock: raise HTTPException(status_code=404, detail="Stock not found")

    price = req.price or 0
    if price == 0:
        latest = db.query(models.OHLCVDaily).filter(models.OHLCVDaily.stock_id == stock.id).order_by(desc(models.OHLCVDaily.date)).first()
        price = latest.close if latest else 0

    new_trade = models.TradeLog(
        stock_id=stock.id, action=req.action.upper(), date=date.today(),
        price=price, quantity=req.quantity, trade_type=req.trade_type.upper(),
        strategy_id=req.strategy_id, notes=req.notes
    )
    db.add(new_trade)
    db.commit()
    return {"status": "ok"}

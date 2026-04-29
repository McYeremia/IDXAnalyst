"use client";

import { useEffect, useRef } from "react";
import { createChart, createSeriesMarkers, CandlestickSeries, LineSeries, ColorType } from "lightweight-charts";

interface OHLCVRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  data: OHLCVRow[];
  indicators?: Record<string, number | null>;
  showMA20?: boolean;
  showMA50?: boolean;
  showEMA12?: boolean;
  height?: number;
  transparent?: boolean;
  markerDate?: string;
  markerColor?: string;
}

export default function StockChart({
  data,
  indicators = {},
  showMA20 = false,
  showMA50 = false,
  showEMA12 = false,
  height = 420,
  transparent = false,
  markerDate,
  markerColor = '#f59e0b',
}: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = createChart(chartRef.current, {
      layout: { 
        background: { 
          type: ColorType.Solid, 
          color: transparent ? "transparent" : "#0a0a0a" 
        }, 
        textColor: "#64748b" 
      },
      grid: { 
        vertLines: { color: "rgba(255, 255, 255, 0.03)" }, 
        horzLines: { color: "rgba(255, 255, 255, 0.03)" } 
      },
      width: chartRef.current.clientWidth,
      height: height,
      timeScale: { 
        borderColor: "rgba(255, 255, 255, 0.1)",
        barSpacing: 10,
      },
      rightPriceScale: { 
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", 
      downColor: "#ef4444",
      borderUpColor: "#22c55e", 
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", 
      wickDownColor: "#ef4444",
    });

    const candleData = data.map((r) => ({
      time: r.date as string,
      open: r.open, 
      high: r.high, 
      low: r.low, 
      close: r.close,
    }));
    candles.setData(candleData);

    // Trade marker (lightweight-charts v5 API)
    if (markerDate) {
      const markerExists = candleData.some(c => c.time === markerDate);
      if (markerExists) {
        const isBuy = markerColor === '#22c55e';
        createSeriesMarkers(candles, [{
          time: markerDate as any,
          position: isBuy ? 'belowBar' : 'aboveBar',
          color: markerColor,
          shape: isBuy ? 'arrowUp' : 'arrowDown',
          text: isBuy ? 'BUY' : 'SELL',
        }]);
      }
    }

    // MA20 overlay
    if (showMA20 && data.length >= 20) {
      const ma20 = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1 });
      const values: { time: string; value: number }[] = [];
      for (let i = 19; i < data.length; i++) {
        const avg = data.slice(i - 19, i + 1).reduce((s, r) => s + r.close, 0) / 20;
        values.push({ time: data[i].date, value: avg });
      }
      ma20.setData(values);
    }

    // MA50 overlay
    if (showMA50 && data.length >= 50) {
      const ma50 = chart.addSeries(LineSeries, { color: "#a78bfa", lineWidth: 1 });
      const values: { time: string; value: number }[] = [];
      for (let i = 49; i < data.length; i++) {
        const avg = data.slice(i - 49, i + 1).reduce((s, r) => s + r.close, 0) / 50;
        values.push({ time: data[i].date, value: avg });
      }
      ma50.setData(values);
    }

    // EMA12 overlay
    if (showEMA12 && data.length >= 12) {
      const ema12 = chart.addSeries(LineSeries, { color: "#38bdf8", lineWidth: 1 });
      const k = 2 / (12 + 1);
      let ema = data[0].close;
      const values: { time: string; value: number }[] = [];
      data.forEach((r) => {
        ema = r.close * k + ema * (1 - k);
        values.push({ time: r.date, value: ema });
      });
      ema12.setData(values);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, showMA20, showMA50, showEMA12, height, transparent, markerDate, markerColor]);

  return <div ref={chartRef} className="w-full" />;
}

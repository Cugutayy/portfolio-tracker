"use client";

import { useEffect, useRef, useState } from "react";

export interface LiveTick {
  price: number; // last price in USDT (≈ USD)
  chg: number; // 24h change %
}

/**
 * Live crypto prices straight from Binance's public WebSocket — streamed to the
 * browser, NOT through our backend (zero server load / cost). One connection
 * for all tickers; updates flushed at most once/second to bound re-renders;
 * auto-reconnects. Tickers without a USDT pair (e.g. HYPE) simply never tick.
 */
export function useLiveCrypto(tickers: string[]): Record<string, LiveTick> {
  const [map, setMap] = useState<Record<string, LiveTick>>({});
  const buf = useRef<Record<string, LiveTick>>({});
  const key = tickers.join(",");

  useEffect(() => {
    if (!tickers.length || typeof window === "undefined") return;
    const streams = tickers.map((t) => `${t.toLowerCase()}usdt@miniTicker`).join("/");
    let ws: WebSocket | null = null;
    let closed = false;

    const connect = () => {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      } catch {
        return;
      }
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data).data;
          if (!d || !d.s) return;
          const tk = String(d.s).replace("USDT", "");
          const price = Number(d.c);
          const open = Number(d.o);
          if (price > 0) buf.current[tk] = { price, chg: open > 0 ? ((price - open) / open) * 100 : 0 };
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        if (!closed) setTimeout(connect, 3000); // reconnect with backoff
      };
    };
    connect();

    const flush = setInterval(() => {
      if (Object.keys(buf.current).length) {
        setMap((m) => ({ ...m, ...buf.current }));
        buf.current = {};
      }
    }, 1000);

    return () => {
      closed = true;
      clearInterval(flush);
      ws?.close();
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return map;
}

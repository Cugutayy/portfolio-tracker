"use client";

import { useMemo, useState } from "react";
import { LEVERAGE_ASSETS, ASSET_BY_TICKER, TYPE_LABEL, type AssetType } from "@/lib/assets";
import { fmtAssetPrice } from "@/lib/format";
import { fmtMoney } from "@/lib/currency";
import { useT, useCurrency } from "@/components/Providers";

export interface PositionView {
  id: string;
  ticker: string;
  name: string;
  type: string;
  side: "long" | "short";
  leverage: number;
  quantity: number;
  entryPriceTry: number;
  priceTry: number;
  entryNative: number;
  priceNative: number;
  nativeCcy: string;
  marginTry: number;
  liquidationPriceTry: number;
  pnlTry: number;
  pnlPct: number;
  equityTry: number;
}
interface LivePrice {
  ticker: string;
  priceTry: number;
  nativePrice: number;
  nativeCcy: string;
  changePct: number | null;
}
type PortfolioLike = { cashTry: number; usdTry: number };

const num = (n: number, d = 2) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

export function FuturesPanel({
  positions,
  prices,
  pf,
  onPortfolio,
}: {
  positions: PositionView[];
  prices: Record<string, LivePrice>;
  pf: PortfolioLike;
  onPortfolio: (p: unknown) => void;
}) {
  const tx = useT();
  const cur = useCurrency();
  const ud = pf.usdTry ?? 0;
  const money = (n: number) => fmtMoney(n, cur, ud);

  const [selected, setSelected] = useState<string>("BTC");
  const [side, setSide] = useState<"long" | "short">("long");
  const [lev, setLev] = useState<number>(5);
  const [margin, setMargin] = useState<string>("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return LEVERAGE_ASSETS.filter(
      (a) =>
        !q ||
        a.ticker.toLocaleLowerCase("tr").includes(q) ||
        a.name.toLocaleLowerCase("tr").includes(q),
    );
  }, [query]);

  const asset = ASSET_BY_TICKER[selected];
  const lp = prices[selected];
  const entryTry = lp?.priceTry ?? 0;
  const ratio = lp && lp.priceTry > 0 ? lp.nativePrice / lp.priceTry : 0;
  const marginNum = Number((margin || "").replace(",", ".")) || 0;
  const notionalTry = marginNum * lev;
  const liqTry = side === "long" ? entryTry * (1 - 1 / lev) : entryTry * (1 + 1 / lev);
  const cashTry = pf.cashTry ?? 0;
  const insufficient = marginNum > cashTry + 1e-6;
  const atMax = positions.length >= 10;
  const block = atMax ? tx.fut_max_pos : insufficient ? tx.fut_insufficient : null;

  async function openPosition() {
    setMsg(null);
    if (!(marginNum > 0)) {
      setMsg({ kind: "err", text: tx.pc_msg_amount });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/positions/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: selected, side, leverage: lev, marginTry: marginNum }),
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg({ kind: "err", text: j.error ?? tx.pc_msg_fail });
      } else {
        onPortfolio(j.portfolio);
        setMargin("");
        setMsg({
          kind: "ok",
          text: `${tx.fut_opened}: ${selected} ${side === "long" ? tx.fut_long : tx.fut_short} ${lev}x · ${money(marginNum)}`,
        });
      }
    } catch {
      setMsg({ kind: "err", text: tx.pc_msg_net });
    } finally {
      setBusy(false);
    }
  }

  async function closePosition(id: string) {
    setMsg(null);
    setClosingId(id);
    try {
      const r = await fetch("/api/positions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId: id }),
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg({ kind: "err", text: j.error ?? tx.pc_msg_fail });
      } else {
        onPortfolio(j.portfolio);
        const pnl = Number(j.realizedPnlTry ?? 0);
        setMsg({
          kind: pnl >= 0 ? "ok" : "err",
          text: `${tx.fut_closed} · ${pnl >= 0 ? "+" : ""}${money(pnl)}`,
        });
      }
    } catch {
      setMsg({ kind: "err", text: tx.pc_msg_net });
    } finally {
      setClosingId(null);
    }
  }

  return (
    <div className="glass" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <div className="eyebrow">{tx.fut_title}</div>
        <span className="mono" style={{ fontSize: ".6rem", color: "var(--muted)" }}>{tx.pc_live60}</span>
      </div>
      <div style={{ fontSize: ".78rem", color: "var(--muted)", marginBottom: 18 }}>{tx.fut_sub}</div>

      {/* open positions */}
      <div className="eyebrow" style={{ marginBottom: 10 }}>{tx.fut_open_positions}</div>
      {positions.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: ".85rem", padding: "8px 0 18px" }}>{tx.fut_no_positions}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {positions.map((p) => {
            const up = p.pnlTry >= 0;
            const isLong = p.side === "long";
            const aType = (ASSET_BY_TICKER[p.ticker]?.type ?? p.type) as AssetType;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "var(--fill)", border: "1px solid var(--card-border)", flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: ".62rem", fontWeight: 700, padding: ".15rem .5rem", borderRadius: 6, background: isLong ? "rgba(26,122,74,0.14)" : "rgba(194,59,43,0.12)", color: isLong ? "var(--green-t)" : "var(--red-t)" }}>
                  {isLong ? tx.fut_long : tx.fut_short} {p.leverage}x
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{p.ticker}</div>
                  <div className="mono" style={{ fontSize: ".58rem", color: "var(--muted)" }}>
                    {tx.fut_entry} {fmtAssetPrice(p.entryNative, p.nativeCcy, aType)} · {tx.fut_liq} {fmtAssetPrice(p.liquidationPriceTry * (p.priceTry > 0 ? p.priceNative / p.priceTry : 0), p.nativeCcy, aType)}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 90 }}>
                  <div className="mono" style={{ fontSize: ".82rem", color: up ? "var(--green-t)" : "var(--red-t)" }}>
                    {up ? "+" : ""}{money(p.pnlTry)}
                  </div>
                  <div className="mono" style={{ fontSize: ".6rem", color: "var(--muted)" }}>
                    {tx.fut_equity} {money(p.equityTry)} · {up ? "+" : ""}{num(p.pnlPct)}%
                  </div>
                </div>
                <button
                  className="btn"
                  style={{ padding: ".4rem .8rem", fontSize: ".74rem", opacity: closingId === p.id ? 0.55 : 1 }}
                  disabled={closingId === p.id}
                  onClick={() => closePosition(p.id)}
                >
                  {closingId === p.id ? tx.fut_closing : tx.fut_close}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* open form */}
      <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 18 }}>
        {/* asset picker */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <span className="eyebrow">{tx.fut_pick}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tx.fut_search}
            style={{ width: 150, padding: ".4rem .7rem", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--fill)", color: "var(--ink)", fontSize: ".76rem", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 14 }}>
          {rows.map((a) => {
            const isSel = selected === a.ticker;
            const p = prices[a.ticker];
            return (
              <button
                key={a.ticker}
                onClick={() => setSelected(a.ticker)}
                style={{
                  flexShrink: 0, textAlign: "left", cursor: "pointer", padding: "8px 11px", borderRadius: 10,
                  border: isSel ? "1px solid var(--accent)" : "1px solid var(--card-border)",
                  background: isSel ? "var(--accent-soft)" : "var(--fill)", transition: "all .15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color }} />
                  <span style={{ fontWeight: 600, fontSize: ".8rem" }}>{a.ticker}</span>
                </div>
                <div className="mono" style={{ fontSize: ".62rem", color: "var(--muted)", marginTop: 3 }}>
                  {p ? fmtAssetPrice(p.nativePrice, p.nativeCcy, a.type) : "·"}
                </div>
              </button>
            );
          })}
        </div>

        {/* long / short */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, padding: 4, borderRadius: 12, background: "var(--fill)", border: "1px solid var(--card-border)" }}>
          {(["long", "short"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              style={{
                flex: 1, padding: ".5rem", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: ".82rem", border: "none", transition: "all .15s",
                background: side === s ? (s === "long" ? "var(--green-t)" : "var(--red-t)") : "transparent",
                color: side === s ? "#fff" : "var(--muted)",
              }}
            >
              {s === "long" ? tx.fut_long : tx.fut_short}
            </button>
          ))}
        </div>

        {/* leverage slider */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span className="eyebrow">{tx.fut_leverage}</span>
          <span className="mono" style={{ fontWeight: 700, fontSize: ".95rem" }}>{lev}x</span>
        </div>
        <input
          type="range" min={1} max={10} step={1} value={lev}
          onChange={(e) => setLev(Number(e.target.value))}
          style={{ width: "100%", marginBottom: 6, accentColor: "var(--accent)" }}
        />
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {[2, 5, 7, 10].map((l) => (
            <button key={l} className="btn" style={{ padding: ".3rem .6rem", fontSize: ".7rem", borderColor: lev === l ? "var(--accent)" : undefined, color: lev === l ? "var(--accent)" : undefined }} onClick={() => setLev(l)}>
              {l}x
            </button>
          ))}
        </div>

        {/* margin */}
        <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>{tx.fut_margin}</label>
        <input
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          inputMode="decimal"
          placeholder={tx.fut_margin_ph}
          className="mono"
          style={{ width: "100%", padding: "11px 12px", borderRadius: 10, background: "var(--input-bg)", color: "var(--ink)", border: "1px solid var(--card-border)", fontSize: "1rem", marginBottom: 10 }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {[0.1, 0.25, 0.5].map((f) => (
            <button key={f} className="btn" style={{ padding: ".3rem .6rem", fontSize: ".7rem" }}
              onClick={() => setMargin(String(Math.floor(cashTry * f)))}>
              %{f * 100}
            </button>
          ))}
        </div>

        {/* preview */}
        {marginNum > 0 && entryTry > 0 && (
          <div className="mono" style={{ fontSize: ".72rem", color: "var(--ink)", marginBottom: 12, padding: "9px 11px", borderRadius: 9, background: "var(--fill)", border: "1px solid var(--card-border)", lineHeight: 1.7 }}>
            <div>{tx.fut_notional}: <strong>{money(notionalTry)}</strong> ({num(notionalTry / entryTry, 6)} {selected})</div>
            <div style={{ color: "var(--muted)" }}>
              {tx.fut_entry} {fmtAssetPrice(entryTry * ratio, lp!.nativeCcy, asset?.type)} · {tx.fut_liq} <span style={{ color: "var(--red-t)" }}>{fmtAssetPrice(liqTry * ratio, lp!.nativeCcy, asset?.type)}</span>
            </div>
          </div>
        )}

        {msg && (
          <div style={{ fontSize: ".8rem", marginBottom: 12, color: msg.kind === "ok" ? "var(--green-t)" : "var(--red-t)" }}>
            {msg.text}
          </div>
        )}
        {block && (
          <div style={{ fontSize: ".75rem", marginBottom: 12, padding: "8px 10px", borderRadius: 9, background: "rgba(194,59,43,0.08)", border: "1px solid rgba(194,59,43,0.22)", color: "var(--red-t)" }}>
            {block}
          </div>
        )}

        <button
          className="btn btn-accent"
          style={{ width: "100%", padding: ".85rem", fontSize: ".95rem", opacity: busy || marginNum <= 0 || !!block ? 0.55 : 1 }}
          disabled={busy || marginNum <= 0 || !!block}
          onClick={openPosition}
        >
          {busy ? tx.fut_opening : `${selected} ${side === "long" ? tx.fut_long : tx.fut_short} ${lev}x · ${tx.fut_open_btn}`}
        </button>
        <div className="eyebrow" style={{ marginTop: 10, textAlign: "center", color: "var(--muted)", lineHeight: 1.5 }}>
          {tx.fut_warn}
        </div>
      </div>
    </div>
  );
}

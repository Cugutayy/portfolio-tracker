"use client";

import { useMemo, useState } from "react";
import {
  LEVERAGE_ASSETS,
  ASSET_BY_TICKER,
  leverageGroup,
  type LeverageGroup,
  type AssetType,
} from "@/lib/assets";
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
  tpPct: number | null;
  slPct: number | null;
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

// ─────────────────────────────────────────────────────────────
// Open positions list — lives in the holdings column under spot rows.
// ─────────────────────────────────────────────────────────────
export function FuturesPositionsList({
  positions,
  pf,
  onPortfolio,
  readOnly = false,
}: {
  positions: PositionView[];
  pf: PortfolioLike;
  onPortfolio?: (p: unknown) => void;
  /** Viewing someone else's profile — show positions but no Close button. */
  readOnly?: boolean;
}) {
  const tx = useT();
  const cur = useCurrency();
  const ud = pf.usdTry ?? 0;
  const money = (n: number) => fmtMoney(n, cur, ud);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
        onPortfolio?.(j.portfolio);
        const pnl = Number(j.realizedPnlTry ?? 0);
        setMsg({ kind: pnl >= 0 ? "ok" : "err", text: `${tx.fut_closed} · ${pnl >= 0 ? "+" : ""}${money(pnl)}` });
      }
    } catch {
      setMsg({ kind: "err", text: tx.pc_msg_net });
    } finally {
      setClosingId(null);
    }
  }

  if (positions.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>{tx.fut_open_positions}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {positions.map((p) => {
          const up = p.pnlTry >= 0;
          const isLong = p.side === "long";
          const aType = (ASSET_BY_TICKER[p.ticker]?.type ?? p.type) as AssetType;
          const ratio = p.priceTry > 0 ? p.priceNative / p.priceTry : 0;
          const sideColor = isLong ? "var(--green-t)" : "var(--red-t)";
          // liquidation "health": 1 at entry, 0 at the liquidation price
          const denom = isLong ? p.entryPriceTry - p.liquidationPriceTry : p.liquidationPriceTry - p.entryPriceTry;
          const distNow = isLong ? p.priceTry - p.liquidationPriceTry : p.liquidationPriceTry - p.priceTry;
          const health = denom > 0 ? Math.max(0, Math.min(1, distNow / denom)) : 0;
          const liqDistPct = p.priceTry > 0 ? (Math.abs(p.priceTry - p.liquidationPriceTry) / p.priceTry) * 100 : 0;
          const barColor = health > 0.6 ? "var(--green-t)" : health > 0.3 ? "#d98324" : "var(--red-t)";
          return (
            <div key={p.id} style={{ position: "relative", borderRadius: 12, background: "var(--fill)", border: "1px solid var(--card-border)", borderLeft: `3px solid ${sideColor}`, padding: "12px 13px", overflow: "hidden" }}>
              {/* header: side + ticker, P&L */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span className="mono" style={{ fontSize: ".56rem", fontWeight: 700, padding: ".12rem .42rem", borderRadius: 6, background: isLong ? "rgba(26,122,74,0.14)" : "rgba(194,59,43,0.12)", color: sideColor }}>
                      {isLong ? tx.fut_long : tx.fut_short} {p.leverage}x
                    </span>
                    <span style={{ fontWeight: 700, fontSize: ".92rem" }}>{p.ticker}</span>
                  </div>
                  <div className="mono" style={{ fontSize: ".56rem", color: "var(--muted)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{p.name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: ".98rem", fontWeight: 700, color: up ? "var(--green-t)" : "var(--red-t)" }}>
                    {up ? "+" : ""}{money(p.pnlTry)}
                  </div>
                  <div className="mono" style={{ fontSize: ".58rem", color: up ? "var(--green-t)" : "var(--red-t)" }}>
                    {up ? "▲" : "▼"} {up ? "+" : ""}{num(p.pnlPct)}%
                  </div>
                </div>
              </div>

              {/* liquidation gauge */}
              <div style={{ marginTop: 11 }}>
                <div style={{ height: 5, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(health * 100)}%`, height: "100%", background: barColor, transition: "width .4s ease" }} />
                </div>
                <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: ".54rem", color: "var(--muted)", marginTop: 4 }}>
                  <span>{tx.fut_dist} %{num(liqDistPct, 1)}</span>
                  <span>{tx.fut_liq} {fmtAssetPrice(p.liquidationPriceTry * ratio, p.nativeCcy, aType)}</span>
                </div>
              </div>

              {/* mini stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", marginTop: 11 }}>
                <Stat2 label={tx.fut_entry} value={fmtAssetPrice(p.entryNative, p.nativeCcy, aType)} />
                <Stat2 label={tx.fut_mark} value={fmtAssetPrice(p.priceNative, p.nativeCcy, aType)} />
                <Stat2 label={tx.fut_collateral} value={money(p.marginTry)} />
                <Stat2 label={tx.fut_equity} value={money(p.equityTry)} />
              </div>

              {(p.tpPct != null || p.slPct != null) && (
                <div className="mono" style={{ display: "flex", gap: 12, fontSize: ".58rem", marginTop: 8 }}>
                  {p.tpPct != null && <span style={{ color: "var(--green-t)" }}>{tx.fut_tp_short} +%{p.tpPct}</span>}
                  {p.slPct != null && <span style={{ color: "var(--red-t)" }}>{tx.fut_sl_short} -%{p.slPct}</span>}
                </div>
              )}

              {!readOnly && (
                <button
                  className="btn"
                  style={{ width: "100%", marginTop: 12, padding: ".45rem", fontSize: ".74rem", fontWeight: 600, opacity: closingId === p.id ? 0.55 : 1 }}
                  disabled={closingId === p.id}
                  onClick={() => closePosition(p.id)}
                >
                  {closingId === p.id ? tx.fut_closing : tx.fut_close}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!readOnly && msg && (
        <div style={{ fontSize: ".76rem", marginTop: 8, color: msg.kind === "ok" ? "var(--green-t)" : "var(--red-t)" }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}

function Stat2({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="eyebrow" style={{ fontSize: ".5rem" }}>{label}</div>
      <div className="mono" style={{ fontSize: ".74rem", fontWeight: 600, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Open-position form — embedded inside the trade panel (Vadeli mode).
// ─────────────────────────────────────────────────────────────
export function FuturesForm({
  prices,
  pf,
  positionCount,
  onPortfolio,
}: {
  prices: Record<string, LivePrice>;
  pf: PortfolioLike;
  positionCount: number;
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
  const [tp, setTp] = useState<string>("");
  const [sl, setSl] = useState<string>("");
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<LeverageGroup | null>("crypto");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const grouped = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const map: Record<LeverageGroup, typeof LEVERAGE_ASSETS> = { crypto: [], viop: [], index: [] };
    for (const a of LEVERAGE_ASSETS) {
      if (q && !(a.ticker.toLocaleLowerCase("tr").includes(q) || a.name.toLocaleLowerCase("tr").includes(q))) continue;
      map[leverageGroup(a)].push(a);
    }
    return map;
  }, [query]);
  const searching = query.trim().length > 0;
  const GROUP_ORDER: LeverageGroup[] = ["crypto", "viop", "index"];
  const groupLabel = (g: LeverageGroup) =>
    g === "crypto" ? tx.fut_grp_crypto : g === "viop" ? tx.fut_grp_viop : tx.fut_grp_index;

  const asset = ASSET_BY_TICKER[selected];
  const lp = prices[selected];
  const entryTry = lp?.priceTry ?? 0;
  const ratio = lp && lp.priceTry > 0 ? lp.nativePrice / lp.priceTry : 0;
  const marginNum = Number((margin || "").replace(",", ".")) || 0;
  const tpNum = Math.round(Number((tp || "").replace(",", ".")) || 0);
  const slNum = Math.round(Number((sl || "").replace(",", ".")) || 0);
  const notionalTry = marginNum * lev;
  const liqTry = side === "long" ? entryTry * (1 - 1 / lev) : entryTry * (1 + 1 / lev);
  const cashTry = pf.cashTry ?? 0;
  const insufficient = marginNum > cashTry + 1e-6;
  const atMax = positionCount >= 10;
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
        body: JSON.stringify({
          ticker: selected,
          side,
          leverage: lev,
          marginTry: marginNum,
          tpPct: tpNum > 0 ? tpNum : null,
          slPct: slNum > 0 ? Math.min(slNum, 99) : null,
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg({ kind: "err", text: j.error ?? tx.pc_msg_fail });
      } else {
        onPortfolio(j.portfolio);
        setMargin("");
        setTp("");
        setSl("");
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

  return (
    <div>
      {/* asset picker — collapsible categories */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <span className="eyebrow">{tx.fut_pick}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tx.fut_search}
          style={{ width: 150, padding: ".4rem .7rem", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--fill)", color: "var(--ink)", fontSize: ".76rem", outline: "none" }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {GROUP_ORDER.map((g) => {
          const items = grouped[g];
          if (items.length === 0) return null;
          const open = searching || openGroup === g;
          const hasSel = items.some((a) => a.ticker === selected);
          return (
            <div key={g} style={{ border: `1px solid ${hasSel ? "var(--accent)" : "var(--card-border)"}`, borderRadius: 12, overflow: "hidden", background: "var(--fill)" }}>
              <button
                onClick={() => setOpenGroup(open && !searching ? null : g)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "11px 13px", background: "transparent", border: "none", cursor: "pointer", color: "var(--ink)" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: ".86rem" }}>{groupLabel(g)}</span>
                  <span className="mono" style={{ fontSize: ".58rem", color: "var(--muted)", padding: ".1rem .4rem", borderRadius: 6, background: "var(--card-border)" }}>{items.length}</span>
                </span>
                <span style={{ display: "inline-block", transition: "transform .2s ease", transform: open ? "rotate(90deg)" : "rotate(0deg)", color: "var(--muted)", fontSize: ".8rem" }}>▶</span>
              </button>
              {open && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))", gap: 6, padding: "0 10px 10px" }}>
                  {items.map((a) => {
                    const isSel = selected === a.ticker;
                    const p = prices[a.ticker];
                    return (
                      <button
                        key={a.ticker}
                        onClick={() => setSelected(a.ticker)}
                        title={a.name}
                        style={{
                          textAlign: "left", cursor: "pointer", padding: "8px 10px", borderRadius: 10,
                          border: isSel ? "1px solid var(--accent)" : "1px solid var(--card-border)",
                          background: isSel ? "var(--accent-soft)" : "var(--paper, var(--bg))", transition: "all .15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, fontSize: ".78rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.ticker}</span>
                        </div>
                        <div className="mono" style={{ fontSize: ".6rem", color: "var(--muted)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p ? fmtAssetPrice(p.nativePrice, p.nativeCcy, a.type) : "·"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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

      {/* optional take-profit / stop-loss (P&L % on margin) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="eyebrow" style={{ display: "block", marginBottom: 5, color: "var(--green-t)" }}>{tx.fut_tp}</label>
          <input
            value={tp}
            onChange={(e) => setTp(e.target.value)}
            inputMode="numeric"
            placeholder={tx.fut_tp_ph}
            className="mono"
            style={{ width: "100%", padding: "9px 11px", borderRadius: 9, background: "var(--input-bg)", color: "var(--ink)", border: "1px solid var(--card-border)", fontSize: ".9rem" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="eyebrow" style={{ display: "block", marginBottom: 5, color: "var(--red-t)" }}>{tx.fut_sl}</label>
          <input
            value={sl}
            onChange={(e) => setSl(e.target.value)}
            inputMode="numeric"
            placeholder={tx.fut_sl_ph}
            className="mono"
            style={{ width: "100%", padding: "9px 11px", borderRadius: 9, background: "var(--input-bg)", color: "var(--ink)", border: "1px solid var(--card-border)", fontSize: ".9rem" }}
          />
        </div>
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
  );
}

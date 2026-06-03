"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PortfolioWheel } from "@/components/PortfolioWheel";
import { Avatar } from "@/components/Avatar";
import { TRADEABLE_ASSETS, ASSET_BY_TICKER, TYPE_LABEL, type AssetType } from "@/lib/assets";
import { fmtTry, type DemoSlice } from "@/lib/demo";
import { fmtAssetPrice } from "@/lib/format";
import { fmtMoney, fmtMoneyFull } from "@/lib/currency";
import { useT, useCurrency } from "@/components/Providers";
import { FuturesPositionsList, FuturesForm, type PositionView } from "@/components/FuturesPanel";
import { Sparkline } from "@/components/Sparkline";

interface HoldingView {
  ticker: string;
  name: string;
  type: string;
  quantity: number;
  avgBuyPriceTry: number;
  priceTry: number;
  priceNative: number;
  avgBuyPriceNative: number;
  nativeCcy: string;
  valueTry: number;
  costTry: number;
  pnlTry: number;
  pnlPct: number;
  weight: number;
  color: string;
}
interface PortfolioView {
  cashTry: number;
  startingTry: number;
  investedTry: number;
  positionsEquityTry: number;
  totalTry: number;
  totalPnlTry: number;
  totalReturnPct: number;
  holdings: HoldingView[];
  positions: PositionView[];
  equity: number[];
  tradesToday: number;
  tradesLeft: number;
  pricedAt: number;
  usdTry: number;
}
interface TradeRow {
  id: string;
  ticker: string;
  name: string;
  side: "buy" | "sell";
  quantity: number;
  priceTry: number;
  amountTry: number;
  realizedPnlTry: number | null;
  tradedAt: string;
}
interface LivePrice {
  ticker: string;
  priceTry: number;
  nativePrice: number;
  nativeCcy: string;
  changePct: number | null;
}

const num = (n: number, d = 2) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

const TYPE_ORDER: AssetType[] = ["crypto", "commodity", "index", "nasdaq100", "bist100", "sp500"];


/** Milliseconds until the next Istanbul midnight (UTC+3, when trade limits reset). */
function msToReset() {
  const ist = new Date(Date.now() + 3 * 3600_000);
  const next = new Date(ist);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - ist.getTime();
}
function fmtReset(ms: number) {
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return h > 0 ? `${h}sa ${m}dk` : `${m}dk`;
}

function gradFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const a = h % 360;
  return `linear-gradient(135deg, hsl(${a} 55% 45%), hsl(${(a + 60) % 360} 55% 30%))`;
}

/** Read a File, downscale to a square ~256px, return a JPEG data URL. */
function resizeImage(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = max;
        canvas.height = max;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, sx, sy, side, side, 0, 0, max, max);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PortfolioClient({
  name: initialName,
  handle,
  image: initialImage,
  bio: initialBio,
}: {
  name: string;
  handle: string;
  image: string | null;
  bio: string | null;
}) {
  const tx = useT();
  const cur = useCurrency();
  const [pf, setPf] = useState<PortfolioView | null>(null);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [selected, setSelected] = useState<string>("BTC");
  const [amount, setAmount] = useState<string>("");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  /** spot trading vs leveraged futures, within the same trade panel */
  const [tradeKind, setTradeKind] = useState<"spot" | "futures">("spot");
  /** When the user picked "Tümü", sell the exact held quantity (no ₺ dust). */
  const [sellExact, setSellExact] = useState(false);
  const [marketTab, setMarketTab] = useState<AssetType>("crypto");
  const [marketQuery, setMarketQuery] = useState("");

  // countdown to the daily trade-limit reset (Istanbul midnight)
  const [resetIn, setResetIn] = useState("");
  useEffect(() => {
    const tick = () => setResetIn(fmtReset(msToReset()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // editable profile
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? "");
  const [image, setImage] = useState<string | null>(initialImage);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(initialName);
  const [draftBio, setDraftBio] = useState(initialBio ?? "");
  const [draftImage, setDraftImage] = useState<string | null>(initialImage);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const tradeRef = useRef<HTMLDivElement>(null);

  const loadPortfolio = useCallback(async () => {
    const r = await fetch("/api/portfolio", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) {
      setPf(j.portfolio);
      setTrades(j.trades);
    }
  }, []);

  const loadPrices = useCallback(async () => {
    const r = await fetch("/api/prices", { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setPrices(j.prices);
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([loadPortfolio(), loadPrices()]);
      setLoading(false);
    })();
  }, [loadPortfolio, loadPrices]);

  // refresh live prices every 60s
  useEffect(() => {
    const t = setInterval(loadPrices, 60_000);
    return () => clearInterval(t);
  }, [loadPrices]);

  const livePrice = prices[selected]?.priceTry ?? null;
  const heldSelected = pf?.holdings.find((h) => h.ticker === selected) ?? null;
  const selectedAsset = ASSET_BY_TICKER[selected];

  // money in the user's chosen display currency (values are stored in ₺)
  const ud = pf?.usdTry ?? 0;
  const money = (n: number) => fmtMoney(n, cur, ud);
  const moneyFull = (n: number) => fmtMoneyFull(n, cur, ud);
  const altMoney = (n: number) => (cur === "usd" ? fmtTry(n) : fmtMoney(n, "usd", ud));

  const slices: DemoSlice[] = useMemo(() => {
    if (!pf) return [];
    const total = pf.totalTry || 1;
    const s: DemoSlice[] = pf.holdings.map((h) => ({
      ticker: h.ticker,
      name: h.name,
      color: h.color,
      weight: h.weight,
      valueTry: h.valueTry,
    }));
    // open leveraged positions contribute their equity (margin + live P&L)
    for (const p of pf.positions ?? []) {
      if (p.equityTry <= 0) continue;
      const base = ASSET_BY_TICKER[p.ticker]?.color ?? "#888";
      s.push({
        ticker: `${p.ticker} ${p.side === "long" ? "L" : "S"}${p.leverage}x`,
        name: `${p.name} · ${p.side === "long" ? tx.fut_long : tx.fut_short} ${p.leverage}x`,
        color: base,
        weight: p.equityTry / total,
        valueTry: p.equityTry,
      });
    }
    if (pf.cashTry > 0 && pf.totalTry > 0) {
      s.push({
        ticker: "NAKİT",
        name: "Nakit",
        color: "rgba(26,24,19,0.16)",
        weight: pf.cashTry / pf.totalTry,
        valueTry: pf.cashTry,
      });
    }
    return s;
  }, [pf, tx]);

  const initials = useMemo(
    () => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    [name],
  );

  const heldTickers = useMemo(
    () => new Set((pf?.holdings ?? []).map((h) => h.ticker)),
    [pf],
  );

  const marketRows = useMemo(() => {
    const q = marketQuery.trim().toLocaleLowerCase("tr");
    return TRADEABLE_ASSETS.filter((a) => a.type === marketTab).filter(
      (a) =>
        !q ||
        a.ticker.toLocaleLowerCase("tr").includes(q) ||
        a.name.toLocaleLowerCase("tr").includes(q),
    );
  }, [marketTab, marketQuery]);

  function pickAsset(ticker: string, asMode: "buy" | "sell" = "buy") {
    const held = pf?.holdings.some((h) => h.ticker === ticker) ?? false;
    setSelected(ticker);
    setAmount("");
    setSellExact(false);
    setMode(asMode === "sell" && held ? "sell" : "buy");
    setMsg(null);
    tradeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /** Sell a fraction (0–1) of the held position. 1 = exact full quantity. */
  function setSellFraction(frac: number) {
    if (!heldSelected) return;
    setMode("sell");
    if (frac >= 1) {
      setSellExact(true);
      setAmount(String(Math.floor(heldSelected.valueTry)));
    } else {
      setSellExact(false);
      setAmount(String(Math.floor(heldSelected.valueTry * frac)));
    }
  }

  async function doTrade(side: "buy" | "sell") {
    setMsg(null);
    const amt = Number(amount.replace(",", "."));
    if (!(amt > 0)) {
      setMsg({ kind: "err", text: tx.pc_msg_amount });
      return;
    }
    setBusy(true);
    try {
      // Sell: prefer the exact held quantity when "Tümü" was chosen so no
      // dust remains; otherwise derive quantity from the ₺ amount.
      const sellQty =
        sellExact && heldSelected
          ? heldSelected.quantity
          : amt / (livePrice ?? 1);
      const body =
        side === "buy"
          ? { ticker: selected, side, amountTry: amt }
          : { ticker: selected, side, quantity: sellQty };
      const r = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg({ kind: "err", text: j.error ?? tx.pc_msg_fail });
      } else {
        setPf(j.portfolio);
        setAmount("");
        setSellExact(false);
        if (side === "sell") setMode("buy");
        setMsg({
          kind: "ok",
          text: `${side === "buy" ? tx.pc_msg_bought : tx.pc_msg_sold}: ${num(j.trade.quantity, 4)} ${selected} · ${money(j.trade.amountTry)}`,
        });
        loadPortfolio();
      }
    } catch {
      setMsg({ kind: "err", text: tx.pc_msg_net });
    } finally {
      setBusy(false);
    }
  }

  function openEditor() {
    setDraftName(name);
    setDraftBio(bio);
    setDraftImage(image);
    setEditing(true);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg({ kind: "err", text: tx.pc_msg_pick_img });
      return;
    }
    try {
      const data = await resizeImage(file);
      setDraftImage(data);
    } catch {
      setMsg({ kind: "err", text: tx.pc_msg_img_fail });
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    setMsg(null);
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName.trim() || name,
          bio: draftBio.trim(),
          image: draftImage,
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg({ kind: "err", text: j.error ?? tx.pc_msg_profile_fail });
      } else {
        setName(j.user.name);
        setBio(j.user.bio ?? "");
        setImage(j.user.image ?? null);
        setEditing(false);
        setMsg({ kind: "ok", text: tx.pc_msg_profile_ok });
      }
    } catch {
      setMsg({ kind: "err", text: tx.pc_msg_net });
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading)
    return (
      <div className="glass" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
        Portföy yükleniyor…
      </div>
    );

  const up = (pf?.totalReturnPct ?? 0) >= 0;

  // ── trade-panel derived display ──
  const sp = prices[selected];
  const amtNum = Number((amount || "").replace(",", ".")) || 0;
  // Quantity implied by the current input (or exact held qty when "Tümü").
  const rawQty =
    mode === "sell" && sellExact && heldSelected
      ? heldSelected.quantity
      : livePrice
        ? amtNum / livePrice
        : 0;
  // In sell mode, never preview more than what's actually held.
  const tradeQty =
    mode === "sell" && heldSelected
      ? Math.min(rawQty, heldSelected.quantity)
      : rawQty;
  const tradeValueTry = tradeQty * (livePrice ?? 0);
  const tradeValueNative =
    sp && livePrice ? tradeValueTry * (sp.nativePrice / livePrice) : 0;
  const cashTry = pf?.cashTry ?? 0;
  const canSell = !!heldSelected && (pf?.tradesLeft ?? 0) > 0;
  const noTradesLeft = (pf?.tradesLeft ?? 0) <= 0;
  // Buying a brand-new asset while already holding the max (10) is blocked.
  const atHoldingLimit =
    !heldSelected && (pf?.holdings.length ?? 0) >= 10;
  const insufficientCash = mode === "buy" && amtNum > cashTry + 1e-6;
  // Selling more ₺ than the position is worth: the trade clamps to the full
  // holding, so tell the user that's what will happen.
  const sellOverflow =
    mode === "sell" && !!heldSelected && !sellExact && amtNum > heldSelected.valueTry + 1e-6;
  // Reason the primary action is blocked (shown as an inline hint).
  const buyBlock = noTradesLeft
    ? tx.pc_trades_done + "."
    : atHoldingLimit
      ? tx.pc_msg_max_assets
      : insufficientCash
        ? `Nakitin yetersiz (${fmtTry(cashTry)}).`
        : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* identity + summary */}
      <div className="glass" style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <Avatar initials={initials} gradient={gradFor(handle)} image={image} size={72} />
          <div style={{ flex: 1, minWidth: 150 }}>
            <div className="eyebrow">@{handle}</div>
            <h1 className="display" style={{ fontSize: "1.9rem", margin: "2px 0 0", lineHeight: 1.05 }}>{name}</h1>
            {bio && <div style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: 6 }}>{bio}</div>}
          </div>
          <button className="btn" style={{ padding: ".5rem .9rem", fontSize: ".78rem", flexShrink: 0, marginLeft: "auto" }} onClick={openEditor}>
            Profili düzenle
          </button>
        </div>

        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginTop: 20 }}>
          <Stat
            label={tx.pc_total}
            value={moneyFull(pf?.totalTry ?? 0)}
            big
            sub={
              pf && pf.usdTry > 0
                ? `≈ ${altMoney(pf.totalTry)} · ${up ? "+" : ""}${num(pf.totalReturnPct)}%`
                : undefined
            }
          />
          <Stat
            label={tx.pc_total_return}
            value={`${up ? "+" : ""}${num(pf?.totalReturnPct ?? 0)}%`}
            color={up ? "var(--green-t)" : "var(--red-t)"}
            big
            sub={pf ? `${up ? "+" : ""}${moneyFull(pf.totalPnlTry)}` : undefined}
          />
          <Stat label={tx.pc_cash} value={moneyFull(pf?.cashTry ?? 0)} />
          <Stat label={tx.pc_invested} value={moneyFull(pf?.investedTry ?? 0)} />
          {pf && (pf.positions?.length ?? 0) > 0 && (
            <Stat label={tx.fut_title} value={moneyFull(pf.positionsEquityTry ?? 0)} />
          )}
          <Stat
            label={tx.pc_today}
            value={`${pf?.tradesToday ?? 0} / ${(pf?.tradesToday ?? 0) + (pf?.tradesLeft ?? 0)}`}
            sub={resetIn ? `${tx.pc_renew_label} ${resetIn}` : undefined}
          />
        </div>

        {/* equity curve over time */}
        {pf && pf.equity.length >= 2 && (
          <div style={{ marginTop: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>{tx.pc_curve}</div>
            <div style={{ width: "100%" }}>
              <Sparkline data={pf.equity} positive={up} width={680} height={64} strokeWidth={2} full />
            </div>
          </div>
        )}
      </div>

      {/* profile editor */}
      {editing && (
        <div className="glass" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{tx.pc_edit}</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <Avatar initials={initials} gradient={gradFor(handle)} image={draftImage} size={96} />
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" style={{ padding: ".35rem .7rem", fontSize: ".72rem" }} onClick={() => fileRef.current?.click()}>
                  {tx.pc_photo}
                </button>
                {draftImage && (
                  <button className="btn" style={{ padding: ".35rem .7rem", fontSize: ".72rem" }} onClick={() => setDraftImage(null)}>
                    {tx.pc_remove}
                  </button>
                )}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>{tx.pc_name}</label>
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={40}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "var(--input-bg)", color: "var(--ink)", border: "1px solid var(--card-border)", fontSize: ".95rem" }}
                />
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>{tx.pc_about} ({draftBio.length}/160)</label>
                <textarea
                  value={draftBio}
                  onChange={(e) => setDraftBio(e.target.value.slice(0, 160))}
                  rows={3}
                  placeholder={tx.pc_bio_ph}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "var(--input-bg)", color: "var(--ink)", border: "1px solid var(--card-border)", fontSize: ".9rem", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-accent" style={{ padding: ".55rem 1.1rem", opacity: savingProfile ? 0.6 : 1 }} disabled={savingProfile} onClick={saveProfile}>
                  {savingProfile ? tx.pc_saving : tx.pc_save}
                </button>
                <button className="btn" style={{ padding: ".55rem 1.1rem" }} onClick={() => setEditing(false)}>
                  {tx.pc_cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* markets browser */}
      <div className="glass" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <div className="eyebrow">{tx.pc_markets}</div>
          <span className="mono" style={{ fontSize: ".6rem", color: "var(--muted)" }}>{tx.pc_live60}</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            {TYPE_ORDER.filter((t) => TRADEABLE_ASSETS.some((a) => a.type === t)).map((t) => (
              <button
                key={t}
                onClick={() => setMarketTab(t)}
                className="mono"
                style={{
                  padding: ".45rem .85rem", borderRadius: 999, cursor: "pointer", fontSize: ".66rem",
                  border: marketTab === t ? "1px solid var(--accent)" : "1px solid var(--card-border)",
                  background: marketTab === t ? "var(--accent-soft)" : "transparent",
                  color: marketTab === t ? "var(--accent)" : "var(--muted)", transition: "all .15s",
                }}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <input
            value={marketQuery}
            onChange={(e) => setMarketQuery(e.target.value)}
            placeholder={tx.pc_search_asset}
            style={{ width: 200, padding: ".5rem .8rem", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--fill)", color: "var(--ink)", fontSize: ".8rem", outline: "none" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))", gap: 10 }}>
          {marketRows.map((a) => {
            const p = prices[a.ticker];
            const chg = p?.changePct ?? null;
            const isSel = selected === a.ticker;
            return (
              <button
                key={a.ticker}
                onClick={() => pickAsset(a.ticker)}
                style={{
                  textAlign: "left", cursor: "pointer", padding: "12px 13px", borderRadius: 12,
                  border: isSel ? "1px solid var(--accent)" : "1px solid var(--card-border)",
                  background: isSel ? "var(--accent-soft)" : "var(--fill)",
                  transition: "all .15s", display: "flex", flexDirection: "column", gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: a.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: ".86rem" }}>{a.ticker}</span>
                  {heldTickers.has(a.ticker) && (
                    <span className="mono" style={{ fontSize: ".52rem", color: "var(--accent)", marginLeft: "auto" }}>{tx.pc_in_portfolio}</span>
                  )}
                </div>
                <div className="mono" style={{ fontSize: ".58rem", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.name}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
                  <span className="mono" style={{ fontSize: ".82rem", fontWeight: 600 }}>
                    {p ? fmtAssetPrice(p.nativePrice, p.nativeCcy, a.type) : "·"}
                  </span>
                  {chg != null && (
                    <span className="mono" style={{ fontSize: ".66rem", color: chg >= 0 ? "var(--green-t)" : "var(--red-t)" }}>
                      {chg >= 0 ? "+" : ""}{num(chg)}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="portfolio-grid" style={{ display: "grid", gridTemplateColumns: "minmax(280px,1fr) minmax(320px,1.2fr)", gap: 20 }}>
        {/* wheel + holdings */}
        <div className="glass" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{tx.pc_alloc}</div>
          {slices.length > 0 ? (
            <div className="pw-wrap" style={{ display: "flex", justifyContent: "center", padding: "8px 40px 16px" }}>
              <PortfolioWheel slices={slices} initials={initials} gradient={gradFor(handle)} image={image} size={240} format={money} formatAlt={altMoney} />
            </div>
          ) : (
            <div style={{ color: "var(--muted)", padding: "30px 0", textAlign: "center" }}>
              {tx.pc_no_asset}
            </div>
          )}

          {pf && pf.holdings.length === 0 && (
            <div style={{ marginTop: 12, padding: "16px 18px", borderRadius: 12, background: "var(--fill)", border: "1px dashed var(--card-border)", textAlign: "center" }}>
              <div style={{ fontWeight: 600, fontSize: ".92rem", marginBottom: 4 }}>
                {money(pf.cashTry)} {tx.pc_cash_ready}
              </div>
              <div style={{ color: "var(--muted)", fontSize: ".82rem", lineHeight: 1.5 }}>
                {tx.pc_nudge}
              </div>
            </div>
          )}

          {pf && pf.holdings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {pf.holdings.map((h) => {
                const hUp = h.pnlTry >= 0;
                return (
                  <div key={h.ticker} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "var(--fill)", border: "1px solid var(--card-border)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: h.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: ".88rem" }}>{h.ticker}</div>
                      <div className="mono" style={{ fontSize: ".62rem", color: "var(--muted)" }}>
                        {num(h.quantity, 4)} · {tx.pc_avg} {fmtAssetPrice(h.avgBuyPriceNative, h.nativeCcy, h.type as AssetType)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="mono" style={{ fontSize: ".82rem" }}>{money(h.valueTry)}</div>
                      <div className="mono" style={{ fontSize: ".62rem", color: hUp ? "var(--green-t)" : "var(--red-t)" }}>
                        {hUp ? "+" : ""}{num(h.pnlPct)}%
                      </div>
                    </div>
                    <button
                      className="btn"
                      style={{ padding: ".35rem .7rem", fontSize: ".72rem" }}
                      onClick={() => { pickAsset(h.ticker, "sell"); }}
                    >
                      {tx.pc_sell}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* open leveraged positions, alongside spot holdings */}
          <FuturesPositionsList
            positions={pf?.positions ?? []}
            pf={{ cashTry: pf?.cashTry ?? 0, usdTry: pf?.usdTry ?? 0 }}
            onPortfolio={(p) => setPf(p as PortfolioView)}
          />
        </div>

        {/* trade panel */}
        <div className="glass" style={{ padding: 24 }} ref={tradeRef}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{tx.pc_trade}</div>

          {/* spot vs leveraged-futures kind */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, padding: 4, borderRadius: 12, background: "var(--fill)", border: "1px solid var(--card-border)" }}>
            {(["spot", "futures"] as const).map((k) => (
              <button
                key={k}
                onClick={() => { setTradeKind(k); setMsg(null); }}
                style={{
                  flex: 1, padding: ".5rem", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: ".82rem",
                  border: "none", transition: "all .15s",
                  background: tradeKind === k ? "var(--accent)" : "transparent",
                  color: tradeKind === k ? "#fff" : "var(--muted)",
                }}
              >
                {k === "spot" ? tx.pc_spot : tx.fut_title}
              </button>
            ))}
          </div>

          {tradeKind === "futures" ? (
            <FuturesForm
              prices={prices}
              pf={{ cashTry: pf?.cashTry ?? 0, usdTry: pf?.usdTry ?? 0 }}
              positionCount={pf?.positions?.length ?? 0}
              onPortfolio={(p) => setPf(p as PortfolioView)}
            />
          ) : (
          <>
          {/* selected asset header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "12px 14px", borderRadius: 12, background: "var(--fill)", border: "1px solid var(--card-border)" }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: selectedAsset?.color ?? "var(--accent)", flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>{selected}</div>
              <div className="mono" style={{ fontSize: ".6rem", color: "var(--muted)" }}>
                {selectedAsset ? `${selectedAsset.name} · ${TYPE_LABEL[selectedAsset.type]}` : tx.pc_pick_market}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: "1rem", fontWeight: 600 }}>{prices[selected] ? fmtAssetPrice(prices[selected]!.nativePrice, prices[selected]!.nativeCcy, selectedAsset?.type) : "·"}</div>
              {prices[selected]?.changePct != null && (
                <div className="mono" style={{ fontSize: ".64rem", color: (prices[selected]!.changePct ?? 0) >= 0 ? "var(--green-t)" : "var(--red-t)" }}>
                  {(prices[selected]!.changePct ?? 0) >= 0 ? "+" : ""}{num(prices[selected]!.changePct ?? 0)}%
                </div>
              )}
            </div>
          </div>

          {/* AL / SAT mode toggle */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, padding: 4, borderRadius: 12, background: "var(--fill)", border: "1px solid var(--card-border)" }}>
            <button
              onClick={() => { setMode("buy"); setAmount(""); setSellExact(false); setMsg(null); }}
              style={{
                flex: 1, padding: ".5rem", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: ".85rem",
                border: "none", transition: "all .15s",
                background: mode === "buy" ? "var(--green-t)" : "transparent",
                color: mode === "buy" ? "#fff" : "var(--muted)",
              }}
            >
              {tx.pc_buy}
            </button>
            <button
              onClick={() => { if (canSell) { setMode("sell"); setAmount(""); setSellExact(false); setMsg(null); } }}
              disabled={!canSell}
              style={{
                flex: 1, padding: ".5rem", borderRadius: 9, cursor: canSell ? "pointer" : "not-allowed", fontWeight: 600, fontSize: ".85rem",
                border: "none", transition: "all .15s", opacity: canSell ? 1 : 0.4,
                background: mode === "sell" ? "var(--red-t)" : "transparent",
                color: mode === "sell" ? "#fff" : "var(--muted)",
              }}
            >
              {tx.pc_sell}
            </button>
          </div>

          {/* position summary (only relevant when selling / holding) */}
          {heldSelected && (
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 12, fontSize: ".72rem" }}>
              <span style={{ color: "var(--muted)" }}>{tx.pc_holding}</span>
              <span className="mono" style={{ color: "var(--ink)" }}>
                {num(heldSelected.quantity, 4)} {selected} · {money(heldSelected.valueTry)}
                <span style={{ color: heldSelected.pnlTry >= 0 ? "var(--green-t)" : "var(--red-t)", marginLeft: 8 }}>
                  {heldSelected.pnlTry >= 0 ? "+" : ""}{num(heldSelected.pnlPct)}%
                </span>
              </span>
            </div>
          )}

          {mode === "buy" ? (
            <>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>{tx.pc_buy_amount}</label>
              <input
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setSellExact(false); }}
                inputMode="decimal"
                placeholder={tx.pc_eg_100k}
                className="mono"
                style={{ width: "100%", padding: "11px 12px", borderRadius: 10, background: "var(--input-bg)", color: "var(--ink)", border: "1px solid var(--card-border)", fontSize: "1rem", marginBottom: 10 }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {[0.25, 0.5, 1].map((f) => (
                  <button key={f} className="btn" style={{ padding: ".3rem .6rem", fontSize: ".7rem" }}
                    onClick={() => pf && setAmount(String(Math.floor(pf.cashTry * f)))}>
                    {f === 1 ? tx.pc_all_cash : `${tx.pc_cash} %${f * 100}`}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>{tx.pc_sell_howmuch}</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {[0.25, 0.5, 0.75, 1].map((f) => {
                  const active = sellExact ? f === 1 : amount !== "" && heldSelected != null && Math.floor(heldSelected.valueTry * f) === amtNum;
                  return (
                    <button key={f} onClick={() => setSellFraction(f)}
                      style={{
                        flex: 1, minWidth: 56, padding: ".5rem", borderRadius: 9, cursor: "pointer", fontSize: ".76rem", fontWeight: 600,
                        border: active ? "1px solid var(--red-t)" : "1px solid var(--card-border)",
                        background: active ? "rgba(255,122,133,0.12)" : "var(--fill)",
                        color: active ? "var(--red-t)" : "var(--ink)", transition: "all .15s",
                      }}>
                      {f === 1 ? tx.pc_all : `%${f * 100}`}
                    </button>
                  );
                })}
              </div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>{tx.pc_or_amount}</label>
              <input
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setSellExact(false); }}
                inputMode="decimal"
                placeholder={tx.pc_eg_50k}
                className="mono"
                style={{ width: "100%", padding: "11px 12px", borderRadius: 10, background: "var(--input-bg)", color: "var(--ink)", border: "1px solid var(--card-border)", fontSize: "1rem", marginBottom: 10 }}
              />
            </>
          )}

          {/* live preview of what this trade does */}
          {amtNum > 0 && livePrice != null && (
            <div className="mono" style={{ fontSize: ".72rem", color: "var(--ink)", marginBottom: 12, padding: "8px 10px", borderRadius: 9, background: "var(--fill)", border: "1px solid var(--card-border)" }}>
              {mode === "buy" ? tx.pc_buying : tx.pc_selling}: <strong>{num(tradeQty, 6)} {selected}</strong>
              <span style={{ color: "var(--muted)" }}>
                {" "}≈ {money(tradeValueTry)}
                {sp && sp.nativeCcy !== "TRY" && selectedAsset?.type !== "index" && (
                  <> · {fmtAssetPrice(tradeValueNative, sp.nativeCcy)}</>
                )}
              </span>
            </div>
          )}

          {msg && (
            <div style={{ fontSize: ".8rem", marginBottom: 12, color: msg.kind === "ok" ? "var(--green-t)" : "var(--red-t)" }}>
              {msg.text}
            </div>
          )}

          {/* proactive guardrail hint (buy mode) */}
          {mode === "buy" && buyBlock && (
            <div style={{ fontSize: ".75rem", marginBottom: 12, padding: "8px 10px", borderRadius: 9, background: "rgba(194,59,43,0.08)", border: "1px solid rgba(194,59,43,0.22)", color: "var(--red-t)" }}>
              {buyBlock}
            </div>
          )}

          {/* sell overflow hint */}
          {sellOverflow && heldSelected && (
            <div style={{ fontSize: ".75rem", marginBottom: 12, padding: "8px 10px", borderRadius: 9, background: "var(--fill)", border: "1px solid var(--card-border)", color: "var(--muted)" }}>
              {tx.pc_sell_over_a}{money(heldSelected.valueTry)}{tx.pc_sell_over_b}
            </div>
          )}

          {mode === "buy" ? (
            <button className="btn btn-accent" style={{ width: "100%", padding: ".85rem", fontSize: ".95rem", opacity: busy || amtNum <= 0 || !!buyBlock ? 0.55 : 1 }}
              disabled={busy || amtNum <= 0 || !!buyBlock} onClick={() => doTrade("buy")}>
              {busy ? tx.pc_processing : `${selected} ${tx.pc_buy}`}
            </button>
          ) : (
            <button className="btn" style={{ width: "100%", padding: ".85rem", fontSize: ".95rem", fontWeight: 600, background: "var(--red-t)", color: "#fff", border: "none", opacity: busy || !canSell || amtNum <= 0 ? 0.55 : 1 }}
              disabled={busy || !canSell || amtNum <= 0} onClick={() => doTrade("sell")}>
              {busy ? tx.pc_processing : `${selected} ${tx.pc_sell}`}
            </button>
          )}
          <div className="eyebrow" style={{ marginTop: 10, textAlign: "center", color: noTradesLeft ? "var(--red-t)" : "var(--muted)" }}>
            {!noTradesLeft
              ? `${tx.pc_trades_left_a}${pf?.tradesLeft}${tx.pc_trades_left_b}${resetIn ? ` · ${resetIn} ${tx.pc_renew}` : ""}`
              : `${tx.pc_trades_done}${resetIn ? ` · ${resetIn} ${tx.pc_renew}` : ""}`}
          </div>
          </>
          )}
        </div>
      </div>

      {/* trade history */}
      <div className="glass" style={{ padding: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>{tx.pc_history}</div>
        {trades.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>{tx.pc_no_trades}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {trades.map((t) => {
              // show the unit price in the asset's native currency (USD for
              // crypto/US, ₺ for BIST) — the total amount stays in ₺ since
              // that's the real cash moved from the 1M TL balance.
              const lp = prices[t.ticker];
              const aType = ASSET_BY_TICKER[t.ticker]?.type as AssetType | undefined;
              const ccy = lp?.nativeCcy ?? (aType === "bist100" ? "TRY" : "USD");
              const ratio = lp && lp.priceTry > 0 ? lp.nativePrice / lp.priceTry : (pf?.usdTry ? 1 / pf.usdTry : 1);
              const unitNative = t.priceTry * ratio;
              return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)" }}>
                <span className="mono" style={{ fontSize: ".68rem", padding: ".15rem .5rem", borderRadius: 6, background: t.side === "buy" ? "rgba(74,222,128,0.12)" : "rgba(255,122,133,0.12)", color: t.side === "buy" ? "var(--green-t)" : "var(--red-t)" }}>
                  {t.side === "buy" ? tx.pc_badge_buy : tx.pc_badge_sell}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{t.ticker}</span>
                  <span className="mono" style={{ fontSize: ".68rem", color: "var(--muted)", marginLeft: 8 }}>
                    {num(t.quantity, 4)} @ {fmtAssetPrice(unitNative, ccy, aType)}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: ".82rem" }}>{money(t.amountTry)}</div>
                  {t.realizedPnlTry != null && (
                    <div className="mono" style={{ fontSize: ".62rem", color: t.realizedPnlTry >= 0 ? "var(--green-t)" : "var(--red-t)" }}>
                      {t.realizedPnlTry >= 0 ? "+" : ""}{money(t.realizedPnlTry)}
                    </div>
                  )}
                </div>
                <div className="mono" style={{ fontSize: ".6rem", color: "var(--muted)", width: 88, textAlign: "right" }}>
                  {new Date(t.tradedAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, big, sub }: { label: string; value: string; color?: string; big?: boolean; sub?: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mono" style={{ fontSize: big ? "1.5rem" : "1.05rem", fontWeight: 600, marginTop: 2, color: color ?? "var(--ink)" }}>
        {value}
      </div>
      {sub && (
        <div className="mono" style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 3 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PortfolioWheel } from "@/components/PortfolioWheel";
import { Sparkline } from "@/components/Sparkline";
import { Avatar } from "@/components/Avatar";
import { fmtTry, type DemoSlice } from "@/lib/demo";
import { fmtAssetPrice } from "@/lib/format";
import { fmtMoney, fmtMoneyFull } from "@/lib/currency";
import type { AssetType } from "@/lib/assets";
import { FuturesPositionsList, type PositionView } from "@/components/FuturesPanel";
import { useT, useCurrency } from "@/components/Providers";

interface HoldingView {
  ticker: string; name: string; type: string; quantity: number;
  avgBuyPriceTry: number; priceTry: number; valueTry: number;
  pnlTry: number; pnlPct: number; weight: number; color: string;
}
interface PublicTrade {
  ticker: string; side: "buy" | "sell"; quantity: number;
  priceNative: number; nativeCcy: string; amountTry: number; tradedAt: string;
}
export interface ProfileData {
  id: string; name: string; handle: string; image: string | null; bio: string | null;
  rank: number; totalTry: number; returnPct: number; cashTry: number; investedTry: number;
  holdings: HoldingView[]; positions: PositionView[]; equity: number[];
  followers: number; likes: number; commentsCount: number; tradesCount: number;
  isFollowing: boolean; isLiked: boolean; isSelf: boolean;
  recentTrades: PublicTrade[];
  usdTry: number;
}
interface CommentRow {
  id: string; body: string; createdAt: string;
  authorName: string; authorHandle: string; authorImage: string | null;
}

const num = (n: number, d = 2) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const gradFor = (s: string) => {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const a = h % 360, b = (a + 60) % 360;
  return `linear-gradient(135deg, hsl(${a} 55% 45%), hsl(${b} 55% 30%))`;
};

export function ProfileView({ initial, loggedIn }: { initial: ProfileData; loggedIn: boolean }) {
  const t = useT();
  const cur = useCurrency();
  const [p, setP] = useState<ProfileData>(initial);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);

  const initials = p.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const slices: DemoSlice[] = [
    ...p.holdings.map((h) => ({ ticker: h.ticker, name: h.name, color: h.color, weight: h.weight, valueTry: h.valueTry })),
    ...(p.cashTry > 0 ? [{ ticker: "NAKİT", name: "Nakit", color: "rgba(26,24,19,0.16)", weight: p.totalTry > 0 ? p.cashTry / p.totalTry : 0, valueTry: p.cashTry }] : []),
  ];
  const up = p.returnPct >= 0;
  const money = (n: number) => fmtMoney(n, cur, p.usdTry);
  const moneyFull = (n: number) => fmtMoneyFull(n, cur, p.usdTry);
  const altMoney = (n: number) => (cur === "usd" ? fmtTry(n) : fmtMoney(n, "usd", p.usdTry));

  const loadComments = useCallback(async () => {
    const r = await fetch(`/api/social/comment?handle=${encodeURIComponent(p.handle)}`, { cache: "no-store" });
    const j = await r.json();
    if (j.ok) setComments(j.comments);
  }, [p.handle]);

  useEffect(() => { loadComments(); }, [loadComments]);

  // Profile owner can delete comments left on their own page.
  async function deleteComment(id: string) {
    if (id.startsWith("tmp-")) return;
    setComments((c) => c.filter((x) => x.id !== id)); // optimistic
    try {
      const r = await fetch("/api/social/comment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id }),
      });
      const j = await r.json();
      if (!j.ok) loadComments(); // re-sync on failure
    } catch {
      loadComments();
    }
  }

  async function toggleFollow() {
    if (!loggedIn) { window.location.href = "/join"; return; }
    setP((s) => ({ ...s, isFollowing: !s.isFollowing, followers: s.followers + (s.isFollowing ? -1 : 1) }));
    const r = await fetch("/api/social/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: p.handle }) });
    const j = await r.json();
    if (j.ok) setP((s) => ({ ...s, isFollowing: j.following, followers: j.followers }));
  }
  async function toggleLike() {
    if (!loggedIn) { window.location.href = "/join"; return; }
    setP((s) => ({ ...s, isLiked: !s.isLiked, likes: s.likes + (s.isLiked ? -1 : 1) }));
    const r = await fetch("/api/social/like", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: p.handle }) });
    const j = await r.json();
    if (j.ok) setP((s) => ({ ...s, isLiked: j.liked, likes: j.likes }));
  }
  // Share the newspaper portfolio card as an actual image (photo), not a link.
  async function shareProfile() {
    if (sharing) return;
    setSharing(true);
    try {
      const text = `${p.name} · XX Arena'da #${p.rank} sırada, ${up ? "+" : ""}${num(p.returnPct)}% getiri`;
      let blob: Blob | null = null;
      try {
        const res = await fetch(`/u/${p.handle}/opengraph-image`, { cache: "no-store" });
        if (res.ok) blob = await res.blob();
      } catch {
        /* fall back to link share below */
      }

      if (blob) {
        const file = new File([blob], `${p.handle}-xx-arena.png`, { type: "image/png" });
        // native share sheet with the image file (mobile)
        if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "XX Arena", text });
            return;
          } catch {
            /* user cancelled — fall through to download */
          }
        }
        // desktop / unsupported → download the PNG
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
        return;
      }

      // last resort: copy the profile link
      await navigator.clipboard.writeText(`${window.location.origin}/u/${p.handle}`);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } finally {
      setSharing(false);
    }
  }
  async function postComment() {
    const text = draft.trim();
    if (!text) return;
    if (!loggedIn) { window.location.href = "/join"; return; }
    setPosting(true);
    // optimistic — appears immediately
    const temp: CommentRow = { id: "tmp-" + Date.now(), body: text, createdAt: new Date().toISOString(), authorName: t.pv_you, authorHandle: "", authorImage: null };
    setComments((c) => [...c, temp]);
    setDraft("");
    try {
      const r = await fetch("/api/social/comment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: p.handle, body: text }) });
      const j = await r.json();
      if (j.ok) setComments((c) => c.map((x) => (x.id === temp.id ? j.comment : x)));
      else setComments((c) => c.filter((x) => x.id !== temp.id));
    } finally { setPosting(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* identity card */}
      <div className="glass" style={{ padding: "24px 28px", display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center" }}>
        <Avatar initials={initials} gradient={gradFor(p.handle)} image={p.image} size={84} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="mono" style={{ fontSize: ".7rem", color: "var(--accent)", letterSpacing: ".08em" }}>
            {`${t.pv_rank} #${p.rank}`}
          </div>
          <h1 className="display" style={{ fontSize: "2rem", margin: "2px 0" }}>{p.name}</h1>
          <div className="mono" style={{ fontSize: ".72rem", color: "var(--muted)" }}>@{p.handle}</div>
          {p.bio && <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: 460, fontSize: ".9rem" }}>{p.bio}</p>}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!p.isSelf && (
            <>
              <button className={p.isFollowing ? "btn" : "btn btn-accent"} style={{ padding: ".7rem 1.2rem" }} onClick={toggleFollow}>
                {p.isFollowing ? t.pv_following : t.pv_follow}
              </button>
              <button className="btn" style={{ padding: ".7rem 1.2rem", color: p.isLiked ? "var(--accent)" : undefined }} onClick={toggleLike}>
                {p.isLiked ? "♥" : "♡"} {p.likes}
              </button>
            </>
          )}
          {p.isSelf && (
            <Link href="/portfolio" className="btn btn-accent" style={{ padding: ".7rem 1.2rem", textDecoration: "none" }}>
              {t.pv_manage}
            </Link>
          )}
          <button className="btn" style={{ padding: ".7rem 1.2rem", opacity: sharing ? 0.6 : 1 }} disabled={sharing} onClick={shareProfile}>
            {sharing ? t.pv_sharing : shared ? t.pv_shared : t.pv_share}
          </button>
        </div>
      </div>

      {/* stats */}
      <div className="glass" style={{ padding: "20px 28px", display: "flex", gap: 30, flexWrap: "wrap", alignItems: "center" }}>
        <Stat label={t.pv_total} value={moneyFull(p.totalTry)} big />
        <Stat label={t.pv_return} value={`${up ? "+" : ""}${num(p.returnPct)}%`} color={up ? "var(--green-t)" : "var(--red-t)"} big />
        <Stat label={t.pv_followers} value={String(p.followers)} />
        <Stat label={t.pv_likes} value={String(p.likes)} />
        <Stat label={t.pv_trades} value={String(p.tradesCount)} />
        {p.equity.length >= 2 && (
          <div style={{ marginLeft: "auto" }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{t.pv_curve}</div>
            <Sparkline data={p.equity} positive={up} width={180} height={48} />
          </div>
        )}
      </div>

      <div className="portfolio-grid" style={{ display: "grid", gridTemplateColumns: "minmax(280px,1fr) minmax(320px,1.1fr)", gap: 18 }}>
        {/* allocation */}
        <div className="glass" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{t.pv_alloc}</div>
          {slices.length > 0 ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 40px 8px" }}>
              <PortfolioWheel slices={slices} initials={initials} gradient={gradFor(p.handle)} image={p.image} size={240} format={money} formatAlt={altMoney} />
            </div>
          ) : (
            <div style={{ color: "var(--muted)", padding: "30px 0", textAlign: "center" }}>{t.pv_no_pos}</div>
          )}
        </div>

        {/* holdings */}
        <div className="glass" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{t.pv_positions}</div>
          {p.holdings.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>{t.pv_no_buys}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {p.holdings.map((h) => {
                const hUp = h.pnlTry >= 0;
                return (
                  <div key={h.ticker} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, background: "var(--fill)", border: "1px solid var(--card-border)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: h.color }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: ".88rem" }}>{h.ticker}</div>
                      <div className="mono" style={{ fontSize: ".62rem", color: "var(--muted)" }}>{(h.weight * 100).toFixed(1)}% · {money(h.valueTry)}</div>
                    </div>
                    <div className="mono" style={{ fontSize: ".78rem", color: hUp ? "var(--green-t)" : "var(--red-t)" }}>
                      {hUp ? "+" : ""}{num(h.pnlPct)}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* leveraged positions (read-only) */}
          <FuturesPositionsList
            positions={p.positions}
            pf={{ cashTry: 0, usdTry: p.usdTry }}
            readOnly
          />
        </div>
      </div>

      {/* trade history (public) */}
      {p.recentTrades.length > 0 && (
        <div className="glass" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{t.pv_history}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {p.recentTrades.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < p.recentTrades.length - 1 ? "1px solid var(--rule)" : "none" }}>
                <span className="mono" style={{ fontSize: ".68rem", padding: ".15rem .5rem", borderRadius: 6, background: t.side === "buy" ? "rgba(74,222,128,0.12)" : "rgba(255,122,133,0.12)", color: t.side === "buy" ? "var(--green-t)" : "var(--red-t)" }}>
                  {t.side === "buy" ? "AL" : "SAT"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{t.ticker}</span>
                  <span className="mono" style={{ fontSize: ".68rem", color: "var(--muted)", marginLeft: 8 }}>
                    {num(t.quantity, 4)} @ {fmtAssetPrice(t.priceNative, t.nativeCcy)}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: ".82rem" }}>{money(t.amountTry)}</div>
                <div className="mono" style={{ fontSize: ".6rem", color: "var(--muted)", width: 84, textAlign: "right" }}>
                  {new Date(t.tradedAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* comments */}
      <div className="glass" style={{ padding: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>{t.pv_comments} ({comments.length})</div>

        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") postComment(); }}
            placeholder={loggedIn ? t.pv_comment_ph : t.pv_comment_login}
            style={{ flex: 1, padding: "11px 14px", borderRadius: 10, background: "var(--input-bg)", color: "var(--ink)", border: "1px solid var(--card-border)", fontSize: ".9rem", outline: "none" }}
          />
          <button className="btn btn-accent" style={{ padding: ".6rem 1.2rem", opacity: posting ? 0.6 : 1 }} disabled={posting} onClick={postComment}>
            {t.pv_send}
          </button>
        </div>

        {comments.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>{t.pv_first_comment}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {comments.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 12 }}>
                {c.authorHandle ? (
                  <Link href={`/u/${c.authorHandle}`} style={{ textDecoration: "none" }}>
                    <Avatar initials={(c.authorName[0] ?? "?").toUpperCase()} gradient={gradFor(c.authorHandle || c.authorName)} image={c.authorImage} size={34} ring={false} />
                  </Link>
                ) : (
                  <Avatar initials={(c.authorName[0] ?? "?").toUpperCase()} gradient={gradFor(c.authorHandle || c.authorName)} image={c.authorImage} size={34} ring={false} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    {c.authorHandle ? (
                      <Link href={`/u/${c.authorHandle}`} style={{ fontWeight: 600, fontSize: ".85rem", color: "var(--ink)", textDecoration: "none" }}>
                        {c.authorName}
                      </Link>
                    ) : (
                      <span style={{ fontWeight: 600, fontSize: ".85rem" }}>{c.authorName}</span>
                    )}
                    {c.authorHandle && <span className="mono" style={{ fontSize: ".6rem", color: "var(--muted)" }}>@{c.authorHandle}</span>}
                    <span className="mono" style={{ fontSize: ".6rem", color: "var(--muted)", marginLeft: "auto" }}>
                      {new Date(c.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {p.isSelf && !c.id.startsWith("tmp-") && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        title={t.pv_delete_comment}
                        aria-label={t.pv_delete_comment}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: ".95rem", lineHeight: 1, padding: "0 2px", marginLeft: 2 }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: ".9rem", marginTop: 2, color: "var(--ink)" }}>{c.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, big }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mono" style={{ fontSize: big ? "1.5rem" : "1.05rem", fontWeight: 600, marginTop: 2, color: color ?? "var(--ink)" }}>{value}</div>
    </div>
  );
}

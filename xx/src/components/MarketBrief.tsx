import { getLivePrices } from "@/lib/prices";
import { getLeaderboard } from "@/lib/portfolio";
import { TRADEABLE_ASSETS, type AssetType } from "@/lib/assets";
import { fmtAssetPrice } from "@/lib/format";
import { getDict, type Locale } from "@/lib/i18n";

const pct = (n: number, locale: Locale) =>
  `${n >= 0 ? "+" : ""}${new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}%`;

interface MoverRow {
  ticker: string;
  name: string;
  chg: number;
  nativePrice: number;
  nativeCcy: string;
  type: AssetType;
}

/**
 * Daily editorial market brief — server-rendered. Top movers across the asset
 * universe, key levels, and the arena's biggest daily moves. Newspaper tone.
 */
export async function MarketBrief({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [snap, board] = await Promise.all([getLivePrices(), getLeaderboard()]);

  const rows: MoverRow[] = TRADEABLE_ASSETS.map((a) => {
    const p = snap.prices[a.ticker];
    if (!p || p.changePct == null) return null;
    return { ticker: a.ticker, name: a.name, chg: p.changePct, nativePrice: p.nativePrice, nativeCcy: p.nativeCcy, type: a.type };
  }).filter((x): x is MoverRow => x !== null);

  const byChg = [...rows].sort((a, b) => b.chg - a.chg);
  const gainers = byChg.slice(0, 4);
  const losers = byChg.slice(-4).reverse();
  const key = ["BTC", "ETH", "BIST100", "NASDAQ"]
    .map((tk) => rows.find((r) => r.ticker === tk))
    .filter((x): x is MoverRow => x !== undefined);

  // arena daily movers
  const arena = board.filter((r) => Number.isFinite(r.dailyPct));
  const byDaily = [...arena].sort((a, b) => b.dailyPct - a.dailyPct);
  const star = byDaily[0];
  const drag = byDaily.length > 1 ? byDaily[byDaily.length - 1] : undefined;
  const leader = board[0];

  const dateline = new Date()
    .toLocaleDateString(locale === "en" ? "en-US" : "tr-TR", { day: "2-digit", month: "long", year: "numeric" })
    .toLocaleUpperCase(locale === "en" ? "en-US" : "tr-TR");

  if (rows.length === 0) return null;

  return (
    <section style={{ borderBottom: "2px solid var(--ink)", background: "var(--paper-2)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px 26px", width: "100%" }}>
        {/* masthead row */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderBottom: "1px solid var(--ink)", paddingBottom: 10, marginBottom: 18 }}>
          <h2 className="display" style={{ fontSize: "clamp(1.4rem,3vw,2rem)", margin: 0 }}>{t.brief_title}</h2>
          <span className="mono" style={{ fontSize: ".6rem", color: "var(--muted)", letterSpacing: ".16em" }}>{t.brief_sub} · {dateline}</span>
        </div>

        {/* key levels strip */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--rule)" }}>
          <KeyLevel label="USD/TRY" value={`${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(snap.usdTry)} ₺`} />
          {key.map((k) => (
            <KeyLevel key={k.ticker} label={k.ticker} value={fmtAssetPrice(k.nativePrice, k.nativeCcy, k.type)} chg={pct(k.chg, locale)} up={k.chg >= 0} />
          ))}
        </div>

        {/* three editorial columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 28 }}>
          <Column title={`${t.brief_market} · ${t.brief_gainers}`}>
            {gainers.map((r) => <MoverLine key={r.ticker} r={r} locale={locale} />)}
          </Column>
          <Column title={`${t.brief_market} · ${t.brief_losers}`}>
            {losers.map((r) => <MoverLine key={r.ticker} r={r} locale={locale} />)}
          </Column>
          <Column title={t.brief_arena}>
            {star ? (
              <>
                <ArenaLine label={t.brief_star} handle={star.handle} name={star.name} chg={pct(star.dailyPct, locale)} up={star.dailyPct >= 0} />
                {drag && <ArenaLine label={t.brief_drag} handle={drag.handle} name={drag.name} chg={pct(drag.dailyPct, locale)} up={drag.dailyPct >= 0} />}
                {leader && <ArenaLine label={t.brief_leader} handle={leader.handle} name={leader.name} chg={pct(leader.returnPct, locale)} up={leader.returnPct >= 0} />}
              </>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: ".82rem", paddingTop: 4 }}>{t.brief_quiet}</div>
            )}
          </Column>
        </div>
      </div>
    </section>
  );
}

function KeyLevel({ label, value, chg, up }: { label: string; value: string; chg?: string; up?: boolean }) {
  return (
    <div style={{ flex: "1 1 130px", padding: "10px 16px 12px 0", borderRight: "1px solid var(--hairline)" }}>
      <div className="eyebrow">{label}</div>
      <div className="mono" style={{ fontSize: ".95rem", fontWeight: 600, marginTop: 4 }}>{value}</div>
      {chg && <div className="mono" style={{ fontSize: ".64rem", marginTop: 2, color: up ? "var(--green-t)" : "var(--red-t)" }}>{chg}</div>}
    </div>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow" style={{ paddingBottom: 8, marginBottom: 6, borderBottom: "1px solid var(--rule)" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function MoverLine({ r, locale }: { r: MoverRow; locale: Locale }) {
  const up = r.chg >= 0;
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--hairline)" }}>
      <div style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: ".86rem" }}>{r.ticker}</span>
        <span className="mono" style={{ fontSize: ".58rem", color: "var(--muted)", marginLeft: 6 }}>{fmtAssetPrice(r.nativePrice, r.nativeCcy, r.type)}</span>
      </div>
      <span className="mono" style={{ fontSize: ".78rem", fontWeight: 600, color: up ? "var(--green-t)" : "var(--red-t)", flexShrink: 0 }}>{pct(r.chg, locale)}</span>
    </div>
  );
}

function ArenaLine({ label, handle, name, chg, up }: { label: string; handle: string; name: string; chg: string; up: boolean }) {
  return (
    <a href={`/u/${handle}`} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--hairline)" }}>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ fontSize: ".5rem" }}>{label}</div>
        <div style={{ fontWeight: 600, fontSize: ".84rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{name}</div>
      </div>
      <span className="mono" style={{ fontSize: ".78rem", fontWeight: 600, color: up ? "var(--green-t)" : "var(--red-t)", flexShrink: 0 }}>{chg}</span>
    </a>
  );
}

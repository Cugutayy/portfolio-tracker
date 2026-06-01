import Link from "next/link";
import { LeaderboardRail } from "@/components/LeaderboardRail";
import { TickerTape } from "@/components/TickerTape";
import { CountUp } from "@/components/CountUp";
import { ArenaPulse } from "@/components/ArenaPulse";
import { AsciiBackdrop } from "@/components/AsciiBackdrop";
import { LanguageToggle } from "@/components/LanguageToggle";
import { InviteButton } from "@/components/InviteButton";
import { getCurrentUser } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { getDict } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const t = getDict(locale);
  const loggedIn = !!user;
  const startHref = loggedIn ? "/portfolio" : "/join";
  const startLabel = loggedIn ? t.nav_portfolio : t.hero_cta_start;

  const dateline = new Date()
    .toLocaleDateString(locale === "en" ? "en-US" : "tr-TR", { day: "2-digit", month: "long", year: "numeric" })
    .toLocaleUpperCase(locale === "en" ? "en-US" : "tr-TR");

  const RULES = [t.rule_1, t.rule_2, t.rule_3, t.rule_4];

  return (
    <main style={{ display: "flex", flexDirection: "column" }}>
      {/* ═══════════ ACT 1 — broadsheet cover ═══════════ */}
      <section
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          borderBottom: "2px solid var(--ink)",
        }}
      >
        {/* masthead */}
        <div style={{ borderBottom: "2px solid var(--ink)" }}>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              padding: "16px 24px",
              maxWidth: 1180,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <div>
              <div className="display" style={{ fontSize: "2rem", lineHeight: 1 }}>
                XX
              </div>
              <div className="eyebrow" style={{ marginTop: 3, letterSpacing: ".34em" }}>
                Arena
              </div>
            </div>
            <nav style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <LanguageToggle locale={locale} />
              <Link href="/arena" className="btn" style={{ textDecoration: "none" }}>
                {t.nav_arena}
              </Link>
              {loggedIn ? (
                <Link href="/portfolio" className="btn btn-accent" style={{ textDecoration: "none" }}>
                  {t.nav_portfolio}
                </Link>
              ) : (
                <Link href="/join" className="btn btn-accent" style={{ textDecoration: "none" }}>
                  {t.nav_login}
                </Link>
              )}
            </nav>
          </header>
        </div>

        {/* edition line */}
        <div style={{ borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              padding: "7px 24px",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span className="mono" style={{ fontSize: ".6rem", color: "var(--muted)", letterSpacing: ".16em" }}>
              {t.edition_issue} · {dateline}
            </span>
          </div>
        </div>

        {/* live ASCII price tape */}
        <TickerTape />

        {/* live social-proof ribbon */}
        <ArenaPulse />

        {/* competition announcement — breaking bar */}
        <Link
          href="/yarisma"
          style={{ textDecoration: "none", display: "block", background: "var(--ink)", color: "var(--paper)" }}
        >
          <div
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              padding: "11px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
              textAlign: "center",
            }}
          >
            <span className="mono" style={{ fontSize: ".62rem", letterSpacing: ".24em", opacity: 0.85 }}>
              XX // ARENA
            </span>
            <span className="mono" style={{ fontSize: ".72rem", letterSpacing: ".06em", fontWeight: 500 }}>
              {t.announce_band}
            </span>
            <span className="mono" style={{ fontSize: ".66rem", letterSpacing: ".12em", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t.announce_detail}
            </span>
          </div>
        </Link>

        {/* front-page splash */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            maxWidth: 1000,
            margin: "0 auto",
            padding: "44px 24px 28px",
            width: "100%",
          }}
        >
          <AsciiBackdrop />
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <div
              className="eyebrow fade-up"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 22, animationDelay: ".05s" }}
            >
              <span className="live-dot" />
              {t.hero_eyebrow}
            </div>
            <h1
              className="display fade-up"
              style={{ fontSize: "clamp(3rem, 8.5vw, 7rem)", lineHeight: 0.97, margin: 0, animationDelay: ".16s" }}
            >
              {t.hero_h1_a}
              <br />
              <span className="italic-accent">{t.hero_h1_b}</span>
            </h1>
            <p
              className="fade-up"
              style={{
                color: "var(--ink-soft)",
                fontSize: "clamp(1rem, 1.8vw, 1.18rem)",
                maxWidth: 560,
                marginTop: 26,
                lineHeight: 1.55,
                animationDelay: ".3s",
              }}
            >
              {t.hero_sub}
            </p>
            <div
              className="fade-up"
              style={{ display: "flex", gap: 12, marginTop: 34, flexWrap: "wrap", justifyContent: "center", animationDelay: ".44s" }}
            >
              <Link
                href="#edisyon"
                className="btn btn-accent"
                style={{ textDecoration: "none", padding: ".95rem 1.9rem", fontSize: "1rem" }}
              >
                {t.hero_cta_board}
              </Link>
              <Link
                href={startHref}
                className="btn"
                style={{ textDecoration: "none", padding: ".95rem 1.9rem", fontSize: "1rem" }}
              >
                {startLabel}
              </Link>
              <InviteButton className="btn" label="Davet et ↗" />
            </div>
          </div>
        </div>

        {/* cover footer — scroll cue */}
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          <div
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              padding: "11px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span className="mono" style={{ fontSize: ".6rem", color: "var(--muted)", letterSpacing: ".14em" }}>
              {t.cover_edu}
            </span>
            <Link
              href="#edisyon"
              className="mono"
              style={{ fontSize: ".62rem", color: "var(--muted)", textDecoration: "none", letterSpacing: ".16em" }}
            >
              {t.cover_board}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ ACT 2 — live edition ═══════════ */}
      <section
        id="edisyon"
        className="portfolio-grid"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "72px 24px 88px",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 48,
          alignItems: "center",
        }}
      >
        <div className="fade-up">
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            {t.edition_live}
          </div>
          <h2
            className="display"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", margin: "0 0 18px", lineHeight: 1.04 }}
          >
            {t.rules_h2_a}
            <br />
            <span className="italic-accent">{t.rules_h2_b}</span>
          </h2>

          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
            {RULES.map((r, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "14px 0",
                  borderBottom: i < RULES.length - 1 ? "1px solid var(--rule)" : "none",
                }}
              >
                <span className="display" style={{ fontSize: "1.05rem", color: "var(--muted)", width: 26, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontSize: ".95rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>{r}</span>
              </li>
            ))}
          </ol>

          <div style={{ display: "flex", gap: 0, flexWrap: "wrap", marginTop: 26, borderTop: "1px solid var(--rule)" }}>
            <Stat k={t.stat_start} n={1000000} suffix=" ₺" />
            <Stat k={t.stat_max} n={10} />
            <Stat k={t.stat_daily} n={10} />
            <Stat k={t.stat_data} v={t.stat_live} live />
          </div>

          <div style={{ marginTop: 30 }}>
            <Link
              href={startHref}
              className="btn btn-accent"
              style={{ textDecoration: "none", padding: ".9rem 1.7rem", fontSize: ".98rem" }}
            >
              {loggedIn ? `${t.nav_portfolio} →` : t.cta_start_arrow}
            </Link>
          </div>
        </div>

        <div className="fade-up" style={{ display: "flex", justifyContent: "center" }}>
          <LeaderboardRail locale={locale} />
        </div>
      </section>
    </main>
  );
}

function Stat({
  k,
  v,
  n,
  suffix,
  live,
}: {
  k: string;
  v?: string;
  n?: number;
  suffix?: string;
  live?: boolean;
}) {
  return (
    <div
      style={{
        flex: "1 1 120px",
        padding: "16px 18px 16px 0",
        borderRight: "1px solid var(--hairline)",
      }}
    >
      <div className="eyebrow">{k}</div>
      <div
        className="mono"
        style={{
          fontSize: "1.05rem",
          fontWeight: 500,
          marginTop: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {live && <span className="live-dot" />}
        {n != null ? <CountUp value={n} suffix={suffix} /> : v}
      </div>
    </div>
  );
}

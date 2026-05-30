import Link from "next/link";
import { LeaderboardRail } from "@/components/LeaderboardRail";
import { TickerTape } from "@/components/TickerTape";

const DATELINE = new Date().toLocaleDateString("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default function Home() {
  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* ── Masthead ── */}
      <div style={{ borderBottom: "1px solid var(--rule)" }}>
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "18px 24px 14px",
            maxWidth: 1180,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Sanal trader arenası · {DATELINE}
            </div>
            <span className="display" style={{ fontSize: "2.1rem", lineHeight: 1 }}>
              XX
            </span>
          </div>
          <nav style={{ display: "flex", gap: 10 }}>
            <Link href="/arena" className="btn" style={{ textDecoration: "none" }}>
              Arena
            </Link>
            <Link href="/join" className="btn btn-accent" style={{ textDecoration: "none" }}>
              Giriş yap
            </Link>
          </nav>
        </header>
      </div>

      {/* ── Live ASCII price tape ── */}
      <TickerTape />

      {/* ── Hero ── */}
      <section
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 48,
          alignItems: "center",
          maxWidth: 1180,
          margin: "0 auto",
          padding: "56px 24px 80px",
          width: "100%",
        }}
        className="portfolio-grid"
      >
        <div className="fade-up">
          <div
            className="eyebrow"
            style={{
              marginBottom: 22,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span className="live-dot" />
            1.000.000 ₺ · gerçek piyasa fiyatları · canlı yarışma
          </div>
          <h1
            className="display"
            style={{ fontSize: "clamp(2.8rem, 6.5vw, 5rem)", margin: 0 }}
          >
            Portföyünü kur,
            <br />
            <span className="italic-accent">traderlarla yarış.</span>
          </h1>

          <div
            className="mono"
            style={{
              color: "var(--muted)",
              fontSize: ".62rem",
              letterSpacing: ".12em",
              margin: "20px 0 18px",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            ──────────────────────────────────────────
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
            <Link
              href="/join"
              className="btn btn-accent"
              style={{ textDecoration: "none", padding: ".85rem 1.6rem" }}
            >
              Hemen başla →
            </Link>
            <Link
              href="/arena"
              className="btn"
              style={{ textDecoration: "none", padding: ".85rem 1.6rem" }}
            >
              Liderliği gör
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              gap: 0,
              marginTop: 42,
              flexWrap: "wrap",
              borderTop: "1px solid var(--rule)",
            }}
          >
            <Stat k="Başlangıç" v="1.000.000 ₺" />
            <Stat k="Maks. varlık" v="5" />
            <Stat k="Günlük işlem" v="5" />
            <Stat k="Veri" v="Canlı" live />
          </div>
        </div>

        <div className="fade-up" style={{ display: "flex", justifyContent: "center" }}>
          <LeaderboardRail />
        </div>
      </section>
    </main>
  );
}

function Stat({ k, v, live }: { k: string; v: string; live?: boolean }) {
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
        {v}
      </div>
    </div>
  );
}

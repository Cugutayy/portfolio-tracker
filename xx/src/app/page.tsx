import Link from "next/link";
import { LeaderboardRail } from "@/components/LeaderboardRail";
import { TickerTape } from "@/components/TickerTape";
import { Logo } from "@/components/Logo";
import { CountUp } from "@/components/CountUp";

const DATELINE = new Date().toLocaleDateString("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export default function Home() {
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
              padding: "16px 24px",
              maxWidth: 1180,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Logo size={48} />
              <div>
                <div className="display" style={{ fontSize: "2rem", lineHeight: 1 }}>
                  XX
                </div>
                <div className="eyebrow" style={{ marginTop: 3 }}>
                  Sanal Trader Arenası
                </div>
              </div>
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
              SAYI No. 1 · {DATELINE.toLocaleUpperCase("tr")}
            </span>
          </div>
        </div>

        {/* live ASCII price tape */}
        <TickerTape />

        {/* front-page splash */}
        <div
          style={{
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
          <div
            className="eyebrow fade-up"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 22, animationDelay: ".05s" }}
          >
            <span className="live-dot" />
            1.000.000 ₺ · gerçek piyasa fiyatları · canlı yarışma
          </div>
          <h1
            className="display fade-up"
            style={{ fontSize: "clamp(3rem, 8.5vw, 7rem)", lineHeight: 0.97, margin: 0, animationDelay: ".16s" }}
          >
            Portföyünü kur,
            <br />
            <span className="italic-accent">traderlarla yarış.</span>
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
            Sanal 1.000.000 ₺ ile başla, en fazla 5 varlık seç, gerçek piyasa
            fiyatlarıyla yarış. En iyi getiri zirveye çıkar.
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
              Edisyona gir →
            </Link>
            <Link
              href="/join"
              className="btn"
              style={{ textDecoration: "none", padding: ".95rem 1.9rem", fontSize: "1rem" }}
            >
              Hemen başla
            </Link>
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
              Eğitim amaçlı · gerçek para yok
            </span>
            <Link
              href="#edisyon"
              className="mono"
              style={{ fontSize: ".62rem", color: "var(--muted)", textDecoration: "none", letterSpacing: ".16em" }}
            >
              CANLI LİDERLİK ↓
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
            Canlı edisyon
          </div>
          <h2
            className="display"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)", margin: "0 0 18px", lineHeight: 1.04 }}
          >
            Kurallar basit,
            <br />
            <span className="italic-accent">rekabet gerçek.</span>
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
            <Stat k="Başlangıç" n={1000000} suffix=" ₺" />
            <Stat k="Maks. varlık" n={5} />
            <Stat k="Günlük işlem" n={5} />
            <Stat k="Veri" v="Canlı" live />
          </div>

          <div style={{ marginTop: 30 }}>
            <Link
              href="/join"
              className="btn btn-accent"
              style={{ textDecoration: "none", padding: ".9rem 1.7rem", fontSize: ".98rem" }}
            >
              Hemen başla →
            </Link>
          </div>
        </div>

        <div className="fade-up" style={{ display: "flex", justifyContent: "center" }}>
          <LeaderboardRail />
        </div>
      </section>
    </main>
  );
}

const RULES = [
  "1.000.000 ₺ sanal sermaye ile başlarsın — gerçek para yok, gerçek fiyatlar var.",
  "Kripto, emtia, S&P 500, NASDAQ 100 ve BIST 100’den en fazla 5 varlık seçersin.",
  "Günde en fazla 5 işlem; her fiyat CoinGecko ve Yahoo Finance’ten canlı akar.",
  "En yüksek getiriyi yapan, canlı liderlik tablosunun zirvesine çıkar.",
];

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

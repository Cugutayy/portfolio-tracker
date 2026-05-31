import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TITLE = "Büyük yarış başladı — XX Arena";
const DESCRIPTION =
  "3 aylık trader turnuvası başladı. 1.000.000 ₺ sanal sermaye, gerçek piyasa fiyatları, ilk 3'e sürpriz para ödülü. Katıl, yarış.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const RULES = [
  "1.000.000 ₺ sanal sermaye ile başlarsın — gerçek para yok, gerçek fiyatlar var.",
  "Kripto, emtia, S&P 500, NASDAQ 100 ve BIST 100’den en fazla 10 varlık tutarsın.",
  "Günde en fazla 10 işlem; her fiyat CoinGecko ve Yahoo Finance’ten canlı akar.",
  "Yarış 3 ay sürer. En yüksek getiriyi yapan ilk 3, sürpriz para ödüllerini kazanır.",
];

export default function YarismaPage() {
  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* masthead */}
      <div style={{ borderBottom: "2px solid var(--ink)" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", width: "100%", padding: "20px 24px", textAlign: "center" }}>
          <Link href="/" style={{ textDecoration: "none", color: "var(--ink)" }}>
            <div className="display" style={{ fontSize: "2.4rem", lineHeight: 1 }}>XX Arena</div>
          </Link>
        </div>
        <div style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div
            style={{
              maxWidth: 920,
              margin: "0 auto",
              padding: "8px 24px",
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-mono)",
              fontSize: ".6rem",
              letterSpacing: ".16em",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            <span>Özel Sayı · 31 Mayıs – 31 Ağustos 2026</span>
            <span>Son Dakika</span>
          </div>
        </div>
      </div>

      {/* announcement */}
      <section
        style={{
          flex: 1,
          maxWidth: 920,
          margin: "0 auto",
          width: "100%",
          padding: "56px 24px 72px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div className="eyebrow fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18, color: "var(--green-t)" }}>
          <span className="live-dot" />
          Son dakika · büyük turnuva
        </div>

        <h1 className="display fade-up" style={{ fontSize: "clamp(2.8rem, 8vw, 6rem)", lineHeight: 0.98, margin: 0 }}>
          Büyük yarış
          <br />
          <span className="italic-accent">başladı.</span>
        </h1>

        <p className="fade-up" style={{ color: "var(--ink-soft)", fontSize: "clamp(1.05rem, 2vw, 1.3rem)", maxWidth: 620, marginTop: 24, lineHeight: 1.55 }}>
          3 ay sürecek trader turnuvası başladı. <strong>1.000.000 ₺</strong> sanal
          sermaye ile en iyi getiriyi yakala — <strong>ilk 3’e sürpriz para
          ödülleri.</strong>
        </p>

        {/* rules */}
        <ol style={{ listStyle: "none", margin: "34px 0 0", padding: 0, maxWidth: 640, width: "100%", textAlign: "left" }}>
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
              <span style={{ fontSize: ".98rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>{r}</span>
            </li>
          ))}
        </ol>

        <div style={{ display: "flex", gap: 12, marginTop: 38, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/join" className="btn btn-accent" style={{ textDecoration: "none", padding: "1rem 2rem", fontSize: "1.05rem" }}>
            Hemen katıl →
          </Link>
          <Link href="/arena" className="btn" style={{ textDecoration: "none", padding: "1rem 2rem", fontSize: "1.05rem" }}>
            Canlı liderlik
          </Link>
        </div>

        <p className="mono" style={{ marginTop: 28, fontSize: ".62rem", color: "var(--muted)", letterSpacing: ".08em", maxWidth: 520, lineHeight: 1.6 }}>
          Bu sayfayı arkadaşlarına gönder — link paylaşınca yarışma afişi otomatik
          görünür. Eğitim amaçlı · gerçek para yatırılmaz.
        </p>
      </section>
    </main>
  );
}

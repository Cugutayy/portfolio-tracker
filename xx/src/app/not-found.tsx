import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        gap: 4,
      }}
    >
      <div className="display" style={{ fontSize: "1.8rem" }}>XX Arena</div>

      <div className="eyebrow" style={{ marginTop: 22 }}>
        Sayı No. 404
      </div>
      <h1
        className="display"
        style={{ fontSize: "clamp(2.6rem, 7vw, 4.5rem)", margin: "8px 0 0", lineHeight: 1 }}
      >
        Bu sayfa baskıya
        <br />
        <span className="italic-accent">girmemiş.</span>
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "1rem", maxWidth: 420, marginTop: 18, lineHeight: 1.55 }}>
        Aradığın edisyon arşivde yok ya da kaldırılmış. Ana sayfaya dönüp
        canlı arenaya göz atabilirsin.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="btn btn-accent" style={{ textDecoration: "none", padding: ".85rem 1.7rem" }}>
          Ana sayfa →
        </Link>
        <Link href="/arena" className="btn" style={{ textDecoration: "none", padding: ".85rem 1.7rem" }}>
          Arena
        </Link>
      </div>
    </main>
  );
}

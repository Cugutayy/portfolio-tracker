import { ImageResponse } from "next/og";
import { OG, OG_SIZE, loadOgFonts } from "@/lib/og";
import { getLeaderboard } from "@/lib/portfolio";

export const runtime = "nodejs";
export const alt = "XX Arena · Büyük Yarış Başladı";
export const size = OG_SIZE;
export const contentType = "image/png";

const { BG, PAPER, INK, MUTED, GREEN, RED, RULE } = OG;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://xx-arena.vercel.app").replace(/^https?:\/\//, "");

const DATELINE = new Date()
  .toLocaleDateString("tr-TR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
  .toLocaleUpperCase("tr");

// greeked body text — thin bars that read as newsprint columns from afar
function greek(widths: number[], key: string) {
  return widths.map((w, i) => (
    <div
      key={`${key}-${i}`}
      style={{ display: "flex", height: 7, width: `${w}%`, background: RULE, borderRadius: 2, marginBottom: 9 }}
    />
  ));
}

function column(title: string, lead: string, widths: number[], displayFont: string, borderLeft: boolean) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: borderLeft ? "0 18px" : "0 18px 0 0",
        borderLeft: borderLeft ? `1px solid ${RULE}` : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: displayFont,
          fontSize: 26,
          color: INK,
          lineHeight: 1.05,
          paddingBottom: 8,
          marginBottom: 12,
          borderBottom: `2px solid ${INK}`,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", fontSize: 15, color: INK, lineHeight: 1.4, marginBottom: 14 }}>{lead}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>{greek(widths, title)}</div>
    </div>
  );
}

// live top-3 standings column (top gainers); falls back to the greeked
// "Canlı piyasa" column when nobody has joined yet.
function standings(
  top: { handle: string; returnPct: number }[],
  displayFont: string,
) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "0 0 0 18px", borderLeft: `1px solid ${RULE}` }}>
      <div style={{ display: "flex", fontFamily: displayFont, fontSize: 26, color: INK, lineHeight: 1.05, paddingBottom: 8, marginBottom: 12, borderBottom: `2px solid ${INK}` }}>
        Canlı ilk 3
      </div>
      {top.map((r, i) => {
        const up = r.returnPct >= 0;
        return (
          <div key={r.handle} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
            <span style={{ display: "flex", fontFamily: displayFont, fontSize: 26, color: GREEN, width: 20 }}>{i + 1}</span>
            <span style={{ display: "flex", flex: 1, fontSize: 18, color: INK, overflow: "hidden" }}>{`@${r.handle}`}</span>
            <span style={{ display: "flex", fontSize: 19, fontWeight: 700, color: up ? GREEN : RED }}>
              {`${up ? "+" : ""}${r.returnPct.toFixed(1)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Shareable competition poster — a full broadsheet front page.
export default async function Image() {
  const { fonts, display } = await loadOgFonts();
  const board = await getLeaderboard().catch(() => []);
  const top3 = [...board].sort((a, b) => b.returnPct - a.returnPct).slice(0, 3);

  const sideBox = (a: string, b: string) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${INK}`,
        padding: "8px 14px",
        fontFamily: display,
        fontStyle: "italic",
        fontSize: 17,
        color: INK,
        lineHeight: 1.15,
        width: 150,
      }}
    >
      <span>{a}</span>
      <span>{b}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BG, padding: 34, fontFamily: "Sans" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: PAPER,
            border: `2px solid ${INK}`,
            padding: "26px 40px 22px",
          }}
        >
          {/* ── masthead ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {sideBox("Eğitim", "amaçlı")}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", fontFamily: display, fontSize: 86, color: INK, lineHeight: 1 }}>XX ARENA</div>
              <div style={{ display: "flex", fontSize: 14, letterSpacing: 6, color: MUTED, textTransform: "uppercase", marginTop: 2 }}>
                Sanal Trader Arenası
              </div>
            </div>
            {sideBox("Günlük", "rapor")}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: `3px solid ${INK}`,
              borderBottom: `1px solid ${INK}`,
              padding: "6px 2px",
              marginTop: 12,
              fontSize: 13,
              letterSpacing: 1.5,
              color: MUTED,
              textTransform: "uppercase",
            }}
          >
            <span>Sayfa 1</span>
            <span>{`${DATELINE} · Sayı No. 1`}</span>
            <span>Fiyatlar Canlı</span>
          </div>

          {/* ── lead headline ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0 10px", borderBottom: `2px solid ${INK}` }}>
            <div style={{ display: "flex", fontSize: 16, letterSpacing: 5, color: GREEN, textTransform: "uppercase", marginBottom: 4 }}>
              Son Dakika · Büyük Turnuva
            </div>
            <div style={{ display: "flex", fontFamily: display, fontSize: 84, color: INK, lineHeight: 1 }}>
              Büyük yarış başladı.
            </div>
            <div style={{ display: "flex", fontSize: 19, color: INK, marginTop: 6 }}>
              1.000.000 ₺ sanal sermaye · 3 ay · ilk 3’e sürpriz para ödülü
            </div>
          </div>

          {/* ── columns ── */}
          <div style={{ display: "flex", flex: 1, paddingTop: 16 }}>
            {column(
              "Nasıl oynanır?",
              "1.000.000 ₺ sanal parayla başla; en fazla 10 varlık, günde 10 işlem.",
              [100, 100, 96, 100, 92, 100, 70],
              display,
              false,
            )}
            {column(
              "İlk 3’e ödül",
              "Üç ay sonunda en yüksek getiriyi yapan ilk üç trader sürpriz para ödülü kazanır.",
              [100, 94, 100, 88, 100, 64],
              display,
              true,
            )}
            {top3.length > 0
              ? standings(top3, display)
              : column(
                  "Canlı piyasa",
                  "Kripto, BIST, NASDAQ ve emtia, her fiyat CoinGecko ve Yahoo’dan canlı akar.",
                  [100, 100, 90, 100, 96, 100, 78],
                  display,
                  true,
                )}
          </div>

          {/* ── breaking footer ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: INK,
              color: PAPER,
              padding: "10px 16px",
              marginTop: 8,
              fontSize: 17,
              letterSpacing: 1,
            }}
          >
            <span style={{ display: "flex", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>
              Katıl
            </span>
            <span style={{ display: "flex", fontWeight: 600 }}>{`${SITE}/yarisma`}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "flex", width: 10, height: 10, borderRadius: 5, background: GREEN }} />
              CANLI
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

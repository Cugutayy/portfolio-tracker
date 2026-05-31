import { ImageResponse } from "next/og";
import { OG, OG_SIZE, loadOgFonts } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "XX Arena";
export const size = OG_SIZE;
export const contentType = "image/png";

const { BG, PAPER, INK, MUTED, GREEN, RULE } = OG;

const DATELINE = new Date()
  .toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
  .toLocaleUpperCase("tr");

// Site-wide share card — a broadsheet front page.
export default async function Image() {
  const { fonts, display } = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: 44,
          fontFamily: "Sans",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: PAPER,
            border: `2px solid ${INK}`,
            padding: "42px 54px 36px",
          }}
        >
          {/* nameplate */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingBottom: 12 }}>
              <div style={{ display: "flex", fontFamily: display, fontSize: 68, color: INK, lineHeight: 1 }}>XX Arena</div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: `3px solid ${INK}`,
                borderBottom: `1px solid ${INK}`,
                padding: "9px 2px",
                fontSize: 17,
                letterSpacing: 2,
                color: MUTED,
                textTransform: "uppercase",
              }}
            >
              <span>{`Sayı No. 1 · ${DATELINE}`}</span>
              <span>Sanal Trader Arenası</span>
            </div>
          </div>

          {/* manşet */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 19, letterSpacing: 4, color: GREEN, textTransform: "uppercase", marginBottom: 10 }}>
              Birinci Sayfa · Canlı Yarışma
            </div>
            <div style={{ fontFamily: display, fontSize: 90, color: INK, lineHeight: 1.0 }}>
              Portföyünü kur,
            </div>
            <div style={{ fontFamily: display, fontStyle: "italic", fontSize: 90, color: INK, lineHeight: 1.04 }}>
              traderlarla yarış.
            </div>
          </div>

          {/* lead + footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${INK}`, paddingTop: 16, fontSize: 23, color: MUTED }}>
            <span>1.000.000 ₺ sanal sermaye · en fazla 5 varlık · gerçek piyasa fiyatları</span>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 11, height: 11, borderRadius: 6, background: GREEN, display: "flex" }} />
              CANLI
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

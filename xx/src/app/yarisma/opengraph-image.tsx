import { ImageResponse } from "next/og";
import { OG, OG_SIZE, loadOgFonts } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "XX Arena — Büyük Yarış Başladı";
export const size = OG_SIZE;
export const contentType = "image/png";

const { BG, PAPER, INK, MUTED, GREEN } = OG;

const START = "31 MAYIS";
const END = "31 AĞUSTOS 2026";

// Shareable competition-announcement poster (a broadsheet "breaking" page).
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
            padding: "40px 54px 34px",
          }}
        >
          {/* nameplate */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "center", paddingBottom: 12 }}>
              <div style={{ display: "flex", fontFamily: display, fontSize: 64, color: INK, lineHeight: 1 }}>XX Arena</div>
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
              <span>Özel Sayı · {`${START} – ${END}`}</span>
              <span>Son Dakika</span>
            </div>
          </div>

          {/* manşet */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 20, letterSpacing: 5, color: GREEN, textTransform: "uppercase", marginBottom: 10 }}>
              Son Dakika · Büyük Turnuva
            </div>
            <div style={{ display: "flex", fontFamily: display, fontSize: 96, color: INK, lineHeight: 0.98 }}>
              Büyük yarış
            </div>
            <div style={{ display: "flex", fontFamily: display, fontStyle: "italic", fontSize: 96, color: INK, lineHeight: 1.02 }}>
              başladı.
            </div>
          </div>

          {/* lead box */}
          <div style={{ display: "flex", flexDirection: "column", borderTop: `2px solid ${INK}`, paddingTop: 16 }}>
            <div style={{ display: "flex", fontSize: 30, color: INK, marginBottom: 10 }}>
              3 ay sürecek · İlk 3’e sürpriz para ödülü
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 23, color: MUTED }}>
              <span>1.000.000 ₺ sanal sermaye · gerçek piyasa fiyatları · katıl, yarış</span>
              <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 11, height: 11, borderRadius: 6, background: GREEN, display: "flex" }} />
                CANLI
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

import { ImageResponse } from "next/og";
import { OG, OG_LEAF, OG_SIZE, loadOgFonts } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "XX — Sanal Trader Arenası";
export const size = OG_SIZE;
export const contentType = "image/png";

const { BG, PAPER, INK, MUTED, GREEN } = OG;

// Site-wide share card: the broadsheet promo shown when the main link is
// posted to WhatsApp / X / Telegram.
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
          padding: 56,
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
            borderRadius: 24,
            padding: "52px 60px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={OG_LEAF} width={60} height={60} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontFamily: display, fontSize: 44, color: INK, lineHeight: 1 }}>XX</div>
              <div
                style={{
                  fontSize: 16,
                  letterSpacing: 4,
                  color: MUTED,
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                Sanal Trader Arenası
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: display, fontSize: 84, color: INK, lineHeight: 1.04 }}>
              Portföyünü kur,
            </div>
            <div
              style={{
                fontFamily: display,
                fontStyle: "italic",
                fontSize: 84,
                color: INK,
                lineHeight: 1.04,
              }}
            >
              traderlarla yarış.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 24,
              color: MUTED,
            }}
          >
            <span>1.000.000 ₺ sanal sermaye · gerçek piyasa fiyatları</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: GREEN, display: "flex" }} />
              CANLI
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

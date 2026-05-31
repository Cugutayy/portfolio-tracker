import { ImageResponse } from "next/og";
import { getPublicProfile } from "@/lib/portfolio";
import { OG, OG_LEAF, OG_SIZE, tryFmt, loadOgFonts } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "XX — Sanal Trader Arenası";
export const size = OG_SIZE;
export const contentType = "image/png";

const { BG, PAPER, INK, MUTED, GREEN, RED, RULE } = OG;
const LEAF = OG_LEAF;

export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle, null).catch(() => null);
  const { fonts, display } = await loadOgFonts();

  const Frame = (children: React.ReactNode) => (
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
          background: PAPER,
          border: `2px solid ${INK}`,
          borderRadius: 24,
          padding: "52px 60px",
        }}
      >
        {children}
      </div>
    </div>
  );

  const Header = (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LEAF} width={60} height={60} alt="" />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: display, fontSize: 44, color: INK, lineHeight: 1 }}>XX</div>
        <div style={{ fontSize: 16, letterSpacing: 4, color: MUTED, textTransform: "uppercase", marginTop: 4 }}>
          Sanal Trader Arenası
        </div>
      </div>
    </div>
  );

  if (!profile) {
    return new ImageResponse(
      Frame(
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {Header}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: display, fontSize: 84, color: INK, lineHeight: 1.04 }}>
              Portföyünü kur,
            </div>
            <div style={{ fontFamily: display, fontStyle: "italic", fontSize: 84, color: INK, lineHeight: 1.04 }}>
              traderlarla yarış.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, color: MUTED }}>
            <span>1.000.000 ₺ sanal sermaye · gerçek piyasa fiyatları</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: GREEN, display: "flex" }} />
              CANLI
            </span>
          </div>
        </div>,
      ),
      { ...size, fonts },
    );
  }

  const up = profile.returnPct >= 0;
  const tickers = profile.holdings.slice(0, 5).map((h) => h.ticker);

  return new ImageResponse(
    Frame(
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {Header}

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, color: GREEN, letterSpacing: 3, marginBottom: 6 }}>
            {`SIRA #${profile.rank}`}
          </div>
          <div style={{ fontFamily: display, fontSize: 78, color: INK, lineHeight: 1 }}>
            {profile.name}
          </div>
          <div style={{ fontSize: 28, color: MUTED, marginTop: 8 }}>{`@${profile.handle}`}</div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 56 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 20, color: MUTED, letterSpacing: 3, textTransform: "uppercase" }}>Getiri</div>
              <div style={{ fontSize: 64, fontWeight: 700, color: up ? GREEN : RED }}>
                {`${up ? "+" : ""}${profile.returnPct.toFixed(1)}%`}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 20, color: MUTED, letterSpacing: 3, textTransform: "uppercase" }}>Toplam değer</div>
              <div style={{ fontSize: 64, fontWeight: 700, color: INK }}>{tryFmt(profile.totalTry)}</div>
            </div>
          </div>
          {tickers.length > 0 && (
            <div style={{ display: "flex", gap: 8, maxWidth: 380, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {tickers.map((t) => (
                <div
                  key={t}
                  style={{
                    fontSize: 22,
                    color: INK,
                    border: `1px solid ${RULE}`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    display: "flex",
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>,
    ),
    { ...size, fonts },
  );
}

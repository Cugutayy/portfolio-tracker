import { ImageResponse } from "next/og";
import { getPublicProfile } from "@/lib/portfolio";
import { OG, OG_LEAF, OG_SIZE, tryFmt, loadOgFonts } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "XX Arena";
export const size = OG_SIZE;
export const contentType = "image/png";

const { BG, PAPER, INK, MUTED, GREEN, RED, RULE } = OG;

const DATELINE = new Date()
  .toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
  .toLocaleUpperCase("tr");

function nameplate(right: string, displayFont: string) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, paddingBottom: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={OG_LEAF} width={46} height={46} alt="" />
        <div style={{ display: "flex", fontFamily: displayFont, fontSize: 66, color: INK, lineHeight: 1 }}>
          XX Arena
        </div>
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
        <span>{right}</span>
      </div>
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle, null).catch(() => null);
  const { fonts, display } = await loadOgFonts();

  const outer = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    background: BG,
    padding: 44,
    fontFamily: "Sans",
  };
  const page = {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between" as const,
    background: PAPER,
    border: `2px solid ${INK}`,
    padding: "42px 54px 36px",
  };

  if (!profile) {
    return new ImageResponse(
      (
        <div style={outer}>
          <div style={page}>
            {nameplate("Sanal Trader Arenası", display)}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontFamily: display, fontSize: 90, color: INK, lineHeight: 1 }}>Portföyünü kur,</div>
              <div style={{ display: "flex", fontFamily: display, fontStyle: "italic", fontSize: 90, color: INK, lineHeight: 1.04 }}>traderlarla yarış.</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${INK}`, paddingTop: 16, fontSize: 23, color: MUTED }}>
              <span>1.000.000 ₺ sanal sermaye · gerçek piyasa fiyatları</span>
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

  const up = profile.returnPct >= 0;
  const tickers = profile.holdings.slice(0, 5).map((h) => h.ticker);
  const initials = profile.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr");

  return new ImageResponse(
    (
      <div style={outer}>
        <div style={page}>
          {nameplate(`Sıra #${profile.rank}`, display)}

          {/* featured-trader story */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 19, letterSpacing: 4, color: GREEN, textTransform: "uppercase", marginBottom: 8 }}>
              Canlı Liderlik · Portföy Raporu
            </div>
            <div style={{ display: "flex", fontFamily: display, fontSize: 72, color: INK, lineHeight: 1 }}>
              {profile.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
              {profile.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.image} width={92} height={92} alt="" style={{ borderRadius: 46, objectFit: "cover", border: `2px solid ${INK}` }} />
              ) : (
                <div style={{ display: "flex", width: 92, height: 92, borderRadius: 46, background: GREEN, border: `2px solid ${INK}`, alignItems: "center", justifyContent: "center", color: PAPER, fontFamily: display, fontSize: 40 }}>
                  {initials}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 30, color: INK }}>{`@${profile.handle}`}</div>
                <div style={{ display: "flex", fontSize: 18, color: MUTED, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>
                  Sanal 1.000.000 ₺ portföy
                </div>
              </div>
            </div>
          </div>

          {/* data box */}
          <div style={{ display: "flex", borderTop: `2px solid ${INK}`, borderBottom: `1px solid ${RULE}` }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 0 14px 0" }}>
              <div style={{ display: "flex", fontSize: 17, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>Getiri</div>
              <div style={{ display: "flex", fontSize: 50, fontWeight: 700, color: up ? GREEN : RED, marginTop: 4 }}>
                {`${up ? "+" : ""}${profile.returnPct.toFixed(1)}%`}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 0 14px 22px", borderLeft: `1px solid ${RULE}` }}>
              <div style={{ display: "flex", fontSize: 17, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>Toplam değer</div>
              <div style={{ display: "flex", fontSize: 50, fontWeight: 700, color: INK, marginTop: 4 }}>{tryFmt(profile.totalTry)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 0 14px 22px", borderLeft: `1px solid ${RULE}` }}>
              <div style={{ display: "flex", fontSize: 17, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>İşlem</div>
              <div style={{ display: "flex", fontSize: 50, fontWeight: 700, color: INK, marginTop: 4 }}>{String(profile.tradesCount)}</div>
            </div>
          </div>

          {/* footer: holdings */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 21, color: MUTED }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ textTransform: "uppercase", letterSpacing: 2, fontSize: 17 }}>Portföy</span>
              <span style={{ color: INK }}>{tickers.length ? tickers.join(" · ") : "nakit"}</span>
            </div>
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

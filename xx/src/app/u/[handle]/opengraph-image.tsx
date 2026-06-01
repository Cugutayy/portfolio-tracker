import { ImageResponse } from "next/og";
import { getPublicProfile } from "@/lib/portfolio";
import { OG, OG_SIZE, tryFmt, loadOgFonts } from "@/lib/og";

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
      <div style={{ display: "flex", justifyContent: "center", paddingBottom: 12 }}>
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
  const holdings = profile.holdings.slice(0, 6);
  const initials = profile.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr");
  const nameDiffers = profile.name.toLowerCase() !== profile.handle.toLowerCase();

  return new ImageResponse(
    (
      <div style={outer}>
        <div style={page}>
          {nameplate(`Sıra #${profile.rank}`, display)}

          {/* two-column trader report */}
          <div style={{ display: "flex", flex: 1, paddingTop: 18 }}>
            {/* left — identity + stats */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 30 }}>
              <div style={{ display: "flex", fontSize: 18, letterSpacing: 4, color: GREEN, textTransform: "uppercase", marginBottom: 14 }}>
                Portföy Raporu
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                {profile.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.image} width={80} height={80} alt="" style={{ borderRadius: 40, objectFit: "cover", border: `2px solid ${INK}` }} />
                ) : (
                  <div style={{ display: "flex", width: 80, height: 80, borderRadius: 40, background: GREEN, border: `2px solid ${INK}`, alignItems: "center", justifyContent: "center", color: PAPER, fontFamily: display, fontSize: 36 }}>
                    {initials}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontFamily: display, fontSize: 56, color: INK, lineHeight: 1 }}>
                    {`@${profile.handle}`}
                  </div>
                  <div style={{ display: "flex", fontSize: 18, color: MUTED, marginTop: 4 }}>
                    {nameDiffers ? `${profile.name} · ` : ""}sanal 1.000.000 ₺
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 44, borderTop: `1px solid ${RULE}`, paddingTop: 14 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 15, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>Getiri</div>
                  <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: up ? GREEN : RED, marginTop: 2 }}>
                    {`${up ? "+" : ""}${profile.returnPct.toFixed(1)}%`}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 15, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>Toplam değer</div>
                  <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: INK, marginTop: 2 }}>{tryFmt(profile.totalTry)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 44, marginTop: 12 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 15, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>İşlem</div>
                  <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: INK, marginTop: 2 }}>{String(profile.tradesCount)}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 15, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>Takipçi</div>
                  <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: INK, marginTop: 2 }}>{String(profile.followers)}</div>
                </div>
              </div>
            </div>

            {/* right — holdings table */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: 30, borderLeft: `1px solid ${RULE}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 8, marginBottom: 14, borderBottom: `2px solid ${INK}` }}>
                <span style={{ display: "flex", fontFamily: display, fontSize: 26, color: INK }}>Portföy</span>
                <span style={{ display: "flex", fontSize: 14, color: MUTED, letterSpacing: 1.5, textTransform: "uppercase" }}>Ağırlık · K/Z</span>
              </div>
              {holdings.length > 0 ? (
                holdings.map((h) => {
                  const hUp = h.pnlPct >= 0;
                  return (
                    <div key={h.ticker} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
                      <span style={{ display: "flex", width: 12, height: 12, borderRadius: 3, background: h.color }} />
                      <span style={{ display: "flex", flex: 1, fontSize: 22, fontWeight: 600, color: INK }}>{h.ticker}</span>
                      <span style={{ display: "flex", width: 64, fontSize: 18, color: MUTED, justifyContent: "flex-end" }}>{Math.round(h.weight * 100)}%</span>
                      <span style={{ display: "flex", width: 92, fontSize: 19, fontWeight: 700, color: hUp ? GREEN : RED, justifyContent: "flex-end" }}>
                        {`${hUp ? "+" : ""}${h.pnlPct.toFixed(1)}%`}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ display: "flex", fontSize: 20, color: MUTED }}>Henüz pozisyon yok, nakitte bekliyor.</div>
              )}
            </div>
          </div>

          {/* footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${INK}`, paddingTop: 14, fontSize: 19, color: MUTED }}>
            <span style={{ display: "flex", textTransform: "uppercase", letterSpacing: 2, fontSize: 16 }}>
              XX Arena · sanal trader turnuvası
            </span>
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

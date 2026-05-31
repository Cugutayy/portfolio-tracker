import { ImageResponse } from "next/og";
import { getPublicProfile } from "@/lib/portfolio";

export const runtime = "nodejs";
export const alt = "XX — Sanal Trader Arenası";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Paper-theme palette (mirrors globals.css)
const BG = "#f1ede3";
const PAPER = "#faf8f1";
const INK = "#1a1813";
const MUTED = "#74705f";
const GREEN = "#1a7a4a";
const RED = "#c23b2b";
const RULE = "rgba(26,24,19,0.16)";

// Horizontal green leaf mark, inline so the card is self-contained.
const LEAF = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(90 50 50)"><path d="M46 82 C 44 88, 40 92, 33 95" fill="none" stroke="${GREEN}" stroke-width="3.6" stroke-linecap="round"/><path d="M46 82 C 27 60, 30 30, 59 11 C 73 31, 65 63, 46 82 Z" fill="${GREEN}"/><g fill="none" stroke="${BG}" stroke-width="2.2" stroke-linecap="round" opacity="0.92"><path d="M46 82 C 49 58, 53 32, 58 14"/><path d="M48 66 Q 42 62, 36 56"/><path d="M48 66 Q 55 64, 60 57"/><path d="M51 50 Q 46 47, 41 41"/><path d="M51 50 Q 57 49, 62 43"/><path d="M54 35 Q 51 32, 47 27"/><path d="M54 35 Q 59 33, 62 29"/></g></g></svg>`,
)}`;

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n) + " ₺";

async function loadFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`,
      {
        headers: {
          // old UA → Google serves TTF, which Satori can parse (it can't do woff2)
          "User-Agent":
            "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/13.0.782.220",
        },
      },
    ).then((r) => r.text());
    const url =
      css.match(/src:\s*url\((https:[^)]+)\)\s*format\('truetype'\)/)?.[1] ??
      css.match(/url\((https:[^)]+)\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle, null).catch(() => null);

  const [serif, sans, sansBold] = await Promise.all([
    loadFont("Instrument Serif", 400),
    loadFont("Inter", 500),
    loadFont("Inter", 700),
  ]);
  const fonts = [
    serif && { name: "Serif", data: serif, weight: 400 as const, style: "normal" as const },
    sans && { name: "Sans", data: sans, weight: 500 as const, style: "normal" as const },
    sansBold && { name: "Sans", data: sansBold, weight: 700 as const, style: "normal" as const },
  ].filter(Boolean) as {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 500 | 700;
    style: "normal";
  }[];

  const display = serif ? "Serif" : "Sans";

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

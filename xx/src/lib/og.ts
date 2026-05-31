// ─────────────────────────────────────────────────────────────
// Shared helpers for dynamic OpenGraph cards (next/og ImageResponse).
// Paper-theme palette, the leaf mark as a data URI, and a runtime
// Google-font loader that returns TTFs Satori can parse.
// ─────────────────────────────────────────────────────────────

export const OG_SIZE = { width: 1200, height: 630 };

// Paper-theme palette (mirrors globals.css)
export const OG = {
  BG: "#f1ede3",
  PAPER: "#faf8f1",
  INK: "#1a1813",
  MUTED: "#74705f",
  GREEN: "#1a7a4a",
  RED: "#c23b2b",
  RULE: "rgba(26,24,19,0.16)",
} as const;

// Horizontal green leaf mark (tip left), self-contained for the card.
export const OG_LEAF = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="translate(0 100) scale(1 -1) rotate(-90 50 50)"><path d="M46 82 C 44 88, 40 92, 33 95" fill="none" stroke="${OG.GREEN}" stroke-width="3.6" stroke-linecap="round"/><path d="M46 82 C 27 60, 30 30, 59 11 C 73 31, 65 63, 46 82 Z" fill="${OG.GREEN}"/><g fill="none" stroke="${OG.BG}" stroke-width="2.2" stroke-linecap="round" opacity="0.92"><path d="M46 82 C 49 58, 53 32, 58 14"/><path d="M48 66 Q 42 62, 36 56"/><path d="M48 66 Q 55 64, 60 57"/><path d="M51 50 Q 46 47, 41 41"/><path d="M51 50 Q 57 49, 62 43"/><path d="M54 35 Q 51 32, 47 27"/><path d="M54 35 Q 59 33, 62 29"/></g></g></svg>`,
)}`;

export const tryFmt = (n: number) =>
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

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 700;
  style: "normal";
};

/** Load the card fonts once; returns the font list + the display family name. */
export async function loadOgFonts(): Promise<{ fonts: OgFont[]; display: string }> {
  const [serif, sans, sansBold] = await Promise.all([
    loadFont("Instrument Serif", 400),
    loadFont("Inter", 500),
    loadFont("Inter", 700),
  ]);
  const fonts = [
    serif && { name: "Serif", data: serif, weight: 400 as const, style: "normal" as const },
    sans && { name: "Sans", data: sans, weight: 500 as const, style: "normal" as const },
    sansBold && { name: "Sans", data: sansBold, weight: 700 as const, style: "normal" as const },
  ].filter(Boolean) as OgFont[];
  return { fonts, display: serif ? "Serif" : "Sans" };
}

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
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(-8 50 52)"><path d="M50 90 C 50 94, 49 97, 47 99" fill="none" stroke="${OG.GREEN}" stroke-width="3.4" stroke-linecap="round"/><path d="M50 6 C 33 28, 30 60, 50 92 C 70 60, 67 28, 50 6 Z" fill="${OG.GREEN}"/><g fill="none" stroke="${OG.BG}" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"><path d="M50 90 C 51 62, 51 34, 50 12" stroke-width="2.4"/><path d="M50 74 Q 40 72, 33 63" stroke-width="2"/><path d="M50 74 Q 60 72, 67 63" stroke-width="2"/><path d="M50 56 Q 40 54, 33 45" stroke-width="2"/><path d="M50 56 Q 60 54, 67 45" stroke-width="2"/><path d="M50 40 Q 42 38, 36 30" stroke-width="2"/><path d="M50 40 Q 58 38, 64 30" stroke-width="2"/></g></g></svg>`,
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

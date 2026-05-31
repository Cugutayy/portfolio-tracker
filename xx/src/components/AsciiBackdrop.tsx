// Faint ASCII texture for the hero — evokes the "elite terminal" aesthetic
// (classical ruins under a data overlay) without fighting the paper theme.
// Fully deterministic (no randomness) so server and client render identically.

const CHARS = " ··:+xX0S8@#";

function buildAscii(cols: number, rows: number): string {
  let out = "";
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      // layered sines give an organic density field…
      const wave =
        (Math.sin(c * 0.16) * Math.cos(r * 0.42) + Math.sin((c + r) * 0.07)) *
          0.5 +
        0.5; // 0..1
      // …with faint vertical "columns" for a ruined-architecture rhythm
      const colBand = c % 8 < 2 ? 0.28 : 0;
      const d = Math.min(0.99, Math.max(0, wave * 0.82 + colBand));
      line += CHARS[Math.floor(d * (CHARS.length - 1))];
    }
    out += line + "\n";
  }
  return out;
}

export function AsciiBackdrop() {
  const art = buildAscii(160, 26);
  return (
    <pre
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        margin: 0,
        zIndex: 0,
        pointerEvents: "none",
        userSelect: "none",
        overflow: "hidden",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        lineHeight: 1.05,
        letterSpacing: "0.04em",
        color: "var(--ink)",
        opacity: 0.07,
        whiteSpace: "pre",
        // fade toward the centre so the headline stays clean
        WebkitMaskImage:
          "radial-gradient(120% 90% at 50% 45%, transparent 28%, black 92%)",
        maskImage:
          "radial-gradient(120% 90% at 50% 45%, transparent 28%, black 92%)",
      }}
    >
      {art}
    </pre>
  );
}

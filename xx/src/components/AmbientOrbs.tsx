/** Broadsheet backdrop — faint vertical column rules + edge vignette.
 *  Pure CSS, GPU-friendly, fixed behind content. Paper-editorial feel. */
export function AmbientOrbs() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* hairline newspaper columns */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0, transparent calc(12.5% - 1px), rgba(26,24,19,0.045) calc(12.5% - 1px), rgba(26,24,19,0.045) 12.5%)",
          maskImage:
            "linear-gradient(180deg, transparent 0, #000 12%, #000 88%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0, #000 12%, #000 88%, transparent 100%)",
        }}
      />
      {/* soft warm vignette to seat the paper */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 80% at 50% 0%, transparent 55%, rgba(26,24,19,0.04) 100%)",
        }}
      />
    </div>
  );
}

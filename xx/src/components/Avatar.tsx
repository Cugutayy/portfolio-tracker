interface Props {
  initials: string;
  gradient: string;
  image?: string | null;
  size?: number;
  ring?: boolean;
}

/** Center portrait — initials on a gradient, or a real photo when available. */
export function Avatar({ initials, gradient, image, size = 80, ring = true }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: ring ? "2px solid rgba(255,255,255,0.55)" : "none",
        boxShadow: ring ? "0 8px 30px rgba(26,24,19,0.18)" : "none",
        flexShrink: 0,
      }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span
          className="display"
          style={{
            fontSize: size * 0.38,
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1,
            letterSpacing: ".02em",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

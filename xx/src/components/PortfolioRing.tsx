"use client";

import { motion } from "framer-motion";

export interface RingSlice {
  label: string;
  weight: number; // 0..1
  color: string;
}

interface Props {
  slices: RingSlice[];
  image?: string | null;
  size?: number;
  strokeWidth?: number;
  /** Center label under/over the photo, optional */
  centerTop?: string;
  centerBottom?: string;
}

/**
 * Signature visual: a circular avatar ringed by a donut of portfolio weights.
 * Slices animate in on mount.
 */
export function PortfolioRing({
  slices,
  image,
  size = 220,
  strokeWidth = 16,
  centerTop,
  centerBottom,
}: Props) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;

  let acc = 0;
  const arcs = slices.map((s) => {
    const dash = Math.max(0, s.weight) * C;
    const offset = -acc * C;
    acc += s.weight;
    return { ...s, dash, offset };
  });

  const photoR = r - strokeWidth / 2 - 6;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        {/* track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(26,24,19,0.10)"
          strokeWidth={strokeWidth}
        />
        {arcs.map((a, i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={`${a.dash} ${C}`}
            strokeDashoffset={a.offset}
            initial={{ opacity: 0, strokeDasharray: `0 ${C}` }}
            animate={{ opacity: 1, strokeDasharray: `${a.dash} ${C}` }}
            transition={{
              duration: 0.9,
              delay: 0.1 + i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        ))}
      </svg>

      {/* center avatar */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <div
          style={{
            width: photoR * 2,
            height: photoR * 2,
            borderRadius: "50%",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.55)",
            boxShadow: "0 6px 24px rgba(26,24,19,0.18)",
            background:
              "radial-gradient(circle at 30% 25%, #2a2e38, #11131a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
              style={{ fontSize: photoR * 0.7, color: "var(--muted)" }}
            >
              ◴
            </span>
          )}
        </div>
        {(centerTop || centerBottom) && (
          <div style={{ textAlign: "center", marginTop: 6 }}>
            {centerTop && (
              <div
                className="mono"
                style={{ fontSize: ".58rem", color: "var(--muted)" }}
              >
                {centerTop}
              </div>
            )}
            {centerBottom && (
              <div
                className="mono"
                style={{ fontSize: ".8rem", fontWeight: 500 }}
              >
                {centerBottom}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

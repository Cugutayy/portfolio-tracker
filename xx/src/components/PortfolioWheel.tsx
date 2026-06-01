"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "./Avatar";
import { fmtTry, type DemoSlice } from "@/lib/demo";

interface Props {
  slices: DemoSlice[];
  initials: string;
  gradient: string;
  image?: string | null;
  centerLabel?: string;
  centerValue?: string;
  centerPositive?: boolean;
  /** container px (the ring); labels overflow outside, parent must give room. */
  size?: number;
  /** money formatter (defaults to ₺); pass a currency-aware one to show $. */
  format?: (n: number) => string;
}

// polar point on a unit-100 viewBox, angle measured from top, clockwise
function pt(cx: number, cy: number, r: number, frac: number) {
  const a = frac * 2 * Math.PI;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

export function PortfolioWheel({
  slices,
  initials,
  gradient,
  image,
  centerLabel = "GETİRİ",
  centerValue,
  centerPositive = true,
  size = 300,
  format = fmtTry,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const cx = 50;
  const cy = 50;
  const ringR = 33; // centerline radius (viewBox units)
  const sw = 11; // stroke width
  const C = 2 * Math.PI * ringR;

  let acc = 0;
  const arcs = slices.map((s) => {
    const start = acc;
    const dash = s.weight * C;
    const offset = -start * C;
    const midFrac = start + s.weight / 2;
    acc += s.weight;
    return { ...s, dash, offset, midFrac, start };
  });

  const avatarPx = size * 0.42;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        style={{ width: "100%", height: "100%", overflow: "visible", display: "block" }}
      >
        {/* leader lines */}
        {arcs.map((a, i) => {
          const outer = pt(cx, cy, ringR + sw / 2, a.midFrac);
          const elbow = pt(cx, cy, ringR + sw / 2 + 5, a.midFrac);
          const right = elbow.x >= cx;
          const tick = { x: elbow.x + (right ? 4 : -4), y: elbow.y };
          return (
            <motion.polyline
              key={`l${i}`}
              points={`${outer.x},${outer.y} ${elbow.x},${elbow.y} ${tick.x},${tick.y}`}
              fill="none"
              stroke={a.color}
              strokeWidth={0.5}
              strokeOpacity={0.55}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
            />
          );
        })}

        {/* ring */}
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle
            cx={cx}
            cy={cy}
            r={ringR}
            fill="none"
            stroke="rgba(26,24,19,0.08)"
            strokeWidth={sw}
          />
          {arcs.map((a, i) => (
            <motion.circle
              key={`a${i}`}
              cx={cx}
              cy={cy}
              r={ringR}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === i ? sw + 3 : sw}
              strokeLinecap="butt"
              strokeDashoffset={a.offset}
              initial={{ strokeDasharray: `0 ${C}` }}
              animate={{
                strokeDasharray: `${a.dash} ${C - a.dash}`,
                strokeOpacity: hover == null || hover === i ? 1 : 0.28,
              }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{ pointerEvents: "visibleStroke", cursor: "pointer" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </g>
      </svg>

      {/* center avatar + value */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          pointerEvents: "none",
        }}
      >
        {hover != null ? (
          <motion.div
            key={`c${hover}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            style={{ textAlign: "center" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginBottom: 2,
              }}
            >
              <Dot color={arcs[hover].color} />
              <span style={{ fontWeight: 600, fontSize: size * 0.066 }}>
                {arcs[hover].ticker}
              </span>
            </div>
            <div
              className="mono"
              style={{ fontSize: size * 0.072, fontWeight: 600, color: "var(--accent)" }}
            >
              {Math.round(arcs[hover].weight * 100)}%
            </div>
            <div
              className="mono"
              style={{ fontSize: size * 0.044, color: "var(--muted)", marginTop: 2 }}
            >
              {format(arcs[hover].valueTry)}
            </div>
          </motion.div>
        ) : (
          <>
            <Avatar initials={initials} gradient={gradient} image={image} size={avatarPx} />
            {centerValue && (
              <div style={{ textAlign: "center" }}>
                <div className="eyebrow" style={{ fontSize: ".48rem" }}>{centerLabel}</div>
                <div
                  className="mono"
                  style={{
                    fontSize: size * 0.052,
                    fontWeight: 600,
                    color: centerPositive ? "var(--green-t)" : "var(--red-t)",
                  }}
                >
                  {centerValue}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* radial labels (HTML overlay) */}
      {arcs.map((a, i) => {
        const p = pt(cx, cy, ringR + sw / 2 + 9, a.midFrac);
        const right = p.x >= cx;
        return (
          <motion.div
            key={`t${i}`}
            className="pw-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: hover == null || hover === i ? 1 : 0.3 }}
            transition={{ delay: hover == null ? 0.55 + i * 0.08 : 0, duration: hover == null ? 0.4 : 0.18 }}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `translate(${right ? "0" : "-100%"}, -50%)`,
              textAlign: right ? "left" : "right",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                justifyContent: right ? "flex-start" : "flex-end",
              }}
            >
              {right && <Dot color={a.color} />}
              <span style={{ fontWeight: 600, fontSize: ".82rem" }}>{a.ticker}</span>
              <span className="mono" style={{ fontSize: ".7rem", color: "var(--accent)" }}>
                {Math.round(a.weight * 100)}%
              </span>
              {!right && <Dot color={a.color} />}
            </div>
            <div className="mono" style={{ fontSize: ".58rem", color: "var(--muted)", marginTop: 1 }}>
              {format(a.valueTry)}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 9,
        height: 9,
        borderRadius: 2,
        background: color,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

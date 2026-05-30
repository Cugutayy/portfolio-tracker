import { Avatar } from "./Avatar";
import type { DemoSlice } from "@/lib/demo";

interface Props {
  slices: DemoSlice[];
  initials: string;
  gradient: string;
  image?: string | null;
  size?: number;
}

/** Lightweight static allocation ring + center avatar. No animation — safe at scale (100+). */
export function MiniWheel({ slices, initials, gradient, image, size = 64 }: Props) {
  const r = 16;
  const sw = 5;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const avatarPx = size * 0.56;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(26,24,19,0.10)" strokeWidth={sw} />
        {slices.map((s, i) => {
          const dash = s.weight * C;
          const offset = -acc * C;
          acc += s.weight;
          return (
            <circle
              key={i}
              cx={20}
              cy={20}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={sw}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Avatar initials={initials} gradient={gradient} image={image} size={avatarPx} ring={false} />
      </div>
    </div>
  );
}

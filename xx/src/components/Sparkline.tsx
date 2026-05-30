interface Props {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
  fill?: boolean;
  strokeWidth?: number;
}

/** Compact equity-curve sparkline / area chart. Pure SVG. */
export function Sparkline({
  data,
  positive = true,
  width = 120,
  height = 36,
  fill = true,
  strokeWidth = 1.5,
}: Props) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const pad = strokeWidth;
  const y = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / span);
  const pts = data.map((v, i) => `${(i * stepX).toFixed(2)},${y(v).toFixed(2)}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;
  const color = positive ? "var(--green-t, #4ade80)" : "var(--red-t, #f87171)";
  const id = `sg-${positive ? "p" : "n"}-${width}-${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

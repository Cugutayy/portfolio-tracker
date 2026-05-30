/**
 * XX leaf mark — a single editorial green leaf with a cream midrib, tuned to
 * the paper theme. Pairs with the serif "XX" wordmark in headers.
 */
export function Logo({
  size = 40,
  title = "XX",
}: {
  size?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      style={{ display: "block" }}
    >
      {/* stem */}
      <path
        d="M50 84 C 50 90, 49 94, 45 98"
        fill="none"
        stroke="var(--green-t)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* leaf body */}
      <path
        d="M50 10 C 26 30, 22 60, 50 88 C 78 60, 74 30, 50 10 Z"
        fill="var(--green-t)"
      />
      {/* midrib + side veins */}
      <g
        fill="none"
        stroke="var(--bg)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.92"
      >
        <path d="M50 20 L50 84" />
        <path d="M50 38 L36 31" />
        <path d="M50 38 L64 31" />
        <path d="M50 54 L34 47" />
        <path d="M50 54 L66 47" />
        <path d="M50 69 L39 64" />
        <path d="M50 69 L61 64" />
      </g>
    </svg>
  );
}

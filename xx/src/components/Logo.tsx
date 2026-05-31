/**
 * XX leaf mark — a single editorial leaf caught in a light breeze: an
 * asymmetric blade with a curved spine that leans and tapers to a fine tip,
 * cream midrib + side veins. Tuned to the warm paper theme. Pairs with the
 * serif "XX" wordmark in headers.
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
      {/* horizontal, tip left; vertical mirror lifts the stem to the top */}
      <g transform="translate(0 100) scale(1 -1) rotate(-90 50 50)">
        {/* stem */}
        <path
          d="M50 90 C 50 94, 49 97, 47 99"
          fill="none"
          stroke="var(--green-t)"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        {/* leaf blade — lanceolate, fine drip tip, soft shoulders */}
        <path
          d="M50 6 C 33 28, 30 60, 50 92 C 70 60, 67 28, 50 6 Z"
          fill="var(--green-t)"
        />
        {/* midrib + arcing side veins (curve up toward the tip) */}
        <g
          fill="none"
          stroke="var(--bg)"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        >
          <path d="M50 90 C 51 62, 51 34, 50 12" strokeWidth="2.4" />
          <g strokeWidth="2">
            <path d="M50 74 Q 40 72, 33 63" />
            <path d="M50 74 Q 60 72, 67 63" />
            <path d="M50 56 Q 40 54, 33 45" />
            <path d="M50 56 Q 60 54, 67 45" />
            <path d="M50 40 Q 42 38, 36 30" />
            <path d="M50 40 Q 58 38, 64 30" />
          </g>
        </g>
      </g>
    </svg>
  );
}

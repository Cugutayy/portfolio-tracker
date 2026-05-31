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
      {/* rotated -90° so the leaf lies horizontally — tip left, stem right */}
      <g transform="rotate(-90 50 50)">
        {/* stem — flows off the leaf base with a gentle sway */}
        <path
          d="M46 82 C 44 88, 40 92, 33 95"
          fill="none"
          stroke="var(--green-t)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        {/* leaf blade — bends to one side, tapering to a fine tip (wind) */}
        <path
          d="M46 82 C 27 60, 30 30, 59 11 C 73 31, 65 63, 46 82 Z"
          fill="var(--green-t)"
        />
        {/* midrib + side veins, following the curve of the blade */}
        <g
          fill="none"
          stroke="var(--bg)"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.92"
        >
          <path d="M46 82 C 49 58, 53 32, 58 14" />
          <path d="M48 66 Q 42 62, 36 56" />
          <path d="M48 66 Q 55 64, 60 57" />
          <path d="M51 50 Q 46 47, 41 41" />
          <path d="M51 50 Q 57 49, 62 43" />
          <path d="M54 35 Q 51 32, 47 27" />
          <path d="M54 35 Q 59 33, 62 29" />
        </g>
      </g>
    </svg>
  );
}

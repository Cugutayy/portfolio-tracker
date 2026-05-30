/**
 * XX seal monogram — a serif "XX" set inside an engraved circular stamp with
 * a small rising-chart motif. Uses currentColor so it inherits ink/paper.
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
      style={{ display: "block", color: "var(--ink)" }}
    >
      {/* outer engraved ring */}
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* fine dotted inner ring — stamp/seal feel */}
      <circle
        cx="50"
        cy="50"
        r="41.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="0.5 3.2"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* serif monogram */}
      <text
        x="50"
        y="47"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="400"
        fontSize="40"
        fill="currentColor"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing="-3"
      >
        XX
      </text>
      {/* rising-chart accent under the monogram */}
      <polyline
        points="33,66 42,61 51,64 60,55 67,58"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {/* arrow tip */}
      <path
        d="M67 58 l1.5 -5 M67 58 l-5 -1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}

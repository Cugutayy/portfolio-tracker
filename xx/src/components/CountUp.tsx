"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up from 0 to `value` with an ease-out curve the first time
 * it scrolls into view. Editorial-friendly: no bounce, just a confident climb.
 */
export function CountUp({
  value,
  duration = 1400,
  suffix = "",
  prefix = "",
  locale = "tr-TR",
}: {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  locale?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion: jump straight to the final value.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || started.current) continue;
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // easeOutExpo
            setDisplay(value * eased);
            if (t < 1) requestAnimationFrame(tick);
            else setDisplay(value);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {Math.round(display).toLocaleString(locale)}
      {suffix}
    </span>
  );
}

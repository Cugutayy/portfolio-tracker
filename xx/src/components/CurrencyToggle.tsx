"use client";

import { useCurrency } from "./Providers";
import type { Currency } from "@/lib/currency";

const OPTS: { c: Currency; label: string }[] = [
  { c: "try", label: "₺ TRY" },
  { c: "usd", label: "$ USD" },
];

/** Switches the display currency (₺ / $). Persists in a cookie and reloads so
 *  server-rendered values re-render in the chosen currency. */
export function CurrencyToggle() {
  const current = useCurrency();

  function set(c: Currency) {
    if (c === current) return;
    document.cookie = `xx-cur=${c};path=/;max-age=31536000;samesite=lax`;
    location.reload();
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 2,
        border: "1px solid var(--card-border)",
        borderRadius: 8,
        background: "var(--paper)",
      }}
    >
      {OPTS.map((o) => {
        const active = o.c === current;
        return (
          <button
            key={o.c}
            type="button"
            onClick={() => set(o.c)}
            aria-pressed={active}
            className="mono"
            style={{
              padding: "4px 9px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: ".66rem",
              letterSpacing: ".04em",
              fontWeight: active ? 600 : 400,
              background: active ? "var(--fill-2)" : "transparent",
              color: active ? "var(--ink)" : "var(--muted)",
              opacity: active ? 1 : 0.7,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

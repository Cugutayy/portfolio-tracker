"use client";

import type { Locale } from "@/lib/i18n";

const OPTS: { l: Locale; flag: string; label: string }[] = [
  { l: "tr", flag: "🇹🇷", label: "TR" },
  { l: "en", flag: "🇬🇧", label: "EN" },
];

/** Flag language switcher. Persists the choice in a cookie and reloads so
 *  server-rendered pages re-render in the new locale. */
export function LanguageToggle({ locale }: { locale: Locale }) {
  function set(l: Locale) {
    if (l === locale) return;
    document.cookie = `xx-lang=${l};path=/;max-age=31536000;samesite=lax`;
    try {
      localStorage.setItem("xx-lang", l);
    } catch {
      /* storage unavailable — cookie still drives the locale */
    }
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
        const active = o.l === locale;
        return (
          <button
            key={o.l}
            type="button"
            onClick={() => set(o.l)}
            aria-label={o.label}
            aria-pressed={active}
            className="mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 7px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: ".62rem",
              letterSpacing: ".04em",
              background: active ? "var(--fill-2)" : "transparent",
              color: active ? "var(--ink)" : "var(--muted)",
              opacity: active ? 1 : 0.7,
            }}
          >
            <span style={{ fontSize: ".95rem", lineHeight: 1 }}>{o.flag}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

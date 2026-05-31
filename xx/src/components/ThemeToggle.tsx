"use client";

import { useEffect, useState } from "react";

/** Toggles the warm dark theme and remembers the choice in localStorage. */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "";
    try {
      localStorage.setItem("xx-theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }

  return (
    <button type="button" className={className ?? "btn"} onClick={toggle}>
      {dark ? "☀ Aydınlığa geç" : "☾ Karanlığa geç"}
    </button>
  );
}

"use client";

import Link from "next/link";
import { getDict, type Locale } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { CurrencyToggle } from "./CurrencyToggle";

/** Shared inner-page header: consistent nav (Home · Arena · Portfolio ·
 *  Settings · Log out) + language toggle, so every page has the same links. */
export function AppHeader({
  loggedIn,
  locale,
  handle,
}: {
  loggedIn: boolean;
  locale: Locale;
  handle?: string | null;
}) {
  const t = getDict(locale);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 24,
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
        <span className="display" style={{ fontSize: "1.5rem" }}>XX</span>
        <span className="eyebrow" style={{ letterSpacing: ".28em" }}>Arena</span>
      </Link>

      <nav style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <LanguageToggle locale={locale} />
        <CurrencyToggle />
        <Link href="/" className="btn" style={{ textDecoration: "none" }}>{t.nav_home}</Link>
        <Link href="/arena" className="btn" style={{ textDecoration: "none" }}>{t.nav_arena}</Link>
        {loggedIn ? (
          <>
            <Link href="/portfolio" className="btn" style={{ textDecoration: "none" }}>{t.nav_portfolio}</Link>
            {handle && (
              <Link href={`/u/${handle}`} className="btn" style={{ textDecoration: "none" }}>{t.nav_profile}</Link>
            )}
            <Link href="/settings" className="btn" style={{ textDecoration: "none" }}>{t.nav_settings}</Link>
          </>
        ) : (
          <Link href="/join" className="btn btn-accent" style={{ textDecoration: "none" }}>{t.nav_login}</Link>
        )}
      </nav>
    </div>
  );
}

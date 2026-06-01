import { cookies } from "next/headers";
import type { Locale } from "./i18n";
import type { Currency } from "./currency";

/** Read the chosen locale from the `xx-lang` cookie (server-side). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("xx-lang")?.value === "en" ? "en" : "tr";
}

/** Read the chosen display currency from the `xx-cur` cookie (server-side). */
export async function getCurrency(): Promise<Currency> {
  const store = await cookies();
  return store.get("xx-cur")?.value === "usd" ? "usd" : "try";
}

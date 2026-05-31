import { cookies } from "next/headers";
import type { Locale } from "./i18n";

/** Read the chosen locale from the `xx-lang` cookie (server-side). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("xx-lang")?.value === "en" ? "en" : "tr";
}

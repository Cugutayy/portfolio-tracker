// Competition configuration.
// Start = first real participant joined (Europe/Istanbul). Period returns and
// the day counter are measured from here.
export const COMPETITION_START = new Date("2026-05-31T00:00:00+03:00");

/** 1-based day number of the competition (day 1 = start day). */
export function competitionDay(now: Date = new Date()): number {
  const ms = now.getTime() - COMPETITION_START.getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

/** Localized start date, e.g. "31 Mayıs 2026". */
export function competitionStartLabel(locale: "tr" | "en"): string {
  return COMPETITION_START.toLocaleDateString(locale === "en" ? "en-US" : "tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

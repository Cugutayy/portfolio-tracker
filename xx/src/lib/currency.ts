import { fmtTry } from "./demo";

export type Currency = "try" | "usd";

/** Format a TRY-denominated amount in the user's chosen display currency.
 *  Values are stored in ₺; USD is derived live via the current USD/TRY rate. */
export function fmtMoney(amountTry: number, currency: Currency, usdTry: number): string {
  if (currency === "usd" && usdTry > 0) {
    const n = amountTry / usdTry;
    if (Math.abs(n) >= 1_000_000)
      return "$" + (n / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + "M";
    if (Math.abs(n) >= 1_000)
      return "$" + Math.round(n / 1_000).toLocaleString("tr-TR") + "K";
    return "$" + n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  }
  return fmtTry(amountTry);
}

/** Full amount with thousands separators + 2 decimals (no K/M abbreviation),
 *  so exact totals/profit are visible — e.g. "1.008.267,42 ₺" / "$21.984,10". */
export function fmtMoneyFull(amountTry: number, currency: Currency, usdTry: number): string {
  const dec = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;
  if (currency === "usd" && usdTry > 0) {
    return "$" + (amountTry / usdTry).toLocaleString("tr-TR", dec);
  }
  return amountTry.toLocaleString("tr-TR", dec) + " ₺";
}

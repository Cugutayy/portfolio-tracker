// ─────────────────────────────────────────────────────────────
// Display formatting for live market prices.
// Portfolios are TL-denominated, but per-asset *market* prices are
// shown in their native currency so they read naturally:
//   crypto / US stocks / commodities → $
//   indices                          → plain points (no symbol)
//   BIST stocks                      → ₺
// ─────────────────────────────────────────────────────────────

import type { AssetType } from "@/lib/assets";

/** Smart decimal count: big numbers stay whole, sub-1 prices keep precision. */
function fmtNum(n: number): string {
  const a = Math.abs(n);
  if (a >= 1000) return n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  if (a >= 1) return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 4 });
}

/** Format a market price in its native currency for display. */
export function fmtAssetPrice(
  nativePrice: number | null | undefined,
  nativeCcy: string | null | undefined,
  type?: AssetType,
): string {
  if (nativePrice == null || !Number.isFinite(nativePrice)) return "—";
  if (type === "index") return fmtNum(nativePrice); // points, no symbol
  if (nativeCcy === "TRY") return "₺" + fmtNum(nativePrice);
  return "$" + fmtNum(nativePrice);
}

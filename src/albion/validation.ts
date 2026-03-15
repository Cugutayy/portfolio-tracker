/**
 * Albion Price Data Validation
 * ============================
 * Filters out invalid, stale, and suspicious price entries.
 */

import type { AlbionPriceEntry, ValidatedPrice, City, Freshness } from './types'
import { MAX_PRICE, MAX_SPREAD_RATIO, FRESH_MS, STALE_MS } from './constants'

const NULL_DATE = '0001-01-01'

function isValidDate(d: string): boolean {
  return !!d && !d.startsWith(NULL_DATE)
}

export function getFreshness(date: Date): Freshness {
  const age = Date.now() - date.getTime()
  if (age < FRESH_MS) return 'fresh'
  if (age < STALE_MS) return 'recent'
  return 'stale'
}

/** Validate raw API entries → clean ValidatedPrice array */
export function validatePrices(raw: AlbionPriceEntry[]): ValidatedPrice[] {
  const results: ValidatedPrice[] = []

  for (const entry of raw) {
    const hasSell = entry.sell_price_min > 0 && isValidDate(entry.sell_price_min_date)
    const hasBuy = entry.buy_price_max > 0 && isValidDate(entry.buy_price_max_date)

    // Need at least one valid side
    if (!hasSell && !hasBuy) continue

    // Price sanity
    if (hasSell && entry.sell_price_min > MAX_PRICE) continue
    if (hasBuy && entry.buy_price_max > MAX_PRICE) continue

    // Spread sanity: reject if buy >> sell (data corruption)
    if (hasSell && hasBuy && entry.buy_price_max > entry.sell_price_min * MAX_SPREAD_RATIO) continue

    const sellDate = hasSell ? new Date(entry.sell_price_min_date) : new Date(0)
    const buyDate = hasBuy ? new Date(entry.buy_price_max_date) : new Date(0)
    const bestDate = sellDate > buyDate ? sellDate : buyDate

    results.push({
      itemId: entry.item_id,
      city: entry.city as City,
      quality: entry.quality,
      sellMin: hasSell ? entry.sell_price_min : 0,
      sellMinDate: sellDate,
      buyMax: hasBuy ? entry.buy_price_max : 0,
      buyMaxDate: buyDate,
      freshness: getFreshness(bestDate),
    })
  }

  return results
}

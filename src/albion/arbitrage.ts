/**
 * Albion Arbitrage Engine
 * =======================
 * Finds profitable buy→transport→sell opportunities.
 *
 * Strategy 1 — Instant Sell (to buy orders):
 *   Buy at sell_price_min in source, instant-sell to buy_price_max in dest.
 *   No tax on instant sell. Guaranteed immediate profit.
 *
 * Strategy 2 — Sell Order (list in dest market):
 *   Buy at sell_price_min in source, list sell order at dest sell_price_min.
 *   Tax applies (4% premium, 6.5% normal). Must wait for buyer.
 *   More opportunities since it doesn't require active buy orders.
 *
 * Opportunity Cost Model:
 *   - deathRisk: probability of dying and losing items during transport
 *   - expectedValue: netProfit × (1 - risk) - sourcePrice × risk
 *   - profitPerHour: expectedValue / transportMinutes × 60
 */

import type { ValidatedPrice, AlbionItem, ArbitrageOpportunity, TaxMode, City, Freshness, TradeStrategy } from './types'
import { CITIES, TAX_NORMAL, TAX_PREMIUM, MAX_SPREAD_RATIO } from './constants'
import { getRouteInfo } from './constants'
import { displayName } from './items'

function calcOpportunityCost(
  sourceCity: string,
  destCity: string,
  sourcePrice: number,
  netProfit: number,
): { deathRisk: number; riskLevel: 'safe' | 'medium' | 'dangerous'; transportMinutes: number; expectedValue: number; profitPerHour: number } {
  const route = getRouteInfo(sourceCity, destCity)
  // Expected value = profit if survive - loss if die
  const expectedValue = Math.round(netProfit * (1 - route.deathRisk) - sourcePrice * route.deathRisk)
  const profitPerHour = route.transportMinutes > 0
    ? Math.round((expectedValue / route.transportMinutes) * 60)
    : expectedValue * 60
  return {
    deathRisk: route.deathRisk,
    riskLevel: route.riskLevel,
    transportMinutes: route.transportMinutes,
    expectedValue,
    profitPerHour,
  }
}

function makeFreshness(a: Freshness, b: Freshness): Freshness {
  if (a === 'stale' || b === 'stale') return 'stale'
  if (a === 'recent' || b === 'recent') return 'recent'
  return 'fresh'
}

export function findOpportunities(
  prices: ValidatedPrice[],
  items: AlbionItem[],
  taxMode: TaxMode,
): ArbitrageOpportunity[] {
  const itemMap = new Map<string, AlbionItem>()
  for (const it of items) itemMap.set(it.uniqueName, it)

  const taxRate = taxMode === 'premium' ? TAX_PREMIUM : TAX_NORMAL

  // Group prices by itemId+quality
  const groups = new Map<string, ValidatedPrice[]>()
  for (const p of prices) {
    const key = `${p.itemId}|${p.quality}`
    const list = groups.get(key)
    if (list) list.push(p)
    else groups.set(key, [p])
  }

  const opportunities: ArbitrageOpportunity[] = []

  for (const [, group] of groups) {
    const byCity = new Map<string, ValidatedPrice>()
    for (const p of group) {
      const existing = byCity.get(p.city)
      if (!existing || p.sellMin > 0 && (!existing.sellMin || p.sellMinDate > existing.sellMinDate)) {
        byCity.set(p.city, p)
      }
    }

    const itemId = group[0].itemId
    const quality = group[0].quality
    const item = itemMap.get(itemId) || itemMap.get(itemId.replace(/@\d+$/, ''))

    // Collect cities with valid sell orders (source: buy from cheapest ask)
    const sources: { city: City; price: ValidatedPrice }[] = []
    // Collect cities with valid buy orders (dest for instant-sell)
    const destsInstant: { city: City; price: ValidatedPrice }[] = []
    // Collect cities with valid sell orders (dest for sell-order strategy — price reference)
    const destsSellOrder: { city: City; price: ValidatedPrice }[] = []

    for (const city of CITIES) {
      const p = byCity.get(city)
      if (!p) continue
      if (p.sellMin > 0) {
        sources.push({ city, price: p })
        destsSellOrder.push({ city, price: p })
      }
      if (p.buyMax > 0) destsInstant.push({ city, price: p })
    }

    const tier = item?.tier || parseInt(itemId.match(/^T(\d)/)?.[1] || '0', 10)
    const enchantment = item?.enchantment || parseInt(itemId.match(/@(\d)$/)?.[1] || '0', 10)
    const category = item?.category || ''
    const dName = displayName(itemId)

    // ── Strategy 1: Instant Sell (City → City) ──
    // Buy at sell_price_min (cheapest ask) in source
    // Instant-sell to buy_price_max (highest bid) in dest — NO tax
    for (const src of sources) {
      for (const dst of destsInstant) {
        if (src.city === dst.city) continue

        const buyPrice = src.price.sellMin
        const sellPrice = dst.price.buyMax
        if (sellPrice <= buyPrice) continue
        // Reject unrealistic cross-city spreads
        if (sellPrice > buyPrice * MAX_SPREAD_RATIO) continue

        const netProfit = sellPrice - buyPrice
        if (netProfit <= 0) continue
        const profitPct = (netProfit / buyPrice) * 100

        const freshness = makeFreshness(src.price.freshness, dst.price.freshness)
        const opp = calcOpportunityCost(src.city, dst.city, buyPrice, netProfit)

        opportunities.push({
          itemId, displayName: dName, tier, enchantment, category,
          sourceCity: src.city, sourcePrice: buyPrice, sourceDate: src.price.sellMinDate,
          destCity: dst.city, destPrice: sellPrice, destDate: dst.price.buyMaxDate,
          netProfit: Math.round(netProfit),
          profitPercent: Math.round(profitPct * 10) / 10,
          isBlackMarket: false, freshness, quality,
          strategy: 'instant-sell',
          taxPaid: 0,
          ...opp,
        })
      }
    }

    // ── Strategy 2: Sell Order (City → City) ──
    // Buy at sell_price_min in source, list at dest sell_price_min
    // Tax applies on the sell order listing
    // Extra validation: reject if cross-city price ratio is too extreme (stale/manipulated data)
    for (const src of sources) {
      for (const dst of destsSellOrder) {
        if (src.city === dst.city) continue

        const buyPrice = src.price.sellMin
        const listPrice = dst.price.sellMin
        if (listPrice <= buyPrice) continue

        // Reject unrealistic cross-city spreads (e.g. 230K vs 100M = data issue)
        if (listPrice > buyPrice * MAX_SPREAD_RATIO) continue

        const tax = Math.round(listPrice * taxRate)
        const netProfit = listPrice - buyPrice - tax
        if (netProfit <= 0) continue
        const profitPct = (netProfit / buyPrice) * 100

        const freshness = makeFreshness(src.price.freshness, dst.price.freshness)
        const opp = calcOpportunityCost(src.city, dst.city, buyPrice, netProfit)

        opportunities.push({
          itemId, displayName: dName, tier, enchantment, category,
          sourceCity: src.city, sourcePrice: buyPrice, sourceDate: src.price.sellMinDate,
          destCity: dst.city, destPrice: listPrice, destDate: dst.price.sellMinDate,
          netProfit: Math.round(netProfit),
          profitPercent: Math.round(profitPct * 10) / 10,
          isBlackMarket: false, freshness, quality,
          strategy: 'sell-order',
          taxPaid: tax,
          ...opp,
        })
      }
    }

    // ── Strategy 1: Instant Sell (City → Black Market) ──
    const bm = byCity.get('Black Market')
    if (bm && bm.buyMax > 0) {
      for (const src of sources) {
        const buyPrice = src.price.sellMin
        if (bm.buyMax > buyPrice * MAX_SPREAD_RATIO) continue
        const netProfit = bm.buyMax - buyPrice
        if (netProfit <= 0) continue
        const profitPct = (netProfit / buyPrice) * 100

        const freshness = makeFreshness(src.price.freshness, bm.freshness)
        const opp = calcOpportunityCost(src.city, 'Black Market', buyPrice, netProfit)

        opportunities.push({
          itemId, displayName: dName, tier, enchantment, category,
          sourceCity: src.city, sourcePrice: buyPrice, sourceDate: src.price.sellMinDate,
          destCity: 'Black Market', destPrice: bm.buyMax, destDate: bm.buyMaxDate,
          netProfit: Math.round(netProfit),
          profitPercent: Math.round(profitPct * 10) / 10,
          isBlackMarket: true, freshness, quality,
          strategy: 'instant-sell',
          taxPaid: 0,
          ...opp,
        })
      }
    }
  }

  return opportunities
}

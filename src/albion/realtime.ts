/**
 * Albion Real-Time Client
 * =======================
 * WebSocket client that connects to the local NATS relay (tools/albion-relay)
 * and provides real-time market data to the React app.
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Snapshot + delta price store
 * - Merge real-time data with REST API data
 * - Event-based listeners for React integration
 */

import type { ValidatedPrice, City, Freshness } from './types'
import { RELAY_WS_URL } from './constants'
import { getFreshness } from './validation'

// ─── Types ─────────────────────────────────────────────

export interface RealtimePrice {
  itemId: string
  quality: number
  city: string
  sellMin: number
  sellMinDate: number   // timestamp ms
  buyMax: number
  buyMaxDate: number    // timestamp ms
  sellAmount?: number
  buyAmount?: number
}

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface RealtimeStats {
  ordersReceived: number
  lastOrderTime: number | null
  connectedSince: number | null
  natsConnected: boolean
  priceEntries: number
  relayUptime: number
  ordersTotal: number
  ordersRelevant: number
}

export interface RealtimeOrder {
  itemId: string
  quality: number
  city: string
  side: 'sell' | 'buy'
  price: number
  amount?: number
  timestamp: number
}

export type DataMode = 'api-only' | 'hybrid' | 'realtime-only'

type PriceListener = (prices: Map<string, RealtimePrice>) => void
type StatusListener = (status: RealtimeStatus) => void
type OrderListener = (order: RealtimeOrder) => void
type StatsListener = (stats: RealtimeStats) => void

// ─── Client Class ──────────────────────────────────────

export class AlbionRealtimeClient {
  private url: string
  private ws: WebSocket | null = null
  private prices = new Map<string, RealtimePrice>()
  private status: RealtimeStatus = 'disconnected'
  private stats: RealtimeStats = {
    ordersReceived: 0,
    lastOrderTime: null,
    connectedSince: null,
    natsConnected: false,
    priceEntries: 0,
    relayUptime: 0,
    ordersTotal: 0,
    ordersRelevant: 0,
  }
  private recentOrders: RealtimeOrder[] = []

  private priceListeners = new Set<PriceListener>()
  private statusListeners = new Set<StatusListener>()
  private orderListeners = new Set<OrderListener>()
  private statsListeners = new Set<StatsListener>()

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private maxReconnectDelay = 30_000
  private shouldConnect = false

  constructor(url?: string) {
    this.url = url || RELAY_WS_URL
  }

  // ─── Public API ────────────────────────────────────

  connect(): void {
    this.shouldConnect = true
    this.doConnect()
  }

  disconnect(): void {
    this.shouldConnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  onPriceUpdate(listener: PriceListener): () => void {
    this.priceListeners.add(listener)
    return () => { this.priceListeners.delete(listener) }
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener)
    return () => { this.statusListeners.delete(listener) }
  }

  onOrder(listener: OrderListener): () => void {
    this.orderListeners.add(listener)
    return () => { this.orderListeners.delete(listener) }
  }

  onStatsChange(listener: StatsListener): () => void {
    this.statsListeners.add(listener)
    return () => { this.statsListeners.delete(listener) }
  }

  getPrices(): Map<string, RealtimePrice> {
    return this.prices
  }

  getStatus(): RealtimeStatus {
    return this.status
  }

  getStats(): RealtimeStats {
    return this.stats
  }

  getRecentOrders(): RealtimeOrder[] {
    return this.recentOrders
  }

  // ─── Internal ──────────────────────────────────────

  private doConnect(): void {
    if (this.ws) return
    this.setStatus('connecting')

    try {
      this.ws = new WebSocket(this.url)
    } catch {
      this.setStatus('error')
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.setStatus('connected')
      this.stats.connectedSince = Date.now()
      this.reconnectDelay = 1000 // reset backoff
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string)
        this.handleMessage(msg)
      } catch {
        // Malformed message
      }
    }

    this.ws.onclose = () => {
      this.ws = null
      if (this.shouldConnect) {
        this.setStatus('connecting')
        this.scheduleReconnect()
      } else {
        this.setStatus('disconnected')
      }
    }

    this.ws.onerror = () => {
      // onclose will fire after onerror, so we handle reconnect there
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.shouldConnect && !this.ws) {
        this.doConnect()
      }
    }, this.reconnectDelay)
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
  }

  private setStatus(status: RealtimeStatus): void {
    if (this.status === status) return
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }

  private handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'snapshot':
        this.handleSnapshot(msg as any)
        break
      case 'delta':
        this.handleDelta(msg as any)
        break
      case 'stats':
        this.handleStats(msg as any)
        break
      case 'nats_status':
        this.stats.natsConnected = !!(msg as any).connected
        for (const listener of this.statsListeners) listener(this.stats)
        break
    }
  }

  private handleSnapshot(msg: {
    prices: Record<string, RealtimePrice>
    stats: { natsConnected: boolean; ordersTotal: number; ordersRelevant: number; priceEntries: number; uptime: number; lastOrderTime: number }
  }): void {
    this.prices.clear()
    for (const [key, price] of Object.entries(msg.prices)) {
      this.prices.set(key, price)
    }
    this.stats.natsConnected = msg.stats.natsConnected
    this.stats.priceEntries = this.prices.size
    this.stats.ordersTotal = msg.stats.ordersTotal
    this.stats.ordersRelevant = msg.stats.ordersRelevant
    this.stats.relayUptime = msg.stats.uptime
    if (msg.stats.lastOrderTime) this.stats.lastOrderTime = msg.stats.lastOrderTime

    for (const listener of this.priceListeners) listener(this.prices)
    for (const listener of this.statsListeners) listener(this.stats)
  }

  private handleDelta(msg: {
    key: string
    price: RealtimePrice
    side: 'sell' | 'buy'
  }): void {
    this.prices.set(msg.key, msg.price)
    this.stats.ordersReceived++
    this.stats.lastOrderTime = Date.now()
    this.stats.priceEntries = this.prices.size

    // Add to recent orders
    const order: RealtimeOrder = {
      itemId: msg.price.itemId,
      quality: msg.price.quality,
      city: msg.price.city,
      side: msg.side,
      price: msg.side === 'sell' ? msg.price.sellMin : msg.price.buyMax,
      amount: msg.side === 'sell' ? msg.price.sellAmount : msg.price.buyAmount,
      timestamp: Date.now(),
    }
    this.recentOrders.unshift(order)
    if (this.recentOrders.length > 50) this.recentOrders.length = 50

    for (const listener of this.priceListeners) listener(this.prices)
    for (const listener of this.orderListeners) listener(order)
  }

  private handleStats(msg: {
    natsConnected: boolean
    ordersTotal: number
    ordersRelevant: number
    priceEntries: number
    clients: number
    uptime: number
    lastOrderTime: number
  }): void {
    this.stats.natsConnected = msg.natsConnected
    this.stats.ordersTotal = msg.ordersTotal
    this.stats.ordersRelevant = msg.ordersRelevant
    this.stats.priceEntries = msg.priceEntries
    this.stats.relayUptime = msg.uptime
    if (msg.lastOrderTime) this.stats.lastOrderTime = msg.lastOrderTime

    for (const listener of this.statsListeners) listener(this.stats)
  }
}

// ─── Conversion Helpers ────────────────────────────────

/** Convert a RealtimePrice to ValidatedPrice (for arbitrage engine compatibility) */
export function realtimeToValidated(rt: RealtimePrice): ValidatedPrice {
  const sellDate = rt.sellMinDate ? new Date(rt.sellMinDate) : new Date(0)
  const buyDate = rt.buyMaxDate ? new Date(rt.buyMaxDate) : new Date(0)
  const bestDate = sellDate > buyDate ? sellDate : buyDate

  return {
    itemId: rt.itemId,
    city: rt.city as City,
    quality: rt.quality,
    sellMin: rt.sellMin || 0,
    sellMinDate: sellDate,
    buyMax: rt.buyMax || 0,
    buyMaxDate: buyDate,
    freshness: getFreshness(bestDate),
  }
}

/**
 * Merge REST API prices with real-time NATS data.
 * Real-time data takes precedence per-field (sell side, buy side independently).
 * Real-time data also adds items that the API doesn't have.
 */
export function mergeWithRealtime(
  apiPrices: ValidatedPrice[],
  realtimePrices: Map<string, RealtimePrice>,
): ValidatedPrice[] {
  const merged = new Map<string, ValidatedPrice>()

  // 1. Start with all API prices
  for (const p of apiPrices) {
    merged.set(`${p.itemId}|${p.quality}|${p.city}`, p)
  }

  // 2. Overlay real-time data (fresher takes precedence per-field)
  for (const [, rt] of realtimePrices) {
    const key = `${rt.itemId}|${rt.quality}|${rt.city}`
    const existing = merged.get(key)
    const rtValidated = realtimeToValidated(rt)

    if (!existing) {
      // NATS has data the API doesn't — add it
      if (rtValidated.sellMin > 0 || rtValidated.buyMax > 0) {
        merged.set(key, rtValidated)
      }
    } else {
      // Merge field by field: use fresher data for each side
      const sellFromRt = rt.sellMinDate > existing.sellMinDate.getTime()
      const buyFromRt = rt.buyMaxDate > existing.buyMaxDate.getTime()

      const sellMin = sellFromRt && rt.sellMin > 0 ? rt.sellMin : existing.sellMin
      const sellMinDate = sellFromRt && rt.sellMin > 0 ? new Date(rt.sellMinDate) : existing.sellMinDate
      const buyMax = buyFromRt && rt.buyMax > 0 ? rt.buyMax : existing.buyMax
      const buyMaxDate = buyFromRt && rt.buyMax > 0 ? new Date(rt.buyMaxDate) : existing.buyMaxDate

      const bestDate = sellMinDate > buyMaxDate ? sellMinDate : buyMaxDate
      merged.set(key, {
        itemId: rt.itemId,
        city: rt.city as City,
        quality: rt.quality,
        sellMin,
        sellMinDate,
        buyMax,
        buyMaxDate,
        freshness: getFreshness(bestDate),
      })
    }
  }

  return [...merged.values()]
}

// ─── BM Buy Radar ─────────────────────────────────────

export interface BmBuyOrder {
  itemId: string
  quality: number
  bmBuyPrice: number
  bmBuyDate: number          // timestamp ms
  bmBuyAmount?: number
  caerleonSellPrice: number  // 0 if unknown
  caerleonSellDate: number   // 0 if unknown
  caerleonSellAmount?: number
  breakEvenPrice: number     // max you can pay in Caerleon to profit
  estimatedProfit: number    // if caerleon data exists
  profitPercent: number
  caerleonDataReliable: boolean  // false if > 5min old or missing
}

/**
 * Extract all active BM buy orders from the NATS price store.
 * For each BM buy order, also find the matching Caerleon sell data (if any).
 * This gives us a "radar" of what BM is currently buying.
 */
export function getBmBuyRadar(prices: Map<string, RealtimePrice>): BmBuyOrder[] {
  const bmOrders: BmBuyOrder[] = []
  const now = Date.now()

  // Collect all BM buy orders
  for (const [key, price] of prices) {
    if (price.city !== 'Black Market' || price.buyMax <= 0) continue

    // Find matching Caerleon sell data (same itemId + quality)
    const caerleonKey = `${price.itemId}|${price.quality}|Caerleon`
    const caerleon = prices.get(caerleonKey)

    const caerleonSellPrice = caerleon?.sellMin || 0
    const caerleonSellDate = caerleon?.sellMinDate || 0
    const caerleonAge = caerleonSellDate ? now - caerleonSellDate : Infinity
    const caerleonDataReliable = caerleonSellPrice > 0 && caerleonAge < 5 * 60 * 1000  // < 5min

    const breakEvenPrice = price.buyMax  // BM instant-sell has no tax
    const estimatedProfit = caerleonSellPrice > 0 ? price.buyMax - caerleonSellPrice : 0
    const profitPercent = caerleonSellPrice > 0 ? Math.round((estimatedProfit / caerleonSellPrice) * 1000) / 10 : 0

    bmOrders.push({
      itemId: price.itemId,
      quality: price.quality,
      bmBuyPrice: price.buyMax,
      bmBuyDate: price.buyMaxDate,
      bmBuyAmount: price.buyAmount,
      caerleonSellPrice,
      caerleonSellDate,
      caerleonSellAmount: caerleon?.sellAmount,
      breakEvenPrice,
      estimatedProfit,
      profitPercent,
      caerleonDataReliable,
    })
  }

  // Sort by BM buy price descending (highest value targets first)
  bmOrders.sort((a, b) => b.bmBuyPrice - a.bmBuyPrice)
  return bmOrders
}

// ─── Singleton ─────────────────────────────────────────

export const albionRealtime = new AlbionRealtimeClient()

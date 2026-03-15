/**
 * Market Data Extractor & Arbitrage Calculator
 *
 * Processes decoded Photon messages to extract market orders,
 * tracks Caerleon sell orders and Black Market buy orders,
 * and calculates arbitrage opportunities.
 *
 * Operation Codes:
 *   75 = AuctionGetOffers    (sell orders - what you see when browsing market)
 *   76 = AuctionGetRequests  (buy orders - what BM is buying)
 */

import { MSG_OPERATION_RESPONSE, MSG_OPERATION_REQUEST, MSG_EVENT_DATA } from './photon.mjs'

// Op codes
const OP_AUCTION_GET_OFFERS = 75
const OP_AUCTION_GET_REQUESTS = 76
const OP_JOIN = 2

// Location IDs
const LOC_CAERLEON = '3008'
const LOC_BLACK_MARKET = '3003'
const LOC_THETFORD = '7'
const LOC_LYMHURST = '1002'
const LOC_BRIDGEWATCH = '2004'
const LOC_MARTLOCK = '3005'
const LOC_FORT_STERLING = '4002'

const LOCATION_NAMES = {
  '3008': 'Caerleon',
  '3003': 'Black Market',
  '7': 'Thetford',
  '1002': 'Lymhurst',
  '2004': 'Bridgewatch',
  '3005': 'Martlock',
  '4002': 'Fort Sterling'
}

// Tax rate for selling at BM (setup fee)
const BM_TAX_RATE = 0.04
// Premium bonus
const PREMIUM_BONUS = 0.015

/**
 * Market state: tracks all captured orders
 */
class MarketTracker {
  constructor () {
    // Current player location (detected from game packets)
    this.currentLocation = null

    // Sell orders keyed by `${itemId}|${quality}|${locationId}`
    // Value: { orders: MarketOrder[], capturedAt: Date }
    this.sellOrders = new Map()

    // Buy orders keyed by `${itemId}|${quality}|${locationId}`
    this.buyOrders = new Map()

    // Event listeners
    this.listeners = {
      location: [],    // (locationId, locationName) => void
      orders: [],      // (type, locationId, orders[]) => void
      opportunity: []  // (opportunities[]) => void
    }

    // Stats
    this.stats = {
      totalSellOrders: 0,
      totalBuyOrders: 0,
      scanPages: 0,
      lastUpdate: null
    }
  }

  on (event, fn) {
    if (this.listeners[event]) this.listeners[event].push(fn)
  }

  emit (event, ...args) {
    if (this.listeners[event]) {
      for (const fn of this.listeners[event]) fn(...args)
    }
  }

  /**
   * Process a decoded Photon message
   * @param {{ type: number, operationCode: number, eventCode: number, params: object }} msg
   */
  processMessage (msg) {
    if (!msg) return

    // Track player location from Join event or ChangeCluster
    if (msg.type === MSG_EVENT_DATA) {
      this.handleEvent(msg)
      return
    }

    // Handle operation responses (market data)
    if (msg.type === MSG_OPERATION_RESPONSE) {
      this.handleResponse(msg)
      return
    }

    // Handle operation requests to detect what player is doing
    if (msg.type === MSG_OPERATION_REQUEST) {
      this.handleRequest(msg)
      return
    }
  }

  handleEvent (msg) {
    // Various event codes that contain location info
    // The game sends location updates in different events
    // We mainly track it via operation request/response context
  }

  handleRequest (msg) {
    // We can use requests to track what the player is searching for
    // but the real data comes from responses
  }

  handleResponse (msg) {
    switch (msg.operationCode) {
      case OP_JOIN: {
        // Player joined a zone - extract location
        // Param 8 is typically the map/cluster info
        // The location we care about is the city the player is in
        // We detect location from the orders themselves
        break
      }

      case OP_AUCTION_GET_OFFERS: {
        // Sell orders response - param 0 contains JSON string array
        const rawOrders = msg.params[0]
        if (!rawOrders || !Array.isArray(rawOrders)) break

        const orders = this.parseMarketOrders(rawOrders, 'sell')
        if (orders.length === 0) break

        // Determine location from first order (all orders in a response are same location)
        const locationId = orders[0].locationId || this.currentLocation
        if (locationId) {
          this.currentLocation = locationId
        }

        this.storeSellOrders(locationId, orders)
        this.stats.scanPages++
        this.stats.lastUpdate = new Date()

        this.emit('orders', 'sell', locationId, orders)
        this.findOpportunities()
        break
      }

      case OP_AUCTION_GET_REQUESTS: {
        // Buy orders response - param 0 contains JSON string array
        const rawOrders = msg.params[0]
        if (!rawOrders || !Array.isArray(rawOrders)) break

        const orders = this.parseMarketOrders(rawOrders, 'buy')
        if (orders.length === 0) break

        const locationId = orders[0].locationId || this.currentLocation
        if (locationId) {
          this.currentLocation = locationId
        }

        this.storeBuyOrders(locationId, orders)
        this.stats.scanPages++
        this.stats.lastUpdate = new Date()

        this.emit('orders', 'buy', locationId, orders)
        this.findOpportunities()
        break
      }
    }
  }

  /**
   * Parse raw JSON string array into MarketOrder objects
   */
  parseMarketOrders (rawOrders, type) {
    const orders = []
    for (const raw of rawOrders) {
      try {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!data) continue

        // UnitPriceSilver is * 10000 in raw data
        const unitPrice = Math.round((data.UnitPriceSilver || 0) / 10000)

        orders.push({
          id: data.Id,
          itemId: data.ItemTypeId || '',
          groupId: data.ItemGroupTypeId || '',
          locationId: String(data.LocationId || this.currentLocation || ''),
          qualityLevel: data.QualityLevel || 1,
          enchantmentLevel: data.EnchantmentLevel || 0,
          unitPrice,
          amount: data.Amount || 0,
          auctionType: type,
          expires: data.Expires || '',
          capturedAt: Date.now()
        })
      } catch (e) {
        // Skip malformed orders
      }
    }
    return orders
  }

  storeSellOrders (locationId, orders) {
    for (const order of orders) {
      const key = `${order.itemId}|${order.qualityLevel}|${locationId}`
      if (!this.sellOrders.has(key)) {
        this.sellOrders.set(key, { orders: [], capturedAt: Date.now() })
      }
      const entry = this.sellOrders.get(key)

      // Replace existing order with same ID, or add new
      const existIdx = entry.orders.findIndex(o => o.id === order.id)
      if (existIdx >= 0) {
        entry.orders[existIdx] = order
      } else {
        entry.orders.push(order)
      }
      entry.capturedAt = Date.now()
    }
    // Sort each entry by price ascending
    for (const [, entry] of this.sellOrders) {
      entry.orders.sort((a, b) => a.unitPrice - b.unitPrice)
    }
    this.stats.totalSellOrders = [...this.sellOrders.values()]
      .reduce((sum, e) => sum + e.orders.length, 0)
  }

  storeBuyOrders (locationId, orders) {
    for (const order of orders) {
      const key = `${order.itemId}|${order.qualityLevel}|${locationId}`
      if (!this.buyOrders.has(key)) {
        this.buyOrders.set(key, { orders: [], capturedAt: Date.now() })
      }
      const entry = this.buyOrders.get(key)

      const existIdx = entry.orders.findIndex(o => o.id === order.id)
      if (existIdx >= 0) {
        entry.orders[existIdx] = order
      } else {
        entry.orders.push(order)
      }
      entry.capturedAt = Date.now()
    }
    // Sort buy orders by price descending (highest first)
    for (const [, entry] of this.buyOrders) {
      entry.orders.sort((a, b) => b.unitPrice - a.unitPrice)
    }
    this.stats.totalBuyOrders = [...this.buyOrders.values()]
      .reduce((sum, e) => sum + e.orders.length, 0)
  }

  /**
   * Find Caerleon → BM arbitrage opportunities
   * Compares Caerleon sell orders with BM buy orders
   */
  findOpportunities () {
    const opportunities = []

    // For each BM buy order, check if there's a cheaper sell in Caerleon
    for (const [bmKey, bmEntry] of this.buyOrders) {
      const [itemId, quality] = bmKey.split('|')
      const bmLocationId = bmKey.split('|')[2]

      // Only care about BM buy orders
      if (bmLocationId !== LOC_BLACK_MARKET) continue
      if (bmEntry.orders.length === 0) continue

      const bmBest = bmEntry.orders[0] // highest buy price

      // Look for Caerleon sell orders for same item+quality
      const caerleonKey = `${itemId}|${quality}|${LOC_CAERLEON}`
      const caerleonEntry = this.sellOrders.get(caerleonKey)

      if (!caerleonEntry || caerleonEntry.orders.length === 0) continue
      const caerleonBest = caerleonEntry.orders[0] // lowest sell price

      // Calculate profit
      // BM has no listing fee, just instant sell
      // But there's a setup fee of ~4% on BM
      const sellPrice = bmBest.unitPrice
      const buyPrice = caerleonBest.unitPrice
      const taxAmount = Math.round(sellPrice * BM_TAX_RATE)
      const profit = sellPrice - buyPrice - taxAmount
      const profitPercent = buyPrice > 0 ? (profit / buyPrice) * 100 : 0

      if (profit <= 0) continue

      const maxAmount = Math.min(bmBest.amount, caerleonBest.amount)

      opportunities.push({
        itemId,
        qualityLevel: parseInt(quality),
        caerleonPrice: buyPrice,
        caerleonAmount: caerleonBest.amount,
        caerleonAge: Date.now() - caerleonEntry.capturedAt,
        bmPrice: sellPrice,
        bmAmount: bmBest.amount,
        bmAge: Date.now() - bmEntry.capturedAt,
        profit,
        profitPercent,
        totalProfit: profit * maxAmount,
        maxAmount,
        taxAmount
      })
    }

    // Sort by profit descending
    opportunities.sort((a, b) => b.profit - a.profit)
    this.emit('opportunity', opportunities)
    return opportunities
  }

  /**
   * Get current state summary
   */
  getState () {
    const caerleonSellCount = [...this.sellOrders.entries()]
      .filter(([k]) => k.endsWith(`|${LOC_CAERLEON}`))
      .reduce((sum, [, e]) => sum + e.orders.length, 0)

    const bmBuyCount = [...this.buyOrders.entries()]
      .filter(([k]) => k.endsWith(`|${LOC_BLACK_MARKET}`))
      .reduce((sum, [, e]) => sum + e.orders.length, 0)

    return {
      currentLocation: this.currentLocation,
      locationName: LOCATION_NAMES[this.currentLocation] || 'Unknown',
      caerleonSellOrders: caerleonSellCount,
      bmBuyOrders: bmBuyCount,
      totalSellOrders: this.stats.totalSellOrders,
      totalBuyOrders: this.stats.totalBuyOrders,
      scanPages: this.stats.scanPages,
      lastUpdate: this.stats.lastUpdate,
      opportunities: this.findOpportunities()
    }
  }

  /**
   * Clear all captured data
   */
  clear () {
    this.sellOrders.clear()
    this.buyOrders.clear()
    this.stats.totalSellOrders = 0
    this.stats.totalBuyOrders = 0
    this.stats.scanPages = 0
  }
}

export { MarketTracker, LOCATION_NAMES, LOC_CAERLEON, LOC_BLACK_MARKET }

#!/usr/bin/env node
/**
 * Albion Online Market Sniffer v3.0
 *
 * Architecture:
 *   albiondata-client (official Go app, port 8099)
 *     → WebSocket → sniffer.mjs (this file)
 *       → MarketStore → WebSocket (port 9876) → React UI
 *
 * The official albiondata-client handles all Photon protocol decoding
 * and broadcasts decoded market data via WebSocket on port 8099.
 * We connect to it, process the data, and serve it to our React UI.
 *
 * Usage:
 *   node sniffer.mjs           # start sniffer
 *   node sniffer.mjs --debug   # verbose logging
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { connect as natsConnect, StringCodec } from 'nats'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEBUG = process.argv.includes('--debug')
const ENABLE_NATS = process.argv.includes('--nats')  // NATS is opt-in, sniffer works fine without it

const AODP_WS_URL = 'ws://localhost:8099/ws'  // albiondata-client WebSocket
const WS_PORT = 9876                           // Our WebSocket for React UI
const BM_TAX_RATE = 0.04                       // BM sales tax (4% with premium)
const API_BASE = 'https://europe.albion-online-data.com/api/v2/stats/prices'
const API_LOCATIONS = 'Caerleon,Black Market'   // Fetch prices for these cities
const API_BATCH_SIZE = 100                      // Max items per API call
const API_COOLDOWN_MS = 3000                    // Min time between API calls

// NATS config
const NATS_URL = 'nats://nats.albion-online-data.com:34222'
const NATS_USER = 'public'
const NATS_PASS = 'thenewalbiondata'
const NATS_SUBJECT = 'marketorders.deduped'

// --- Load item names ---
let itemsMap = {}
try {
  const raw = JSON.parse(readFileSync(join(__dirname, 'items.json'), 'utf8'))
  // items.json could be { "T4_SWORD": "Broadsword", ... } or array format
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item.UniqueName && item.LocalizedNames) {
        itemsMap[item.UniqueName] = item.LocalizedNames['EN-US'] || item.UniqueName
      }
    }
  } else {
    itemsMap = raw
  }
} catch (e) {
  console.log('  [WARN] items.json not found — item names will show as IDs')
}

// City name mapping
function getCityName (locId) {
  const id = String(locId)
  const map = {
    '0007': 'Thetford', '7': 'Thetford',
    '1002': 'Lymhurst',
    '2004': 'Bridgewatch',
    '3005': 'Caerleon',
    '3003': 'Black Market',
    '3008': 'Martlock',
    '4002': 'Fort Sterling',
    '5003': 'Brecilien',
    '0301': 'Caerleon Market', '301': 'Caerleon Market',
    '3013': 'Black Market'
  }
  return map[id] || `City-${id}`
}

// --- Market Data Store ---

class MarketStore {
  constructor () {
    this.orders = new Map()
    this.stats = { totalSellOrders: 0, totalBuyOrders: 0, scanPages: 0, lastUpdate: null }
    this.natsStats = { connected: false, ordersTotal: 0, ordersRelevant: 0, lastOrderTime: 0 }
    this.currentLocation = null
    this.listeners = { orders: [], opportunity: [], location: [] }
    this.apiFetchedItems = new Set()
    this._apiFetchTimer = null
    this._natsDebugCount = 0
  }

  on (event, fn) { if (this.listeners[event]) this.listeners[event].push(fn) }
  emit (event, ...args) { if (this.listeners[event]) for (const fn of this.listeners[event]) fn(...args) }

  /**
   * Process market orders from albiondata-client WebSocket
   * Format: { topic: "marketorders", data: { Orders: [...] } }
   */
  ingestOrders (rawOrders) {
    if (!rawOrders || !Array.isArray(rawOrders) || rawOrders.length === 0) return

    // Debug: log first few raw orders to check format
    if (this.stats.scanPages < 3 || DEBUG) {
      console.log(`  [DEBUG] Raw order sample (page ${this.stats.scanPages}):`)
      for (const o of rawOrders.slice(0, 2)) {
        console.log(`    AuctionType=${o.AuctionType} ItemTypeId=${o.ItemTypeId} LocationId=${o.LocationId} UnitPriceSilver=${o.UnitPriceSilver} Amount=${o.Amount} Q=${o.QualityLevel}`)
      }
    }

    const parsedOrders = []
    const timestamp = Date.now()

    for (const msg of rawOrders) {
      const itemId = msg.ItemTypeId || msg.ItemId || ''
      if (!itemId) continue

      let price = 0
      if (msg.UnitPriceSilver != null) {
        price = Math.round(msg.UnitPriceSilver / 10000)
      }
      if (price <= 0) continue

      // AuctionType: "offer" = sell order, "request" = buy order
      const orderType = msg.AuctionType === 'request' ? 'buy' : 'sell'
      const locId = String(msg.LocationId || '')
      const cityName = getCityName(locId)
      const quality = msg.QualityLevel || 1
      const enchantment = msg.EnchantmentLevel || 0
      const amount = msg.Amount || 1

      const order = {
        id: msg.Id,
        itemId,
        itemName: itemsMap[itemId] || itemsMap[itemId.replace(/@\d+$/, '')] || itemId,
        quality,
        enchantment,
        city: cityName,
        cityId: locId,
        price,
        amount,
        orderType,
        timestamp
      }

      parsedOrders.push(order)

      const key = `${itemId}|${quality}|${enchantment}|${cityName}|${orderType}`

      // Smart merge: within same scan session (30s), keep best price
      // Between sessions: overwrite with fresh data
      const existing = this.orders.get(key)
      if (existing && (timestamp - existing.timestamp) < 30000) {
        // Same session — keep highest BM buy, lowest city sell
        if (orderType === 'buy' && existing.price > price) {
          continue // keep the higher BM buy price
        }
        if (orderType === 'sell' && existing.price < price) {
          continue // keep the lower city sell price
        }
      }
      this.orders.set(key, order)
    }

    if (parsedOrders.length === 0) return

    this.stats.scanPages++
    this.stats.lastUpdate = new Date()
    this.stats.totalSellOrders = [...this.orders.values()].filter(o => o.orderType === 'sell').length
    this.stats.totalBuyOrders = [...this.orders.values()].filter(o => o.orderType === 'buy').length

    // Detect location from orders
    const firstCity = parsedOrders[0]?.city
    if (firstCity) this.currentLocation = firstCity

    const orderType = parsedOrders[0]?.orderType || 'sell'
    this.emit('orders', orderType, this.currentLocation, parsedOrders)

    const opps = this.findOpportunities()
    if (opps.length > 0) this.emit('opportunity', opps)

    // Auto-fetch city prices from API when BM orders come in (debounced)
    if (orderType === 'buy') {
      clearTimeout(this._apiFetchTimer)
      this._apiFetchTimer = setTimeout(() => {
        this.autoFetchCityPrices().catch(e => {
          if (DEBUG) console.log(`  [API] Auto-fetch error: ${e.message}`)
        })
      }, 2000)
    }

    return parsedOrders
  }

  findOpportunities () {
    const taxRate = BM_TAX_RATE

    // BM buy orders (highest price wins)
    const bmBuys = new Map()
    // Sell orders by item across all cities
    const sellOrders = new Map()

    for (const [, order] of this.orders) {
      if (order.orderType === 'buy' && order.city === 'Black Market') {
        const key = `${order.itemId}|${order.quality}|${order.enchantment}`
        const existing = bmBuys.get(key)
        if (!existing || order.price > existing.price) {
          bmBuys.set(key, order)
        }
      } else if (order.orderType === 'sell' && order.city !== 'Black Market') {
        const key = `${order.itemId}|${order.quality}|${order.enchantment}|${order.city}`
        const existing = sellOrders.get(key)
        if (!existing || order.price < existing.price) {
          sellOrders.set(key, order)
        }
      }
    }

    const opportunities = []

    for (const [bmKey, bmOrder] of bmBuys) {
      let bestSell = null
      for (const [, sellOrder] of sellOrders) {
        const sellItemKey = `${sellOrder.itemId}|${sellOrder.quality}|${sellOrder.enchantment}`
        if (sellItemKey !== bmKey) continue
        if (!bestSell || sellOrder.price < bestSell.price) {
          bestSell = sellOrder
        }
      }

      if (!bestSell) continue

      const sellPrice = bmOrder.price
      const buyPrice = bestSell.price
      const taxAmount = Math.round(sellPrice * taxRate)
      const profit = sellPrice - buyPrice - taxAmount
      const profitPercent = buyPrice > 0 ? (profit / buyPrice) * 100 : 0

      if (profit <= 0) continue

      const maxAmount = Math.min(bmOrder.amount, bestSell.amount)

      opportunities.push({
        itemId: bmOrder.itemId,
        itemName: bmOrder.itemName,
        qualityLevel: bmOrder.quality,
        enchantment: bmOrder.enchantment,
        sourceCity: bestSell.city,
        caerleonPrice: buyPrice,
        caerleonAmount: bestSell.amount,
        caerleonSource: bestSell.source || 'sniffer',  // 'api' or 'sniffer'
        caerleonAge: Date.now() - (bestSell.timestamp || Date.now()),
        bmPrice: sellPrice,
        bmAmount: bmOrder.amount,
        profit,
        profitPercent,
        totalProfit: profit * maxAmount,
        maxAmount,
        taxAmount
      })
    }

    opportunities.sort((a, b) => b.profit - a.profit)
    return opportunities
  }

  getState () {
    const orders = [...this.orders.values()]
    return {
      currentLocation: this.currentLocation || 'Unknown',
      caerleonSellOrders: orders.filter(o => o.orderType === 'sell' && o.city === 'Caerleon').length,
      caerleonApiOrders: orders.filter(o => o.orderType === 'sell' && o.city === 'Caerleon' && o.source === 'api').length,
      caerleonNatsOrders: orders.filter(o => o.orderType === 'sell' && o.city === 'Caerleon' && o.source === 'nats').length,
      bmBuyOrders: orders.filter(o => o.orderType === 'buy' && o.city === 'Black Market').length,
      bmNatsOrders: orders.filter(o => o.orderType === 'buy' && o.city === 'Black Market' && o.source === 'nats').length,
      totalSellOrders: this.stats.totalSellOrders,
      totalBuyOrders: this.stats.totalBuyOrders,
      scanPages: this.stats.scanPages,
      lastUpdate: this.stats.lastUpdate,
      nats: this.natsStats,
      opportunities: this.findOpportunities()
    }
  }

  /**
   * Process orders from NATS stream (global data from all players)
   * Different from ingestOrders: NATS sends raw Albion data, prices may or may not need /10000
   */
  ingestNatsOrders (rawOrders, dividePrice = false) {
    if (!rawOrders || !Array.isArray(rawOrders) || rawOrders.length === 0) return

    const parsedOrders = []
    const timestamp = Date.now()

    for (const msg of rawOrders) {
      this.natsStats.ordersTotal++
      const itemId = msg.ItemTypeId || msg.itemTypeId || ''
      if (!itemId) continue

      const locId = msg.LocationId ?? msg.locationId
      const cityName = getCityName(String(locId))

      // Only care about Caerleon + BM for arbitrage
      if (cityName !== 'Caerleon' && cityName !== 'Black Market') continue

      this.natsStats.ordersRelevant++
      this.natsStats.lastOrderTime = timestamp

      let price = msg.UnitPriceSilver ?? msg.unitPriceSilver ?? 0
      if (dividePrice) price = Math.round(price / 10000)
      if (price <= 0) continue

      const auctionType = (msg.AuctionType || msg.auctionType || '').toLowerCase()
      const orderType = auctionType === 'request' ? 'buy' : 'sell'
      const quality = msg.QualityLevel ?? msg.qualityLevel ?? 1
      const enchantment = msg.EnchantmentLevel ?? msg.enchantmentLevel ?? 0
      const amount = msg.Amount ?? msg.amount ?? 1

      const order = {
        id: msg.Id || msg.id || `nats-${itemId}-${timestamp}`,
        itemId,
        itemName: itemsMap[itemId] || itemsMap[itemId.replace(/@\d+$/, '')] || itemId,
        quality,
        enchantment,
        city: cityName,
        cityId: String(locId),
        price,
        amount,
        orderType,
        timestamp,
        source: 'nats'
      }

      parsedOrders.push(order)

      const key = `${itemId}|${quality}|${enchantment}|${cityName}|${orderType}`

      // NATS data: overwrite unless we have fresher sniffer data (< 60s old)
      const existing = this.orders.get(key)
      if (existing && existing.source !== 'nats' && existing.source !== 'api' && (timestamp - existing.timestamp) < 60000) {
        continue // keep fresh sniffer data
      }
      this.orders.set(key, order)
    }

    if (parsedOrders.length === 0) return

    this.stats.lastUpdate = new Date()
    this.stats.totalSellOrders = [...this.orders.values()].filter(o => o.orderType === 'sell').length
    this.stats.totalBuyOrders = [...this.orders.values()].filter(o => o.orderType === 'buy').length

    this.emit('orders', parsedOrders[0]?.orderType || 'sell', parsedOrders[0]?.city || 'NATS', parsedOrders)

    // Debounced opportunity check (don't recalc on every NATS message)
    clearTimeout(this._natsOpportunityTimer)
    this._natsOpportunityTimer = setTimeout(() => {
      const opps = this.findOpportunities()
      if (opps.length > 0) this.emit('opportunity', opps)
    }, 2000)

    return parsedOrders
  }

  /**
   * Refresh API prices for ALL BM items (not just new ones)
   * This re-fetches Caerleon prices to catch stale/filled orders
   */
  async refreshApiPrices () {
    const bmItems = new Set()
    for (const [, order] of this.orders) {
      if (order.orderType === 'buy' && order.city === 'Black Market') {
        bmItems.add(order.itemId)
      }
    }
    if (bmItems.size === 0) return

    const unique = [...bmItems]
    console.log(`  [API] Refreshing prices for ${unique.length} BM items...`)

    for (let i = 0; i < unique.length; i += API_BATCH_SIZE) {
      const batch = unique.slice(i, i + API_BATCH_SIZE)
      try {
        const url = `${API_BASE}/${batch.join(',')}?locations=${API_LOCATIONS}&qualities=1,2,3,4,5`
        const resp = await fetch(url)
        if (!resp.ok) continue
        const data = await resp.json()
        let updated = 0
        for (const item of data) {
          if (!item.sell_price_min || item.sell_price_min <= 0) continue
          if (item.city === 'Black Market') continue

          const cityName = item.city || 'Unknown'
          const itemId = item.item_id || ''
          const quality = item.quality || 1
          const enchMatch = itemId.match(/@(\d+)$/)
          const enchantment = enchMatch ? parseInt(enchMatch[1]) : 0
          const key = `${itemId}|${quality}|${enchantment}|${cityName}|sell`

          // Always update API data (it's a refresh)
          const existing = this.orders.get(key)
          if (!existing || existing.source === 'api') {
            this.orders.set(key, {
              id: `api-${itemId}-${quality}`,
              itemId,
              itemName: itemsMap[itemId] || itemsMap[itemId.replace(/@\d+$/, '')] || itemId,
              quality, enchantment, city: cityName, cityId: '',
              price: item.sell_price_min, amount: 1, orderType: 'sell',
              timestamp: Date.now(), source: 'api', apiDate: item.sell_price_min_date
            })
            updated++
          }
        }
        if (updated > 0) console.log(`  [API] Refreshed ${updated} prices`)
        if (i + API_BATCH_SIZE < unique.length) {
          await new Promise(r => setTimeout(r, API_COOLDOWN_MS))
        }
      } catch (e) {
        if (DEBUG) console.log(`  [API] Refresh error: ${e.message}`)
      }
    }

    this.stats.totalSellOrders = [...this.orders.values()].filter(o => o.orderType === 'sell').length
    const opps = this.findOpportunities()
    if (opps.length > 0) this.emit('opportunity', opps)
  }

  clear () {
    this.orders.clear()
    this.stats = { totalSellOrders: 0, totalBuyOrders: 0, scanPages: 0, lastUpdate: null }
    this.natsStats = { connected: false, ordersTotal: 0, ordersRelevant: 0, lastOrderTime: 0 }
    this.apiFetchedItems = new Set()
  }

  /**
   * Auto-fetch city prices from API for BM items that don't have a city counterpart
   */
  async autoFetchCityPrices () {
    // Collect BM buy items that have no city sell data
    const needFetch = []
    for (const [, order] of this.orders) {
      if (order.orderType !== 'buy' || order.city !== 'Black Market') continue
      // Check if we already have a city sell for this item
      const sellKey = `${order.itemId}|${order.quality}|${order.enchantment}`
      let hasSell = false
      for (const [, o] of this.orders) {
        if (o.orderType === 'sell' && o.city !== 'Black Market' &&
            o.itemId === order.itemId && o.quality === order.quality && o.enchantment === order.enchantment) {
          hasSell = true
          break
        }
      }
      if (!hasSell && !this.apiFetchedItems.has(order.itemId)) {
        needFetch.push(order.itemId)
        this.apiFetchedItems.add(order.itemId)
      }
    }

    if (needFetch.length === 0) return

    // Batch fetch from API
    const unique = [...new Set(needFetch)]
    console.log(`  [API] Fetching city prices for ${unique.length} BM items...`)

    for (let i = 0; i < unique.length; i += API_BATCH_SIZE) {
      const batch = unique.slice(i, i + API_BATCH_SIZE)
      try {
        const url = `${API_BASE}/${batch.join(',')}?locations=${API_LOCATIONS}&qualities=1,2,3,4,5`
        const resp = await fetch(url)
        if (!resp.ok) {
          console.log(`  [API] HTTP ${resp.status} for batch ${i / API_BATCH_SIZE + 1}`)
          continue
        }
        const data = await resp.json()
        let added = 0
        for (const item of data) {
          if (!item.sell_price_min || item.sell_price_min <= 0) continue
          if (item.city === 'Black Market') continue

          const cityName = item.city || 'Unknown'
          const itemId = item.item_id || ''
          const quality = item.quality || 1
          // Extract enchantment from item ID (e.g., T5_ARMOR@3 → 3)
          const enchMatch = itemId.match(/@(\d+)$/)
          const enchantment = enchMatch ? parseInt(enchMatch[1]) : 0

          const key = `${itemId}|${quality}|${enchantment}|${cityName}|sell`
          // Only add if we don't already have fresh sniffer data
          if (!this.orders.has(key)) {
            this.orders.set(key, {
              id: `api-${itemId}-${quality}`,
              itemId,
              itemName: itemsMap[itemId] || itemsMap[itemId.replace(/@\d+$/, '')] || itemId,
              quality,
              enchantment,
              city: cityName,
              cityId: '',
              price: item.sell_price_min,
              amount: 1,
              orderType: 'sell',
              timestamp: Date.now(),
              source: 'api',
              apiDate: item.sell_price_min_date
            })
            added++
          }
        }
        if (added > 0) {
          console.log(`  [API] +${added} city sell prices from batch ${i / API_BATCH_SIZE + 1}`)
        }
        // Respect rate limit
        if (i + API_BATCH_SIZE < unique.length) {
          await new Promise(r => setTimeout(r, API_COOLDOWN_MS))
        }
      } catch (e) {
        console.log(`  [API] Error: ${e.message}`)
      }
    }

    // Recalculate stats and opportunities
    this.stats.totalSellOrders = [...this.orders.values()].filter(o => o.orderType === 'sell').length
    this.stats.totalBuyOrders = [...this.orders.values()].filter(o => o.orderType === 'buy').length
    const opps = this.findOpportunities()
    if (opps.length > 0) {
      console.log(`  [API] Found ${opps.length} opportunities after API enrichment!`)
      this.emit('opportunity', opps)
    }
  }
}

// --- Connect to albiondata-client WebSocket ---

function connectToAODP (store) {
  let ws = null
  let reconnectTimer = null
  let connected = false

  function connect () {
    console.log(`  [AODP] Connecting to ${AODP_WS_URL}...`)

    ws = new WebSocket(AODP_WS_URL, {
      headers: { 'Origin': 'http://localhost' }
    })

    ws.on('open', () => {
      connected = true
      console.log(`  [AODP] ✓ Connected to albiondata-client!`)
      console.log(`  [AODP]   Market data will flow when you browse markets in-game`)
    })

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())

        if (DEBUG) {
          console.log(`  [AODP] ← topic=${msg.topic} data=${JSON.stringify(msg.data).substring(0, 200)}`)
        }

        // Handle different message topics from albiondata-client
        const topic = msg.topic || ''

        if (topic.startsWith('marketorders')) {
          // Market orders: { Orders: [...] }
          const orders = msg.data?.Orders || msg.data
          if (Array.isArray(orders)) {
            store.ingestOrders(orders)
          }
        } else if (topic.startsWith('goldprices')) {
          console.log(`  [AODP] 💰 Gold price update received`)
        } else if (topic.startsWith('mapdata')) {
          console.log(`  [AODP] 🗺️ Map data received`)
        } else {
          if (DEBUG) {
            console.log(`  [AODP] Topic: ${topic}`)
          }
        }
      } catch (e) {
        if (DEBUG) console.error(`  [AODP] Parse error: ${e.message}`)
      }
    })

    ws.on('close', () => {
      if (connected) {
        console.log(`  [AODP] Connection lost. Reconnecting in 3s...`)
      }
      connected = false
      scheduleReconnect()
    })

    ws.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        if (!connected) {
          console.log(`  [AODP] ✗ albiondata-client not running on port 8099`)
          console.log(`  [AODP]   Start it with: albiondata-client -d`)
          console.log(`  [AODP]   Make sure config.yaml has EnableWebsockets: true`)
          console.log(`  [AODP]   Retrying in 5s...`)
        }
      } else {
        console.error(`  [AODP] Error: ${err.message}`)
      }
      connected = false
      scheduleReconnect()
    })
  }

  function scheduleReconnect () {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, connected ? 3000 : 5000)
  }

  connect()
  return { getConnected: () => connected }
}

// --- WebSocket Server (sends to React UI on port 9876) ---

function startWSServer (store, aodpConnection, natsConnection) {
  // HTTP server for debug endpoints + WebSocket upgrade
  const httpServer = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json')

    if (req.url === '/stats') {
      const state = store.getState()
      state.aodpConnected = aodpConnection.getConnected()
      state.natsConnected = natsConnection?.getConnected() || false
      res.end(JSON.stringify(state, null, 2))
    } else if (req.url === '/orders') {
      // Dump all stored orders for debugging
      const all = [...store.orders.entries()].map(([key, order]) => ({ key, ...order }))
      res.end(JSON.stringify({ total: all.length, orders: all.slice(0, 200) }, null, 2))
    } else if (req.url === '/debug') {
      // Show BM buys and city sells, check overlap
      const bmBuys = []
      const cityItems = new Set()
      const bmItems = new Set()
      for (const [, o] of store.orders) {
        if (o.orderType === 'buy' && o.city === 'Black Market') {
          bmBuys.push({ itemId: o.itemId, price: o.price, amount: o.amount, quality: o.quality, enchantment: o.enchantment })
          bmItems.add(`${o.itemId}|${o.quality}|${o.enchantment}`)
        }
        if (o.orderType === 'sell' && o.city !== 'Black Market') {
          cityItems.add(`${o.itemId}|${o.quality}|${o.enchantment}`)
        }
      }
      const overlap = [...bmItems].filter(k => cityItems.has(k))
      res.end(JSON.stringify({
        bmBuyCount: bmBuys.length,
        citySellItemKeys: cityItems.size,
        bmBuyItemKeys: bmItems.size,
        overlappingKeys: overlap.length,
        overlapSample: overlap.slice(0, 20),
        bmSample: bmBuys.slice(0, 10)
      }, null, 2))
    } else if (req.url === '/compare') {
      // Compare prices for overlapping items
      const bmBuys = new Map()
      const citySells = new Map()
      for (const [, o] of store.orders) {
        const itemKey = `${o.itemId}|${o.quality}|${o.enchantment}`
        if (o.orderType === 'buy' && o.city === 'Black Market') {
          const ex = bmBuys.get(itemKey)
          if (!ex || o.price > ex.price) bmBuys.set(itemKey, o)
        }
        if (o.orderType === 'sell' && o.city !== 'Black Market') {
          const ex = citySells.get(itemKey)
          if (!ex || o.price < ex.price) citySells.set(itemKey, o)
        }
      }
      const comparisons = []
      for (const [key, bm] of bmBuys) {
        const sell = citySells.get(key)
        if (!sell) continue
        const tax = Math.round(bm.price * BM_TAX_RATE)
        const profit = bm.price - sell.price - tax
        comparisons.push({
          item: bm.itemName, itemId: bm.itemId, quality: bm.quality, enchantment: bm.enchantment,
          bmBuyPrice: bm.price, sellPrice: sell.price, sellCity: sell.city,
          tax, profit, profitPct: sell.price > 0 ? (profit / sell.price * 100).toFixed(1) : 0
        })
      }
      comparisons.sort((a, b) => b.profit - a.profit)
      res.end(JSON.stringify({ total: comparisons.length, profitable: comparisons.filter(c => c.profit > 0).length, items: comparisons.slice(0, 50) }, null, 2))
    } else if (req.url === '/cities') {
      // Show city distribution
      const cities = {}
      for (const [, o] of store.orders) {
        const key = `${o.city}|${o.orderType}`
        cities[key] = (cities[key] || 0) + 1
      }
      res.end(JSON.stringify(cities, null, 2))
    } else {
      res.end(JSON.stringify({ endpoints: ['/stats', '/orders', '/debug', '/cities', '/compare'] }))
    }
  })

  httpServer.listen(WS_PORT, () => {
    console.log(`  [HTTP] Debug endpoints on http://localhost:${WS_PORT}/stats, /orders, /debug, /cities`)
  })

  const wss = new WebSocketServer({ server: httpServer })
  const clients = new Set()

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`  [WS] ERROR: Port ${WS_PORT} already in use!`)
      console.error(`  [WS] Kill old process: netstat -ano | findstr ${WS_PORT}`)
    } else {
      console.error(`  [WS] Error: ${err.message}`)
    }
  })

  wss.on('connection', (ws) => {
    clients.add(ws)
    console.log(`  [WS] React client connected (${clients.size} total)`)

    const state = store.getState()
    state.aodpConnected = aodpConnection.getConnected()
    state.natsConnected = natsConnection?.getConnected() || false
    ws.send(JSON.stringify({ type: 'state', data: state }))

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'getState') {
          const s = store.getState()
          s.aodpConnected = aodpConnection.getConnected()
          ws.send(JSON.stringify({ type: 'state', data: s }))
        } else if (msg.type === 'clear') {
          store.clear()
          broadcast({ type: 'cleared' })
        }
      } catch (e) { /* ignore */ }
    })

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`  [WS] React client disconnected (${clients.size} total)`)
    })
  })

  function broadcast (msg) {
    const data = JSON.stringify(msg)
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data)
    }
  }

  store.on('orders', (type, location, orders) => {
    broadcast({
      type: 'orders',
      data: {
        orderType: type,
        locationName: location,
        count: orders.length,
        items: orders.slice(0, 100).map(o => ({
          itemId: o.itemId,
          itemName: o.itemName,
          quality: o.quality,
          enchantment: o.enchantment,
          price: o.price,
          amount: o.amount,
          city: o.city
        }))
      }
    })
  })

  store.on('opportunity', (opportunities) => {
    broadcast({ type: 'opportunities', data: opportunities })
  })

  // Periodic full state broadcast
  setInterval(() => {
    const state = store.getState()
    state.aodpConnected = aodpConnection.getConnected()
    state.natsConnected = natsConnection?.getConnected() || false
    broadcast({ type: 'state', data: state })
  }, 5000)

  console.log(`  [WS] Server listening on ws://localhost:${WS_PORT}`)
  return { wss, broadcast }
}

// --- NATS Connection (global market data from all players) ---

function connectToNATS (store) {
  if (!ENABLE_NATS) {
    console.log('  [NATS] Disabled (use --nats flag to enable)')
    return { getConnected: () => false, close: async () => {} }
  }

  let connected = false
  let nc = null
  const sc = StringCodec()
  let dividePrice = false  // will auto-detect
  let priceDetected = false

  async function start () {
    try {
      console.log(`  [NATS] Connecting to ${NATS_URL}...`)
      nc = await natsConnect({
        servers: NATS_URL,
        user: NATS_USER,
        pass: NATS_PASS,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 5000,
        pingInterval: 30_000,
      })

      connected = true
      store.natsStats.connected = true
      console.log('  [NATS] ✓ Connected! Subscribing to market orders...')

      // Monitor connection status
      ;(async () => {
        for await (const s of nc.status()) {
          if (s.type === 'disconnect' || s.type === 'error') {
            connected = false
            store.natsStats.connected = false
            console.log(`  [NATS] ⚠ Disconnected: ${s.type}`)
          } else if (s.type === 'reconnect') {
            connected = true
            store.natsStats.connected = true
            console.log('  [NATS] ✓ Reconnected!')
          }
        }
      })()

      // Subscribe and process
      const sub = nc.subscribe(NATS_SUBJECT)
      console.log(`  [NATS] ✓ Subscribed to "${NATS_SUBJECT}"`)

      for await (const msg of sub) {
        try {
          const data = JSON.parse(sc.decode(msg.data))

          // Parse orders from message
          let orders
          if (Array.isArray(data.Orders || data.orders)) {
            orders = data.Orders || data.orders
          } else if (data.ItemTypeId || data.itemTypeId) {
            orders = [data]
          } else {
            continue
          }

          // Auto-detect price format from first few messages
          if (!priceDetected && orders.length > 0) {
            const samplePrice = orders[0].UnitPriceSilver ?? orders[0].unitPriceSilver ?? 0
            if (samplePrice > 1_000_000_000) {
              // Prices like 2,500,000,000 = 250,000 silver × 10000 → need divide
              dividePrice = true
              console.log(`  [NATS] Price format: raw (dividing by 10000). Sample: ${samplePrice} → ${Math.round(samplePrice / 10000)}`)
            } else {
              dividePrice = false
              console.log(`  [NATS] Price format: direct. Sample: ${samplePrice}`)
            }
            priceDetected = true
          }

          // Debug: track ALL unique LocationIds to verify city mapping
          if (DEBUG) {
            for (const o of orders) {
              const lid = o.LocationId ?? o.locationId
              if (!store._natsLocationIds) store._natsLocationIds = new Map()
              const count = store._natsLocationIds.get(lid) || 0
              store._natsLocationIds.set(lid, count + 1)
            }
            if (store._natsDebugCount < 10) {
              store._natsDebugCount++
              const sample = orders[0]
              console.log(`  [NATS] #${store._natsDebugCount} LocationId=${sample.LocationId} Item=${sample.ItemTypeId} Price=${sample.UnitPriceSilver} Type=${sample.AuctionType}`)
            }
            // Every 200 messages, dump LocationId distribution
            if (store.natsStats.ordersTotal % 500 === 0) {
              console.log(`  [NATS] LocationId distribution:`)
              for (const [lid, count] of [...store._natsLocationIds.entries()].sort((a, b) => b[1] - a[1])) {
                console.log(`    ${lid} (${getCityName(String(lid))}): ${count} orders`)
              }
            }
          }

          store.ingestNatsOrders(orders, dividePrice)
        } catch (e) {
          // malformed message, skip
        }
      }
    } catch (err) {
      connected = false
      store.natsStats.connected = false
      console.log(`  [NATS] ✗ Connection failed: ${err.message}`)
      console.log(`  [NATS]   Retrying in 10s...`)
      setTimeout(start, 10_000)
    }
  }

  start()
  return {
    getConnected: () => connected,
    close: async () => { if (nc) await nc.drain().catch(() => {}) }
  }
}

// --- Main ---

async function main () {
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║   Albion Online Market Sniffer v4.0                          ║')
  console.log('║   albiondata-client (local) + API + optional NATS → UI       ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  const store = new MarketStore()

  // Market events logging (suppress NATS flood — only log sniffer/API orders in detail)
  store.on('orders', (type, location, orders) => {
    const source = orders[0]?.source || 'sniffer'
    if (source === 'nats') {
      // NATS orders come in constantly, just log summary periodically (handled by stats timer)
      return
    }
    const typeStr = type === 'sell' ? '🟢 SELL' : '🔴 BUY'
    console.log(`  [Market] ${typeStr} ${orders.length} orders from ${location}`)
    if (orders.length > 0) {
      for (const o of orders.slice(0, 3)) {
        const qStr = o.quality > 1 ? ` Q${o.quality}` : ''
        const eStr = o.enchantment > 0 ? `.${o.enchantment}` : ''
        console.log(`    ${o.itemName}${eStr}${qStr} x${o.amount} @ ${o.price.toLocaleString()}`)
      }
      if (orders.length > 3) console.log(`    ... +${orders.length - 3} more`)
    }
  })

  store.on('opportunity', (opportunities) => {
    if (opportunities.length > 0) {
      console.log(`\n  ★ ${opportunities.length} ARBITRAGE OPPORTUNITIES ★`)
      for (const opp of opportunities.slice(0, 5)) {
        const qStr = opp.qualityLevel > 1 ? ` Q${opp.qualityLevel}` : ''
        console.log(
          `    ${opp.itemName}${qStr}: ` +
          `${opp.sourceCity} ${opp.caerleonPrice.toLocaleString()} → BM ${opp.bmPrice.toLocaleString()} = ` +
          `+${opp.profit.toLocaleString()} (${opp.profitPercent.toFixed(1)}%)`
        )
      }
      console.log()
    }
  })

  // 1. Connect to data sources
  const aodpConnection = connectToAODP(store)
  const natsConnection = connectToNATS(store)
  startWSServer(store, aodpConnection, natsConnection)

  // Periodic API refresh — update Caerleon prices every 15s for active BM items
  setInterval(() => {
    if (store.stats.totalBuyOrders > 0) {
      store.refreshApiPrices().catch(e => {
        if (DEBUG) console.log(`  [API] Refresh error: ${e.message}`)
      })
    }
  }, 15000)

  // Stats timer
  setInterval(() => {
    const state = store.getState()
    const nats = store.natsStats
    console.log(
      `  [Stats] Sell: ${state.totalSellOrders} | Buy: ${state.totalBuyOrders} | ` +
      `Opp: ${state.opportunities.length} | ` +
      `AODP: ${aodpConnection.getConnected() ? '✓' : '✗'} | ` +
      `NATS: ${nats.connected ? '✓' : '✗'} (${nats.ordersRelevant}/${nats.ordersTotal} relevant)`
    )
  }, 30000)

  console.log('  📋 Kurulum:')
  console.log('  1. albiondata-client\'ı çalıştır (config.yaml ile WebSocket aktif)')
  console.log('     → albiondata-client.exe -d')
  console.log('  2. Albion Online\'a giriş yap')
  console.log('  3. Black Market\'i aç ve item\'lara göz at')
  console.log('  4. Caerleon fiyatları API\'den otomatik gelir')
  console.log()
  if (ENABLE_NATS) {
    console.log('  🌐 NATS aktif — global market verisi de eklenecek')
  } else {
    console.log('  💡 NATS kapalı. Açmak için: node sniffer.mjs --nats')
  }
  console.log()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n  [EXIT] Shutting down...')
  process.exit(0)
})

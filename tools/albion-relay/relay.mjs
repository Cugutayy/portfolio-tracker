/**
 * Albion NATS Relay — Real-time market data bridge
 * =================================================
 * Connects to Albion Data Project's NATS stream via TCP,
 * filters Caerleon + Black Market orders, and pushes
 * real-time updates to the React app via WebSocket.
 *
 * Usage:
 *   node relay.mjs [--port=9876] [--debug]
 */

import { connect, StringCodec } from 'nats'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'

// ─── Config ────────────────────────────────────────────
const args = process.argv.slice(2)
const PORT = parseInt(args.find(a => a.startsWith('--port='))?.split('=')[1] || '9876', 10)
const DEBUG = args.includes('--debug')
const NATS_URL = 'nats://nats.albion-online-data.com:34222'
const NATS_USER = 'public'
const NATS_PASS = 'thenewalbiondata'
const NATS_SUBJECT = 'marketorders.deduped'
const CLEANUP_INTERVAL = 60_000      // 60s — remove expired orders
const STATS_INTERVAL = 10_000        // 10s — push stats to clients
const PRICE_TTL = 30 * 60 * 1000     // 30min — drop prices older than this even without expiry

// ─── Location ID → City Name ───────────────────────────
const LOCATION_MAP = {
  7:    'Thetford',
  1002: 'Lymhurst',
  2004: 'Bridgewatch',
  3005: 'Martlock',
  4002: 'Fort Sterling',
  3008: 'Caerleon',
  3003: 'Black Market',
}

// We only care about these for Caerleon ↔ BM arbitrage
const RELEVANT_LOCATIONS = new Set([3008, 3003])

// ─── In-Memory Price Store ─────────────────────────────
// Key: "${itemId}|${quality}|${city}"
// Value: { itemId, quality, city, sellMin, sellMinDate, buyMax, buyMaxDate, amount, expiresAt }
const priceStore = new Map()

// ─── Stats ─────────────────────────────────────────────
const stats = {
  natsConnected: false,
  ordersTotal: 0,
  ordersRelevant: 0,
  messagesReceived: 0,
  startTime: Date.now(),
  lastOrderTime: 0,
}

let debugCount = 0

// ─── NATS Connection ───────────────────────────────────
const sc = StringCodec()
let nc = null

async function connectNats() {
  try {
    log('📡 Connecting to NATS...', NATS_URL)
    nc = await connect({
      servers: NATS_URL,
      user: NATS_USER,
      pass: NATS_PASS,
      maxReconnectAttempts: -1,   // infinite reconnect
      reconnectTimeWait: 5000,    // 5s between attempts
      pingInterval: 30_000,
    })

    stats.natsConnected = true
    log('✅ NATS connected!')
    broadcastNatsStatus(true)

    // Monitor connection
    ;(async () => {
      for await (const s of nc.status()) {
        if (s.type === 'disconnect' || s.type === 'error') {
          stats.natsConnected = false
          log('⚠️  NATS disconnected:', s.type, s.data?.toString?.() || '')
          broadcastNatsStatus(false, s.data?.toString?.())
        } else if (s.type === 'reconnect') {
          stats.natsConnected = true
          log('✅ NATS reconnected!')
          broadcastNatsStatus(true)
        }
      }
    })()

    // Subscribe to market orders
    const sub = nc.subscribe(NATS_SUBJECT)
    log(`📥 Subscribed to "${NATS_SUBJECT}"`)

    for await (const msg of sub) {
      try {
        const data = JSON.parse(sc.decode(msg.data))
        processMessage(data)
      } catch (e) {
        // Malformed message, skip
      }
    }
  } catch (err) {
    stats.natsConnected = false
    log('❌ NATS connection failed:', err.message)
    broadcastNatsStatus(false, err.message)
    // Retry in 10s
    setTimeout(connectNats, 10_000)
  }
}

// ─── Message Processing ────────────────────────────────
function processMessage(data) {
  stats.messagesReceived++

  // Debug: log first N raw messages
  if (DEBUG && debugCount < 10) {
    debugCount++
    log('🔍 RAW MESSAGE #' + debugCount + ':', JSON.stringify(data).slice(0, 500))
  }

  // NATS sends individual order objects OR {Orders: [...]} arrays
  // Handle both formats
  let orders
  if (Array.isArray(data.Orders || data.orders)) {
    orders = data.Orders || data.orders
  } else if (data.ItemTypeId || data.itemTypeId) {
    // Single order object (most common from marketorders.deduped)
    orders = [data]
  } else {
    return
  }

  for (const order of orders) {
    stats.ordersTotal++
    const locId = order.LocationId ?? order.locationId
    if (!RELEVANT_LOCATIONS.has(locId)) continue

    stats.ordersRelevant++
    stats.lastOrderTime = Date.now()

    const city = LOCATION_MAP[locId]
    const itemId = order.ItemTypeId || order.itemTypeId || ''
    const quality = order.QualityLevel ?? order.qualityLevel ?? 1
    const price = order.UnitPriceSilver ?? order.unitPriceSilver ?? 0
    const amount = order.Amount ?? order.amount ?? 0
    const auctionType = (order.AuctionType || order.auctionType || '').toLowerCase()
    const expires = order.Expires || order.expires || ''

    if (!itemId || price <= 0) continue

    const key = `${itemId}|${quality}|${city}`
    const existing = priceStore.get(key)
    const now = Date.now()

    let updated = false
    let side = ''

    if (auctionType === 'offer') {
      // Sell order — track lowest
      if (!existing || !existing.sellMin || price < existing.sellMin) {
        const rec = existing || makeRecord(itemId, quality, city)
        rec.sellMin = price
        rec.sellMinDate = now
        rec.expiresAt = expires ? new Date(expires).getTime() : now + PRICE_TTL
        if (amount > 0) rec.sellAmount = amount
        priceStore.set(key, rec)
        updated = true
        side = 'sell'
      }
    } else if (auctionType === 'request') {
      // Buy order — track highest
      if (!existing || !existing.buyMax || price > existing.buyMax) {
        const rec = existing || makeRecord(itemId, quality, city)
        rec.buyMax = price
        rec.buyMaxDate = now
        rec.expiresAt = expires ? new Date(expires).getTime() : now + PRICE_TTL
        if (amount > 0) rec.buyAmount = amount
        priceStore.set(key, rec)
        updated = true
        side = 'buy'
      }
    }

    if (updated) {
      const rec = priceStore.get(key)
      broadcastDelta(key, rec, side)

      if (DEBUG) {
        log(`  ${side.toUpperCase()} ${city} ${itemId} q${quality} → ${price.toLocaleString()} silver (${amount}x)`)
      }
    }
  }
}

function makeRecord(itemId, quality, city) {
  return {
    itemId, quality, city,
    sellMin: 0, sellMinDate: 0,
    buyMax: 0, buyMaxDate: 0,
    sellAmount: 0, buyAmount: 0,
    expiresAt: 0,
  }
}

// ─── Cleanup Expired Entries ───────────────────────────
function cleanupExpired() {
  const now = Date.now()
  let removed = 0
  for (const [key, rec] of priceStore) {
    // Remove if both sides are older than PRICE_TTL
    const sellAge = rec.sellMinDate ? now - rec.sellMinDate : Infinity
    const buyAge = rec.buyMaxDate ? now - rec.buyMaxDate : Infinity
    if (sellAge > PRICE_TTL && buyAge > PRICE_TTL) {
      priceStore.delete(key)
      removed++
    }
  }
  if (removed > 0 && DEBUG) {
    log(`🧹 Cleaned ${removed} expired entries, ${priceStore.size} remaining`)
  }
}

// ─── WebSocket Server ──────────────────────────────────
const clients = new Set()

function broadcastDelta(key, price, side) {
  const msg = JSON.stringify({ type: 'delta', key, price, side })
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

function broadcastNatsStatus(connected, error) {
  const msg = JSON.stringify({ type: 'nats_status', connected, error: error || null })
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

function broadcastStats() {
  const msg = JSON.stringify({
    type: 'stats',
    natsConnected: stats.natsConnected,
    ordersTotal: stats.ordersTotal,
    ordersRelevant: stats.ordersRelevant,
    priceEntries: priceStore.size,
    clients: clients.size,
    uptime: Date.now() - stats.startTime,
    lastOrderTime: stats.lastOrderTime,
  })
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

function sendSnapshot(ws) {
  const prices = {}
  for (const [key, rec] of priceStore) {
    prices[key] = rec
  }
  ws.send(JSON.stringify({
    type: 'snapshot',
    prices,
    stats: {
      natsConnected: stats.natsConnected,
      ordersTotal: stats.ordersTotal,
      ordersRelevant: stats.ordersRelevant,
      priceEntries: priceStore.size,
      uptime: Date.now() - stats.startTime,
      lastOrderTime: stats.lastOrderTime,
    },
  }))
}

// ─── HTTP Server (same port) ───────────────────────────
const httpServer = createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Content-Type', 'application/json')

  if (req.url === '/prices' || req.url === '/prices/') {
    const prices = {}
    for (const [key, rec] of priceStore) {
      prices[key] = rec
    }
    res.writeHead(200)
    res.end(JSON.stringify({ prices, count: priceStore.size }))
  } else if (req.url === '/stats' || req.url === '/stats/') {
    res.writeHead(200)
    res.end(JSON.stringify({
      natsConnected: stats.natsConnected,
      ordersTotal: stats.ordersTotal,
      ordersRelevant: stats.ordersRelevant,
      messagesReceived: stats.messagesReceived,
      priceEntries: priceStore.size,
      clients: clients.size,
      uptime: Date.now() - stats.startTime,
      lastOrderTime: stats.lastOrderTime,
    }))
  } else {
    res.writeHead(200)
    res.end(JSON.stringify({
      name: 'albion-nats-relay',
      endpoints: ['/prices', '/stats'],
      ws: `ws://localhost:${PORT}`,
    }))
  }
})

// ─── WebSocket on same HTTP server ─────────────────────
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws) => {
  clients.add(ws)
  log(`🔌 Client connected (${clients.size} total)`)

  // Send current state immediately
  sendSnapshot(ws)

  ws.on('close', () => {
    clients.delete(ws)
    log(`🔌 Client disconnected (${clients.size} total)`)
  })

  ws.on('error', () => {
    clients.delete(ws)
  })
})

// ─── Timers ────────────────────────────────────────────
setInterval(cleanupExpired, CLEANUP_INTERVAL)
setInterval(broadcastStats, STATS_INTERVAL)

// ─── Status logging ────────────────────────────────────
setInterval(() => {
  const upMin = Math.round((Date.now() - stats.startTime) / 60_000)
  const ago = stats.lastOrderTime ? Math.round((Date.now() - stats.lastOrderTime) / 1000) + 's ago' : 'never'
  log(
    `📊 [${upMin}m] NATS:${stats.natsConnected ? '✅' : '❌'} | ` +
    `Orders: ${stats.ordersRelevant}/${stats.ordersTotal} relevant | ` +
    `Prices: ${priceStore.size} | Clients: ${clients.size} | Last: ${ago}`
  )
}, 30_000)

// ─── Start ─────────────────────────────────────────────
function log(...args) {
  console.log(`[${new Date().toLocaleTimeString()}]`, ...args)
}

httpServer.listen(PORT, () => {
  log(`🚀 Albion NATS Relay running`)
  log(`   WebSocket: ws://localhost:${PORT}`)
  log(`   HTTP:      http://localhost:${PORT}/prices`)
  log(`   Stats:     http://localhost:${PORT}/stats`)
  log(`   Debug:     ${DEBUG ? 'ON' : 'OFF'}`)
  log('')
  connectNats()
})

// Graceful shutdown
process.on('SIGINT', async () => {
  log('👋 Shutting down...')
  if (nc) await nc.drain().catch(() => {})
  wss.close()
  httpServer.close()
  process.exit(0)
})

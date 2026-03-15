/**
 * Sniffer Client
 * ==============
 * WebSocket client for the local Albion packet sniffer (tools/albion-sniffer).
 * The sniffer captures YOUR OWN market browsing data via Npcap/Photon protocol.
 *
 * Unlike NATS crowd-sourced data, this is 100% reliable because it comes from
 * your own game client — you see the same data the sniffer captures.
 *
 * Messages from sniffer:
 *   { type: 'state', data: SnifferState }        — full state update (every 5s)
 *   { type: 'orders', data: OrderBatch }          — new orders captured
 *   { type: 'opportunities', data: Opportunity[] } — arbitrage recalculated
 *   { type: 'cleared' }                           — data cleared
 */

import { RELAY_WS_URL } from './constants'

// ─── Types ─────────────────────────────────────────────

export interface SnifferOrder {
  itemId: string
  quality: number
  price: number
  amount: number
  locationId: string
}

export interface SnifferOpportunity {
  itemId: string
  qualityLevel: number
  caerleonPrice: number
  caerleonAmount: number
  caerleonAge: number       // ms since capture
  bmPrice: number
  bmAmount: number
  bmAge: number             // ms since capture
  profit: number
  profitPercent: number
  totalProfit: number
  maxAmount: number
  taxAmount: number
}

export interface SnifferState {
  currentLocation: string | null
  locationName: string
  caerleonSellOrders: number
  bmBuyOrders: number
  totalSellOrders: number
  totalBuyOrders: number
  scanPages: number
  lastUpdate: string | null
  opportunities: SnifferOpportunity[]
}

export interface OrderBatch {
  orderType: 'sell' | 'buy'
  locationId: string
  locationName: string
  count: number
  items: SnifferOrder[]
}

export type SnifferStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

type StatusListener = (status: SnifferStatus) => void
type StateListener = (state: SnifferState) => void
type OrdersListener = (batch: OrderBatch) => void

// ─── Client Class ──────────────────────────────────────

export class SnifferClient {
  private url: string
  private ws: WebSocket | null = null
  private status: SnifferStatus = 'disconnected'
  private state: SnifferState | null = null
  private shouldConnect = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000

  private statusListeners = new Set<StatusListener>()
  private stateListeners = new Set<StateListener>()
  private ordersListeners = new Set<OrdersListener>()

  // Feed log: recent order batches for display
  private feedLog: { time: number; type: string; location: string; count: number; items: SnifferOrder[] }[] = []

  constructor(url?: string) {
    this.url = url || RELAY_WS_URL
  }

  connect(): void {
    this.shouldConnect = true
    this.doConnect()
  }

  disconnect(): void {
    this.shouldConnect = false
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    if (this.ws) { this.ws.close(); this.ws = null }
    this.setStatus('disconnected')
  }

  onStatusChange(fn: StatusListener): () => void {
    this.statusListeners.add(fn)
    return () => { this.statusListeners.delete(fn) }
  }

  onStateChange(fn: StateListener): () => void {
    this.stateListeners.add(fn)
    return () => { this.stateListeners.delete(fn) }
  }

  onOrders(fn: OrdersListener): () => void {
    this.ordersListeners.add(fn)
    return () => { this.ordersListeners.delete(fn) }
  }

  getStatus(): SnifferStatus { return this.status }
  getState(): SnifferState | null { return this.state }
  getFeedLog() { return this.feedLog }

  requestClear(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'clear' }))
    }
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
      this.reconnectDelay = 1000
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string)
        this.handleMessage(msg)
      } catch { /* ignore */ }
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

    this.ws.onerror = () => { /* onclose handles reconnect */ }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.shouldConnect && !this.ws) this.doConnect()
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000)
  }

  private setStatus(s: SnifferStatus): void {
    if (this.status === s) return
    this.status = s
    for (const fn of this.statusListeners) fn(s)
  }

  private handleMessage(msg: { type: string; data?: any }): void {
    switch (msg.type) {
      case 'state':
        this.state = msg.data as SnifferState
        for (const fn of this.stateListeners) fn(this.state)
        break

      case 'orders': {
        const batch = msg.data as OrderBatch
        // Add to feed log
        this.feedLog.unshift({
          time: Date.now(),
          type: batch.orderType,
          location: batch.locationName,
          count: batch.count,
          items: batch.items,
        })
        if (this.feedLog.length > 50) this.feedLog.length = 50
        for (const fn of this.ordersListeners) fn(batch)
        break
      }

      case 'opportunities':
        // Opportunities come as part of state updates
        if (this.state) {
          this.state.opportunities = msg.data as SnifferOpportunity[]
          for (const fn of this.stateListeners) fn(this.state)
        }
        break

      case 'cleared':
        this.state = null
        this.feedLog = []
        for (const fn of this.stateListeners) fn(this.state!)
        break
    }
  }
}

// ─── Singleton ─────────────────────────────────────────

export const snifferClient = new SnifferClient()

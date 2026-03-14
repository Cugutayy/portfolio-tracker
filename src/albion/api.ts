/**
 * Albion Online Data Project API Client
 * ======================================
 * - Rate limiting (3 req/s, 30 req/min)
 * - In-memory cache with TTL
 * - Retry with exponential backoff
 * - URL-length-aware batching
 */

import type { AlbionPriceEntry, AlbionHistoryResponse, City } from './types'
import { API_BASE, MAX_URL_LENGTH, PRICE_CACHE_TTL } from './constants'

// ═══════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════
interface CacheEntry<T> { data: T; timestamp: number; ttl: number }

class ApiCache {
  private store = new Map<string, CacheEntry<any>>()
  get<T>(key: string): T | null {
    const e = this.store.get(key)
    if (!e) return null
    if (Date.now() - e.timestamp > e.ttl) { this.store.delete(key); return null }
    return e.data as T
  }
  set<T>(key: string, data: T, ttl: number) {
    this.store.set(key, { data, timestamp: Date.now(), ttl })
  }
  clear() { this.store.clear() }
}

// ═══════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════
class RateLimiter {
  private ts: number[] = []
  private readonly perSec = 3
  private readonly perMin = 30

  async wait(): Promise<void> {
    const now = Date.now()
    this.ts = this.ts.filter(t => now - t < 60000)
    const lastSec = this.ts.filter(t => now - t < 1000).length
    if (lastSec >= this.perSec) {
      const w = 1000 - (now - this.ts[this.ts.length - this.perSec])
      await new Promise(r => setTimeout(r, w + 50))
    }
    if (this.ts.length >= this.perMin) {
      const w = 60000 - (now - this.ts[0])
      await new Promise(r => setTimeout(r, w + 100))
    }
    this.ts.push(Date.now())
  }
}

// ═══════════════════════════════════════════
// CLIENT
// ═══════════════════════════════════════════
class AlbionDataClient {
  private cache = new ApiCache()
  private rl = new RateLimiter()
  requestCount = 0

  /** Fetch prices for a single batch of items */
  private async fetchBatch(
    itemIds: string[],
    locations: string,
    qualities: string,
  ): Promise<AlbionPriceEntry[]> {
    const url = `${API_BASE}/api/v2/stats/prices/${itemIds.join(',')}?locations=${locations}&qualities=${qualities}`
    const cached = this.cache.get<AlbionPriceEntry[]>(url)
    if (cached) return cached

    await this.rl.wait()
    let lastErr: Error | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        this.requestCount++
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) {
          if (res.status === 429 || res.status >= 500) {
            await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 2000))
            continue
          }
          throw new Error(`HTTP ${res.status}`)
        }
        const data: AlbionPriceEntry[] = await res.json()
        this.cache.set(url, data, PRICE_CACHE_TTL)
        return data
      } catch (err: any) {
        lastErr = err
        if (attempt < 2) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
      }
    }
    throw lastErr || new Error('Albion API error')
  }

  /**
   * Split item IDs into batches that fit the URL length limit,
   * then fetch all batches with progress reporting.
   */
  async fetchAllPrices(
    itemIds: string[],
    locations: City[],
    qualities: number[] = [1],
    onProgress?: (done: number, total: number) => void,
  ): Promise<AlbionPriceEntry[]> {
    const locStr = locations.map(c => encodeURIComponent(c)).join(',')
    const qualStr = qualities.join(',')
    const overhead = `${API_BASE}/api/v2/stats/prices/?locations=${locStr}&qualities=${qualStr}`.length

    // Build batches respecting URL length
    const batches: string[][] = []
    let current: string[] = []
    let currentLen = overhead
    for (const id of itemIds) {
      const add = (current.length ? 1 : 0) + id.length // comma + id
      if (currentLen + add > MAX_URL_LENGTH && current.length) {
        batches.push(current)
        current = [id]
        currentLen = overhead + id.length
      } else {
        current.push(id)
        currentLen += add
      }
    }
    if (current.length) batches.push(current)

    const results: AlbionPriceEntry[] = []
    for (let i = 0; i < batches.length; i++) {
      const data = await this.fetchBatch(batches[i], locStr, qualStr)
      results.push(...data)
      onProgress?.(i + 1, batches.length)
    }
    return results
  }

  /**
   * Fetch 7-day daily history for specific items.
   * Returns daily volume, avg price, etc.
   * Used to validate top opportunities with real trade data.
   */
  async fetchItemHistory(
    itemIds: string[],
    locations: City[],
  ): Promise<AlbionHistoryResponse[]> {
    const locStr = locations.map(c => encodeURIComponent(c)).join(',')
    const date = new Date()
    date.setDate(date.getDate() - 7)
    const dateStr = date.toISOString().split('T')[0]
    const url = `${API_BASE}/api/v2/stats/history/${itemIds.join(',')}?locations=${locStr}&date=${dateStr}&time-scale=24`

    const cached = this.cache.get<AlbionHistoryResponse[]>(url)
    if (cached) return cached

    await this.rl.wait()
    this.requestCount++
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`History API HTTP ${res.status}`)
    const data: AlbionHistoryResponse[] = await res.json()
    this.cache.set(url, data, PRICE_CACHE_TTL * 2) // cache longer
    return data
  }

  clearCache() { this.cache.clear() }
}

export const albionApi = new AlbionDataClient()

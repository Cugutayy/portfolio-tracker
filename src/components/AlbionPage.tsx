import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { albionApi } from '../albion/api'
import { loadItems, displayName, gameSearchName } from '../albion/items'
import { validatePrices } from '../albion/validation'
import { findOpportunities } from '../albion/arbitrage'
import {
  BM_LOCATIONS, CITY_COLORS, CATEGORY_LABELS,
  DEFAULT_FILTERS, BM_REFRESH_INTERVAL, REALTIME_DEBOUNCE_MS,
  QUALITY_NAMES, QUALITY_COLORS, QUALITY_SHORT,
} from '../albion/constants'
import {
  albionRealtime, mergeWithRealtime, realtimeToValidated, getBmBuyRadar,
  type RealtimeStatus, type RealtimeStats, type RealtimeOrder, type DataMode, type BmBuyOrder,
} from '../albion/realtime'
import {
  snifferClient,
  type SnifferStatus, type SnifferState, type SnifferOpportunity, type OrderBatch,
} from '../albion/sniffer'
import type {
  ScanState, FilterState, ArbitrageOpportunity, ValidatedPrice,
  TaxMode, City, SortField, AlbionItem, TradeStrategy, VolumeData,
} from '../albion/types'

// ═══════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
@keyframes aoSlideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes aoPulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes aoSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes aoPanelAppear{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes aoSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes aoProgress{from{background-position:40px 0}to{background-position:0 0}}
@keyframes aoPulseDot{0%,100%{box-shadow:0 0 4px currentColor}50%{box-shadow:0 0 14px currentColor,0 0 6px currentColor}}
.ao{min-height:100vh;color:#e0e0e8;font-family:'JetBrains Mono',monospace;position:relative;overflow-y:auto;overflow-x:hidden}
.ao{background:#0a0a10}
.ao::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse at 50% -10%,rgba(212,168,67,.06) 0%,transparent 55%),radial-gradient(ellipse at 0% 50%,rgba(212,168,67,.025) 0%,transparent 40%),radial-gradient(ellipse at 100% 50%,rgba(212,168,67,.025) 0%,transparent 40%)}
.ao-led{position:fixed;top:0;left:0;right:0;height:2px;z-index:100;background:linear-gradient(90deg,transparent 5%,#d4a843 30%,#f0c860 50%,#d4a843 70%,transparent 95%);opacity:.5;background-size:200% 100%;animation:aoSweep 6s ease-in-out infinite}
.ao *{box-sizing:border-box}
.aop{background:rgba(10,10,22,.65);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px 16px;position:relative;z-index:1;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 8px 32px rgba(0,0,0,.25);animation:aoPanelAppear .4s ease both;overflow:hidden}
.aop::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,168,67,.25),rgba(255,255,255,.08),rgba(212,168,67,.25),transparent)}
.aot{font-family:'Outfit',sans-serif;font-size:8.5px;color:#777;letter-spacing:.14em;font-weight:700;margin-bottom:8px;text-transform:uppercase;display:flex;align-items:center;gap:6px}
.aot::before{content:'';width:3px;height:10px;border-radius:2px;background:linear-gradient(180deg,#d4a843,#a07828);flex-shrink:0;box-shadow:0 0 6px rgba(212,168,67,.4)}
.aob{border:none;border-radius:8px;padding:5px 14px;font-size:10px;color:#fff;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:600;transition:all .2s ease;letter-spacing:.03em;position:relative;overflow:hidden}
.aob::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.08),transparent);pointer-events:none;border-radius:8px}
.aob:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.3)}
.aob:disabled{opacity:.4;cursor:not-allowed;transform:none!important;box-shadow:none!important}
.ao-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.025);transition:all .2s ease;border-radius:4px;font-size:11px}
.ao-row:hover{background:rgba(212,168,67,.04);border-color:rgba(212,168,67,.08)}
.ao-input{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:4px 8px;color:#e0e0e8;font-family:'JetBrains Mono',monospace;font-size:10px;outline:none;transition:border-color .2s}
.ao-input:focus{border-color:rgba(212,168,67,.4)}
.ao-select{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:4px 8px;color:#e0e0e8;font-family:'JetBrains Mono',monospace;font-size:10px;outline:none;cursor:pointer}
.ao-select option{background:#1a1a2e;color:#e0e0e8}
.ao-progress{height:4px;border-radius:2px;background:rgba(255,255,255,.05);overflow:hidden;position:relative}
.ao-progress-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,#d4a843,#f0c860);transition:width .3s ease;background-size:40px 4px}
.ao-progress-fill.active{background-image:repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(255,255,255,.15) 8px,rgba(255,255,255,.15) 16px);animation:aoProgress 1s linear infinite}
.ao-badge{padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;letter-spacing:.04em}
.ao-fresh{color:#4caf50;background:rgba(76,175,80,.1)}
.ao-recent{color:#ff9800;background:rgba(255,152,0,.1)}
.ao-stale{color:#f44336;background:rgba(244,67,54,.1)}
.ao-th{font-family:'Outfit',sans-serif;font-size:8px;color:#666;letter-spacing:.12em;font-weight:600;text-transform:uppercase;padding:6px 8px;cursor:pointer;user-select:none;transition:color .2s;white-space:nowrap}
.ao-th:hover{color:#d4a843}
.ao-th.active{color:#d4a843}
.ao-city{padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;border:1px solid rgba(255,255,255,.08)}
.ao-check{width:14px;height:14px;accent-color:#d4a843;cursor:pointer}
.ao-spinner{width:14px;height:14px;border:2px solid rgba(212,168,67,.2);border-top-color:#d4a843;border-radius:50%;animation:aoSpin .6s linear infinite;display:inline-block}
/* Light theme */
.ao.ao-light{background:#f0ece5;color:#1c1c18}
.ao.ao-light::before{background:radial-gradient(ellipse at 50% -10%,rgba(212,168,67,.04) 0%,transparent 55%)}
.ao.ao-light .aop{background:rgba(255,255,255,.75);border-color:rgba(0,0,0,.08);box-shadow:0 2px 12px rgba(0,0,0,.06)}
.ao.ao-light .aop::before{background:linear-gradient(90deg,transparent,rgba(212,168,67,.15),rgba(0,0,0,.04),rgba(212,168,67,.15),transparent)}
.ao.ao-light .aot{color:#888}
.ao.ao-light .ao-row{border-color:rgba(0,0,0,.04);color:#1c1c18}
.ao.ao-light .ao-row:hover{background:rgba(212,168,67,.06)}
.ao.ao-light .ao-th{color:#888}
.ao.ao-light .ao-th:hover,.ao.ao-light .ao-th.active{color:#a07828}
.ao.ao-light .ao-input{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.1);color:#1c1c18}
.ao.ao-light .ao-select{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.1);color:#1c1c18}
.ao.ao-light .ao-select option{background:#fff;color:#1c1c18}
.ao.ao-light .ao-progress{background:rgba(0,0,0,.06)}
.ao.ao-light .ao-led{opacity:.3}
.ao.ao-light .ao-city{border-color:rgba(0,0,0,.1)}
.ao-strategy{padding:2px 6px;border-radius:4px;font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.ao-strategy-instant{color:#4caf50;background:rgba(76,175,80,.1);border:1px solid rgba(76,175,80,.15)}
.ao-strategy-sell{color:#2196f3;background:rgba(33,150,243,.1);border:1px solid rgba(33,150,243,.15)}
.ao-risk-safe{color:#4caf50}.ao-risk-medium{color:#ff9800}.ao-risk-dangerous{color:#f44336}
.ao-guide-card{background:rgba(212,168,67,.04);border:1px solid rgba(212,168,67,.12);border-radius:10px;padding:12px 14px;margin-bottom:8px;position:relative;transition:all .2s}
.ao-guide-card:hover{background:rgba(212,168,67,.07);border-color:rgba(212,168,67,.2)}
.ao-guide-step{display:flex;align-items:flex-start;gap:8px;margin:6px 0;font-size:10.5px;line-height:1.5}
.ao-guide-num{width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#d4a843,#a07828);color:#fff;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.ao-guide-profit{font-size:16px;font-weight:800;font-family:'Outfit',sans-serif}
.ao-guide-ev{font-size:11px;font-weight:600;font-family:'Outfit',sans-serif}
.ao-guide-tag{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:4px;font-size:8px;font-weight:600;letter-spacing:.05em}
.ao.ao-light .ao-guide-card{background:rgba(212,168,67,.06);border-color:rgba(212,168,67,.15)}
.ao.ao-light .ao-guide-card:hover{background:rgba(212,168,67,.1)}
@keyframes aoLivePulse{0%,100%{opacity:1;box-shadow:0 0 4px #4caf50}50%{opacity:.6;box-shadow:0 0 12px #4caf50,0 0 4px #4caf50}}
.ao-live-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;display:inline-block}
.ao-live-feed{max-height:200px;overflow-y:auto;font-size:10px;border-top:1px solid rgba(255,255,255,.04)}
.ao-live-feed::-webkit-scrollbar{width:4px}.ao-live-feed::-webkit-scrollbar-thumb{background:rgba(212,168,67,.3);border-radius:2px}
.ao-mode-btn{border:none;border-radius:6px;padding:4px 10px;font-size:9px;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:600;transition:all .2s;letter-spacing:.03em}
.ao-mode-btn:disabled{opacity:.3;cursor:not-allowed}
.ao-canli-badge{display:inline-flex;align-items:center;gap:3px;padding:1px 5px;border-radius:3px;font-size:7px;font-weight:700;color:#4caf50;background:rgba(76,175,80,.1);border:1px solid rgba(76,175,80,.15);letter-spacing:.06em}
@media(max-width:800px){.ao-filters{flex-direction:column!important}.ao-table-wrap{overflow-x:auto}}
`

const PAGE_SIZE = 50
const GOLD = '#d4a843'

function fmtSilver(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// BM category from item ID — helps user find the right tab in Black Market
function bmCategory(itemId: string): string {
  const id = itemId.replace(/@\d+$/, '').toUpperCase()
  if (id.includes('_HEAD_')) return 'Kafa'
  if (id.includes('_ARMOR_')) return 'Zırh'
  if (id.includes('_SHOES_')) return 'Ayak'
  if (id.includes('_CAPE') || id.includes('CAPEITEM')) return 'Pelerin'
  if (id.includes('_BAG')) return 'Çanta'
  if (id.includes('_MAIN_') || id.includes('_2H_') || id.includes('SWORD') || id.includes('AXE') || id.includes('MACE') || id.includes('HAMMER') || id.includes('SPEAR') || id.includes('HALBERD') || id.includes('STAFF') || id.includes('BOW') || id.includes('CROSSBOW') || id.includes('DAGGER') || id.includes('QUARTERSTAFF') || id.includes('CURSE') || id.includes('FIRE') || id.includes('FROST') || id.includes('ARCANE') || id.includes('HOLY') || id.includes('NATURE')) return 'Silah'
  if (id.includes('_OFF_')) return 'Off-hand'
  if (id.includes('_MOUNT_')) return 'Binek'
  if (id.includes('_MEAL_') || id.includes('_POTION_')) return 'Tüketim'
  return ''
}

/** Clipboard copy that works on HTTP (non-HTTPS) too */
function copyText(text: string): void {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  } catch { /* ignore */ }
  navigator.clipboard?.writeText(text).catch(() => {})
}

function CityBadge({ city }: { city: string }) {
  const c = CITY_COLORS[city] || '#888'
  return (
    <span className="ao-city" style={{ color: c, borderColor: c + '33', background: c + '11' }}>
      {city === 'Fort Sterling' ? 'Ft.Sterling' : city === 'Black Market' ? 'BM' : city}
    </span>
  )
}

function FreshBadge({ f }: { f: string }) {
  return <span className={`ao-badge ao-${f}`}>{f}</span>
}

function QualityBadge({ q }: { q: number }) {
  const name = QUALITY_SHORT[q] || `Q${q}`
  const color = QUALITY_COLORS[q] || '#888'
  const fullName = QUALITY_NAMES[q] || `Quality ${q}`
  return (
    <span title={fullName} style={{
      padding: '1px 4px', borderRadius: 3, fontSize: 8, fontWeight: 700,
      color, background: color + '15', border: `1px solid ${color}25`,
      letterSpacing: '.04em', cursor: 'help',
    }}>
      {name}
    </span>
  )
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export function AlbionPage({ dark = true, setDark }: { dark?: boolean; setDark?: (d: boolean) => void }) {
  // Scan state
  const [scan, setScan] = useState<ScanState>({
    status: 'idle', progress: 0, batchesDone: 0, batchesTotal: 0,
    itemsTotal: 0, opportunities: [], lastScanTime: null, error: null,
  })
  const [items, setItems] = useState<AlbionItem[]>([])
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [taxMode, setTaxMode] = useState<TaxMode>('premium')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [strategyFilter, setStrategyFilter] = useState<TradeStrategy | 'all'>('all')
  const [showAllBm, setShowAllBm] = useState(false)
  const [bmFreshOnly, setBmFreshOnly] = useState(true) // Only show fresh BM data by default
  const [maxDataAge, setMaxDataAge] = useState<number>(30) // Max data age in minutes for main table (0=show all)
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanningRef = useRef(false)
  const validatedPricesRef = useRef<ValidatedPrice[]>([])
  const bmItemIdsRef = useRef<Set<string>>(new Set())
  const [bmRefreshing, setBmRefreshing] = useState(false)
  const [fullScanCount, setFullScanCount] = useState(0)
  const isDark = dark !== false

  // ── Real-time NATS state ──
  const [dataMode, setDataMode] = useState<DataMode>('api-only')
  const [rtStatus, setRtStatus] = useState<RealtimeStatus>('disconnected')
  const [rtStats, setRtStats] = useState<RealtimeStats>({
    ordersReceived: 0, lastOrderTime: null, connectedSince: null,
    natsConnected: false, priceEntries: 0, relayUptime: 0, ordersTotal: 0, ordersRelevant: 0,
  })
  const [recentOrders, setRecentOrders] = useState<RealtimeOrder[]>([])
  const [showLiveFeed, setShowLiveFeed] = useState(false)
  const [bmRadar, setBmRadar] = useState<BmBuyOrder[]>([])
  const [bmRadarSort, setBmRadarSort] = useState<'price' | 'profit' | 'age'>('price')

  // ── Sniffer state ──
  const [snifferStatus, setSnifferStatus] = useState<SnifferStatus>('disconnected')
  const [snifferState, setSnifferState] = useState<SnifferState | null>(null)
  const [snifferFeed, setSnifferFeed] = useState<{ time: number; type: string; location: string; count: number }[]>([])
  const [showSnifferFeed, setShowSnifferFeed] = useState(true)
  const [snifferMinProfit, setSnifferMinProfit] = useState(0)
  const [snifferMinPct, setSnifferMinPct] = useState(0)
  const [snifferSearch, setSnifferSearch] = useState('')

  // Live clock for data freshness display
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Real-time connection lifecycle ──
  useEffect(() => {
    const unsub1 = albionRealtime.onStatusChange((status) => {
      setRtStatus(status)
      if (status === 'connected') setDataMode(prev => prev === 'api-only' ? 'hybrid' : prev)
      if (status === 'disconnected' || status === 'error') setDataMode('api-only')
    })
    const unsub2 = albionRealtime.onOrder((order) => {
      setRecentOrders(prev => [order, ...prev].slice(0, 50))
    })
    const unsub3 = albionRealtime.onStatsChange((s) => {
      setRtStats(s)
      // Update BM radar on stats changes too (fires every 10s)
      const rtPrices = albionRealtime.getPrices()
      if (rtPrices.size > 0) setBmRadar(getBmBuyRadar(rtPrices))
    })
    albionRealtime.connect()
    return () => { unsub1(); unsub2(); unsub3(); albionRealtime.disconnect() }
  }, [])

  // ── Sniffer connection lifecycle ──
  useEffect(() => {
    const unsub1 = snifferClient.onStatusChange((s) => setSnifferStatus(s))
    const unsub2 = snifferClient.onStateChange((s) => setSnifferState(s ? { ...s } : null))
    const unsub3 = snifferClient.onOrders((batch) => {
      setSnifferFeed(prev => [{ time: Date.now(), type: batch.orderType, location: batch.locationName, count: batch.count }, ...prev].slice(0, 30))
    })
    snifferClient.connect()
    return () => { unsub1(); unsub2(); unsub3(); snifferClient.disconnect() }
  }, [])

  // ── Real-time debounced recalculation ──
  useEffect(() => {
    if (dataMode === 'api-only') return
    if (!items.length) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const unsub = albionRealtime.onPriceUpdate(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const rtPrices = albionRealtime.getPrices()
        // Update BM radar from NATS data
        setBmRadar(getBmBuyRadar(rtPrices))
        let merged
        if (dataMode === 'hybrid' && validatedPricesRef.current.length) {
          merged = mergeWithRealtime(validatedPricesRef.current, rtPrices)
        } else {
          merged = [...rtPrices.values()].map(realtimeToValidated)
        }
        if (merged.length === 0) return
        const opps = findOpportunities(merged, items, taxMode)
        setScan(s => ({ ...s, opportunities: opps, lastScanTime: new Date(), status: s.status === 'idle' ? 'complete' : s.status }))
      }, REALTIME_DEBOUNCE_MS)
    })
    return () => { unsub(); if (timer) clearTimeout(timer) }
  }, [dataMode, items, taxMode])

  // ── Scan logic ──
  const runScan = useCallback(async () => {
    if (scanningRef.current) return
    scanningRef.current = true
    setScan(s => ({ ...s, status: 'loading-items', progress: 0, error: null }))

    try {
      // 1. Load items
      let itemList = items
      if (!itemList.length) {
        itemList = await loadItems()
        setItems(itemList)
      }
      const ids = itemList.map(i => i.uniqueName)
      setScan(s => ({ ...s, status: 'scanning', itemsTotal: ids.length }))

      // 2. Fetch prices — focused on Caerleon + Black Market only (fastest, zero risk)
      const raw = await albionApi.fetchAllPrices(ids, BM_LOCATIONS, [1], (done, total) => {
        setScan(s => ({ ...s, batchesDone: done, batchesTotal: total, progress: Math.round((done / total) * 90) }))
      })

      // 3. Validate
      setScan(s => ({ ...s, status: 'analyzing', progress: 95 }))
      const valid = validatePrices(raw)

      // 4. Find opportunities
      const opps = findOpportunities(valid, itemList, taxMode)

      // Store for BM quick refresh
      validatedPricesRef.current = valid
      bmItemIdsRef.current = new Set(
        opps.filter(o => o.isBlackMarket && o.strategy === 'instant-sell').map(o => o.itemId)
      )
      setFullScanCount(c => c + 1)

      setScan({
        status: 'complete', progress: 100, batchesDone: 0, batchesTotal: 0,
        itemsTotal: ids.length, opportunities: opps,
        lastScanTime: new Date(), error: null,
      })
      setPage(1)
    } catch (err: any) {
      setScan(s => ({ ...s, status: 'error', error: err.message || 'Scan failed' }))
    } finally {
      scanningRef.current = false
    }
  }, [items, taxMode])

  // Re-run arbitrage when tax mode changes (if we have data)
  useEffect(() => {
    if (scan.status !== 'complete' || !validatedPricesRef.current.length) return
    const opps = findOpportunities(validatedPricesRef.current, items, taxMode)
    setScan(s => ({ ...s, opportunities: opps }))
  }, [taxMode, items])

  // ── BM Quick Refresh — only re-fetch BM items (~3-5 batches vs 54) ──
  const runBmRefresh = useCallback(async () => {
    if (scanningRef.current) return
    if (!bmItemIdsRef.current.size || !validatedPricesRef.current.length) {
      return runScan() // No previous data, do full scan
    }
    scanningRef.current = true
    setBmRefreshing(true)

    try {
      const bmIds = [...bmItemIdsRef.current]
      // Clear cached API responses for these items so we get fresh data
      albionApi.clearItemCache(bmIds)
      // Fetch only BM items for Caerleon + Black Market (~1-2 batches)
      const raw = await albionApi.fetchAllPrices(bmIds, BM_LOCATIONS, [1])
      const newValid = validatePrices(raw)

      // Merge: replace matching entries, keep everything else
      const newMap = new Map<string, ValidatedPrice>()
      for (const p of newValid) {
        newMap.set(`${p.itemId}|${p.city}|${p.quality}`, p)
      }
      const merged: ValidatedPrice[] = []
      const seen = new Set<string>()
      for (const [key, p] of newMap) {
        merged.push(p)
        seen.add(key)
      }
      for (const p of validatedPricesRef.current) {
        const key = `${p.itemId}|${p.city}|${p.quality}`
        if (!seen.has(key)) {
          merged.push(p)
          seen.add(key)
        }
      }
      validatedPricesRef.current = merged

      const opps = findOpportunities(merged, items, taxMode)
      bmItemIdsRef.current = new Set(
        opps.filter(o => o.isBlackMarket && o.strategy === 'instant-sell').map(o => o.itemId)
      )

      setScan(s => ({
        ...s,
        opportunities: opps,
        lastScanTime: new Date(),
      }))
    } catch (err) {
      console.error('BM refresh failed:', err)
    } finally {
      scanningRef.current = false
      setBmRefreshing(false)
    }
  }, [items, taxMode, runScan])

  // Auto-refresh — BM quick refresh every 30s after first scan
  useEffect(() => {
    if (autoRefresh && scan.status === 'complete') {
      autoRef.current = setInterval(() => { runBmRefresh() }, BM_REFRESH_INTERVAL)
      return () => { if (autoRef.current) clearInterval(autoRef.current) }
    } else {
      if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null }
    }
  }, [autoRefresh, scan.status, runBmRefresh])

  // ── Filter + Sort + Paginate ──
  const filtered = useMemo(() => {
    const nowMs = Date.now()
    const maxAgeMs = maxDataAge > 0 ? maxDataAge * 60 * 1000 : Infinity
    let arr = scan.opportunities.filter(o => {
      if (o.netProfit < filters.minProfit) return false
      if (o.profitPercent < filters.minProfitPercent) return false
      if (filters.category !== 'all' && o.category !== filters.category) return false
      if (o.tier < filters.minTier || o.tier > filters.maxTier) return false
      if (!filters.showStale && o.freshness === 'stale') return false
      if (filters.search && !o.displayName.toLowerCase().includes(filters.search.toLowerCase()) && !o.itemId.toLowerCase().includes(filters.search.toLowerCase())) return false
      // Data age filter: BOTH sides must be fresher than maxDataAge
      if (maxAgeMs < Infinity) {
        const srcAge = nowMs - o.sourceDate.getTime()
        const dstAge = nowMs - o.destDate.getTime()
        if (srcAge > maxAgeMs || dstAge > maxAgeMs) return false
      }
      return true
    })

    const dir = filters.sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const key = filters.sortBy
      if (key === 'netProfit') return (a.netProfit - b.netProfit) * dir
      if (key === 'profitPercent') return (a.profitPercent - b.profitPercent) * dir
      if (key === 'sourcePrice') return (a.sourcePrice - b.sourcePrice) * dir
      if (key === 'tier') return (a.tier - b.tier) * dir
      if (key === 'displayName') return a.displayName.localeCompare(b.displayName) * dir
      if (key === 'sourceCity') return a.sourceCity.localeCompare(b.sourceCity) * dir
      if (key === 'destCity') return a.destCity.localeCompare(b.destCity) * dir
      if (key === 'expectedValue') return (a.expectedValue - b.expectedValue) * dir
      if (key === 'profitPerHour') return (a.profitPerHour - b.profitPerHour) * dir
      if (key === 'freshness') {
        const order = { fresh: 0, recent: 1, stale: 2 }
        return (order[a.freshness] - order[b.freshness]) * dir
      }
      return 0
    })
    return arr
  }, [scan.opportunities, filters, strategyFilter, maxDataAge, now])

  // Total including stale (for showing hidden count)
  const totalOppsBeforeAge = useMemo(() => {
    return scan.opportunities.filter(o => {
      if (o.netProfit < filters.minProfit) return false
      if (o.profitPercent < filters.minProfitPercent) return false
      if (filters.category !== 'all' && o.category !== filters.category) return false
      if (o.tier < filters.minTier || o.tier > filters.maxTier) return false
      if (filters.search && !o.displayName.toLowerCase().includes(filters.search.toLowerCase()) && !o.itemId.toLowerCase().includes(filters.search.toLowerCase())) return false
      return true
    }).length
  }, [scan.opportunities, filters])

  // Top trades candidates — use ALL opportunities (not filtered), deduplicated
  const topCandidates = useMemo(() => {
    if (scan.status !== 'complete' || !scan.opportunities.length) return []
    const all = scan.opportunities.filter(o => o.expectedValue > 0 && o.freshness !== 'stale')

    // Separate BM instant-sell and city-to-city trades
    const bmTrades = all.filter(o => o.isBlackMarket && o.strategy === 'instant-sell')
      .sort((a, b) => b.expectedValue - a.expectedValue)
    const cityTrades = all.filter(o => !o.isBlackMarket)
      .sort((a, b) => b.expectedValue - a.expectedValue)

    // Deduplicate: max 2 routes per unique itemId per category
    function dedup(arr: ArbitrageOpportunity[], maxPerItem: number, limit: number) {
      const countMap = new Map<string, number>()
      const result: ArbitrageOpportunity[] = []
      for (const o of arr) {
        const cnt = countMap.get(o.itemId) || 0
        if (cnt >= maxPerItem) continue
        countMap.set(o.itemId, cnt + 1)
        result.push(o)
        if (result.length >= limit) break
      }
      return result
    }

    // Take diverse candidates: BM flips are priority (instant profit)
    const bmCandidates = dedup(bmTrades, 2, 50)
    const cityCandidates = dedup(cityTrades, 2, 60)
    return [...bmCandidates, ...cityCandidates]
  }, [scan.status, scan.opportunities])

  // Enriched top trades with volume data
  const [enrichedTrades, setEnrichedTrades] = useState<ArbitrageOpportunity[]>([])
  const [enriching, setEnriching] = useState(false)
  const enrichedForScanRef = useRef(-1)

  // Fetch volume data for top candidates — only on FULL scan (not BM refresh)
  useEffect(() => {
    if (scan.status !== 'complete' || !topCandidates.length) {
      setEnrichedTrades([])
      enrichedForScanRef.current = -1
      return
    }
    // Skip if already enriched for this full scan (BM refresh won't change fullScanCount)
    if (enrichedForScanRef.current === fullScanCount) return
    enrichedForScanRef.current = fullScanCount
    let cancelled = false
    ;(async () => {
      setEnriching(true)
      try {
        // Collect unique item IDs from candidates
        const uniqueItems = [...new Set(topCandidates.map(t => t.itemId))]
        // Fetch history in small batches
        const allHistory: Map<string, { city: string; avgVol: number; avgPrice: number; dataPoints: number }[]> = new Map()
        for (let i = 0; i < uniqueItems.length; i += 10) {
          if (cancelled) return
          const batch = uniqueItems.slice(i, i + 10)
          try {
            const hist = await albionApi.fetchItemHistory(batch, BM_LOCATIONS)
            for (const h of hist) {
              const key = h.item_id
              const points = h.data.filter(d => d.item_count > 0)
              const allPoints = h.data
              // Even if no volume, record avg_price from all data points
              const pricePoints = allPoints.filter(d => d.avg_price > 0)
              const avgVol = points.length > 0
                ? points.reduce((s, d) => s + d.item_count, 0) / Math.max(points.length, 1)
                : 0
              const avgPrice = pricePoints.length > 0
                ? pricePoints.reduce((s, d) => s + d.avg_price, 0) / pricePoints.length
                : 0
              const existing = allHistory.get(key) || []
              existing.push({ city: h.location, avgVol, avgPrice, dataPoints: points.length })
              allHistory.set(key, existing)
            }
          } catch { /* continue with partial data */ }
        }
        if (cancelled) return

        // Enrich candidates with volume data
        const enriched: ArbitrageOpportunity[] = []
        for (const trade of topCandidates) {
          const histEntries = allHistory.get(trade.itemId) || []
          const srcHist = histEntries.find(h => h.city === trade.sourceCity)
          // For BM trades, dest history might be under 'Caerleon' or 'Black Market'
          const dstHist = histEntries.find(h => h.city === trade.destCity)
            || (trade.destCity === 'Black Market' ? histEntries.find(h => h.city === 'Caerleon') : null)

          const dailyVolSrc = srcHist?.avgVol || 0
          const dailyVolDst = dstHist?.avgVol || 0
          const avgPriceSrc = srcHist?.avgPrice || 0
          const avgPriceDst = dstHist?.avgPrice || 0
          const hasHistoryData = histEntries.length > 0

          // Validate prices against 7-day historical averages
          // Source price: reject if wildly different from avg (too cheap OR too expensive)
          if (avgPriceSrc > 0) {
            const srcRatio = trade.sourcePrice / avgPriceSrc
            if (srcRatio < 0.3 || srcRatio > 3) continue // price is 3x+ off from historical
          }

          // Dest price for sell-order: reject if > 2.5x historical avg (inflated listing)
          if (trade.strategy === 'sell-order' && avgPriceDst > 0 && trade.destPrice > avgPriceDst * 2.5) continue

          // Dest price for instant-sell: reject if > 3x historical avg
          if (trade.strategy === 'instant-sell' && avgPriceDst > 0 && trade.destPrice > avgPriceDst * 3) continue

          // Reject if source is > 5x dest historical avg (buying overpriced item)
          if (avgPriceDst > 0 && trade.sourcePrice > avgPriceDst * 5) continue

          // For sell-order: skip if dest has 0 daily volume (nobody buys here)
          if (trade.strategy === 'sell-order' && dailyVolDst === 0 && dailyVolSrc === 0) continue

          // Recommended quantity based on dest volume
          const destVol = dailyVolDst > 0 ? dailyVolDst : (dailyVolSrc > 0 ? dailyVolSrc * 0.3 : 0)
          const recommendedQty = destVol > 0 ? Math.max(1, Math.floor(destVol * 0.3)) : 1
          const daysToSell = recommendedQty > 0 && destVol > 0
            ? Math.round((recommendedQty / destVol) * 10) / 10
            : -1 // -1 = unknown

          // Liquidity score (0-100)
          let liquidityScore = 0

          // Volume component (0-40) — use ACTUAL dest volume, not estimated
          if (dailyVolDst >= 50) liquidityScore += 40
          else if (dailyVolDst >= 20) liquidityScore += 30
          else if (dailyVolDst >= 10) liquidityScore += 25
          else if (dailyVolDst >= 3) liquidityScore += 15
          else if (dailyVolDst > 0) liquidityScore += 5
          // Zero dest volume penalty for sell-order
          else if (trade.strategy === 'sell-order') liquidityScore -= 10

          // Source volume (0-20)
          if (dailyVolSrc >= 20) liquidityScore += 20
          else if (dailyVolSrc >= 10) liquidityScore += 15
          else if (dailyVolSrc >= 3) liquidityScore += 10
          else if (dailyVolSrc > 0) liquidityScore += 5

          // Price consistency with 7d average (0-20 each side)
          if (avgPriceSrc > 0) {
            const srcDev = Math.abs(trade.sourcePrice - avgPriceSrc) / avgPriceSrc
            if (srcDev < 0.15) liquidityScore += 20
            else if (srcDev < 0.3) liquidityScore += 12
            else if (srcDev < 0.5) liquidityScore += 5
          }
          if (avgPriceDst > 0) {
            const dstDev = Math.abs(trade.destPrice - avgPriceDst) / avgPriceDst
            if (dstDev < 0.15) liquidityScore += 20
            else if (dstDev < 0.3) liquidityScore += 12
            else if (dstDev < 0.5) liquidityScore += 5
          }

          // BM instant-sell bonus: always liquid (NPC buy orders)
          if (trade.isBlackMarket && trade.strategy === 'instant-sell') liquidityScore += 15

          const volume: VolumeData = {
            dailyVolumeSrc: Math.round(dailyVolSrc * 10) / 10,
            dailyVolumeDst: Math.round(dailyVolDst * 10) / 10,
            avgPriceSrc: Math.round(avgPriceSrc),
            avgPriceDst: Math.round(avgPriceDst),
            recommendedQty,
            liquidityScore: Math.min(100, liquidityScore),
            daysToSell: daysToSell > 0 ? Math.ceil(daysToSell) : 99,
          }

          enriched.push({ ...trade, volume })
        }

        // Composite score: EV * (liquidityScore/100)^1.5 — heavily penalizes low liquidity
        // A LIQ 15 item gets multiplier 0.058, LIQ 50 gets 0.354, LIQ 65 gets 0.524
        function compositeScore(t: ArbitrageOpportunity) {
          const liq = Math.max(0, t.volume?.liquidityScore || 0) / 100
          return t.expectedValue * Math.pow(liq, 1.5)
        }

        enriched.sort((a, b) => compositeScore(b) - compositeScore(a))

        // Final selection: deduplicate by BASE item (strip enchantment), max 1 per base item
        // Minimum liquidity threshold: LIQ >= 25 for recommended trades (user said "elimizde patlamasın")
        // ── Final Selection: 3 categories ──
        // 1) Caerleon → BM (0 risk, already at BM, instant)
        // 2) Other City → BM (requires travel, instant sell)
        // 3) City → City (sell order, requires waiting)
        const MIN_LIQ_FOR_TOP = 25
        const MAX_TRADES = 25
        const finalTrades: ArbitrageOpportunity[] = []
        const seenItems = new Set<string>()
        const caerleonBmPicks: ArbitrageOpportunity[] = []
        const bmPicks: ArbitrageOpportunity[] = []
        const cityPicks: ArbitrageOpportunity[] = []

        for (const t of enriched) {
          const liq = t.volume?.liquidityScore || 0
          if (liq < MIN_LIQ_FOR_TOP) continue
          const baseId = t.itemId.replace(/@\d+$/, '')
          if (seenItems.has(baseId)) continue
          seenItems.add(baseId)
          if (t.isBlackMarket && t.sourceCity === 'Caerleon') caerleonBmPicks.push(t)
          else if (t.isBlackMarket) bmPicks.push(t)
          else cityPicks.push(t)
        }

        // Caerleon→BM: highest priority (0 risk, instant, no travel)
        const caerleonSlots = Math.min(caerleonBmPicks.length, 15)
        for (let i = 0; i < caerleonSlots; i++) finalTrades.push(caerleonBmPicks[i])
        // Other BM flips: up to 10 slots
        const bmSlots = Math.min(bmPicks.length, 10)
        for (let i = 0; i < bmSlots; i++) finalTrades.push(bmPicks[i])
        // City trades: fill remaining
        for (const t of cityPicks) {
          if (finalTrades.length >= MAX_TRADES) break
          finalTrades.push(t)
        }
        // Fill remaining with more BM if we still have room
        for (let i = bmSlots; i < bmPicks.length && finalTrades.length < MAX_TRADES; i++) {
          finalTrades.push(bmPicks[i])
        }
        for (let i = caerleonSlots; i < caerleonBmPicks.length && finalTrades.length < MAX_TRADES; i++) {
          finalTrades.push(caerleonBmPicks[i])
        }

        // If not enough items above threshold, relax to LIQ >= 15
        if (finalTrades.length < 5) {
          const relaxedSeenItems = new Set(seenItems)
          for (const t of enriched) {
            if (finalTrades.length >= MAX_TRADES) break
            const liq = t.volume?.liquidityScore || 0
            if (liq < 15) continue
            const baseId = t.itemId.replace(/@\d+$/, '')
            if (relaxedSeenItems.has(baseId)) continue
            relaxedSeenItems.add(baseId)
            finalTrades.push(t)
          }
        }

        // Re-sort final by composite score
        finalTrades.sort((a, b) => compositeScore(b) - compositeScore(a))

        if (!cancelled) setEnrichedTrades(finalTrades)
      } catch (err) {
        console.error('Volume enrichment failed:', err)
        if (!cancelled) setEnrichedTrades([])
      } finally {
        if (!cancelled) setEnriching(false)
      }
    })()
    return () => { cancelled = true }
  }, [scan.status, topCandidates, fullScanCount])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (field: SortField) => {
    setFilters(f => ({
      ...f,
      sortBy: field,
      sortDir: f.sortBy === field && f.sortDir === 'desc' ? 'asc' : 'desc',
    }))
    setPage(1)
  }

  const updateFilter = <K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    setFilters(f => ({ ...f, [key]: val }))
    setPage(1)
  }

  // Categories in current results
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const o of scan.opportunities) if (o.category) set.add(o.category)
    return Array.from(set).sort()
  }, [scan.opportunities])

  const isScanning = scan.status === 'loading-items' || scan.status === 'scanning' || scan.status === 'analyzing'

  const sortArrow = (field: SortField) =>
    filters.sortBy === field ? (filters.sortDir === 'desc' ? ' ▼' : ' ▲') : ''

  // Stats
  const totalProfit = useMemo(() => filtered.reduce((s, o) => s + o.netProfit, 0), [filtered])
  const avgPercent = useMemo(() => {
    if (!filtered.length) return 0
    return Math.round(filtered.reduce((s, o) => s + o.profitPercent, 0) / filtered.length * 10) / 10
  }, [filtered])

  // Data freshness tracking — include NATS last order time
  const lastUpdate = Math.max(
    scan.lastScanTime?.getTime() || 0,
    rtStats.lastOrderTime || 0,
  )
  const dataAge = lastUpdate ? now - lastUpdate : null
  const isRealtimeActive = rtStatus === 'connected' && rtStats.natsConnected && dataMode !== 'api-only'
  const dataStatus: 'live' | 'aging' | 'stale' | 'none' = isRealtimeActive ? 'live'
    : dataAge === null ? 'none'
    : dataAge < 120_000 ? 'live' : dataAge < 300_000 ? 'aging' : 'stale'
  const dataStatusColor = dataStatus === 'live' ? '#4caf50' : dataStatus === 'aging' ? '#ff9800' : dataStatus === 'stale' ? '#f44336' : '#666'

  const freshnessCounts = useMemo(() => {
    const c = { fresh: 0, recent: 0, stale: 0 }
    for (const o of scan.opportunities) c[o.freshness]++
    return c
  }, [scan.opportunities])

  // BM Focus: all instant-sell to Black Market opportunities
  const bmFocus = useMemo(() => {
    if (scan.status !== 'complete') return { caerleon: [] as ArbitrageOpportunity[], travel: [] as ArbitrageOpportunity[], totalBuying: 0, totalProfit: 0, totalAll: 0, freshCount: 0 }
    const allBm = scan.opportunities
      .filter(o => o.isBlackMarket && o.strategy === 'instant-sell')
      .sort((a, b) => b.netProfit - a.netProfit)
    const totalAll = new Set(allBm.map(o => o.itemId)).size

    // Apply freshness filter: require both sides < 10min old for reliable BM data
    const FRESH_THRESHOLD = 10 * 60 * 1000 // 10 minutes
    const nowMs = Date.now()
    const filtered = bmFreshOnly
      ? allBm.filter(o => {
          const srcAge = nowMs - o.sourceDate.getTime()
          const dstAge = nowMs - o.destDate.getTime()
          return srcAge < FRESH_THRESHOLD && dstAge < FRESH_THRESHOLD
        })
      : allBm

    const totalBuying = new Set(filtered.map(o => o.itemId)).size
    const totalProfit = filtered.reduce((s, o) => s + o.netProfit, 0)
    const freshCount = allBm.filter(o => {
      const srcAge = nowMs - o.sourceDate.getTime()
      const dstAge = nowMs - o.destDate.getTime()
      return srcAge < FRESH_THRESHOLD && dstAge < FRESH_THRESHOLD
    }).length

    function dedupTop(arr: ArbitrageOpportunity[], limit: number) {
      const seen = new Set<string>()
      const out: ArbitrageOpportunity[] = []
      for (const o of arr) {
        if (seen.has(o.itemId)) continue
        seen.add(o.itemId)
        out.push(o)
        if (out.length >= limit) break
      }
      return out
    }
    const caerleon = dedupTop(filtered.filter(o => o.sourceCity === 'Caerleon'), 100)
    return { caerleon, travel: [] as ArbitrageOpportunity[], totalBuying, totalProfit, totalAll, freshCount }
  }, [scan.status, scan.opportunities, bmFreshOnly])

  function fmtDataAge(ms: number | null): string {
    if (ms === null) return 'No data'
    const sec = Math.round(ms / 1000)
    if (sec < 60) return `${sec}s ago`
    const min = Math.floor(sec / 60)
    const remSec = sec % 60
    if (min < 60) return `${min}m ${remSec}s ago`
    return `${Math.floor(min / 60)}h ${min % 60}m ago`
  }

  return (
    <>
      <style>{CSS}</style>
      <div className={`ao${isDark ? '' : ' ao-light'}`}>
        <div className="ao-led" />

        {/* ── Header ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: isDark ? 'rgba(10,10,16,.85)' : 'rgba(240,236,229,.9)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.06)'}`, padding: '10px 16px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <a href="#/" style={{ color: isDark ? '#888' : '#666', textDecoration: 'none', fontSize: 13, fontFamily: 'Outfit,sans-serif' }}>←</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, boxShadow: `0 0 8px ${GOLD}55` }} />
              <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '.06em' }}>CAERLEON ↔ BM</span>
            </div>
            <div style={{ flex: 1 }} />
            <button className="aob" onClick={runScan} disabled={isScanning}
              style={{ background: `linear-gradient(135deg, ${GOLD}, #a07828)`, fontSize: 10 }}>
              {isScanning ? <><span className="ao-spinner" style={{ width: 10, height: 10, marginRight: 4, verticalAlign: 'middle' }} /> Scanning...</> : '⟳ Scan'}
            </button>
            <button className="aob" onClick={() => setAutoRefresh(!autoRefresh)}
              style={{ background: autoRefresh ? 'rgba(76,175,80,.25)' : 'rgba(255,255,255,.06)', fontSize: 10, color: autoRefresh ? '#4caf50' : isDark ? '#aaa' : '#666' }}>
              {autoRefresh ? '● Auto 30s' : '○ Auto 30s'}
            </button>
            <button className="aob" onClick={() => setTaxMode(taxMode === 'premium' ? 'normal' : 'premium')}
              style={{ background: taxMode === 'premium' ? 'rgba(212,168,67,.15)' : 'rgba(255,255,255,.06)', fontSize: 10, color: taxMode === 'premium' ? GOLD : isDark ? '#aaa' : '#666' }}>
              {taxMode === 'premium' ? '★ Premium' : '☆ Normal'} ({taxMode === 'premium' ? '4%' : '6.5%'})
            </button>
            {/* ── Sniffer connection indicator ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 8, background: snifferStatus === 'connected' ? 'rgba(76,175,80,.12)' : snifferStatus === 'connecting' ? 'rgba(255,152,0,.08)' : 'rgba(255,255,255,.04)', border: `1px solid ${snifferStatus === 'connected' ? 'rgba(76,175,80,.25)' : 'rgba(255,255,255,.06)'}` }}>
              <div className="ao-live-dot" style={{
                background: snifferStatus === 'connected' ? '#4caf50' : snifferStatus === 'connecting' ? '#ff9800' : '#666',
                animation: snifferStatus === 'connected' ? 'aoLivePulse 2s ease infinite' : 'none',
              }} />
              <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Outfit,sans-serif', letterSpacing: '.06em',
                color: snifferStatus === 'connected' ? '#4caf50' : snifferStatus === 'connecting' ? '#ff9800' : '#666',
              }}>
                {snifferStatus === 'connected' ? '🎯 SNIFFER' : snifferStatus === 'connecting' ? '...' : 'OFFLINE'}
              </span>
            </div>

            {/* ── Data mode toggle ── */}
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,.04)', borderRadius: 6, padding: 2 }}>
              {(['api-only', 'hybrid', 'realtime-only'] as DataMode[]).map(mode => (
                <button key={mode} className="ao-mode-btn"
                  disabled={mode !== 'api-only' && rtStatus !== 'connected'}
                  onClick={() => setDataMode(mode)}
                  style={{
                    background: dataMode === mode ? (mode === 'realtime-only' ? 'rgba(76,175,80,.25)' : mode === 'hybrid' ? 'rgba(212,168,67,.2)' : 'rgba(255,255,255,.08)') : 'transparent',
                    color: dataMode === mode ? (mode === 'realtime-only' ? '#4caf50' : mode === 'hybrid' ? GOLD : isDark ? '#ccc' : '#444') : '#666',
                  }}>
                  {mode === 'api-only' ? 'API' : mode === 'hybrid' ? 'Hibrit' : 'CANLI'}
                </button>
              ))}
            </div>

            <button className="aob" onClick={() => setDark?.(!dark)}
              style={{ background: 'rgba(255,255,255,.06)', fontSize: 10, color: isDark ? '#aaa' : '#666', padding: '5px 10px' }}>
              {isDark ? '☀' : '☾'}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 16px 48px' }}>
          {/* ── Progress Bar ── */}
          {isScanning && (
            <div style={{ marginBottom: 12 }}>
              <div className="ao-progress">
                <div className={`ao-progress-fill active`} style={{ width: `${scan.progress}%` }} />
              </div>
              <div style={{ fontSize: 9, color: '#888', marginTop: 4, fontFamily: 'Outfit,sans-serif' }}>
                {scan.status === 'loading-items' ? 'Loading item list...' :
                 scan.status === 'analyzing' ? 'Analyzing opportunities...' :
                 `Scanning prices... ${scan.batchesDone}/${scan.batchesTotal} batches`}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {scan.error && (
            <div className="aop" style={{ marginBottom: 12, borderColor: 'rgba(244,67,54,.3)' }}>
              <span style={{ color: '#f44336', fontSize: 11 }}>Error: {scan.error}</span>
            </div>
          )}

          {/* ── Stats Bar ── */}
          <div className="aop" style={{ marginBottom: 8, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatBox label="Items Scanned" value={scan.itemsTotal ? fmtSilver(scan.itemsTotal) : '—'} />
            <StatBox label="Opportunities" value={String(filtered.length)} color={GOLD} />
            <StatBox label="Total Profit" value={filtered.length ? fmtSilver(totalProfit) : '—'} />
            <StatBox label="Avg Profit %" value={filtered.length ? `${avgPercent}%` : '—'} />
            <StatBox label="API Calls" value={String(albionApi.requestCount)} />
            {snifferStatus === 'connected' && snifferState && (
              <>
                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,.06)' }} />
                <StatBox label="Caerleon Sell" value={String(snifferState.caerleonSellOrders)} color="#f44336" />
                <StatBox label="BM Buy" value={String(snifferState.bmBuyOrders)} color="#4caf50" />
                <StatBox label="Sniffer Fırsatlar" value={String(snifferState.opportunities.length)} color={GOLD} />
                <StatBox label="Sayfa" value={String(snifferState.scanPages)} />
              </>
            )}
            {rtStatus === 'connected' && snifferStatus !== 'connected' && (
              <>
                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,.06)' }} />
                <StatBox label="NATS Orders" value={rtStats.ordersRelevant ? `${fmtSilver(rtStats.ordersRelevant)}` : '—'} color="#4caf50" />
                <StatBox label="Live Prices" value={String(rtStats.priceEntries)} color="#4caf50" />
                <StatBox label="Last Order" value={rtStats.lastOrderTime ? timeAgo(new Date(rtStats.lastOrderTime)) : '—'} />
              </>
            )}
          </div>

          {/* ── Data Status Bar ── */}
          <div className="aop" style={{ marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', padding: '10px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: dataStatusColor, color: dataStatusColor,
                animation: dataStatus === 'live' ? 'aoPulseDot 2s ease infinite' : 'none',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: dataStatusColor, fontFamily: 'Outfit,sans-serif', letterSpacing: '.06em' }}>
                {dataStatus === 'live' ? 'LIVE' : dataStatus === 'aging' ? 'AGING' : dataStatus === 'stale' ? 'STALE' : 'NO DATA'}
              </span>
              <span style={{ fontSize: 10, color: '#888' }}>
                {scan.lastScanTime
                  ? <>Data updated <strong style={{ color: dataStatusColor }}>{fmtDataAge(dataAge)}</strong></>
                  : 'No scan performed yet'}
              </span>
            </div>
            {scan.opportunities.length > 0 && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 9, color: '#888', fontFamily: 'Outfit,sans-serif' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4caf50', display: 'inline-block' }} />
                  Fresh: <strong style={{ color: '#4caf50' }}>{freshnessCounts.fresh.toLocaleString()}</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff9800', display: 'inline-block' }} />
                  Recent: <strong style={{ color: '#ff9800' }}>{freshnessCounts.recent.toLocaleString()}</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f44336', display: 'inline-block' }} />
                  Stale: <strong style={{ color: '#f44336' }}>{freshnessCounts.stale.toLocaleString()}</strong>
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
              {bmRefreshing && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#4caf50', fontFamily: 'Outfit,sans-serif', fontWeight: 600 }}>
                  <span className="ao-spinner" style={{ width: 8, height: 8 }} /> BM Refresh
                </span>
              )}
              {autoRefresh && scan.lastScanTime && !bmRefreshing && (
                <span style={{ fontSize: 9, color: '#888', fontFamily: 'Outfit,sans-serif' }}>
                  BM refresh in <strong style={{ color: GOLD }}>{Math.max(0, Math.ceil((BM_REFRESH_INTERVAL - (dataAge || 0)) / 1000))}s</strong>
                </span>
              )}
              {dataStatus === 'stale' && (
                <span style={{ fontSize: 9, color: '#f44336', fontFamily: 'Outfit,sans-serif' }}>
                  ⚠ Stale data
                </span>
              )}
              <button className="aob" onClick={runBmRefresh} disabled={isScanning || bmRefreshing}
                style={{
                  background: 'rgba(76,175,80,.15)',
                  fontSize: 9, padding: '3px 10px',
                  color: '#4caf50',
                }}>
                {bmRefreshing ? <><span className="ao-spinner" style={{ width: 8, height: 8, marginRight: 3, verticalAlign: 'middle' }} />BM...</> : '⚡ BM Refresh'}
              </button>
              <button className="aob" onClick={runScan} disabled={isScanning || bmRefreshing}
                style={{
                  background: dataStatus === 'stale' ? 'rgba(244,67,54,.2)' : 'rgba(255,255,255,.06)',
                  fontSize: 9, padding: '3px 10px',
                  color: dataStatus === 'stale' ? '#f44336' : isDark ? '#aaa' : '#666',
                }}>
                {isScanning ? <><span className="ao-spinner" style={{ width: 8, height: 8, marginRight: 3, verticalAlign: 'middle' }} />Full...</> : '⟳ Full Scan'}
              </button>
            </div>
          </div>

          {/* ══════ SNIFFER PANEL ══════ */}
          {snifferStatus === 'connected' && (
            <div className="aop" style={{ marginBottom: 12, borderColor: 'rgba(76,175,80,.3)', borderWidth: 1 }}>
              <div className="aot" style={{ gap: 8 }}>
                <span style={{ color: '#4caf50', fontSize: 12 }}>🎯</span> SNIFFER — Kendi Market Verilerin
                <span style={{ fontSize: 8, color: '#4caf50', fontWeight: 700, padding: '1px 6px', background: 'rgba(76,175,80,.1)', borderRadius: 4, border: '1px solid rgba(76,175,80,.15)' }}>
                  CANLI
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#888', fontFamily: 'Outfit,sans-serif' }}>
                  {snifferState?.locationName && <><span style={{ color: GOLD }}>📍 {snifferState.locationName}</span> · </>}
                  Sell: <strong style={{ color: '#f44336' }}>{snifferState?.caerleonSellOrders ?? 0}</strong> · Buy: <strong style={{ color: '#4caf50' }}>{snifferState?.bmBuyOrders ?? 0}</strong> · Sayfa: <strong>{snifferState?.scanPages ?? 0}</strong>
                </span>
              </div>

              {/* How-to guide (collapsible) */}
              {(!snifferState || snifferState.scanPages === 0) && (
                <div style={{ fontSize: 9, color: '#888', marginBottom: 8, fontFamily: 'Outfit,sans-serif', lineHeight: 1.6, padding: '8px 10px', background: isDark ? 'rgba(76,175,80,.04)' : 'rgba(76,175,80,.06)', borderRadius: 5, border: '1px solid rgba(76,175,80,.1)' }}>
                  <strong style={{ color: '#4caf50' }}>Sniffer aktif!</strong> Şimdi oyuna git ve market'i aç:
                  <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span>1️⃣ Caerleon marketi aç → item sayfalarını gez (sell order yakalanır)</span>
                    <span>2️⃣ Black Market'e git → item sayfalarını gez (buy order yakalanır)</span>
                    <span>3️⃣ Arbitrage fırsatları otomatik hesaplanır</span>
                  </div>
                </div>
              )}

              {/* Sniffer Feed */}
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: showSnifferFeed ? 6 : 0 }} onClick={() => setShowSnifferFeed(!showSnifferFeed)}>
                <div className="ao-live-dot" style={{ background: '#4caf50', animation: snifferFeed.length ? 'aoLivePulse 1.5s ease infinite' : 'none' }} />
                <span style={{ fontSize: 9, fontWeight: 600, color: '#4caf50' }}>Yakalanan Veriler</span>
                <span style={{ fontSize: 8, color: '#888' }}>{snifferFeed.length} paket</span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#666' }}>{showSnifferFeed ? '▲' : '▼'}</span>
              </div>
              {showSnifferFeed && snifferFeed.length > 0 && (
                <div style={{ maxHeight: 140, overflowY: 'auto', background: isDark ? 'rgba(0,0,0,.2)' : 'rgba(0,0,0,.03)', borderRadius: 6, padding: 4, marginBottom: 8 }}>
                  {snifferFeed.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.02)'}`, fontSize: 10 }}>
                      <span style={{ fontSize: 8, color: '#555', fontVariantNumeric: 'tabular-nums', minWidth: 50 }}>
                        {new Date(f.time).toLocaleTimeString()}
                      </span>
                      <span style={{ fontSize: 8, fontWeight: 700, minWidth: 32, textAlign: 'center', color: f.type === 'sell' ? '#f44336' : '#4caf50', background: f.type === 'sell' ? 'rgba(244,67,54,.08)' : 'rgba(76,175,80,.08)', padding: '1px 4px', borderRadius: 3 }}>
                        {f.type === 'sell' ? 'SELL' : 'BUY'}
                      </span>
                      <span style={{ color: CITY_COLORS[f.location] || '#888', fontSize: 9, fontWeight: 600 }}>{f.location}</span>
                      <span style={{ color: '#888' }}>{f.count} order</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sniffer Opportunities */}
              {snifferState && snifferState.opportunities.length > 0 && (() => {
                const allOpps = snifferState.opportunities
                const filteredOpps = allOpps.filter(opp => {
                  if (snifferMinProfit > 0 && opp.profit < snifferMinProfit) return false
                  if (snifferMinPct > 0 && opp.profitPercent < snifferMinPct) return false
                  if (snifferSearch) {
                    const q = snifferSearch.toLowerCase()
                    const name = (opp.itemName || opp.itemId || '').toLowerCase()
                    if (!name.includes(q) && !opp.itemId.toLowerCase().includes(q)) return false
                  }
                  return true
                })
                return (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: GOLD, fontFamily: 'Outfit,sans-serif', letterSpacing: '.06em' }}>
                      ★ {filteredOpps.length}{filteredOpps.length !== allOpps.length ? `/${allOpps.length}` : ''} ARBITRAGE FIRSATI
                    </span>
                    <label style={{ fontSize: 8, color: '#888', display: 'flex', alignItems: 'center', gap: 3 }}>
                      Min Kâr
                      <input className="ao-input" type="number" value={snifferMinProfit || ''} placeholder="0" onChange={e => setSnifferMinProfit(Number(e.target.value) || 0)} style={{ width: 60 }} />
                    </label>
                    <label style={{ fontSize: 8, color: '#888', display: 'flex', alignItems: 'center', gap: 3 }}>
                      Min %
                      <input className="ao-input" type="number" value={snifferMinPct || ''} placeholder="0" onChange={e => setSnifferMinPct(Number(e.target.value) || 0)} style={{ width: 45 }} />
                    </label>
                    <input className="ao-input" placeholder="Item ara..." value={snifferSearch} onChange={e => setSnifferSearch(e.target.value)} style={{ width: 110, fontSize: 8 }} />
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)'}` }}>
                          <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 8, color: '#666', fontWeight: 600 }}>ITEM</th>
                          <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 8, color: '#666', fontWeight: 600 }}>KAL</th>
                          <th style={{ textAlign: 'right', padding: '4px 6px', fontSize: 8, color: '#f44336', fontWeight: 700 }}>CAERLEON AL</th>
                          <th style={{ textAlign: 'right', padding: '4px 6px', fontSize: 8, color: '#4caf50', fontWeight: 700 }}>BM NET</th>
                          <th style={{ textAlign: 'right', padding: '4px 6px', fontSize: 8, color: GOLD, fontWeight: 700 }}>NET KÂR</th>
                          <th style={{ textAlign: 'right', padding: '4px 6px', fontSize: 8, color: '#888', fontWeight: 600 }}>%</th>
                          <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 8, color: '#888', fontWeight: 600 }}>ADET</th>
                          <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 8, color: '#888', fontWeight: 600 }}>TOPLAM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOpps.slice(0, 50).map((opp, i) => {
                          const netBm = opp.bmPrice - opp.taxAmount
                          return (
                          <tr key={`sopp-${i}`} className="ao-row" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.03)'}` }}>
                            <td style={{ padding: '5px 6px', fontWeight: 500, maxWidth: 260 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {displayName(opp.itemId)} <span style={{ color: '#666', fontSize: 8 }}>{opp.itemId.match(/^T(\d)/)?.[1] ? `T${opp.itemId.match(/^T(\d)/)?.[1]}` : ''}{opp.itemId.match(/@(\d)$/)?.[1] ? `.${opp.itemId.match(/@(\d)$/)?.[1]}` : ''}</span>
                                  {bmCategory(opp.itemId) && <span style={{ fontSize: 7, color: '#888', background: 'rgba(255,255,255,.05)', padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(255,255,255,.06)' }}>{bmCategory(opp.itemId)}</span>}
                                </span>
                                <span title="Tıkla → item adını kopyala" onClick={(e) => {
                                  const name = gameSearchName(opp.itemId)
                                  const el = e.currentTarget
                                  copyText(name)
                                  el.textContent = '✓ Kopyalandı!'
                                  el.style.color = '#4caf50'
                                  setTimeout(() => { el.textContent = '📋 ' + name; el.style.color = GOLD }, 1500)
                                }} style={{ fontSize: 9, color: GOLD, cursor: 'pointer', opacity: 0.85, fontFamily: 'Outfit,sans-serif', padding: '1px 4px', borderRadius: 3, background: 'rgba(212,168,67,.08)', border: '1px solid rgba(212,168,67,.15)', userSelect: 'all' }}>
                                  📋 {gameSearchName(opp.itemId)}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}><QualityBadge q={opp.qualityLevel} /></td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#f44336', fontVariantNumeric: 'tabular-nums' }}>
                              {fmtSilver(opp.caerleonPrice)}
                              <span style={{ fontSize: 7, color: '#888', marginLeft: 3 }}>x{opp.caerleonAmount}</span>
                              {(opp as any).caerleonSource === 'api' && <span style={{ fontSize: 7, color: '#ff9800', marginLeft: 3, padding: '0 3px', borderRadius: 2, background: 'rgba(255,152,0,.12)', border: '1px solid rgba(255,152,0,.2)' }} title="Caerleon fiyatı API'den — eski olabilir!">API</span>}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              <span style={{ fontWeight: 700, color: '#4caf50' }}>{fmtSilver(netBm)}</span>
                              <span style={{ fontSize: 7, color: '#888', marginLeft: 3 }}>x{opp.bmAmount}</span>
                              <br />
                              <span style={{ fontSize: 7, color: '#666', fontWeight: 400 }} title={`Brüt: ${opp.bmPrice.toLocaleString()} - Vergi: ${opp.taxAmount.toLocaleString()} = Net: ${netBm.toLocaleString()}`}>
                                {fmtSilver(opp.bmPrice)} - {fmtSilver(opp.taxAmount)} vergi
                              </span>
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: GOLD, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                              +{fmtSilver(opp.profit)}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: opp.profitPercent >= 20 ? '#4caf50' : opp.profitPercent >= 10 ? '#ff9800' : '#888' }}>
                              {opp.profitPercent.toFixed(1)}%
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: '#888' }}>
                              {opp.maxAmount}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: GOLD }}>
                              {fmtSilver(opp.totalProfit)}
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                )
              })()}

              {/* No opportunities yet */}
              {snifferState && snifferState.opportunities.length === 0 && snifferState.scanPages > 0 && (
                <div style={{ padding: 12, textAlign: 'center', fontSize: 10, color: '#888', fontFamily: 'Outfit,sans-serif' }}>
                  {snifferState.caerleonSellOrders > 0 && snifferState.bmBuyOrders > 0
                    ? 'Caerleon ve BM verileri var ama kârlı fırsat bulunamadı. Daha fazla item gez.'
                    : snifferState.caerleonSellOrders > 0
                    ? 'Caerleon verileri yakalandı. Şimdi Black Market\'e git ve item\'ları gez.'
                    : snifferState.bmBuyOrders > 0
                    ? 'BM verileri yakalandı. Şimdi Caerleon\'a git ve item\'ları gez.'
                    : 'Henüz market verisi yakalanmadı. Oyunda marketi aç ve item\'ları gez.'}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="aob" onClick={() => snifferClient.requestClear()}
                  style={{ background: 'rgba(244,67,54,.1)', fontSize: 8, padding: '2px 8px', color: '#f44336' }}>
                  🗑 Temizle
                </button>
              </div>
            </div>
          )}

          {/* Sniffer offline notice */}
          {snifferStatus !== 'connected' && (
            <div className="aop" style={{ marginBottom: 12, borderColor: 'rgba(255,152,0,.2)', padding: '10px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="ao-live-dot" style={{ background: snifferStatus === 'connecting' ? '#ff9800' : '#666', animation: snifferStatus === 'connecting' ? 'aoLivePulse 2s ease infinite' : 'none' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: snifferStatus === 'connecting' ? '#ff9800' : '#888', fontFamily: 'Outfit,sans-serif' }}>
                  {snifferStatus === 'connecting' ? 'Sniffer bağlanıyor...' : 'Sniffer çalışmıyor'}
                </span>
                <span style={{ fontSize: 9, color: '#666', fontFamily: 'Outfit,sans-serif' }}>
                  Başlatmak için: <code style={{ fontSize: 8, background: 'rgba(255,255,255,.06)', padding: '1px 4px', borderRadius: 3 }}>cd tools/albion-sniffer && node sniffer.mjs</code>
                </span>
              </div>
            </div>
          )}

          {/* ── Live Order Feed ── */}
          {rtStatus === 'connected' && (
            <div className="aop" style={{ marginBottom: 12, padding: showLiveFeed ? '14px 16px' : '8px 16px', transition: 'padding .2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setShowLiveFeed(!showLiveFeed)}>
                <div className="ao-live-dot" style={{
                  background: rtStats.natsConnected ? '#4caf50' : '#ff9800',
                  animation: rtStats.natsConnected && recentOrders.length > 0 ? 'aoLivePulse 1.5s ease infinite' : 'none',
                }} />
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Outfit,sans-serif', color: '#4caf50', letterSpacing: '.04em' }}>
                  Live Feed
                </span>
                <span style={{ fontSize: 9, color: '#888', fontFamily: 'Outfit,sans-serif' }}>
                  {rtStats.ordersReceived > 0 ? `${rtStats.ordersReceived} orders received` : 'Waiting for orders...'}
                  {dataMode !== 'api-only' && <span className="ao-canli-badge" style={{ marginLeft: 6 }}>CANLI</span>}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#666' }}>{showLiveFeed ? '▲' : '▼'}</span>
              </div>
              {showLiveFeed && (
                <div className="ao-live-feed" style={{ marginTop: 8, background: isDark ? 'rgba(0,0,0,.2)' : 'rgba(0,0,0,.03)', borderRadius: 6, padding: 4 }}>
                  {recentOrders.length === 0 && (
                    <div style={{ padding: 12, textAlign: 'center', fontSize: 10, color: '#666' }}>
                      Waiting for Caerleon/BM orders from NATS stream...
                    </div>
                  )}
                  {recentOrders.slice(0, 20).map((o, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.02)'}`, fontSize: 10 }}>
                      <span style={{ fontSize: 8, color: '#555', fontVariantNumeric: 'tabular-nums', minWidth: 50 }}>
                        {new Date(o.timestamp).toLocaleTimeString()}
                      </span>
                      <span style={{
                        fontSize: 8, fontWeight: 700, minWidth: 32, textAlign: 'center',
                        color: o.side === 'sell' ? '#f44336' : '#4caf50',
                        background: o.side === 'sell' ? 'rgba(244,67,54,.08)' : 'rgba(76,175,80,.08)',
                        padding: '1px 4px', borderRadius: 3,
                      }}>
                        {o.side === 'sell' ? 'SELL' : 'BUY'}
                      </span>
                      <CityBadge city={o.city} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>
                        {displayName(o.itemId)}
                      </span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: GOLD }}>
                        {fmtSilver(o.price)}
                      </span>
                      {o.amount && <span style={{ fontSize: 8, color: '#666' }}>x{o.amount}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BM BUY RADAR — What BM is currently buying ── */}
          {bmRadar.length > 0 && (
            <div className="aop" style={{ marginBottom: 12, borderColor: 'rgba(229,57,53,.25)', borderWidth: 1 }}>
              <div className="aot" style={{ gap: 8 }}>
                <span style={{ color: '#e53935' }}>📡</span> BM ALIŞ RADARI — Black Market Şu An Ne Alıyor?
                <span style={{ fontSize: 8, color: '#e53935', fontWeight: 700, padding: '1px 6px', background: 'rgba(229,57,53,.1)', borderRadius: 4, border: '1px solid rgba(229,57,53,.15)' }}>CANLI NATS</span>
                <span style={{ marginLeft: 'auto', fontSize: 9, color: '#888', fontFamily: 'Outfit,sans-serif' }}>
                  <strong style={{ color: '#e53935' }}>{bmRadar.length}</strong> aktif buy order
                </span>
              </div>

              <div style={{ fontSize: 8, color: '#888', marginBottom: 8, fontFamily: 'Outfit,sans-serif', lineHeight: 1.6, padding: '6px 10px', background: isDark ? 'rgba(229,57,53,.04)' : 'rgba(229,57,53,.06)', borderRadius: 5, border: '1px solid rgba(229,57,53,.1)' }}>
                <strong style={{ color: '#4caf50' }}>BM bu itemleri satın almak istiyor.</strong>{' '}
                Caerleon markette bu fiyatın altına bulursan kâr edersin.
                <br />
                <span style={{ color: '#666' }}>
                  📋 Item ismini tıklayarak kopyala → oyun içi markette yapıştır → fiyatı kontrol et.
                </span>
              </div>

              {/* Sort buttons */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {([['price', 'En Pahalı'], ['age', 'En Yeni']] as [typeof bmRadarSort, string][]).map(([key, label]) => (
                  <button key={key} className="aob" onClick={() => setBmRadarSort(key)}
                    style={{ background: bmRadarSort === key ? 'rgba(229,57,53,.15)' : 'rgba(255,255,255,.04)', fontSize: 8, padding: '2px 8px', color: bmRadarSort === key ? '#e53935' : '#666' }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)'}` }}>
                      <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 8, color: '#666', fontWeight: 600, letterSpacing: '.08em' }}>ITEM</th>
                      <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 8, color: '#666', fontWeight: 600, letterSpacing: '.08em' }}>KALİTE</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px', fontSize: 8, color: '#4caf50', fontWeight: 700, letterSpacing: '.08em' }}>BM ALIŞ FİYATI</th>
                      <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 8, color: '#666', fontWeight: 600, letterSpacing: '.08em' }}>ADET</th>
                      <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 8, color: '#666', fontWeight: 600, letterSpacing: '.08em' }}>GÖRÜLDÜ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sorted = [...bmRadar]
                      if (bmRadarSort === 'age') sorted.sort((a, b) => b.bmBuyDate - a.bmBuyDate)
                      // default 'price' is already sorted by price desc
                      return (showAllBm ? sorted : sorted.slice(0, 30)).map((o, i) => {
                        const bmAge = now - o.bmBuyDate
                        return (
                          <tr key={`bmr-${i}`} className="ao-row" style={{ fontSize: 10, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.03)'}`, opacity: bmAge > 30 * 60 * 1000 ? 0.4 : 1 }}>
                            <td style={{ padding: '5px 6px', fontWeight: 500, maxWidth: 260 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {displayName(o.itemId)} <span style={{ color: '#666', fontSize: 8 }}>{o.itemId.match(/^T(\d)/)?.[1] ? `T${o.itemId.match(/^T(\d)/)?.[1]}` : ''}{o.itemId.match(/@(\d)$/)?.[1] ? `.${o.itemId.match(/@(\d)$/)?.[1]}` : ''}</span>
                                </span>
                                <span
                                  title="Kopyala — Albion markette ara"
                                  onClick={(e) => { copyText(gameSearchName(o.itemId)); const el = e.currentTarget; el.textContent = '✓ Kopyalandı!'; el.style.color = '#4caf50'; setTimeout(() => { el.textContent = '📋 ' + gameSearchName(o.itemId); el.style.color = GOLD }, 1200) }}
                                  style={{ fontSize: 8, color: GOLD, cursor: 'pointer', opacity: 0.7, fontFamily: 'Outfit,sans-serif', letterSpacing: '.02em' }}
                                >
                                  📋 {gameSearchName(o.itemId)}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}><QualityBadge q={o.quality} /></td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#4caf50', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                              {fmtSilver(o.bmBuyPrice)}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: '#888' }}>
                              {o.bmBuyAmount || '—'}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                              <span style={{ fontSize: 8, color: bmAge < 300_000 ? '#4caf50' : bmAge < 1800_000 ? '#ff9800' : '#f44336', fontWeight: 600 }}>
                                {bmAge < 60_000 ? `${Math.round(bmAge / 1000)}s` : bmAge < 3600_000 ? `${Math.round(bmAge / 60_000)}dk` : `${Math.round(bmAge / 3600_000)}sa`}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
              {bmRadar.length > 30 && (
                <button className="aob" onClick={() => setShowAllBm(!showAllBm)}
                  style={{ background: 'rgba(229,57,53,.1)', fontSize: 9, padding: '3px 12px', marginTop: 6, color: '#e53935' }}>
                  {showAllBm ? `Top 30 Göster ▲` : `Tümünü Göster (${bmRadar.length}) ▼`}
                </button>
              )}
            </div>
          )}

          {/* ── Top Trades — 3 Sections ── */}
          {(enrichedTrades.length > 0 || enriching) && (() => {
            // Filter out stale trades: BM flips need <30min data, city trades need <2h
            const ENRICHED_BM_MAX = 30 * 60 * 1000  // 30 min for BM
            const ENRICHED_CITY_MAX = 2 * 60 * 60 * 1000 // 2h for city trades
            const nowMs = Date.now()
            const freshEnriched = enrichedTrades.filter(t => {
              const maxAge = t.isBlackMarket ? ENRICHED_BM_MAX : ENRICHED_CITY_MAX
              const srcAge = nowMs - t.sourceDate.getTime()
              const dstAge = nowMs - t.destDate.getTime()
              return srcAge < maxAge && dstAge < maxAge
            })
            const caerleonBmFlips = freshEnriched.filter(t => t.isBlackMarket && t.sourceCity === 'Caerleon')

            const totalEV = caerleonBmFlips.reduce((s, t) => s + t.expectedValue, 0)
            const verifiedCount = caerleonBmFlips.filter(t => {
              const v = t.volume
              return v && v.avgPriceSrc > 0 && v.avgPriceDst > 0
            }).length
            const totalTrades = caerleonBmFlips.length

            return <>
            {/* ── Trade Summary ── */}
            {!enriching && totalTrades > 0 && (
              <div className="aop" style={{ marginBottom: 12, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', padding: '10px 16px' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 9, fontFamily: 'Outfit,sans-serif' }}>
                  <span style={{ color: '#e53935', fontWeight: 600 }}>🏰 Caerleon → BM: <strong>{caerleonBmFlips.length}</strong> verified flips</span>
                </div>
                <div style={{ fontSize: 9, color: '#888', fontFamily: 'Outfit,sans-serif' }}>
                  Total EV: <strong style={{ color: GOLD }}>{fmtSilver(totalEV)}</strong>
                </div>
                <div style={{ fontSize: 9, color: '#888', fontFamily: 'Outfit,sans-serif' }}>
                  Verified: <strong style={{ color: verifiedCount === totalTrades ? '#4caf50' : '#ff9800' }}>{verifiedCount}/{totalTrades}</strong>
                </div>
              </div>
            )}

            {/* ── Loading state ── */}
            {enriching && (
              <div className="aop" style={{ marginBottom: 12, borderColor: 'rgba(212,168,67,.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#888', padding: 8 }}>
                  <span className="ao-spinner" style={{ width: 12, height: 12 }} />
                  Fetching 7-day history, validating volumes & prices against API data...
                </div>
              </div>
            )}

            {/* ── Caerleon → BM Quick Flips (0 risk, you're already there) ── */}
            {(caerleonBmFlips.length > 0 || (!enriching && scan.status === 'complete')) && (
              <div className="aop" style={{ marginBottom: 12, borderColor: 'rgba(229,57,53,.2)', borderWidth: 1 }}>
                <div className="aot" style={{ gap: 8 }}>
                  <span style={{ color: '#e53935' }}>🏰</span> Caerleon → BM Quick Flips
                  <span style={{ fontSize: 8, color: '#e53935', fontWeight: 600, padding: '1px 6px', background: 'rgba(229,57,53,.1)', borderRadius: 4, border: '1px solid rgba(229,57,53,.15)' }}>0% RISK</span>
                </div>
                <div style={{ fontSize: 9, color: '#888', marginBottom: 8, fontFamily: 'Outfit,sans-serif' }}>
                  Buy from Caerleon market → walk to Black Market → instant-sell. Zero travel risk, no tax, no waiting.
                  {caerleonBmFlips.length > 0 && <span style={{ color: '#e53935', fontWeight: 600 }}> Best for when you're already at BM.</span>}
                </div>
                {caerleonBmFlips.length === 0 && !enriching && (
                  <div style={{ fontSize: 10, color: '#888', padding: 12, textAlign: 'center' }}>
                    No Caerleon→BM flips found right now. BM buy orders may be filled. Try again in a few minutes.
                  </div>
                )}
                {caerleonBmFlips.map((t, i) => <TradeCard key={`cbm-${i}`} t={t} i={i} isDark={isDark} taxMode={taxMode} now={now} />)}
              </div>
            )}

            </>
          })()}

          {/* ── Filters ── */}
          <div className="aop" style={{ marginBottom: 12 }}>
            <div className="aot">Filters — Caerleon → BM</div>
            <div className="ao-filters" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontSize: 9, color: '#888', fontWeight: 600 }}>
                📡 Max Veri Yaşı
                <select className="ao-select" value={maxDataAge} onChange={e => { setMaxDataAge(Number(e.target.value)); setPage(1) }} style={{ marginLeft: 4, borderColor: maxDataAge <= 10 ? 'rgba(76,175,80,.4)' : maxDataAge <= 30 ? 'rgba(255,152,0,.4)' : 'rgba(244,67,54,.4)' }}>
                  <option value={5}>5 dk (en güncel)</option>
                  <option value={10}>10 dk</option>
                  <option value={30}>30 dk</option>
                  <option value={60}>1 saat</option>
                  <option value={0}>Hepsi (eski dahil)</option>
                </select>
              </label>
              <label style={{ fontSize: 9, color: '#888' }}>
                Min Kâr
                <input className="ao-input" type="number" value={filters.minProfit} onChange={e => updateFilter('minProfit', Number(e.target.value))} style={{ width: 70, marginLeft: 4 }} />
              </label>
              <label style={{ fontSize: 9, color: '#888' }}>
                Min %
                <input className="ao-input" type="number" value={filters.minProfitPercent} onChange={e => updateFilter('minProfitPercent', Number(e.target.value))} style={{ width: 50, marginLeft: 4 }} />
              </label>
              <label style={{ fontSize: 9, color: '#888' }}>
                Kategori
                <select className="ao-select" value={filters.category} onChange={e => updateFilter('category', e.target.value)} style={{ marginLeft: 4 }}>
                  <option value="all">Hepsi</option>
                  {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 9, color: '#888' }}>
                Tier
                <select className="ao-select" value={filters.minTier} onChange={e => updateFilter('minTier', Number(e.target.value))} style={{ marginLeft: 4, width: 44 }}>
                  {[4, 5, 6, 7, 8].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{ margin: '0 2px' }}>—</span>
                <select className="ao-select" value={filters.maxTier} onChange={e => updateFilter('maxTier', Number(e.target.value))} style={{ width: 44 }}>
                  {[4, 5, 6, 7, 8].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <input className="ao-input" placeholder="Item ara..." value={filters.search} onChange={e => updateFilter('search', e.target.value)} style={{ width: 130 }} />
            </div>
            {maxDataAge > 0 && totalOppsBeforeAge > filtered.length && (
              <div style={{ marginTop: 6, fontSize: 8, color: '#ff9800', fontFamily: 'Outfit,sans-serif' }}>
                ⚠ {totalOppsBeforeAge - filtered.length} fırsat gizlendi (veri {'>'} {maxDataAge}dk eski).
                <button onClick={() => setMaxDataAge(0)} style={{ background: 'none', border: 'none', color: GOLD, cursor: 'pointer', fontSize: 8, fontFamily: 'Outfit,sans-serif', textDecoration: 'underline', padding: '0 4px' }}>
                  Hepsini göster
                </button>
              </div>
            )}
          </div>

          {/* ── Results Table — All Caerleon → BM Opportunities ── */}
          <div className="aop" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Table explanation header */}
            <div style={{ padding: '10px 14px 6px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.05)'}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? '#ccc' : '#333', fontFamily: 'Outfit,sans-serif', marginBottom: 4 }}>
                📋 Caerleon → BM Fırsatları — {filtered.length} aktif
              </div>
              <div style={{ fontSize: 8, color: '#888', fontFamily: 'Outfit,sans-serif', lineHeight: 1.6 }}>
                <strong style={{ color: GOLD }}>Nasıl çalışır:</strong> Caerleon marketten item satın al → Black Market'e yürü → anında sat. Vergi yok, risk yok.
                <br />
                <strong style={{ color: '#4caf50' }}>Caerleon Satış:</strong> Son görülen satış fiyatı (sell order). <strong style={{ color: '#e53935' }}>BM Alım:</strong> BM'nin o itemi aldığı fiyat (buy order).
                <br />
                <span style={{ color: '#ff9800' }}>⚠ Veriler oyuncuların Albion Data Client'ından geliyor. "Caerleon Yaşı" = o fiyat en son ne zaman görüldü. Eski veri = satılmış olabilir!</span>
              </div>
            </div>
            <div className="ao-table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.06)'}` }}>
                    <TH field="displayName" label="Item" {...{ filters, toggleSort }} />
                    <TH field="tier" label="Tier" {...{ filters, toggleSort }} />
                    <th className="ao-th" style={{ textAlign: 'center' }}>Kalite</th>
                    <TH field="sourcePrice" label="Caerleon Satış" {...{ filters, toggleSort }} />
                    <th className="ao-th" style={{ textAlign: 'right' }}>BM Alım</th>
                    <TH field="netProfit" label="Kâr" {...{ filters, toggleSort }} />
                    <TH field="profitPercent" label="%" {...{ filters, toggleSort }} />
                    <th className="ao-th" style={{ textAlign: 'center' }}>Caerleon Yaşı</th>
                    <th className="ao-th" style={{ textAlign: 'center' }}>BM Yaşı</th>
                    <th className="ao-th" style={{ textAlign: 'center' }}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ padding: 32, textAlign: 'center', color: '#666', fontSize: 11 }}>
                        {scan.status === 'idle' ? '⟳ "Scan" butonuna basarak Caerleon ↔ BM taramasını başlat.' :
                         scan.status === 'complete'
                          ? maxDataAge > 0
                            ? `Son ${maxDataAge} dakika içinde güncel veri bulunamadı. Daha fazla sonuç için "Hepsini göster"e tıklayın veya yeniden tarayın.`
                            : 'Filtrelere uyan fırsat bulunamadı.'
                          : ''}
                      </td>
                    </tr>
                  )}
                  {pageItems.map((o, i) => {
                    const srcAge = now - o.sourceDate.getTime()
                    const dstAge = now - o.destDate.getTime()
                    const worstAge = Math.max(srcAge, dstAge)
                    const bothUnder10m = srcAge < 600_000 && dstAge < 600_000
                    const bothUnder30m = srcAge < 1800_000 && dstAge < 1800_000
                    const bothUnder1h = srcAge < 3600_000 && dstAge < 3600_000
                    // Row opacity: dim stale rows
                    const rowOpacity = bothUnder10m ? 1 : bothUnder30m ? 0.9 : bothUnder1h ? 0.75 : 0.55
                    return (
                    <tr key={`${o.itemId}-${o.quality}-${i}`} className="ao-row" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.03)'}`, opacity: rowOpacity }}>
                      <td style={{ padding: '6px 8px', maxWidth: 240 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.displayName}
                          </span>
                          <span
                            title="Kopyalamak için tıkla — Albion marketinde bunu ara"
                            onClick={(e) => { copyText(gameSearchName(o.itemId)); const el = e.currentTarget; el.textContent = '✓ Kopyalandı!'; el.style.color = '#4caf50'; setTimeout(() => { el.textContent = '🔍 ' + gameSearchName(o.itemId); el.style.color = GOLD }, 1200) }}
                            style={{ fontSize: 8, color: GOLD, cursor: 'pointer', opacity: 0.7, fontFamily: 'Outfit,sans-serif' }}
                          >
                            🔍 {gameSearchName(o.itemId)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 10, color: '#888', textAlign: 'center' }}>
                        {o.tier}{o.enchantment ? `.${o.enchantment}` : ''}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}><QualityBadge q={o.quality} /></td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{fmtSilver(o.sourcePrice)}</div>
                        <div style={{ fontSize: 7, color: getTimestampColor(o.sourceDate), fontWeight: 600, fontFamily: 'Outfit,sans-serif' }}>
                          {srcAge < 60_000 ? 'AZ ÖNCE' : timeAgo(o.sourceDate)}
                        </div>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, fontWeight: 600, color: '#4caf50' }}>{fmtSilver(o.destPrice)}</div>
                        <div style={{ fontSize: 7, color: getTimestampColor(o.destDate), fontWeight: 600, fontFamily: 'Outfit,sans-serif' }}>
                          {dstAge < 60_000 ? 'AZ ÖNCE' : timeAgo(o.destDate)}
                        </div>
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: o.netProfit >= 50000 ? '#4caf50' : o.netProfit >= 15000 ? GOLD : isDark ? '#ccc' : '#444' }}>
                        {fmtSilver(o.netProfit)}
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                        color: o.profitPercent >= 50 ? '#4caf50' : o.profitPercent >= 20 ? GOLD : isDark ? '#ccc' : '#444' }}>
                        {o.profitPercent}%
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{ fontSize: 9, color: getTimestampColor(o.sourceDate), fontWeight: 600 }}>
                          {srcAge < 60_000 ? '🟢' : srcAge < 600_000 ? '🟢' : srcAge < 1800_000 ? '🟡' : '🔴'} {timeAgo(o.sourceDate)}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{ fontSize: 9, color: getTimestampColor(o.destDate), fontWeight: 600 }}>
                          {dstAge < 60_000 ? '🟢' : dstAge < 600_000 ? '🟢' : dstAge < 1800_000 ? '🟡' : '🔴'} {timeAgo(o.destDate)}
                        </span>
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        {bothUnder10m
                          ? <div>
                              <div style={{ color: '#4caf50', fontSize: 9, fontWeight: 800 }}>✅ GÜNCEL</div>
                              <div style={{ color: '#4caf50', fontSize: 7, fontFamily: 'Outfit,sans-serif' }}>Şu an aktif</div>
                            </div>
                          : bothUnder30m
                          ? <div>
                              <div style={{ color: '#ff9800', fontSize: 9, fontWeight: 800 }}>⚡ MUHTEMEL</div>
                              <div style={{ color: '#ff9800', fontSize: 7, fontFamily: 'Outfit,sans-serif' }}>Kontrol et</div>
                            </div>
                          : bothUnder1h
                          ? <div>
                              <div style={{ color: '#ff9800', fontSize: 9, fontWeight: 700 }}>⚠ RİSKLİ</div>
                              <div style={{ color: '#888', fontSize: 7, fontFamily: 'Outfit,sans-serif' }}>Satılmış olabilir</div>
                            </div>
                          : <div>
                              <div style={{ color: '#f44336', fontSize: 9, fontWeight: 700 }}>❌ ESKİ</div>
                              <div style={{ color: '#f44336', fontSize: 7, fontFamily: 'Outfit,sans-serif' }}>Büyük ihtimal yok</div>
                            </div>
                        }
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.06)'}` }}>
                <button className="aob" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ background: 'rgba(255,255,255,.06)', fontSize: 10, padding: '4px 10px' }}>‹</button>
                <span style={{ fontSize: 10, color: '#888', fontFamily: 'Outfit,sans-serif' }}>
                  {page} / {totalPages} <span style={{ color: '#555' }}>({filtered.length} results)</span>
                </span>
                <button className="aob" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ background: 'rgba(255,255,255,.06)', fontSize: 10, padding: '4px 10px' }}>›</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Sub-components ──

function LiquidityBadge({ score }: { score: number }) {
  const color = score >= 60 ? '#4caf50' : score >= 30 ? '#ff9800' : '#f44336'
  const label = score >= 60 ? 'HIGH LIQ' : score >= 30 ? 'MED LIQ' : 'LOW LIQ'
  return (
    <span className="ao-guide-tag" style={{ color, background: color + '18', border: `1px solid ${color}25`, fontSize: 7, letterSpacing: '.08em' }}>
      {label} {score}
    </span>
  )
}

function TradeCard({ t, i, isDark, taxMode, now }: { t: ArbitrageOpportunity; i: number; isDark: boolean; taxMode: TaxMode; now?: number }) {
  const v = t.volume
  const srcVerified = v && v.avgPriceSrc > 0
  const dstVerified = v && v.avgPriceDst > 0
  const srcDeviation = srcVerified ? Math.round(Math.abs(t.sourcePrice - v!.avgPriceSrc) / v!.avgPriceSrc * 100) : -1
  const dstDeviation = dstVerified ? Math.round(Math.abs(t.destPrice - v!.avgPriceDst) / v!.avgPriceDst * 100) : -1
  const confidence = srcVerified && dstVerified && srcDeviation < 30 && dstDeviation < 30
    ? 'HIGH' : srcVerified || dstVerified ? 'MED' : 'LOW'
  const confColor = confidence === 'HIGH' ? '#4caf50' : confidence === 'MED' ? '#ff9800' : '#f44336'
  const maxSafe = v ? Math.max(1, Math.floor((v.dailyVolumeDst > 0 ? v.dailyVolumeDst : v.dailyVolumeSrc) * 0.3)) : 1
  return (
    <div className="ao-guide-card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, fontWeight: 800, color: GOLD, minWidth: 20 }}>#{i + 1}</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{t.displayName}</span>
          <span style={{ fontSize: 9, color: '#888' }}>T{t.tier}{t.enchantment ? `.${t.enchantment}` : ''}</span>
          <QualityBadge q={t.quality} />
          <span
            title="Click to copy — search this in Albion marketplace"
            onClick={(e) => { copyText(gameSearchName(t.itemId)); const el = e.currentTarget; el.textContent = '✓ Kopyalandı!'; el.style.color = '#4caf50'; setTimeout(() => { el.textContent = '🔍 ' + gameSearchName(t.itemId); el.style.color = GOLD }, 1200) }}
            style={{ fontSize: 8, color: GOLD, cursor: 'pointer', opacity: 0.65, fontFamily: 'Outfit,sans-serif', background: 'rgba(212,168,67,.08)', padding: '1px 5px', borderRadius: 3, border: '1px solid rgba(212,168,67,.15)' }}
          >
            🔍 {gameSearchName(t.itemId)}
          </span>
          <span className={`ao-guide-tag ao-risk-${t.riskLevel}`} style={{ background: t.riskLevel === 'safe' ? 'rgba(76,175,80,.1)' : t.riskLevel === 'medium' ? 'rgba(255,152,0,.1)' : 'rgba(244,67,54,.1)' }}>
            {t.riskLevel === 'safe' ? '🛡️' : t.riskLevel === 'medium' ? '⚠️' : '💀'} {Math.round(t.deathRisk * 100)}% risk
          </span>
          {v && <LiquidityBadge score={v.liquidityScore} />}
          <span className="ao-guide-tag" style={{ color: confColor, background: confColor + '15', border: `1px solid ${confColor}25`, fontSize: 7 }}>
            {confidence === 'HIGH' ? '✓ VERIFIED' : confidence === 'MED' ? '~ PARTIAL' : '? UNVERIFIED'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 7, color: '#666', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'Outfit,sans-serif' }}>EV</div>
            <div className="ao-guide-ev" style={{ color: t.expectedValue > 0 ? '#4caf50' : '#f44336' }}>{fmtSilver(t.expectedValue)}</div>
          </div>
          <div>
            <div style={{ fontSize: 7, color: '#666', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'Outfit,sans-serif' }}>$/hr</div>
            <div className="ao-guide-ev" style={{ color: isDark ? '#ccc' : '#444' }}>{fmtSilver(t.profitPerHour)}</div>
          </div>
          <div>
            <div style={{ fontSize: 7, color: '#666', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'Outfit,sans-serif' }}>Net</div>
            <div className="ao-guide-profit" style={{ color: GOLD }}>{fmtSilver(t.netProfit)}</div>
          </div>
          <div>
            <div style={{ fontSize: 7, color: '#666', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'Outfit,sans-serif' }}>Qty</div>
            <div className="ao-guide-profit" style={{ color: '#2196f3', fontSize: 14 }}>{maxSafe}x</div>
          </div>
        </div>
      </div>

      {/* Compact steps */}
      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="ao-guide-num" style={{ width: 16, height: 16, fontSize: 7 }}>1</span>
          Buy <strong style={{ color: GOLD }}>{maxSafe}x</strong> at <CityBadge city={t.sourceCity} /> for <strong style={{ color: GOLD }}>{fmtSilver(t.sourcePrice)}</strong>
          {srcVerified && <em style={{ color: srcDeviation < 15 ? '#4caf50' : srcDeviation < 30 ? '#ff9800' : '#f44336', fontSize: 8 }}>
            ({fmtSilver(v!.avgPriceSrc)} avg, {srcDeviation}%)
          </em>}
        </span>
        <span style={{ color: '#555' }}>→</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="ao-guide-num" style={{ width: 16, height: 16, fontSize: 7 }}>2</span>
          {t.strategy === 'instant-sell'
            ? <>Sell at <CityBadge city={t.destCity} /> for <strong style={{ color: '#4caf50' }}>{fmtSilver(t.destPrice)}</strong></>
            : <>List at <CityBadge city={t.destCity} /> for <strong style={{ color: '#2196f3' }}>{fmtSilver(t.destPrice)}</strong></>
          }
          {dstVerified && <em style={{ color: dstDeviation < 15 ? '#4caf50' : dstDeviation < 30 ? '#ff9800' : '#f44336', fontSize: 8 }}>
            ({fmtSilver(v!.avgPriceDst)} avg, {dstDeviation}%)
          </em>}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 9, color: '#888', fontFamily: 'Outfit,sans-serif', padding: '5px 8px', background: isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.02)', borderRadius: 5 }}>
        <span>Cost: <strong>{fmtSilver(t.sourcePrice * maxSafe)}</strong></span>
        <span>Profit: <strong style={{ color: '#4caf50' }}>{fmtSilver(t.netProfit * maxSafe)}</strong> ({t.profitPercent}%)</span>
        {t.taxPaid > 0 && <span>Tax: <strong style={{ color: '#f44336' }}>-{fmtSilver(t.taxPaid * maxSafe)}</strong></span>}
        {v && <span>Vol: <strong style={{ color: v.dailyVolumeDst >= 10 ? '#4caf50' : v.dailyVolumeDst >= 3 ? '#ff9800' : '#f44336' }}>{v.dailyVolumeDst}/day</strong> dst</span>}
        {v && <span>Src: <strong>{v.dailyVolumeSrc}/day</strong></span>}
        <span>Risk: <strong className={`ao-risk-${t.riskLevel}`}>{Math.round(t.deathRisk * 100)}%</strong></span>
        {v && <span>Sell: <strong>{v.daysToSell <= 1 ? 'instant' : v.daysToSell < 99 ? `~${v.daysToSell}d` : '?'}</strong></span>}
        <span>EV: {fmtSilver(t.netProfit)}×{Math.round((1 - t.deathRisk) * 100)}% - {fmtSilver(t.sourcePrice)}×{Math.round(t.deathRisk * 100)}% = <strong style={{ color: t.expectedValue > 0 ? '#4caf50' : '#f44336' }}>{fmtSilver(t.expectedValue)}</strong></span>
      </div>

      {/* BM Buy Order Indicator */}
      {t.isBlackMarket && t.strategy === 'instant-sell' && (
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#4caf50', fontWeight: 600, fontFamily: 'Outfit,sans-serif', padding: '4px 8px', background: 'rgba(76,175,80,.06)', borderRadius: 4, border: '1px solid rgba(76,175,80,.1)' }}>
          💰 BM ACTIVE BUY ORDER @ <strong>{fmtSilver(t.destPrice)}</strong>
          <span style={{ color: '#888', fontWeight: 400 }}>— Instant sell to NPC, no tax, no waiting</span>
        </div>
      )}

      {/* Price timestamps — how fresh is this data? */}
      <div style={{ marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 8, color: '#555', fontFamily: 'Outfit,sans-serif', padding: '3px 8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          📡 Buy price updated: <strong style={{ color: getTimestampColor(t.sourceDate) }}>{timeAgo(t.sourceDate)}</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          📡 Sell price updated: <strong style={{ color: getTimestampColor(t.destDate) }}>{timeAgo(t.destDate)}</strong>
        </span>
        {now !== undefined && t.sourceDate && t.destDate && (() => {
          const oldestMs = Math.max(now - t.sourceDate.getTime(), now - t.destDate.getTime())
          const isFresh = oldestMs < 3600_000
          return (
            <span style={{ marginLeft: 'auto', color: isFresh ? '#4caf50' : oldestMs < 86400_000 ? '#ff9800' : '#f44336', fontWeight: 600 }}>
              {isFresh ? '✓ Prices fresh' : oldestMs < 86400_000 ? '⚠ Prices aging' : '✗ Prices stale'}
            </span>
          )
        })()}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: '#666', letterSpacing: '.1em', fontFamily: 'Outfit,sans-serif', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || 'inherit', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function TH({ field, label, filters, toggleSort }: { field: SortField; label: string; filters: FilterState; toggleSort: (f: SortField) => void }) {
  const active = filters.sortBy === field
  const arrow = active ? (filters.sortDir === 'desc' ? ' ▼' : ' ▲') : ''
  return (
    <th className={`ao-th${active ? ' active' : ''}`}
      onClick={() => toggleSort(field)}
      style={{ textAlign: field === 'displayName' || field === 'sourceCity' || field === 'destCity' || field === 'freshness' ? 'left' : 'right' }}>
      {label}{arrow}
    </th>
  )
}

function timeAgo(d: Date): string {
  const sec = Math.round((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  return `${Math.round(min / 60)}h ago`
}

function getTimestampColor(d: Date): string {
  const age = Date.now() - d.getTime()
  if (age < 600_000) return '#4caf50'      // < 10min = green (fresh for BM)
  if (age < 1800_000) return '#ff9800'     // < 30min = orange (check)
  return '#f44336'                          // > 30min = red (likely stale for BM)
}

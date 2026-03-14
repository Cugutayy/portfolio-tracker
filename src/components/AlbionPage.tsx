import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { albionApi } from '../albion/api'
import { loadItems, displayName } from '../albion/items'
import { validatePrices } from '../albion/validation'
import { findOpportunities } from '../albion/arbitrage'
import {
  ALL_LOCATIONS, CITIES, CITY_COLORS, CATEGORY_LABELS,
  DEFAULT_FILTERS, SCAN_INTERVAL,
} from '../albion/constants'
import type {
  ScanState, FilterState, ArbitrageOpportunity,
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
@media(max-width:800px){.ao-filters{flex-direction:column!important}.ao-table-wrap{overflow-x:auto}}
`

const PAGE_SIZE = 50
const GOLD = '#d4a843'

function fmtSilver(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
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
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanningRef = useRef(false)
  const isDark = dark !== false

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

      // 2. Fetch prices
      const raw = await albionApi.fetchAllPrices(ids, ALL_LOCATIONS, [1], (done, total) => {
        setScan(s => ({ ...s, batchesDone: done, batchesTotal: total, progress: Math.round((done / total) * 90) }))
      })

      // 3. Validate
      setScan(s => ({ ...s, status: 'analyzing', progress: 95 }))
      const valid = validatePrices(raw)

      // 4. Find opportunities
      const opps = findOpportunities(valid, itemList, taxMode)

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
    if (scan.status !== 'complete' || !scan.opportunities.length) return
    // Recalculate with new tax — need to re-scan since we don't store raw prices
    // For now, just note the tax mode affects next scan
  }, [taxMode])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRef.current = setInterval(() => { runScan() }, SCAN_INTERVAL)
      return () => { if (autoRef.current) clearInterval(autoRef.current) }
    } else {
      if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null }
    }
  }, [autoRefresh, runScan])

  // ── Filter + Sort + Paginate ──
  const filtered = useMemo(() => {
    let arr = scan.opportunities.filter(o => {
      if (o.netProfit < filters.minProfit) return false
      if (o.profitPercent < filters.minProfitPercent) return false
      if (filters.sourceCity !== 'all' && o.sourceCity !== filters.sourceCity) return false
      if (filters.destCity !== 'all' && o.destCity !== filters.destCity) return false
      if (filters.category !== 'all' && o.category !== filters.category) return false
      if (o.tier < filters.minTier || o.tier > filters.maxTier) return false
      if (!filters.showBlackMarket && o.isBlackMarket) return false
      if (!filters.showStale && o.freshness === 'stale') return false
      if (strategyFilter !== 'all' && o.strategy !== strategyFilter) return false
      if (filters.search && !o.displayName.toLowerCase().includes(filters.search.toLowerCase()) && !o.itemId.toLowerCase().includes(filters.search.toLowerCase())) return false
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
  }, [scan.opportunities, filters, strategyFilter])

  // Top trades candidates (pre-volume enrichment)
  const topCandidates = useMemo(() => {
    if (!filtered.length) return []
    return [...filtered]
      .filter(o => o.expectedValue > 0 && o.freshness !== 'stale')
      .sort((a, b) => b.expectedValue - a.expectedValue)
      .slice(0, 30) // take more to filter by volume later
  }, [filtered])

  // Enriched top trades with volume data
  const [enrichedTrades, setEnrichedTrades] = useState<ArbitrageOpportunity[]>([])
  const [enriching, setEnriching] = useState(false)

  // Fetch volume data for top candidates when scan completes
  useEffect(() => {
    if (scan.status !== 'complete' || !topCandidates.length) {
      setEnrichedTrades([])
      return
    }
    let cancelled = false
    ;(async () => {
      setEnriching(true)
      try {
        // Collect unique item IDs from candidates
        const uniqueItems = [...new Set(topCandidates.map(t => t.itemId))]
        // Fetch history in small batches
        const allHistory: Map<string, { city: string; avgVol: number; avgPrice: number }[]> = new Map()
        for (let i = 0; i < uniqueItems.length; i += 10) {
          if (cancelled) return
          const batch = uniqueItems.slice(i, i + 10)
          try {
            const hist = await albionApi.fetchItemHistory(batch, ALL_LOCATIONS)
            for (const h of hist) {
              const key = h.item_id
              const points = h.data.filter(d => d.item_count > 0)
              if (!points.length) continue
              const avgVol = points.reduce((s, d) => s + d.item_count, 0) / Math.max(points.length, 1)
              const avgPrice = points.reduce((s, d) => s + d.avg_price, 0) / Math.max(points.length, 1)
              const existing = allHistory.get(key) || []
              existing.push({ city: h.location, avgVol, avgPrice })
              allHistory.set(key, existing)
            }
          } catch { /* continue with partial data */ }
        }
        if (cancelled) return

        // Enrich candidates with volume data and filter
        const enriched: ArbitrageOpportunity[] = []
        for (const trade of topCandidates) {
          const histEntries = allHistory.get(trade.itemId) || []
          const srcHist = histEntries.find(h => h.city === trade.sourceCity)
          const dstHist = histEntries.find(h => h.city === trade.destCity)

          const dailyVolSrc = srcHist?.avgVol || 0
          const dailyVolDst = dstHist?.avgVol || 0
          const avgPriceSrc = srcHist?.avgPrice || 0
          const avgPriceDst = dstHist?.avgPrice || 0

          // Skip items with zero volume in BOTH cities (never traded → untradable)
          if (dailyVolSrc === 0 && dailyVolDst === 0) continue

          // For sell-order: validate current price against historical average
          // If current dest sell_price_min is > 2x the historical avg, it's likely fake
          if (trade.strategy === 'sell-order' && avgPriceDst > 0 && trade.destPrice > avgPriceDst * 2) continue

          // Recommended quantity: min(30% of daily dest volume, affordable amount)
          const destVol = Math.max(dailyVolDst, dailyVolSrc * 0.5) // estimate if dest has low vol
          const recommendedQty = Math.max(1, Math.floor(destVol * 0.3))
          const daysToSell = recommendedQty > 0 && destVol > 0
            ? Math.ceil(recommendedQty / destVol)
            : 99

          // Liquidity score (0-100)
          // Based on: dest volume, price consistency, market depth
          let liquidityScore = 0
          if (destVol >= 50) liquidityScore += 40
          else if (destVol >= 10) liquidityScore += 25
          else if (destVol >= 3) liquidityScore += 15
          else if (destVol > 0) liquidityScore += 5

          if (dailyVolSrc >= 10) liquidityScore += 20
          else if (dailyVolSrc >= 3) liquidityScore += 10
          else if (dailyVolSrc > 0) liquidityScore += 5

          // Price consistency bonus
          if (avgPriceSrc > 0 && Math.abs(trade.sourcePrice - avgPriceSrc) / avgPriceSrc < 0.3) liquidityScore += 20
          if (avgPriceDst > 0 && Math.abs(trade.destPrice - avgPriceDst) / avgPriceDst < 0.3) liquidityScore += 20

          const volume: VolumeData = {
            dailyVolumeSrc: Math.round(dailyVolSrc * 10) / 10,
            dailyVolumeDst: Math.round(dailyVolDst * 10) / 10,
            avgPriceSrc: Math.round(avgPriceSrc),
            avgPriceDst: Math.round(avgPriceDst),
            recommendedQty,
            liquidityScore: Math.min(100, liquidityScore),
            daysToSell,
          }

          enriched.push({ ...trade, volume })
        }

        // Sort by expectedValue * liquidityScore (balance profit with sellability)
        enriched.sort((a, b) => {
          const scoreA = a.expectedValue * (a.volume?.liquidityScore || 0)
          const scoreB = b.expectedValue * (b.volume?.liquidityScore || 0)
          return scoreB - scoreA
        })

        if (!cancelled) setEnrichedTrades(enriched.slice(0, 10))
      } catch (err) {
        console.error('Volume enrichment failed:', err)
        // Fallback to non-enriched
        if (!cancelled) setEnrichedTrades(topCandidates.slice(0, 10))
      } finally {
        if (!cancelled) setEnriching(false)
      }
    })()
    return () => { cancelled = true }
  }, [scan.status, topCandidates])

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
              <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '.06em' }}>ALBION MARKET</span>
            </div>
            <div style={{ flex: 1 }} />
            <button className="aob" onClick={runScan} disabled={isScanning}
              style={{ background: `linear-gradient(135deg, ${GOLD}, #a07828)`, fontSize: 10 }}>
              {isScanning ? <><span className="ao-spinner" style={{ width: 10, height: 10, marginRight: 4, verticalAlign: 'middle' }} /> Scanning...</> : '⟳ Scan'}
            </button>
            <button className="aob" onClick={() => setAutoRefresh(!autoRefresh)}
              style={{ background: autoRefresh ? 'rgba(76,175,80,.25)' : 'rgba(255,255,255,.06)', fontSize: 10, color: autoRefresh ? '#4caf50' : isDark ? '#aaa' : '#666' }}>
              {autoRefresh ? '● Auto' : '○ Auto'}
            </button>
            <button className="aob" onClick={() => setTaxMode(taxMode === 'premium' ? 'normal' : 'premium')}
              style={{ background: taxMode === 'premium' ? 'rgba(212,168,67,.15)' : 'rgba(255,255,255,.06)', fontSize: 10, color: taxMode === 'premium' ? GOLD : isDark ? '#aaa' : '#666' }}>
              {taxMode === 'premium' ? '★ Premium' : '☆ Normal'} ({taxMode === 'premium' ? '4%' : '6.5%'})
            </button>
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
          <div className="aop" style={{ marginBottom: 12, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatBox label="Items Scanned" value={scan.itemsTotal ? fmtSilver(scan.itemsTotal) : '—'} />
            <StatBox label="Opportunities" value={String(filtered.length)} color={GOLD} />
            <StatBox label="Total Profit" value={filtered.length ? fmtSilver(totalProfit) : '—'} />
            <StatBox label="Avg Profit %" value={filtered.length ? `${avgPercent}%` : '—'} />
            <StatBox label="Last Scan" value={scan.lastScanTime ? timeAgo(scan.lastScanTime) : '—'} />
            <StatBox label="API Calls" value={String(albionApi.requestCount)} />
          </div>

          {/* ── Top Trades Guide ── */}
          {(enrichedTrades.length > 0 || enriching) && (
            <div className="aop" style={{ marginBottom: 12 }}>
              <div className="aot">Top 10 Trades — Step-by-Step Guide</div>
              <div style={{ fontSize: 9, color: '#888', marginBottom: 10, fontFamily: 'Outfit,sans-serif' }}>
                Ranked by Expected Value × Liquidity. Filters out zero-volume items and validates prices against 7-day historical averages.
              </div>
              {enriching && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#888', padding: 12 }}>
                  <span className="ao-spinner" style={{ width: 12, height: 12 }} />
                  Fetching volume data and validating prices...
                </div>
              )}
              {enrichedTrades.map((t, i) => {
                const v = t.volume
                return (
                <div key={`guide-${i}`} className="ao-guide-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 12, fontWeight: 800, color: GOLD, minWidth: 18 }}>#{i + 1}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{t.displayName}</span>
                      <span className={`ao-strategy ${t.strategy === 'instant-sell' ? 'ao-strategy-instant' : 'ao-strategy-sell'}`}>
                        {t.strategy === 'instant-sell' ? 'INSTANT' : 'ORDER'}
                      </span>
                      <span className={`ao-guide-tag ao-risk-${t.riskLevel}`} style={{ background: t.riskLevel === 'safe' ? 'rgba(76,175,80,.1)' : t.riskLevel === 'medium' ? 'rgba(255,152,0,.1)' : 'rgba(244,67,54,.1)' }}>
                        {t.riskLevel === 'safe' ? '🛡️' : t.riskLevel === 'medium' ? '⚠️' : '💀'} {Math.round(t.deathRisk * 100)}% risk
                      </span>
                      {v && <LiquidityBadge score={v.liquidityScore} />}
                    </div>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 7, color: '#888', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'Outfit,sans-serif' }}>Expected Value</div>
                        <div className="ao-guide-ev" style={{ color: t.expectedValue > 0 ? '#4caf50' : '#f44336' }}>{fmtSilver(t.expectedValue)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 7, color: '#888', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'Outfit,sans-serif' }}>Per Hour</div>
                        <div className="ao-guide-ev" style={{ color: isDark ? '#ccc' : '#444' }}>{fmtSilver(t.profitPerHour)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 7, color: '#888', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'Outfit,sans-serif' }}>Net Profit</div>
                        <div className="ao-guide-profit" style={{ color: GOLD }}>{fmtSilver(t.netProfit)}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div className="ao-guide-step">
                      <span className="ao-guide-num">1</span>
                      <span>Go to <CityBadge city={t.sourceCity} /> marketplace. Search for <strong>{t.displayName}</strong>.</span>
                    </div>
                    <div className="ao-guide-step">
                      <span className="ao-guide-num">2</span>
                      <span>
                        Buy <strong style={{ color: GOLD }}>{v ? v.recommendedQty : 1}x</strong> at <strong style={{ color: GOLD }}>{fmtSilver(t.sourcePrice)}</strong> silver each.
                        {v && v.avgPriceSrc > 0 && <em style={{ color: '#888' }}> (7d avg: {fmtSilver(v.avgPriceSrc)})</em>}
                        {v ? <> — Total cost: <strong>{fmtSilver(t.sourcePrice * v.recommendedQty)}</strong></> : null}
                      </span>
                    </div>
                    <div className="ao-guide-step">
                      <span className="ao-guide-num">3</span>
                      <span>
                        Transport to <CityBadge city={t.destCity} />
                        {' '}(~{t.transportMinutes} min).
                        {t.riskLevel === 'safe' && ' Safe zone roads — low risk.'}
                        {t.riskLevel === 'medium' && ' Red zone roads — use fast mount, avoid gankers.'}
                        {t.riskLevel === 'dangerous' && ' Black zone — high death risk! Use scout or travel light.'}
                      </span>
                    </div>
                    <div className="ao-guide-step">
                      <span className="ao-guide-num">4</span>
                      <span>
                        {t.strategy === 'instant-sell'
                          ? <>Instant-sell to buy order at <strong style={{ color: '#4caf50' }}>{fmtSilver(t.destPrice)}</strong> silver. <em style={{ color: '#888' }}>No tax. Immediate profit.</em></>
                          : <>List sell order at <strong style={{ color: '#2196f3' }}>{fmtSilver(t.destPrice)}</strong> silver.
                              <em style={{ color: '#888' }}> Tax: {fmtSilver(t.taxPaid)}.
                              {v && v.avgPriceDst > 0 && <> 7d avg: {fmtSilver(v.avgPriceDst)}.</>}
                              {v && v.daysToSell <= 1 ? ' Should sell within a day.' : v && v.daysToSell <= 3 ? ` ~${v.daysToSell} days to sell.` : ' May take time to sell.'}
                              </em>
                            </>
                        }
                      </span>
                    </div>
                  </div>

                  {/* Volume & Liquidity Stats */}
                  <div style={{ marginTop: 8, padding: '6px 8px', background: isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.02)', borderRadius: 6, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 9, color: '#888', fontFamily: 'Outfit,sans-serif' }}>
                    <span>Profit/unit: <strong style={{ color: '#4caf50' }}>{fmtSilver(t.netProfit)}</strong> ({t.profitPercent}%)</span>
                    {v && <>
                      <span>Qty: <strong style={{ color: GOLD }}>{v.recommendedQty}x</strong></span>
                      <span>Total profit: <strong style={{ color: '#4caf50' }}>{fmtSilver(t.netProfit * v.recommendedQty)}</strong></span>
                      <span>Vol/day src: <strong>{v.dailyVolumeSrc}</strong></span>
                      <span>Vol/day dst: <strong>{v.dailyVolumeDst}</strong></span>
                      <span>Sell time: <strong>{v.daysToSell <= 1 ? '<1 day' : `~${v.daysToSell} days`}</strong></span>
                    </>}
                    <span>Risk: <strong className={`ao-risk-${t.riskLevel}`}>{Math.round(t.deathRisk * 100)}%</strong></span>
                    <span>Data: <FreshBadge f={t.freshness} /></span>
                  </div>
                </div>
                )
              })}
            </div>
          )}

          {/* ── Filters ── */}
          <div className="aop" style={{ marginBottom: 12 }}>
            <div className="aot">Filters</div>
            <div className="ao-filters" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontSize: 9, color: '#888' }}>
                Min Profit
                <input className="ao-input" type="number" value={filters.minProfit} onChange={e => updateFilter('minProfit', Number(e.target.value))} style={{ width: 70, marginLeft: 4 }} />
              </label>
              <label style={{ fontSize: 9, color: '#888' }}>
                Min %
                <input className="ao-input" type="number" value={filters.minProfitPercent} onChange={e => updateFilter('minProfitPercent', Number(e.target.value))} style={{ width: 50, marginLeft: 4 }} />
              </label>
              <label style={{ fontSize: 9, color: '#888' }}>
                Source
                <select className="ao-select" value={filters.sourceCity} onChange={e => updateFilter('sourceCity', e.target.value as City | 'all')} style={{ marginLeft: 4 }}>
                  <option value="all">All</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 9, color: '#888' }}>
                Dest
                <select className="ao-select" value={filters.destCity} onChange={e => updateFilter('destCity', e.target.value as City | 'all')} style={{ marginLeft: 4 }}>
                  <option value="all">All</option>
                  {ALL_LOCATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 9, color: '#888' }}>
                Category
                <select className="ao-select" value={filters.category} onChange={e => updateFilter('category', e.target.value)} style={{ marginLeft: 4 }}>
                  <option value="all">All</option>
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
              <label style={{ fontSize: 9, color: '#888' }}>
                Strategy
                <select className="ao-select" value={strategyFilter} onChange={e => { setStrategyFilter(e.target.value as TradeStrategy | 'all'); setPage(1) }} style={{ marginLeft: 4 }}>
                  <option value="all">All</option>
                  <option value="instant-sell">Instant Sell</option>
                  <option value="sell-order">Sell Order</option>
                </select>
              </label>
              <label style={{ fontSize: 9, color: '#888', display: 'flex', alignItems: 'center', gap: 3 }}>
                <input className="ao-check" type="checkbox" checked={filters.showBlackMarket} onChange={e => updateFilter('showBlackMarket', e.target.checked)} />
                BM
              </label>
              <label style={{ fontSize: 9, color: '#888', display: 'flex', alignItems: 'center', gap: 3 }}>
                <input className="ao-check" type="checkbox" checked={filters.showStale} onChange={e => updateFilter('showStale', e.target.checked)} />
                Stale
              </label>
              <input className="ao-input" placeholder="Search item..." value={filters.search} onChange={e => updateFilter('search', e.target.value)} style={{ width: 130 }} />
            </div>
          </div>

          {/* ── Results Table ── */}
          <div className="aop" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="ao-table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.06)'}` }}>
                    <TH field="displayName" label="Item" {...{ filters, toggleSort }} />
                    <TH field="tier" label="Tier" {...{ filters, toggleSort }} />
                    <th className="ao-th" style={{ textAlign: 'center' }}>Type</th>
                    <TH field="sourceCity" label="Buy City" {...{ filters, toggleSort }} />
                    <TH field="sourcePrice" label="Buy Price" {...{ filters, toggleSort }} />
                    <TH field="destCity" label="Sell City" {...{ filters, toggleSort }} />
                    <th className="ao-th" style={{ textAlign: 'right' }}>Sell Price</th>
                    <TH field="netProfit" label="Net Profit" {...{ filters, toggleSort }} />
                    <TH field="profitPercent" label="%" {...{ filters, toggleSort }} />
                    <TH field="expectedValue" label="EV" {...{ filters, toggleSort }} />
                    <TH field="profitPerHour" label="$/hr" {...{ filters, toggleSort }} />
                    <TH field="freshness" label="Age" {...{ filters, toggleSort }} />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={12} style={{ padding: 32, textAlign: 'center', color: '#666', fontSize: 12 }}>
                        {scan.status === 'idle' ? 'Click "Scan" to start scanning the market.' :
                         scan.status === 'complete' ? 'No opportunities match your filters.' : ''}
                      </td>
                    </tr>
                  )}
                  {pageItems.map((o, i) => (
                    <tr key={`${o.itemId}-${o.sourceCity}-${o.destCity}-${o.strategy}-${i}`} className="ao-row" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.03)'}` }}>
                      <td style={{ padding: '6px 8px', fontSize: 11, fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.displayName}
                        {o.isBlackMarket && <span style={{ marginLeft: 4, fontSize: 8, color: GOLD, fontWeight: 700 }}>BM</span>}
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 10, color: '#888', textAlign: 'center' }}>
                        {o.tier}{o.enchantment ? `.${o.enchantment}` : ''}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span className={`ao-strategy ${o.strategy === 'instant-sell' ? 'ao-strategy-instant' : 'ao-strategy-sell'}`}>
                          {o.strategy === 'instant-sell' ? 'INSTANT' : 'ORDER'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px' }}><CityBadge city={o.sourceCity} /></td>
                      <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtSilver(o.sourcePrice)}
                      </td>
                      <td style={{ padding: '6px 8px' }}><CityBadge city={o.destCity} /></td>
                      <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtSilver(o.destPrice)}
                        {o.taxPaid > 0 && <span style={{ fontSize: 8, color: '#f44336', marginLeft: 2 }}>-{fmtSilver(o.taxPaid)}</span>}
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                        color: o.netProfit >= 50000 ? '#4caf50' : o.netProfit >= 15000 ? GOLD : isDark ? '#ccc' : '#444' }}>
                        {fmtSilver(o.netProfit)}
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                        color: o.profitPercent >= 50 ? '#4caf50' : o.profitPercent >= 20 ? GOLD : isDark ? '#ccc' : '#444' }}>
                        {o.profitPercent}%
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                        color: o.expectedValue > 0 ? (o.riskLevel === 'safe' ? '#4caf50' : o.riskLevel === 'medium' ? '#ff9800' : '#f44336') : '#f44336' }}>
                        {fmtSilver(o.expectedValue)}
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: isDark ? '#aaa' : '#666' }}>
                        {fmtSilver(o.profitPerHour)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <FreshBadge f={o.freshness} />
                      </td>
                    </tr>
                  ))}
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

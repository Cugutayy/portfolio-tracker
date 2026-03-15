/**
 * Albion Item List Loader
 * =======================
 * Loads item metadata from ao-bin-dumps, filters to T4+ tradable items,
 * caches parsed list in localStorage.
 * Also loads English display names from formatted/items.txt.
 */

import type { AlbionItem } from './types'
import { ITEMS_URL, ITEM_NAMES_URL, ITEMS_CACHE_TTL, TRADABLE_CATEGORIES } from './constants'

const CACHE_KEY = 'albion_items_v2'
const NAMES_CACHE_KEY = 'albion_names_v1'

interface CachedItems {
  items: AlbionItem[]
  timestamp: number
}

interface CachedNames {
  names: Record<string, string>
  timestamp: number
}

// In-memory name map (loaded once)
let nameMap: Map<string, string> | null = null

/** Load English display names from ao-bin-dumps formatted/items.txt (~946KB) */
async function loadNameMap(): Promise<Map<string, string>> {
  if (nameMap) return nameMap

  // Check localStorage cache
  try {
    const raw = localStorage.getItem(NAMES_CACHE_KEY)
    if (raw) {
      const cached: CachedNames = JSON.parse(raw)
      if (Date.now() - cached.timestamp < ITEMS_CACHE_TTL) {
        nameMap = new Map(Object.entries(cached.names))
        return nameMap
      }
    }
  } catch { /* ignore */ }

  // Fetch from GitHub
  try {
    const res = await fetch(ITEM_NAMES_URL, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()

    const map = new Map<string, string>()
    // Format: "  123: T4_MAIN_AXE                    : Adept's Battleaxe"
    for (const line of text.split('\n')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const rest = line.slice(colonIdx + 1).trim()
      const colonIdx2 = rest.indexOf(':')
      if (colonIdx2 === -1) continue
      const uniqueName = rest.slice(0, colonIdx2).trim()
      const englishName = rest.slice(colonIdx2 + 1).trim()
      if (uniqueName && englishName) {
        map.set(uniqueName, englishName)
      }
    }

    // Cache in localStorage (store as plain object for JSON)
    try {
      const obj: Record<string, string> = {}
      // Only cache T4+ items to save space
      for (const [k, v] of map) {
        if (/^T[4-8]_/.test(k)) obj[k] = v
      }
      localStorage.setItem(NAMES_CACHE_KEY, JSON.stringify({ names: obj, timestamp: Date.now() }))
    } catch { /* localStorage full */ }

    nameMap = map
    return map
  } catch (err) {
    console.warn('Failed to load item names:', err)
    nameMap = new Map()
    return nameMap
  }
}

/** Load and filter all tradable items (tier >= 4) */
export async function loadItems(): Promise<AlbionItem[]> {
  // Check localStorage cache
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const cached: CachedItems = JSON.parse(raw)
      if (Date.now() - cached.timestamp < ITEMS_CACHE_TTL) {
        // Also trigger name map loading in parallel
        loadNameMap()
        return cached.items
      }
    }
  } catch { /* ignore */ }

  // Fetch items + names in parallel
  const [itemsRes] = await Promise.all([
    fetch(ITEMS_URL, { signal: AbortSignal.timeout(30000) }),
    loadNameMap(), // Load name map in parallel
  ])
  if (!itemsRes.ok) throw new Error(`Failed to fetch items: HTTP ${itemsRes.status}`)
  const data = await itemsRes.json()

  const items: AlbionItem[] = []

  const processEntry = (entry: any, category: string) => {
    if (!entry) return
    const name: string = entry.UniqueName || entry['@uniquename'] || entry.uniquename || ''
    if (!name) return
    const tierRaw = entry.Tier || entry['@tier'] || entry.tier || 0
    const tier = typeof tierRaw === 'string' ? parseInt(tierRaw, 10) : tierRaw
    if (tier < 4 || !isFinite(tier)) return

    items.push({ uniqueName: name, tier, enchantment: 0, category })

    // Expand enchantment variants (@1, @2, @3, @4)
    const enchantments = entry.Enchantments?.Enchantment || entry.enchantments?.enchantment
    if (enchantments) {
      const enchList = Array.isArray(enchantments) ? enchantments : [enchantments]
      for (const ench of enchList) {
        const lvl = parseInt(ench.EnchantmentLevel || ench['@enchantmentlevel'] || ench.enchantmentLevel || '0', 10)
        if (lvl > 0 && lvl <= 4) {
          items.push({ uniqueName: `${name}@${lvl}`, tier, enchantment: lvl, category })
        }
      }
    }
  }

  if (Array.isArray(data)) {
    for (const entry of data) {
      const cat = (entry.Category || entry.category || entry['@shopcategory'] || 'simpleitem').toLowerCase()
      if (TRADABLE_CATEGORIES.has(cat) || TRADABLE_CATEGORIES.has(entry.Type || '')) {
        processEntry(entry, cat)
      }
    }
  } else if (data.items) {
    const itemsRoot = data.items
    for (const category of TRADABLE_CATEGORIES) {
      const list = itemsRoot[category]
      if (!list) continue
      const entries = Array.isArray(list) ? list : [list]
      for (const entry of entries) {
        processEntry(entry, category)
      }
    }
  }

  // Cache in localStorage
  try {
    const payload: CachedItems = { items, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch { /* localStorage full */ }

  return items
}

/**
 * Get the real English display name for an item.
 * T7_HEAD_PLATE_SET1@2 → "Grandmaster's Soldier Helmet"
 * T7_CAPEITEM_KEEPER@1 → "Grandmaster's Keeper Cape"
 * Falls back to cleaned-up ID if name map not loaded yet.
 */
export function displayName(uniqueName: string): string {
  // Try exact match first (includes enchantment)
  if (nameMap?.has(uniqueName)) {
    return nameMap.get(uniqueName)!
  }
  // Try without enchantment
  const baseId = uniqueName.replace(/@\d+$/, '')
  if (nameMap?.has(baseId)) {
    return nameMap.get(baseId)!
  }
  // Fallback: clean up the ID manually
  let name = uniqueName
  let ench = ''
  const atIdx = name.indexOf('@')
  if (atIdx !== -1) {
    ench = ` .${name.slice(atIdx + 1)}`
    name = name.slice(0, atIdx)
  }
  const parts = name.split('_')
  const tierPart = parts[0]
  const rest = parts.slice(1).map(p =>
    p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  ).join(' ')
  return `${tierPart} ${rest}${ench}`.trim()
}

/**
 * Get the in-game search name (what to type in Albion marketplace).
 * Uses the real English name from the name map.
 * T7_HEAD_PLATE_SET1@2 → "Grandmaster's Soldier Helmet"
 * Falls back to cleaned-up ID if not available.
 */
export function gameSearchName(uniqueName: string): string {
  // Try real name from map (includes tier prefix like "Grandmaster's")
  if (nameMap?.has(uniqueName)) {
    return nameMap.get(uniqueName)!
  }
  const baseId = uniqueName.replace(/@\d+$/, '')
  if (nameMap?.has(baseId)) {
    return nameMap.get(baseId)!
  }
  // Fallback
  let name = uniqueName
  const atIdx = name.indexOf('@')
  if (atIdx !== -1) name = name.slice(0, atIdx)
  name = name.replace(/^T\d+_/, '')
  const words = name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  return words.join(' ')
}

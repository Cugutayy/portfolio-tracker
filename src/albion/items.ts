/**
 * Albion Item List Loader
 * =======================
 * Loads item metadata from ao-bin-dumps, filters to T4+ tradable items,
 * caches parsed list in localStorage.
 */

import type { AlbionItem } from './types'
import { ITEMS_URL, ITEMS_CACHE_TTL, TRADABLE_CATEGORIES } from './constants'

const CACHE_KEY = 'albion_items_v2'

interface CachedItems {
  items: AlbionItem[]
  timestamp: number
}

/** Load and filter all tradable items (tier >= 4) */
export async function loadItems(): Promise<AlbionItem[]> {
  // Check localStorage cache
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const cached: CachedItems = JSON.parse(raw)
      if (Date.now() - cached.timestamp < ITEMS_CACHE_TTL) {
        return cached.items
      }
    }
  } catch { /* ignore */ }

  // Fetch from GitHub
  const res = await fetch(ITEMS_URL, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`Failed to fetch items: HTTP ${res.status}`)
  const data = await res.json()

  const items: AlbionItem[] = []

  // ao-bin-dumps structure: array of objects with UniqueName, etc.
  // The format can be either a flat array or nested by category.
  // Let's handle both cases.
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

  // Handle the ao-bin-dumps JSON structure
  if (Array.isArray(data)) {
    // Flat array format
    for (const entry of data) {
      const cat = (entry.Category || entry.category || entry['@shopcategory'] || 'simpleitem').toLowerCase()
      if (TRADABLE_CATEGORIES.has(cat) || TRADABLE_CATEGORIES.has(entry.Type || '')) {
        processEntry(entry, cat)
      }
    }
  } else if (data.items) {
    // Nested format: data.items.equipmentitem[], data.items.weapon[], etc.
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
  } catch { /* localStorage full — continue without caching */ }

  return items
}

/** Convert uniqueName to display name: T6_MAIN_AXE@2 → T6 Main Axe .2 */
export function displayName(uniqueName: string): string {
  let name = uniqueName
  let ench = ''
  const atIdx = name.indexOf('@')
  if (atIdx !== -1) {
    ench = ` .${name.slice(atIdx + 1)}`
    name = name.slice(0, atIdx)
  }
  // Remove tier prefix for cleaner display but keep tier info
  const parts = name.split('_')
  const tierPart = parts[0] // e.g. "T6"
  const rest = parts.slice(1).map(p =>
    p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  ).join(' ')
  return `${tierPart} ${rest}${ench}`.trim()
}

/**
 * Convert uniqueName to the name you search in Albion's in-game marketplace.
 * T6_HEAD_PLATE_ROYAL@4 → "Royal Helmet"
 * T4_2H_CROSSBOW@1     → "Crossbow"
 * T7_MAIN_AXE           → "Battleaxe"
 *
 * The marketplace search in Albion uses the item's English display name
 * (not the internal ID). This provides a best-effort mapping.
 * Strip the tier prefix, "2H_"/"MAIN_"/"OFF_"/"HEAD_"/"ARMOR_"/"SHOES_" prefixes,
 * and convert to readable English.
 */
export function gameSearchName(uniqueName: string): string {
  let name = uniqueName
  // Strip enchantment
  const atIdx = name.indexOf('@')
  if (atIdx !== -1) name = name.slice(0, atIdx)
  // Strip tier prefix (T4_, T5_, etc.)
  name = name.replace(/^T\d+_/, '')
  // The remaining part is the item type, e.g. "HEAD_PLATE_ROYAL", "2H_CROSSBOW", "MAIN_AXE"
  // Convert underscores to spaces and title case
  const words = name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  return words.join(' ')
}

export interface CategoryDef {
  key: EventCategory;
  emoji: string;
  label: string;
  color: string;
}

export type EventCategory = "spor" | "kosu" | "kafe" | "kitap" | "oyun" | "muzik" | "saglik" | "diger";

export const CATEGORIES: CategoryDef[] = [
  { key: "spor", emoji: "\u{1F3D0}", label: "Spor", color: "#FF6B35" },
  { key: "kosu", emoji: "\u{1F3C3}", label: "Kosu", color: "#10B981" },
  { key: "kafe", emoji: "\u2615", label: "Kafe", color: "#A78BFA" },
  { key: "kitap", emoji: "\u{1F4DA}", label: "Kitap", color: "#60A5FA" },
  { key: "oyun", emoji: "\u{1F3AE}", label: "Oyun", color: "#F472B6" },
  { key: "muzik", emoji: "\u{1F3B5}", label: "Muzik", color: "#FBBF24" },
  { key: "saglik", emoji: "\u{1F9D8}", label: "Saglik", color: "#34D399" },
  { key: "diger", emoji: "\u{1F3AF}", label: "Diger", color: "#8B949E" },
];

export const CATEGORY_MAP: Record<EventCategory, CategoryDef> =
  Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<EventCategory, CategoryDef>;

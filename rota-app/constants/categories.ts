export interface CategoryDef {
  key: EventCategory;
  icon: string; // Ionicons name
  label: string;
  color: string;
  gradient: [string, string];
  placeholder: string; // placeholder text for event title
}

export type EventCategory = "spor" | "kosu" | "kafe" | "kitap" | "oyun" | "muzik" | "saglik" | "diger";

export const CATEGORIES: CategoryDef[] = [
  { key: "spor", icon: "basketball-outline", label: "Spor", color: "#FF6B35", gradient: ["#FF6B35", "#FF9F43"], placeholder: "Sahilde voleybol, parkta futbol..." },
  { key: "kosu", icon: "fitness-outline", label: "Kosu", color: "#10B981", gradient: ["#059669", "#10B981"], placeholder: "Kordon sabah kosusu, tempo antrenman..." },
  { key: "kafe", icon: "cafe-outline", label: "Kafe", color: "#A78BFA", gradient: ["#7C3AED", "#A78BFA"], placeholder: "Kordon'da kahve, sohbet bulusmasi..." },
  { key: "kitap", icon: "book-outline", label: "Kitap", color: "#60A5FA", gradient: ["#3B82F6", "#60A5FA"], placeholder: "Kitap kulübu, kütüphane bulusmasi..." },
  { key: "oyun", icon: "game-controller-outline", label: "Oyun", color: "#F472B6", gradient: ["#EC4899", "#F472B6"], placeholder: "Board game gecesi, PS turnuvasi..." },
  { key: "muzik", icon: "musical-notes-outline", label: "Muzik", color: "#FBBF24", gradient: ["#D97706", "#FBBF24"], placeholder: "Jam session, konser, acik hava muzik..." },
  { key: "saglik", icon: "leaf-outline", label: "Saglik", color: "#34D399", gradient: ["#059669", "#34D399"], placeholder: "Yoga, meditasyon, yürüyüs..." },
  { key: "diger", icon: "sparkles-outline", label: "Diger", color: "#8B949E", gradient: ["#6B7280", "#8B949E"], placeholder: "Quiz gecesi, atölye, tanisma..." },
];

export const CATEGORY_MAP: Record<EventCategory, CategoryDef> =
  Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<EventCategory, CategoryDef>;

/** Map old event types to new categories */
export function eventTypeToCategory(eventType: string | undefined | null): EventCategory {
  const map: Record<string, EventCategory> = {
    group_run: "kosu", tempo_run: "kosu", long_run: "kosu",
    interval: "kosu", trail_run: "kosu", race: "kosu",
    social: "kafe",
  };
  return map[eventType || ""] || "diger";
}

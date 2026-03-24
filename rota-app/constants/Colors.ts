export const brand = {
  // Turkuaz ferah palette — modern, clean, refreshing
  bg: "#0D1117",           // GitHub dark — deep but not harsh
  surface: "#161B22",      // card background — subtle lift
  elevated: "#21262D",     // elevated panels, modals
  accent: "#00D4AA",       // turkuaz — fresh, nature, clean air
  accentDim: "rgba(0,212,170,0.10)", // subtle accent background
  strava: "#FC4C02",
  // Text hierarchy
  text: "#E6EDF3",         // soft white — easy on eyes
  textMuted: "#8B949E",    // readable secondary
  textDim: "#6E7681",      // tertiary, timestamps, captions
  // Borders & dividers
  border: "#21262D",       // subtle
  borderLight: "#30363D",  // for card outlines
  // Social colors
  kudos: "#FF6B35",        // warm orange for kudos/likes
  success: "#3FB950",      // GitHub green — online, goals met
  danger: "#F85149",       // red for delete, errors
};

export default {
  light: {
    text: brand.text,
    background: brand.bg,
    tint: brand.accent,
    tabIconDefault: brand.textDim,
    tabIconSelected: brand.accent,
  },
  dark: {
    text: brand.text,
    background: brand.bg,
    tint: brand.accent,
    tabIconDefault: brand.textDim,
    tabIconSelected: brand.accent,
  },
};

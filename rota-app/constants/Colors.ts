export const brand = {
  bg: "#0A0A0A",
  surface: "#111111",
  elevated: "#1A1A1A",
  accent: "#E6FF00",
  strava: "#FC4C02",
  text: "#FFFFFF",
  textMuted: "#888888",
  textDim: "#555555",
  border: "#222222",
  borderLight: "#333333",
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

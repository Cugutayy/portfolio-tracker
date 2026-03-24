export const brand = {
  // Warm dark palette (inspired by Strava dark mode — not pure black)
  bg: "#0F1418",           // deep warm charcoal (was #0A0A0A pure black)
  surface: "#1A2128",      // card background — visible lift from bg
  elevated: "#243038",     // elevated panels, modals
  accent: "#E6FF00",       // our signature lime-yellow
  accentDim: "rgba(230,255,0,0.12)", // subtle accent background
  strava: "#FC4C02",
  // Text hierarchy
  text: "#F1F5F9",         // warm white (not pure #FFF — easier on eyes)
  textMuted: "#94A3B8",    // readable secondary (Strava-style blue-gray)
  textDim: "#64748B",      // tertiary, timestamps, captions
  // Borders & dividers
  border: "#1E2A32",       // subtle, warm
  borderLight: "#2A3840",  // for card outlines
  // Social colors
  kudos: "#FF6B35",        // warm orange for kudos/likes
  success: "#10B981",      // green for online, goals met
  danger: "#EF4444",       // red for delete, errors
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

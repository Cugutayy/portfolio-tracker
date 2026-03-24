/** Safe initials extractor — handles empty/null names without crashing */
export function getInitials(name: string | null | undefined, maxLen = 2): string {
  if (!name || !name.trim()) return "?";
  return name.trim().split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, maxLen);
}

export function formatDistance(meters: number): string {
  if (!meters || !isFinite(meters) || meters < 0) return "0.0";
  return (meters / 1000).toFixed(1);
}

export function formatPace(secPerKm: number | null): string {
  if (!secPerKm || secPerKm <= 0 || !isFinite(secPerKm) || secPerKm > 900) return "--:--";
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "az once";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gun`;
  return formatDate(iso);
}

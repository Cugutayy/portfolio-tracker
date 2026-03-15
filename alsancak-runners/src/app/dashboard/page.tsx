"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface MemberProfile {
  id: string;
  name: string;
  email: string;
  instagram: string | null;
  paceGroup: string | null;
  bio: string | null;
  role: string;
  privacy: string;
  image: string | null;
  stravaConnected: boolean;
  stats: {
    totalRuns: number;
    totalDistanceM: number;
    totalTimeSec: number;
    currentStreak: number;
    eventsAttended: number;
  };
}

interface ActivityItem {
  id: string;
  title: string;
  activityType: string;
  startTime: string;
  distanceM: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  elevationGainM: number | null;
  avgPaceSecKm: number | null;
  avgHeartrate: number | null;
  source: string;
}

type Tab = "overview" | "profile" | "activities";

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}dk`;
  return `${h}sa ${m}dk`;
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─── PROFILE EDITOR ─── */
function ProfileEditor({
  profile,
  onUpdate,
}: {
  profile: MemberProfile;
  onUpdate: (p: MemberProfile) => void;
}) {
  const [form, setForm] = useState({
    name: profile.name,
    instagram: profile.instagram || "",
    paceGroup: profile.paceGroup || "",
    bio: profile.bio || "",
    privacy: profile.privacy,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/members/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      onUpdate({ ...profile, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Kayıt başarısız oldu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Name */}
      <div>
        <label className="block text-[11px] tracking-[0.15em] uppercase text-[#666] mb-3">
          İSİM
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-transparent border-b border-[#333] focus:border-[#E6FF00] text-white py-3 text-lg outline-none transition-colors"
        />
      </div>

      {/* Email (read-only) */}
      <div>
        <label className="block text-[11px] tracking-[0.15em] uppercase text-[#666] mb-3">
          EMAIL
        </label>
        <input
          type="email"
          value={profile.email}
          disabled
          className="w-full bg-transparent border-b border-[#222] text-[#666] py-3 text-lg outline-none cursor-not-allowed"
        />
      </div>

      {/* Instagram */}
      <div>
        <label className="block text-[11px] tracking-[0.15em] uppercase text-[#666] mb-3">
          INSTAGRAM
        </label>
        <input
          type="text"
          value={form.instagram}
          onChange={(e) => setForm({ ...form, instagram: e.target.value })}
          placeholder="@kullaniciadi"
          className="w-full bg-transparent border-b border-[#333] focus:border-[#E6FF00] text-white py-3 text-lg outline-none transition-colors"
        />
      </div>

      {/* Pace Group */}
      <div>
        <label className="block text-[11px] tracking-[0.15em] uppercase text-[#666] mb-3">
          TEMPO GRUBU
        </label>
        <select
          value={form.paceGroup}
          onChange={(e) => setForm({ ...form, paceGroup: e.target.value })}
          className="w-full bg-transparent border-b border-[#333] focus:border-[#E6FF00] text-white py-3 text-lg outline-none transition-colors cursor-pointer [&>option]:bg-[#0A0A0A]"
        >
          <option value="">Seçilmedi</option>
          <option value="beginner">Başlangıç (&gt;7:00 min/km)</option>
          <option value="casual">Rahat (6:00-7:00 min/km)</option>
          <option value="intermediate">Orta (5:00-6:00 min/km)</option>
          <option value="advanced">İleri (&lt;5:00 min/km)</option>
        </select>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-[11px] tracking-[0.15em] uppercase text-[#666] mb-3">
          HAKKINDA
        </label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Kendin hakkında birkaç kelime..."
          rows={3}
          className="w-full bg-transparent border border-[#333] focus:border-[#E6FF00] text-white p-4 text-base outline-none transition-colors resize-none"
        />
      </div>

      {/* Privacy */}
      <div>
        <label className="block text-[11px] tracking-[0.15em] uppercase text-[#666] mb-3">
          GİZLİLİK
        </label>
        <div className="flex gap-3">
          {(["private", "members", "public"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setForm({ ...form, privacy: opt })}
              className={`px-4 py-2 text-[11px] tracking-[0.15em] uppercase border transition-all duration-300 ${
                form.privacy === opt
                  ? "border-[#E6FF00] text-[#E6FF00] bg-[#E6FF00]/5"
                  : "border-[#333] text-[#666] hover:border-white/30 hover:text-white"
              }`}
            >
              {opt === "private"
                ? "Gizli"
                : opt === "members"
                  ? "Üyeler"
                  : "Herkese Açık"}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#E6FF00] text-black py-3 px-8 text-sm font-bold tracking-[0.15em] uppercase hover:bg-white transition-colors disabled:opacity-50"
        >
          {saving ? "KAYDEDİLİYOR..." : "KAYDET"}
        </button>
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-[#E6FF00] text-sm"
          >
            ✓ Kaydedildi
          </motion.span>
        )}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>
    </div>
  );
}

/* ─── STRAVA CONNECT CTA ─── */
function StravaConnectCard({
  connected,
  onDisconnect,
}: {
  connected: boolean;
  onDisconnect: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!confirm("Strava bağlantısını kaldırmak istediğinden emin misin?")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/strava/connection", { method: "DELETE" });
      if (res.ok) onDisconnect();
    } finally {
      setDisconnecting(false);
    }
  };

  if (connected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="border border-[#FC4C02]/30 bg-[#FC4C02]/5 p-6 flex items-center justify-between"
      >
        <div>
          <p className="text-[11px] tracking-[0.15em] uppercase text-[#FC4C02] mb-1">
            STRAVA BAĞLI
          </p>
          <p className="text-[13px] text-[#999]">
            Koşuların otomatik senkronize ediliyor
          </p>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-[11px] tracking-[0.15em] uppercase text-[#666] border border-[#333] px-4 py-2 hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {disconnecting ? "..." : "BAĞLANTIYI KES"}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="border border-dashed border-[#333] p-8 text-center"
    >
      <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] mb-4">
        STRAVA BAĞLANTISI
      </p>
      <p className="text-[15px] text-[#999] leading-relaxed mb-6">
        Strava hesabını bağlayarak koşu verilerini otomatik senkronize et.
      </p>
      <a
        href="/api/strava/authorize"
        className="inline-block bg-[#FC4C02] text-white py-3 px-8 text-sm font-bold tracking-[0.15em] uppercase hover:bg-[#e04500] transition-colors"
      >
        STRAVA İLE BAĞLAN
      </a>
    </motion.div>
  );
}

/* ─── ACTIVITY LIST ─── */
function ActivityList({ activities: items }: { activities: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="border border-[#222] p-12 text-center">
        <div className="text-4xl mb-4 opacity-30">&#x1F3C3;</div>
        <p className="text-[15px] text-[#666] mb-2">Henüz aktivite yok</p>
        <p className="text-[12px] text-[#444]">
          Strava bağlantısı kurulduğunda koşuların burada görünecek
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.03 }}
          className="border border-[#222] hover:border-[#333] p-4 md:p-5 transition-colors group"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-white text-base font-medium">{a.title}</h3>
              <p className="text-[12px] text-[#666] mt-1">
                {new Date(a.startTime).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {a.source === "strava" && (
              <span className="text-[9px] tracking-wider uppercase text-[#FC4C02] border border-[#FC4C02]/30 px-2 py-0.5">
                STRAVA
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555]">
                MESAFE
              </p>
              <p className="text-white text-lg font-semibold">
                {formatDistance(a.distanceM)}
                <span className="text-[#666] text-xs ml-0.5">km</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555]">
                SÜRE
              </p>
              <p className="text-white text-lg font-semibold">
                {formatDuration(a.movingTimeSec)}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555]">
                TEMPO
              </p>
              <p className="text-white text-lg font-semibold">
                {a.avgPaceSecKm ? formatPace(a.avgPaceSecKm) : "—"}
              </p>
            </div>
            <div className="hidden md:block">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555]">
                TIRMANMA
              </p>
              <p className="text-white text-lg font-semibold">
                {a.elevationGainM ? `${Math.round(a.elevationGainM)}m` : "—"}
              </p>
            </div>
            <div className="hidden md:block">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555]">
                NABIZ
              </p>
              <p className="text-white text-lg font-semibold">
                {a.avgHeartrate ? `${Math.round(a.avgHeartrate)}` : "—"}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── OVERVIEW TAB ─── */
function OverviewTab({
  profile,
  activities: activityItems,
  syncing,
  onSync,
  onStravaDisconnect,
}: {
  profile: MemberProfile;
  activities: ActivityItem[];
  syncing: boolean;
  onSync: () => void;
  onStravaDisconnect: () => void;
}) {
  return (
    <div className="space-y-12">
      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          {
            label: "KOŞU",
            value: profile.stats.totalRuns || activityItems.length,
          },
          {
            label: "KM",
            value: formatDistance(
              profile.stats.totalDistanceM ||
                activityItems.reduce((s, a) => s + a.distanceM, 0),
            ),
          },
          {
            label: "SÜRE",
            value: formatDuration(
              profile.stats.totalTimeSec ||
                activityItems.reduce((s, a) => s + a.movingTimeSec, 0),
            ),
          },
          {
            label: "ETKİNLİK",
            value: profile.stats.eventsAttended,
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="border border-[#222] p-6 group hover:border-[#E6FF00]/30 transition-colors"
          >
            <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] mb-2">
              {stat.label}
            </p>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Strava Connection */}
      <StravaConnectCard
        connected={profile.stravaConnected}
        onDisconnect={onStravaDisconnect}
      />

      {/* Sync button (when connected) */}
      {profile.stravaConnected && (
        <div className="flex items-center gap-4">
          <button
            onClick={onSync}
            disabled={syncing}
            className="text-[11px] tracking-[0.15em] uppercase border border-[#333] px-5 py-2.5 text-[#999] hover:border-[#E6FF00]/50 hover:text-[#E6FF00] transition-colors disabled:opacity-50"
          >
            {syncing ? "SENKRONİZE EDİLİYOR..." : "STRAVA SENKRONLA"}
          </button>
          {syncing && (
            <div className="w-4 h-4 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}

      {/* Recent Activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[11px] tracking-[0.15em] uppercase text-[#666]">
            SON AKTİVİTELER
          </h2>
          {activityItems.length > 0 && (
            <button
              onClick={() => {}}
              className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-[#E6FF00] transition-colors"
            >
              TÜMÜNÜ GÖR
            </button>
          )}
        </div>
        <ActivityList activities={activityItems.slice(0, 5)} />
      </motion.div>

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[11px] tracking-[0.15em] uppercase text-[#666]">
            YAKLAŞAN ETKİNLİKLER
          </h2>
          <Link
            href="/runs"
            className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-[#E6FF00] transition-colors"
          >
            TÜMÜNÜ GÖR
          </Link>
        </div>
        <div className="border border-[#222] p-12 text-center">
          <div className="text-4xl mb-4 opacity-30">&#x1F4C5;</div>
          <p className="text-[15px] text-[#666] mb-2">
            Yaklaşan etkinlik yok
          </p>
          <p className="text-[12px] text-[#444]">
            Yeni koşu etkinlikleri eklendiğinde burada görünecek
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── ACTIVITIES TAB (FULL LIST) ─── */
function ActivitiesTab({ activities: items, syncing, onSync, stravaConnected }: {
  activities: ActivityItem[];
  syncing: boolean;
  onSync: () => void;
  stravaConnected: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-[15px] text-[#666]">
          {items.length > 0
            ? `${items.length} aktivite`
            : "Henüz aktivite yok"}
        </p>
        {stravaConnected && (
          <button
            onClick={onSync}
            disabled={syncing}
            className="text-[11px] tracking-[0.15em] uppercase border border-[#333] px-5 py-2.5 text-[#999] hover:border-[#E6FF00]/50 hover:text-[#E6FF00] transition-colors disabled:opacity-50"
          >
            {syncing ? "SENKRONİZE EDİLİYOR..." : "SENKRONLA"}
          </button>
        )}
      </div>
      <ActivityList activities={items} />
    </div>
  );
}

/* ─── MAIN DASHBOARD ─── */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [syncing, setSyncing] = useState(false);
  const [stravaMsg, setStravaMsg] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const loadProfile = useCallback(() => {
    fetch("/api/members/me")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadActivities = useCallback(() => {
    fetch("/api/activities?limit=50")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.activities) setActivityItems(data.activities);
      })
      .catch(console.error);
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.synced > 0) {
        loadActivities();
        loadProfile();
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  }, [loadActivities, loadProfile]);

  const handleStravaDisconnect = useCallback(() => {
    setProfile((p) => p ? { ...p, stravaConnected: false } : p);
    setActivityItems([]);
  }, []);

  useEffect(() => {
    loadProfile();
    loadActivities();
  }, [loadProfile, loadActivities]);

  // Handle Strava callback URL params
  useEffect(() => {
    const stravaStatus = searchParams.get("strava");
    if (stravaStatus === "connected") {
      setStravaMsg("Strava bağlantısı kuruldu! Senkronize ediliyor...");
      loadProfile();
      // Auto-sync after connection
      setTimeout(() => handleSync(), 500);
      setTimeout(() => setStravaMsg(null), 5000);
    } else if (stravaStatus === "denied") {
      setStravaMsg("Strava bağlantısı reddedildi");
      setTimeout(() => setStravaMsg(null), 4000);
    } else if (stravaStatus === "already_linked") {
      setStravaMsg("Bu Strava hesabı başka bir üyeye bağlı");
      setTimeout(() => setStravaMsg(null), 4000);
    } else if (stravaStatus === "error") {
      setStravaMsg("Strava bağlantısında bir hata oluştu");
      setTimeout(() => setStravaMsg(null), 4000);
    }
  }, [searchParams, loadProfile, handleSync]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[15px] text-[#666] mb-6">
            Profil yüklenemedi.
          </p>
          <Link
            href="/join"
            className="text-[11px] tracking-[0.15em] uppercase text-[#E6FF00] border border-[#E6FF00] px-6 py-3 hover:bg-[#E6FF00] hover:text-black transition-colors"
          >
            GİRİŞ YAP
          </Link>
        </div>
      </main>
    );
  }

  const paceLabels: Record<string, string> = {
    beginner: "Başlangıç",
    casual: "Rahat",
    intermediate: "Orta",
    advanced: "İleri",
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      {/* Dashboard Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0A0A0A] border-b border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 md:px-12 py-4">
          <Link
            href="/"
            className="text-sm font-bold tracking-[0.2em] uppercase text-white"
          >
            ALSANCAK<span className="text-[#E6FF00]">.</span>RUNNERS
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-white transition-colors hidden md:block"
            >
              ANA SAYFA
            </Link>
            <Link
              href="/runs"
              className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-white transition-colors hidden md:block"
            >
              KOŞULAR
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[11px] tracking-[0.15em] uppercase text-[#666] border border-[#333] px-4 py-2 hover:border-red-500/50 hover:text-red-400 transition-colors"
            >
              ÇIKIŞ
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-[72px]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1
                  className="text-4xl md:text-5xl font-bold text-white leading-none mb-3"
                  style={{ fontFamily: "var(--font-heading, inherit)" }}
                >
                  HOŞ GELDİN
                  <span className="text-[#E6FF00]">.</span>
                </h1>
                <div className="flex items-center gap-3">
                  <p className="text-lg text-white/80">{profile.name}</p>
                  <span className="text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 border border-[#333] text-[#666]">
                    {profile.role}
                  </span>
                  {profile.paceGroup && (
                    <span className="text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 border border-[#E6FF00]/20 text-[#E6FF00]/60">
                      {paceLabels[profile.paceGroup] || profile.paceGroup}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Strava status message */}
            {stravaMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-3 border border-[#FC4C02]/30 bg-[#FC4C02]/5 text-[#FC4C02] text-sm"
              >
                {stravaMsg}
              </motion.div>
            )}

            {/* Tabs */}
            <div className="flex gap-6 border-b border-[#1a1a1a]">
              {(
                [
                  { key: "overview", label: "GENEL BAKIŞ" },
                  { key: "activities", label: "AKTİVİTELER" },
                  { key: "profile", label: "PROFİL" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`relative pb-3 text-[11px] tracking-[0.15em] uppercase transition-colors ${
                    tab === key
                      ? "text-white"
                      : "text-[#666] hover:text-white/60"
                  }`}
                >
                  {label}
                  {tab === key && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#E6FF00]"
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {tab === "overview" && (
                <OverviewTab
                  profile={profile}
                  activities={activityItems}
                  syncing={syncing}
                  onSync={handleSync}
                  onStravaDisconnect={handleStravaDisconnect}
                />
              )}
              {tab === "activities" && (
                <ActivitiesTab
                  activities={activityItems}
                  syncing={syncing}
                  onSync={handleSync}
                  stravaConnected={profile.stravaConnected}
                />
              )}
              {tab === "profile" && (
                <div className="max-w-[600px]">
                  <p className="text-[15px] text-[#666] mb-8">
                    Profil bilgilerini güncelle.
                  </p>
                  <ProfileEditor
                    profile={profile}
                    onUpdate={setProfile}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

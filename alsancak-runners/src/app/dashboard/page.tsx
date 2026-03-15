"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

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

type Tab = "overview" | "profile";

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}dk`;
  return `${h}sa ${m}dk`;
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

/* ─── OVERVIEW TAB ─── */
function OverviewTab({ profile }: { profile: MemberProfile }) {
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
            value: profile.stats.totalRuns,
            icon: "🏃",
          },
          {
            label: "KM",
            value: formatDistance(profile.stats.totalDistanceM),
            icon: "📏",
          },
          {
            label: "SÜRE",
            value: formatDuration(profile.stats.totalTimeSec),
            icon: "⏱",
          },
          {
            label: "ETKİNLİK",
            value: profile.stats.eventsAttended,
            icon: "📅",
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

      {/* Strava Connect CTA */}
      {!profile.stravaConnected && (
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
          <button
            disabled
            className="inline-block bg-[#FC4C02]/50 text-white/70 py-3 px-8 text-sm font-bold tracking-[0.15em] uppercase cursor-not-allowed"
          >
            STRAVA İLE BAĞLAN
          </button>
          <p className="text-[11px] text-[#555] mt-3">Yakında aktif olacak</p>
        </motion.div>
      )}

      {/* Activities Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[11px] tracking-[0.15em] uppercase text-[#666]">
            SON AKTİVİTELER
          </h2>
        </div>
        <div className="border border-[#222] p-12 text-center">
          <div className="text-4xl mb-4 opacity-30">🏃</div>
          <p className="text-[15px] text-[#666] mb-2">
            Henüz aktivite yok
          </p>
          <p className="text-[12px] text-[#444]">
            Strava bağlantısı kurulduğunda koşuların burada görünecek
          </p>
        </div>
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
            TÜMÜNÜ GÖR →
          </Link>
        </div>
        <div className="border border-[#222] p-12 text-center">
          <div className="text-4xl mb-4 opacity-30">📅</div>
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

/* ─── MAIN DASHBOARD ─── */
export default function DashboardPage() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

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

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

            {/* Tabs */}
            <div className="flex gap-6 border-b border-[#1a1a1a]">
              {(
                [
                  { key: "overview", label: "GENEL BAKIŞ" },
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
            {tab === "overview" ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <OverviewTab profile={profile} />
              </motion.div>
            ) : (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="max-w-[600px]">
                  <p className="text-[15px] text-[#666] mb-8">
                    Profil bilgilerini güncelle.
                  </p>
                  <ProfileEditor
                    profile={profile}
                    onUpdate={setProfile}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

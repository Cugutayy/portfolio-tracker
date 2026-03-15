"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

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

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}dk`;
  return `${h}sa ${m}dk`;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/members/me")
      .then((r) => r.json())
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#0A0A0A] pt-32 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#0A0A0A] pt-32 px-6">
          <p className="body-text text-center">Profil yüklenemedi.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0A0A0A] pt-32 pb-32 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="label-text text-white/60 mb-4">DASHBOARD</p>
                <h1 className="headline-lg mb-2">
                  HOŞ GELDİN
                  <span className="text-[#E6FF00]">.</span>
                </h1>
                <p className="body-text text-lg">{profile.name}</p>
                <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] mt-1">
                  {profile.role}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-[11px] tracking-[0.15em] uppercase text-[#666] border border-[#333] px-4 py-2 hover:border-white/30 hover:text-white transition-colors"
              >
                ÇIKIŞ YAP
              </button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          >
            {[
              { label: "KOŞU", value: profile.stats.totalRuns },
              { label: "KM", value: formatDistance(profile.stats.totalDistanceM) },
              { label: "SÜRE", value: formatDuration(profile.stats.totalTimeSec) },
              { label: "ETKİNLİK", value: profile.stats.eventsAttended },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border border-[#222] p-6 group hover:border-[#E6FF00]/30 transition-colors"
              >
                <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] mb-2">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Strava Connect CTA */}
          {!profile.stravaConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="border border-dashed border-[#333] p-8 text-center mb-16"
            >
              <p className="label-text text-white/60 mb-4">STRAVA BAĞLANTISI</p>
              <p className="body-text mb-6">
                Strava hesabınızı bağlayarak koşu verilerinizi otomatik
                senkronize edin.
              </p>
              <a
                href="/api/strava/authorize"
                className="inline-block bg-[#FC4C02] text-white py-3 px-8 text-sm font-bold tracking-[0.15em] uppercase hover:bg-[#E64500] transition-colors"
              >
                STRAVA İLE BAĞLAN
              </a>
            </motion.div>
          )}

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {[
              { label: "AKTİVİTELER", href: "/dashboard/activities", desc: "Koşu geçmişin" },
              { label: "ETKİNLİKLER", href: "/runs", desc: "Yaklaşan koşular" },
              { label: "PROFİL", href: "/dashboard/profile", desc: "Bilgilerini düzenle" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="border border-[#222] p-6 hover:border-[#E6FF00]/30 transition-colors group"
              >
                <p className="label-text text-white group-hover:text-[#E6FF00] transition-colors mb-2">
                  {link.label}
                </p>
                <p className="text-[13px] text-[#666]">{link.desc}</p>
              </a>
            ))}
          </motion.div>
        </div>
      </main>
    </>
  );
}

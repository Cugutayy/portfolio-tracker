"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface EventItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  eventType: string;
  date: string;
  meetingPoint: string;
  distanceM: number;
  paceGroups: { name: string; pace: string; color: string }[] | null;
  maxParticipants: number | null;
  rsvpCount: number;
  status: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  group_run: "#E6FF00",
  tempo_run: "#FC4C02",
  long_run: "#4ade80",
  race: "#f472b6",
  social: "#60a5fa",
};

export default function EtkinliklerPage() {
  const t = useTranslations("events");
  const tNav = useTranslations("nav");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events?limit=50")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.events) setEvents(data.events);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 md:px-12 py-4">
          <Link
            href="/"
            className="text-sm font-bold tracking-[0.2em] uppercase text-white"
          >
            ALSANCAK<span className="text-[#E6FF00]">.</span>RUNNERS
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/routes"
              className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-white transition-colors hidden md:block"
            >
              {tNav("routes")}
            </Link>
            <Link
              href="/dashboard"
              className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-white transition-colors hidden md:block"
            >
              {tNav("dashboard")}
            </Link>
            <Link
              href="/join"
              className="text-[11px] tracking-[0.15em] uppercase text-[#E6FF00] border border-[#E6FF00]/30 px-4 py-2 hover:bg-[#E6FF00] hover:text-black transition-colors"
            >
              {tNav("join")}
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-[72px]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] mb-4">
              {t("title")}
            </p>
            <h1
              className="text-5xl md:text-7xl font-bold text-white leading-[0.9]"
              style={{ fontFamily: "var(--font-heading, inherit)" }}
            >
              {t("upcoming").split(" ")[0]}<br />
              <span className="text-[#E6FF00]">{t("upcoming").split(" ").slice(1).join(" ")}</span>
            </h1>
            <p className="text-[15px] text-[#666] mt-6 max-w-lg">
              {t("subtitle")}
            </p>
          </motion.div>

          {/* Events List */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="border border-[#222] p-16 text-center">
              <div className="text-5xl mb-4 opacity-20">📅</div>
              <p className="text-[15px] text-[#666] mb-2">
                {t("noEvents")}
              </p>
              <p className="text-[12px] text-[#444]">
                {t("noEventsSubtitle")}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((ev, i) => {
                const date = new Date(ev.date);
                const dayNum = date.getDate();
                const monthStr = date
                  .toLocaleDateString("tr-TR", { month: "short" })
                  .toUpperCase();
                const dayStr = date.toLocaleDateString("tr-TR", {
                  weekday: "long",
                });
                const timeStr = date.toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const distanceKm = (ev.distanceM / 1000).toFixed(1);
                const typeColor =
                  EVENT_TYPE_COLORS[ev.eventType] || "#E6FF00";

                return (
                  <Link key={ev.id} href={{pathname: '/etkinlikler/[slug]', params: {slug: ev.slug}}}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      className="group border border-[#222] hover:border-white/20 p-6 md:p-8 transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex gap-6 md:gap-10">
                        {/* Date block */}
                        <div className="flex-shrink-0 w-16 md:w-20 text-center">
                          <p className="text-3xl md:text-4xl font-bold text-white leading-none">
                            {dayNum}
                          </p>
                          <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] mt-1">
                            {monthStr}
                          </p>
                          <p className="text-[10px] text-[#444] capitalize mt-0.5">
                            {dayStr}
                          </p>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-[#E6FF00] transition-colors leading-tight">
                                {ev.title}
                              </h2>
                              <div className="flex items-center gap-3 mt-2">
                                <span
                                  className="text-[9px] tracking-wider uppercase px-2 py-0.5 border"
                                  style={{
                                    color: typeColor,
                                    borderColor: `${typeColor}40`,
                                  }}
                                >
                                  {t(`types.${ev.eventType}`) ||
                                    ev.eventType}
                                </span>
                                <span className="text-[12px] text-[#666]">
                                  {timeStr}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <p className="text-2xl font-bold text-white">
                                {distanceKm}
                                <span className="text-[#666] text-sm ml-0.5">
                                  km
                                </span>
                              </p>
                            </div>
                          </div>

                          {ev.description && (
                            <p className="text-[13px] text-[#666] mb-3 line-clamp-2">
                              {ev.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-[12px] text-[#555]">
                                📍 {ev.meetingPoint}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {ev.paceGroups &&
                                ev.paceGroups.map((pg) => (
                                  <span
                                    key={pg.name}
                                    className="text-[9px] tracking-wider uppercase px-1.5 py-0.5"
                                    style={{
                                      color: pg.color,
                                      borderColor: `${pg.color}30`,
                                      borderWidth: 1,
                                    }}
                                  >
                                    {pg.name}
                                  </span>
                                ))}
                              {ev.rsvpCount > 0 && (
                                <span className="text-[11px] text-[#666]">
                                  {ev.rsvpCount}
                                  {ev.maxParticipants
                                    ? `/${ev.maxParticipants}`
                                    : ""}{" "}
                                  {t("people")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

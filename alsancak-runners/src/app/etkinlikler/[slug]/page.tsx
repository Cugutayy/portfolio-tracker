"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

interface EventDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  eventType: string;
  date: string;
  meetingPoint: string;
  meetingLat: number | null;
  meetingLng: number | null;
  distanceM: number;
  paceGroups: { name: string; pace: string; color: string }[] | null;
  maxParticipants: number | null;
  rsvpCount: number;
  status: string;
}

interface RsvpItem {
  id: string;
  memberName: string;
  memberImage: string | null;
  paceGroup: string | null;
  status: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  group_run: "GRUP KOŞUSU",
  tempo_run: "TEMPO KOŞUSU",
  long_run: "UZUN KOŞU",
  race: "YARIŞ",
  social: "SOSYAL",
};

export default function EventDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [rsvps, setRsvps] = useState<RsvpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setEvent(data.event);
        setRsvps(data.rsvps || []);
      })
      .catch(() => setError("Etkinlik bulunamadı"))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleRsvp = async () => {
    setRsvpLoading(true);
    try {
      const res = await fetch(`/api/events/${slug}/rsvp`, { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/join";
        return;
      }
      if (res.ok) {
        // Reload event data
        const data = await fetch(`/api/events/${slug}`).then((r) => r.json());
        setEvent(data.event);
        setRsvps(data.rsvps || []);
      }
    } catch {
      // ignore
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[15px] text-[#666] mb-6">{error || "Etkinlik bulunamadı"}</p>
          <Link
            href="/etkinlikler"
            className="text-[11px] tracking-[0.15em] uppercase text-[#E6FF00] border border-[#E6FF00] px-6 py-3 hover:bg-[#E6FF00] hover:text-black transition-colors"
          >
            ETKİNLİKLERE DÖN
          </Link>
        </div>
      </main>
    );
  }

  const date = new Date(event.date);
  const dateStr = date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });
  const timeStr = date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const distanceKm = (event.distanceM / 1000).toFixed(1);
  const goingRsvps = rsvps.filter((r) => r.status === "going");
  const isFull = event.maxParticipants
    ? goingRsvps.length >= event.maxParticipants
    : false;

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
              href="/etkinlikler"
              className="text-[11px] tracking-[0.15em] uppercase text-[#666] hover:text-white transition-colors"
            >
              ← ETKİNLİKLER
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-[72px]">
        <div className="max-w-[1000px] mx-auto px-6 md:px-12 py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[9px] tracking-wider uppercase text-[#E6FF00] border border-[#E6FF00]/30 px-2 py-0.5">
                {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
              </span>
              {event.status === "upcoming" && (
                <span className="text-[9px] tracking-wider uppercase text-[#4ade80] border border-[#4ade80]/30 px-2 py-0.5">
                  YAKINLAŞIYOR
                </span>
              )}
            </div>
            <h1
              className="text-4xl md:text-6xl font-bold text-white leading-[0.95] mb-6"
              style={{ fontFamily: "var(--font-heading, inherit)" }}
            >
              {event.title}
            </h1>
            {event.description && (
              <p className="text-[17px] text-[#999] leading-relaxed max-w-2xl">
                {event.description}
              </p>
            )}
          </motion.div>

          {/* Info Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
          >
            <div className="border border-[#222] p-5">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
                TARİH
              </p>
              <p className="text-white text-lg font-semibold capitalize">
                {dateStr}
              </p>
            </div>
            <div className="border border-[#222] p-5">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
                SAAT
              </p>
              <p className="text-white text-lg font-semibold">{timeStr}</p>
            </div>
            <div className="border border-[#222] p-5">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
                MESAFE
              </p>
              <p className="text-white text-lg font-semibold">
                {distanceKm}
                <span className="text-[#666] text-sm ml-0.5">km</span>
              </p>
            </div>
            <div className="border border-[#222] p-5">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2">
                KATILIMCI
              </p>
              <p className="text-white text-lg font-semibold">
                {goingRsvps.length}
                {event.maxParticipants && (
                  <span className="text-[#666] text-sm ml-0.5">
                    /{event.maxParticipants}
                  </span>
                )}
              </p>
            </div>
          </motion.div>

          {/* Meeting Point */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="border border-[#222] p-6 mb-8"
          >
            <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-3">
              BULUŞMA NOKTASI
            </p>
            <p className="text-white text-lg">{event.meetingPoint}</p>
            {event.meetingLat && event.meetingLng && (
              <a
                href={`https://www.google.com/maps?q=${event.meetingLat},${event.meetingLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-[11px] tracking-[0.15em] uppercase text-[#E6FF00]/70 hover:text-[#E6FF00] transition-colors"
              >
                HARİTADA GÖR →
              </a>
            )}
          </motion.div>

          {/* Pace Groups */}
          {event.paceGroups && event.paceGroups.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8"
            >
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-4">
                TEMPO GRUPLARI
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {event.paceGroups.map((pg) => (
                  <div
                    key={pg.name}
                    className="border p-4"
                    style={{ borderColor: `${pg.color}30` }}
                  >
                    <p
                      className="text-sm font-bold mb-1"
                      style={{ color: pg.color }}
                    >
                      {pg.name}
                    </p>
                    <p className="text-[13px] text-[#666]">{pg.pace} min/km</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* RSVP Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mb-12"
          >
            <button
              onClick={handleRsvp}
              disabled={rsvpLoading || isFull}
              className={`py-4 px-10 text-sm font-bold tracking-[0.15em] uppercase transition-colors ${
                isFull
                  ? "bg-[#333] text-[#666] cursor-not-allowed"
                  : "bg-[#E6FF00] text-black hover:bg-white"
              } disabled:opacity-50`}
            >
              {rsvpLoading
                ? "..."
                : isFull
                  ? "KONTENJAN DOLU"
                  : "KATILIYORUM"}
            </button>
          </motion.div>

          {/* Attendees */}
          {goingRsvps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#555] mb-4">
                KATILIMCILAR ({goingRsvps.length})
              </p>
              <div className="flex flex-wrap gap-3">
                {goingRsvps.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 border border-[#222] px-3 py-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#222] flex items-center justify-center text-[10px] text-white font-bold">
                      {r.memberName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[13px] text-white">{r.memberName}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}

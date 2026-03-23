"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const EVENT_TYPES = [
  { value: "group_run", label: "Grup Kosusu" },
  { value: "tempo_run", label: "Tempo Kosusu" },
  { value: "long_run", label: "Uzun Kosu" },
  { value: "interval", label: "Interval" },
  { value: "trail_run", label: "Patika Kosusu" },
  { value: "social", label: "Sosyal" },
  { value: "race", label: "Yaris" },
];

export default function EtkinlikOlusturPage() {
  const tNav = useTranslations("nav");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [eventType, setEventType] = useState("group_run");
  const [maxParticipants, setMaxParticipants] = useState("");

  // Auth check
  useEffect(() => {
    fetch("/api/members/me")
      .then((r) => {
        if (!r.ok) {
          window.location.href = "/join";
          return;
        }
        setLoading(false);
      })
      .catch(() => {
        window.location.href = "/join";
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Etkinlik adi zorunludur");
      return;
    }
    if (!date || !time) {
      setError("Tarih ve saat zorunludur");
      return;
    }

    setSubmitting(true);

    try {
      const eventDate = new Date(`${date}T${time}`);
      const body: Record<string, unknown> = {
        title: title.trim(),
        eventType,
        date: eventDate.toISOString(),
      };

      if (description.trim()) body.description = description.trim();
      if (meetingPoint.trim()) body.meetingPoint = meetingPoint.trim();
      if (distanceKm) body.distanceM = parseFloat(distanceKm) * 1000;
      if (maxParticipants) body.maxParticipants = parseInt(maxParticipants);

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        window.location.href = "/join";
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Bir hata olustu");
        return;
      }

      const event = await res.json();
      router.push({ pathname: "/etkinlikler/[slug]", params: { slug: event.slug } });
    } catch {
      setError("Bir hata olustu, tekrar deneyin");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const inputClass =
    "w-full bg-[#111] border border-[#222] text-white px-4 py-3 text-[15px] focus:border-[#E6FF00]/50 focus:outline-none transition-colors placeholder:text-[#444]";
  const labelClass =
    "text-[10px] tracking-[0.15em] uppercase text-[#555] mb-2 block";

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
              {tNav("events")}
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-[72px]">
        <div className="max-w-[700px] mx-auto px-6 md:px-12 py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] mb-4">
              Yeni Etkinlik
            </p>
            <h1
              className="text-4xl md:text-6xl font-bold text-white leading-[0.95]"
              style={{ fontFamily: "var(--font-heading, inherit)" }}
            >
              Etkinlik<br />
              <span className="text-[#E6FF00]">Olustur</span>
            </h1>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Etkinlik Adi */}
            <div>
              <label className={labelClass}>Etkinlik Adi *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pazar Sabahi Kosusu"
                className={inputClass}
                maxLength={200}
                required
              />
            </div>

            {/* Aciklama */}
            <div>
              <label className={labelClass}>Aciklama</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Etkinlik detaylari..."
                className={`${inputClass} h-28 resize-none`}
                maxLength={2000}
              />
            </div>

            {/* Tarih ve Saat */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tarih *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Saat *</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Bulusma Noktasi */}
            <div>
              <label className={labelClass}>Bulusma Noktasi</label>
              <input
                type="text"
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
                placeholder="Kordon, Alsancak"
                className={inputClass}
                maxLength={500}
              />
            </div>

            {/* Mesafe ve Tur */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Mesafe (KM)</label>
                <input
                  type="number"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="10"
                  className={inputClass}
                  min="0.1"
                  max="200"
                  step="0.1"
                />
              </div>
              <div>
                <label className={labelClass}>Etkinlik Turu</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className={inputClass}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Max Katilimci */}
            <div>
              <label className={labelClass}>Max Katilimci</label>
              <input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="Sinirsiz"
                className={inputClass}
                min="1"
                max="1000"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-[13px] text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 text-sm font-bold tracking-[0.15em] uppercase bg-[#E6FF00] text-black hover:bg-white transition-colors disabled:opacity-50"
            >
              {submitting ? "Olusturuluyor..." : "Etkinlik Olustur"}
            </button>
          </motion.form>
        </div>
      </div>
    </main>
  );
}

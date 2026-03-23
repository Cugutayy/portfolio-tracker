"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface EventItem {
  id: string;
  title: string;
  slug: string;
  eventType: string;
  date: string;
  meetingPoint: string;
  distanceM: number;
  rsvpCount: number;
  maxParticipants: number | null;
  paceGroups: { name: string; pace: string; color: string }[] | null;
}

// Fallback images mapped by event type
const EVENT_IMAGES: Record<string, string> = {
  group_run: "/images/ar-05.jpg",
  tempo_run: "/images/ar-01.jpg",
  long_run: "/images/ar-20.jpg",
  race: "/images/ar-02.jpg",
};

export default function UpcomingRuns() {
  const t = useTranslations("home.upcomingRuns");
  const tEvents = useTranslations("events");
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events?limit=4")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.events) setEvents(data.events);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-[#111]"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        {/* Header */}
        <div className="flex items-end justify-between mb-16">
          <div>
            <p className="label-text text-white/60 mb-4">{t("label")}</p>
            <h2 className="headline-lg">
              {t("title").split('\n')[0]}<br />{t("title").split('\n')[1]}
            </h2>
          </div>
          <div className="hidden md:flex flex-col items-end gap-4">
            <p className="body-text max-w-xs text-right">
              {t("subtitle")}
            </p>
            <Link
              href="/etkinlikler"
              className="text-[11px] tracking-[0.15em] uppercase text-[#E6FF00] border border-[#E6FF00]/30 px-4 py-2 hover:bg-[#E6FF00] hover:text-black transition-colors"
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>

        {/* Event cards */}
        <div className="space-y-4">
          {loading && events.length === 0 && (
            <div className="border border-[#222] p-12 text-center">
              <div className="w-6 h-6 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[15px] text-[#666]">
                {t("loading")}
              </p>
            </div>
          )}
          {!loading && events.length === 0 && (
            <div className="border border-[#222] p-12 text-center">
              <p className="text-[15px] text-[#666] mb-2">
                {t("noEvents")}
              </p>
              <p className="text-[12px] text-[#444]">
                {t("noEventsSubtitle")}
              </p>
            </div>
          )}
          {events.map((ev, i) => {
            const date = new Date(ev.date);
            const dateStr = date.toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).toUpperCase();
            const timeStr = date.toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const distanceKm = (ev.distanceM / 1000).toFixed(1);
            const image = EVENT_IMAGES[ev.eventType] || "/images/ar-05.jpg";

            return (
              <Link key={ev.id} href={{pathname: '/etkinlikler/[slug]', params: {slug: ev.slug}}}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="group relative border border-[#222] hover:border-white/20 rounded-sm p-6 md:p-8 cursor-pointer transition-all duration-500 overflow-hidden"
                >
                  {/* Background image on hover */}
                  <motion.div
                    animate={{
                      opacity: hoveredIndex === i ? 0.15 : 0,
                      scale: hoveredIndex === i ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={image}
                      alt={ev.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 800px"
                    />
                  </motion.div>

                  <div className="relative z-10 grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
                    {/* Index */}
                    <p className="text-white/50 text-sm font-medium hidden md:block">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    {/* Name + type badge */}
                    <div className="col-span-1 md:col-span-2">
                      <h3 className="text-lg md:text-xl font-bold tracking-wide uppercase group-hover:text-white transition-colors">
                        {ev.title}
                      </h3>
                      <span className="text-[9px] tracking-wider uppercase text-[#E6FF00]/60 mt-1 inline-block">
                        {tEvents(`types.${ev.eventType}`) || ev.eventType}
                      </span>
                    </div>
                    {/* Date + Time */}
                    <div>
                      <p className="text-sm text-[#999]">{dateStr}</p>
                      <p className="text-xs text-[#666]">{timeStr}</p>
                    </div>
                    {/* Location */}
                    <p className="text-sm text-[#999] hidden md:block truncate">
                      {ev.meetingPoint}
                    </p>
                    {/* Distance + RSVP */}
                    <div className="text-right">
                      <p className="font-bold text-lg">{distanceKm} KM</p>
                      {ev.rsvpCount > 0 && (
                        <p className="text-[10px] text-[#666]">
                          {ev.rsvpCount}{ev.maxParticipants ? `/${ev.maxParticipants}` : ""} {t("participants")}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/etkinlikler"
            className="text-[11px] tracking-[0.15em] uppercase text-[#E6FF00] border border-[#E6FF00]/30 px-6 py-3 hover:bg-[#E6FF00] hover:text-black transition-colors inline-block"
          >
            {t("viewAllMobile")}
          </Link>
        </div>
      </div>
    </section>
  );
}

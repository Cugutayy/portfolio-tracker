"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RunningRouteMap from "@/components/RunningRouteMap";

const allRuns = [
  {
    name: "KORDON SUNRISE",
    date: "MAR 22, 2026",
    location: "Kordon, Alsancak",
    distance: "8 KM",
    time: "06:30",
    image: "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=800&q=85",
    description: "Start your day with the most iconic waterfront run in Izmir.",
    route: "Alsancak Marina → Konak Pier → Return",
  },
  {
    name: "KEMERALTI NIGHT",
    date: "MAR 29, 2026",
    location: "Kemeraltı Bazaar",
    distance: "5 KM",
    time: "21:00",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=85",
    description: "Run through history. Night lights illuminate the ancient bazaar.",
    route: "Kemeraltı Gate → Agora → Clock Tower → Return",
  },
  {
    name: "KADIFEKALE CLIMB",
    date: "APR 05, 2026",
    location: "Kadifekale Hill",
    distance: "10 KM",
    time: "07:00",
    image: "https://images.unsplash.com/photo-1594882645126-14020914d58d?w=800&q=85",
    description: "Challenge yourself with the steepest climb overlooking the city.",
    route: "Basmane → Kadifekale → Panoramic Loop",
  },
  {
    name: "BORNOVA TRAIL",
    date: "APR 12, 2026",
    location: "Bornova Forest",
    distance: "15 KM",
    time: "08:00",
    image: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=85",
    description: "Escape the city. Trail running through Bornova's green corridors.",
    route: "Bornova Park → Forest Trail → Hilltop → Return",
  },
  {
    name: "WATERFRONT 10K",
    date: "APR 19, 2026",
    location: "Izmir Bay",
    distance: "10 KM",
    time: "07:30",
    image: "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=800&q=85",
    description: "The classic bay run. Flat, fast, and scenic.",
    route: "Alsancak → Bayraklı → Karşıyaka Ferry",
  },
  {
    name: "FULL MOON RUN",
    date: "APR 26, 2026",
    location: "Kordon Promenade",
    distance: "6 KM",
    time: "22:00",
    image: "https://images.unsplash.com/photo-1506365069540-904bcc762636?w=800&q=85",
    description: "Once a month, we run under the full moon.",
    route: "Cumhuriyet Meydanı → Kordon → Gündoğdu",
  },
];

export default function RunsPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative h-[70vh] flex items-end overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1920&q=90"
            alt="Runs hero"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="relative z-10 px-6 md:px-16 pb-16">
            <p className="label-text text-white/60 mb-4">ALL RUNS</p>
            <h1 className="headline-xl">
              FIND YOUR<br />
              <span className="text-[#E6FF00]">ROUTE</span>
            </h1>
          </div>
        </section>

        {/* Route Explorer */}
        <RunningRouteMap />

        {/* Runs list */}
        <section className="py-24 bg-[#111]">
          <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
            <div className="space-y-16">
              {allRuns.map((run, i) => (
                <RunCard key={i} run={run} index={i} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </SmoothScroll>
  );
}

function RunCard({
  run,
  index,
}: {
  run: (typeof allRuns)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8 }}
      className="grid md:grid-cols-2 gap-8 md:gap-16 items-center"
    >
      <div
        className={`relative aspect-[16/10] overflow-hidden group ${
          index % 2 !== 0 ? "md:order-2" : ""
        }`}
      >
        <Image
          src={run.image}
          alt={run.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute top-6 left-6 bg-[#E6FF00] text-black px-3 py-1">
          <p className="text-xs font-bold">{run.distance}</p>
        </div>
      </div>

      <div className={index % 2 !== 0 ? "md:order-1" : ""}>
        <p className="label-text text-white/50 mb-2">
          {run.date} — {run.time}
        </p>
        <h3 className="headline-md mb-4">{run.name}</h3>
        <p className="body-text mb-3">{run.description}</p>
        <p className="text-sm text-[#666] mb-6">
          <span className="text-white/60">Route:</span> {run.route}
        </p>
        <p className="text-sm text-[#666]">{run.location}</p>
      </div>
    </motion.div>
  );
}

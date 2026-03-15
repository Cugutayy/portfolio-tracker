"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";

const runs = [
  {
    name: "KORDON WEDNESDAY",
    date: "MAR 18, 2026",
    location: "Kordon, Alsancak",
    distance: "7 KM",
    image: "/images/ar-05.jpg",
    time: "19:00",
  },
  {
    name: "GÖZTEPE LOOP",
    date: "MAR 25, 2026",
    location: "Göztepe Park",
    distance: "8 KM",
    image: "/images/ar-20.jpg",
    time: "19:00",
  },
  {
    name: "KÜLTÜRPARK NIGHT",
    date: "APR 01, 2026",
    location: "Kültürpark, Alsancak",
    distance: "6 KM",
    image: "/images/ar-01.jpg",
    time: "19:00",
  },
  {
    name: "KORDON LONG RUN",
    date: "APR 08, 2026",
    location: "Kordon → Karşıyaka",
    distance: "12 KM",
    image: "/images/ar-02.jpg",
    time: "19:00",
  },
];

export default function UpcomingRuns() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-[#111]"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        {/* Header */}
        <div className="flex items-end justify-between mb-16">
          <div>
            <p className="label-text text-white/60 mb-4">UPCOMING</p>
            <h2 className="headline-lg">
              NEXT<br />RUNS
            </h2>
          </div>
          <p className="body-text hidden md:block max-w-xs text-right">
            Join us on the streets of Izmir. Every run is open to everyone.
          </p>
        </div>

        {/* Run cards */}
        <div className="space-y-4">
          {runs.map((run, i) => (
            <motion.div
              key={i}
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
                  src={run.image}
                  alt={run.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </motion.div>

              <div className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                {/* Index */}
                <p className="text-white/50 text-sm font-medium hidden md:block">
                  {String(i + 1).padStart(2, "0")}
                </p>
                {/* Name */}
                <h3 className="text-lg md:text-xl font-bold tracking-wide uppercase group-hover:text-white transition-colors">
                  {run.name}
                </h3>
                {/* Date + Time */}
                <div>
                  <p className="text-sm text-[#999]">{run.date}</p>
                  <p className="text-xs text-[#666]">{run.time}</p>
                </div>
                {/* Location */}
                <p className="text-sm text-[#999] hidden md:block">
                  {run.location}
                </p>
                {/* Distance */}
                <p className="text-right font-bold text-lg">
                  {run.distance}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

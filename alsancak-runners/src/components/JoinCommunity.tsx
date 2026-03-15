"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import MagneticButton from "./MagneticButton";

interface CommunityStatsData {
  totalMembers: number;
  totalRuns: number;
  totalDistanceKm: number;
}

function AnimatedCounter({
  target,
  suffix = "",
  label,
  inView,
}: {
  target: number;
  suffix?: string;
  label: string;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView || target === 0) return;
    const duration = 2000;
    let startTime: number | null = null;
    let rafId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [inView, target]);

  return (
    <div className="text-center">
      <p className="text-4xl md:text-6xl font-bold text-white">
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="label-text mt-3">{label}</p>
    </div>
  );
}

export default function JoinCommunity() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [stats, setStats] = useState<CommunityStatsData>({
    totalMembers: 0,
    totalRuns: 0,
    totalDistanceKm: 0,
  });

  useEffect(() => {
    fetch("/api/community/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setStats({
            totalMembers: data.members || 0,
            totalRuns: data.totalRuns || 0,
            totalDistanceKm: data.totalDistanceKm || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 md:py-48 bg-[#0A0A0A]">
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        {/* Counters */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-32 border border-[#222] p-8 md:p-16"
        >
          <AnimatedCounter
            target={stats.totalRuns}
            label="TOPLAM KOŞU"
            inView={isInView}
          />
          <AnimatedCounter
            target={stats.totalMembers}
            suffix="+"
            label="AKTİF ÜYE"
            inView={isInView}
          />
          <AnimatedCounter
            target={stats.totalDistanceKm}
            suffix=" KM"
            label="KAT EDİLEN MESAFE"
            inView={isInView}
          />
        </motion.div>

        {/* Join CTA */}
        <div className="text-center">
          <div className="text-reveal-wrap">
            <motion.h2
              initial={{ y: "100%" }}
              animate={isInView ? { y: "0%" } : {}}
              transition={{
                duration: 1,
                delay: 0.3,
                ease: [0.76, 0, 0.24, 1],
              }}
              className="headline-xl mb-12"
            >
              JOIN THE<br />
              <span className="text-[#E6FF00]">RUN</span>
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <MagneticButton strength={0.3}>
              <Link
                href="/join"
                className="inline-block bg-[#E6FF00] text-black px-12 py-5 text-sm font-bold tracking-[0.15em] uppercase hover:bg-white transition-colors duration-300"
              >
                JOIN ALSANCAK RUNNERS
              </Link>
            </MagneticButton>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 1.2 }}
            className="body-text mt-8 max-w-md mx-auto"
          >
            Open to all levels. Free to join. Just bring your shoes.
          </motion.p>
        </div>
      </div>
    </section>
  );
}

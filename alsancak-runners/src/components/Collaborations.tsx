"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";

interface CommunityStats {
  members: number;
  totalRuns: number;
  totalDistanceKm: number;
  totalTimeHours: number;
}

export default function Collaborations() {
  const t = useTranslations("home.collaborations");
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    if (!isInView) return;
    fetch("/api/community/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, [isInView]);

  return (
    <section ref={sectionRef} className="relative py-32 md:py-48 bg-[#0A0A0A]">
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <p className="label-text text-white/60 mb-4">{t("label")}</p>
          <h2 className="headline-lg">
            {t("title").split("\n")[0]}
            <br />
            <span className="text-[#666]">{t("title").split("\n")[1]}</span>
          </h2>
        </motion.div>

        {/* Coming soon + community highlights */}
        <div className="grid md:grid-cols-2 gap-16 items-start">
          {/* Coming Soon card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="border border-dashed border-[#333] p-12 text-center"
          >
            <h3 className="headline-md mb-4">YAKINDA</h3>
            <p className="body-text text-[#888]">
              &#304;&#351; birlikleri yak&#305;nda duyurulacak.
            </p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.6 }}
              className="w-16 h-[2px] bg-white/20 mt-8 mx-auto origin-center"
            />
          </motion.div>

          {/* Community stats (real data) */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="border border-[#222] p-12"
            >
              <p className="label-text text-white/60 mb-8">TOPLULUK</p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-3xl font-bold text-[#E6FF00]">
                    {stats.members}
                  </p>
                  <p className="text-xs text-[#555] tracking-wider mt-2">
                    KO&#350;UCU
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">
                    {stats.totalRuns}
                  </p>
                  <p className="text-xs text-[#555] tracking-wider mt-2">
                    KO&#350;U
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">
                    {stats.totalDistanceKm}
                  </p>
                  <p className="text-xs text-[#555] tracking-wider mt-2">
                    TOPLAM KM
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">
                    {stats.totalTimeHours}
                  </p>
                  <p className="text-xs text-[#555] tracking-wider mt-2">
                    SAAT
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

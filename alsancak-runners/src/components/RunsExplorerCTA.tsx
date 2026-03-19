"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function RunsExplorerCTA() {
  const t = useTranslations("runsExplorer");

  return (
    <section className="py-16 md:py-24 border-t border-[#1a1a1a]">
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#555] mb-4">
            {t("mapMode.routes")}
          </p>
          <h2 className="text-2xl md:text-4xl font-bold tracking-wider text-white mb-4">
            {t("title")}
          </h2>
          <p className="text-[14px] text-[#666] mb-8 max-w-md mx-auto">
            {t("subtitle")}
          </p>
          <Link
            href="/runs"
            className="inline-block px-8 py-3 bg-[#E6FF00] text-[#0A0A0A] text-[12px] tracking-[0.15em] uppercase font-semibold hover:bg-[#E6FF00]/90 transition-colors"
          >
            {t("title")} →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

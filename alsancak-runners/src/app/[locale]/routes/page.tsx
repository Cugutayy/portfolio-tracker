"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RunningRouteMap from "@/components/RunningRouteMap";

interface Route {
  id: string;
  name: string;
  slug: string;
  description: string;
  distanceM: number;
  elevationGainM: number | null;
  surfaceType: string | null;
  difficulty: string | null;
  isLoop: boolean | null;
  city: string | null;
}

const difficultyColors: Record<string, string> = {
  easy: "#4ade80",
  moderate: "#E6FF00",
  hard: "#FC4C02",
};

export default function RoutesPage() {
  const t = useTranslations("routes");
  const [dbRoutes, setDbRoutes] = useState<Route[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  useEffect(() => {
    fetch("/api/routes")
      .then((r) => r.json())
      .then((data) => setDbRoutes(data.routes || []))
      .catch(console.error)
      .finally(() => setLoadingRoutes(false));
  }, []);

  return (
    <SmoothScroll>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative h-[60vh] flex items-end overflow-hidden bg-[#0A0A0A]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" />
          <div className="relative z-10 px-6 md:px-16 pb-16">
            <p className="label-text text-white/60 mb-4">{t("label")}</p>
            <h1 className="headline-xl">
              {t("title").replace(".", "")}<span className="text-[#E6FF00]">.</span>
              <br />
              <span className="text-[#E6FF00]">{t("titleHighlight")}</span>
            </h1>
            <p className="body-text mt-4 max-w-md">
              {t("subtitle")}
            </p>
          </div>
        </section>

        {/* Interactive SVG Map (editorial) */}
        <RunningRouteMap />

        {/* DB Routes Grid */}
        {!loadingRoutes && dbRoutes.length > 0 && (
          <section className="py-24 bg-[#0A0A0A]">
            <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
              <div className="mb-12">
                <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] mb-3">
                  {t("communityRoutes")}
                </p>
                <h2
                  className="text-3xl md:text-4xl font-bold text-white"
                  style={{ fontFamily: "var(--font-heading, inherit)" }}
                >
                  {t("popularRoutes")}
                </h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dbRoutes.map((route, i) => (
                  <RouteCard key={route.id} route={route} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Loading state */}
        {loadingRoutes && (
          <section className="py-24 bg-[#0A0A0A] flex justify-center">
            <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
          </section>
        )}
      </main>
      <Footer />
    </SmoothScroll>
  );
}

function RouteCard({ route, index }: { route: Route; index: number }) {
  const t = useTranslations("routes");
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const diffKey = route.difficulty || "moderate";
  const diff = {
    label: t(`difficulty.${diffKey}`),
    color: difficultyColors[diffKey] || "#E6FF00",
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Link
        href={{pathname: '/routes/[slug]', params: {slug: route.slug}}}
        className="block border border-[#222] hover:border-[#333] transition-all duration-300 group"
      >
        {/* Mini map placeholder */}
        <div className="h-[180px] bg-[#111] relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-5xl opacity-10">🗺️</div>
          </div>
          {/* Distance badge */}
          <div className="absolute top-4 left-4 bg-[#E6FF00] text-black px-3 py-1">
            <p className="text-xs font-bold">
              {(route.distanceM / 1000).toFixed(1)} KM
            </p>
          </div>
          {/* Loop badge */}
          {route.isLoop && (
            <div className="absolute top-4 right-4 border border-[#E6FF00]/30 bg-[#0A0A0A]/80 text-[#E6FF00] px-2 py-0.5">
              <p className="text-[9px] tracking-wider uppercase">{t("loop")}</p>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[9px] tracking-wider uppercase px-2 py-0.5 border"
              style={{
                color: diff.color,
                borderColor: `${diff.color}33`,
              }}
            >
              {diff.label}
            </span>
            {route.surfaceType && (
              <span className="text-[9px] tracking-wider uppercase text-[#555] px-2 py-0.5 border border-[#222]">
                {t(`surface.${route.surfaceType}`)}
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#E6FF00] transition-colors">
            {route.name}
          </h3>
          <p className="text-[13px] text-[#666] leading-relaxed line-clamp-2 mb-4">
            {route.description}
          </p>

          <div className="flex items-center gap-6 text-[12px] text-[#555]">
            <span>
              {(route.distanceM / 1000).toFixed(1)} km
            </span>
            {route.elevationGainM && (
              <span>↑ {Math.round(route.elevationGainM)}m</span>
            )}
            {route.city && <span>{route.city}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

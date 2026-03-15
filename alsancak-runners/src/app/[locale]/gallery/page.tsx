"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const galleryImages = [
  { src: "/images/ar-08.jpg", category: "runs", size: "large" },
  { src: "/images/ar-12.jpg", category: "community", size: "small" },
  { src: "/images/ar-10.jpg", category: "runs", size: "small" },
  { src: "/images/ar-25.jpg", category: "community", size: "large" },
  { src: "/images/ar-09.jpg", category: "runs", size: "small" },
  { src: "/images/ar-19.jpg", category: "community", size: "small" },
  { src: "/images/ar-17.jpg", category: "runs", size: "large" },
  { src: "/images/ar-14.jpg", category: "city", size: "small" },
  { src: "/images/ar-06.jpg", category: "runs", size: "small" },
  { src: "/images/ar-16.jpg", category: "community", size: "small" },
  { src: "/images/ar-01.jpg", category: "community", size: "large" },
  { src: "/images/ar-15.jpg", category: "city", size: "small" },
  { src: "/images/ar-05.jpg", category: "runs", size: "small" },
  { src: "/images/ar-20.jpg", category: "community", size: "large" },
  { src: "/images/ar-11.jpg", category: "runs", size: "small" },
  { src: "/images/ar-04.jpg", category: "runs", size: "small" },
];

const filterKeys = ["all", "runs", "community", "city"] as const;

export default function GalleryPage() {
  const t = useTranslations("gallery");
  const [activeFilter, setActiveFilter] = useState("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    if (lightbox) {
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }
  }, [lightbox, closeLightbox]);

  const filtered =
    activeFilter === "all"
      ? galleryImages
      : galleryImages.filter((img) => img.category === activeFilter);

  return (
    <SmoothScroll>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 bg-[#0A0A0A] px-[clamp(1.5rem,4vw,4rem)]">
          <p className="label-text text-white/60 mb-4">{t("label")}</p>
          <h1 className="headline-xl mb-8">{t("title")}</h1>

          {/* Filters */}
          <div className="flex gap-6 border-b border-[#222] pb-4">
            {filterKeys.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`text-[11px] tracking-[0.15em] uppercase transition-all duration-300 pb-2 border-b-2 ${
                  activeFilter === filter
                    ? "text-[#E6FF00] border-[#E6FF00]"
                    : "text-[#666] border-transparent hover:text-white"
                }`}
              >
                {t(`filters.${filter}`)}
              </button>
            ))}
          </div>
        </section>

        {/* Grid */}
        <section className="bg-[#0A0A0A] px-3 md:px-6 pb-32">
          <motion.div layout className="grid grid-cols-2 md:grid-cols-4 gap-3 grid-flow-row-dense">
            <AnimatePresence mode="popLayout">
              {filtered.map((img, i) => (
                <motion.div
                  key={img.src}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, delay: i * 0.03 }}
                  onClick={() => setLightbox(img.src)}
                  className={`relative overflow-hidden cursor-pointer group ${
                    img.size === "large"
                      ? "col-span-2 row-span-2 aspect-square"
                      : "aspect-[3/4]"
                  }`}
                >
                  <Image
                    src={img.src}
                    alt={`Gallery ${i}`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes={img.size === "large" ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-500" />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>
      </main>
      <Footer />

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative w-[90vw] h-[85vh]"
            >
              <Image src={lightbox} alt="Full" fill className="object-contain" sizes="90vw" />
            </motion.div>
            <button
              onClick={closeLightbox}
              aria-label="Close lightbox"
              className="absolute top-8 right-8 text-white/60 hover:text-white text-sm tracking-widest"
            >
              {t("close")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </SmoothScroll>
  );
}

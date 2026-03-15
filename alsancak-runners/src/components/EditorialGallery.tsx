"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Image from "next/image";
import CursorTilt from "./CursorTilt";

const galleryImages = [
  { src: "/images/ar-08.jpg", size: "large", category: "runs" },
  { src: "/images/ar-12.jpg", size: "small", category: "community" },
  { src: "/images/ar-10.jpg", size: "small", category: "runs" },
  { src: "/images/ar-25.jpg", size: "large", category: "community" },
  { src: "/images/ar-09.jpg", size: "small", category: "runs" },
  { src: "/images/ar-19.jpg", size: "small", category: "community" },
  { src: "/images/ar-17.jpg", size: "large", category: "runs" },
  { src: "/images/ar-15.jpg", size: "small", category: "community" },
  { src: "/images/ar-06.jpg", size: "small", category: "runs" },
];

const filters = ["ALL", "RUNS", "COMMUNITY"];

export default function EditorialGallery() {
  const sectionRef = useRef<HTMLDivElement>(null);
  useInView(sectionRef, { once: true, margin: "-100px" });
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      activeFilter === "ALL"
        ? galleryImages
        : galleryImages.filter(
            (img) => img.category === activeFilter.toLowerCase()
          ),
    [activeFilter]
  );

  const closeLightbox = useCallback(() => setLightboxImage(null), []);

  const navigateLightbox = useCallback(
    (dir: 1 | -1) => {
      if (!lightboxImage) return;
      const idx = filtered.findIndex((img) => img.src === lightboxImage);
      if (idx === -1) return;
      const next = (idx + dir + filtered.length) % filtered.length;
      setLightboxImage(filtered[next].src);
    },
    [lightboxImage, filtered]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") navigateLightbox(1);
      if (e.key === "ArrowLeft") navigateLightbox(-1);
    };
    if (lightboxImage) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKey);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKey);
      };
    }
  }, [lightboxImage, closeLightbox, navigateLightbox]);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-[#111]"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <p className="label-text text-white/60 mb-4">GALLERY</p>
            <h2 className="headline-lg">
              EDITORIAL<br />
              <span className="text-[#666]">MOMENTS</span>
            </h2>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mt-8 md:mt-0">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`text-[11px] tracking-[0.15em] uppercase transition-all duration-300 pb-1 border-b ${
                  activeFilter === filter
                    ? "text-[#E6FF00] border-[#E6FF00]"
                    : "text-[#666] border-transparent hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Editorial grid */}
        <motion.div layout className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 grid-flow-row-dense">
          <AnimatePresence mode="popLayout">
            {filtered.map((img, i) => (
              <motion.div
                key={img.src}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className={`${
                  img.size === "large"
                    ? "col-span-2 row-span-2 aspect-square"
                    : "aspect-[3/4]"
                }`}
              >
                <CursorTilt intensity={6} className="relative w-full h-full overflow-hidden cursor-pointer group">
                  <div
                    className="relative w-full h-full"
                    onClick={() => setLightboxImage(img.src)}
                    data-cursor-label="VIEW"
                  >
                    <Image
                      src={img.src}
                      alt={`Gallery ${i + 1}`}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes={
                        img.size === "large"
                          ? "(max-width: 768px) 100vw, 50vw"
                          : "(max-width: 768px) 50vw, 25vw"
                      }
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                      <p className="text-[10px] tracking-[0.15em] uppercase text-white/80">
                        {img.category}
                      </p>
                    </div>
                  </div>
                </CursorTilt>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Lightbox — blur backdrop + 3D + keyboard nav */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Gallery fullscreen view"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-[90vw] h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightboxImage}
                alt="Gallery fullscreen"
                fill
                className="object-contain"
                sizes="90vw"
              />
            </motion.div>

            {/* Navigation arrows */}
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
              aria-label="Previous image"
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-3xl transition-colors p-6 md:p-4"
            >
              ←
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
              aria-label="Next image"
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-3xl transition-colors p-6 md:p-4"
            >
              →
            </button>

            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              onClick={closeLightbox}
              aria-label="Close lightbox"
              className="absolute top-8 right-8 text-white/40 hover:text-white text-sm tracking-[0.15em] uppercase transition-colors"
            >
              CLOSE
            </motion.button>

            {/* Image counter */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-xs tracking-[0.2em]">
              {filtered.findIndex((img) => img.src === lightboxImage) + 1} / {filtered.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

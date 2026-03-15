"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import Image from "next/image";

const photos = [
  {
    src: "/images/ar-07.jpg",
    label: "WARM UP",
    aspect: "aspect-[3/4]",
  },
  {
    src: "/images/ar-13.jpg",
    label: "BRIEFING",
    aspect: "aspect-[4/5]",
  },
  {
    src: "/images/ar-08.jpg",
    label: "THE RUN",
    aspect: "aspect-[3/4]",
  },
  {
    src: "/images/ar-02.jpg",
    label: "TOGETHER",
    aspect: "aspect-[4/3]",
  },
  {
    src: "/images/ar-05.jpg",
    label: "NIGHT RUN",
    aspect: "aspect-[3/4]",
  },
  {
    src: "/images/ar-04.jpg",
    label: "CELEBRATION",
    aspect: "aspect-[4/5]",
  },
];

export default function PhotoStoryStrip() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const x = useTransform(scrollYProgress, [0, 1], ["5%", "-60%"]);

  return (
    <section ref={containerRef} className="relative py-32 bg-[#0A0A0A] overflow-hidden">
      {/* Section header */}
      <div className="px-[clamp(1.5rem,4vw,4rem)] mb-16">
        <p className="label-text text-white/60 mb-4">PHOTO STORY</p>
        <h2 className="headline-lg">
          EVERY RUN<br />
          <span className="text-[#666]">HAS A STORY</span>
        </h2>
      </div>

      {/* Horizontal scroll strip */}
      <motion.div style={{ x }} className="flex gap-6 md:gap-8 pl-[clamp(1.5rem,4vw,4rem)]">
        {photos.map((photo, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.8 }}
            className={`flex-shrink-0 w-[280px] md:w-[400px] group cursor-pointer`}
          >
            <div
              className={`${photo.aspect} relative overflow-hidden`}
            >
              <Image
                src={photo.src}
                alt={photo.label}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="400px"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] group-hover:text-white transition-colors">
                {photo.label}
              </p>
              <p className="text-[10px] text-[#444]">
                {String(i + 1).padStart(2, "0")}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Progress line */}
      <div className="px-[clamp(1.5rem,4vw,4rem)] mt-16">
        <div className="w-full h-[1px] bg-[#222] relative overflow-hidden">
          <motion.div
            style={{ scaleX: scrollYProgress }}
            className="absolute inset-0 bg-white/40 origin-left"
          />
        </div>
      </div>
    </section>
  );
}

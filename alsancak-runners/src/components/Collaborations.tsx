"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

const collabs = [
  {
    brand: "BESS BAKERY",
    title: "BESS BAKERY X ALSANCAK RUNNERS",
    subtitle: "Pre-Run Fuel Partnership",
    image: "/images/ar-14.jpg",
    video: "/videos/ar-bess-collab.mp4",
    color: "#FFFFFF",
  },
  {
    brand: "ADIDAS",
    title: "ADIDAS RUNNERS X AR",
    subtitle: "Dream Runners Program",
    image: "/images/ar-25.jpg",
    video: "/videos/ar-adidas-dream.mp4",
    color: "#FFFFFF",
  },
  {
    brand: "PIERCING ISTANBUL",
    title: "PIERCING ISTANBUL X AR",
    subtitle: "Urban Style Collab",
    image: "/images/ar-11.jpg",
    video: "/videos/ar-piercing-collab.mp4",
    color: "#FFFFFF",
  },
];

export default function Collaborations() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

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
          <p className="label-text text-white/60 mb-4">COLLABORATIONS</p>
          <h2 className="headline-lg">
            CULTURE<br />
            <span className="text-[#666]">MEETS RUNNING</span>
          </h2>
        </motion.div>

        {/* Collab blocks */}
        <div className="space-y-32">
          {collabs.map((collab, i) => (
            <CollabBlock key={i} collab={collab} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CollabBlock({
  collab,
  index,
}: {
  collab: (typeof collabs)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const reversed = index % 2 !== 0;

  const handleMouseEnter = () => {
    videoRef.current?.play();
  };
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 1 }}
      className="grid md:grid-cols-2 gap-8 md:gap-16 items-center"
    >
      {/* Image + Video on hover */}
      <motion.div
        style={{ y: imageY }}
        className={`relative aspect-[4/3] overflow-hidden group ${
          reversed ? "md:order-2" : ""
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-cursor-label="PLAY"
      >
        <motion.div
          initial={{ scale: 1.3 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
          className="relative w-full h-full"
        >
          <Image
            src={collab.image}
            alt={collab.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          {collab.video && (
            <video
              ref={videoRef}
              muted
              loop
              playsInline
              preload="none"
              poster={collab.image}
              className="absolute inset-0 w-full h-full object-cover object-[center_25%] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            >
              <source src={collab.video} type="video/mp4" />
            </video>
          )}
          <div className="absolute inset-0 bg-[#0A0A0A]/20 group-hover:bg-[#0A0A0A]/10 transition-all duration-500" />
        </motion.div>
      </motion.div>

      {/* Content */}
      <div className={`${reversed ? "md:order-1 md:text-right" : ""}`}>
        <div className="text-reveal-wrap">
          <motion.p
            initial={{ y: "100%" }}
            animate={isInView ? { y: "0%" } : {}}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
            className="label-text mb-4"
            style={{ color: collab.color }}
          >
            {collab.brand}
          </motion.p>
        </div>
        <div className="text-reveal-wrap">
          <motion.h3
            initial={{ y: "100%" }}
            animate={isInView ? { y: "0%" } : {}}
            transition={{
              duration: 0.8,
              delay: 0.1,
              ease: [0.76, 0, 0.24, 1],
            }}
            className="headline-md mb-4"
          >
            {collab.title}
          </motion.h3>
        </div>
        <div className="text-reveal-wrap">
          <motion.p
            initial={{ y: "100%" }}
            animate={isInView ? { y: "0%" } : {}}
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.76, 0, 0.24, 1],
            }}
            className="body-text"
          >
            {collab.subtitle}
          </motion.p>
        </div>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.76, 0, 0.24, 1] }}
          className={`w-16 h-[2px] bg-white/20 mt-8 ${
            reversed ? "md:ml-auto origin-right" : "origin-left"
          }`}
        />
      </div>
    </motion.div>
  );
}

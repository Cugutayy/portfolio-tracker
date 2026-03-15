"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

export default function CinematicIntro() {
  const [phase, setPhase] = useState(0); // 0=black, 1=video, 2=title, 3=subtitle, 4=done
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.3 });

  useEffect(() => {
    // Phase 0: Black screen (0.5s)
    const t1 = setTimeout(() => setPhase(1), 500);
    // Phase 2: Title appears (after video ~3s)
    const t2 = setTimeout(() => setPhase(2), 1200);
    // Phase 3: Subtitle
    const t3 = setTimeout(() => setPhase(3), 2200);
    // Phase 4: Full reveal
    const t4 = setTimeout(() => setPhase(4), 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  // Pause video when scrolled out of view
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isInView) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isInView]);

  return (
    <section ref={sectionRef} className="relative h-dvh w-full overflow-hidden bg-[#0A0A0A] flex items-center justify-center">
      {/* Background video / gradient simulation */}
      {phase >= 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            poster="/images/ar-08.jpg"
          >
            <source src="/videos/ar-intro.mp4" type="video/mp4" />
          </video>
          {/* Cinematic overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        </motion.div>
      )}

      {/* Title: ALSANCAK RUNNERS */}
      <div className="relative z-10 text-center px-4">
        <div className="text-reveal-wrap">
          <motion.h1
            initial={{ y: "110%" }}
            animate={phase >= 2 ? { y: "0%" } : { y: "110%" }}
            transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
            className="headline-xl"
          >
            <span className="block">ALSANCAK</span>
          </motion.h1>
        </div>
        <div className="text-reveal-wrap">
          <motion.h1
            initial={{ y: "110%" }}
            animate={phase >= 2 ? { y: "0%" } : { y: "110%" }}
            transition={{ duration: 1.2, delay: 0.15, ease: [0.76, 0, 0.24, 1] }}
            className="headline-xl"
          >
            <span className="block">
              RUNNER<span className="text-[#E6FF00]">S</span>
            </span>
          </motion.h1>
        </div>

        {/* Subtitle: RUN THE CITY */}
        <div className="overflow-hidden mt-6">
          <motion.p
            initial={{ y: "110%" }}
            animate={phase >= 3 ? { y: "0%" } : { y: "110%" }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="text-sm md:text-base tracking-[0.3em] uppercase text-[#999]"
          >
            RUN THE CITY
          </motion.p>
        </div>

        {/* Accent line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.5, delay: 0.3, ease: [0.76, 0, 0.24, 1] }}
          className="w-16 h-[2px] bg-white/30 mx-auto mt-6 origin-left"
        />
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#666] mb-3">
            SCROLL TO RUN
          </p>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            className="mx-auto text-white/50"
          >
            <path
              d="M10 3 L10 17 M4 11 L10 17 L16 11"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </motion.div>
      </motion.div>

      {/* Side text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1 }}
        className="absolute left-6 top-1/2 -translate-y-1/2 hidden md:block"
      >
        <p
          className="text-[10px] tracking-[0.3em] uppercase text-[#444] origin-center"
          style={{ writingMode: "vertical-rl" }}
        >
          EST. 2025 — IZMIR, TURKEY
        </p>
      </motion.div>
    </section>
  );
}

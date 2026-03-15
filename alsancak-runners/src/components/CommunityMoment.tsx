"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import TextReveal from "./TextReveal";

export default function CommunityMoment() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const textY = useTransform(scrollYProgress, [0.2, 0.6], [60, 0]);
  const textOpacity = useTransform(scrollYProgress, [0.2, 0.45], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Full screen editorial photo */}
      <motion.div style={{ scale, y }} className="absolute inset-0">
        <Image
          src="/images/ar-01.jpg"
          alt="Alsancak Runners group briefing at Kültürpark"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Cinematic gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />
      </motion.div>

      {/* Overlay text */}
      <div className="absolute inset-0 flex items-end pb-20 md:pb-32 px-6 md:px-16">
        <motion.div style={{ y: textY, opacity: textOpacity }}>
          <p className="label-text text-white/60 mb-4">SCENE II</p>
          <TextReveal as="h2" className="headline-lg max-w-3xl" mode="line">
            {"WE RUN\nTOGETHER"}
          </TextReveal>
          <p className="body-text mt-6 max-w-md">
            Every stride, every breath, every moment — shared.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

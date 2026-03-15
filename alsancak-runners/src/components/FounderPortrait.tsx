"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import TextReveal from "./TextReveal";

export default function FounderPortrait() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const textOpacity = useTransform(scrollYProgress, [0.05, 0.2], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.05, 0.2], [40, 0]);
  const lineScale = useTransform(scrollYProgress, [0.3, 0.5], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#0A0A0A] py-0 overflow-hidden"
    >
      <div className="max-w-[1600px] mx-auto grid md:grid-cols-[1fr_1fr] items-center min-h-[90vh]">
        {/* Left — Large portrait image with parallax */}
        <div className="relative h-[70vh] md:h-[90vh] overflow-hidden">
          <motion.div
            style={{ y: imageY }}
            className="absolute inset-0 -bottom-[15%]"
          >
            <Image
              src="/images/ar-11.jpg"
              alt="Co-Founder of Alsancak Runners running through Alsancak's palm-lined streets"
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </motion.div>
          {/* Subtle edge gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/50 hidden md:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent md:hidden" />
        </div>

        {/* Right — Editorial text */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="relative px-6 md:px-16 py-16 md:py-0"
        >
          <p className="label-text text-white/60 mb-6 tracking-[0.3em]">
            CO-FOUNDER
          </p>
          <TextReveal
            as="h2"
            className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-tight text-white mb-8"
            mode="line"
            delay={0.2}
          >
            {"FROM THE\nSTREETS OF\nALSANCAK"}
          </TextReveal>
          <p className="body-text text-lg leading-relaxed max-w-md mb-8">
            Running isn&apos;t just a sport — it&apos;s a way of connecting with
            the city and the people in it. Every stride tells a story.
          </p>
          <motion.div
            style={{ scaleX: lineScale }}
            className="w-20 h-[2px] bg-white/20 origin-left"
          />
        </motion.div>
      </div>
    </section>
  );
}

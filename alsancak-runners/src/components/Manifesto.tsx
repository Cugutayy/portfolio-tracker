"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import TextReveal from "./TextReveal";
import ImageReveal from "./ImageReveal";

const manifestoLines = [
  "WE RUN THE CITY.",
  "Alsancak Runners is an urban running collective based in Izmir.",
  "Running connects people to the city.",
  "Every street is a route. Every run is a story.",
  "We don't just run — we move culture forward.",
];

export default function Manifesto() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full bg-[#111] py-32 md:py-48"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        {/* Section label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="label-text text-white/60 mb-16"
        >
          OUR MANIFESTO
        </motion.p>

        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
          {/* Left: Manifesto text */}
          <div className="space-y-8">
            {/* Headline with word-by-word reveal */}
            <TextReveal
              as="p"
              className="headline-md text-white"
              delay={0}
              mode="word"
            >
              {manifestoLines[0]}
            </TextReveal>

            {/* Body lines with staggered reveal */}
            {manifestoLines.slice(1).map((line, i) => (
              <div key={i} className="text-reveal-wrap">
                <motion.p
                  initial={{ y: "100%", opacity: 0 }}
                  animate={isInView ? { y: "0%", opacity: 1 } : {}}
                  transition={{
                    duration: 0.8,
                    delay: 0.4 + i * 0.12,
                    ease: [0.76, 0, 0.24, 1],
                  }}
                  className="text-lg md:text-xl text-[#999] leading-relaxed"
                >
                  {line}
                </motion.p>
              </div>
            ))}

            {/* Accent line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.8, ease: [0.76, 0, 0.24, 1] }}
              className="w-24 h-[2px] bg-white/20 origin-left"
            />
          </div>

          {/* Right: Editorial photography */}
          <motion.div
            style={{ y: imageY }}
            className="relative aspect-[3/4] overflow-hidden"
          >
            <ImageReveal
              src="/images/ar-03.jpg"
              alt="Alsancak Runners at dusk under Kültürpark palms"
              sizes="(max-width: 768px) 100vw, 50vw"
              reveal="curtain-right"
              duration={1.4}
              delay={0.3}
              className="w-full h-full"
            />
            {/* Photo caption */}
            <div className="absolute bottom-6 left-6 z-10">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/60">
                Alsancak, Izmir — 2026
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

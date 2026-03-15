"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface MarqueeProps {
  text: string;
  speed?: number;
  className?: string;
  separator?: string;
}

export default function Marquee({
  text,
  speed = 20,
  className = "",
  separator = " — ",
}: MarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);
  const repeats = 6;
  const fullText = Array(repeats)
    .fill(text + separator)
    .join("");

  return (
    <div
      className={`overflow-hidden whitespace-nowrap relative ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-[#111] to-transparent z-10 pointer-events-none" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-[#111] to-transparent z-10 pointer-events-none" />

      <motion.div
        className="inline-block"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: isPaused ? speed * 4 : speed,
            ease: "linear",
          },
        }}
      >
        <span>{fullText}</span>
        <span>{fullText}</span>
      </motion.div>
    </div>
  );
}

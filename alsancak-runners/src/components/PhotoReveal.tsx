"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface PhotoRevealProps {
  children: React.ReactNode;
  className?: string;
}

export default function PhotoReveal({
  children,
  className = "",
}: PhotoRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const blur = useTransform(scrollYProgress, [0, 0.8], [8, 0]);
  const filterValue = useTransform(blur, (v) =>
    v > 0.1 ? `blur(${v}px)` : "none"
  );
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0.4, 1]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1]);

  return (
    <motion.div
      ref={ref}
      style={{ filter: filterValue, opacity, scale }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

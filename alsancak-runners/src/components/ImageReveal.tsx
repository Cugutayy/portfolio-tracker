"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface ImageRevealProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  reveal?: "curtain-right" | "curtain-up" | "scale" | "iris";
  duration?: number;
  delay?: number;
}

const EASE = [0.76, 0, 0.24, 1] as [number, number, number, number];

const clipPaths = {
  "curtain-right": {
    initial: "inset(0% 100% 0% 0%)",
    animate: "inset(0% 0% 0% 0%)",
  },
  "curtain-up": {
    initial: "inset(100% 0% 0% 0%)",
    animate: "inset(0% 0% 0% 0%)",
  },
  iris: {
    initial: "circle(0% at 50% 50%)",
    animate: "circle(100% at 50% 50%)",
  },
};

export default function ImageReveal({
  src,
  alt,
  fill = true,
  width,
  height,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  className = "",
  reveal = "curtain-right",
  duration = 1.4,
  delay = 0,
}: ImageRevealProps) {
  if (reveal === "scale") {
    return (
      <motion.div
        className={`relative overflow-hidden ${className}`}
        initial={{ scale: 1.2, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration, delay, ease: EASE }}
      >
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </motion.div>
    );
  }

  const clip = clipPaths[reveal];
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      initial={{ clipPath: clip.initial }}
      whileInView={{ clipPath: clip.animate }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration, delay, ease: EASE }}
    >
      {/* Inner scale for parallax depth */}
      <motion.div
        className="relative w-full h-full"
        initial={{ scale: 1.15 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: duration + 0.4, delay, ease: EASE }}
      >
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </motion.div>
    </motion.div>
  );
}

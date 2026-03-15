"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface TextRevealProps {
  children: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  mode?: "word" | "line";
  once?: boolean;
}

const EASE = [0.76, 0, 0.24, 1] as const;

export default function TextReveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "h2",
  mode = "word",
  once = true,
}: TextRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-80px" });

  if (mode === "line") {
    const lines = children.split("\n");
    return (
      <Tag className={className}>
        <span ref={ref}>
          {lines.map((line, i) => (
            <span key={i} className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: "110%" }}
                animate={isInView ? { y: "0%" } : { y: "110%" }}
                transition={{
                  duration: 0.9,
                  delay: delay + i * 0.12,
                  ease: EASE,
                }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </span>
      </Tag>
    );
  }

  // Word mode
  const words = children.split(" ");
  return (
    <Tag className={className}>
      <span ref={ref}>
        {words.map((word, i) => (
          <span key={i} className="inline-block overflow-hidden mr-[0.25em]">
            <motion.span
              className="inline-block"
              initial={{ y: "110%", opacity: 0 }}
              animate={
                isInView
                  ? { y: "0%", opacity: 1 }
                  : { y: "110%", opacity: 0 }
              }
              transition={{
                duration: 0.7,
                delay: delay + i * 0.06,
                ease: EASE,
              }}
            >
              {word}
            </motion.span>
          </span>
        ))}
      </span>
    </Tag>
  );
}

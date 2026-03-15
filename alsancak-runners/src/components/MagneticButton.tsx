"use client";

import { useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  as?: "button" | "a" | "div";
  href?: string;
  onClick?: () => void;
  strength?: number;
  "data-cursor-label"?: string;
}

const springConfig = { stiffness: 200, damping: 15 };

export default function MagneticButton({
  children,
  className = "",
  as = "div",
  href,
  onClick,
  strength = 0.3,
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const x = useSpring(mvX, springConfig);
  const y = useSpring(mvY, springConfig);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      mvX.set((e.clientX - rect.left - rect.width / 2) * strength);
      mvY.set((e.clientY - rect.top - rect.height / 2) * strength);
    },
    [strength, mvX, mvY]
  );

  const handleMouseLeave = useCallback(() => {
    mvX.set(0);
    mvY.set(0);
  }, [mvX, mvY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      className="inline-block"
      onClick={onClick}
      {...rest}
    >
      {as === "a" && href ? (
        <a href={href} className={className}>
          {children}
        </a>
      ) : (
        <div className={className}>{children}</div>
      )}
    </motion.div>
  );
}

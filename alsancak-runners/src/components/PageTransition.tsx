"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "@/i18n/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  // Skip cinematic transition on dashboard — it's an app shell, not editorial
  if (pathname.startsWith("/dashboard")) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
      >
        {/* Cinematic wipe overlay */}
        <motion.div
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          exit={{ scaleY: 1 }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[999] bg-[#E6FF00] origin-top pointer-events-none"
        />
        <motion.div
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          exit={{ scaleY: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[998] bg-[#111] origin-top pointer-events-none"
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

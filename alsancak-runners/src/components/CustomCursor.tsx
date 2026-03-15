"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(true); // SSR-safe: always true initially
  const pathname = usePathname();

  // Skip custom cursor on dashboard — it's an app shell
  const isDashboard = pathname.startsWith("/dashboard");

  // Detect touch device after hydration
  useEffect(() => {
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouch(touch);
  }, []);

  useEffect(() => {
    if (isTouch || isDashboard) return;

    document.body.classList.add("custom-cursor-active");

    let hovering = false;
    let hidden = true;

    const moveCursor = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        if (hidden) {
          hidden = false;
          dotRef.current.style.opacity = hovering ? "0" : "1";
        }
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest(
        "a, button, [data-cursor-hover], [data-cursor-label]"
      );
      if (interactive && !hovering) {
        hovering = true;
        const label = interactive.getAttribute("data-cursor-label") || "";

        // Hide dot, show ring
        if (dotRef.current) dotRef.current.style.opacity = "0";
        if (ringRef.current) {
          ringRef.current.style.width = "56px";
          ringRef.current.style.height = "56px";
          ringRef.current.style.opacity = "1";
          const span = ringRef.current.querySelector("span");
          if (span) {
            span.textContent = label;
            span.style.opacity = label ? "1" : "0";
          }
        }
      } else if (!interactive && hovering) {
        hovering = false;

        // Show dot, hide ring
        if (dotRef.current && !hidden) dotRef.current.style.opacity = "1";
        if (ringRef.current) {
          ringRef.current.style.width = "0px";
          ringRef.current.style.height = "0px";
          ringRef.current.style.opacity = "0";
          const span = ringRef.current.querySelector("span");
          if (span) {
            span.textContent = "";
            span.style.opacity = "0";
          }
        }
      }
    };

    const handleLeave = () => {
      hidden = true;
      hovering = false;
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (ringRef.current) {
        ringRef.current.style.opacity = "0";
        ringRef.current.style.width = "0px";
        ringRef.current.style.height = "0px";
      }
    };

    const handleEnter = (e: MouseEvent) => {
      // Use the mouse event coordinates to properly reinitialize position
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        dotRef.current.style.opacity = "1";
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      hidden = false;
    };

    window.addEventListener("mousemove", moveCursor, { passive: true });
    window.addEventListener("mouseover", handleOver, { passive: true });
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseenter", handleEnter);

    return () => {
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseenter", handleEnter);
    };
  }, [isTouch, isDashboard]);

  if (isTouch || isDashboard) return null;

  return (
    <>
      {/* Dot — 1:1 tracking, hides on hover */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] will-change-transform"
        style={{ opacity: 0, transition: "opacity 0.12s ease" }}
      >
        <div className="w-[6px] h-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </div>

      {/* Ring — expands on hover with label */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] will-change-transform"
        style={{
          width: 0,
          height: 0,
          opacity: 0,
          transition:
            "width 0.2s cubic-bezier(0.23,1,0.32,1), height 0.2s cubic-bezier(0.23,1,0.32,1), opacity 0.12s ease",
        }}
      >
        <div className="w-full h-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 flex items-center justify-center">
          <span
            className="text-[7px] font-medium tracking-[0.15em] text-white uppercase whitespace-nowrap"
            style={{ opacity: 0, transition: "opacity 0.12s ease" }}
          />
        </div>
      </div>
    </>
  );
}

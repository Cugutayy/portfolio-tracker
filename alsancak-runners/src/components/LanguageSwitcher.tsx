"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const nextLocale = locale === "tr" ? "en" : "tr";
    router.replace(
      // @ts-expect-error -- pathname is always a valid route at runtime
      { pathname },
      { locale: nextLocale }
    );
  };

  return (
    <button
      onClick={toggleLocale}
      className={`relative flex items-center gap-1 text-[11px] tracking-[0.15em] uppercase transition-colors duration-300 ${className}`}
      aria-label={`Switch to ${locale === "tr" ? "English" : "Turkce"}`}
    >
      {routing.locales.map((l) => (
        <span
          key={l}
          className={`px-1.5 py-0.5 transition-all duration-300 ${
            l === locale
              ? "text-[#E6FF00] font-bold"
              : "text-[#555] hover:text-[#999]"
          }`}
        >
          {l.toUpperCase()}
        </span>
      ))}
      {/* Sliding indicator */}
      <span
        className="absolute bottom-0 h-[1px] bg-[#E6FF00] transition-all duration-300"
        style={{
          left: locale === "tr" ? "0%" : "50%",
          width: "50%",
        }}
      />
    </button>
  );
}

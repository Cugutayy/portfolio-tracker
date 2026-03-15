"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const pageLinks = [
  { key: "home" as const, href: "/" as const },
  { key: "events" as const, href: "/etkinlikler" as const },
  { key: "community" as const, href: "/topluluk" as const },
  { key: "routes" as const, href: "/routes" as const },
  { key: "gallery" as const, href: "/gallery" as const },
  { key: "about" as const, href: "/about" as const },
  { key: "join" as const, href: "/join" as const },
];

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="relative bg-[#111] border-t border-[#1a1a1a]">
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)] py-16 md:py-24">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold tracking-[0.1em]">
              ALSANCAK<span className="text-[#E6FF00]">.</span>RUNNERS
            </h3>
            <p className="body-text mt-4 max-w-sm">
              {t("tagline")}
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="label-text text-white/60 mb-6">{t("pages")}</p>
            <div className="space-y-3">
              {pageLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-[#666] hover:text-white transition-colors"
                >
                  {t(`pageLinks.${link.key}`)}
                </Link>
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <p className="label-text text-white/60 mb-6">{t("followUs")}</p>
            <div className="space-y-3">
              <a
                href="https://www.instagram.com/alsancakrunners/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-[#666] hover:text-white transition-colors"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-[#1a1a1a] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-[#444] tracking-wider">
            &copy; {t("copyright")}
          </p>
          <p className="text-[11px] text-[#444] tracking-wider">
            {t("location")}
          </p>
        </div>
      </div>

      {/* Large bottom text */}
      <div className="overflow-hidden border-t border-[#1a1a1a]">
        <p className="whitespace-nowrap text-[8vw] font-bold text-[#191919] py-4 tracking-tighter animate-marquee">
          {t("marquee").repeat(4)}
        </p>
      </div>
    </footer>
  );
}

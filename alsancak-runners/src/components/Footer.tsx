import Link from "next/link";

export default function Footer() {
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
              İzmir merkezli bir koşu topluluğu. Koşu, insanı şehre bağlar.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="label-text text-white/60 mb-6">SAYFALAR</p>
            <div className="space-y-3">
              {[
                { label: "Ana Sayfa", href: "/" },
                { label: "Etkinlikler", href: "/etkinlikler" },
                { label: "Topluluk", href: "/topluluk" },
                { label: "Rotalar", href: "/routes" },
                { label: "Galeri", href: "/gallery" },
                { label: "Hakkımızda", href: "/about" },
                { label: "Katıl", href: "/join" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-[#666] hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <p className="label-text text-white/60 mb-6">TAKİP ET</p>
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
            &copy; 2026 ALSANCAK RUNNERS. TÜM HAKLARI SAKLIDIR.
          </p>
          <p className="text-[11px] text-[#444] tracking-wider">
            İZMİR, TÜRKİYE — EST. 2025
          </p>
        </div>
      </div>

      {/* Large bottom text */}
      <div className="overflow-hidden border-t border-[#1a1a1a]">
        <p className="whitespace-nowrap text-[8vw] font-bold text-[#191919] py-4 tracking-tighter animate-marquee">
          ALSANCAK RUNNERS — ŞEHRİ KOŞ — ALSANCAK RUNNERS — ŞEHRİ KOŞ —
          ALSANCAK RUNNERS — ŞEHRİ KOŞ — ALSANCAK RUNNERS — ŞEHRİ KOŞ —
        </p>
      </div>
    </footer>
  );
}

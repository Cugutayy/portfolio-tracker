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
              An urban running collective based in Izmir, Turkey. Running
              connects people to the city.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="label-text text-white/60 mb-6">PAGES</p>
            <div className="space-y-3">
              {["Home", "Runs", "Collaborations", "Gallery", "About", "Join"].map(
                (link) => (
                  <Link
                    key={link}
                    href={link === "Home" ? "/" : `/${link.toLowerCase()}`}
                    className="block text-sm text-[#666] hover:text-white transition-colors"
                  >
                    {link}
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Social */}
          <div>
            <p className="label-text text-white/60 mb-6">FOLLOW</p>
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
            &copy; 2026 ALSANCAK RUNNERS. ALL RIGHTS RESERVED.
          </p>
          <p className="text-[11px] text-[#444] tracking-wider">
            IZMIR, TURKEY — EST. 2025
          </p>
        </div>
      </div>

      {/* Large bottom text */}
      <div className="overflow-hidden border-t border-[#1a1a1a]">
        <p className="whitespace-nowrap text-[8vw] font-bold text-[#191919] py-4 tracking-tighter animate-marquee">
          ALSANCAK RUNNERS — RUN THE CITY — ALSANCAK RUNNERS — RUN THE CITY —
          ALSANCAK RUNNERS — RUN THE CITY — ALSANCAK RUNNERS — RUN THE CITY —
        </p>
      </div>
    </footer>
  );
}

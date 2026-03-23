"use client";

import { motion } from "framer-motion";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CollaborationsPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative h-[60vh] flex items-end overflow-hidden bg-[#0A0A0A]">
          {/* Abstract grid background */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="w-full h-full"
              style={{
                backgroundImage:
                  "linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
          <div className="relative z-10 px-6 md:px-16 pb-16">
            <p className="label-text text-white/60 mb-4">PARTNERSHIPS</p>
            <h1 className="headline-xl">
              COLLAB<span className="text-[#E6FF00]">S</span>
            </h1>
          </div>
        </section>

        {/* Coming Soon */}
        <section className="bg-[#0A0A0A] py-32 md:py-48">
          <div className="max-w-[800px] mx-auto px-6 md:px-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="w-16 h-[2px] bg-[#E6FF00] mx-auto mb-12" />
              <h2 className="headline-md mb-8">YAKINDA</h2>
              <p className="body-text text-lg text-[#888] leading-relaxed max-w-md mx-auto">
                &#304;&#351; birlikleri yak&#305;nda duyurulacak. Markalar ve
                topluluk projeleriyle ilgili geli&#351;meleri takip edin.
              </p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.5, delay: 0.5 }}
                className="w-16 h-[2px] bg-white/10 mx-auto mt-12 origin-center"
              />
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </SmoothScroll>
  );
}

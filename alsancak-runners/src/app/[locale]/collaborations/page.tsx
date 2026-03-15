"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const campaigns = [
  {
    brand: "NIKE",
    title: "Nike x Alsancak Runners",
    subtitle: "Run Club Collection 2024",
    description:
      "A capsule collection designed for the streets of Izmir. Lightweight, breathable, built for Mediterranean heat. Every piece tells the story of our city runs.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1920&q=90",
    gallery: [
      "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&q=85",
      "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&q=85",
      "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=600&q=85",
    ],
  },
  {
    brand: "ON RUNNING",
    title: "On Running x AR",
    subtitle: "Cloudmonster City Edition",
    description:
      "Swiss engineering meets Aegean soul. The Cloudmonster City Edition features custom colorways inspired by Izmir's coastal sunsets.",
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1920&q=90",
    gallery: [
      "https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&q=85",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=85",
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=85",
    ],
  },
  {
    brand: "LOCAL",
    title: "Local Coffee x AR",
    subtitle: "Pre-Run Fuel Partnership",
    description:
      "Every great run starts with great coffee. Our partnership with Local Coffee brings exclusive pre-run fuel stations to every community event.",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=90",
    gallery: [
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=85",
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&q=85",
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=85",
    ],
  },
];

export default function CollaborationsPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative h-[60vh] flex items-end overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1920&q=90"
            alt="Collaborations"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="relative z-10 px-6 md:px-16 pb-16">
            <p className="label-text text-white/60 mb-4">PARTNERSHIPS</p>
            <h1 className="headline-xl">
              COLLAB<span className="text-[#E6FF00]">S</span>
            </h1>
          </div>
        </section>

        {/* Campaigns */}
        {campaigns.map((campaign, i) => (
          <CampaignSection key={i} campaign={campaign} index={i} />
        ))}
      </main>
      <Footer />
    </SmoothScroll>
  );
}

function CampaignSection({
  campaign,
}: {
  campaign: (typeof campaigns)[0];
  index?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <section ref={ref} className="bg-[#111] border-t border-[#1a1a1a]">
      {/* Hero image */}
      <motion.div style={{ y: heroY }} className="relative h-[80vh] overflow-hidden">
        <motion.div
          initial={{ scale: 1.2 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ duration: 2, ease: [0.76, 0, 0.24, 1] }}
          className="relative w-full h-full"
        >
          <Image
            src={campaign.image}
            alt={campaign.title}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/30" />
        </motion.div>
        <div className="absolute bottom-12 left-6 md:left-16">
          <p className="label-text text-white/60 mb-3">{campaign.brand}</p>
          <h2 className="headline-lg">{campaign.title}</h2>
        </div>
      </motion.div>

      {/* Story */}
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)] py-24">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <h3 className="headline-md mb-6">{campaign.subtitle}</h3>
            <p className="body-text text-lg leading-relaxed">
              {campaign.description}
            </p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="w-16 h-[2px] bg-white/20 mt-8 origin-left"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {campaign.gallery.map((img, j) => (
              <motion.div
                key={j}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + j * 0.1 }}
                className="relative aspect-[3/4] overflow-hidden"
              >
                <Image
                  src={img}
                  alt={`${campaign.title} ${j + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                  sizes="200px"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

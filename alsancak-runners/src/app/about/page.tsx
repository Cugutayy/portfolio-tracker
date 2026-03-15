"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const manifesto = [
  {
    title: "WE RUN THE CITY",
    text: "Alsancak Runners was born from a simple idea: running is better together. What started as a small group of friends running along Kordon has grown into Izmir's most vibrant urban running collective.",
  },
  {
    title: "EVERY STREET IS A ROUTE",
    text: "We don't run in circles. We explore. From the cobblestones of Alsancak to the coastline of Kordon, every run is a journey through the city's layers of history, culture, and energy.",
  },
  {
    title: "OPEN TO ALL",
    text: "There's no pace requirement. No membership fee. No judgment. Whether you're running your first kilometer or your thousandth, you belong here.",
  },
  {
    title: "CULTURE IN MOTION",
    text: "Running is more than fitness. It's how we connect with the city, with each other, and with ourselves. We collaborate with brands, artists, and local businesses to create experiences that move beyond the run.",
  },
];

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <SmoothScroll>
      <Navbar />
      <main>
        {/* Hero */}
        <section
          ref={heroRef}
          className="relative h-[85vh] flex items-end overflow-hidden"
        >
          <motion.div style={{ scale: heroScale }} className="absolute inset-0">
            <Image
              src="/images/ar-17.jpg"
              alt="Alsancak Runners running through the streets of Izmir"
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <motion.div
            style={{ opacity: heroOpacity }}
            className="relative z-10 px-6 md:px-16 pb-16 md:pb-24 max-w-3xl"
          >
            <p className="label-text text-white/60 mb-4">WHO WE ARE</p>
            <h1 className="headline-xl mb-6">
              ABOUT<br />
              <span className="text-[#E6FF00]">US</span>
            </h1>
            <p className="body-text text-lg">
              An urban running collective redefining how Izmir moves.
            </p>
          </motion.div>
        </section>

        {/* Manifesto blocks */}
        <section className="py-32 bg-[#111]">
          <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
            <div className="space-y-32">
              {manifesto.map((item, i) => (
                <ManifestoBlock key={i} item={item} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Editorial full-bleed image — manifesto poster */}
        <section className="relative h-[70vh] overflow-hidden">
          <Image
            src="/images/ar-24.jpg"
            alt="Alsancak Runners — New Running Culture manifesto"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#0A0A0A]/30" />
        </section>

        {/* Founder */}
        <FounderSection />

        {/* Community photo grid — bento layout for portrait photos */}
        <section className="py-32 bg-[#0A0A0A]">
          <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
            <p className="label-text text-white/60 mb-4">THE CREW</p>
            <h2 className="headline-lg mb-16">OUR COMMUNITY</h2>

            {/* Row 1: 3 portrait photos */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              {[
                "/images/ar-12.jpg",
                "/images/ar-16.jpg",
                "/images/ar-19.jpg",
              ].map((src, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="relative aspect-[3/4] overflow-hidden group"
                >
                  <Image
                    src={src}
                    alt={`Community moment ${i + 1}`}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </motion.div>
              ))}
            </div>

            {/* Row 2: 2 portrait photos, wider layout */}
            <div className="grid grid-cols-2 gap-3">
              {["/images/ar-20.jpg", "/images/ar-04.jpg"].map((src, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.24 }}
                  className="relative aspect-[3/4] overflow-hidden group"
                >
                  <Image
                    src={src}
                    alt={`Community moment ${i + 4}`}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                    sizes="50vw"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </SmoothScroll>
  );
}

const teamMembers = [
  {
    name: "NAZ KARAGÖZOĞLU",
    role: "FOUNDER",
    image: "/images/ar-18.jpg",
    alt: "Naz Karagözoğlu — Founder of Alsancak Runners",
    bio: "Hayatındaki zorlu süreçte ona en iyi gelen şeyin koşmak olduğunu fark ettiğinde bu duyguyu başkalarıyla da paylaşmak ve koşmanın sadece performans ve rekabetten ibaret olmadığını göstermek için yeni koşu kültürünü İzmir\u2019in ritmi ile buluşturdu.",
  },
  {
    name: "HAKAN ÖZDİL",
    role: "CAPTAIN",
    image: "/images/ar-11.jpg",
    alt: "Hakan Özdil — Captain of Alsancak Runners",
    bio: "Uzun yıllar futbol oynadıktan sonra Ege Üniversitesi Beden Eğitimi ve Spor Yüksekokulu\u2019nu kazanıp antrenörlük yapmaya başlamıştır. 23 yıldır özellikle grup derslerindeki tecrübesi ile bugün yeni koşu kültürüne liderliği ile yön veriyor.",
  },
  {
    name: "İZEM GÖKDEMİR",
    role: "PACER",
    image: "/images/ar-03.jpg",
    alt: "İzem Gökdemir — Pacer of Alsancak Runners",
    bio: "Ege Üniversitesi Beden Eğitimi Öğretmenliği okurken basketbol oynamaya devam etmiş, yaşadığı sakatlık sonrasında İzmir\u2019e dönerek antrenörlük kariyerini sürdürürken aynı zamanda Alsancak Runners pacer\u2019ı olarak koşuculara ritim tutmaktadır.",
  },
];

function FounderSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-32 md:py-48 bg-[#111]">
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)]">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="label-text text-white/60 mb-16"
        >
          EKİBİMİZ
        </motion.p>

        <div className="space-y-32">
          {teamMembers.map((member, i) => {
            const reversed = i % 2 !== 0;
            return (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: 1,
                  ease: [0.76, 0, 0.24, 1],
                }}
                className="grid md:grid-cols-2 gap-12 md:gap-24 items-center"
              >
                {/* Image */}
                <div
                  className={`relative aspect-[3/4] overflow-hidden ${
                    reversed ? "md:order-2" : ""
                  }`}
                >
                  <Image
                    src={member.image}
                    alt={member.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>

                {/* Content */}
                <div
                  className={`${
                    reversed ? "md:order-1 md:text-right" : ""
                  }`}
                >
                  <div className="text-reveal-wrap">
                    <motion.h3
                      initial={{ y: "100%" }}
                      whileInView={{ y: "0%" }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.8,
                        ease: [0.76, 0, 0.24, 1],
                      }}
                      className="headline-md mb-2"
                    >
                      {member.name}
                    </motion.h3>
                  </div>
                  <div className="text-reveal-wrap">
                    <motion.p
                      initial={{ y: "100%" }}
                      whileInView={{ y: "0%" }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.8,
                        delay: 0.1,
                        ease: [0.76, 0, 0.24, 1],
                      }}
                      className="label-text text-[#E6FF00] mb-8"
                    >
                      {member.role}
                    </motion.p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  >
                    <p className="body-text leading-relaxed">
                      {member.bio}
                    </p>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.4 }}
                      className={`w-24 h-[2px] bg-white/20 mt-8 ${
                        reversed
                          ? "md:ml-auto origin-right"
                          : "origin-left"
                      }`}
                    />
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ManifestoBlock({
  item,
  index,
}: {
  item: (typeof manifesto)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
      className="grid md:grid-cols-2 gap-8 md:gap-24 items-start"
    >
      <div>
        <p className="text-white/50 text-sm font-medium mb-4">
          {String(index + 1).padStart(2, "0")}
        </p>
        <h3 className="headline-md">{item.title}</h3>
      </div>
      <div>
        <p className="body-text text-lg leading-relaxed">{item.text}</p>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="w-16 h-[2px] bg-[#333] mt-8 origin-left"
        />
      </div>
    </motion.div>
  );
}

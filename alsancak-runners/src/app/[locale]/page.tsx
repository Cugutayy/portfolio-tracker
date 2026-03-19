"use client";

import dynamic from "next/dynamic";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import CinematicIntro from "@/components/CinematicIntro";
import CommunityMoment from "@/components/CommunityMoment";
import FounderPortrait from "@/components/FounderPortrait";
import Marquee from "@/components/Marquee";

// Lazy-load below-the-fold components for faster initial paint
const Manifesto = dynamic(() => import("@/components/Manifesto"));
const PhotoStoryStrip = dynamic(() => import("@/components/PhotoStoryStrip"));
const UpcomingRuns = dynamic(() => import("@/components/UpcomingRuns"));
const IzmirRunMap = dynamic(() => import("@/components/IzmirRunMap"));
const RunsExplorerCTA = dynamic(() => import("@/components/RunsExplorerCTA"));
const Collaborations = dynamic(() => import("@/components/Collaborations"));
const EditorialGallery = dynamic(() => import("@/components/EditorialGallery"));
const JoinCommunity = dynamic(() => import("@/components/JoinCommunity"));
const Footer = dynamic(() => import("@/components/Footer"));

export default function Home() {
  return (
    <SmoothScroll>
      <Navbar />
      <main>
        {/* Scene 1 — Cinematic Intro */}
        <CinematicIntro />

        {/* Scene 1.5 — Co-Founder Portrait (ar-11) */}
        <FounderPortrait />

        {/* Scene 2 — Community Moment */}
        <CommunityMoment />

        {/* Scene 3 — Manifesto */}
        <Manifesto />

        {/* Scene 4 — Photo Story Strip */}
        <PhotoStoryStrip />

        {/* Scene 5 — Upcoming Runs */}
        <UpcomingRuns />

        {/* Scene 6 — Izmir Running Map */}
        <IzmirRunMap />

        {/* Runs Explorer CTA */}
        <RunsExplorerCTA />

        {/* Scene 7 — Collaborations */}
        <Collaborations />

        {/* Marquee divider */}
        <Marquee
          text="RUN THE CITY"
          speed={15}
          className="py-8 bg-[#111] border-y border-[#1a1a1a] text-[5vw] md:text-[3vw] font-bold text-[#1a1a1a] tracking-tight"
        />

        {/* Scene 8 — Editorial Gallery */}
        <EditorialGallery />

        {/* Scene 9 — Join Community */}
        <JoinCommunity />
      </main>
      <Footer />
    </SmoothScroll>
  );
}

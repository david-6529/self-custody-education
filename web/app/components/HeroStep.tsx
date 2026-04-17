"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Terminal, Sparkles, Puzzle } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

// All 101 badge filenames
const ALL_BADGES = [
  "anchorman","any_gvc","astro_balls","astro_bean","captain","checkmate",
  "chris_favorite_badge","cosmic_guardian","doge","electric_rings",
  "elite_rainbow_ranger","fifteen_badges","fifty_badges","five_badges",
  "flow_state","forty_badges","full_send_maverick","full_throttle",
  "funky_fresh","fur_the_win","gamer","gold_member","gradient_hatrick",
  "gradient_high_five","gradient_lover","grayscale_seeker","great_stacheby",
  "gud_meat","hail_mary_heroes","high_noon_hustler","highkeymoments_1",
  "highkeymoments_2","homerun","hoodie_up_society","hue_too_fresh","king",
  "kinky","ladies_night","lamp","mountain_goat","multi_type_master",
  "necks_level","no_face_no_problem","nounish_vibes","one_of_one",
  "party_in_the_back","patch_powerhouse","pepe","plants","plastic_hatrick",
  "plastic_high_five","plastic_lover","poker_face","pothead","power_duo",
  "rack_em_up","rainbow_boombox","rainbow_bubble_goggles","rainbow_citizen",
  "rainbow_visor","ranger","robot_hatrick","robot_high_five","robot_lover",
  "science_goggles","seas_the_day","shadow_funk_division","shower","showtime",
  "sir_vibes_a_lot","stone","straw_man","sugar_rush","suited_up","super_rare",
  "surfer","tanks_a_lot","tatted_up","ten_badges","the_completionist",
  "thirty_badges","toy_bricks","trait_maxi","twenty_badges",
  "unfathomable_vibes","varsity_vibes","vibefoot_fan_club","vibestr_blue_tier",
  "vibestr_bounty_hunter","vibestr_bronze_tier","vibestr_cosmic_tier",
  "vibestr_diamond_tier","vibestr_gold_tier","vibestr_pink_tier",
  "vibestr_purple_tier","vibestr_silver_tier","vibetown_baller",
  "vibetown_social_club","visooor_enjoyooor","yin_n_yang","zoom_in_vibe_out",
];

// GVC portrait token IDs (real collection NFTs)
const GVC_PORTRAITS = [
  3939, 4604, 5300, 1138, 2445, 4612, 5267, 1934, 1960,
  147, 3504, 1576, 4836, 1082, 346, 4506, 4915, 1473,
  3516, 1346, 2787, 6608, 4443, 821, 5894,
];

interface HeroStepProps {
  onNext: () => void;
}

type FeaturedBuild = {
  id: string;
  name: string;
  status: "live" | "soon";
  url?: string;
  icon: typeof Sparkles;
  description: string;
};

const FEATURED_BUILDS: FeaturedBuild[] = [
  {
    id: "prompt-machine",
    name: "The Prompt Machine",
    status: "live",
    url: "https://prompt-gallery-theta.vercel.app/",
    icon: Sparkles,
    description: "Want to bring your GVC characters to life? Use our curated prompts to generate custom images, avatars, and scenes (or submit your own for the community!)",
  },
  {
    id: "vibematch",
    name: "VibeMatch",
    status: "soon",
    url: "https://vibematch.app",
    icon: Puzzle,
    description: "A new puzzle game from Good Vibes Club. Players can match badges, win prizes, and climb to the top of the leaderboard!",
  },
];

export default function HeroStep({ onNext }: HeroStepProps) {
  const badges = useMemo(() => shuffleArray([...ALL_BADGES]).slice(0, 25), []);
  const [activeBuild, setActiveBuild] = useState<string>("prompt-machine");
  const current = FEATURED_BUILDS.find((b) => b.id === activeBuild) || FEATURED_BUILDS[0];
  const CurrentIcon = current.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center w-full min-h-screen"
    >
      {/* Background embers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className="ember"
            style={{
              left: `${5 + (i * 7) % 90}%`,
              top: `${10 + ((i * 19) % 70)}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3.5 + (i % 5) * 0.8}s`,
              width: `${2 + (i % 4) * 1.5}px`,
              height: `${2 + (i % 4) * 1.5}px`,
              opacity: 0.3 + (i % 4) * 0.12,
            }}
          />
        ))}
      </div>

      {/* Top: GVC Portrait Marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="w-screen overflow-hidden badge-marquee-container pt-6"
      >
        <div className="badge-marquee">
          <div className="badge-marquee-track portrait-speed">
            {[...GVC_PORTRAITS, ...GVC_PORTRAITS].map((tokenId, i) => (
              <div key={`p-${i}`} className="badge-marquee-item">
                <div className="w-[130px] h-[130px] rounded-2xl overflow-hidden opacity-80 hover:opacity-100 hover:scale-105 transition-all duration-300">
                  <Image
                    src={`/portraits/gvc-${tokenId}.jpg`}
                    alt={`GVC #${tokenId}`}
                    width={130}
                    height={130}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Center: Content */}
      <div className="flex flex-col items-center text-center px-6 py-12 sm:py-16 relative z-10">
        {/* Shaka */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, duration: 0.6, type: "spring", stiffness: 150, damping: 14 }}
          className="wiggle-hover mb-4 cursor-default"
        >
          <Image
            src="/shaka.png"
            alt="GVC Shaka"
            width={80}
            height={80}
            className="drop-shadow-[0_0_30px_rgba(255,224,72,0.3)]"
            priority
          />
        </motion.div>

        {/* Presents */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-sm text-gvc-gold/50 font-display font-bold uppercase tracking-[0.08em] mb-3"
        >
          Good Vibes Club Presents
        </motion.p>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-7xl lg:text-8xl font-display font-black text-shimmer leading-[1.0] mb-4 tracking-wide uppercase"
        >
          The
          <br />
          Playground
        </motion.h1>

        {/* Subtitle + Description */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-lg sm:text-xl text-white/60 font-body max-w-lg mx-auto mb-8 space-y-2"
        >
          <p>A builder toolkit for the GVC community.</p>
          <p>Go from idea to live project in minutes. No coding experience needed.</p>
        </motion.div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-3">
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNext}
            className="
              group relative inline-flex items-center gap-3 px-10 py-5
              bg-gvc-gold text-gvc-black font-display font-bold text-xl
              rounded-2xl transition-all duration-300 glow-pulse
            "
          >
            Start Building
            <ArrowRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>

          <motion.a
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            href="/library"
            className="
              group relative inline-flex items-center gap-3 px-10 py-5
              border border-gvc-gold/30 bg-gvc-gold/5 text-gvc-gold
              font-display font-bold text-xl rounded-2xl
              hover:bg-gvc-gold/15 hover:border-gvc-gold/50 transition-all duration-300
            "
          >
            Asset Library
            <ArrowRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.a>

          <motion.a
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            href="https://github.com/brydisanto/gvc-builder-kit"
            target="_blank"
            rel="noopener noreferrer"
            className="
              group relative inline-flex items-center gap-3 px-10 py-5
              border border-gvc-gold/30 bg-gvc-gold/5 text-gvc-gold
              font-display font-bold text-xl rounded-2xl
              hover:bg-gvc-gold/15 hover:border-gvc-gold/50 transition-all duration-300
            "
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            GitHub Repo
            <ArrowRight className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.a>

          {/* Terminal link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-2 text-sm text-white/25 font-body inline-flex items-center gap-2 hover:text-white/40 transition-colors cursor-default"
          >
            <Terminal className="w-3.5 h-3.5" />
            Or try it in your terminal with <code className="text-gvc-gold/50 font-mono text-xs ml-1">npx create-gvc-app</code>
          </motion.p>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="mt-12 mb-8 h-px w-64 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />

          {/* Featured Builds */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-2xl sm:text-3xl font-display font-black text-white mb-6 uppercase tracking-wide"
          >
            Featured Builds
          </motion.h2>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-2 mb-6"
          >
            {FEATURED_BUILDS.map((build) => {
              const isActive = activeBuild === build.id;
              const isSoon = build.status === "soon";
              return (
                <button
                  key={build.id}
                  onClick={() => setActiveBuild(build.id)}
                  className={`px-5 py-2.5 rounded-xl font-display font-bold text-sm flex items-center gap-2 transition-all ${
                    isActive
                      ? "bg-gvc-gold/15 border border-gvc-gold/30 text-gvc-gold"
                      : "border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                  }`}
                >
                  {build.name}
                  {isSoon && <span className="text-[9px] opacity-60 ml-0.5">SOON</span>}
                </button>
              );
            })}
          </motion.div>

          {/* Featured build detail card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="w-full max-w-xl"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl bg-gvc-dark border border-white/10 p-8 text-center"
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                  current.status === "live" ? "bg-gvc-gold/15" : "bg-white/5"
                }`}>
                  <CurrentIcon className={`w-7 h-7 ${
                    current.status === "live" ? "text-gvc-gold" : "text-white/40"
                  }`} />
                </div>
                <h3 className={`font-display font-black text-xl mb-3 ${
                  current.status === "live" ? "text-gvc-gold" : "text-white/70"
                }`}>
                  {current.name}
                </h3>
                <p className="text-white/50 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                  {current.description}
                </p>
                {current.status === "live" && current.url ? (
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gvc-gold text-gvc-black rounded-xl font-display font-bold text-sm hover:shadow-[0_0_30px_rgba(255,224,72,0.3)] transition-all"
                  >
                    Launch It
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 text-white/30 rounded-xl font-display font-bold text-sm">
                    Coming Soon
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Bottom: Badge Marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="w-screen overflow-hidden badge-marquee-container pb-6"
      >
        <div className="badge-marquee badge-marquee-reverse">
          <div className="badge-marquee-track">
            {[...badges, ...badges].map((badge, i) => (
              <div key={`b-${i}`} className="badge-marquee-item">
                <Image
                  src={`/badges/${badge}.webp`}
                  alt={badge}
                  width={130}
                  height={130}
                  className="rounded-2xl opacity-85 hover:opacity-100 hover:scale-110 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

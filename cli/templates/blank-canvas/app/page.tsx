"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* Background — mixed-variant embers + rising particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(32)].map((_, i) => {
          const variant = i % 7 === 0 ? "ember-orb" : i % 3 === 0 ? "ember-lg" : "";
          const twinkle = i % 5 === 2 ? " ember-twinkle" : "";
          return (
            <div
              key={`e-${i}`}
              className={`ember ${variant}${twinkle}`}
              style={{
                left: `${(i * 7.3 + 4) % 100}%`,
                top: `${(i * 13.7 + 8) % 100}%`,
                animationDelay: `${(i * 0.4) % 7}s`,
                animationDuration: variant === "ember-orb" ? `${9 + (i % 4)}s` : `${5 + (i % 5)}s`,
              }}
            />
          );
        })}
        {[...Array(10)].map((_, i) => (
          <div
            key={`r-${i}`}
            className="rising-particle"
            style={{
              left: `${(i * 11 + 3) % 100}%`,
              animationDelay: `${i * 1.6}s`,
              animationDuration: `${10 + (i % 4) * 2.5}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-3xl mx-auto text-center relative z-10">
        {/* Shaka — bigger, with idle-wiggle animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          className="flex justify-center mb-5"
        >
          <Image
            src="/shaka.png"
            alt="GVC"
            width={88}
            height={88}
            priority
            className="shaka-idle drop-shadow-[0_0_25px_rgba(255,224,72,0.4)]"
          />
        </motion.div>

        {/* Subtitle pill — small, gold-tinted, sits above the title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gvc-gold/10 border border-gvc-gold/20 mb-6"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-gvc-gold animate-pulse" />
          <span className="text-xs font-body text-gvc-gold uppercase tracking-widest">
            Good Vibes Club Presents
          </span>
        </motion.div>

        {/* Project name — larger, centered */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="font-display font-black text-shimmer uppercase leading-[0.9] tracking-tight text-5xl sm:text-6xl lg:text-7xl mb-6"
        >
          {{PROJECT_NAME}}
        </motion.h1>

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gvc-green/10 border border-gvc-green/20 mb-10"
        >
          <div className="w-2 h-2 rounded-full bg-gvc-green animate-pulse" />
          <span className="text-sm text-gvc-green font-body">
            Your project is running
          </span>
        </motion.div>

        {/* What to do next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="text-left max-w-md mx-auto mb-10 rounded-2xl bg-gvc-dark border border-white/[0.08] p-6"
        >
          <h2 className="text-lg font-display font-bold text-white mb-3">
            Start building
          </h2>
          <p className="text-white/40 font-body text-sm mb-4">
            Open a new terminal tab and run:
          </p>
          <div className="bg-black/40 rounded-lg px-4 py-3 font-mono text-sm text-[#2EFF2E]/80 mb-3">
            claude
          </div>
          <p className="text-white/40 font-body text-sm">
            Claude already knows your project, brand, and what features you picked. Just tell it what you want to change.
          </p>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-white/20 text-xs font-body"
        >
          Made using the GVC Builder Kit
        </motion.p>
      </div>
    </main>
  );
}

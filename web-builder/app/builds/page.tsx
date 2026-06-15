"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { BUILDS, TYPE_LABELS, type Build, type BuildType } from "@/lib/builds";

type FilterKey = "all" | BuildType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tool", label: TYPE_LABELS.tool },
  { key: "game", label: TYPE_LABELS.game },
  { key: "ecosystem", label: TYPE_LABELS.ecosystem },
  { key: "showcase", label: TYPE_LABELS.showcase },
];

export default function BuildsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    const list = filter === "all" ? BUILDS : BUILDS.filter((b) => b.type === filter);
    return [...list].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === "live" ? -1 : 1;
    });
  }, [filter]);

  return (
    <div className="min-h-screen w-full">
      {/* Embers */}
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-body text-sm text-white/40 hover:text-white/70 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to The Playground
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 sm:mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gvc-gold/30 bg-gvc-gold/5 mb-4">
            <Image src="/shaka.png" alt="" width={16} height={16} className="wiggle-infinite" />
            <span className="font-display font-bold text-xs text-gvc-gold uppercase tracking-wider">
              GVC Presents
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-black uppercase tracking-tight mb-3">
            <span className="text-shimmer">Community Builds</span>
          </h1>
          <p className="font-body text-white/60 text-base sm:text-lg max-w-2xl">
            Everything the Good Vibes Club community has shipped. Tools, games, ecosystem dashboards, and showcases — built by the team and by holders, all running today.
          </p>
        </motion.div>

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            const count = f.key === "all" ? BUILDS.length : BUILDS.filter((b) => b.type === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-full font-display font-bold text-xs uppercase tracking-wider transition-all ${
                  isActive
                    ? "bg-gvc-gold/15 border border-gvc-gold/40 text-gvc-gold"
                    : "border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((build) => (
              <BuildCard key={build.id} build={build} />
            ))}
          </AnimatePresence>
        </motion.div>

        {filtered.length === 0 && (
          <div className="text-center py-16 font-body text-white/40">
            No builds in this category yet.
          </div>
        )}

        {/* Submit a build CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 rounded-2xl border border-white/10 bg-gvc-dark p-6 sm:p-8 text-center"
        >
          <h3 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-wide mb-2">
            Built something with the GVC kit?
          </h3>
          <p className="font-body text-white/60 text-sm sm:text-base mb-5 max-w-xl mx-auto">
            Ship it and we&apos;ll feature it here. Use{" "}
            <code className="font-mono text-xs sm:text-sm text-gvc-gold/80 bg-black/40 px-1.5 py-0.5 rounded">
              npx create-gvc-app
            </code>{" "}
            or the builder at{" "}
            <Link href="/" className="text-gvc-gold/80 hover:text-gvc-gold underline">
              goodvibesclub.ai
            </Link>
            {" "}— then DM @GoodVibesClub on X to get listed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gvc-gold text-gvc-black font-display font-black text-sm uppercase tracking-wider hover:shadow-[0_0_30px_rgba(255,224,72,0.4)] transition-shadow"
          >
            Start Building
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function BuildCard({ build }: { build: Build }) {
  const Icon = build.icon;
  const isExternal = build.url?.startsWith("http");
  const isSoon = build.status === "soon";

  const card = (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`group relative h-full rounded-2xl border border-white/10 bg-gvc-dark p-5 sm:p-6 transition-all card-glow ${
        isSoon ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-gvc-gold/10 border border-gvc-gold/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gvc-gold" />
        </div>
        <div className="flex items-center gap-1.5">
          {build.isNew && (
            <span className="text-[9px] font-display font-black tracking-wider px-1.5 py-0.5 rounded-md bg-gvc-gold text-gvc-black">
              NEW
            </span>
          )}
          <span
            className={`text-[9px] font-display font-black tracking-wider px-2 py-0.5 rounded-full uppercase ${
              isSoon
                ? "bg-white/5 border border-white/10 text-white/40"
                : "bg-gvc-green/10 border border-gvc-green/30 text-gvc-green"
            }`}
          >
            {isSoon ? "Soon" : "Live"}
          </span>
        </div>
      </div>

      <h3 className="font-display font-black text-lg sm:text-xl text-white mb-2 uppercase tracking-wide">
        {build.name}
      </h3>
      <p className="font-body text-sm text-white/55 leading-relaxed mb-4 line-clamp-4">
        {build.description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
        <span className="font-display font-bold text-[10px] uppercase tracking-wider text-white/30">
          {TYPE_LABELS[build.type]}
        </span>
        {build.url && !isSoon && (
          <span className="inline-flex items-center gap-1 font-body text-xs text-gvc-gold/70 group-hover:text-gvc-gold transition-colors">
            Open
            {isExternal ? (
              <ExternalLink className="w-3 h-3" />
            ) : (
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            )}
          </span>
        )}
      </div>
    </motion.div>
  );

  if (!build.url || isSoon) return card;
  if (isExternal) {
    return (
      <a href={build.url} target="_blank" rel="noopener noreferrer" className="block h-full">
        {card}
      </a>
    );
  }
  return (
    <Link href={build.url} className="block h-full">
      {card}
    </Link>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface BrandAsset {
  id: string;
  filename: string;
  image_url: string;
  category: string;
  tags: string | null;
  created_at: string;
}

interface BrandCategory {
  id: string;
  slug: string;
  label: string;
}

export default function Library() {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [categories, setCategories] = useState<BrandCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lightboxAsset, setLightboxAsset] = useState<BrandAsset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedClaudeId, setCopiedClaudeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/brand")
      .then((r) => r.json())
      .then((data) => {
        setAssets(data.assets || []);
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = assets.filter((a) => {
    const matchesCat = activeCategory === "all" || a.category === activeCategory;
    const matchesSearch = !search || a.filename.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  async function copyUrl(asset: BrandAsset) {
    await copyText(asset.image_url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function copyForClaude(asset: BrandAsset) {
    const text = `Use this image in my project:\nFilename: ${asset.filename}\nURL: ${asset.image_url}\nUsage: <img src="${asset.image_url}" alt="${asset.filename}" /> or with next/image: <Image src="${asset.image_url}" alt="${asset.filename}" width={400} height={300} />`;
    await copyText(text);
    setCopiedClaudeId(asset.id);
    setTimeout(() => setCopiedClaudeId(null), 2000);
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  function downloadAsset(asset: BrandAsset) {
    fetch(asset.image_url)
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = asset.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => window.open(asset.image_url, "_blank"));
  }

  return (
    <main className="min-h-screen bg-gvc-black relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: "url(/grid.svg)", backgroundSize: "40px 40px", opacity: 0.15 }} />
      <div className="fixed bottom-0 left-0 right-0 h-64 pointer-events-none z-0 bg-gradient-to-t from-gvc-gold/10 via-transparent to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Nav */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white/70 font-body text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back to Builder
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ rotate: [0, -12, 8, -4, 0], transition: { duration: 0.5 } }}
            className="mb-4 cursor-pointer inline-block"
          >
            <Image src="/shaka.png" alt="GVC" width={56} height={56} className="drop-shadow-[0_0_20px_rgba(255,224,72,0.3)]" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-display font-black text-shimmer mb-3 uppercase"
          >
            The Library
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/40 font-body text-lg max-w-xl mx-auto"
          >
            Official GVC brand assets for your builds. Browse, copy, and paste into Claude to use them in your project.
          </motion.p>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="max-w-md mx-auto mb-6"
        >
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="w-full bg-gvc-dark border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-white font-body text-sm outline-none focus:border-gvc-gold/30 placeholder:text-white/20 transition-colors"
            />
          </div>
        </motion.div>

        {/* Category filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all ${
              activeCategory === "all"
                ? "bg-gvc-gold/15 text-gvc-gold border border-gvc-gold/30"
                : "border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/15"
            }`}
          >
            All ({assets.length})
          </button>
          {categories.map((cat) => {
            const count = assets.filter((a) => a.category === cat.slug).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all ${
                  activeCategory === cat.slug
                    ? "bg-gvc-gold/15 text-gvc-gold border border-gvc-gold/30"
                    : "border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/15"
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </motion.div>

        {/* How to use hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mb-8 px-4 py-3 rounded-xl bg-gvc-dark border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4"
        >
          <div className="flex items-center gap-2 text-gvc-gold/60 font-body text-xs flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            Tip
          </div>
          <p className="text-white/30 font-body text-xs">
            Click <span className="text-gvc-gold/50">Copy for Claude</span> on any asset and paste it directly into Claude Code. Claude will know how to use the image in your project.
          </p>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-gvc-gold/30 border-t-gvc-gold rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/30 font-body text-sm">
              {search ? `No assets matching "${search}"` : "No assets in this category yet."}
            </p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
            <AnimatePresence>
              {filtered.map((asset) => (
                <motion.div
                  key={asset.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative rounded-xl overflow-hidden bg-gvc-dark border border-white/[0.08] hover:border-gvc-gold/20 transition-all"
                >
                  {/* Image */}
                  <div
                    className="cursor-pointer"
                    onClick={() => setLightboxAsset(asset)}
                  >
                    <img
                      src={asset.image_url}
                      alt={asset.filename}
                      className="w-full h-auto"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-white font-body text-xs font-semibold truncate">{asset.filename}</p>
                    <p className="text-white/20 font-body text-xs mt-0.5 capitalize">{asset.category}</p>
                  </div>

                  {/* Hover actions - top right */}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                    {/* Copy for Claude */}
                    <button
                      onClick={(e) => { e.stopPropagation(); copyForClaude(asset); }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-body font-semibold flex items-center gap-1.5 transition-all ${
                        copiedClaudeId === asset.id
                          ? "bg-gvc-green/20 border border-gvc-green/30 text-gvc-green"
                          : "bg-black/70 border border-gvc-gold/30 text-gvc-gold hover:bg-black/90"
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      {copiedClaudeId === asset.id ? "Copied!" : "Copy for Claude"}
                    </button>
                    {/* Download */}
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadAsset(asset); }}
                      className="w-7 h-7 rounded-lg bg-black/70 border border-white/10 text-white/50 hover:text-white flex items-center justify-center"
                      title="Download"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxAsset && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setLightboxAsset(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="max-w-4xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={lightboxAsset.image_url}
                  alt={lightboxAsset.filename}
                  className="max-w-full max-h-[75vh] rounded-xl shadow-2xl mx-auto"
                />
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => copyForClaude(lightboxAsset)}
                    className={`px-5 py-2.5 rounded-xl font-display font-bold text-sm flex items-center gap-2 transition-all ${
                      copiedClaudeId === lightboxAsset.id
                        ? "bg-gvc-green/20 text-gvc-green border border-gvc-green/30"
                        : "bg-gvc-gold text-gvc-black hover:shadow-[0_0_20px_rgba(255,224,72,0.3)]"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    {copiedClaudeId === lightboxAsset.id ? "Copied!" : "Copy for Claude"}
                  </button>
                  <button
                    onClick={() => copyUrl(lightboxAsset)}
                    className={`px-4 py-2.5 rounded-xl font-body text-sm flex items-center gap-2 transition-all ${
                      copiedId === lightboxAsset.id
                        ? "bg-gvc-green/20 text-gvc-green border border-gvc-green/30"
                        : "bg-white/10 border border-white/10 text-white/60 hover:text-white/80"
                    }`}
                  >
                    {copiedId === lightboxAsset.id ? "Copied!" : "Copy URL"}
                  </button>
                  <button
                    onClick={() => downloadAsset(lightboxAsset)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/60 hover:text-white/80 font-body text-sm flex items-center gap-2 transition-all"
                  >
                    Download
                  </button>
                </div>
                <p className="text-white/20 font-body text-xs text-center mt-3">{lightboxAsset.filename}</p>
              </motion.div>
              <button
                onClick={() => setLightboxAsset(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 border border-white/10 text-white/60 hover:text-white flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center pt-20 pb-12">
          <Image src="/gvc-logotype.svg" alt="Good Vibes Club" width={160} height={32} className="mx-auto opacity-30" />
        </div>
      </div>
    </main>
  );
}

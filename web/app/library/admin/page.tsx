"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function BrandAdmin() {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [categories, setCategories] = useState<BrandCategory[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatLabel, setEditCatLabel] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/brand/admin");
    const data = await res.json();
    setAssets(data.assets || []);
    setCategories(data.categories || []);
    setCounts(data.counts || {});
    setTotal(data.total || 0);
    if (!uploadCategory && data.categories?.length > 0) {
      setUploadCategory(data.categories[0].slug);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function uploadFiles(files: FileList | File[]) {
    const fileArr = Array.from(files).filter((f) => f.type.startsWith("image/") || f.type === "image/gif");
    if (!fileArr.length || !uploadCategory) return;

    setUploading(true);

    // Batch uploads in groups of 5 to avoid timeouts
    for (let i = 0; i < fileArr.length; i += 5) {
      const batch = fileArr.slice(i, i + 5);
      const fd = new FormData();
      fd.append("category", uploadCategory);
      batch.forEach((f, idx) => fd.append(`file${idx}`, f));
      await fetch("/api/brand/admin", { method: "POST", body: fd }).catch(() => {});
    }

    await fetchData();
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  }

  async function renameAsset(id: string) {
    if (!editName.trim()) { setEditingId(null); return; }
    await fetch("/api/brand/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, filename: editName.trim() }),
    });
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, filename: editName.trim() } : a));
    setEditingId(null);
  }

  async function deleteAsset(id: string) {
    await fetch(`/api/brand/admin?id=${id}`, { method: "DELETE" });
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setTotal((prev) => prev - 1);
  }

  async function changeCategory(id: string, newCat: string) {
    await fetch("/api/brand/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, category: newCat }),
    });
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, category: newCat } : a));
  }

  async function renameCategory(id: string) {
    if (!editCatLabel.trim()) { setEditingCatId(null); return; }
    await fetch("/api/brand/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label: editCatLabel.trim() }),
    });
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, label: editCatLabel.trim() } : c));
    setEditingCatId(null);
  }

  async function addCategory() {
    if (!newCatSlug.trim() || !newCatLabel.trim()) return;
    await fetch("/api/brand/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: newCatSlug.trim().toLowerCase().replace(/\s+/g, "-"), label: newCatLabel.trim() }),
    });
    setNewCatSlug("");
    setNewCatLabel("");
    await fetchData();
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/brand/categories?id=${id}`, { method: "DELETE" });
    await fetchData();
  }

  const filtered = activeCategory === "all"
    ? assets
    : assets.filter((a) => a.category === activeCategory);

  return (
    <main className="min-h-screen bg-gvc-black relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: "url(/grid.svg)", backgroundSize: "40px 40px", opacity: 0.15 }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Nav */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/library" className="flex items-center gap-2 text-white/40 hover:text-white/70 font-body text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            The Library
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-black text-shimmer mb-2 uppercase">Brand Asset Manager</h1>
        <p className="text-white/40 font-body text-sm mb-8">Upload and manage GVC brand assets. {total} assets total.</p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((cat) => (
            <div key={cat.slug} className="px-4 py-2 rounded-xl bg-gvc-dark border border-white/[0.08]">
              <p className="text-gvc-gold font-display font-bold text-lg">{counts[cat.slug] || 0}</p>
              <p className="text-white/40 font-body text-xs">{cat.label}</p>
            </div>
          ))}
        </div>

        {/* Upload zone */}
        <div className="mb-8 rounded-2xl bg-gvc-dark border border-white/[0.08] p-6">
          <h2 className="text-lg font-display font-bold text-white mb-4">Upload Assets</h2>

          <div className="flex items-center gap-3 mb-4">
            <label className="text-white/50 font-body text-sm">Category:</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-body text-sm outline-none focus:border-gvc-gold/30"
            >
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-gvc-gold/50 bg-gvc-gold/5"
                : "border-white/10 hover:border-gvc-gold/20"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.gif"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-gvc-gold/30 border-t-gvc-gold rounded-full animate-spin" />
                <p className="text-gvc-gold font-body text-sm">Uploading...</p>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 text-white/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.338 3.75 3.75 0 013.467 5.338A3.75 3.75 0 0118 19.5H6.75z" /></svg>
                <p className="text-white/40 font-body text-sm">Drag and drop images here, or click to browse</p>
                <p className="text-white/20 font-body text-xs mt-1">Supports JPG, PNG, GIF. Multiple files at once.</p>
              </>
            )}
          </div>
        </div>

        {/* Category management */}
        <div className="mb-8 rounded-2xl bg-gvc-dark border border-white/[0.08] p-6">
          <h2 className="text-lg font-display font-bold text-white mb-4">Categories</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gvc-gold/10 border border-gvc-gold/15">
                {editingCatId === cat.id ? (
                  <form onSubmit={(e) => { e.preventDefault(); renameCategory(cat.id); }} className="flex items-center">
                    <input
                      autoFocus
                      value={editCatLabel}
                      onChange={(e) => setEditCatLabel(e.target.value)}
                      onBlur={() => renameCategory(cat.id)}
                      onKeyDown={(e) => { if (e.key === "Escape") setEditingCatId(null); }}
                      className="bg-transparent text-gvc-gold text-xs font-body outline-none w-24 border-b border-gvc-gold/30"
                    />
                  </form>
                ) : (
                  <span
                    onClick={() => { setEditingCatId(cat.id); setEditCatLabel(cat.label); }}
                    className="text-gvc-gold text-xs font-body cursor-pointer hover:underline"
                    title="Click to rename"
                  >
                    {cat.label}
                  </span>
                )}
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-white/20 hover:text-red-400 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newCatSlug}
              onChange={(e) => setNewCatSlug(e.target.value)}
              placeholder="slug (e.g. stickers)"
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-body text-sm outline-none focus:border-gvc-gold/30 placeholder:text-white/20"
            />
            <input
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder="Label (e.g. Stickers)"
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-body text-sm outline-none focus:border-gvc-gold/30 placeholder:text-white/20"
            />
            <button
              onClick={addCategory}
              className="px-4 py-2 rounded-lg bg-gvc-gold/15 border border-gvc-gold/30 text-gvc-gold font-body text-sm font-semibold hover:bg-gvc-gold/25 transition-all"
            >
              Add
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all ${
              activeCategory === "all"
                ? "bg-gvc-gold/15 text-gvc-gold border border-gvc-gold/30"
                : "border border-white/[0.08] text-white/40 hover:text-white/60"
            }`}
          >
            All ({total})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all ${
                activeCategory === cat.slug
                  ? "bg-gvc-gold/15 text-gvc-gold border border-gvc-gold/30"
                  : "border border-white/[0.08] text-white/40 hover:text-white/60"
              }`}
            >
              {cat.label} ({counts[cat.slug] || 0})
            </button>
          ))}
        </div>

        {/* Asset grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-gvc-gold/30 border-t-gvc-gold rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/30 font-body text-sm">No assets yet. Upload some above.</p>
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
                  <img src={asset.image_url} alt={asset.filename} className="w-full h-auto" />

                  <div className="p-3">
                    {editingId === asset.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); renameAsset(asset.id); }} className="mb-1">
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => renameAsset(asset.id)}
                          onKeyDown={(e) => { if (e.key === "Escape") setEditingId(null); }}
                          className="w-full bg-black/40 border border-gvc-gold/30 rounded-lg px-2 py-1 text-white font-body text-xs outline-none focus:border-gvc-gold/60"
                        />
                      </form>
                    ) : (
                      <p
                        onClick={() => { setEditingId(asset.id); setEditName(asset.filename); }}
                        className="text-white font-body text-xs font-semibold truncate cursor-pointer hover:text-gvc-gold transition-colors mb-1"
                        title="Click to rename"
                      >
                        {asset.filename}
                      </p>
                    )}
                    <select
                      value={asset.category}
                      onChange={(e) => changeCategory(asset.id, e.target.value)}
                      className="mt-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-white/50 font-body text-xs outline-none w-full"
                    >
                      {categories.map((cat) => (
                        <option key={cat.slug} value={cat.slug}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 border border-white/10 text-white/40 hover:text-red-400 hover:border-red-400/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}

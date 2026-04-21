"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { compressImage, formatBytes } from "@/lib/image-compress";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;   // 10MB — raster images
const MAX_3D_BYTES = 200 * 1024 * 1024;     // 200MB — Cinema 4D scenes

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

type FileKind = "image" | "c4d" | "reject";

function classifyFile(file: File): FileKind {
  const lowerName = file.name.toLowerCase();
  if (file.type === "image/gif") return "reject";
  if (file.type.startsWith("image/")) return "image";
  if (lowerName.endsWith(".c4d")) return "c4d";
  return "reject";
}

function maxBytesFor(kind: FileKind): number {
  return kind === "c4d" ? MAX_3D_BYTES : MAX_IMAGE_BYTES;
}

const TOKEN_KEY = "gvc_admin_token";

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = window.prompt("Admin password required");
    if (token) localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

async function adminFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    alert("Wrong password. Refresh and try again.");
  }
  return res;
}

interface BrandAsset {
  id: string;
  filename: string;
  image_url: string;
  category: string;
  categories: string[];
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
  const [preserveOriginal, setPreserveOriginal] = useState(false);
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
    // Sort incoming files into image, c4d, or reject (GIFs or unknown types).
    const rejected: string[] = [];
    const classified: { file: File; kind: FileKind }[] = [];
    for (const f of Array.from(files)) {
      const kind = classifyFile(f);
      if (kind === "reject") {
        rejected.push(f.name);
      } else {
        classified.push({ file: f, kind });
      }
    }
    if (rejected.length > 0) {
      alert(
        `Skipped files in unsupported formats (allowed: PNG, JPEG, WebP, SVG, .c4d):\n${rejected.join("\n")}`
      );
    }
    if (!classified.length || !uploadCategory) return;

    const adminToken = getAdminToken();
    if (!adminToken) return;

    setUploading(true);

    // Prepare each file. Images get compressed (unless preserveOriginal).
    // C4D files pass through untouched — they're binary scene files, not images.
    const prepared: {
      file: File;
      kind: FileKind;
      originalName: string;
      savedBytes: number;
    }[] = [];
    const compressFailures: { name: string; reason: string }[] = [];

    for (const { file, kind } of classified) {
      if (kind !== "image" || preserveOriginal) {
        prepared.push({ file, kind, originalName: file.name, savedBytes: 0 });
        continue;
      }
      try {
        const result = await compressImage(file);
        prepared.push({
          file: result.file,
          kind,
          originalName: file.name,
          savedBytes: result.originalSize - result.compressedSize,
        });
      } catch (e) {
        compressFailures.push({ name: file.name, reason: e instanceof Error ? e.message : String(e) });
      }
    }

    // Per-kind size caps: images at 10MB, C4D scenes at 200MB.
    const oversize = prepared.filter((p) => p.file.size > maxBytesFor(p.kind));
    if (oversize.length > 0) {
      alert(
        "Skipping files over their size cap:\n" +
          oversize
            .map((p) => {
              const cap = p.kind === "c4d" ? "200MB" : "10MB";
              return `${p.originalName} → ${formatBytes(p.file.size)} (limit ${cap})`;
            })
            .join("\n")
      );
    }
    const toUpload = prepared.filter((p) => p.file.size <= maxBytesFor(p.kind));
    if (!toUpload.length) {
      setUploading(false);
      return;
    }

    const clientPayload = JSON.stringify({
      adminToken,
      category: uploadCategory,
      categories: [uploadCategory],
    });

    const failures: { name: string; reason: string }[] = [...compressFailures];
    await Promise.all(
      toUpload.map(async ({ file, originalName }) => {
        const path = `brand-assets/${uploadCategory}/${Date.now()}-${sanitizeName(file.name)}`;
        try {
          const result = await upload(path, file, {
            access: "public",
            handleUploadUrl: "/api/brand/admin/upload",
            clientPayload,
            contentType: file.type,
          });

          // Explicit finalize — the onUploadCompleted webhook is unreliable in
          // this setup, so we POST the URL back ourselves for the DB insert.
          const finalizeRes = await fetch("/api/brand/admin/upload", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
              url: result.url,
              pathname: result.pathname,
              category: uploadCategory,
              categories: [uploadCategory],
              filename: originalName,
            }),
          });
          if (!finalizeRes.ok) {
            const errBody = await finalizeRes.json().catch(() => ({}));
            throw new Error(errBody.error || `Finalize HTTP ${finalizeRes.status}`);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`Upload failed for ${originalName}:`, e);
          if (/client token/i.test(msg)) {
            localStorage.removeItem(TOKEN_KEY);
          }
          failures.push({ name: originalName, reason: msg });
        }
      })
    );

    const totalSaved = toUpload.reduce((sum, p) => sum + p.savedBytes, 0);
    if (totalSaved > 0) {
      console.log(`Compression saved ${formatBytes(totalSaved)} across ${toUpload.length} files`);
    }

    await fetchData();
    setUploading(false);

    if (failures.length > 0) {
      alert(
        `Upload failed for ${failures.length} file(s):\n\n` +
          failures.map((f) => `• ${f.name}\n  ${f.reason}`).join("\n\n")
      );
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  }


  async function renameAsset(id: string) {
    if (!editName.trim()) { setEditingId(null); return; }
    await adminFetch("/api/brand/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, filename: editName.trim() }),
    });
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, filename: editName.trim() } : a));
    setEditingId(null);
  }

  async function deleteAsset(id: string) {
    await adminFetch(`/api/brand/admin?id=${id}`, { method: "DELETE" });
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setTotal((prev) => prev - 1);
  }

  async function toggleCategory(id: string, cat: string) {
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;
    const current = asset.categories || [asset.category];
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    // Require at least one category
    if (next.length === 0) return;
    await adminFetch("/api/brand/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, categories: next }),
    });
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, categories: next, category: next[0] } : a));
    // Refresh counts
    await fetchData();
  }

  async function renameCategory(id: string) {
    if (!editCatLabel.trim()) { setEditingCatId(null); return; }
    await adminFetch("/api/brand/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label: editCatLabel.trim() }),
    });
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, label: editCatLabel.trim() } : c));
    setEditingCatId(null);
  }

  async function addCategory() {
    if (!newCatSlug.trim() || !newCatLabel.trim()) return;
    await adminFetch("/api/brand/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: newCatSlug.trim().toLowerCase().replace(/\s+/g, "-"), label: newCatLabel.trim() }),
    });
    setNewCatSlug("");
    setNewCatLabel("");
    await fetchData();
  }

  async function deleteCategory(id: string) {
    await adminFetch(`/api/brand/categories?id=${id}`, { method: "DELETE" });
    await fetchData();
  }

  const filtered = activeCategory === "all"
    ? assets
    : assets.filter((a) => (a.categories || [a.category]).includes(activeCategory));

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
              accept="image/png,image/jpeg,image/webp,image/svg+xml,.c4d,application/octet-stream"
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
                <p className="text-white/20 font-body text-xs mt-1">Images (JPG, PNG, WebP, SVG) up to 10MB and Cinema 4D scenes (.c4d) up to 200MB. Images over 2048px are resized and re-encoded to WebP; .c4d files upload as-is.</p>
              </>
            )}
          </div>

          {/* Preserve original toggle */}
          <div className="mt-4">
            <label
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 cursor-pointer text-white/50 hover:text-white/70 font-body text-xs w-fit"
            >
              <input
                type="checkbox"
                checked={preserveOriginal}
                onChange={(e) => setPreserveOriginal(e.target.checked)}
                className="accent-gvc-gold"
              />
              Preserve original (skip compression)
            </label>
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
                  {asset.filename.toLowerCase().endsWith(".c4d") ? (
                    <div className="w-full aspect-square bg-black/40 flex flex-col items-center justify-center gap-2 text-white/40 font-body text-xs">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
                      <span className="uppercase tracking-wider text-gvc-gold/70">C4D scene</span>
                    </div>
                  ) : (
                    <img src={asset.image_url} alt={asset.filename} className="w-full h-auto" />
                  )}

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
                    <div className="mt-1 flex flex-wrap gap-1">
                      {categories.map((cat) => {
                        const selected = (asset.categories || [asset.category]).includes(cat.slug);
                        return (
                          <button
                            key={cat.slug}
                            onClick={() => toggleCategory(asset.id, cat.slug)}
                            className={`px-2 py-0.5 rounded text-[10px] font-body transition-all ${
                              selected
                                ? "bg-gvc-gold/15 border border-gvc-gold/30 text-gvc-gold"
                                : "bg-black/40 border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20"
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
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

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { normalizeRefImages, serializeRefImages, type RefImage } from "@/lib/ref-images";
import BUILT_IN_PROMPTS from "../prompts";

function sanitizeRefName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

interface PromptOverride {
  builtin_id: string;
  title: string | null;
  description: string | null;
  prompt: string | null;
  category: string | null;
  token_id: string | null;
  x_handle: string | null;
}

// Pre-loaded prompts defined in code (app/prompts.ts). Surfaced in the admin
// list as "approved" entries. Admin edits land in the prompt_overrides table
// and are merged back on top of the defaults when rendering.
function buildBuiltInSubmissions(
  overrides: Record<string, PromptOverride>
): (Submission & { builtIn: true })[] {
  return BUILT_IN_PROMPTS.map((p) => {
    const ov = overrides[p.id];
    return {
      id: `builtin-${p.id}`,
      title: ov?.title || p.title,
      prompt: ov?.prompt || p.template,
      token_id: ov?.token_id || p.exampleTokenId || "",
      image_url: p.exampleImage || "",
      x_handle: ov?.x_handle ?? (p.author?.replace(/^@/, "") || null),
      status: "approved" as const,
      category: ov?.category || p.category || null,
      generations: 0,
      description: ov?.description || p.description || null,
      more_details: null,
      ref_images: null,
      requires_ref_images: Boolean(p.hasReferenceImage || p.requiresTpose),
      created_at: "2025-01-01T00:00:00.000Z",
      builtIn: true,
    };
  });
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

interface Submission {
  id: string;
  title: string;
  prompt: string;
  token_id: string;
  image_url: string;
  x_handle: string | null;
  status: "pending" | "approved" | "rejected";
  category: string | null;
  generations: number;
  description: string | null;
  more_details: string | null;
  ref_images: string | null;
  requires_ref_images: boolean;
  created_at: string;
  builtIn?: boolean;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface Category {
  id: string;
  slug: string;
  label: string;
}

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    token_id: string;
    x_handle: string;
    prompt: string;
    description: string;
    more_details: string;
  }>({ title: "", token_id: "", x_handle: "", prompt: "", description: "", more_details: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [uploadingRefsId, setUploadingRefsId] = useState<string | null>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const [refUploadTarget, setRefUploadTarget] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, PromptOverride>>({});

  async function fetchData() {
    try {
      const [adminRes, catRes, ovRes] = await Promise.all([
        adminFetch("/api/prompt-machine/admin"),
        fetch("/api/prompt-machine/categories"),
        fetch("/api/prompt-machine/overrides"),
      ]);
      const data = await adminRes.json();
      const cats = await catRes.json();
      const ovs = await ovRes.json();
      setSubmissions(data.submissions || []);
      setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 });
      setCategories(Array.isArray(cats) ? cats : []);
      setOverrides(
        Array.isArray(ovs)
          ? Object.fromEntries((ovs as PromptOverride[]).map((o) => [o.builtin_id, o]))
          : {}
      );
    } catch (e) {
      console.error("Failed to fetch:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      await adminFetch("/api/prompt-machine/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      // Optimistic update
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: status as any } : s))
      );
      setStats((prev) => {
        const old = submissions.find((s) => s.id === id)?.status;
        if (!old) return prev;
        return {
          ...prev,
          [old]: prev[old as keyof Stats] - 1,
          [status]: (prev[status as keyof Stats] as number) + 1,
        };
      });
    } catch (e) {
      console.error("Update failed:", e);
    }
  }

  async function createCategory() {
    if (!newCategoryName.trim()) return;
    try {
      const res = await adminFetch("/api/prompt-machine/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newCategoryName.trim() }),
      });
      if (res.ok) {
        const cat = await res.json();
        setCategories((prev) => [...prev, cat]);
        setNewCategoryName("");
      }
    } catch (e) {
      console.error("Create category failed:", e);
    }
  }

  async function deleteCategory(catId: string) {
    try {
      await adminFetch("/api/prompt-machine/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: catId }),
      });
      setCategories((prev) => prev.filter((c) => c.id !== catId));
    } catch (e) {
      console.error("Delete category failed:", e);
    }
  }

  async function addRefImages(id: string, files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/") && f.type !== "image/gif");
    console.log("[ref-upload] starting", { id, incomingCount: Array.from(files).length, acceptedCount: images.length });
    if (!images.length) {
      alert("No acceptable images to upload (PNG, JPEG, or WebP only; GIFs are not supported).");
      return;
    }

    setUploadingRefsId(id);
    try {
      const uploaded = await Promise.all(
        images.map((f) =>
          upload(
            `prompt-submissions/ref-admin-${Date.now()}-${sanitizeRefName(f.name)}`,
            f,
            { access: "public", handleUploadUrl: "/api/prompt-machine/submissions/upload", contentType: f.type }
          )
        )
      );
      const newRefs: RefImage[] = uploaded.map((b) => ({ url: b.url, title: null, description: null }));
      console.log("[ref-upload] uploaded urls", newRefs.map((r) => r.url));
      const sub = submissions.find((s) => s.id === id);
      const existing: RefImage[] = normalizeRefImages(sub?.ref_images);
      const combined: RefImage[] = [...existing, ...newRefs];
      await saveRefImages(id, combined);
      console.log("[ref-upload] DB updated with", combined.length, "total refs");
    } catch (e) {
      console.error("[ref-upload] failed:", e);
      alert(`Ref image upload failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploadingRefsId(null);
    }
  }

  async function saveRefImages(id: string, refs: RefImage[]) {
    const serialized = serializeRefImages(refs);
    try {
      await adminFetch("/api/prompt-machine/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ref_images: serialized }),
      });
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ref_images: serialized } : s)));
    } catch (e) {
      console.error("Update ref images failed:", e);
    }
  }

  async function toggleRefImages(id: string, current: boolean) {
    try {
      await adminFetch("/api/prompt-machine/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, requires_ref_images: !current }),
      });
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, requires_ref_images: !current } : s))
      );
    } catch (e) {
      console.error("Toggle ref images failed:", e);
    }
  }

  async function updateCategory(id: string, category: string | null) {
    // Built-in prompts flow through prompt_overrides
    if (id.startsWith("builtin-")) {
      const builtinId = id.replace(/^builtin-/, "");
      try {
        await adminFetch("/api/prompt-machine/admin/override", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ builtin_id: builtinId, category }),
        });
        setOverrides((prev) => ({
          ...prev,
          [builtinId]: {
            ...(prev[builtinId] || {
              builtin_id: builtinId,
              title: null,
              description: null,
              prompt: null,
              token_id: null,
              x_handle: null,
              category: null,
            }),
            category,
          },
        }));
      } catch (e) {
        console.error("Override category failed:", e);
      }
      return;
    }

    try {
      await adminFetch("/api/prompt-machine/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, category }),
      });
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, category } : s))
      );
    } catch (e) {
      console.error("Category update failed:", e);
    }
  }

  function startEdit(sub: Submission) {
    setEditingId(sub.id);
    setExpandedId(sub.id);
    setEditForm({
      title: sub.title || "",
      token_id: sub.token_id || "",
      x_handle: sub.x_handle || "",
      prompt: sub.prompt || "",
      description: sub.description || "",
      more_details: sub.more_details || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ title: "", token_id: "", x_handle: "", prompt: "", description: "", more_details: "" });
  }

  async function saveEdit(id: string) {
    if (!editForm.title.trim() || !editForm.prompt.trim() || !editForm.token_id.trim()) {
      alert("Title, prompt, and token ID are required.");
      return;
    }
    setEditSaving(true);
    try {
      if (id.startsWith("builtin-")) {
        // Built-in prompt — route through the overrides table
        const builtinId = id.replace(/^builtin-/, "");
        const res = await adminFetch("/api/prompt-machine/admin/override", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            builtin_id: builtinId,
            title: editForm.title,
            token_id: editForm.token_id,
            x_handle: editForm.x_handle,
            prompt: editForm.prompt,
            description: editForm.description,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const saved = await res.json();
        setOverrides((prev) => ({ ...prev, [builtinId]: saved }));
      } else {
        const res = await adminFetch("/api/prompt-machine/admin", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            title: editForm.title,
            token_id: editForm.token_id,
            x_handle: editForm.x_handle,
            prompt: editForm.prompt,
            description: editForm.description,
            more_details: editForm.more_details,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  title: editForm.title,
                  token_id: editForm.token_id,
                  x_handle: editForm.x_handle || null,
                  prompt: editForm.prompt,
                  description: editForm.description || null,
                  more_details: editForm.more_details || null,
                }
              : s
          )
        );
      }
      setEditingId(null);
    } catch (e) {
      console.error("Edit save failed:", e);
      alert(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteSubmission(id: string) {
    try {
      await adminFetch("/api/prompt-machine/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setStats((prev) => ({
        ...prev,
        total: prev.total - 1,
        [submissions.find((s) => s.id === id)?.status || "pending"]:
          (prev[(submissions.find((s) => s.id === id)?.status || "pending") as keyof Stats] as number) - 1,
      }));
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }

  // Pre-loaded prompts (built-ins) are always "approved" — surface them in the
  // list so the admin can see every prompt that renders publicly, not just
  // the community-submitted ones. Admin edits flow through prompt_overrides.
  const builtInSubmissions = buildBuiltInSubmissions(overrides);
  const combined: Submission[] = [...builtInSubmissions, ...submissions];
  const filtered = filter === "all" ? combined : combined.filter((s) => s.status === filter);
  const statsWithBuiltIns: Stats = {
    total: stats.total + builtInSubmissions.length,
    pending: stats.pending,
    approved: stats.approved + builtInSubmissions.length,
    rejected: stats.rejected,
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white px-4 sm:px-6 py-8">
      {/* Shared hidden file input for adding reference images to any submission */}
      <input
        ref={refFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const targetId = refUploadTarget;
          const files = e.target.files;
          // Snapshot files into a plain array before resetting the input value,
          // since some browsers invalidate the FileList reference on reset.
          const fileArr = files ? Array.from(files) : [];
          e.target.value = "";
          setRefUploadTarget(null);
          if (targetId && fileArr.length > 0) {
            addRefImages(targetId, fileArr);
          } else {
            console.warn("[ref-upload] onChange fired but nothing to upload", { targetId, count: fileArr.length });
          }
        }}
      />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-black text-gvc-gold">Admin Dashboard</h1>
            <p className="text-white/40 font-body text-sm">Manage prompt submissions</p>
          </div>
          <Link href="/" className="text-white/40 font-body text-sm hover:text-gvc-gold transition-colors">
            Back to Prompt Machine
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total", value: statsWithBuiltIns.total, color: "text-white" },
            { label: "Pending", value: statsWithBuiltIns.pending, color: statsWithBuiltIns.pending > 0 ? "text-gvc-gold" : "text-white/50" },
            { label: "Approved", value: statsWithBuiltIns.approved, color: "text-gvc-green" },
            { label: "Rejected", value: statsWithBuiltIns.rejected, color: "text-white/30" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-[#121212] border border-white/[0.08] p-4 text-center">
              <p className={`text-2xl font-display font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/40 font-body text-xs uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Category Management */}
        <div className="rounded-xl bg-[#121212] border border-white/[0.08] p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-display font-bold text-white/60">Categories</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map((cat) => (
              <div key={cat.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <span className="text-white/50 font-body text-xs">{cat.label}</span>
                <button onClick={() => { if (confirm(`Delete "${cat.label}" category?`)) deleteCategory(cat.id); }} className="text-white/20 hover:text-red-400/60 transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCategory()}
              className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-white font-body text-xs placeholder:text-white/20 focus:outline-none focus:border-gvc-gold/30 transition-colors"
            />
            <button onClick={createCategory} className="px-4 py-2 rounded-lg bg-gvc-gold/15 text-gvc-gold font-display font-bold text-xs hover:bg-gvc-gold/25 transition-colors">
              Add
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all capitalize ${
                filter === f
                  ? "bg-gvc-gold/15 text-gvc-gold border border-gvc-gold/30"
                  : "border border-white/[0.08] text-white/40 hover:text-white/60"
              }`}
            >
              {f} {f !== "all" && `(${f === "pending" ? statsWithBuiltIns.pending : f === "approved" ? statsWithBuiltIns.approved : statsWithBuiltIns.rejected})`}
            </button>
          ))}
        </div>

        {/* Submissions */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl bg-[#121212] border border-white/[0.08] p-4 animate-pulse">
                <div className="h-4 w-48 bg-white/10 rounded mb-2" />
                <div className="h-3 w-32 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl bg-[#121212] border border-white/[0.08] p-8 text-center">
            <p className="text-white/30 font-body">
              {filter === "pending" ? "All caught up. No pending submissions." : `No ${filter} submissions.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filtered.map((sub) => (
                <motion.div
                  key={sub.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className={`rounded-xl bg-[#121212] border overflow-hidden ${
                    sub.status === "pending"
                      ? "border-gvc-gold/20"
                      : sub.status === "approved"
                      ? "border-gvc-green/20 border-l-2 border-l-gvc-green"
                      : "border-white/[0.06]"
                  }`}
                >
                  <div className="flex gap-4 p-4">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                      <img src={sub.image_url} alt={sub.title} className="w-full h-full object-cover" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {editingId === sub.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editForm.title}
                                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="Title"
                                className="w-full px-2 py-1 rounded bg-black/40 border border-white/[0.08] text-white font-display font-bold text-sm focus:outline-none focus:border-gvc-gold/30"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editForm.token_id}
                                  onChange={(e) => setEditForm((f) => ({ ...f, token_id: e.target.value }))}
                                  placeholder="Token ID"
                                  className="w-28 px-2 py-1 rounded bg-black/40 border border-white/[0.08] text-white/70 font-body text-xs focus:outline-none focus:border-gvc-gold/30"
                                />
                                <input
                                  type="text"
                                  value={editForm.x_handle}
                                  onChange={(e) => setEditForm((f) => ({ ...f, x_handle: e.target.value.replace(/^@/, "") }))}
                                  placeholder="X handle (optional)"
                                  className="flex-1 px-2 py-1 rounded bg-black/40 border border-white/[0.08] text-white/70 font-body text-xs focus:outline-none focus:border-gvc-gold/30"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-display font-bold text-white text-sm">{sub.title}</h3>
                              <p className="text-white/30 font-body text-xs">
                                Token #{sub.token_id}
                                {sub.x_handle && ` - @${sub.x_handle}`}
                                {" - "}
                                {new Date(sub.created_at).toLocaleDateString()}
                                {(sub as any).generations > 0 && ` - ${(sub as any).generations} generations`}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {sub.builtIn && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-body font-semibold bg-gvc-gold/15 text-gvc-gold">
                              Pre-loaded
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-body font-semibold ${
                              sub.status === "pending"
                                ? "bg-gvc-gold/15 text-gvc-gold"
                                : sub.status === "approved"
                                ? "bg-gvc-green/15 text-gvc-green"
                                : "bg-white/[0.04] text-white/30"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                      </div>

                      {/* Expand/collapse prompt */}
                      {editingId !== sub.id && (
                        <button
                          onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                          className="text-white/20 font-body text-xs mt-1 hover:text-white/40 transition-colors"
                        >
                          {expandedId === sub.id ? "Hide prompt" : "View prompt"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {expandedId === sub.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          {editingId === sub.id ? (
                            <>
                              {/* Prompt text (editable) */}
                              <div>
                                <p className="text-white/30 font-body text-xs mb-1">Prompt:</p>
                                <textarea
                                  value={editForm.prompt}
                                  onChange={(e) => setEditForm((f) => ({ ...f, prompt: e.target.value }))}
                                  rows={6}
                                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-white/80 font-body text-xs leading-relaxed focus:outline-none focus:border-gvc-gold/30 resize-y"
                                />
                              </div>
                              {/* Description (editable) */}
                              <div>
                                <p className="text-gvc-gold/70 font-body text-xs mb-1">Description (shown publicly):</p>
                                <textarea
                                  value={editForm.description}
                                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                  rows={3}
                                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-gvc-gold/20 text-white/80 font-body text-xs leading-relaxed focus:outline-none focus:border-gvc-gold/40 resize-y"
                                />
                              </div>
                              {/* More details (editable) */}
                              <div>
                                <p className="text-white/30 font-body text-xs mb-1">More details (team-only):</p>
                                <textarea
                                  value={editForm.more_details}
                                  onChange={(e) => setEditForm((f) => ({ ...f, more_details: e.target.value }))}
                                  rows={3}
                                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.08] text-white/70 font-body text-xs leading-relaxed focus:outline-none focus:border-gvc-gold/30 resize-y"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Prompt text */}
                              <div className="bg-black/40 rounded-lg p-3 border border-white/[0.06]">
                                <p className="text-white/60 font-body text-xs leading-relaxed whitespace-pre-wrap">{sub.prompt}</p>
                              </div>

                              {/* Description (public) */}
                              {sub.description && (
                                <div>
                                  <p className="text-gvc-gold/70 font-body text-xs mb-1">Description (shown publicly):</p>
                                  <div className="bg-black/40 rounded-lg p-3 border border-gvc-gold/20">
                                    <p className="text-white/60 font-body text-xs leading-relaxed whitespace-pre-wrap">{sub.description}</p>
                                  </div>
                                </div>
                              )}

                              {/* More details (team-only) */}
                              {sub.more_details && (
                                <div>
                                  <p className="text-white/30 font-body text-xs mb-1">More details (team-only):</p>
                                  <div className="bg-black/40 rounded-lg p-3 border border-white/[0.06]">
                                    <p className="text-white/50 font-body text-xs leading-relaxed whitespace-pre-wrap">{sub.more_details}</p>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Reference images - editable */}
                          {(() => {
                            const refs: RefImage[] = normalizeRefImages(sub.ref_images);
                            const isUploading = uploadingRefsId === sub.id;
                            return (
                              <div>
                                <p className="text-white/30 font-body text-xs mb-2">
                                  Reference images ({refs.length})
                                  {refs.length > 0 && " - title/description shows on the public prompt"}
                                </p>
                                <div className="space-y-3">
                                  {refs.map((ref, i) => (
                                    <div key={ref.url + i} className="flex gap-3 rounded-lg bg-black/30 border border-white/[0.06] p-3">
                                      <div className="relative group flex-shrink-0">
                                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="w-24 h-24 rounded-lg overflow-hidden bg-black/40 border border-white/[0.08] hover:border-gvc-gold/30 transition-colors block">
                                          <img src={ref.url} alt={ref.title || `Reference ${i + 1}`} className="w-full h-full object-cover" />
                                        </a>
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            const updated = refs.filter((_, idx) => idx !== i);
                                            saveRefImages(sub.id, updated);
                                          }}
                                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                      </div>
                                      <div className="flex-1 min-w-0 space-y-2">
                                        <input
                                          type="text"
                                          value={ref.title || ""}
                                          placeholder={`Title (e.g. "Your T-Pose"). Falls back to "Reference image ${i + 1}"`}
                                          onChange={(e) => {
                                            const updated = refs.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r));
                                            setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, ref_images: serializeRefImages(updated) } : s)));
                                          }}
                                          onBlur={() => saveRefImages(sub.id, normalizeRefImages((submissions.find((s) => s.id === sub.id) || sub).ref_images))}
                                          className="w-full px-2 py-1 rounded bg-black/40 border border-white/[0.08] text-white font-body text-xs focus:outline-none focus:border-gvc-gold/30"
                                        />
                                        <textarea
                                          value={ref.description || ""}
                                          placeholder="Description (optional). Shown under the title on the prompt."
                                          rows={2}
                                          onChange={(e) => {
                                            const updated = refs.map((r, idx) => (idx === i ? { ...r, description: e.target.value } : r));
                                            setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, ref_images: serializeRefImages(updated) } : s)));
                                          }}
                                          onBlur={() => saveRefImages(sub.id, normalizeRefImages((submissions.find((s) => s.id === sub.id) || sub).ref_images))}
                                          className="w-full px-2 py-1 rounded bg-black/40 border border-white/[0.08] text-white/70 font-body text-xs leading-relaxed focus:outline-none focus:border-gvc-gold/30 resize-y"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                  {!sub.builtIn && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRefUploadTarget(sub.id);
                                        refFileInputRef.current?.click();
                                      }}
                                      disabled={isUploading}
                                      className="w-full h-16 rounded-lg border-2 border-dashed border-white/10 hover:border-gvc-gold/40 text-white/30 hover:text-gvc-gold/70 font-body text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isUploading ? (
                                        <div className="w-4 h-4 border-2 border-gvc-gold/30 border-t-gvc-gold rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                                          <span>Add reference image</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Requires reference images toggle — community submissions only */}
                          {!sub.builtIn && (
                            <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
                              <button
                                onClick={() => toggleRefImages(sub.id, sub.requires_ref_images)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${sub.requires_ref_images ? "bg-gvc-gold/30" : "bg-white/10"}`}
                              >
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${sub.requires_ref_images ? "left-5.5 bg-gvc-gold" : "left-0.5 bg-white/40"}`} style={{ left: sub.requires_ref_images ? "22px" : "2px" }} />
                              </button>
                              <span className="text-white/40 font-body text-xs">Requires reference images for users</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Category + Actions */}
                  <div className="px-4 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 font-body text-xs">Category:</span>
                      <select
                        value={sub.category || ""}
                        onChange={(e) => updateCategory(sub.id, e.target.value || null)}
                        className="px-2 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-white/60 font-body text-xs focus:outline-none focus:border-gvc-gold/30 appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#121212]">Unassigned</option>
                        {categories.map((cat) => (
                          <option key={cat.slug} value={cat.slug} className="bg-[#121212]">{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 px-4 pb-4">
                    {editingId === sub.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(sub.id)}
                          disabled={editSaving}
                          className="px-4 py-2 rounded-lg bg-gvc-gold/15 text-gvc-gold font-display font-bold text-xs hover:bg-gvc-gold/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {editSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={editSaving}
                          className="px-4 py-2 rounded-lg text-white/40 font-display font-bold text-xs hover:text-white/70 hover:bg-white/[0.04] transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : sub.builtIn ? (
                      <>
                        <button
                          onClick={() => startEdit(sub)}
                          className="px-4 py-2 rounded-lg text-white/50 font-display font-bold text-xs hover:text-white hover:bg-white/[0.04] transition-colors"
                        >
                          Edit
                        </button>
                        {overrides[sub.id.replace(/^builtin-/, "")] && (
                          <button
                            onClick={async () => {
                              const builtinId = sub.id.replace(/^builtin-/, "");
                              if (!confirm("Reset this pre-loaded prompt to its default values?")) return;
                              await adminFetch(`/api/admin/override?builtin_id=${encodeURIComponent(builtinId)}`, {
                                method: "DELETE",
                              });
                              setOverrides((prev) => {
                                const next = { ...prev };
                                delete next[builtinId];
                                return next;
                              });
                            }}
                            className="px-4 py-2 rounded-lg text-white/30 font-display font-bold text-xs hover:text-white/60 hover:bg-white/[0.04] transition-colors ml-auto"
                          >
                            Reset to default
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {sub.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateStatus(sub.id, "approved")}
                              className="px-4 py-2 rounded-lg bg-gvc-green/15 text-gvc-green font-display font-bold text-xs hover:bg-gvc-green/25 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateStatus(sub.id, "rejected")}
                              className="px-4 py-2 rounded-lg text-red-400/60 font-display font-bold text-xs hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {sub.status === "approved" && (
                          <button
                            onClick={() => updateStatus(sub.id, "pending")}
                            className="px-4 py-2 rounded-lg text-white/30 font-display font-bold text-xs hover:text-white/50 hover:bg-white/[0.04] transition-colors"
                          >
                            Move to pending
                          </button>
                        )}
                        {sub.status === "rejected" && (
                          <button
                            onClick={() => updateStatus(sub.id, "pending")}
                            className="px-4 py-2 rounded-lg text-white/30 font-display font-bold text-xs hover:text-white/50 hover:bg-white/[0.04] transition-colors"
                          >
                            Reconsider
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(sub)}
                          className="px-4 py-2 rounded-lg text-white/50 font-display font-bold text-xs hover:text-white hover:bg-white/[0.04] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this submission?")) deleteSubmission(sub.id);
                          }}
                          className="px-4 py-2 rounded-lg text-red-400/30 font-display font-bold text-xs hover:text-red-400/60 hover:bg-red-400/5 transition-colors ml-auto"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}

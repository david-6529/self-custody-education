"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";

interface SavedItem {
  id: string;
  image_url: string;
  prompt_id?: string;
  prompt_title?: string;
  token_id?: string;
  label?: string;
  notes?: string;
  created_at: string;
}

export default function ProfilePage() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  const [activeTab, setActiveTab] = useState<"outputs" | "references">("outputs");
  const [outputs, setOutputs] = useState<SavedItem[]>([]);
  const [references, setReferences] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchData = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [outRes, refRes] = await Promise.all([
        fetch(`/api/user?wallet=${address}&type=outputs`),
        fetch(`/api/user?wallet=${address}&type=references`),
      ]);
      setOutputs(await outRes.json());
      setReferences(await refRes.json());
    } catch {
      // quiet fail
    }
    setLoading(false);
  }, [address]);

  useEffect(() => {
    if (isConnected && address) fetchData();
  }, [isConnected, address, fetchData]);

  async function uploadFile(type: "output" | "reference") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (!files.length || !address) return;
      setUploading(true);
      for (const file of files) {
        const fd = new FormData();
        fd.append("wallet", address);
        fd.append("type", type);
        fd.append("file", file);
        await fetch("/api/user", { method: "POST", body: fd }).catch(() => {});
      }
      await fetchData();
      setUploading(false);
    };
    input.click();
  }

  async function renameItem(id: string, type: "outputs" | "references") {
    if (!address || !editName.trim()) {
      setEditingId(null);
      return;
    }
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, wallet: address, type, name: editName.trim() }),
    });
    // Update local state
    const updater = (prev: SavedItem[]) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...(type === "references" ? { label: editName.trim() } : { prompt_title: editName.trim() }) }
          : item
      );
    if (type === "outputs") setOutputs(updater);
    else setReferences(updater);
    setEditingId(null);
  }

  async function deleteItem(id: string, type: "outputs" | "references") {
    if (!address) return;
    await fetch(`/api/user?id=${id}&type=${type}&wallet=${address}`, { method: "DELETE" });
    if (type === "outputs") {
      setOutputs((prev) => prev.filter((o) => o.id !== id));
    } else {
      setReferences((prev) => prev.filter((r) => r.id !== id));
    }
  }

  const items = activeTab === "outputs" ? outputs : references;

  return (
    <main className="min-h-screen bg-gvc-black relative overflow-hidden">
      {/* Grid texture */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: "url(/grid.svg)", backgroundSize: "40px 40px", opacity: 0.15 }} />
      {/* Bottom gradient */}
      <div className="fixed bottom-0 left-0 right-0 h-64 pointer-events-none z-0 bg-gradient-to-t from-gvc-gold/10 via-transparent to-transparent" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back + wallet */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/40 hover:text-white/70 font-body text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back to Prompts
          </Link>
          {isConnected && address && (
            <button
              onClick={() => open()}
              className="px-4 py-2 rounded-xl bg-gvc-gold/10 border border-gvc-gold/20 text-gvc-gold font-body text-sm transition-all hover:bg-gvc-gold/20"
            >
              {address.slice(0, 6)}...{address.slice(-4)}
            </button>
          )}
        </div>

        {!isConnected ? (
          <div className="text-center py-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ rotate: [0, -12, 8, -4, 0], transition: { duration: 0.5 } }}
              className="mb-6 cursor-pointer inline-block"
            >
              <Image src="/shaka.png" alt="GVC" width={64} height={64} className="drop-shadow-[0_0_20px_rgba(255,224,72,0.3)]" />
            </motion.div>
            <h1 className="text-2xl sm:text-4xl font-display font-black text-shimmer mb-4 uppercase">My Profile</h1>
            <p className="text-white/40 font-body text-lg mb-8 max-w-md mx-auto">Connect your wallet to save and manage your GVC outputs and reference images.</p>
            <button
              onClick={() => open()}
              className="px-8 py-3 rounded-xl bg-gvc-gold text-gvc-black font-display font-bold text-sm hover:shadow-[0_0_20px_rgba(255,224,72,0.3)] transition-all"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-4xl font-display font-black text-shimmer mb-2 uppercase">My Profile</h1>
              <p className="text-white/40 font-body text-sm">Your saved outputs and reference images</p>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-8">
              <button
                onClick={() => setActiveTab("outputs")}
                className={`px-6 py-2.5 rounded-xl font-display font-bold text-sm transition-all ${
                  activeTab === "outputs"
                    ? "bg-gvc-gold/15 text-gvc-gold border border-gvc-gold/30"
                    : "border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/15"
                }`}
              >
                Outputs ({outputs.length})
              </button>
              <button
                onClick={() => setActiveTab("references")}
                className={`px-6 py-2.5 rounded-xl font-display font-bold text-sm transition-all ${
                  activeTab === "references"
                    ? "bg-gvc-gold/15 text-gvc-gold border border-gvc-gold/30"
                    : "border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/15"
                }`}
              >
                References ({references.length})
              </button>
            </div>

            {/* Upload button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => uploadFile(activeTab === "outputs" ? "output" : "reference")}
                disabled={uploading}
                className="px-5 py-2 rounded-xl bg-gvc-gold/15 border border-gvc-gold/30 text-gvc-gold font-display font-bold text-sm transition-all hover:bg-gvc-gold/25 flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.338 3.75 3.75 0 013.467 5.338A3.75 3.75 0 0118 19.5H6.75z" /></svg>
                {uploading ? "Uploading..." : `Upload ${activeTab === "outputs" ? "Output" : "Reference"}`}
              </button>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="text-center py-16">
                <div className="w-6 h-6 border-2 border-gvc-gold/30 border-t-gvc-gold rounded-full animate-spin mx-auto" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-white/30 font-body text-sm mb-2">No {activeTab} saved yet.</p>
                <p className="text-white/20 font-body text-xs">
                  {activeTab === "outputs"
                    ? "Generate a prompt and save the output to see it here."
                    : "Upload reference images (like full body or T-pose) for easy access."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative rounded-xl overflow-hidden bg-gvc-dark border border-white/[0.08] hover:border-gvc-gold/20 transition-all"
                    >
                      {/* Image */}
                      <div
                        className="aspect-square cursor-pointer"
                        onClick={() => setLightboxUrl(item.image_url)}
                      >
                        <img
                          src={item.image_url}
                          alt={item.prompt_title || item.label || "Saved image"}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        {editingId === item.id ? (
                          <form
                            onSubmit={(e) => { e.preventDefault(); renameItem(item.id, activeTab); }}
                            className="flex gap-1"
                          >
                            <input
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => renameItem(item.id, activeTab)}
                              onKeyDown={(e) => { if (e.key === "Escape") setEditingId(null); }}
                              className="flex-1 min-w-0 bg-black/40 border border-gvc-gold/30 rounded-lg px-2 py-1 text-white font-body text-sm outline-none focus:border-gvc-gold/60"
                            />
                          </form>
                        ) : (
                          <p
                            onClick={() => { setEditingId(item.id); setEditName(item.prompt_title || item.label || ""); }}
                            className="text-white font-body text-sm font-semibold truncate cursor-pointer hover:text-gvc-gold transition-colors"
                            title="Click to rename"
                          >
                            {item.prompt_title || item.label || (activeTab === "outputs" ? "Output" : "Reference")}
                          </p>
                        )}
                        {item.token_id && (
                          <p className="text-white/30 font-body text-xs">GVC #{item.token_id}</p>
                        )}
                        <p className="text-white/20 font-body text-xs mt-1">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Delete button (hover) */}
                      <button
                        onClick={() => deleteItem(item.id, activeTab)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 border border-white/10 text-white/40 hover:text-red-400 hover:border-red-400/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setLightboxUrl(null)}
            >
              <motion.img
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={lightboxUrl}
                alt="Full size"
                className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 border border-white/10 text-white/60 hover:text-white flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center pt-20 pb-12">
          <Image
            src="/gvc-logotype.svg"
            alt="Good Vibes Club"
            width={160}
            height={32}
            className="mx-auto opacity-30"
          />
        </div>
      </div>
    </main>
  );
}

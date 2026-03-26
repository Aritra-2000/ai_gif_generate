"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Download,
  Check,
  Play,
  History,
  Library,
  ExternalLink,
  Trash2,
  Grid3X3,
  List,
  Search,
  Clock,
  ArrowUpDown,
  X,
  Share2,
  Link2,
} from "lucide-react";
import Header from "@/components/Header";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/context/AuthContext";

interface GeneratedGif {
  id: string;
  url: string;
  caption: string;
  startTime: number;
  endTime: number;
  videoId: string;
  videoTitle?: string;
  userId: string;
  createdAt: string;
}

type ViewMode = "grid" | "list";
type SortBy = "newest" | "oldest" | "longest" | "shortest";

function formatDuration(start: number, end: number): string {
  const d = end - start;
  return d < 10 ? `${d.toFixed(1)}s` : `${Math.round(d)}s`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [gifs, setGifs] = useState<GeneratedGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewGif, setPreviewGif] = useState<GeneratedGif | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch real data
  useEffect(() => {
    async function fetchMyGifs() {
      try {
        const res = await fetch('/api/gif/my');
        if (res.ok) {
          const data = await res.json();
          setGifs(data);
        }
      } catch (error) {
        console.error("Failed to fetch GIFs:", error);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchMyGifs();
    else if (loading) {
       // Just a fallback if loading takes too long/user is null initially
       const timer = setTimeout(() => setLoading(false), 3000);
       return () => clearTimeout(timer);
    }
  }, [user]);

  // Close modal on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewGif(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredGifs = gifs
    .filter(
      (g) =>
        g.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.videoTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "longest":
          return (b.endTime - b.startTime) - (a.endTime - a.startTime);
        case "shortest":
          return (a.endTime - a.startTime) - (b.endTime - b.startTime);
        default:
          return 0;
      }
    });

  const copyGifUrl = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${window.location.origin}/gif/${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const downloadGif = useCallback(async (gifUrl: string, caption: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const response = await fetch(gifUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gif-${caption.substring(0, 20).replace(/\s+/g, "-")}.gif`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      console.error("Failed to download GIF");
    }
  }, []);

  const removeGif = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Permanently remove this record from history?')) return;
    
    setDeletingId(id);
    try {
       const res = await fetch(`/api/gif/${id}`, { method: 'DELETE' });
       if (res.ok) {
         setGifs((prev) => prev.filter((g) => g.id !== id));
         if (previewGif?.id === id) setPreviewGif(null);
       }
    } catch (error) {
       console.error("Failed to delete GIF:", error);
    } finally {
       setDeletingId(null);
    }
  }, [previewGif]);

  const shareTwitter = useCallback((gif: GeneratedGif) => {
    const url = `${window.location.origin}/gif/${gif.id}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        "Check out this GIF I made: " + gif.caption
      )}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  }, []);

  const totalDuration = gifs.reduce((acc, g) => acc + (g.endTime - g.startTime), 0);

  return (
    <div className="min-h-screen flex flex-col bg-surface noise-overlay" style={{ background: '#05070f' }}>
      <Header />

      {/* Aurora Background */}
      <div className="aurora-bg fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="aurora-orb aurora-orb-1 opacity-20" />
        <div className="aurora-orb aurora-orb-2 opacity-20" />
        <div className="aurora-orb aurora-orb-3 opacity-10" />
      </div>

      <RequireAuth>
        <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Page Header */}
          <div className="flex flex-col gap-8 mb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500/15 to-blue-500/10 border border-purple-500/20 shadow-[0_0_40px_-10px_rgba(168,85,247,0.3)]">
                  <History className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Studio Logs
                  </h1>
                  <div className="flex items-center gap-4 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                      <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em]">
                        {gifs.length} Assets
                      </span>
                    </div>
                    {gifs.length > 0 && (
                      <>
                        <span className="text-slate-800">·</span>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock size={11} />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                            {totalDuration.toFixed(1)}s total
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <a
                href="/"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:brightness-110 transition-all active:scale-[0.98]"
              >
                <Library size={15} strokeWidth={2.5} />
                Create New
              </a>
            </div>

            {/* Controls Bar */}
            {!loading && gifs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                  <input
                    type="text"
                    placeholder="Search captions, videos…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortBy)}
                      className="appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-slate-300 focus:outline-none focus:border-purple-500/40 transition-all cursor-pointer hover:bg-white/[0.06]"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="longest">Longest</option>
                      <option value="shortest">Shortest</option>
                    </select>
                    <ArrowUpDown
                      size={13}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
                    />
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/[0.06] p-0.5">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === "grid"
                          ? "bg-white/[0.1] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      <Grid3X3 size={15} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg transition-all ${
                        viewMode === "list"
                          ? "bg-white/[0.1] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      <List size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <LoadingSkeleton />
          ) : gifs.length === 0 ? (
            <EmptyState />
          ) : filteredGifs.length === 0 ? (
            <NoResults query={searchQuery} onClear={() => setSearchQuery("")} />
          ) : viewMode === "grid" ? (
            <GridView
              gifs={filteredGifs}
              copiedId={copiedId}
              deletingId={deletingId}
              onPreview={setPreviewGif}
              onCopy={copyGifUrl}
              onDownload={downloadGif}
              onRemove={removeGif}
            />
          ) : (
            <ListView
              gifs={filteredGifs}
              copiedId={copiedId}
              deletingId={deletingId}
              onPreview={setPreviewGif}
              onCopy={copyGifUrl}
              onDownload={downloadGif}
              onRemove={removeGif}
            />
          )}

          {/* Preview Modal */}
          <AnimatePresence>
            {previewGif && (
              <PreviewModal
                gif={previewGif}
                onClose={() => setPreviewGif(null)}
                onDownload={downloadGif}
                onCopy={copyGifUrl}
                onShare={shareTwitter}
                copiedId={copiedId}
              />
            )}
          </AnimatePresence>
        </main>
      </RequireAuth>
    </div>
  );
}

/* ─── Components ─── */

function LoadingSkeleton() {
  return (
    <div className="glass-card p-8 bg-black/20 border-white/5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden bg-white/5 border border-white/5">
            <div className="aspect-video shimmer rounded-xl" />
            <div className="pt-4 p-4 space-y-3">
              <div className="h-4 w-3/4 shimmer rounded-lg" />
              <div className="h-3 w-1/2 shimmer rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center mt-10">
        <p className="text-slate-600 font-semibold uppercase tracking-[0.3em] text-[10px]">
          Accessing Archives…
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card py-28 flex flex-col items-center justify-center text-center px-6">
      <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
        <Film className="w-9 h-9 text-slate-700" />
      </div>
      <h3 className="text-2xl font-black text-white mb-2 tracking-tight uppercase italic">
        No Archives Found
      </h3>
      <p className="text-slate-500 max-w-sm mb-10 text-sm leading-relaxed">
        Your studio logs are empty. Head to the editor to generate your first GIF asset.
      </p>
      <a
        href="/"
        className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:brightness-110 transition-all active:scale-[0.97]"
      >
        Open Studio
      </a>
    </div>
  );
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="glass-card py-20 flex flex-col items-center justify-center text-center px-6">
      <Search className="w-10 h-10 text-slate-700 mb-4" />
      <h3 className="text-xl font-bold text-white mb-1.5 uppercase">No matches</h3>
      <p className="text-slate-500 text-sm mb-6 font-medium">
        Nothing found for "<span className="text-slate-300">{query}</span>"
      </p>
      <button
        onClick={onClear}
        className="px-6 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-xs font-black uppercase tracking-widest hover:bg-white/[0.1] transition-all"
      >
        Clear search
      </button>
    </div>
  );
}

function GridView({
  gifs,
  copiedId,
  deletingId,
  onPreview,
  onCopy,
  onDownload,
  onRemove,
}: {
  gifs: GeneratedGif[];
  copiedId: string | null;
  deletingId: string | null;
  onPreview: (gif: GeneratedGif) => void;
  onCopy: (id: string, e?: React.MouseEvent) => void;
  onDownload: (url: string, caption: string, e?: React.MouseEvent) => void;
  onRemove: (id: string, e?: React.MouseEvent) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {gifs.map((gif, index) => (
        <motion.div
          key={gif.id}
          initial={{ opacity: 0, y: 16 }}
          animate={
            deletingId === gif.id
              ? { opacity: 0, scale: 0.9, y: -10 }
              : { opacity: 1, y: 0 }
          }
          transition={{ delay: index * 0.04, duration: 0.35 }}
          className="glass-card overflow-hidden cursor-pointer group hover:border-purple-500/30 transition-all"
          onClick={() => onPreview(gif)}
        >
          <div className="relative aspect-video overflow-hidden bg-slate-900/50">
            <img
              src={gif.url}
              alt={gif.caption}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                <Play size={16} className="text-white fill-white ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white font-mono tabular-nums">
              {formatDuration(gif.startTime, gif.endTime)}
            </div>
          </div>

          <div className="px-4 pt-4 pb-3">
            <p className="text-sm font-bold text-white/90 line-clamp-1 group-hover:text-purple-400 transition-colors uppercase tracking-tight">
              {gif.caption || "Untitled Broadcast"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest truncate">
                {gif.videoTitle || "Source Video"}
              </span>
            </div>
          </div>

          <div
            className="px-3 pb-3 flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] text-slate-700 font-black uppercase tracking-tighter">
              {formatRelativeDate(gif.createdAt)}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => onDownload(gif.url, gif.caption, e)}
                className="p-2 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.08] transition-all"
                title="Download"
              >
                <Download size={14} />
              </button>
              <button
                onClick={(e) => onCopy(gif.id, e)}
                className="p-2 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.08] transition-all"
                title="Copy link"
              >
                {copiedId === gif.id ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Link2 size={14} />
                )}
              </button>
              <button
                onClick={(e) => onRemove(gif.id, e)}
                className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ListView({
  gifs,
  copiedId,
  deletingId,
  onPreview,
  onCopy,
  onDownload,
  onRemove,
}: {
  gifs: GeneratedGif[];
  copiedId: string | null;
  deletingId: string | null;
  onPreview: (gif: GeneratedGif) => void;
  onCopy: (id: string, e?: React.MouseEvent) => void;
  onDownload: (url: string, caption: string, e?: React.MouseEvent) => void;
  onRemove: (id: string, e?: React.MouseEvent) => void;
}) {
  return (
    <div className="glass-card overflow-hidden bg-black/20 border-white/5">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] w-24">
                Identity
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                Broadcast Details
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] w-24 hidden sm:table-cell text-center">
                Temporal
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] w-24 hidden md:table-cell">
                Synchronized
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] w-40 text-right">
                Studio Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {gifs.map((gif, index) => (
              <motion.tr
                key={gif.id}
                initial={{ opacity: 0, x: -8 }}
                animate={
                  deletingId === gif.id
                    ? { opacity: 0, x: 20 }
                    : { opacity: 1, x: 0 }
                }
                transition={{ delay: index * 0.03, duration: 0.3 }}
                className="group hover:bg-white/[0.025] transition-colors cursor-pointer"
                onClick={() => onPreview(gif)}
              >
                <td className="px-6 py-5">
                  <div className="relative w-16 aspect-video rounded-lg overflow-hidden border border-white/[0.06] bg-slate-900 group-hover:border-purple-500/30 transition-colors">
                    <img
                      src={gif.url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <Play size={10} className="text-white fill-white" />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <p className="text-sm font-bold text-white/90 line-clamp-1 group-hover:text-purple-400 transition-colors uppercase tracking-tight">
                    {gif.caption || "Untitled Broadcast"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-600 font-mono italic">
                      {gif.startTime}s — {gif.endTime}s
                    </span>
                    {gif.videoTitle && (
                      <span className="hidden lg:inline text-[10px] text-slate-700 font-bold uppercase tracking-widest truncate max-w-[180px]">
                        · {gif.videoTitle}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 hidden sm:table-cell text-center">
                  <span className="inline-flex px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/15 text-[10px] font-black text-purple-400 font-mono tabular-nums">
                    {formatDuration(gif.startTime, gif.endTime)}
                  </span>
                </td>
                <td className="px-6 py-5 hidden md:table-cell">
                  <span className="text-[10px] text-slate-600 font-black uppercase tracking-tighter">
                    {formatRelativeDate(gif.createdAt)}
                  </span>
                </td>
                <td
                  className="px-6 py-5 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => onDownload(gif.url, gif.caption, e)}
                      className="p-2 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.08] transition-all"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={(e) => onCopy(gif.id, e)}
                      className="p-2 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.08] transition-all"
                      title="Copy link"
                    >
                      {copiedId === gif.id ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <ExternalLink size={14} />
                      )}
                    </button>
                    <button
                      onClick={(e) => onRemove(gif.id, e)}
                      className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewModal({
  gif,
  onClose,
  onDownload,
  onCopy,
  onShare,
  copiedId,
}: {
  gif: GeneratedGif;
  onClose: () => void;
  onDownload: (url: string, caption: string, e?: React.MouseEvent) => void;
  onCopy: (id: string, e?: React.MouseEvent) => void;
  onShare: (gif: GeneratedGif) => void;
  copiedId: string | null;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/95 backdrop-blur-2xl cursor-zoom-out"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="relative z-10 w-full max-w-4xl flex flex-col items-center gap-4"
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-3 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/10 border border-white/5"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="w-full rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl shadow-black/80">
          <div className="relative aspect-video flex items-center justify-center">
            <img
              src={gif.url}
              alt={gif.caption}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-6 left-6 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-2xl border border-white/10 text-[10px] font-black text-white/70 uppercase tracking-[0.3em] shadow-2xl">
              Studio Master
            </div>
          </div>
        </div>

        <div className="w-full bg-white/[0.04] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tighter line-clamp-2 uppercase italic">
                {gif.caption || "Untitled Broadcast"}
              </h3>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                   <Clock size={12} className="text-purple-400" />
                   <span className="text-xs text-purple-400 font-black uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                    {gif.startTime}s — {gif.endTime}s
                  </span>
                </div>
                <span className="text-slate-800">·</span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest truncate max-w-[300px]">
                  {gif.videoTitle || "Source Archive"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => onCopy(gif.id, e)}
                className="p-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.1] transition-all active:scale-95 group"
                title="Copy link"
              >
                {copiedId === gif.id ? (
                  <Check size={20} className="text-emerald-400" />
                ) : (
                  <Link2 size={20} className="group-hover:rotate-12 transition-transform" />
                )}
              </button>

              <button
                onClick={() => onShare(gif)}
                className="p-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-slate-400 hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/10 hover:border-[#1DA1F2]/20 transition-all active:scale-95 group"
                title="Share on X"
              >
                <Share2 size={20} className="group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={(e) => onDownload(gif.url, gif.caption, e)}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:brightness-110 transition-all active:scale-[0.97] group"
              >
                <Download size={18} strokeWidth={3} className="group-hover:-translate-y-1 transition-transform" />
                Export
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

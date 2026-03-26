"use client";

import React, { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Download, Copy, Check, Twitter, Send, XCircle, Play, Sparkles, Trash2, X, History, Library } from "lucide-react";

interface GeneratedGif {
  id: string;
  url: string;
  caption: string;
  startTime: number;
  endTime: number;
  videoId: string;
  videoTitle?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [gifs, setGifs] = useState<GeneratedGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
  }, [user]);

  const copyGifUrl = async (id: string) => {
    const url = `${window.location.origin}/gif/${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareTwitter = (gif: GeneratedGif) => {
    const url = `${window.location.origin}/gif/${gif.id}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out this GIF I made: " + gif.caption)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const deleteGif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this GIF?')) return;
    
    try {
      const res = await fetch(`/api/gif/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGifs(prev => prev.filter(g => g.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete GIF:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#05070f' }}>
      <Header />
      
      {/* Background Orbs */}
      <div className="aurora-bg fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="aurora-orb aurora-orb-1 opacity-20" />
        <div className="aurora-orb aurora-orb-2 opacity-20" />
      </div>

      <RequireAuth>
        <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Profile Header Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card mb-12 p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] -z-10" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 blur-[100px] -z-10" />

            <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white/10 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
              {user?.image ? (
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-4xl font-black text-white uppercase">
                  {user?.name?.[0] || 'U'}
                </div>
              )}
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                <h2 className="text-4xl font-black text-white tracking-tight">{user?.name}</h2>
                <span className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-400 uppercase tracking-widest self-center">
                  PRO STUDIO
                </span>
              </div>
              <p className="text-slate-400 font-medium mb-6">{user?.email}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center sm:items-start min-w-[120px] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Assets Created</span>
                  <span className="text-2xl font-black text-cyan-400 tracking-tighter">{gifs.length}</span>
                </div>
                <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center sm:items-start min-w-[120px] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Studio Status</span>
                  <span className="text-xl font-bold text-purple-400 tracking-tight">Active</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Gallery Section */}
          <div className="flex items-center justify-between mb-10 pb-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20 shadow-[0_0_25px_rgba(168,85,247,0.2)]">
                <Library className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">MY STUDIO COLLECTION</h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Personalized GIF Assets</p>
              </div>
            </div>
          </div>

          {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse border border-white/5" />
               ))}
             </div>
          ) : gifs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gifs.map((gif, index) => (
                <motion.div
                  key={gif.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative glass-card overflow-hidden hover:border-purple-500/50 transition-all shadow-xl hover:shadow-[0_8px_32px_rgba(168,85,247,0.15)]"
                  onMouseEnter={() => setHoveredId(gif.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Media */}
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden cursor-pointer">
                    <img 
                      src={hoveredId === gif.id ? gif.url : gif.url.replace('.gif', '.jpg')} 
                      alt={gif.caption}
                      className="w-full h-full object-contain mix-blend-screen transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* Play Button Overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 pointer-events-none ${hoveredId === gif.id ? 'opacity-0 scale-110' : 'opacity-100 scale-100 bg-black/20'}`}>
                       <div className="w-12 h-12 rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-md flex items-center justify-center">
                         <Play className="w-5 h-5 text-white ml-1" fill="currentColor" />
                       </div>
                    </div>

                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white tracking-widest border border-white/10">
                      GIF
                    </div>

                    {/* Delete Icon */}
                    <button 
                      onClick={(e) => deleteGif(e, gif.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-md text-white/50 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all border border-white/5 hover:border-red-500/50"
                      title="Delete GIF"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-slate-200 line-clamp-2 mb-4 h-10">{gif.caption || 'Untitled GIF'}</p>
                    <div className="flex gap-2">
                       <button onClick={() => copyGifUrl(gif.id)} className="flex-1 py-2 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-semibold">
                         {copiedId === gif.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                         {copiedId === gif.id ? 'Copied' : 'Copy Link'}
                       </button>
                       <button onClick={() => shareTwitter(gif)} className="p-2 rounded-lg border border-white/10 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] transition-colors">
                         <Twitter className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center glass-card border-dashed">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-slate-600" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Your gallery is empty</h4>
              <p className="text-slate-400 max-w-xs mb-8">Start by finding a YouTube video and asking our AI to create your first viral clip.</p>
              <a href="/" className="btn-gradient px-8">Go to Studio</a>
            </div>
          )}
        </main>
      </RequireAuth>
    </div>
  );
}
 
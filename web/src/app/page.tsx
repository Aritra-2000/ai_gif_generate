"use client"

import { useState } from 'react'
import { Search, Brain, Film, Sparkles, Play, History, Send, Quote, ChevronRight } from 'lucide-react'
import VideoPreview from '@/components/VideoPreview'
import Header from "@/components/Header"
import RequireAuth from "@/components/RequireAuth"
import { useSession } from "next-auth/react"
import { AiGifGenerator } from '@/components/AiGifGenerator'
import { TranscriptViewer } from '@/components/TranscriptViewer'
import VideoSelector from '@/components/VideoSelector'
import GifPreviewSelector from '@/components/GifPreviewSelector'
import { YoutubeDownloader } from '@/components/YoutubeDownloader'
import { motion, AnimatePresence } from 'framer-motion'

interface VideoData {
  id: string;
  title: string;
  url: string;
  status: string;
  transcript?: {
    fullText: string;
  };
  gifs?: any[];
}

export default function Home() {
  const { status } = useSession()
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null)
  const [generatedGifs, setGeneratedGifs] = useState<any[]>([])
  const [selectedQuote, setSelectedQuote] = useState<string>('')
  const [selectedCaption, setSelectedCaption] = useState<any>(null)
  const [videoSeekTime, setVideoSeekTime] = useState<number | null>(null)

  const handleVideoSelect = (video: VideoData) => {
    setSelectedVideo(video);
    setGeneratedGifs([]);
    setSelectedQuote('');
    setSelectedCaption(null);
  }

  const handleGifsGenerated = (gifs: any[]) => {
    setGeneratedGifs(gifs);
  }

  if ((status as string) === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#05070f' }}>
        <div className="aurora-bg">
          <div className="aurora-orb aurora-orb-1" />
          <div className="aurora-orb aurora-orb-2" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 font-medium">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#05070f' }}>
      {/* Aurora background orbs */}
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
        <div className="aurora-orb aurora-orb-4" />
      </div>

      {/* Grid overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      {status !== "loading" && <Header />}

      <RequireAuth>
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

          {/* Hero Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 badge badge-purple mb-4">
              <Sparkles className="w-3 h-3" />
              <span>AI-Powered GIF Generator</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
              Turn Videos into{' '}
              <span className="gradient-text">Viral GIFs</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto">
              Upload a video, let AI find the perfect moment, and generate a stunning captioned GIF in seconds.
            </p>
          </motion.div>

          {/* Steps indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-2 mb-10 flex-wrap"
          >
            {[
              { n: 1, label: 'Import Video', done: !!selectedVideo },
              { n: 2, label: 'AI Analysis', done: false },
              { n: 3, label: 'Your GIF', done: generatedGifs.length > 0 },
            ].map((step, i, arr) => (
              <div key={step.n} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  step.done
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/10'
                }`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step.done ? 'bg-purple-500 text-white' : 'bg-white/10 text-slate-400'
                  }`}>{step.n}</div>
                  {step.label}
                </div>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600" />}
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── LEFT COLUMN ── */}
            <div className="space-y-5">

              {/* YouTube Importer */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <YoutubeDownloader onVideoSelect={handleVideoSelect} />
              </motion.div>

              {/* Video Library */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <div className="glass-card p-5">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                    <History className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Library</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Select a video to begin</p>
                  </div>
                </div>
                {!selectedVideo && (
                  <div className="hidden sm:block text-xs text-slate-500 italic">
                    Search history or upload a new URL
                  </div>
                )}
              </div>
                  <VideoSelector
                    onVideoSelect={handleVideoSelect}
                    selectedVideoId={selectedVideo?.id}
                  />
                </div>
              </motion.div>

              {/* Video Preview + Transcript */}
              <AnimatePresence>
                {selectedVideo && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    className="space-y-5"
                  >
                    {/* Video Preview */}
                    <motion.div 
                      layout
                      className="glass-card p-5 relative overflow-hidden group shadow-[0_8px_32px_rgba(34,197,94,0.05)] border-green-500/10"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                            <Play className="w-5 h-5 text-green-400 fill-green-400/20" />
                          </div>
                          <div>
                            <h3 className="font-black text-white text-base tracking-tight uppercase">Preview</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                Live Studio
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <AnimatePresence>
                            {selectedVideo.status === 'completed' && (
                              <motion.span 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)] relative overflow-hidden group hover:scale-105 transition-transform"
                              >
                                {selectedVideo.status}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="rounded-xl overflow-hidden shadow-2xl">
                        <VideoPreview videoUrl={selectedVideo.url} seekTo={videoSeekTime} />
                      </div>

                      <div className="mt-4 flex items-center justify-between px-1">
                        <div className="text-[10px] text-slate-500 font-medium">
                           {selectedVideo.transcript?.fullText.length.toLocaleString()} characters processed
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                           4K Enhanced
                        </div>
                      </div>
                    </motion.div>

                    {/* Video Preview only on the left now */}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="space-y-5">
              <AnimatePresence>
                {selectedVideo ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-5"
                  >
                    {/* Transcript (Moved to Right Column above Generator) */}
                    {selectedVideo.transcript ? (
                      <div className="glass-card p-5">
                        <TranscriptViewer
                          transcript={selectedVideo.transcript.fullText}
                          title="Video Transcript"
                          onQuoteSelect={setSelectedQuote}
                          onDirectCaptionAdd={setSelectedCaption}
                        />
                      </div>
                    ) : (
                      <div className="glass-card p-5 border-yellow-500/20" style={{ borderColor: 'rgba(234,179,8,0.2)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.1)' }}>
                            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold text-yellow-300 text-sm">No transcript available</p>
                            <p className="text-xs text-slate-500 mt-0.5">Transcript generation failed or is still processing.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI GIF Generator */}
                    <div className="glass-card p-5">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-black text-white text-base tracking-tight uppercase">AI GIF Studio</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Powered by GEMINI & GROQ</p>
                          </div>
                        </div>
                        <div className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-400 uppercase tracking-tighter">
                          v2.0
                        </div>
                      </div>
                      <AiGifGenerator
                        videoId={selectedVideo.id}
                        videoUrl={selectedVideo.url}
                        onGifsGenerated={handleGifsGenerated}
                        externalPrompt={selectedQuote}
                        externalCaption={selectedCaption}
                        hasTranscript={!!selectedVideo.transcript}
                        existingGifs={selectedVideo.gifs}
                        onPreviewSegment={(time: number) => setVideoSeekTime(time)}
                      />
                    </div>

                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card p-10 flex flex-col items-center justify-center text-center"
                    style={{ minHeight: '300px' }}
                  >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <Film className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">Select a Video to Begin</h3>
                    <p className="text-slate-500 text-sm max-w-xs">
                      Import from YouTube or pick from your library on the left to start generating AI-powered GIFs.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </RequireAuth>
    </div>
  )
}
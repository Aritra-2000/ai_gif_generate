'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, CheckSquare, Square, X, Download, Share2, Copy, Trash2, BrainCircuit, Scissors, Layers, Film, Play, XCircle, Wand2, History, Eye, Zap, Trash } from 'lucide-react';
import { VideoManualTrimmer } from './VideoManualTrimmer';

interface CaptionData {
  text: string;
  startTime: number;
  endTime: number;
  reason: string;
}

interface GeneratedGif {
  id: string;
  url: string;
  caption: string;
  startTime: number;
  endTime: number;
  reason: string;
}

interface AiGifGeneratorProps {
  videoId: string;
  videoUrl?: string; // Optional for backwards compatibility, required for Trimmer
  onGifsGenerated?: (gifs: GeneratedGif[]) => void;
  externalPrompt?: string;
  externalCaption?: { text: string; startTime: number; endTime: number; } | null;
  hasTranscript?: boolean;
  existingGifs?: GeneratedGif[];
  onPreviewSegment?: (time: number) => void;
}

export function AiGifGenerator({ videoId, videoUrl, onGifsGenerated, externalPrompt, externalCaption, hasTranscript = true, existingGifs = [], onPreviewSegment }: AiGifGeneratorProps) {
  const [prompt, setPrompt] = useState(externalPrompt || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [captions, setCaptions] = useState<CaptionData[]>([]);
  const [selectedCaptions, setSelectedCaptions] = useState<Set<number>>(new Set());
  const [generatedGifs, setGeneratedGifs] = useState<GeneratedGif[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightInput, setHighlightInput] = useState(false);
  
  const [hoveredGif, setHoveredGif] = useState<string | null>(null);
  const [previewGif, setPreviewGif] = useState<GeneratedGif | null>(null);
  
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [manualStart, setManualStart] = useState(0);
  const [manualEnd, setManualEnd] = useState(5);

  // Clear session GIFs when video Id changes
  React.useEffect(() => {
    setGeneratedGifs([]);
  }, [videoId]);

  // When external prompt changes...

  // When external caption (with timestamps) is sent from the transcript
  React.useEffect(() => {
    if (!externalCaption) return;
    
    setCaptions(prev => {
      // Don't add if it's already exactly in the queue
      const exists = prev.some(c => c.startTime === externalCaption.startTime && c.text === externalCaption.text);
      if (exists) return prev;
      
      const newCaption = {
        ...externalCaption,
        reason: 'Selected manually from transcript'
      };
      
      return [newCaption, ...prev];
    });

    // Auto-select the newly added caption (which is at index 0)
    setSelectedCaptions(prev => new Set([0, ...Array.from(prev).map(i => i + 1)]));
    
  }, [externalCaption]);

  const analyzeTranscript = async () => {
    if (!prompt.trim()) { setError('Please enter a prompt'); return; }
    setIsAnalyzing(true);
    setError(null);
    setCaptions([]);
    setGeneratedGifs([]);
    try {
      const response = await fetch('/api/video/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, prompt: prompt.trim() }),
      });
      console.log('DeepSeek response status:', response.status);
      const data = await response.json();
      console.log('DeepSeek raw response:', JSON.stringify(data, null, 2));
      const content = data.choices?.[0]?.message?.content || '';
      console.log('DeepSeek content:', content);
      if (!response.ok) throw new Error(data.error || 'Failed to analyze transcript');
      setCaptions(data.captions);
      setSelectedCaptions(new Set(data.captions.map((_: CaptionData, i: number) => i)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCaptionSelection = (index: number) => {
    const s = new Set(selectedCaptions);
    s.has(index) ? s.delete(index) : s.add(index);
    setSelectedCaptions(s);
  };

  const handleCaptionEdit = (index: number, field: keyof CaptionData, value: string | number) => {
    const updated = [...captions];
    updated[index] = { ...updated[index], [field]: value };
    setCaptions(updated);
  };

  const removeCaption = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    setCaptions(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setSelectedCaptions(prev => {
      const newSet = new Set<number>();
      for (const val of prev) {
        if (val < indexToRemove) newSet.add(val);
        else if (val > indexToRemove) newSet.add(val - 1);
      }
      return newSet;
    });
  };

  const removeGeneratedGif = (gifId: string) => {
    setGeneratedGifs(prev => prev.filter(g => g.id !== gifId));
  };

  const addManualGifToQueue = () => {
    const newCaption: CaptionData = {
      text: prompt.trim() || 'Manual Selection',
      startTime: manualStart,
      endTime: manualEnd,
      reason: 'Manually trimmed'
    };
    setCaptions(prev => [newCaption, ...prev]);
    setSelectedCaptions(prev => new Set([0, ...Array.from(prev).map(i => i + 1)]));
  };

  const generateGifs = async () => {
    if (!captions.length) { setError('No captions. Analyze first.'); return; }
    if (!selectedCaptions.size) { setError('Select at least one caption.'); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const selectedCaptionData = captions.filter((_: CaptionData, i: number) => selectedCaptions.has(i));
      const response = await fetch('/api/gif/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, captions: selectedCaptionData, prompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate GIFs');
      setGeneratedGifs(data.gifs);
      onGifsGenerated?.(data.gifs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadGif = async (gifUrl: string, caption: string) => {
    try {
      const response = await fetch(gifUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gif-${caption.substring(0, 20)}.gif`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download GIF'); }
  };

  const copyGifUrl = async (id: string) => {
    const url = `${window.location.origin}/gif/${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareTwitter = (gif: GeneratedGif) => {
    const url = `${window.location.origin}/gif/${gif.id}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out this GIF I made: " + gif.caption + "\n")}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareWhatsApp = (gif: GeneratedGif) => {
    const url = `${window.location.origin}/gif/${gif.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out this GIF I made: " + gif.caption + " " + url)}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Mode Switcher Tabs */}
      <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 relative z-10 w-full mb-2">
        <button
          onClick={() => setMode('ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === 'ai' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" /> AI Search
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === 'manual' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" /> Manual Trim
        </button>
      </div>

      {mode === 'ai' ? (
        <>
          {/* Prompt Input Header (AI Mode) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Describe your moment</label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && prompt.trim() && analyzeTranscript()}
                placeholder="e.g., Stay motivated, Never give up..."
                className={`w-full py-3.5 pl-4 pr-12 rounded-xl text-sm transition-all duration-300 ${
                  highlightInput ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] text-white' : 'bg-black/40 border-white/10 focus:border-purple-500/50 text-slate-200'
                } border focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={isAnalyzing || isGenerating || !hasTranscript}
                title={!hasTranscript ? "AI requires a text transcript to find moments" : ""}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                 <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-500 font-mono">
                   ↵ Enter
                 </div>
              </div>
            </div>
          </div>

          {/* Action Buttons (AI Mode) */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={analyzeTranscript}
              disabled={isAnalyzing || isGenerating || !prompt.trim() || !hasTranscript}
              title={!hasTranscript ? "A text transcript is required to use AI search" : ""}
              className="relative flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/30 bg-purple-500/20 text-purple-100 hover:bg-purple-500/30 hover:border-purple-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            >
              {isAnalyzing ? (
                <><span className="w-4 h-4 border-2 border-purple-200/30 border-t-purple-200 rounded-full animate-spin inline-block" /><span>Analyzing...</span></>
              ) : (
                <><Wand2 className="w-4 h-4" /><span>Ask AI to Find Clip</span></>
              )}
            </button>
            <button
              onClick={generateGifs}
              disabled={isGenerating || selectedCaptions.size === 0}
              className="relative flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-500/30 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 hover:border-cyan-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            >
              {isGenerating ? (
                <><span className="w-4 h-4 border-2 border-cyan-200/30 border-t-cyan-200 rounded-full animate-spin inline-block" /><span>Generating GIFs...</span></>
              ) : (
                <><Sparkles className="w-4 h-4" /><span>{selectedCaptions.size > 0 ? `Create ${selectedCaptions.size} AI GIF${selectedCaptions.size !== 1 ? 's' : ''}` : 'Create AI GIF'}</span></>
              )}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Manual Trim Mode */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">GIF Caption (Optional)</label>
            </div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Epic moment!"
              className="w-full py-2.5 pl-4 pr-4 rounded-xl text-sm transition-all duration-300 bg-black/40 border border-white/10 focus:border-blue-500/50 text-slate-200 focus:outline-none"
              disabled={isGenerating}
            />
            {videoUrl && (
              <VideoManualTrimmer 
                videoUrl={videoUrl} 
                onTrimSelect={(start, end) => {
                  setManualStart(start);
                  setManualEnd(end);
                }} 
              />
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={addManualGifToQueue}
              disabled={isGenerating || manualEnd - manualStart < 1}
              className="relative flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 cursor-pointer border border-blue-500/30 bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 hover:border-blue-500/50"
            >
              <CheckSquare className="w-4 h-4" /> Add Trim to Queue
            </button>
            <button
              onClick={generateGifs}
              disabled={isGenerating || selectedCaptions.size === 0}
              className="relative flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-500/30 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 hover:border-cyan-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            >
              {isGenerating ? (
                <><span className="w-4 h-4 border-2 border-cyan-200/30 border-t-cyan-200 rounded-full animate-spin inline-block" /><span>Generating GIFs...</span></>
              ) : (
                <><Sparkles className="w-4 h-4" /><span>{selectedCaptions.size > 0 ? `Create ${selectedCaptions.size} GIF${selectedCaptions.size !== 1 ? 's' : ''}` : 'Create GIF'}</span></>
              )}
            </button>
          </div>
        </>
      )}

      {/* Shimmer progress bar */}
      <AnimatePresence>
        {(isAnalyzing || isGenerating) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-1 rounded-full overflow-hidden">
            <div className="h-full shimmer-bar rounded-full" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-3 rounded-xl text-sm text-red-300 flex items-start gap-2"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span>⚠️</span><span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Captions Preview Queue */}
      <AnimatePresence>
        {captions.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                  <Layers className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">GIF QUEUE</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {selectedCaptions.size} clips selected
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedCaptions(new Set(captions.map((_, i) => i)))} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-all">
                  <CheckSquare className="w-3.5 h-3.5" /> All
                </button>
                <button onClick={() => setSelectedCaptions(new Set())} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-all">
                  <Square className="w-3.5 h-3.5" /> None
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {captions.map((caption, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${
                    selectedCaptions.has(index) 
                      ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_4px_20px_rgba(168,85,247,0.1)]' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => toggleCaptionSelection(index)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`mt-1 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all border ${
                      selectedCaptions.has(index) ? 'bg-purple-500 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-black/40 border-slate-600'
                    }`}>
                      {selectedCaptions.has(index) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                      {/* Editable caption text */}
                      <input
                        type="text"
                        value={caption.text}
                        onChange={(e) => handleCaptionEdit(index, 'text', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-black/20 border border-white/5 hover:border-white/10 focus:border-purple-500/50 rounded-lg text-sm text-slate-200 font-medium mb-3 outline-none transition-all"
                        style={{ padding: '0.5rem 0.75rem' }}
                        placeholder="Caption text..."
                      />
                      
                      {/* Time controls */}
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-md border border-white/5">
                          <span className="text-slate-500 font-medium tracking-wide text-[10px] uppercase">Start</span>
                          <input
                            type="number" step="0.1" value={caption.startTime}
                            onChange={(e) => handleCaptionEdit(index, 'startTime', parseFloat(e.target.value) || 0)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-12 bg-transparent text-white text-center outline-none font-mono"
                          />
                          <span className="text-slate-500">s</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-md border border-white/5">
                          <span className="text-slate-500 font-medium tracking-wide text-[10px] uppercase">End</span>
                          <input
                            type="number" step="0.1" value={caption.endTime}
                            onChange={(e) => handleCaptionEdit(index, 'endTime', parseFloat(e.target.value) || 0)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-12 bg-transparent text-white text-center outline-none font-mono"
                          />
                          <span className="text-slate-500">s</span>
                        </div>
                        <button 
                           onClick={(e) => { e.stopPropagation(); onPreviewSegment?.(caption.startTime); }}
                           className="ml-auto p-2 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                           title="Preview Segment"
                        >
                          <Play size={10} fill="currentColor" />
                        </button>
                        <span className="px-2 py-1 tracking-wide rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/20 font-medium">
                          {Math.max(0, caption.endTime - caption.startTime).toFixed(1)}s
                        </span>
                      </div>
                      
                      {caption.reason && <p className="text-[11px] text-slate-500 mt-2 line-clamp-1 italic">✨ {caption.reason}</p>}
                    </div>
                  </div>
                  
                  {/* Delete / Clear button visible on hover */}
                  <button 
                    onClick={(e) => removeCaption(e, index)}
                    className="absolute top-4 right-4 p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-500/20"
                    title="Remove caption"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 border-t border-white/5">
            <div className="bg-black/20 border border-white/5 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center">
               <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                 <Square className="w-4 h-4 text-slate-500" />
               </div>
               <p className="text-sm font-medium text-slate-300">Queue is empty</p>
               <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Click a sentence in the transcript, or ask the AI to find a moment.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimalistic Success Notification with Link to History */}
      <AnimatePresence>
        {generatedGifs.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mt-12 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Check size={18} className="text-emerald-400" />
               </div>
               <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight italic">Generation Synchronized</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {generatedGifs.length} new clips have been transferred to your master archives
                  </p>
               </div>
            </div>
            
            <div className="flex items-center gap-3">
               <button onClick={() => setGeneratedGifs([])} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">
                  Dismiss
               </button>
               <a 
                 href="/history" 
                 className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 transition-all flex items-center gap-2"
               >
                 <History size={12} strokeWidth={3} /> Open Studio Logs
               </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {previewGif && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-zoom-out"
               onClick={() => setPreviewGif(null)}
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-4"
            >
               <button 
                  onClick={() => setPreviewGif(null)}
                  className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
               >
                 <XCircle className="w-8 h-8" />
               </button>
               <div className="bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl w-full flex items-center justify-center aspect-video p-1">
                 <img src={previewGif.url} alt="Large modal preview" className="w-full h-full object-contain" />
               </div>
               <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex items-center justify-between">
                 <div className="flex-1 pr-6">
                    <p className="text-white font-semibold text-lg">{previewGif.caption}</p>
                    <p className="text-slate-400 text-sm mt-1">Generated loop from {previewGif.startTime}s to {previewGif.endTime}s</p>
                 </div>
                 <button onClick={() => downloadGif(previewGif.url, previewGif.caption)} className="py-3 px-6 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-white font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 active:scale-95">
                   <Download className="w-4 h-4" strokeWidth={2.5} /> Save to Device
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
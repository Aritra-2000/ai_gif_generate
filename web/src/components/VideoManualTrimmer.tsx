import React, { useState, useEffect, useRef } from 'react';
import { Scissors } from 'lucide-react';

interface VideoManualTrimmerProps {
  videoUrl: string;
  onTrimSelect: (start: number, end: number) => void;
}

export function VideoManualTrimmer({ videoUrl, onTrimSelect }: VideoManualTrimmerProps) {
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(5); // default 5s
  
  // Update parent when values change (debounced slightly or handled on apply)
  useEffect(() => {
    if (duration > 0) {
      // Ensure constraints
      let s = Math.max(0, start);
      let e = Math.min(duration, end);
      if (e - s < 1) e = s + 1; // min 1s
      if (e - s > 15) e = s + 15; // max 15s (prevent massive GIFs)
      
      onTrimSelect(s, e);
    }
  }, [start, end, duration, onTrimSelect]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-4 p-5 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden group" style={{ background: 'rgba(255,255,255,0.02)' }}>
      {/* Hidden video for metadata */}
      <video
        src={videoUrl}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDuration(d);
          if (end > d) setEnd(d);
        }}
      />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Scissors className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">Manual Studio</h4>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">Precise Clipping</p>
          </div>
        </div>
        <div className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 tracking-widest uppercase">
          {formatTime(end - start)} SELECTED
        </div>
      </div>

      {duration === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
           <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3" />
           <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Hydrating Timeline...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Start Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Start Position</label>
              <span className="text-xs text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{formatTime(start)}</span>
            </div>
            <div className="relative h-6 flex items-center">
              <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
                   style={{ width: `${(start / duration) * 100}%` }}
                 />
              </div>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={start}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val < end) setStart(val);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] pointer-events-none border-2 border-blue-500"
                style={{ left: `calc(${(start / duration) * 100}% - 8px)` }}
              />
            </div>
          </div>

          {/* End Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">End Position</label>
              <span className="text-xs text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{formatTime(end)}</span>
            </div>
            <div className="relative h-6 flex items-center">
              <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
                   style={{ width: `${(end / duration) * 100}%` }}
                 />
              </div>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={end}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > start) setEnd(val);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] pointer-events-none border-2 border-cyan-400"
                style={{ left: `calc(${(end / duration) * 100}% - 8px)` }}
              />
            </div>
          </div>
          
          <div className="pt-2 flex items-center gap-2">
             <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
             <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Maximum Duration: 15 seconds</span>
             <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        </div>
      )}
    </div>
  );
}

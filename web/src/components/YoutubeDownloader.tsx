'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Youtube, Download, AlertCircle } from 'lucide-react';

export function YoutubeDownloader({ onVideoSelect }: { onVideoSelect: (video: any) => void }) {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!url.trim()) { setError('Please enter a valid YouTube URL'); return; }
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/video/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process YouTube video');
      if (data.video) {
        onVideoSelect(data.video);
        setSuccess(`"${data.video.title}" imported successfully!`);
        setUrl('');
      } else {
        throw new Error('Video data missing from response');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
          <Youtube className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Import from YouTube</h3>
          <p className="text-xs text-slate-500">Paste URL · Downloads & transcribes automatically</p>
        </div>
      </div>

      {/* URL Input + Button */}
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isProcessing && url.trim() && handleDownload()}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={isProcessing}
          className="dark-input text-sm flex-1"
        />
        <button
          onClick={handleDownload}
          disabled={isProcessing || !url.trim()}
          className="btn-gradient whitespace-nowrap"
          style={{ background: isProcessing ? undefined : 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
        >
          {isProcessing ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /><span>Importing...</span></>
          ) : (
            <><Download className="w-4 h-4 relative z-10" /><span>Import</span></>
          )}
        </button>
      </div>

      {/* Status messages */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-3 flex items-center gap-2 text-xs text-red-300 p-2.5 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </motion.div>
      )}
      {success && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-3 flex items-center gap-2 text-xs text-green-300 p-2.5 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          ✅ {success}
        </motion.div>
      )}
    </motion.div>
  );
}

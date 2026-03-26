'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import VideoUpload from './VideoUpload';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoData {
  id: string;
  title: string;
  url: string;
  status: string;
  createdAt: string;
  transcript?: { fullText: string };
}

interface VideoSelectorProps {
  onVideoSelect: (video: VideoData) => void;
  selectedVideoId?: string;
}

export default function VideoSelector({ onVideoSelect, selectedVideoId }: VideoSelectorProps) {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/video/list');
      const data = await response.json();
      if (response.ok) setVideos(data.videos || []);
      else setError('Failed to fetch videos');
    } catch { setError('Failed to fetch videos'); }
    finally { setIsLoading(false); }
  };

  const handleVideoUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('video', file);
      const response = await fetch('/api/video/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload video');
      const newVideo = { ...data.video, transcript: data.transcript };
      setVideos(prev => [newVideo, ...prev]);
      onVideoSelect(newVideo);
      setShowUploadForm(false);
    } catch (err: any) { setError(err.message); }
    finally { setIsUploading(false); }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Ready', color: 'text-green-400' };
      case 'processing': return { icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, label: 'Processing', color: 'text-blue-400' };
      case 'transcript_failed': return { icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'No Transcript', color: 'text-yellow-400' };
      default: return { icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Unknown', color: 'text-slate-500' };
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="section-label">Your Videos</p>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="btn-glass text-xs px-3 py-1.5"
        >
          <Upload className="w-3 h-3" />
          {showUploadForm ? 'Cancel' : 'Upload New'}
        </button>
      </div>

      {/* Upload form */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <VideoUpload onUpload={handleVideoUpload} />
              {isUploading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-blue-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Uploading and transcribing...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400 p-2.5 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Refresh button */}
      <button onClick={fetchVideos} className="btn-glass text-xs px-3 py-1.5 w-full justify-center">
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Loading...' : 'Refresh Library'}
      </button>

      {/* Video list */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
        {isLoading ? (
          <div className="text-center py-8 text-slate-600">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-slate-700" />
            <p className="text-xs">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8">
            <Upload className="w-8 h-8 mx-auto mb-3 text-slate-700" />
            <p className="text-xs text-slate-500">No videos yet</p>
            <p className="text-xs text-slate-600 mt-0.5">Upload or import from YouTube above</p>
          </div>
        ) : (
          videos.map((video, i) => {
            const { icon, label, color } = getStatusConfig(video.status);
            const isSelected = selectedVideoId === video.id;
            return (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onVideoSelect(video)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  background: isSelected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)',
                  border: isSelected ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Thumbnail icon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: isSelected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)' }}>
                  <Play className={`w-4 h-4 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {video.title}
                  </p>
                  <div className={`flex items-center gap-1.5 mt-0.5 text-[10px] ${color}`}>
                    {icon}
                    <span>{label}</span>
                    {video.transcript && <span className="text-slate-600">• Transcript ✓</span>}
                  </div>
                </div>
                {/* Date */}
                <p className="text-[10px] text-slate-600 flex-shrink-0">
                  {new Date(video.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </p>
                {/* Selected indicator */}
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';
import VideoUpload from './VideoUpload';

interface VideoData {
  id: string;
  title: string;
  url: string;
  status: string;
  createdAt: string;
  transcript?: {
    fullText: string;
  };
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
  const [isCleaning, setIsCleaning] = useState(false);

  // Fetch videos on component mount
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/video/list');
      const data = await response.json();
      
      if (response.ok) {
        setVideos(data.videos || []);
      } else {
        setError('Failed to fetch videos');
      }
    } catch (err) {
      setError('Failed to fetch videos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('/api/video/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload video');
      }

      // Add new video to the list
      const newVideo = {
        ...data.video,
        transcript: data.transcript
      };
      
      setVideos(prev => [newVideo, ...prev]);
      
      // Auto-select the newly uploaded video
      onVideoSelect(newVideo);
      
      // Hide upload form
      setShowUploadForm(false);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'transcript_failed':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'transcript_failed':
        return 'Transcript Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Select Video</h3>
        <Button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {showUploadForm ? 'Cancel' : 'Upload New'}
        </Button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <VideoUpload onUpload={handleVideoUpload} />
          {isUploading && (
            <div className="mt-4 text-sm text-blue-600 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Uploading and processing video...
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Video List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No videos uploaded yet</p>
            <p className="text-sm">Upload your first video to get started</p>
          </div>
        ) : (
          videos.map((video) => (
            <div
              key={video.id}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                selectedVideoId === video.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Play className="w-4 h-4 text-gray-600" />
                </div>
                <div
                  className="flex-1 min-w-0"
                  onClick={() => onVideoSelect(video)}
                  style={{ cursor: 'pointer' }}
                >
                  <h4 className="font-medium text-gray-900 truncate">
                    {video.title}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {getStatusIcon(video.status)}
                    <span>{getStatusText(video.status)}</span>
                    {video.transcript && (
                      <span>• Transcript available</span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(video.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 
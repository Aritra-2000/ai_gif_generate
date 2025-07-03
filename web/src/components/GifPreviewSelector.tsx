'use client';

import React, { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from './ui/Button';

interface GeneratedGif {
  id: string;
  url: string;
  startTime: number;
  endTime: number;
}

interface GifPreviewSelectorProps {
  gifs: GeneratedGif[];
}

export default function GifPreviewSelector({ gifs }: GifPreviewSelectorProps) {
  const [playingGifs, setPlayingGifs] = useState<Set<string>>(new Set());

  const togglePlay = (gifId: string) => {
    const newPlaying = new Set(playingGifs);
    if (newPlaying.has(gifId)) {
      newPlaying.delete(gifId);
    } else {
      newPlaying.add(gifId);
    }
    setPlayingGifs(newPlaying);
  };

  const formatDuration = (start: number, end: number) => {
    const duration = end - start;
    return `${start.toFixed(1)}s - ${end.toFixed(1)}s (${duration.toFixed(1)}s)`;
  };

  const downloadGif = async (url: string, id: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `gif-${id}.gif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('Failed to download GIF');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          Generated GIFs ({gifs.length})
        </h3>
      </div>

      {/* GIF Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
        {gifs.map((gif) => (
          <div
            key={gif.id}
            className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:border-gray-300"
          >
            {/* Play/Pause Button */}
            <div className="p-2 bg-gray-50 border-b flex items-center justify-end">
              <button
                onClick={() => togglePlay(gif.id)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title={playingGifs.has(gif.id) ? 'Pause' : 'Play'}
              >
                {playingGifs.has(gif.id) ? (
                  <Pause className="w-4 h-4 text-gray-600" />
                ) : (
                  <Play className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>

            {/* GIF Preview */}
            <div className="relative aspect-video bg-black">
              <img
                src={gif.url}
                alt="Generated GIF"
                className={`w-full h-full object-cover ${
                  playingGifs.has(gif.id) ? 'animate-pulse' : ''
                }`}
                style={{
                  animationPlayState: playingGifs.has(gif.id) ? 'running' : 'paused'
                }}
              />
              
              {/* Duration Overlay */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs md:text-sm px-2 py-1 rounded">
                {formatDuration(gif.startTime, gif.endTime)}
              </div>
            </div>

            {/* Duration Info */}
            <div className="p-2 md:p-3">
              <p className="text-xs md:text-sm text-gray-500">
                <strong>Duration:</strong> {formatDuration(gif.startTime, gif.endTime)}
              </p>
            </div>

            <Button
              onClick={() => downloadGif(gif.url, gif.id)}
              className="w-full mt-2 text-xs md:text-sm"
            >
              Download
            </Button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {gifs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No GIFs Generated Yet</h3>
          <p className="text-gray-600">
            Generate some GIFs using the AI-powered generator to see them here
          </p>
        </div>
      )}
    </div>
  );
} 
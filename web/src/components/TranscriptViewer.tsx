'use client';

import React, { useState } from 'react';

interface TranscriptViewerProps {
  transcript: string;
  title?: string;
}

export function TranscriptViewer({ transcript, title = "Video Transcript" }: TranscriptViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!transcript) {
    return null;
  }

  const displayText = isExpanded ? transcript : transcript.substring(0, 200) + '...';

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        {transcript.length} characters • {transcript.split(' ').length} words
      </div>
    </div>
  );
} 
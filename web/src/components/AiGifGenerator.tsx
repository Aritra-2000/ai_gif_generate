'use client';

import React, { useState } from 'react';
import { Button } from './ui/Button';

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
  onGifsGenerated?: (gifs: GeneratedGif[]) => void;
}

export function AiGifGenerator({ videoId, onGifsGenerated }: AiGifGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [captions, setCaptions] = useState<CaptionData[]>([]);
  const [selectedCaptions, setSelectedCaptions] = useState<Set<number>>(new Set());
  const [generatedGifs, setGeneratedGifs] = useState<GeneratedGif[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyzeTranscript = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/video/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          prompt: prompt.trim(),
        }),
      });

      console.log('DeepSeek response status:', response.status);
      const data = await response.json();
      console.log('DeepSeek raw response:', JSON.stringify(data, null, 2));
      const content = data.choices?.[0]?.message?.content || '';
      console.log('DeepSeek content:', content);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze transcript');
      }

      setCaptions(data.captions);
      // Auto-select all captions by default
      setSelectedCaptions(new Set(data.captions.map((_: CaptionData, index: number) => index)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCaptionSelection = (index: number) => {
    const newSelected = new Set(selectedCaptions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCaptions(newSelected);
  };

  const selectAllCaptions = () => {
    setSelectedCaptions(new Set(captions.map((_: CaptionData, index: number) => index)));
  };

  const deselectAllCaptions = () => {
    setSelectedCaptions(new Set());
  };

  const generateGifs = async () => {
    if (captions.length === 0) {
      setError('No captions available. Please analyze the transcript first.');
      return;
    }

    if (selectedCaptions.size === 0) {
      setError('Please select at least one caption to generate GIFs.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Only generate GIFs for selected captions
      const selectedCaptionData = captions.filter((_: CaptionData, index: number) => selectedCaptions.has(index));
      
      const response = await fetch('/api/gif/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          captions: selectedCaptionData,
          prompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate GIFs');
      }

      setGeneratedGifs(data.gifs);
      onGifsGenerated?.(data.gifs);
      
      // Show success message
      console.log(`Successfully generated ${data.gifs.length} GIFs`);
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
      a.href = url;
      a.download = `gif-${caption.substring(0, 20)}.gif`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download GIF');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-white rounded-lg shadow-md">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-2">AI-Powered GIF Generator</h3>
        <p className="text-gray-600 text-xs sm:text-sm mb-4">
          Enter a theme or prompt to generate captioned GIFs from your video
        </p>
      </div>

      {/* Prompt Input */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
          Theme/Prompt
        </label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Stay motivated, Crush your goals, Never give up"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-base"
          disabled={isAnalyzing || isGenerating}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button
          onClick={analyzeTranscript}
          disabled={isAnalyzing || isGenerating || !prompt.trim()}
          className="flex-1 text-xs sm:text-base"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Transcript'}
        </Button>
        
        <Button
          onClick={generateGifs}
          disabled={isGenerating || selectedCaptions.size === 0}
          className="flex-1 text-xs sm:text-base"
        >
          {isGenerating 
            ? 'Generating GIFs...' 
            : 'Generate GIFs'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Captions Preview */}
      {captions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700">
              Found Captions ({selectedCaptions.size}/{captions.length} selected):
            </h4>
            <div className="flex gap-2">
              <Button
                onClick={selectAllCaptions}
                size="sm"
                variant="default"
                className="text-xs"
              >
                Select All
              </Button>
              <Button
                onClick={deselectAllCaptions}
                size="sm"
                variant="default"
                className="text-xs"
              >
                Deselect All
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {captions.map((caption, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-md border-2 cursor-pointer transition-all ${
                  selectedCaptions.has(index)
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleCaptionSelection(index)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedCaptions.has(index)}
                    onChange={() => toggleCaptionSelection(index)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{caption.text}</p>
                    <p className="text-sm text-gray-600">
                      {caption.startTime}s - {caption.endTime}s (Duration: {caption.endTime - caption.startTime}s)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{caption.reason}</p>
                    {(caption.reason === 'Raw DeepSeek output' || caption.reason === 'Raw Gemini output') && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-blue-600">Show Raw Output</summary>
                        <pre className="bg-gray-100 p-2 rounded text-xs text-gray-700 mt-2 whitespace-pre-wrap">
                          {caption.text}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated GIFs */}
      {generatedGifs.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Generated GIFs:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedGifs.map((gif) => (
              <div key={gif.id} className="border rounded-lg overflow-hidden">
                <img
                  src={gif.url}
                  alt={gif.caption}
                  className="w-full h-48 object-cover"
                />
                <div className="p-3">
                  <p className="text-sm font-medium mb-2">{gif.caption}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    {gif.startTime}s - {gif.endTime}s
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
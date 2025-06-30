"use client"

import { useState } from 'react'
import { Play, Brain } from 'lucide-react'
import VideoPreview from '@/components/VideoPreview'
import Header from "@/components/Header"
import RequireAuth from "@/components/RequireAuth"
import { useSession } from "next-auth/react"
import { AiGifGenerator } from '@/components/AiGifGenerator'
import { TranscriptViewer } from '@/components/TranscriptViewer'
import VideoSelector from '@/components/VideoSelector'
import GifPreviewSelector from '@/components/GifPreviewSelector'

interface VideoData {
  id: string;
  title: string;
  url: string;
  status: string;
  transcript?: {
    fullText: string;
  };
}

export default function Home() {
  const { status } = useSession()
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null)
  const [generatedGifs, setGeneratedGifs] = useState<any[]>([])

  const handleVideoSelect = (video: VideoData) => {
    setSelectedVideo(video);
    setGeneratedGifs([]); // Clear previous GIFs when switching videos
  }

  const handleGifsGenerated = (gifs: any[]) => {
    setGeneratedGifs(gifs);
  }

  if ((status as string) === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-xl font-semibold text-blue-700">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {status !== "loading" && <Header />}
      <RequireAuth>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Video Selection & Controls */}
            <div className="space-y-6">
              {/* Download YouTube Video Button */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-4 flex flex-col items-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Download YouTube Video</h3>
                <p className="text-gray-600 mb-4 text-center text-sm">
                  Use the button below to download a YouTube video via SaveFrom.net, then upload the file here to generate AI-powered GIFs.
                </p>
                <a
                  href="https://ssyoutube.com/en800oX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-red-500 to-red-700 shadow-lg px-6 py-4 text-white font-bold text-lg hover:from-red-600 hover:to-red-800 transition-all duration-200 mb-2"
                >
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="48" rx="12" fill="#FF0000"/>
                    <path d="M34.5 24.5L20.5 32.5V16.5L34.5 24.5Z" fill="white"/>
                  </svg>
                  <span>Download from YouTube</span>
                </a>
              </div>

              {/* Video Selector */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                <VideoSelector 
                  onVideoSelect={handleVideoSelect}
                  selectedVideoId={selectedVideo?.id}
                />
              </div>

              {selectedVideo && (
                <>
                  {/* Video Preview */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Play className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Video Preview</h3>
                    </div>
                    <VideoPreview file={null} videoUrl={selectedVideo.url} />
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Status:</strong> {selectedVideo.status || 'Uploaded successfully'}
                      </p>
                      {selectedVideo.transcript && (
                        <p className="text-sm text-blue-700 mt-1">
                          <strong>Transcript:</strong> Available ({selectedVideo.transcript.fullText.length} characters)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Transcript Viewer */}
                  {selectedVideo.transcript ? (
                    <TranscriptViewer 
                      transcript={selectedVideo.transcript.fullText}
                      title="Video Transcript"
                    />
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-yellow-900">Transcript Not Available</h3>
                          <p className="text-yellow-700">Transcript generation failed or is not available for this video.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Column - Generated GIFs */}
            <div className="space-y-6">
              {selectedVideo && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Brain className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">AI-Powered GIF Generator</h3>
                  </div>
                  <AiGifGenerator 
                    videoId={selectedVideo.id} 
                    onGifsGenerated={handleGifsGenerated}
                  />
                </div>
              )}

              {generatedGifs.length > 0 && (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                  <GifPreviewSelector 
                    gifs={generatedGifs}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </RequireAuth>
    </div>
  )
}
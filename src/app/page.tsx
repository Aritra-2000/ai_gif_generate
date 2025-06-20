"use client"

import { useState, useEffect } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { Sparkles, RotateCcw, Video, Upload, Play, Settings, Download, History, LogOut } from 'lucide-react'
import GifActions from '@/components/GifActions'
import GifSettings from '@/components/GifSettings'
import VideoUpload from '@/components/VideoUpload'
import VideoPreview from '@/components/VideoPreview'
import GifPreviewSettings from '@/components/GifPreviewSettings'
import GifPreview from '@/components/GifPreview'
import LoadingState from '@/components/LoadingState'
import Header from "@/components/Header"
import RequireAuth from "@/components/RequireAuth"
import { useSession } from "next-auth/react"

export default function Home() {
  const { status } = useSession()
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [gifBlob, setGifBlob] = useState<Blob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null)
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false)
  const [settings, setSettings] = useState({
    duration: 5,
    quality: 10,
    fps: 15,
    text: '',
    textColor: '#ffffff',
    fontSize: 24,
    filter: 'none',
    startTime: 0,
  })

  type SettingsType = {
    duration: number
    quality: number
    fps: number
    text?: string
    textColor?: string
    fontSize?: number
    filter?: string
  }

  const handleVideoUpload = (file: File): void => {
    setVideoFile(file);
    setGifBlob(null);
    setError(null);
    setProgress(0);
  }

  const handleSettingsChange = (newSettings: SettingsType) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
    }));
  }

  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpegInstance = new FFmpeg()
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
        
        await ffmpegInstance.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })
        
        setFfmpeg(ffmpegInstance)
        setIsFFmpegLoaded(true)
      } catch (error) {
        console.error('Failed to load FFmpeg:', error)
        setError('Failed to load FFmpeg. Please refresh the page.')
      }
    }

    loadFFmpeg()
  }, [])

  const escapeFfmpegText = (text: string) => {
    // Escape for FFmpeg drawtext
    return text.replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
  };

  const handleGenerateGif = async () => {
    if (!videoFile) {
      setError("Please upload a video first")
      return
    }
    if (!isFFmpegLoaded || !ffmpeg) {
      setError("FFmpeg is not initialized. Please wait or refresh the page.")
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgress(0)

    try {
      // Don't terminate and reload FFmpeg unnecessarily - it's already loaded
      // Just clear any existing files
      try {
        await ffmpeg.deleteFile('input.mp4')
        await ffmpeg.deleteFile('output.gif')
      } catch (e) {
        // Files might not exist, that's fine
      }

      // Set up progress handler
      ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.round(progress * 100)
        setProgress(percent)
      })

      // Write the input file
      const inputFileName = 'input.mp4'
      await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile))

      // Build the filter chain
      let vf = `fps=${settings.fps},scale=320:-1:flags=lanczos`;
      if (settings.text && settings.text.trim()) {
        const caption = escapeFfmpegText(settings.text.trim());
        const fontcolor = settings.textColor || '#ffffff';
        const fontsize = settings.fontSize || 24;
        vf += `,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${caption}':fontcolor=${fontcolor}:fontsize=${fontsize}:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-(text_h*2)`;
      }
      vf += ",split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=single[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle";

      // Generate GIF with optimized settings and caption overlay
      const outputFileName = 'output.gif'
      await ffmpeg.exec([
        '-ss', settings.startTime.toString(),
        '-i', inputFileName,
        '-vf', vf,
        '-t', settings.duration.toString(),
        '-f', 'gif',
        outputFileName
      ])

      // Read the output file
      const data = await ffmpeg.readFile(outputFileName)
      const gif = new Blob([data], { type: 'image/gif' })
      setGifBlob(gif)
    } catch (error) {
      if (error instanceof Error) {
        setError(`Error: ${error.message}`)
      } else {
        setError("Failed to generate GIF. Please try again.")
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadGif = () => {
    if (!gifBlob) {
      setError("No GIF available to download")
      return
    }

    try {
      const url = URL.createObjectURL(gifBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gif-${Date.now()}.gif`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading GIF:", error)
      setError("Failed to download GIF. Please try again.")
    }
  }

  const handleCopyGif = () => {
    // Implementation of handleCopyGif
  }

  const handleShareGif = () => {
    // Implementation of handleShareGif
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
            {/* Left Column - Controls */}
            <div className="space-y-6">
              {/* Download YouTube Video Button */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-4 flex flex-col items-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Download YouTube Video</h3>
                <p className="text-gray-600 mb-4 text-center text-sm">
                  Use the button below to download a YouTube video via SaveFrom.net, then upload the file here to generate a GIF.
                </p>
                <a
                  href="https://en1.savefrom.net/13RZ/"
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
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Upload Video</h3>
                </div>
                <VideoUpload onUpload={handleVideoUpload} />
              </div>

              {videoFile && (
                <>
                  {/* Video Preview */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Play className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Video Preview</h3>
                    </div>
                    <VideoPreview file={videoFile} />
                  </div>

                  {/* Settings Section */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Settings className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">GIF Settings</h3>
                    </div>
                    <GifSettings onSettingsChange={handleSettingsChange} />
                  </div>

                  {/* Preview Settings */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Preview Settings</h3>
                    </div>
                    <GifPreviewSettings
                      videoFile={videoFile}
                      settings={{
                        fps: settings.fps,
                        startTime: 0,
                        endTime: settings.duration,
                      }}
                    />
                  </div>

                  {/* Generate Button */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
                    <button
                      onClick={handleGenerateGif}
                      disabled={isGenerating || !videoFile}
                      className="w-full rounded-xl bg-white/20 backdrop-blur-sm px-6 py-4 text-white font-semibold hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isGenerating ? (
                        <span className="flex items-center justify-center space-x-3">
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span>Generating Magic... {progress}%</span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center space-x-3">
                          <Sparkles className="w-5 h-5" />
                          <span>{videoFile ? "Generate GIF" : "Upload a video first"}</span>
                        </span>
                      )}
                    </button>

                    {isGenerating && (
                      <div className="mt-6">
                        <LoadingState progress={progress} message="Creating your GIF..." />
                      </div>
                    )}

                    {error && (
                      <div className="mt-6 p-4 text-sm bg-red-500/20 backdrop-blur-sm border border-red-300/30 rounded-xl text-white">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-red-400 rounded-full flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
              {gifBlob ? (
                <>
                  {/* GIF Preview */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Your GIF</h3>
                    </div>
                    <GifPreview blob={gifBlob} />
                  </div>

                  {/* GIF Actions */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Download className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
                    </div>
                    <GifActions
                      blob={gifBlob}
                      onDownload={handleDownloadGif}
                      onCopy={handleCopyGif}
                      onShare={handleShareGif}
                    />
                  </div>
                </>
              ) : (
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">GIF Preview</h3>
                  <p className="text-gray-500">Your generated GIF will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center space-x-2 text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">Made with love for creators</span>
            </div>
          </div>
        </main>
      </RequireAuth>
    </div>
  )
}
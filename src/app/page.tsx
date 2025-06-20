"use client"

import { useState, useEffect } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { Sparkles, RotateCcw, Video, Upload, Play, Settings, Download, History } from 'lucide-react'
import GifActions from '@/components/GifActions'
import GifSettings from '@/components/GifSettings'
import VideoUpload from '@/components/VideoUpload'
import VideoPreview from '@/components/VideoPreview'
import GifPreviewSettings from '@/components/GifPreviewSettings'
import GifPreview from '@/components/GifPreview'
import GifHistory from '@/components/GifHistory'
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
    console.log('Video uploaded:', file.name)
    setVideoFile(file)
    setGifBlob(null)
    setError(null)
    setProgress(0)
  }

  const handleSettingsChange = (newSettings: SettingsType) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
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

  // Also fix your handleGenerateGif function - remove the workerURL there too
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
        console.log(`Progress: ${percent}%`)
        setProgress(percent)
      })

      // Write the input file
      const inputFileName = 'input.mp4'
      await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile))
      console.log('Input file written successfully')

      // Generate GIF with optimized settings
      const outputFileName = 'output.gif'
      await ffmpeg.exec([
        '-i', inputFileName,
        '-vf', `fps=${settings.fps},scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=single[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
        '-t', settings.duration.toString(),
        '-f', 'gif',
        outputFileName
      ])
      console.log('GIF conversion completed')

      // Read the output file
      const data = await ffmpeg.readFile(outputFileName)
      const gif = new Blob([data], { type: 'image/gif' })
      setGifBlob(gif)
      console.log('GIF created successfully')

    } catch (error) {
      console.error("Error generating GIF:", error)
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

  const handleCopyGif = async () => {
    if (!gifBlob) {
      setError("No GIF available to copy")
      return
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/gif': gifBlob
        })
      ])
      console.log('GIF copied to clipboard')
    } catch (error) {
      console.error("Error copying GIF:", error)
      setError("Failed to copy GIF. Please try again.")
    }
  }

  const handleShareGif = async () => {
    if (!gifBlob) {
      setError("No GIF available to share")
      return
    }

    try {
      const file = new File([gifBlob], `gif-${Date.now()}.gif`, { type: 'image/gif' })
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'My Generated GIF',
        })
        console.log('GIF shared successfully')
      } else {
        setError("Sharing is not supported on this browser")
      }
    } catch (error) {
      console.error("Error sharing GIF:", error)
      setError("Failed to share GIF. Please try again.")
    }
  }

  const handleSelectGif = (gif: Blob) => {
    setGifBlob(gif)
  }

  const handleSaveGif = (gif: Blob) => {
    setGifBlob(gif)
  }

  const resetAll = () => {
    setVideoFile(null)
    setGifBlob(null)
    setError(null)
    setProgress(0)
    setSettings({
      duration: 5,
      quality: 10,
      fps: 15,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {status !== "loading" && <Header />}
      <RequireAuth>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Controls */}
            <div className="space-y-6">
              {/* Upload Section */}
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
                      <div className="ml-auto">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ready
                        </span>
                      </div>
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

              {/* History Section */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <History className="w-5 h-5 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent GIFs</h3>
                </div>
                <GifHistory onSelectGif={handleSelectGif} />
              </div>
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

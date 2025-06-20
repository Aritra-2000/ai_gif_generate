import { useEffect, useRef, useState } from "react"

interface GifPreviewSettingsProps {
  videoFile: File
  settings: {
    fps: number
    startTime: number
    endTime: number
  }
}

export default function GifPreviewSettings({ videoFile, settings }: GifPreviewSettingsProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const startPlayback = async () => {
      try {
        video.currentTime = settings.startTime
        await video.play()
        setIsPlaying(true)
      } catch (error) {
        console.error('Autoplay failed:', error)
        setIsPlaying(false)
      }
    }

    startPlayback()

    const handleTimeUpdate = () => {
      if (video.currentTime >= settings.endTime) {
        video.currentTime = settings.startTime
        if (isPlaying) {
          video.play()
        }
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.pause()
    }
  }, [settings.endTime, settings.startTime, isPlaying])

  const handlePlay = async () => {
    if (!videoRef.current) return

    try {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        await videoRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('Playback failed:', error)
      setIsPlaying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          src={URL.createObjectURL(videoFile)}
          className="w-full h-full object-contain"
          loop
          muted
          playsInline
          autoPlay
        />
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
        >
          {isPlaying ? (
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <div className="w-6 h-6 border-4 border-white rounded-full" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
            </div>
          )}
        </button>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>FPS: {settings.fps}</span>
        <span>Duration: {(settings.endTime - settings.startTime).toFixed(1)}s</span>
      </div>
    </div>
  )
} 
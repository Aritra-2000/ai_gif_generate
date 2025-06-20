import { useEffect, useRef, useState } from 'react'

interface VideoTrimmerProps {
  file: File
  onTrimChange: (start: number, end: number) => void
}

export default function VideoTrimmer({ file, onTrimChange }: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (videoRef.current) {
      const videoUrl = URL.createObjectURL(file)
      videoRef.current.src = videoUrl

      videoRef.current.addEventListener('loadedmetadata', () => {
        const videoDuration = videoRef.current?.duration || 0
        setDuration(videoDuration)
        setEndTime(videoDuration)
      })

      return () => {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [file])

  useEffect(() => {
    onTrimChange(startTime, endTime)
  }, [startTime, endTime, onTrimChange])

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = Number(e.target.value)
    if (newStart < endTime) {
      setStartTime(newStart)
    }
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = Number(e.target.value)
    if (newEnd > startTime) {
      setEndTime(newEnd)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Trim Video</h3>
      
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls
          playsInline
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>{formatTime(startTime)}</span>
          <span>{formatTime(endTime)}</span>
        </div>

        <div className="flex items-center space-x-4">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={startTime}
            onChange={handleStartChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={endTime}
            onChange={handleEndChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
} 
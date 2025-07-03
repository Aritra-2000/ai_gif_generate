import React, { useState, useEffect, useRef } from 'react'
import { Scissors, Download, Play, Pause } from 'lucide-react'

interface VideoPreviewProps {
  file?: File | null
  videoUrl?: string
}

export default function VideoPreview({ file, videoUrl }: VideoPreviewProps) {
  const [url, setUrl] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [showTrimControls, setShowTrimControls] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    console.log('VideoPreview useEffect triggered:', { file, videoUrl })
    
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setUrl(objectUrl)
      setError(null)
      setIsLoading(true)
      console.log('Using file object URL:', objectUrl)

      return () => {
        URL.revokeObjectURL(objectUrl)
      }
    } else if (videoUrl) {
      // Handle different URL formats
      let processedUrl = videoUrl
      
      // If it's a relative path (starts with /), make it absolute
      if (videoUrl.startsWith('/')) {
        processedUrl = `${window.location.origin}${videoUrl}`
      }
      
      // If it's a Cloudinary URL, use f_mp4 transformation for compatibility
      if (videoUrl.includes('res.cloudinary.com') && videoUrl.includes('/upload/')) {
        processedUrl = videoUrl.replace('/upload/', '/upload/f_mp4/')
      }
      
      // If it's a local file path, we need to convert it to a proper URL
      
      console.log('Original Video URL:', videoUrl)
      console.log('Processed Video URL:', processedUrl)
      console.log('Window location origin:', window.location.origin)
      
      setUrl(processedUrl)
      setError(null)
      setIsLoading(true)
      
      // Set a timeout to detect if video fails to load
      const timeout = setTimeout(() => {
        console.log('Video load timeout - checking if video loaded')
        setIsLoading(false)
      }, 10000); // 10 second timeout
      
      setLoadTimeout(timeout)
    } else {
      setUrl('')
      setError(null)
      setIsLoading(false)
    }
  }, [file, videoUrl])

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = e.currentTarget;
    console.error('Video playback error:', {
      error: videoElement.error,
      networkState: videoElement.networkState,
      readyState: videoElement.readyState,
      src: videoElement.src
    })
    
    let errorMessage = 'Failed to load video.'
    
    if (videoElement.error) {
      switch (videoElement.error.code) {
        case 1:
          errorMessage = 'Video loading was aborted.'
          break
        case 2:
          errorMessage = 'Network error while loading video.'
          break
        case 3:
          errorMessage = 'Video decoding failed.'
          break
        case 4:
          errorMessage = 'Video format not supported.'
          break
        default:
          errorMessage = 'Unknown video error occurred.'
      }
    }
    
    setError(errorMessage)
    setIsLoading(false)
    
    // Clear timeout
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      setLoadTimeout(null)
    }
  }

  const handleVideoLoad = () => {
    console.log('Video loaded successfully:', url)
    setError(null)
    setIsLoading(false)
    
    // Clear timeout
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      setLoadTimeout(null)
    }
  }

  const handleVideoCanPlay = () => {
    console.log('Video can start playing:', url)
    setIsLoading(false)
    
    // Clear timeout
    if (loadTimeout) {
      clearTimeout(loadTimeout)
      setLoadTimeout(null)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const video = videoRef.current
      setDuration(video.duration)
      setTrimEnd(video.duration)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleDownload = () => {
    if (url) {
      const link = document.createElement('a')
      link.href = url
      link.download = file?.name || 'video.mp4'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleTrim = () => {
    setShowTrimControls(!showTrimControls)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleTrimStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setTrimStart(value)
    if (videoRef.current) {
      videoRef.current.currentTime = value
    }
  }

  const handleTrimEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setTrimEnd(value)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout)
      }
    }
  }, [loadTimeout])

  if (!url) {
    return (
      <div className="relative aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No video selected</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="relative aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading video...</p>
          <p className="text-xs text-gray-400 mt-1">URL: {url.substring(0, 50)}...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative aspect-video bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
        <div className="text-center">
          <p className="text-red-600 font-medium">Video Error</p>
          <p className="text-red-500 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-2">URL: {url.substring(0, 50)}...</p>
          <button 
            onClick={() => {
              setError(null)
              setIsLoading(true)
              // Retry loading
              const videoElement = document.querySelector('video') as HTMLVideoElement
              if (videoElement) {
                videoElement.load()
              }
            }}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={url}
          controls
          className="w-full h-full object-contain"
          onError={handleVideoError}
          onLoadedData={handleVideoLoad}
          onCanPlay={handleVideoCanPlay}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
        />
        
        {/* Video Controls Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center space-x-2">
          <button
            onClick={handlePlayPause}
            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={handleDownload}
            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            title="Download Video"
          >
            <Download size={16} />
          </button>
          <button
            onClick={handleTrim}
            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            title="Trim Video"
          >
            <Scissors size={16} />
          </button>
        </div>
      </div>

      {/* Trim Controls */}
      {showTrimControls && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 space-y-4">
          <h4 className="font-semibold text-gray-900">Trim Video</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Start: {formatTime(trimStart)}</span>
              <span>End: {formatTime(trimEnd)}</span>
              <span>Duration: {formatTime(trimEnd - trimStart)}</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time: {formatTime(trimStart)}
                </label>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={trimStart}
                  onChange={handleTrimStartChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time: {formatTime(trimEnd)}
                </label>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={trimEnd}
                  onChange={handleTrimEndChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = trimStart
                    videoRef.current.play()
                  }
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Preview Trim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
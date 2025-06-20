import { useEffect, useRef } from 'react'

interface TextPreviewProps {
  videoFile: File
  text: string
  textColor: string
  fontSize: number
}

export default function TextPreview({ videoFile, text, textColor, fontSize }: TextPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const videoUrl = URL.createObjectURL(videoFile)
    video.src = videoUrl

    const drawText = () => {
      if (!ctx || !video) return

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Draw text
      if (text) {
        ctx.font = `${fontSize}px Arial`
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        
        const x = canvas.width / 2
        const y = canvas.height - 20 // 20px from bottom
        
        ctx.fillText(text, x, y)
      }
    }

    video.addEventListener('play', () => {
      const drawFrame = () => {
        drawText()
        if (!video.paused && !video.ended) {
          requestAnimationFrame(drawFrame)
        }
      }
      drawFrame()
    })

    return () => {
      URL.revokeObjectURL(videoUrl)
    }
  }, [videoFile, text, textColor, fontSize])

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="hidden"
        muted
        playsInline
        autoPlay
        loop
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
      />
    </div>
  )
} 
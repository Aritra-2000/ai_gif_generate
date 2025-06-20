import React, { useState, useEffect } from 'react'

interface VideoPreviewProps {
  file: File
}

export default function VideoPreview({ file }: VideoPreviewProps) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video
        src={url}
        controls
        className="w-full h-full"
      />
    </div>
  )
} 
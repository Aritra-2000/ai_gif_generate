import React, { useState, useEffect } from 'react'

interface GifPreviewProps {
  blob: Blob
}

export default function GifPreview({ blob }: GifPreviewProps) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <img
          src={url}
          alt="Generated GIF"
          className="w-full h-full object-contain"
        />
      </div>
      <a
        href={url}
        download="generated.gif"
        className="block w-full text-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Download GIF
      </a>
    </div>
  )
} 
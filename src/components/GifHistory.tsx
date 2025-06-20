import { useState, useEffect } from 'react'

interface SavedGif {
  id: string
  blob: Blob
  timestamp: number
  settings: {
    fps: number
    duration: number
    quality: number
  }
}

interface StoredGif {
  id: string
  blob: string // base64 string
  timestamp: number
  settings: {
    fps: number
    duration: number
    quality: number
  }
}

interface GifHistoryProps {
  onSelectGif: (gif: Blob) => void
}

export default function GifHistory({ onSelectGif }: GifHistoryProps) {
  const [savedGifs, setSavedGifs] = useState<SavedGif[]>([])

  useEffect(() => {
    // Load saved GIFs from localStorage
    const loadSavedGifs = () => {
      const saved = localStorage.getItem('savedGifs')
      if (saved) {
        const parsed = JSON.parse(saved) as StoredGif[]
        // Convert base64 strings back to Blobs
        const gifs = parsed.map(gif => ({
          ...gif,
          blob: new Blob([Uint8Array.from(atob(gif.blob), c => c.charCodeAt(0))], { type: 'image/gif' })
        }))
        setSavedGifs(gifs)
      }
    }
    loadSavedGifs()
  }, [])

  const saveGif = (blob: Blob, settings: { fps: number; duration: number; quality: number }) => {
    const newGif: SavedGif = {
      id: Date.now().toString(),
      blob,
      timestamp: Date.now(),
      settings
    }

    // Convert Blob to base64 for storage
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onloadend = () => {
      const base64data = reader.result as string
      const base64Blob = base64data.split(',')[1]
      
      const gifToSave: StoredGif = {
        ...newGif,
        blob: base64Blob
      }

      const updatedGifs = [...savedGifs, newGif]
      setSavedGifs(updatedGifs)
      localStorage.setItem('savedGifs', JSON.stringify([...JSON.parse(localStorage.getItem('savedGifs') || '[]'), gifToSave]))
    }
  }

  const deleteGif = (id: string) => {
    const updatedGifs = savedGifs.filter(gif => gif.id !== id)
    setSavedGifs(updatedGifs)
    const storedGifs = JSON.parse(localStorage.getItem('savedGifs') || '[]') as StoredGif[]
    localStorage.setItem('savedGifs', JSON.stringify(storedGifs.filter(gif => gif.id !== id)))
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="text-center text-gray-500">
      <p>No recent GIFs</p>
    </div>
  )
} 
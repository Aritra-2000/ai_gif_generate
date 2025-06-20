import { Download, Share2, Copy } from "lucide-react"

interface GifActionsProps {
  blob: Blob
  onDownload: () => void
  onCopy: () => void
  onShare: () => void
}

export default function GifActions({ blob, onDownload, onCopy, onShare }: GifActionsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <button
        onClick={onDownload}
        className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
      >
        <Download className="w-6 h-6 mb-2" />
        <span className="text-sm font-medium">Download GIF</span>
      </button>

      <button
        onClick={onCopy}
        className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
      >
        <Copy className="w-6 h-6 mb-2" />
        <span className="text-sm font-medium">Copy</span>
      </button>

      <button
        onClick={onShare}
        className="flex flex-col items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
      >
        <Share2 className="w-6 h-6 mb-2" />
        <span className="text-sm font-medium">Share</span>
      </button>
    </div>
  )
} 
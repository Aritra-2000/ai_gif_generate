import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const SUPPORTED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

interface VideoUploadProps {
  onUpload: (file: File) => void
}

export default function VideoUpload({ onUpload }: VideoUploadProps) {
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    setError(null)

    if (!file) return

    if (!SUPPORTED_FORMATS.includes(file.type)) {
      setError('Please upload a supported video format (MP4, MOV, AVI, or WebM)')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Video file size must be less than 100MB')
      return
    }

    onUpload(file)
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="flex justify-center">
            <svg
              className={`w-12 h-12 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="text-gray-600">
            {isDragActive ? (
              <p className="text-blue-500 font-medium">Drop your video here</p>
            ) : (
              <>
                <p className="font-medium">Drag and drop your video here</p>
                <p className="text-sm mt-1">or click to select a file</p>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Supported formats: MP4, MOV, AVI, WebM (max 100MB)
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
    </div>
  )
} 
interface ProgressProps {
  progress: number
  message: string
}

export default function Progress({ progress, message }: ProgressProps) {
  return (
    <div className="space-y-2">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-gray-600 text-center">{message}</p>
    </div>
  )
} 
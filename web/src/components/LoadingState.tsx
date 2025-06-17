interface LoadingStateProps {
  progress: number
  message?: string
}

export default function LoadingState({ progress, message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="space-y-4">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-white/80">{message}</p>
    </div>
  )
} 
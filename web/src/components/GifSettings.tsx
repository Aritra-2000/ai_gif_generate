import { useState } from 'react'
import AdvancedSettings from './AdvancedSettings'

interface GifSettingsProps {
  onSettingsChange: (settings: {
    duration: number
    quality: number
    fps: number
    text?: string
    textColor?: string
    fontSize?: number
    filter?: string
  }) => void
}

export default function GifSettings({ onSettingsChange }: GifSettingsProps) {
  const [duration, setDuration] = useState(5)
  const [quality, setQuality] = useState(10)
  const [fps, setFps] = useState(15)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advancedSettings, setAdvancedSettings] = useState({
    text: '',
    textColor: '#ffffff',
    fontSize: 24,
    filter: 'none'
  })

  const handleBasicSettingsChange = () => {
    onSettingsChange({
      duration,
      quality,
      fps,
      ...(showAdvanced ? advancedSettings : {})
    })
  }

  const handleAdvancedSettingsChange = (settings: typeof advancedSettings) => {
    setAdvancedSettings(settings)
    onSettingsChange({
      duration,
      quality,
      fps,
      ...settings
    })
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900">GIF Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Duration (seconds)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={duration}
            onChange={(e) => {
              setDuration(Number(e.target.value))
              handleBasicSettingsChange()
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-gray-500">{duration}s</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Quality (1-10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={quality}
            onChange={(e) => {
              setQuality(Number(e.target.value))
              handleBasicSettingsChange()
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-gray-500">{quality}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            FPS (frames per second)
          </label>
          <input
            type="range"
            min="5"
            max="30"
            value={fps}
            onChange={(e) => {
              setFps(Number(e.target.value))
              handleBasicSettingsChange()
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-gray-500">{fps} fps</span>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
        </button>

        {showAdvanced && (
          <AdvancedSettings
            settings={advancedSettings}
            onSettingsChange={handleAdvancedSettingsChange}
          />
        )}
      </div>
    </div>
  )
} 
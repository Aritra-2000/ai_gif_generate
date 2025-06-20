import { useState, useEffect } from 'react'

export interface FilterSettings {
  width: number
  height: number
  filter: 'none' | 'grayscale' | 'sepia' | 'invert' | 'blur'
  filterIntensity: number
}

interface GifFiltersProps {
  onSettingsChange: (settings: FilterSettings) => void
  initialSettings?: FilterSettings
}

const PRESET_SIZES = [
  { label: 'Small (320x180)', width: 320, height: 180 },
  { label: 'Medium (640x360)', width: 640, height: 360 },
  { label: 'Large (1280x720)', width: 1280, height: 720 }
]

export default function GifFilters({ onSettingsChange, initialSettings }: GifFiltersProps) {
  const [settings, setSettings] = useState<FilterSettings>(initialSettings || {
    width: 320,
    height: 180,
    filter: 'none',
    filterIntensity: 0
  })

  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [aspectRatio, setAspectRatio] = useState(16 / 9)

  useEffect(() => {
    onSettingsChange(settings)
  }, [settings, onSettingsChange])

  const handleSizeChange = (width: number, height: number) => {
    setSettings(prev => ({
      ...prev,
      width,
      height
    }))
  }

  const handleFilterChange = (filter: FilterSettings['filter']) => {
    setSettings(prev => ({
      ...prev,
      filter,
      filterIntensity: filter === 'none' ? 0 : prev.filterIntensity
    }))
  }

  const handleIntensityChange = (intensity: number) => {
    setSettings(prev => ({
      ...prev,
      filterIntensity: intensity
    }))
  }

  const handleCustomSizeChange = (dimension: 'width' | 'height', value: number) => {
    if (maintainAspectRatio) {
      if (dimension === 'width') {
        setSettings(prev => ({
          ...prev,
          width: value,
          height: Math.round(value / aspectRatio)
        }))
      } else {
        setSettings(prev => ({
          ...prev,
          height: value,
          width: Math.round(value * aspectRatio)
        }))
      }
    } else {
      setSettings(prev => ({
        ...prev,
        [dimension]: value
      }))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Output Size</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {PRESET_SIZES.map(preset => (
            <button
              key={preset.label}
              onClick={() => handleSizeChange(preset.width, preset.height)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                settings.width === preset.width && settings.height === preset.height
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="width" className="block text-sm font-medium text-gray-700">
              Width
            </label>
            <input
              type="number"
              id="width"
              value={settings.width}
              onChange={(e) => handleCustomSizeChange('width', parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="height" className="block text-sm font-medium text-gray-700">
              Height
            </label>
            <input
              type="number"
              id="height"
              value={settings.height}
              onChange={(e) => handleCustomSizeChange('height', parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={maintainAspectRatio}
              onChange={(e) => setMaintainAspectRatio(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Maintain aspect ratio</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Filters</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {(['none', 'grayscale', 'sepia', 'invert', 'blur'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                settings.filter === filter
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {settings.filter !== 'none' && (
          <div>
            <label htmlFor="intensity" className="block text-sm font-medium text-gray-700">
              Intensity
            </label>
            <input
              type="range"
              id="intensity"
              min="0"
              max="100"
              value={settings.filterIntensity}
              onChange={(e) => handleIntensityChange(parseInt(e.target.value))}
              className="mt-1 block w-full"
            />
            <div className="mt-1 text-sm text-gray-500">
              {settings.filterIntensity}%
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
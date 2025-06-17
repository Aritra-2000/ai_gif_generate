import { useState } from 'react'

interface AdvancedSettingsProps {
  settings: {
    text: string
    textColor: string
    fontSize: number
    filter: string
  }
  onSettingsChange: (settings: {
    text: string
    textColor: string
    fontSize: number
    filter: string
  }) => void
}

export default function AdvancedSettings({ settings, onSettingsChange }: AdvancedSettingsProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">Advanced Settings</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Caption Text
        </label>
        <input
          type="text"
          value={settings.text}
          onChange={(e) => onSettingsChange({ ...settings, text: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter caption text"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Text Color
        </label>
        <input
          type="color"
          value={settings.textColor}
          onChange={(e) => onSettingsChange({ ...settings, textColor: e.target.value })}
          className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Font Size
        </label>
        <input
          type="range"
          min="12"
          max="48"
          value={settings.fontSize}
          onChange={(e) => onSettingsChange({ ...settings, fontSize: Number(e.target.value) })}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm text-gray-500">{settings.fontSize}px</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Filter Effect
        </label>
        <select
          value={settings.filter}
          onChange={(e) => onSettingsChange({ ...settings, filter: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="none">None</option>
          <option value="grayscale">Grayscale</option>
          <option value="sepia">Sepia</option>
          <option value="invert">Invert</option>
          <option value="blur">Blur</option>
        </select>
      </div>
    </div>
  )
} 
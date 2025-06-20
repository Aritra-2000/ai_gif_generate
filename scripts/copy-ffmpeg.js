const fs = require('fs')
const path = require('path')

const ffmpegDir = path.join(__dirname, '../public/ffmpeg')
const nodeModulesDir = path.join(__dirname, '../node_modules/@ffmpeg/ffmpeg/dist')

// Create ffmpeg directory if it doesn't exist
if (!fs.existsSync(ffmpegDir)) {
  fs.mkdirSync(ffmpegDir, { recursive: true })
}

// Copy FFmpeg files
const files = [
  'ffmpeg-core.js',
  'ffmpeg-core.wasm',
  'ffmpeg-worker.js'
]

files.forEach(file => {
  const sourcePath = path.join(nodeModulesDir, file)
  const destPath = path.join(ffmpegDir, file)
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath)
    console.log(`Copied ${file} to public/ffmpeg/`)
  } else {
    console.error(`File not found: ${sourcePath}`)
  }
}) 
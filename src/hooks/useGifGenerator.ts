import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { FilterSettings } from '../components/GifFilters'

interface GifSettings {
  duration: number
  quality: number
  fps: number
  startTime: number
  endTime: number
  filters?: FilterSettings
}

export function useGifGenerator() {
  const generateGif = async (
    videoFile: File,
    settings: GifSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> => {
    const ffmpeg = new FFmpeg()
    
    await ffmpeg.load({
      coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
      workerURL: await toBlobURL('/ffmpeg/ffmpeg-worker.js', 'text/javascript'),
    })

    ffmpeg.on('progress', ({ progress }) => {
      if (onProgress) {
        onProgress(Math.round(progress * 100))
      }
    })

    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile))

    // Build filter string
    let filterString = `fps=${settings.fps}`

    // Add size scaling
    if (settings.filters) {
      filterString += `,scale=${settings.filters.width}:${settings.filters.height}:flags=lanczos`
    } else {
      filterString += ',scale=320:-1:flags=lanczos'
    }

    // Add filters if any
    if (settings.filters?.filter && settings.filters.filter !== 'none') {
      const intensity = settings.filters.filterIntensity / 100
      switch (settings.filters.filter) {
        case 'grayscale':
          filterString += `,hue=s=0:l=${1 - intensity}`
          break
        case 'sepia':
          filterString += `,colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0`
          break
        case 'invert':
          filterString += `,negate=${intensity}`
          break
        case 'blur':
          filterString += `,boxblur=${intensity * 10}`
          break
      }
    }

    filterString += ',split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=single[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle'

    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-ss', settings.startTime.toString(),
      '-t', (settings.endTime - settings.startTime).toString(),
      '-vf', filterString,
      '-quality', settings.quality.toString(),
      'output.gif'
    ])

    const data = await ffmpeg.readFile('output.gif')
    return new Blob([data], { type: 'image/gif' })
  }

  return { generateGif }
} 
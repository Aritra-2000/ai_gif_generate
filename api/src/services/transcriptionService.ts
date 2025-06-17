import { PrismaClient } from '@prisma/client'
import { HTTPException } from 'hono/http-exception'
import fs from 'fs'
import { promisify } from 'util'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { exec } from 'child_process'
import { google } from 'googleapis'
import OpenAI from 'openai'

const prisma = new PrismaClient()
const execAsync = promisify(exec)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize YouTube API
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
})

interface TranscriptSegment {
  start: number
  end: number
  text: string
}

interface TranscriptionResult {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export const transcriptionService = {
  // Get transcript for a video
  async getTranscript(videoId: string): Promise<TranscriptSegment[]> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { transcript: true }
    })

    if (!video?.transcript) {
      throw new HTTPException(404, { message: 'Transcript not found' })
    }

    return video.transcript as unknown as TranscriptSegment[]
  },

  // Check if URL is a YouTube video
  isYoutubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    return youtubeRegex.test(url)
  },

  // Get transcript from YouTube video
  async getYoutubeTranscript(url: string): Promise<TranscriptSegment[]> {
    try {
      // Extract video ID from URL
      const videoId = this.extractYoutubeId(url)
      if (!videoId) {
        throw new Error('Invalid YouTube URL')
      }

      // Get captions using YouTube API
      const captions = await youtube.captions.list({
        part: ['snippet'],
        videoId,
      })

      // Get the first available caption track
      const captionTrack = captions.data.items?.[0]
      if (!captionTrack?.id) {
        throw new Error('No captions found for this video')
      }

      // Download and parse captions
      const transcript = await youtube.captions.download({
        id: captionTrack.id,
        tfmt: 'srt',
      })

      if (typeof transcript.data !== 'string') {
        throw new Error('Invalid transcript data received')
      }

      return this.parseSrtTranscript(transcript.data)
    } catch (error) {
      console.error('Error getting YouTube transcript:', error)
      throw error
    }
  },

  // Get transcript using OpenAI Whisper
  async getWhisperTranscript(url: string): Promise<TranscriptSegment[]> {
    try {
      // Download video
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`)
      }
      
      const videoBuffer = await response.arrayBuffer()

      // Create a File object for Whisper API
      const file = new File([new Blob([videoBuffer])], 'video.mp4', { type: 'video/mp4' })

      // Transcribe using Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'verbose_json',
      })

      if (!transcription.segments) {
        throw new Error('No segments found in transcription response');
      }

      return transcription.segments.map(segment => ({
        start: segment.start,
        end: segment.end,
        text: segment.text,
      }))
    } catch (error) {
      console.error('Error getting Whisper transcript:', error)
      throw error
    }
  },

  // Extract YouTube video ID from URL
  extractYoutubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }

    return null
  },

  // Parse SRT format transcript
  parseSrtTranscript(srt: string): TranscriptSegment[] {
    const segments = srt.split('\n\n')
    return segments
      .filter(segment => segment.trim())
      .map(segment => {
        const lines = segment.split('\n')
        if (lines.length < 3) return null
        
        const [, time, ...textLines] = lines
        if (!time || !time.includes(' --> ')) return null
        
        const [startTime, endTime] = time.split(' --> ')
        const start = this.srtTimeToSeconds(startTime.trim())
        const end = this.srtTimeToSeconds(endTime.trim())
        
        return {
          start,
          end,
          text: textLines.join(' ').trim(),
        }
      })
      .filter((segment): segment is TranscriptSegment => segment !== null)
  },

  // Convert SRT time format to seconds
  srtTimeToSeconds(time: string): number {
    // Handle format like "00:01:23,456" or "00:01:23.456"
    const cleanTime = time.replace(',', '.')
    const parts = cleanTime.split(':')
    
    if (parts.length !== 3) return 0
    
    const hours = parseInt(parts[0], 10) || 0
    const minutes = parseInt(parts[1], 10) || 0
    const seconds = parseFloat(parts[2]) || 0
    
    return hours * 3600 + minutes * 60 + seconds
  },

  async transcribeVideo(videoId: string, filepath: string): Promise<TranscriptSegment[]> {
    try {
      // Check if file exists
      if (!fs.existsSync(filepath)) {
        throw new Error('Video file not found')
      }

      // Extract audio from video
      const audioPath = filepath.replace(/\.[^/.]+$/, '.wav');
      await this.extractAudio(filepath, audioPath);

      // Get video duration
      const duration = await this.getVideoDuration(filepath);

      // Create basic transcript segments based on video duration
      // We'll split the video into 10-second segments
      const segments: TranscriptSegment[] = [];
      const segmentDuration = 10; // 10 seconds per segment
      const numSegments = Math.ceil(duration / segmentDuration);

      for (let i = 0; i < numSegments; i++) {
        const start = i * segmentDuration;
        const end = Math.min((i + 1) * segmentDuration, duration);
        segments.push({
          start,
          end,
          text: `Segment ${i + 1}`
        });
      }

      // Update video record with transcript
      await prisma.video.update({
        where: { id: videoId },
        data: {
          transcript: segments as any // Type assertion for Prisma JSON field
        }
      });

      // Clean up audio file
      await promisify(fs.unlink)(audioPath).catch(() => {});

      return segments;
    } catch (error: any) {
      throw new HTTPException(500, { 
        message: `Transcription failed: ${error.message}` 
      });
    }
  },

  async analyzeTranscript(transcript: TranscriptSegment[]): Promise<number[]> {
    try {
      // Simple analysis: suggest timestamps at regular intervals
      // This is a basic implementation that can be enhanced later
      const suggestions: number[] = [];
      const interval = 30; // Suggest a moment every 30 seconds

      transcript.forEach(segment => {
        if (Math.floor(segment.start) % interval === 0) {
          suggestions.push(segment.start);
        }
      });

      return suggestions;
    } catch (error: any) {
      throw new HTTPException(500, { 
        message: `Transcript analysis failed: ${error.message}` 
      });
    }
  },

  async extractAudio(videoPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .toFormat('wav')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', () => resolve())
        .on('error', reject)
        .save(outputPath);
    });
  },

  async getVideoDuration(videoPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`);
      const duration = parseFloat(stdout.trim());
      return isNaN(duration) ? 0 : duration;
    } catch (error) {
      console.error('Error getting video duration:', error);
      return 0;
    }
  },

  async transcribe(videoPath: string): Promise<TranscriptionResult> {
    try {
      // Check if video file exists
      if (!fs.existsSync(videoPath)) {
        throw new Error('Video file not found')
      }

      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Extract audio from video
      const audioPath = path.join(tempDir, `${Date.now()}.wav`);
      await execAsync(`ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`);

      // Use Whisper for transcription with timestamps
      const outputDir = tempDir;
      const baseName = path.basename(audioPath, '.wav');
      
      await execAsync(`whisper-ctranslate2 "${audioPath}" --model medium --language en --output_dir "${outputDir}" --output_format json`);
      
      // Read the generated transcript file
      const transcriptPath = path.join(outputDir, baseName + '.json');
      
      if (!fs.existsSync(transcriptPath)) {
        throw new Error('Transcript file was not generated')
      }
      
      const transcriptData = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));
      
      // Cleanup
      try {
        fs.unlinkSync(audioPath);
        fs.unlinkSync(transcriptPath);
      } catch (cleanupError) {
        console.warn('Warning: Failed to cleanup temporary files:', cleanupError);
      }
      
      return {
        text: transcriptData.text || '',
        segments: (transcriptData.segments || []).map((segment: any) => ({
          start: segment.start || 0,
          end: segment.end || 0,
          text: segment.text || ''
        }))
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  generateBasicTranscript(duration: number): string {
    // Generate a simple transcript with timestamps every 5 seconds
    const segments = [];
    for (let time = 0; time < duration; time += 5) {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      segments.push(`[${minutes}:${seconds.toString().padStart(2, '0')}] Segment ${Math.floor(time / 5) + 1}`);
    }
    return segments.join('\n');
  },

  async transcribeYoutubeVideo(videoId: string): Promise<TranscriptionResult> {
    try {
      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const videoPath = path.join(tempDir, `${videoId}.%(ext)s`);
      const finalVideoPath = path.join(tempDir, `${videoId}.mp4`);
      
      // Download video using yt-dlp
      await execAsync(`yt-dlp -f "best[height<=720]" -o "${videoPath}" "https://www.youtube.com/watch?v=${videoId}"`);

      // Check if the downloaded file exists (yt-dlp might use different extension)
      const files = fs.readdirSync(tempDir).filter(file => file.startsWith(videoId));
      if (files.length === 0) {
        throw new Error('Failed to download video')
      }
      
      const actualVideoPath = path.join(tempDir, files[0]);

      // Transcribe using Whisper
      const result = await this.transcribe(actualVideoPath);

      // Cleanup
      try {
        fs.unlinkSync(actualVideoPath);
      } catch (cleanupError) {
        console.warn('Warning: Failed to cleanup video file:', cleanupError);
      }

      return result;
    } catch (error) {
      console.error('YouTube transcription error:', error);
      throw new Error(`Failed to transcribe YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
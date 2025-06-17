import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const prisma = new PrismaClient()
const openai = new OpenAI()

interface TranscriptSegment {
  start: number
  end: number
  text: string
}

interface SuggestedMoment {
  startTime: number
  endTime: number
  caption: string
  confidence: number
}

export const contentAnalysisService = {
  // Analyze transcript and suggest GIF moments
  async analyzeTranscript(videoId: string, prompt: string): Promise<SuggestedMoment[]> {
    try {
      // Get video transcript
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { transcript: true },
      })

      if (!video?.transcript) {
        throw new Error('Video transcript not found')
      }

      const transcript = (video.transcript as unknown) as TranscriptSegment[]

      // Prepare transcript for GPT
      const transcriptText = transcript
        .map(segment => `[${segment.start}-${segment.end}s] ${segment.text}`)
        .join('\n')

      // Create GPT prompt
      const gptPrompt = `
        Analyze this video transcript and suggest 2-3 moments that would make good GIFs based on the theme: "${prompt}".
        For each moment, provide:
        1. Start and end timestamps (in seconds)
        2. A short, impactful caption (max 100 chars)
        3. Confidence score (0-1)

        Transcript:
        ${transcriptText}

        Format your response as a JSON array of objects with these fields:
        - startTime: number
        - endTime: number
        - caption: string
        - confidence: number

        Each moment should be 5-8 seconds long and capture the most impactful part of the scene.
      `

      // Get GPT analysis
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a video content analyzer that helps identify the most impactful moments for GIF creation.',
          },
          {
            role: 'user',
            content: gptPrompt,
          },
        ],
        response_format: { type: 'json_object' },
      })

      // Parse and validate response
      const response = JSON.parse(completion.choices[0].message.content || '{}')
      const suggestions = response.suggestions || []

      // Validate and clean up suggestions
      return suggestions
        .filter((s: any) => {
          const isValid =
            typeof s.startTime === 'number' &&
            typeof s.endTime === 'number' &&
            typeof s.caption === 'string' &&
            typeof s.confidence === 'number' &&
            s.startTime >= 0 &&
            s.endTime > s.startTime &&
            s.endTime - s.startTime <= 8 &&
            s.caption.length <= 100 &&
            s.confidence >= 0 &&
            s.confidence <= 1

          return isValid
        })
        .map((s: any) => ({
          startTime: Math.floor(s.startTime),
          endTime: Math.ceil(s.endTime),
          caption: s.caption.trim(),
          confidence: s.confidence,
        }))
        .sort((a: SuggestedMoment, b: SuggestedMoment) => b.confidence - a.confidence)
    } catch (error) {
      console.error('Error analyzing transcript:', error)
      throw error
    }
  },
} 
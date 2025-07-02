import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

async function analyzeTranscriptForCaptions(transcript: string, prompt: string) {
  try {
    // Use OpenRouter instead of direct DeepSeek API for better reliability
    const openRouterEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
    
    const deepSeekPrompt = `
You are given a video transcript. Your task is:
- Return 2-3 clip objects
- Each clip must include start (number), end (number), and text (string)
- Each clip should be 3–8 seconds long
- Return valid JSON only: [{"start":3,"end":8,"text":"..."}]

Transcript:
${transcript}
Prompt: "${prompt}"
`;

    const response = await fetch(openRouterEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        'X-Title': 'AI-Gif-Creator'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528-qwen3-8b:free', // Free model via OpenRouter
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: deepSeekPrompt }
        ]
      }),
    });

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Clean up the response
    if (content.startsWith('```')) {
      content = content.replace(/```json|```/g, '').trim();
    }

    let clips;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        clips = parsed;
      } else if (Array.isArray(parsed.clips)) {
        clips = parsed.clips;
      } else if (typeof parsed === 'object' && parsed !== null) {
        clips = Object.values(parsed);
      } else {
        throw new Error('AI returned unrecognized format');
      }
    } catch (err) {
      console.error(`❌ Failed to parse DeepSeek response. Raw content:\n${content}`);
      
      // Try to extract JSON using regex as fallback
      const match = content.match(/\[\s*{[\s\S]*?}\s*\]/);
      if (match) {
        try {
          const extractedClips = JSON.parse(match[0]);
          if (Array.isArray(extractedClips)) {
            clips = extractedClips;
          } else {
            throw new Error('Extracted content is not an array');
          }
        } catch (jsonError) {
          console.error('Failed to parse extracted JSON:', jsonError);
          throw new Error('Invalid response from DeepSeek');
        }
      } else {
        throw new Error('Invalid response from DeepSeek');
      }
    }

    // Convert clips to the expected format
    const captions = clips.map((clip: any) => ({
      text: clip.text || clip.caption || 'Unknown caption',
      startTime: clip.start || clip.startTime || 0,
      endTime: clip.end || clip.endTime || 0,
      reason: `AI-generated caption matching: "${prompt}"`
    }));

    return captions;
  } catch (error: any) {
    console.error('DeepSeek analysis error:', error);
    throw error;
  }
}

// Function to check if a Cloudinary URL is still accessible
async function isCloudinaryUrlAccessible(url: string): Promise<boolean> {
  try {
    // Only check Cloudinary URLs
    if (!url.includes('cloudinary.com')) {
      return true; // Assume local URLs are accessible
    }
    
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.log('Cloudinary URL not accessible:', url);
    return false;
  }
}

// Function to filter videos and remove those with inaccessible URLs
async function filterAccessibleVideos(videos: any[]) {
  const accessibleVideos = [];
  
  for (const video of videos) {
    const isAccessible = await isCloudinaryUrlAccessible(video.url);
    if (isAccessible) {
      accessibleVideos.push(video);
    } else {
      console.log(`Removing video with inaccessible URL: ${video.title} (${video.url})`);
      // Optionally delete from database
      try {
        await prisma.video.delete({
          where: { id: video.id }
        });
        console.log(`Deleted video from database: ${video.id}`);
      } catch (deleteError) {
        console.error(`Failed to delete video ${video.id}:`, deleteError);
      }
    }
  }
  
  return accessibleVideos;
}

export async function GET(req: NextRequest) {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        transcript: true,
        gifs: true,
      },
    });
    // Only keep videos with a Cloudinary URL
    const cloudinaryVideos = videos.filter(v => v.url && v.url.startsWith('https://res.cloudinary.com/'));
    
    console.log(`Found ${videos.length} total videos, ${cloudinaryVideos.length} accessible`);
    
    return NextResponse.json({ videos: cloudinaryVideos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { videoId, prompt } = await req.json();
    
    if (!videoId || !prompt) {
      return NextResponse.json({ error: 'Video ID and prompt are required' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { transcript: true }
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.transcript?.fullText) {
      return NextResponse.json({ error: 'No transcript found for this video' }, { status: 400 });
    }

    // Analyze transcript to find caption-worthy lines
    const captions = await analyzeTranscriptForCaptions(video.transcript.fullText, prompt);

    return NextResponse.json({ 
      videoId,
      captions,
      prompt
    });

  } catch (err: any) {
    console.error('Analysis Error:', err);
    return NextResponse.json({ 
      error: 'Failed to analyze transcript',
      details: err.message 
    }, { status: 500 });
  }
} 
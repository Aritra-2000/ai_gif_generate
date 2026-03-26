import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';



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

// Format AssemblyAI words with start times (in ms) into a timestamped transcript
function generateTimestampedText(words: any[]) {
  if (!words || !Array.isArray(words) || words.length === 0) return null;
  let result = '';
  let wordsSinceLastStamp = 0;
  
  for (let i = 0; i < words.length; i++) {
     const w = words[i];
     const text = typeof w === 'string' ? w : w.text;
     if (!text) continue;
     
     const prevWord = i > 0 ? (typeof words[i-1] === 'string' ? undefined : words[i-1]) : undefined;
     const isStartOfSentence = prevWord && typeof prevWord === 'object' && prevWord.text && /[.?!]$/.test(prevWord.text);
     
     // Add timestamp at the start, or every new sentence, or every 15 words
     if (i === 0 || isStartOfSentence || wordsSinceLastStamp > 15) {
        if (typeof w === 'object' && typeof w.start === 'number') {
           const s = Math.floor(w.start / 1000); // ms to sec
           const m = Math.floor(s / 60).toString().padStart(2, '0');
           const sec = (s % 60).toString().padStart(2, '0');
           result += ` [${m}:${sec}] `;
           wordsSinceLastStamp = 0;
        }
     }
     result += text + ' ';
     wordsSinceLastStamp++;
  }
  return result.trim().replace(/\s+/g, ' ');
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
    
    // Convert to timestamped transcripts
    const processedVideos = videos.map(v => {
      if (v.transcript) {
        let tsText = null;
        if (typeof v.transcript.words === 'string') {
           try { tsText = generateTimestampedText(JSON.parse(v.transcript.words)); } catch(e) {}
        } else if (Array.isArray(v.transcript.words)) {
           tsText = generateTimestampedText(v.transcript.words);
        }
        if (tsText) {
          v.transcript.fullText = tsText;
        }
      }
      return v;
    });

    const cloudinaryVideos = processedVideos.filter(v => v.url && v.url.startsWith('https://res.cloudinary.com/'));
    
    console.log(`Found ${videos.length} total videos, ${cloudinaryVideos.length} accessible`);
    
    return NextResponse.json({ videos: cloudinaryVideos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

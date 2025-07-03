import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

// Remove file system operations for Vercel
// const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
// const OUTPUT_DIR = path.join(process.cwd(), 'public', 'gifs');
// const TEMP_DIR = path.join(process.cwd(), 'temp');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CaptionData {
  text: string;
  startTime: number;
  endTime: number;
  reason: string;
}

// Get video info from Cloudinary with better error handling
async function getVideoInfo(publicId: string) {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'video',
      image_metadata: true
    });
    
    console.log('Raw Cloudinary response:', JSON.stringify(result, null, 2));
    
    return {
      duration: result.duration || result.video?.duration,
      format: result.format,
      width: result.width,
      height: result.height,
      playback_url: result.playback_url
    };
  } catch (error) {
    console.error('Error getting video info:', error);
    // Don't throw, return partial info
    return {
      duration: undefined,
      format: 'mp4',
      width: undefined,
      height: undefined
    };
  }
}

function getCloudinaryGifUrl(cloudName: string, publicId: string, start: number, end: number, videoInfo?: any) {
  // More conservative time handling when duration is unknown
  const startTime = Math.max(0, Math.floor(start));
  let endTime = Math.ceil(end);
  
  // If we don't have duration info, cap the end time more conservatively
  if (!videoInfo?.duration) {
    endTime = Math.min(endTime, startTime + 5); // Max 5 seconds if unknown duration
  } else {
    endTime = Math.min(videoInfo.duration - 0.5, endTime); // Leave 0.5s buffer
  }
  
  const duration = endTime - startTime;
  if (duration < 0.5) {
    console.warn(`Duration too short: ${duration}s`);
    return null;
  }
  
  // Simplified transformation for better compatibility
  const transformations = [
    `so_${startTime}`,
    `eo_${endTime}`,
    'f_gif',
    'fl_animated',
    'w_480',
    'q_auto:good',
    'fps_8' // Lower FPS for better compatibility
  ];
  
  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformations.join(',')}/${publicId}.gif`;
}

// Generate GIF using Cloudinary's video-to-GIF transformation
async function generateGifFromVideo(videoUrl: string, caption: CaptionData, publicId: string) {
  try {
    // This method works well on Vercel as it's all cloud-based
    const gifPublicId = `gif_${publicId}_${caption.startTime}_${caption.endTime}_${Date.now()}`;
    
    const uploadResult = await cloudinary.uploader.upload(videoUrl, {
      resource_type: 'video',
      public_id: gifPublicId,
      start_offset: caption.startTime,
      end_offset: caption.endTime,
      format: 'gif',
      transformation: [
        { 
          quality: 'auto:good', 
          format: 'gif',
          flags: ['animated'],
          width: 480,
          height: 'auto',
          crop: 'scale',
        }
      ],
      overwrite: true,
      folder: 'generated-gifs' // Organize in folder
    });
    
    return uploadResult.secure_url;
  } catch (error) {
    console.error('Error generating GIF via upload:', error);
    throw error;
  }
}

// Add timeout wrapper for Vercel's execution limits
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

export async function POST(req: NextRequest) {
  try {
    // Vercel has execution time limits (10s for Hobby, 60s for Pro)
    const startTime = Date.now();
    
    const { videoId, captions, prompt } = await req.json();

    if (!videoId || !captions || !Array.isArray(captions)) {
      return NextResponse.json({ error: 'Video ID and captions array are required' }, { status: 400 });
    }

    // Limit number of GIFs to prevent timeout
    const maxGifs = 5; // Adjust based on your Vercel plan
    const limitedCaptions = captions.slice(0, maxGifs);

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Parse Cloudinary public_id from video.url
    const urlPattern = /\/upload\/(?:v\d+\/)?(.+)\.([^.]+)$/;
    const match = video.url.match(urlPattern);
    if (!match) {
      return NextResponse.json({ error: 'Invalid Cloudinary video URL format' }, { status: 400 });
    }
    const publicId = match[1];
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      return NextResponse.json({ error: 'Cloudinary cloud name is not set in environment variables.' }, { status: 500 });
    }

    // Get video information for validation
    let videoInfo;
    try {
      videoInfo = await withTimeout(getVideoInfo(publicId), 5000); // 5 second timeout
      console.log('Video info:', videoInfo);
    } catch (error) {
      console.error('Could not get video info:', error);
      // Continue without video info for fallback
    }

    const generatedGifs = [];
    const errors = [];

    // Process GIFs with individual timeouts
    for (let i = 0; i < limitedCaptions.length; i++) {
      const caption = limitedCaptions[i];
      
      // Check remaining execution time
      const elapsed = Date.now() - startTime;
      if (elapsed > 45000) { // Leave 15s buffer for Vercel Pro (60s limit)
        console.warn('Approaching execution time limit, stopping GIF generation');
        break;
      }
      
      // Validate caption times
      if (caption.startTime < 0 || caption.startTime >= caption.endTime) {
        errors.push(`Invalid caption ${i}: startTime=${caption.startTime}, endTime=${caption.endTime}`);
        continue;
      }
      
      // Validate against video duration if available
      if (videoInfo?.duration && caption.endTime > videoInfo.duration) {
        console.warn(`Caption ${i}: endTime=${caption.endTime} exceeds video duration=${videoInfo.duration}, adjusting`);
        caption.endTime = Math.max(caption.startTime + 1, videoInfo.duration - 0.5);
      }
      
      // If no duration info, be more conservative
      if (!videoInfo?.duration && caption.endTime > caption.startTime + 5) {
        console.warn(`Caption ${i}: No duration info, limiting to 5s max`);
        caption.endTime = caption.startTime + 5;
      }
      
      // Ensure reasonable duration (0.5s to 8s for faster processing)
      const duration = caption.endTime - caption.startTime;
      if (duration < 0.5 || duration > 8) {
        errors.push(`Caption ${i}: duration=${duration} is outside acceptable range (0.5-8s)`);
        continue;
      }

      try {
        let gifUrl;
        
        // Try URL transformation first (faster)
        gifUrl = getCloudinaryGifUrl(cloudName, publicId, caption.startTime, caption.endTime, videoInfo);
        
        if (!gifUrl) {
          // Fallback to upload transformation
          gifUrl = await withTimeout(
            generateGifFromVideo(video.url, caption, publicId),
            20000 // 20 second timeout per GIF
          );
        }

        // Quick validation (don't wait for full response)
        console.log(`Generated GIF URL: ${gifUrl}`);

        const gif = await prisma.gif.create({
          data: {
            title: `GIF ${i + 1} - ${prompt}`,
            description: caption.reason,
            caption: caption.text,
            startTime: caption.startTime,
            endTime: caption.endTime,
            videoId: videoId,
            userId: video.userId,
            url: gifUrl,
          },
        });

        generatedGifs.push({
          id: gif.id,
          url: gifUrl,
          startTime: caption.startTime,
          endTime: caption.endTime,
          duration: duration
        });
        
      } catch (error) {
        console.error(`Error generating GIF for caption ${i}:`, error);
        errors.push(`GIF ${i}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
    }

    if (generatedGifs.length === 0) {
      return NextResponse.json({
        error: 'No valid GIFs could be generated',
        details: errors.length > 0 ? errors : 'All captions were invalid or failed to generate'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      gifs: generatedGifs,
      totalGenerated: generatedGifs.length,
      totalRequested: limitedCaptions.length,
      errors: errors.length > 0 ? errors : undefined,
      executionTime: Date.now() - startTime,
      prompt,
      videoInfo
    });

  } catch (err: any) {
    console.error('GIF generation error:', err);
    return NextResponse.json({
      error: 'Failed to generate GIFs',
      details: err.message
    }, { status: 500 });
  }
}

// Optional: Add a GET endpoint to check GIF status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gifId = searchParams.get('gifId');
  
  if (!gifId) {
    return NextResponse.json({ error: 'GIF ID required' }, { status: 400 });
  }
  
  try {
    const gif = await prisma.gif.findUnique({
      where: { id: gifId }
    });
    
    if (!gif) {
      return NextResponse.json({ error: 'GIF not found' }, { status: 404 });
    }
    
    // Check if GIF URL is accessible
    const response = await fetch(gif.url, { method: 'HEAD' });
    
    return NextResponse.json({
      id: gif.id,
      url: gif.url,
      status: response.ok ? 'ready' : 'processing',
      statusCode: response.status
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check GIF status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
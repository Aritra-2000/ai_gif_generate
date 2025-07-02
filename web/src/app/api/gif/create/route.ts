import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { videoId, captions, prompt } = await req.json();

    if (!videoId || !captions || !Array.isArray(captions)) {
      return NextResponse.json({ error: 'Video ID and captions array are required' }, { status: 400 });
    }

    // Get video from DB
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Parse Cloudinary public_id from video.url
    // Handle both with and without version numbers
    const urlPattern = /\/upload\/(?:v\d+\/)?(.+)\.([^.]+)$/;
    const match = video.url.match(urlPattern);
    
    if (!match) {
      return NextResponse.json({ error: 'Invalid Cloudinary video URL format' }, { status: 400 });
    }
    
    const publicId = match[1]; // e.g., gif-generator/videos/filename
    const fileExtension = match[2]; // e.g., mp4

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      return NextResponse.json({ error: 'Cloudinary config missing' }, { status: 500 });
    }

    const generatedGifs = [];

    for (let i = 0; i < captions.length; i++) {
      const caption = captions[i];
      
      // Validate timestamp values
      if (typeof caption.startTime !== 'number' || typeof caption.endTime !== 'number') {
        console.error(`Invalid timestamps for caption ${i}:`, caption);
        continue;
      }

      if (caption.startTime >= caption.endTime) {
        console.error(`Invalid time range for caption ${i}: start ${caption.startTime} >= end ${caption.endTime}`);
        continue;
      }

      // Construct Cloudinary transformation URL for GIF
      // Correct syntax: so_<start_time>,eo_<end_time>,f_gif
      // Also add quality optimization and size constraints
      const transformations = [
        `so_${caption.startTime}`, // start offset in seconds
        `eo_${caption.endTime}`,   // end offset in seconds
        'f_gif',                   // format as GIF
        'q_auto',                  // auto quality
        'w_500',                   // max width 500px
        'h_400',                   // max height 400px
        'c_limit'                 // crop mode: limit (maintain aspect ratio)
      ];

      const gifUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${transformations.join(',')}/${publicId}.gif`;

      try {
        // Save GIF record to database
        const gif = await prisma.gif.create({
          data: {
            title: `GIF ${i + 1} - ${prompt || 'Generated GIF'}`,
            description: caption.reason || '',
            caption: caption.text || '',
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
          title: gif.title,
          description: gif.description,
          caption: gif.caption,
          startTime: caption.startTime,
          endTime: caption.endTime,
          duration: caption.endTime - caption.startTime,
        });

        console.log(`Generated GIF ${i + 1}:`, {
          url: gifUrl,
          duration: caption.endTime - caption.startTime,
          timeRange: `${caption.startTime}s - ${caption.endTime}s`
        });

      } catch (dbError) {
        console.error(`Failed to save GIF ${i + 1} to database:`, dbError);
        // Continue with other GIFs even if one fails
      }
    }

    if (generatedGifs.length === 0) {
      return NextResponse.json({ 
        error: 'No valid GIFs could be generated', 
        message: 'Check the timestamps and caption format' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      gifs: generatedGifs,
      totalGenerated: generatedGifs.length,
      totalRequested: captions.length
    });

  } catch (error: any) {
    console.error('GIF generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate GIFs', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Optional: Add a GET endpoint to retrieve existing GIFs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const gifs = await prisma.gif.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          select: {
            title: true,
            url: true,
          }
        }
      }
    });

    return NextResponse.json({ gifs });
  } catch (error: any) {
    console.error('Error fetching GIFs:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch GIFs', 
      details: error.message 
    }, { status: 500 });
  }
}
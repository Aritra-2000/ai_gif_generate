import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const execAsync = promisify(exec);

// Configuration
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'gifs');
const TEMP_DIR = path.join(process.cwd(), 'temp');

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

async function downloadVideoFromCloudinary(videoUrl: string, filename: string): Promise<string> {
  try {
    // Ensure temp directory exists
    await mkdir(TEMP_DIR, { recursive: true });
    
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const videoPath = path.join(TEMP_DIR, filename);
    
    await writeFile(videoPath, Buffer.from(buffer));
    
    return videoPath;
  } catch (error) {
    throw error;
  }
}

async function createGif(
  videoPath: string, 
  caption: CaptionData, 
  outputPath: string
): Promise<string> {
  try {
    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    
    // Calculate duration
    const duration = caption.endTime - caption.startTime;
    const maxDuration = Math.min(Math.max(duration, 1.0), 8.0);

    // Try different FFmpeg paths
    const ffmpegPaths = [
      'C:\\Users\\KIIT\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffmpeg.exe',
      'ffmpeg', // System PATH
      'C:\\ffmpeg\\bin\\ffmpeg.exe', // Common installation path
    ];
    
    let ffmpegPath = null;
    for (const path of ffmpegPaths) {
      try {
        await execAsync(`"${path}" -version`);
        ffmpegPath = path;
        break;
      } catch (error) {
      }
    }
    
    if (!ffmpegPath) {
      throw new Error('FFmpeg not found. Please install FFmpeg and add it to your PATH.');
    }
    
    // Create a simple GIF without text overlay
    const ffmpegCommand = `"${ffmpegPath}" -i "${videoPath}" -ss ${caption.startTime} -t ${maxDuration} -vf "fps=10,scale=480:-1" -y "${outputPath}"`;

    const { stdout, stderr } = await execAsync(ffmpegCommand);
    
    // Check if output file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('FFmpeg did not create output file');
    }
    
    const uploadResult = await cloudinary.uploader.upload(outputPath, {
      resource_type: 'image',
      folder: 'gifs', // optional: organize in a folder
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });
    const gifUrl = uploadResult.secure_url;

    return gifUrl;
  } catch (error) {
    throw error;
  }
}

export async function POST(req: NextRequest) {
  let tempVideoPath = null;
  
  try {
    const { videoId, captions, prompt } = await req.json();
    
    if (!videoId || !captions || !Array.isArray(captions)) {
      return NextResponse.json({ error: 'Video ID and captions array are required' }, { status: 400 });
    }

    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Handle video source (Cloudinary vs local)
    let videoPath;
    if (video.url.includes('cloudinary.com')) {
      // Download from Cloudinary
      const filename = `temp_${videoId}_${Date.now()}.mp4`;
      videoPath = await downloadVideoFromCloudinary(video.url, filename);
      tempVideoPath = videoPath; // Mark for cleanup
    } else {
      // Local file
      const urlParts = video.url.split('/');
      const filename = urlParts[urlParts.length - 1];
      videoPath = path.join(UPLOAD_DIR, filename);
      
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Local video file not found: ${videoPath}`);
      }
    }
    
    // Ensure output directory exists
    await mkdir(OUTPUT_DIR, { recursive: true });

    const generatedGifs = [];
    const errors = [];

    // Generate GIF for each caption
    for (let i = 0; i < captions.length; i++) {
      const caption = captions[i];
      const gifId = `${videoId}_${i}_${Date.now()}`;
      const gifFilename = `${gifId}.gif`;
      const outputPath = path.join(OUTPUT_DIR, gifFilename);
      
      try {
        // Parse Cloudinary public_id from video.url
        const urlPattern = /\/upload\/(?:v\d+\/)?(.+)\.([^.]+)$/;
        const match = video.url.match(urlPattern);
        if (!match) {
          return NextResponse.json({ error: 'Invalid Cloudinary video URL format' }, { status: 400 });
        }
        const publicId = match[1];
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

        const transformations = [
          `so_${caption.startTime}`,
          `eo_${caption.endTime}`,
          'f_gif',
          'q_auto',
          'w_500',
          'h_400',
          'c_limit'
        ];
        const gifUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${transformations.join(',')}/${publicId}.gif`;

        // Save GIF record to database
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
        });

      } catch (error: any) {
        const errorMsg = `Failed to generate GIF ${i + 1}: ${error.message}`;
        errors.push(errorMsg);
        // Continue with other GIFs even if one fails
      }
    }

    // Clean up temporary video file
    if (tempVideoPath && fs.existsSync(tempVideoPath)) {
      try {
        await unlink(tempVideoPath);
      } catch (cleanupError) {
      }
    }

    if (generatedGifs.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to generate any GIFs',
        details: errors.join('; '),
        debug: {
          videoPath,
          captionsCount: captions.length,
          ffmpegAvailable: true // We'll check this in the function
        }
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      gifs: generatedGifs,
      totalGenerated: generatedGifs.length,
      errors: errors.length > 0 ? errors : undefined,
      prompt
    });

  } catch (err: any) {
    // Clean up temporary video file on error
    if (tempVideoPath && fs.existsSync(tempVideoPath)) {
      try {
        await unlink(tempVideoPath);
      } catch (cleanupError) {
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate GIFs',
      details: err.message 
    }, { status: 500 });
  }
} 
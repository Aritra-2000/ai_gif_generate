import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AssemblyAI } from 'assemblyai';
import cloudinary from '@/lib/cloudinary';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.config";

const execAsync = promisify(exec);

// DeepSeek API configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
// AssemblyAI configuration
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Initialize AssemblyAI client
const assemblyai = new AssemblyAI({
  apiKey: ASSEMBLYAI_API_KEY || '',
});

async function uploadToCloudinary(file: Buffer, fileName: string, resourceType: 'video' | 'raw' = 'video') {
  try {
    // Check file size (Cloudinary has a 100MB limit for free accounts)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.length > maxSize) {
      throw new Error(`File size ${(file.length / 1024 / 1024).toFixed(2)}MB exceeds Cloudinary's 100MB limit`);
    }
    
    // Convert buffer to base64
    const base64File = file.toString('base64');
    const dataURI = `data:video/mp4;base64,${base64File}`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: resourceType,
      public_id: `videos/${fileName.replace(/\.[^/.]+$/, '')}`,
      folder: 'gif-generator',
      overwrite: true,
    });
    
    return result;
  } catch (error) {
    throw error;
  }
}

async function extractAudioFromVideo(videoPath: string): Promise<string> {
  try {
    const audioPath = videoPath.replace(/\.[^/.]+$/, '.wav');
    
    // Check if FFmpeg is available
    const ffmpegPath = `${process.env.LOCALAPPDATA || process.env.USERPROFILE + '/AppData/Local'}/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-7.1.1-full_build/bin/ffmpeg.exe`;
    
    try {
      const { stdout, stderr } = await execAsync(`"${ffmpegPath}" -version`);
    } catch (error) {
      console.warn('FFmpeg not found, trying system PATH');
      try {
        const { stdout, stderr } = await execAsync('ffmpeg -version');
      } catch (pathError) {
        console.warn('FFmpeg not found in system PATH either');
        throw new Error('FFmpeg is not installed. Please install FFmpeg to enable audio transcription.');
      }
    }
    
    // Use FFmpeg to extract audio from video
    const ffmpegCommand = `"${ffmpegPath}" -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`;
    
    const { stdout, stderr } = await execAsync(ffmpegCommand);
    
    // FFmpeg writes progress info to stderr, so we need to check for actual errors
    // Look for error patterns in stderr that indicate failure
    if (stderr && (
      stderr.includes('Error') || 
      stderr.includes('error') || 
      stderr.includes('Invalid') ||
      stderr.includes('No such file') ||
      stderr.includes('Permission denied')
    )) {
      throw new Error('Failed to extract audio from video');
    }
    
    return audioPath;
  } catch (error) {
    throw error;
  }
}

async function transcribeWithAssemblyAI(audioPath: string) {
  try {
    // Check if audio file exists
    const fs = require('fs');
    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio file not found after extraction');
    }
    
    // Get file size to confirm extraction worked
    const stats = fs.statSync(audioPath);
    
    if (!ASSEMBLYAI_API_KEY) {
      throw new Error('AssemblyAI API key not configured');
    }
    
    // Read the audio file
    const audioFile = fs.readFileSync(audioPath);
    
    // Upload the audio file to AssemblyAI
    const uploadResponse = await assemblyai.files.upload(audioFile) as any;
    
    // Handle different response formats from AssemblyAI
    let audioUrl = '';
    if (typeof uploadResponse === 'string') {
      // Direct URL string response
      audioUrl = uploadResponse;
    } else if (uploadResponse.upload_url) {
      // Object with upload_url property
      audioUrl = uploadResponse.upload_url;
    } else if (uploadResponse.url) {
      // Object with url property
      audioUrl = uploadResponse.url;
    } else {
      throw new Error('Failed to get upload URL from AssemblyAI');
    }
    
    // Create a transcription request
    const transcript = await assemblyai.transcripts.create({
      audio_url: audioUrl,
      speaker_labels: true,
      auto_highlights: true,
      auto_chapters: true,
    }) as any;
    
    // Poll for completion
    let completedTranscript = transcript;
    let pollCount = 0;
    const maxPolls = 60; // Maximum 5 minutes (60 * 5 seconds)
    
    while (completedTranscript.status !== 'completed' && completedTranscript.status !== 'error' && pollCount < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      pollCount++;
      
      try {
        completedTranscript = await assemblyai.transcripts.get(transcript.id) as any;
      } catch (pollError) {
        break;
      }
    }
    
    if (pollCount >= maxPolls) {
      throw new Error('Transcription timed out after 5 minutes');
    }
    
    if (completedTranscript.status === 'error') {
      throw new Error(`Transcription failed: ${completedTranscript.error}`);
    }
    
    // Extract words with timestamps
    let words = [];
    try {
      words = completedTranscript.words?.map((word: any) => ({
        text: word.text,
        start: word.start,
        end: word.end,
        confidence: word.confidence,
        speaker: word.speaker,
      })) || [];
    } catch (wordError) {
      words = [];
    }
    
    const result = {
      words,
      fullText: completedTranscript.text || '',
      confidence: completedTranscript.confidence,
      audio_duration: completedTranscript.audio_duration,
      chapters: completedTranscript.chapters,
      highlights: completedTranscript.auto_highlights_result,
    };
    
    return result;
    
  } catch (error) {
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get session and ensure authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userEmail = session.user.email;
    let user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: session.user.name || "Google User",
          url: session.user.image || "", // if your schema requires url
        }
      });
    }
    // Parse form data
    const formData = await req.formData();
    const file = formData.get('video') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${file.name}`;

    // Only upload to Cloudinary
    let cloudinaryResult = null;
    let videoUrl = '';
    let thumbnailUrl = null;
    try {
      cloudinaryResult = await uploadToCloudinary(buffer, fileName, 'video');
      videoUrl = cloudinaryResult.secure_url;
      thumbnailUrl = cloudinaryResult.thumbnail_url || null;
    } catch (cloudinaryError) {
      return NextResponse.json({ error: 'Failed to upload video to Cloudinary' }, { status: 500 });
    }

    // Create video record in database
    const video = await prisma.video.create({
      data: {
        userId: user.id,
        title: file.name,
        filename: fileName,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'processing',
        url: videoUrl, // This is the Cloudinary URL
        description: null,
        thumbnail: thumbnailUrl,
      },
    });

    // Create an audio-only version and save it in Cloudinary
    const audioResult = await cloudinary.uploader.explicit(cloudinaryResult.public_id, {
      resource_type: 'video',
      type: 'upload',
      eager: [
        { format: 'mp3' }
      ],
      eager_async: false
    });
    if (!audioResult.eager || !audioResult.eager[0] || !audioResult.eager[0].secure_url) {
      return NextResponse.json({ error: 'Failed to extract audio from video for transcription.' }, { status: 500 });
    }
    const audioUrl = audioResult.eager[0].secure_url;

    // Generate transcript using Cloudinary URL directly
    let transcriptData = null;
    try {
      if (!ASSEMBLYAI_API_KEY) {
        throw new Error('AssemblyAI API key not configured');
      }
      // Send Cloudinary video URL directly to AssemblyAI
      const transcript = await assemblyai.transcripts.create({
        audio_url: audioUrl,
        speaker_labels: true,
        auto_highlights: true,
        auto_chapters: true,
      });
      // Poll for completion
      let completedTranscript = transcript;
      let pollCount = 0;
      const maxPolls = 60;
      while (completedTranscript.status !== 'completed' && completedTranscript.status !== 'error' && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        pollCount++;
        try {
          completedTranscript = await assemblyai.transcripts.get(transcript.id);
        } catch (pollError) {
          break;
        }
      }
      if (completedTranscript.status === 'completed') {
        transcriptData = {
          words: completedTranscript.words || [],
          fullText: completedTranscript.text || '',
          confidence: completedTranscript.confidence,
          audio_duration: completedTranscript.audio_duration,
          chapters: completedTranscript.chapters,
          highlights: completedTranscript.auto_highlights_result,
        };
        // Save transcript to DB for video
        await prisma.transcript.create({
          data: {
            videoId: video.id,
            words: transcriptData.words,
            fullText: transcriptData.fullText,
          },
        });
        // Update video status
        await prisma.video.update({
          where: { id: video.id },
          data: { status: 'completed' },
        });
      } else {
        // If transcript fails or is not completed, still mark video as completed
        await prisma.video.update({
          where: { id: video.id },
          data: { status: 'completed' },
        });
      }
    } catch (transcriptError) {
      // If transcript fails, still mark video as completed so it is usable
      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'completed' },
      });
    }

    // Ensure status is completed if video is playable but still marked as processing
    if (video.status === 'processing' && video.url && video.url.startsWith('https://res.cloudinary.com/')) {
      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'completed' },
      });
    }

    return NextResponse.json({
      video,
      transcript: transcriptData,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to upload video',
      details: error.message,
    }, { status: 500 });
  }
}
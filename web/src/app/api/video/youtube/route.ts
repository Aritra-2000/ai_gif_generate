import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { create } from 'youtube-dl-exec';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { AssemblyAI } from 'assemblyai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

// Absolute path prevents webpack from mangling it to .next/server/bin/yt-dlp.exe
const YT_DLP_BINARY = path.join(
  process.cwd(),
  'node_modules',
  'youtube-dl-exec',
  'bin',
  'yt-dlp.exe'
);

// Single bound instance — use ytdl() for metadata, ytdl.exec() for streaming
const ytdl = create(YT_DLP_BINARY);

const YT_URL_REGEX =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]{11}/;

function isValidYouTubeUrl(url: string) {
  return YT_URL_REGEX.test(url);
}

/**
 * Converts a raw internal error into a short, user-friendly message.
 * Full details are always logged to the server console for debugging.
 */
function friendlyError(err: any): string {
  const msg: string = (err?.message || err?.stderr || String(err)).toLowerCase();

  if (msg.includes('private') || msg.includes('members only'))  return 'This video is private or members-only.';
  if (msg.includes('age') || msg.includes('sign in'))           return 'This video requires age verification or sign-in.';
  if (msg.includes('not available') || msg.includes('unavailable')) return 'This video is unavailable in your region.';
  if (msg.includes('copyright') || msg.includes('removed'))    return 'This video has been removed or blocked by copyright.';
  if (msg.includes('playlist'))                                 return 'Please paste a single video URL, not a playlist.';
  if (msg.includes('404') || msg.includes('does not exist'))    return 'Video not found. Check the URL and try again.';
  if (msg.includes('403') || msg.includes('forbidden'))         return 'Access denied by YouTube. Try a different video.';
  if (msg.includes('cloudinary'))                               return 'Failed to save video to storage. Please try again.';
  if (msg.includes('timed out') || msg.includes('timeout'))     return 'The request timed out. Try a shorter video.';
  if (msg.includes('no stdout') || msg.includes('spawn'))       return 'Internal download error. Please try again.';

  // Generic fallback — don't expose raw internals
  return 'Something went wrong importing that video. Please try again.';
}

/**
 * Returns only the video title via yt-dlp JSON metadata.
 */
async function getVideoTitle(url: string): Promise<string> {
  const meta = await ytdl(url, {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noPlaylist: true,
    format: 'best[ext=mp4][height<=720]/best[ext=mp4]/best',
  }) as any;
  return meta.title as string;
}

/**
 * Stream the video from YouTube → Cloudinary via yt-dlp stdout pipe.
 * 
 * YouTube CDN URLs are IP-locked to the requesting machine, so we CANNOT
 * hand the URL to Cloudinary to fetch on its own — it would get a 403.
 * Instead we pipe the bytes through our server as an intermediary.
 */
function streamToCloudinary(youtubeUrl: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    // yt-dlp with -o - writes the video bytes to stdout
    const ytProcess = ytdl.exec(youtubeUrl, {
      output: '-',           // stdout
      format: 'best[ext=mp4][height<=720]/best[ext=mp4]/best',
      noPlaylist: true,
      noCheckCertificates: true,
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'video', folder: 'gif-generator' },
      (error, result) => {
        if (error || !result) reject(error || new Error('Cloudinary stream upload failed'));
        else resolve(result);
      }
    );

    if (!ytProcess.stdout) {
      ytProcess.kill();
      return reject(new Error('yt-dlp process has no stdout'));
    }

    ytProcess.stdout.pipe(uploadStream);

    ytProcess.on('error', (err) => reject(new Error('yt-dlp spawn error: ' + err.message)));

    // Capture stderr for debugging but don't fail on it
    let stderrLog = '';
    ytProcess.stderr?.on('data', (chunk: Buffer) => {
      stderrLog += chunk.toString();
    });

    ytProcess.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error('yt-dlp stderr:', stderrLog);
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userEmail = session.user.email;
    let user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: session.user.name || 'Google User',
          url: session.user.image || '',
        },
      });
    }

    const { url } = await req.json();

    if (!url || !isValidYouTubeUrl(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // ── Fetch title only (fast, no streaming) ────────────────────────────────
    let videoTitle: string;
    try {
      videoTitle = await getVideoTitle(url);
    } catch (err: any) {
      console.error('yt-dlp metadata error:', err);
      return NextResponse.json(
        { error: friendlyError(err) },
        { status: 422 }
      );
    }

    // ── Create DB record in processing state ─────────────────────────────────
    const video = await prisma.video.create({
      data: {
        userId: user.id,
        title: videoTitle,
        filename: `${Date.now()}-youtube.mp4`,
        originalName: `${videoTitle}.mp4`,
        fileSize: 0,
        mimeType: 'video/mp4',
        status: 'processing',
        url: '',
        description: null,
      },
    });

    try {
      // ── 1. Download via yt-dlp stdout → pipe → Cloudinary ────────────────
      // This avoids the 403 that occurs when Cloudinary tries to fetch the
      // IP-locked googlevideo.com CDN URL from a different IP address.
      console.log(`Streaming "${videoTitle}" to Cloudinary...`);
      const cloudinaryResult = await streamToCloudinary(url);
      console.log(`Uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);

      const videoUrl = cloudinaryResult.secure_url;
      const thumbnailUrl = cloudinaryResult.thumbnail_url || null;

      await prisma.video.update({
        where: { id: video.id },
        data: { url: videoUrl, thumbnail: thumbnailUrl, fileSize: cloudinaryResult.bytes },
      });

      // ── 2. Extract audio via Cloudinary eager transform ───────────────────
      const audioResult = await cloudinary.uploader.explicit(cloudinaryResult.public_id, {
        resource_type: 'video',
        type: 'upload',
        eager: [{ format: 'mp3' }],
        eager_async: false,
      });

      if (audioResult.eager && audioResult.eager[0]?.secure_url) {
        const audioUrl = audioResult.eager[0].secure_url;

        // ── 3. Transcribe with AssemblyAI ───────────────────────────────────
        if (process.env.ASSEMBLYAI_API_KEY) {
          const transcript = await assemblyai.transcripts.create({
            audio_url: audioUrl,
            speaker_labels: true,
            auto_highlights: true,
            auto_chapters: true,
          });

          // Poll for up to 60 s (12 × 5 s)
          let completedTranscript = transcript;
          let pollCount = 0;
          while (
            completedTranscript.status !== 'completed' &&
            completedTranscript.status !== 'error' &&
            pollCount < 12
          ) {
            await new Promise((r) => setTimeout(r, 5000));
            pollCount++;
            completedTranscript = await assemblyai.transcripts.get(transcript.id);
          }

          if (completedTranscript.status === 'completed') {
            await prisma.transcript.create({
              data: {
                videoId: video.id,
                words: completedTranscript.words || [],
                fullText: completedTranscript.text || '',
              },
            });
          } else {
            console.warn('Transcript did not complete in time, continuing without it.');
          }
        }
      }

      // Mark done regardless of transcript outcome
      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'completed' },
      });

      const finalVideo = await prisma.video.findUnique({
        where: { id: video.id },
        include: { transcript: true },
      });
      return NextResponse.json({ video: finalVideo });

    } catch (processError: any) {
      console.error('Processing error:', processError);
      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'error', description: processError.message },
      });
      return NextResponse.json(
        { error: friendlyError(processError) },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('YouTube route error:', error);
    return NextResponse.json(
      { error: friendlyError(error) },
      { status: 500 }
    );
  }
}

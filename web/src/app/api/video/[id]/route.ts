import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { unlink } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token) as { userId: string };
    const { id } = params;
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.userId !== payload.userId) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    return NextResponse.json({ video });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;

    // Find the video first
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete associated records first (transcript, gifs)
    await prisma.transcript.deleteMany({
      where: { videoId },
    });

    await prisma.gif.deleteMany({
      where: { videoId },
    });

    // Delete the video record
    await prisma.video.delete({
      where: { id: videoId },
    });

    // Try to delete the local file if it exists
    try {
      const urlParts = video.url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const filePath = path.join(UPLOAD_DIR, filename);
      
      // Check if file exists before trying to delete
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (fileError) {
      console.warn('Failed to delete local video file:', fileError);
      // Don't fail the request if file deletion fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Video deleted successfully' 
    });

  } catch (error: any) {
    console.error('Video deletion error:', error);
    return NextResponse.json({
      error: 'Failed to delete video',
      details: error.message,
    }, { status: 500 });
  }
} 
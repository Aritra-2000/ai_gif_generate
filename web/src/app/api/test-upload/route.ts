import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    console.log('Testing video upload functionality...');
    
    // Test creating a video record with all required fields
    const testVideo = await prisma.video.create({
      data: {
        userId: "test-user",
        title: "Test Video Upload",
        filename: "test-upload.mp4",
        originalName: "test-upload.mp4",
        fileSize: 1024,
        mimeType: "video/mp4",
        status: "test",
        url: "http://localhost:3000/uploads/test-upload.mp4",
        description: "Test video for upload functionality",
        thumbnail: null,
      },
    });
    
    console.log('Test video created successfully:', testVideo.id);
    
    // Test creating a transcript
    const testTranscript = await prisma.transcript.create({
      data: {
        videoId: testVideo.id,
        words: [],
        fullText: "This is a test transcript for the video upload functionality.",
      },
    });
    
    console.log('Test transcript created successfully:', testTranscript.id);
    
    // Clean up test records
    await prisma.transcript.delete({
      where: { id: testTranscript.id }
    });
    
    await prisma.video.delete({
      where: { id: testVideo.id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Video upload functionality is working correctly',
      testVideo: {
        id: testVideo.id,
        title: testVideo.title,
        filename: testVideo.filename,
        status: testVideo.status
      },
      testTranscript: {
        id: testTranscript.id,
        fullText: testTranscript.fullText
      }
    });
    
  } catch (error: any) {
    console.error('Test upload error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.name,
      details: error.stack
    }, { status: 500 });
  }
} 
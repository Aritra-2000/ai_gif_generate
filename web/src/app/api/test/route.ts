import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Test basic Prisma connection
    const videoCount = await prisma.video.count();
    
    // Test creating a simple video record
    const testVideo = await prisma.video.create({
      data: {
        userId: "test",
        title: "Test Video",
        filename: "test.mp4",
        originalName: "test.mp4",
        fileSize: 1000,
        mimeType: "video/mp4",
        status: "test",
        url: "http://localhost:3000/test.mp4",
        description: null,
        thumbnail: null,
      },
    });
    
    // Clean up test record
    await prisma.video.delete({
      where: { id: testVideo.id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Prisma connection and operations working correctly',
      videoCount
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.name,
      details: error.stack
    }, { status: 500 });
  }
} 
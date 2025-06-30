import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export async function POST(req: NextRequest) {
  try {
    // Get all videos
    const videos = await prisma.video.findMany({
      include: {
        transcript: true,
        gifs: true,
      },
    });
    
    const results = {
      total: videos.length,
      accessible: 0,
      inaccessible: 0,
      deleted: 0,
      errors: 0,
      details: [] as any[]
    };
    
    // Check each video
    for (const video of videos) {
      const isAccessible = await isCloudinaryUrlAccessible(video.url);
      
      if (isAccessible) {
        results.accessible++;
        results.details.push({
          id: video.id,
          title: video.title,
          url: video.url,
          status: 'accessible'
        });
      } else {
        results.inaccessible++;
        
        try {
          // Delete associated records first
          await prisma.transcript.deleteMany({
            where: { videoId: video.id }
          });
          
          await prisma.gif.deleteMany({
            where: { videoId: video.id }
          });
          
          // Delete the video
          await prisma.video.delete({
            where: { id: video.id }
          });
          
          results.deleted++;
          results.details.push({
            id: video.id,
            title: video.title,
            url: video.url,
            status: 'deleted'
          });
          
          console.log(`Deleted video: ${video.title} (${video.id})`);
        } catch (deleteError) {
          results.errors++;
          results.details.push({
            id: video.id,
            title: video.title,
            url: video.url,
            status: 'error',
            error: deleteError instanceof Error ? deleteError.message : 'Unknown error'
          });
          console.error(`Failed to delete video ${video.id}:`, deleteError);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed. ${results.deleted} videos deleted, ${results.accessible} remain accessible.`,
      results
    });
    
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json({
      error: 'Failed to cleanup videos',
      details: error.message
    }, { status: 500 });
  }
} 
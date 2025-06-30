const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The only accessible video URL in Cloudinary
const ACCESSIBLE_VIDEO_URL = 'https://res.cloudinary.com/dzh7mwhpj/video/upload/v1751224008/gif-generator/videos/1751224002612-_Mastering%20Happiness_%20The%20Watermelon%20Lesson_.mp4';

async function cleanupVideos() {
  try {
    console.log('🔄 Starting video cleanup...');
    
    // Get all videos from database
    const allVideos = await prisma.video.findMany({
      include: {
        transcript: true,
        gifs: true,
      },
    });
    
    console.log(`📊 Found ${allVideos.length} videos in database`);
    
    let deletedCount = 0;
    let keptCount = 0;
    
    // Process each video
    for (const video of allVideos) {
      if (video.url === ACCESSIBLE_VIDEO_URL) {
        // Keep this video
        keptCount++;
        console.log(`✅ Keeping: ${video.title} (${video.url})`);
      } else {
        // Delete this video and its associated data
        try {
          console.log(`🗑️ Deleting: ${video.title} (${video.url})`);
          
          // Delete associated records first
          if (video.transcript) {
            await prisma.transcript.delete({
              where: { videoId: video.id }
            });
            console.log(`  - Deleted transcript`);
          }
          
          if (video.gifs && video.gifs.length > 0) {
            await prisma.gif.deleteMany({
              where: { videoId: video.id }
            });
            console.log(`  - Deleted ${video.gifs.length} GIFs`);
          }
          
          // Delete the video
          await prisma.video.delete({
            where: { id: video.id }
          });
          
          deletedCount++;
          console.log(`  - Deleted video record`);
          
        } catch (deleteError) {
          console.error(`❌ Failed to delete video ${video.id}:`, deleteError.message);
        }
      }
    }
    
    console.log('\n🎉 Cleanup completed!');
    console.log(`✅ Kept: ${keptCount} video(s)`);
    console.log(`🗑️ Deleted: ${deletedCount} video(s)`);
    
    // Verify final state
    const remainingVideos = await prisma.video.findMany();
    console.log(`\n📋 Remaining videos in database: ${remainingVideos.length}`);
    
    if (remainingVideos.length > 0) {
      console.log('Remaining video(s):');
      remainingVideos.forEach(video => {
        console.log(`  - ${video.title} (${video.url})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupVideos(); 
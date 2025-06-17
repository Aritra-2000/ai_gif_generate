import { cleanupService, initializeCleanup } from './cleanupService'
import { fileURLToPath } from 'url'

// Your existing job processor code here...

export class JobProcessor {
  private static instance: JobProcessor | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): JobProcessor {
    if (!JobProcessor.instance) {
      JobProcessor.instance = new JobProcessor();
    }
    return JobProcessor.instance;
  }

  static async start(): Promise<void> {
    const processor = JobProcessor.getInstance();
    await processor.start();
  }

  static async stop(): Promise<void> {
    const processor = JobProcessor.getInstance();
    await processor.shutdown();
  }

  async start() {
    if (this.isRunning) {
      console.log('Job processor is already running');
      return;
    }

    try {
      // Initialize cleanup service first
      await initializeCleanup();
      
      this.isRunning = true;
      console.log('Job processor started successfully');

      // Handle graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      
    } catch (error) {
      console.error('Error starting job processor:', error);
      throw error;
    }
  }

  async shutdown() {
    console.log('Shutting down job processor...');
    
    try {
      // Stop periodic cleanup
      cleanupService.stopPeriodicCleanup();
      
      // Perform final cleanup
      await cleanupService.cleanupTempFiles(0); // Clean all temp files
      await cleanupService.cleanupGifFiles(60); // Clean GIFs older than 1 hour
      
      this.isRunning = false;
      console.log('Job processor shut down gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  // Method to clean up after each job
  async cleanupAfterJob(filePaths: string[] = []) {
    try {
      if (filePaths.length > 0) {
        const removedCount = await cleanupService.removeFiles(filePaths);
        console.log(`Cleaned up ${removedCount} job-specific files`);
      }
      
      // Optional: Get cleanup stats
      const stats = await cleanupService.getCleanupStats();
      console.log(`Current file counts - Temp: ${stats.tempFiles}, GIFs: ${stats.gifFiles}`);
      
    } catch (error) {
      console.error('Error during job cleanup:', error);
    }
  }
}

// If this is your main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  JobProcessor.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}
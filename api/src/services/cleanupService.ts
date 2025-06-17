import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const unlink = promisify(fs.unlink)
const rmdir = promisify(fs.rmdir)

export class CleanupService {
  private static instance: CleanupService
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {}

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService()
    }
    return CleanupService.instance
  }

  /**
   * Safely check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await stat(dirPath)
      return stats.isDirectory()
    } catch (error) {
      return false
    }
  }

  /**
   * Safely create directory if it doesn't exist
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      if (!await this.directoryExists(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
        console.log(`Created directory: ${dirPath}`)
      }
    } catch (error) {
      console.error(`Error creating directory ${dirPath}:`, error)
    }
  }

  /**
   * Clean up files older than specified age in a directory
   */
  private async cleanupOldFiles(
    dirPath: string, 
    maxAgeMinutes: number = 60,
    filePattern?: RegExp
  ): Promise<number> {
    try {
      // Check if directory exists
      if (!await this.directoryExists(dirPath)) {
        console.log(`Directory does not exist, skipping cleanup: ${dirPath}`)
        return 0
      }

      const files = await readdir(dirPath)
      const cutoffTime = Date.now() - (maxAgeMinutes * 60 * 1000)
      let cleanedCount = 0

      for (const file of files) {
        const filePath = path.join(dirPath, file)
        
        try {
          const stats = await stat(filePath)
          
          // Skip directories
          if (stats.isDirectory()) continue
          
          // Check file pattern if provided
          if (filePattern && !filePattern.test(file)) continue
          
          // Check if file is older than cutoff time
          if (stats.mtime.getTime() < cutoffTime) {
            await unlink(filePath)
            cleanedCount++
            console.log(`Cleaned up old file: ${filePath}`)
          }
        } catch (fileError) {
          console.warn(`Error processing file ${filePath}:`, fileError)
        }
      }

      return cleanedCount
    } catch (error) {
      console.error(`Error cleaning up directory ${dirPath}:`, error)
      return 0
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(maxAgeMinutes: number = 60): Promise<void> {
    const tempDir = path.join(process.cwd(), 'temp')
    
    try {
      // Ensure temp directory exists
      await this.ensureDirectory(tempDir)
      
      const cleanedCount = await this.cleanupOldFiles(tempDir, maxAgeMinutes)
      
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} temporary files`)
      } else {
        console.log('No temporary files to clean up')
      }
    } catch (error) {
      console.error('Error during temp files cleanup:', error)
    }
  }

  /**
   * Clean up GIF files
   */
  async cleanupGifFiles(maxAgeMinutes: number = 120): Promise<void> {
    const gifsDir = path.join(process.cwd(), 'uploads', 'gifs')
    
    try {
      // Ensure gifs directory exists
      await this.ensureDirectory(gifsDir)
      
      const cleanedCount = await this.cleanupOldFiles(
        gifsDir, 
        maxAgeMinutes, 
        /\.(gif|mp4|avi|mov)$/i
      )
      
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} GIF files`)
      } else {
        console.log('No GIF files to clean up')
      }
    } catch (error) {
      console.error('Error during GIF files cleanup:', error)
    }
  }

  /**
   * Clean up all upload directories
   */
  async cleanupUploads(maxAgeMinutes: number = 180): Promise<void> {
    const uploadsDir = path.join(process.cwd(), 'uploads')
    
    try {
      // Ensure uploads directory exists
      await this.ensureDirectory(uploadsDir)
      
      // Clean up different subdirectories
      const subdirs = ['videos', 'audios', 'images', 'gifs']
      
      for (const subdir of subdirs) {
        const subdirPath = path.join(uploadsDir, subdir)
        await this.ensureDirectory(subdirPath)
        
        const cleanedCount = await this.cleanupOldFiles(subdirPath, maxAgeMinutes)
        if (cleanedCount > 0) {
          console.log(`Cleaned up ${cleanedCount} files from ${subdir}`)
        }
      }
    } catch (error) {
      console.error('Error during uploads cleanup:', error)
    }
  }

  /**
   * Remove specific file safely
   */
  async removeFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await unlink(filePath)
        console.log(`Removed file: ${filePath}`)
        return true
      } else {
        console.log(`File does not exist: ${filePath}`)
        return false
      }
    } catch (error) {
      console.error(`Error removing file ${filePath}:`, error)
      return false
    }
  }

  /**
   * Remove multiple files safely
   */
  async removeFiles(filePaths: string[]): Promise<number> {
    let removedCount = 0
    
    for (const filePath of filePaths) {
      if (await this.removeFile(filePath)) {
        removedCount++
      }
    }
    
    return removedCount
  }

  /**
   * Start automatic cleanup process
   */
  startPeriodicCleanup(intervalMinutes: number = 30): void {
    if (this.cleanupInterval) {
      console.log('Periodic cleanup is already running')
      return
    }

    console.log(`Starting periodic cleanup every ${intervalMinutes} minutes`)
    
    this.cleanupInterval = setInterval(async () => {
      console.log('Running periodic cleanup...')
      
      await Promise.all([
        this.cleanupTempFiles(60),      // Clean temp files older than 1 hour
        this.cleanupGifFiles(120),      // Clean GIF files older than 2 hours
        this.cleanupUploads(180)        // Clean other uploads older than 3 hours
      ])
      
      console.log('Periodic cleanup completed')
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Stop automatic cleanup process
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('Periodic cleanup stopped')
    }
  }

  /**
   * Initialize required directories
   */
  async initializeDirectories(): Promise<void> {
    const directories = [
      path.join(process.cwd(), 'temp'),
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'uploads', 'videos'),
      path.join(process.cwd(), 'uploads', 'audios'),
      path.join(process.cwd(), 'uploads', 'images'),
      path.join(process.cwd(), 'uploads', 'gifs'),
    ]

    for (const dir of directories) {
      await this.ensureDirectory(dir)
    }

    console.log('All required directories initialized')
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    tempFiles: number;
    gifFiles: number;
    totalFiles: number;
  }> {
    const tempDir = path.join(process.cwd(), 'temp')
    const gifsDir = path.join(process.cwd(), 'uploads', 'gifs')
    
    const countFiles = async (dir: string): Promise<number> => {
      try {
        if (!await this.directoryExists(dir)) return 0
        const files = await readdir(dir)
        return files.filter(file => {
          const filePath = path.join(dir, file)
          try {
            return fs.statSync(filePath).isFile()
          } catch {
            return false
          }
        }).length
      } catch {
        return 0
      }
    }

    const tempFiles = await countFiles(tempDir)
    const gifFiles = await countFiles(gifsDir)

    return {
      tempFiles,
      gifFiles,
      totalFiles: tempFiles + gifFiles
    }
  }
}

// Export singleton instance
export const cleanupService = CleanupService.getInstance()

// Usage example for your job processor
export const initializeCleanup = async () => {
  try {
    // Initialize all required directories
    await cleanupService.initializeDirectories()
    
    // Start periodic cleanup (every 30 minutes)
    cleanupService.startPeriodicCleanup(30)
    
    console.log('Cleanup service initialized successfully')
  } catch (error) {
    console.error('Error initializing cleanup service:', error)
  }
}
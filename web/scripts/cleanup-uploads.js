const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads');

console.log('Cleaning up old upload files...');

if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  
  if (files.length === 0) {
    console.log('Uploads directory is already empty');
  } else {
    console.log(`Found ${files.length} files to clean up`);
    
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file}`);
      } catch (error) {
        console.error(`Failed to delete ${file}:`, error.message);
      }
    });
    
    console.log('Cleanup completed');
  }
} else {
  console.log('Uploads directory does not exist');
} 
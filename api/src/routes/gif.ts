import express from 'express';
import { VideoSettings } from '../types/video';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    if (!req.files || !req.files.video) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const settings: VideoSettings = req.body.settings ? JSON.parse(req.body.settings) : {};
    
    // TODO: Implement GIF generation logic
    res.status(200).json({ message: 'GIF generation endpoint' });
  } catch (error) {
    console.error('Error generating GIF:', error);
    res.status(500).json({ error: 'Failed to generate GIF' });
  }
});

export default router; 
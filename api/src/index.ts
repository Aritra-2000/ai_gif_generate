import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';
import gifRoutes from './routes/gif.js';
import youtubeRoutes from './routes/youtube.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT;
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB default

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: maxFileSize },
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Routes
app.use('/api/gif', gifRoutes);
app.use('/api/youtube', youtubeRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
});

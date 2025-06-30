This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# AssemblyAI API Key for transcription
ASSEMBLYAI_API_KEY=your_assemblyai_api_key

# DeepSeek API Key for AI analysis
DEEPSEEK_API_KEY=your_deepseek_api_key

# Cloudinary configuration for file storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Database URL (if using external database)
DATABASE_URL="postgresql://username:password@localhost:5432/gif_generator"

# NextAuth configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Base URL for the application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### API Keys Setup

1. **AssemblyAI**: Get your API key from [AssemblyAI Console](https://www.assemblyai.com/app/account)
2. **DeepSeek**: Get your API key from [DeepSeek Platform](https://platform.deepseek.com/)
3. **Cloudinary**: Get your credentials from [Cloudinary Console](https://console.cloudinary.com/)

### Database Setup

1. Run Prisma migrations:
```bash
npx prisma migrate dev
```

2. Generate Prisma client:
```bash
npx prisma generate
```

### File Storage

This application uses **Cloudinary** for video file storage instead of local storage. Videos are uploaded to Cloudinary and stored securely in the cloud. Temporary local files are created only for audio extraction and are automatically cleaned up after processing.

**File Size Limits:**
- **Maximum file size**: 100MB (due to Cloudinary free tier limits)
- **Supported formats**: MP4, MOV, AVI, WebM
- **Fallback storage**: If Cloudinary upload fails (e.g., file too large), videos are stored locally

**Storage Strategy:**
1. **Primary**: Cloudinary cloud storage (up to 100MB)
2. **Fallback**: Local storage (for files > 100MB or Cloudinary failures)
3. **Temporary**: Local files for audio extraction (auto-cleaned)

### Cleanup

To clean up old local upload files (if any):
```bash
npm run cleanup-uploads
```

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

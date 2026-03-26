import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Metadata } from "next"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const gif = await prisma.gif.findUnique({ where: { id: params.id }, include: { video: true } });
  
  if (!gif) return { title: 'GIF Not Found' }

  const baseUrl = process.env.FRONTEND_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const title = gif.caption || gif.title || 'Incredible AI GIF';
  const description = `Created with AI from "${gif.video?.title || 'a video'}"`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.other',
      url: `${baseUrl}/gif/${gif.id}`,
      images: [
        {
          url: gif.url.replace('.gif', '.jpg'), // Using Cloudinary's auto-format to get a static preview image
          width: 800,
          height: 450,
          alt: title,
        }
      ],
      videos: [
        {
          url: gif.url.replace('.gif', '.mp4'), // Cloudinary serves optimized mp4
          width: 800,
          height: 450,
          type: 'video/mp4',
        }
      ],
    },
    twitter: {
      card: 'player',
      title,
      description,
      images: [gif.url.replace('.gif', '.jpg')],
      players: [
        {
          playerUrl: `${baseUrl}/gif/${gif.id}`,
          streamUrl: gif.url.replace('.gif', '.mp4'),
          width: 800,
          height: 450,
        }
      ]
    }
  }
}

import { ShareActions } from "@/components/ShareActions";

export default async function GifPage({ params }: { params: { id: string } }) {
  const gif = await prisma.gif.findUnique({ 
    where: { id: params.id },
    include: { user: true, video: true }
  });

  if (!gif) return notFound();

  const baseUrl = process.env.FRONTEND_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8" style={{ background: '#05070f' }}>
      <div className="aurora-bg absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="aurora-orb aurora-orb-1 opacity-20" />
        <div className="aurora-orb aurora-orb-2 opacity-20" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center">
        <a href="/" className="mb-8 text-slate-400 hover:text-white transition-colors text-sm font-semibold flex items-center gap-2">
          ← Back to Generator
        </a>

        <div className="glass-card p-4 sm:p-6 w-full">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 flex-shrink-0">
              {gif.user?.image ? (
                <img src={gif.user.image} alt={gif.user.name || 'User'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  {gif.user?.name?.[0] || 'U'}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">
                {gif.caption || 'AI Generated GIF'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Created by {gif.user?.name || 'Anonymous'}
              </p>
            </div>
          </div>

          {/* Player */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl mb-6">
            <video 
              src={gif.url.replace('.gif', '.mp4')} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-8 border-t border-white/5 w-full">
            <ShareActions 
              gifId={gif.id} 
              gifUrl={gif.url} 
              caption={gif.caption || 'AI Generated GIF'} 
              baseUrl={baseUrl} 
            />
          </div>
          
          <div className="flex items-center gap-3 text-[10px] text-slate-600 font-medium justify-center mt-6">
            <span>Powered by AssemblyAI & Groq</span>
            <span>•</span>
            <span>Source: {gif.video?.title || 'Unknown Video'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

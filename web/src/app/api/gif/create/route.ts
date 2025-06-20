import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';
import { z } from 'zod';

const GifSchema = z.object({
  videoId: z.string().min(1),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  title: z.string().min(1),
  description: z.string().optional(),
  caption: z.string().optional(),
  prompt: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token) as { userId: string };
    const body = await req.json();
    const { videoId, startTime, endTime, title, description, caption, prompt } = GifSchema.parse(body);
    const gif = await prisma.gif.create({
      data: {
        videoId,
        userId: payload.userId,
        startTime,
        endTime,
        title,
        description,
        caption,
        prompt,
        status: 'pending',
      },
    });
    return NextResponse.json({ gif });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 
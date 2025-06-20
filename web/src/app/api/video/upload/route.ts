import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';
import { z } from 'zod';

const VideoSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token) as { userId: string };
    const body = await req.json();
    const { title, url, description, thumbnail } = VideoSchema.parse(body);
    const video = await prisma.video.create({
      data: {
        title,
        url,
        description,
        thumbnail,
        userId: payload.userId,
      },
    });
    return NextResponse.json({ video });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 
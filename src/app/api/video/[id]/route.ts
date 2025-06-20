import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token) as { userId: string };
    const { id } = params;
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.userId !== payload.userId) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    return NextResponse.json({ video });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token) as { userId: string };
    const { id } = params;
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.userId !== payload.userId) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    await prisma.video.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const GifUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  caption: z.string().optional(),
  prompt: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token) as { userId: string };
    const { id } = params;
    const gif = await prisma.gif.findUnique({ where: { id } });
    if (!gif || gif.userId !== payload.userId) {
      return NextResponse.json({ error: 'GIF not found' }, { status: 404 });
    }
    return NextResponse.json({ gif });
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
    const gif = await prisma.gif.findUnique({ where: { id } });
    if (!gif || gif.userId !== payload.userId) {
      return NextResponse.json({ error: 'GIF not found' }, { status: 404 });
    }
    await prisma.gif.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token) as { userId: string };
    const { id } = params;
    const gif = await prisma.gif.findUnique({ where: { id } });
    if (!gif || gif.userId !== payload.userId) {
      return NextResponse.json({ error: 'GIF not found' }, { status: 404 });
    }
    const body = await req.json();
    const data = GifUpdateSchema.parse(body);
    const updated = await prisma.gif.update({ where: { id }, data });
    return NextResponse.json({ gif: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 
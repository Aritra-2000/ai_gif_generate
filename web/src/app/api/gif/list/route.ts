import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    if (!auth) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token) as { userId: string };
    const gifs = await prisma.gif.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ gifs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
} 
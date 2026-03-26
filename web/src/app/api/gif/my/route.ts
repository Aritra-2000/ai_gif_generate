import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const gifs = await prisma.gif.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        video: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(gifs);
  } catch (error) {
    console.error("Error fetching user gifs:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

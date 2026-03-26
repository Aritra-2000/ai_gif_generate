import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const gif = await prisma.gif.findUnique({
      where: { id: params.id },
      include: { video: true, user: true }
    });

    if (!gif) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(gif);
  } catch (error) {
    console.error("Error fetching gif:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const gif = await prisma.gif.findUnique({
      where: { id: params.id },
      select: { userId: true }
    });

    if (!gif) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (gif.userId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.gif.delete({
      where: { id: params.id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting gif:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
 
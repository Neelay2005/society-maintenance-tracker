import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const complaints = await prisma.complaint.findMany({
      where: { residentId: session.user.id },
      include: {
        statusHistory: {
          orderBy: { createdAt: "asc" },
          include: {
            changedBy: {
              select: { name: true, role: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ complaints });
  } catch (error) {
    console.error("Error fetching resident complaints:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

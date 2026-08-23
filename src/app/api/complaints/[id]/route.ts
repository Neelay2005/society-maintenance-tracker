import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        resident: {
          select: { id: true, name: true, email: true, unitNumber: true },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          include: {
            changedBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    // Strict Authorization Check:
    // Resident cannot see another resident's complaint!
    if (
      session.user.role !== Role.ADMIN &&
      complaint.residentId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to view another resident's complaint" },
        { status: 403 }
      );
    }

    return NextResponse.json({ complaint });
  } catch (error) {
    console.error("Error fetching complaint details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

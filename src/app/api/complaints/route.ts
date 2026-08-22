import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user;

    // Authorization rule:
    // ADMIN can view all complaints.
    // RESIDENT can ONLY view their own complaints.
    if (role === Role.ADMIN) {
      const complaints = await prisma.complaint.findMany({
        include: {
          resident: {
            select: { id: true, name: true, email: true, unitNumber: true },
          },
          statusHistory: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ complaints });
    } else {
      const complaints = await prisma.complaint.findMany({
        where: { residentId: userId },
        include: {
          statusHistory: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ complaints });
    }
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, category, photoUrl } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        category: category || "OTHER",
        photoUrl: photoUrl || null,
        residentId: session.user.id,
      },
    });

    // Create initial status history entry
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        changedById: session.user.id,
        previousStatus: null,
        newStatus: "OPEN",
        notes: "Complaint created",
      },
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    console.error("Error creating complaint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

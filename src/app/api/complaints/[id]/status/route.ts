import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, ComplaintStatus } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Explicit Authorization Check: Only ADMIN role can change complaint status
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Admins can change complaint status" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status: newStatus, notes } = body;

    if (!newStatus || !Object.values(ComplaintStatus).includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const existingComplaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existingComplaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    const previousStatus = existingComplaint.status;

    // Update complaint status
    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: { status: newStatus },
    });

    // Record entry in ComplaintStatusHistory (separate table)
    const historyEntry = await prisma.complaintStatusHistory.create({
      data: {
        complaintId: id,
        changedById: session.user.id,
        previousStatus,
        newStatus,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      complaint: updatedComplaint,
      history: historyEntry,
    });
  } catch (error) {
    console.error("Error updating complaint status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

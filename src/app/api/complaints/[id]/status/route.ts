import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, ComplaintStatus, Priority } from "@prisma/client";
import { sendStatusChangeEmail } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Explicit Authorization Check: Only ADMIN role can change complaint status/priority
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Admins can change complaint status or priority" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status: newStatus, priority: newPriority, notes } = body;

    const existingComplaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existingComplaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    // Rule 1: Resolved / Closed complaints are READ-ONLY!
    if (
      existingComplaint.status === ComplaintStatus.RESOLVED ||
      existingComplaint.status === ComplaintStatus.CLOSED
    ) {
      return NextResponse.json(
        { error: "Forbidden: Resolved or closed complaints are read-only and cannot be modified." },
        { status: 400 }
      );
    }

    // Rule 2: Validate Status Transition
    if (newStatus) {
      if (!Object.values(ComplaintStatus).includes(newStatus)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }

      // Valid transition mapping
      const validTransitions: Record<ComplaintStatus, ComplaintStatus[]> = {
        [ComplaintStatus.OPEN]: [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED],
        [ComplaintStatus.IN_PROGRESS]: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED],
        [ComplaintStatus.RESOLVED]: [], // Read-only
        [ComplaintStatus.CLOSED]: [], // Read-only
      };

      const allowedNext = validTransitions[existingComplaint.status] || [];
      if (!allowedNext.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${existingComplaint.status} to ${newStatus}. Once resolved/closed, complaints cannot be reopened.`,
          },
          { status: 400 }
        );
      }
    }

    // Rule 3: Validate Priority if provided
    if (newPriority && !Object.values(Priority).includes(newPriority)) {
      return NextResponse.json({ error: "Invalid priority value" }, { status: 400 });
    }

    const targetStatus = newStatus || existingComplaint.status;
    const targetPriority = newPriority || existingComplaint.priority;

    // Execute Complaint update + ComplaintStatusHistory insertion inside ONE Prisma transaction
    const [updatedComplaint, historyEntry] = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id },
        data: {
          status: targetStatus,
          priority: targetPriority,
        },
      });

      const noteText = notes || (newPriority && newPriority !== existingComplaint.priority ? `Priority changed to ${newPriority}` : null);

      const history = await tx.complaintStatusHistory.create({
        data: {
          complaintId: id,
          changedById: session.user.id,
          previousStatus: existingComplaint.status,
          newStatus: targetStatus,
          notes: noteText,
        },
      });

      return [updated, history];
    });

    // PHASE 6: Non-blocking Email Notification
    // Database transaction succeeded! Now try to send notification email.
    // Email failure MUST NOT fail or roll back the HTTP response.
    try {
      const resident = await prisma.user.findUnique({
        where: { id: existingComplaint.residentId },
        select: { email: true, name: true },
      });

      if (resident && resident.email) {
        // Fire and forget (or await inside try/catch)
        await sendStatusChangeEmail({
          to: resident.email,
          residentName: resident.name,
          complaintId: existingComplaint.id,
          title: existingComplaint.title,
          newStatus: targetStatus,
          notes,
        });
      }
    } catch (emailError) {
      console.error("[Email Notification Warning] Failed to send email, but DB transaction succeeded:", emailError);
    }

    return NextResponse.json({
      complaint: updatedComplaint,
      history: historyEntry,
    });
  } catch (error) {
    console.error("Error updating complaint status/priority:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


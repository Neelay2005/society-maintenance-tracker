import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { complaintCreateSchema } from "@/lib/validations/complaint";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, id: userId } = session.user;
    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get("status")?.toUpperCase();
    const categoryParam = searchParams.get("category")?.toUpperCase();
    const priorityParam = searchParams.get("priority")?.toUpperCase();

    const whereClause: any = {};

    if (role !== Role.ADMIN) {
      whereClause.residentId = userId;
    }

    if (statusParam && statusParam !== "ALL") {
      whereClause.status = statusParam;
    }

    if (categoryParam && categoryParam !== "ALL") {
      whereClause.category = categoryParam;
    }

    if (priorityParam && priorityParam !== "ALL") {
      whereClause.priority = priorityParam;
    }

    const complaints = await prisma.complaint.findMany({
      where: whereClause,
      include: {
        resident: {
          select: { id: true, name: true, email: true, unitNumber: true },
        },
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

    // Server-side Zod validation
    const validationResult = complaintCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, description, category, priority, photoUrl } = validationResult.data;

    // Execute Complaint Creation + ComplaintStatusHistory in ONE Database Transaction
    const [complaint, history] = await prisma.$transaction(async (tx) => {
      const newComplaint = await tx.complaint.create({
        data: {
          title,
          description,
          category,
          priority: priority || "MEDIUM",
          photoUrl: photoUrl || null,
          residentId: session.user.id,
          status: "OPEN",
        },
      });

      const initialHistory = await tx.complaintStatusHistory.create({
        data: {
          complaintId: newComplaint.id,
          changedById: session.user.id,
          previousStatus: null,
          newStatus: "OPEN",
          notes: "Complaint raised",
        },
      });

      return [newComplaint, initialHistory];
    });

    return NextResponse.json(
      {
        complaint: {
          ...complaint,
          statusHistory: [history],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating complaint in transaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

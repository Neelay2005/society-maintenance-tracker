import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { sendImportantNoticeEmail } from "@/lib/email";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Phase 5 requirement: Sort isImportant DESC, createdAt DESC
    const notices = await prisma.notice.findMany({
      orderBy: [{ isImportant: "desc" }, { isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ notices });
  } catch (error) {
    console.error("Error fetching notices:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization: Only ADMIN can create notices
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Admins can create notices" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, content, isImportant, isPinned } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        isImportant: Boolean(isImportant),
        isPinned: Boolean(isPinned),
        createdById: session.user.id,
      },
    });

    // PHASE 6: Notification 2 - When an important notice is posted, notify residents via email
    if (notice.isImportant) {
      try {
        const residents = await prisma.user.findMany({
          where: { role: Role.RESIDENT },
          select: { email: true, name: true },
        });

        // Fire email sends concurrently without blocking response if any fails
        Promise.allSettled(
          residents.map((r) =>
            sendImportantNoticeEmail({
              to: r.email,
              residentName: r.name,
              noticeTitle: notice.title,
              noticeContent: notice.content,
            })
          )
        ).catch((e) => console.error("Error sending important notice emails:", e));
      } catch (emailErr) {
        console.error("[Email Notification Warning] Failed to send notice emails:", emailErr);
      }
    }

    return NextResponse.json({ notice }, { status: 201 });
  } catch (error) {
    console.error("Error creating notice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

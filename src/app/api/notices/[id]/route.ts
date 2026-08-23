import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization: Only ADMIN can edit notices
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Admins can update notices" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { title, content, isImportant, isPinned } = body;

    const existingNotice = await prisma.notice.findUnique({
      where: { id },
    });

    if (!existingNotice) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    const updatedNotice = await prisma.notice.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(typeof isImportant === "boolean" && { isImportant }),
        ...(typeof isPinned === "boolean" && { isPinned }),
      },
    });

    return NextResponse.json({ notice: updatedNotice });
  } catch (error) {
    console.error("Error updating notice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization: Only ADMIN can delete notices
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Admins can delete notices" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingNotice = await prisma.notice.findUnique({
      where: { id },
    });

    if (!existingNotice) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    await prisma.notice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Notice deleted" });
  } catch (error) {
    console.error("Error deleting notice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

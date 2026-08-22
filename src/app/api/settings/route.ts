import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          overdueThresholdDays: 3,
          updatedById: session.user.id,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization: Only ADMIN can change settings
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Admins can change settings" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { overdueThresholdDays } = body;

    if (
      typeof overdueThresholdDays !== "number" ||
      overdueThresholdDays < 1 ||
      overdueThresholdDays > 30
    ) {
      return NextResponse.json(
        { error: "overdueThresholdDays must be a number between 1 and 30" },
        { status: 400 }
      );
    }

    let settings = await prisma.settings.findFirst();

    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          overdueThresholdDays,
          updatedById: session.user.id,
        },
      });
    } else {
      settings = await prisma.settings.create({
        data: {
          overdueThresholdDays,
          updatedById: session.user.id,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

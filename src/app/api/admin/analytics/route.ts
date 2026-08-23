import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, ComplaintStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only Admins can access analytics data" },
        { status: 403 }
      );
    }

    // Fetch settings for overdue calculation
    let settings = await prisma.settings.findFirst();
    const thresholdDays = settings?.overdueThresholdDays ?? 3;

    // Prisma Aggregations: Group by Category
    const categoryGroup = await prisma.complaint.groupBy({
      by: ["category"],
      _count: {
        id: true,
      },
    });

    // Prisma Aggregations: Group by Status
    const statusGroup = await prisma.complaint.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    // Total complaints count
    const totalComplaints = await prisma.complaint.count();

    // Fetch all active complaints for precise query-time overdue calculation
    const activeComplaints = await prisma.complaint.findMany({
      where: {
        status: {
          notIn: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED],
        },
      },
      select: {
        createdAt: true,
      },
    });

    const now = new Date().getTime();
    const overdueCount = activeComplaints.filter((c) => {
      const created = new Date(c.createdAt).getTime();
      const diffDays = (now - created) / (1000 * 3600 * 24);
      return diffDays >= thresholdDays;
    }).length;

    // Format category distribution
    const categoriesList = [
      "PLUMBING",
      "ELECTRICAL",
      "CLEANING",
      "SECURITY",
      "NOISE",
      "MAINTENANCE",
      "OTHER",
    ];

    const categoryData = categoriesList.map((cat) => {
      const found = categoryGroup.find((g) => g.category === cat);
      return {
        category: cat,
        count: found ? found._count.id : 0,
      };
    });

    // Format status distribution
    const statusesList = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
    const statusData = statusesList.map((st) => {
      const found = statusGroup.find((g) => g.status === st);
      return {
        status: st.replace("_", " "),
        rawStatus: st,
        count: found ? found._count.id : 0,
      };
    });

    return NextResponse.json({
      totalComplaints,
      overdueCount,
      overdueThresholdDays: thresholdDays,
      categoryData,
      statusData,
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Find all incomplete tasks whose dueDate was before today
    const unfinishedPastTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueDate: { lt: todayStart },
      },
    });

    if (unfinishedPastTasks.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No unfinished past tasks found." });
    }

    const todayDate = new Date();

    const updateRes = await prisma.task.updateMany({
      where: {
        id: { in: unfinishedPastTasks.map((t) => t.id) },
      },
      data: {
        dueDate: todayDate,
        isRolledOver: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: updateRes.count,
      message: `Rolled over ${updateRes.count} unfinished task(s) to today.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to roll over tasks" }, { status: 500 });
  }
}

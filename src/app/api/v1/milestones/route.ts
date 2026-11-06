import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const milestoneToggleSchema = z.object({
  id: z.string(),
  isCompleted: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = milestoneToggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { id, isCompleted } = parsed.data;

    // Check ownership through goal
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { goal: true },
    });

    if (!milestone || milestone.goal.userId !== user.id) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    await prisma.milestone.update({
      where: { id },
      data: { isCompleted },
    });

    // Recalculate goal progress % and health
    const allMilestones = await prisma.milestone.findMany({
      where: { goalId: milestone.goalId },
    });

    const total = allMilestones.length;
    const completedCount = allMilestones.filter((m) => (m.id === id ? isCompleted : m.isCompleted)).length;
    const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const now = new Date();
    const daysUntilDeadline = (milestone.goal.deadline.getTime() - now.getTime()) / (1000 * 3600 * 24);

    let health = "ON_TRACK";
    if (progressPercent < 100 && daysUntilDeadline < 0) {
      health = "BEHIND";
    } else if (progressPercent < 50 && daysUntilDeadline < 14) {
      health = "AT_RISK";
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: milestone.goalId },
      data: {
        progressPercent,
        health,
        status: progressPercent === 100 ? "COMPLETED" : "IN_PROGRESS",
      },
      include: {
        milestones: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      milestone: { id, isCompleted },
      goal: updatedGoal,
    });
  } catch (error: any) {
    console.error("Milestone update error:", error);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }
}

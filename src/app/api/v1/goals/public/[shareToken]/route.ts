import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context: { params: Promise<{ shareToken: string }> | { shareToken: string } }) {
  try {
    const { shareToken } = await Promise.resolve(context.params);
    const goal = await prisma.goal.findUnique({
      where: { shareToken },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
        milestones: {
          orderBy: { order: "asc" },
        },
        plan: true,
        visionItems: true,
      },
    });

    if (!goal || goal.isArchived) {
      return NextResponse.json({ error: "Goal not found or link has expired" }, { status: 404 });
    }

    return NextResponse.json({
      goal: {
        id: goal.id,
        title: goal.title,
        whyItMatters: goal.whyItMatters,
        category: goal.category,
        priority: goal.priority,
        status: goal.status,
        progressPercent: goal.progressPercent,
        health: goal.health,
        deadline: goal.deadline,
        coverColor: goal.coverColor,
        coverIcon: goal.coverIcon,
        author: goal.user,
        milestones: goal.milestones,
        plan: goal.plan,
        visionItems: goal.visionItems,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch shared goal" }, { status: 500 });
  }
}

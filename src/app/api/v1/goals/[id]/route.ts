import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, sanitizeText, validateCsrf } from "@/lib/auth";

const updateGoalSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  whyItMatters: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  health: z.enum(["ON_TRACK", "AT_RISK", "BEHIND"]).optional(),
  coverColor: z.string().max(50).optional(),
  coverIcon: z.string().max(50).optional(),
  deadline: z.string().optional(),
  isArchived: z.boolean().optional(),
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(context.params);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goal = await prisma.goal.findFirst({
      where: {
        id,
        userId: user.id, // IDOR protection
      },
      include: {
        milestones: {
          orderBy: { order: "asc" },
          include: {
            tasks: true,
          },
        },
        tasks: {
          include: {
            subtasks: true,
          },
        },
        plan: true,
        visionItems: {
          orderBy: { order: "asc" },
        },
        supportPeople: true,
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ goal });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch goal" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(context.params);
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update fields" }, { status: 400 });
    }

    // IDOR protection: ensure user owns goal
    const existing = await prisma.goal.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const data: any = {};
    if (parsed.data.title !== undefined) data.title = sanitizeText(parsed.data.title);
    if (parsed.data.whyItMatters !== undefined) data.whyItMatters = sanitizeText(parsed.data.whyItMatters);
    if (parsed.data.category !== undefined) data.category = sanitizeText(parsed.data.category);
    if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.progressPercent !== undefined) data.progressPercent = parsed.data.progressPercent;
    if (parsed.data.health !== undefined) data.health = parsed.data.health;
    if (parsed.data.coverColor !== undefined) data.coverColor = parsed.data.coverColor;
    if (parsed.data.coverIcon !== undefined) data.coverIcon = parsed.data.coverIcon;
    if (parsed.data.isArchived !== undefined) data.isArchived = parsed.data.isArchived;
    if (parsed.data.deadline) {
      data.deadline = new Date(parsed.data.deadline);
    }

    // If status marked as COMPLETED, award XP badge if first goal completion
    if (data.status === "COMPLETED" && existing.status !== "COMPLETED") {
      data.progressPercent = 100;
      await prisma.userBadge.upsert({
        where: {
          userId_badgeSlug: {
            userId: user.id,
            badgeSlug: "goal_crusher",
          },
        },
        create: {
          userId: user.id,
          badgeSlug: "goal_crusher",
          badgeName: "Goal Crusher",
          badgeIcon: "trophy",
          xpReward: 300,
        },
        update: {},
      });
    }

    const updated = await prisma.goal.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, goal: updated });
  } catch (error: any) {
    console.error("Update goal error:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await Promise.resolve(context.params);
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // IDOR protection
    const existing = await prisma.goal.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    await prisma.goal.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Goal deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}

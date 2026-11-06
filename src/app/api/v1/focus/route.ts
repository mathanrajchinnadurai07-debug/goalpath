import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, validateCsrf } from "@/lib/auth";

const focusSessionSchema = z.object({
  taskId: z.string().optional().nullable(),
  durationMinutes: z.number().min(1).max(360),
  ambientSound: z.enum(["none", "rain", "cafe", "whitenoise", "stream"]).default("none"),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = focusSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid focus session data" }, { status: 400 });
    }

    const { taskId, durationMinutes, ambientSound } = parsed.data;

    // IDOR protection: Verify task belongs to current user
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId: user.id },
      });
      if (!task) {
        return NextResponse.json({ error: "Task not found or does not belong to you" }, { status: 403 });
      }
    }

    const session = await prisma.focusSession.create({
      data: {
        userId: user.id,
        taskId: taskId || null,
        durationMinutes,
        ambientSound,
      },
    });

    // If linked to a task, increment task actualMinutes
    if (taskId) {
      await prisma.task.updateMany({
        where: { id: taskId, userId: user.id },
        data: {
          actualMinutes: { increment: durationMinutes },
        },
      });
    }

    // Award Focus Master badge if logged > 120 minutes total
    const totalMinutes = await prisma.focusSession.aggregate({
      where: { userId: user.id },
      _sum: { durationMinutes: true },
    });

    if ((totalMinutes._sum.durationMinutes || 0) >= 120) {
      await prisma.userBadge.upsert({
        where: {
          userId_badgeSlug: {
            userId: user.id,
            badgeSlug: "focus_titan",
          },
        },
        create: {
          userId: user.id,
          badgeSlug: "focus_titan",
          badgeName: "Deep Work Titan",
          badgeIcon: "zap",
          xpReward: 200,
        },
        update: {},
      });
    }

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to record focus session" }, { status: 500 });
  }
}

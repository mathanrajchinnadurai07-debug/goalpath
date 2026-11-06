import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const reviewSchema = z.object({
  type: z.enum(["WEEKLY", "MONTHLY"]),
  wins: z.string().min(3),
  blockers: z.string().min(3),
  lessons: z.string().min(3),
  adjustments: z.string().min(3),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviews = await prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reviews });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid review fields" }, { status: 400 });
    }

    const data = parsed.data;
    const now = new Date();
    const start = new Date(now.getTime() - (data.type === "WEEKLY" ? 7 : 30) * 24 * 60 * 60 * 1000);

    // Compute automatic quantitative stats snapshot
    const [tasksCompleted, focusSum] = await Promise.all([
      prisma.task.count({
        where: { userId: user.id, status: "DONE", updatedAt: { gte: start } },
      }),
      prisma.focusSession.aggregate({
        where: { userId: user.id, createdAt: { gte: start } },
        _sum: { durationMinutes: true },
      }),
    ]);

    const statsSnapshot = {
      tasksCompleted,
      focusMinutes: focusSum._sum.durationMinutes || 0,
      timestamp: now.toISOString(),
    };

    const review = await prisma.review.create({
      data: {
        userId: user.id,
        type: data.type,
        periodStart: start,
        periodEnd: now,
        wins: data.wins,
        blockers: data.blockers,
        lessons: data.lessons,
        adjustments: data.adjustments,
        statsJson: JSON.stringify(statsSnapshot),
      },
    });

    // Award Reflective Scholar badge
    await prisma.userBadge.upsert({
      where: {
        userId_badgeSlug: { userId: user.id, badgeSlug: "reflective_master" },
      },
      create: {
        userId: user.id,
        badgeSlug: "reflective_master",
        badgeName: "Reflective Master",
        badgeIcon: "sparkles",
        xpReward: 200,
      },
      update: {},
    });

    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }
}

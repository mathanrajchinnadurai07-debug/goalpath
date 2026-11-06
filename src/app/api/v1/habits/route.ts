import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, sanitizeText, validateCsrf } from "@/lib/auth";

const createHabitSchema = z.object({
  title: z.string().min(2, "Habit title required").max(200),
  goalId: z.string().optional().nullable(),
  frequency: z.enum(["DAILY", "WEEKLY", "CUSTOM"]).default("DAILY"),
  targetDays: z.string().default("1,2,3,4,5,6,7"),
  color: z.string().default("#10b981"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get last 90 days of logs for each habit
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const habits = await prisma.habit.findMany({
      where: { userId: user.id },
      include: {
        logs: {
          where: { date: { gte: ninetyDaysAgo } },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ habits });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch habits" }, { status: 500 });
  }
}

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
    const parsed = createHabitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid habit input" }, { status: 400 });
    }

    const data = parsed.data;

    // IDOR protection: Verify goal belongs to user
    if (data.goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: data.goalId, userId: user.id },
      });
      if (!goal) {
        return NextResponse.json({ error: "Goal not found or does not belong to you" }, { status: 403 });
      }
    }

    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        title: sanitizeText(data.title),
        goalId: data.goalId || null,
        frequency: data.frequency,
        targetDays: data.targetDays,
        color: data.color,
        streakCurrent: 0,
        streakBest: 0,
      },
    });

    return NextResponse.json({ success: true, habit });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create habit" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Habit ID required" }, { status: 400 });
    }

    await prisma.habit.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true, message: "Habit deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete habit" }, { status: 500 });
  }
}

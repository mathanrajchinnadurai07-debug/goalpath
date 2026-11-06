import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const logSchema = z.object({
  habitId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["COMPLETED", "SKIPPED", "UNLOGGED"]),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = logSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid log payload" }, { status: 400 });
    }

    const { habitId, date, status, notes } = parsed.data;

    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId: user.id },
    });
    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    if (status === "UNLOGGED") {
      await prisma.habitLog.deleteMany({
        where: { habitId, date },
      });
    } else {
      await prisma.habitLog.upsert({
        where: {
          habitId_date: { habitId, date },
        },
        create: {
          habitId,
          date,
          status,
          notes: notes || null,
        },
        update: {
          status,
          notes: notes || null,
        },
      });
    }

    // Recalculate streak
    const logs = await prisma.habitLog.findMany({
      where: { habitId },
      orderBy: { date: "desc" },
    });

    const logsMap = new Map(logs.map((l) => [l.date, l.status]));
    let currentStreak = 0;
    const checkDate = new Date();

    // Loop backwards day by day
    for (let i = 0; i < 365; i++) {
      const dStr = checkDate.toISOString().split("T")[0];
      const logStatus = logsMap.get(dStr);

      if (logStatus === "COMPLETED") {
        currentStreak++;
      } else if (logStatus === "SKIPPED") {
        // Rest day: does not break streak!
      } else {
        // If today is not logged yet, continue checking yesterday before breaking
        if (i > 0) {
          break;
        }
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const bestStreak = Math.max(habit.streakBest, currentStreak);

    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        streakCurrent: currentStreak,
        streakBest: bestStreak,
      },
    });

    // Check if 7 or 21 day streak badge unlock
    if (currentStreak >= 7) {
      await prisma.userBadge.upsert({
        where: {
          userId_badgeSlug: { userId: user.id, badgeSlug: "streak_7" },
        },
        create: {
          userId: user.id,
          badgeSlug: "streak_7",
          badgeName: "Consistency Master (7 Days)",
          badgeIcon: "flame",
          xpReward: 250,
        },
        update: {},
      });
    }

    return NextResponse.json({ success: true, habit: updatedHabit });
  } catch (error: any) {
    console.error("Habit log error:", error);
    return NextResponse.json({ error: "Failed to log habit" }, { status: 500 });
  }
}

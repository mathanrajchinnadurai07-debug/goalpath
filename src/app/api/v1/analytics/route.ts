import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [goals, tasks, habits, focusSessions, badges] = await Promise.all([
      prisma.goal.findMany({
        where: { userId: user.id, isArchived: false },
        include: { milestones: true },
      }),
      prisma.task.findMany({
        where: { userId: user.id },
      }),
      prisma.habit.findMany({
        where: { userId: user.id },
        include: { logs: true },
      }),
      prisma.focusSession.findMany({
        where: { userId: user.id, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.userBadge.findMany({
        where: { userId: user.id },
      }),
    ]);

    // Compute today tasks completion
    const todayTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      return t.dueDate.toISOString().split("T")[0] === todayStr;
    });
    const completedToday = todayTasks.filter((t) => t.status === "DONE").length;
    const todayCompletionRate = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

    // Time spent per category from goals
    const categoryTimeMap: Record<string, number> = {};
    goals.forEach((g) => {
      const cat = g.category || "General";
      categoryTimeMap[cat] = (categoryTimeMap[cat] || 0) + (g.progressPercent || 0);
    });

    const categoryDistribution = Object.entries(categoryTimeMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Weekly focus minutes by day
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyFocus = [0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
      const targetDate = new Date(Date.now() - (6 - dayOffset) * 24 * 60 * 60 * 1000);
      const targetDayStr = targetDate.toISOString().split("T")[0];
      const dayName = dayNames[targetDate.getDay()];

      const minutes = focusSessions
        .filter((s) => s.createdAt.toISOString().split("T")[0] === targetDayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      return { day: dayName, minutes };
    });

    // Goal Health Distribution
    const healthCounts = {
      ON_TRACK: goals.filter((g) => g.health === "ON_TRACK").length,
      AT_RISK: goals.filter((g) => g.health === "AT_RISK").length,
      BEHIND: goals.filter((g) => g.health === "BEHIND").length,
    };

    // Total XP calculation
    const totalXP = badges.reduce((sum, b) => sum + b.xpReward, 0) + focusSessions.length * 25;
    const currentLevel = Math.floor(totalXP / 500) + 1;
    const nextLevelXP = currentLevel * 500;

    return NextResponse.json({
      summary: {
        totalGoals: goals.length,
        completedGoals: goals.filter((g) => g.status === "COMPLETED").length,
        todayTotalTasks: todayTasks.length,
        todayCompletedTasks: completedToday,
        todayCompletionRate,
        totalHabits: habits.length,
        totalXP,
        currentLevel,
        nextLevelXP,
      },
      categoryDistribution,
      weeklyFocus,
      healthCounts,
      badges,
      upcomingDeadlines: goals
        .filter((g) => g.status !== "COMPLETED")
        .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
        .slice(0, 5)
        .map((g) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          deadline: g.deadline,
          progressPercent: g.progressPercent,
          health: g.health,
        })),
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
  }
}

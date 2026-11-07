import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCachedJson, setCachedJson } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = `cache:analytics:${user.id}`;
    const cached = await getCachedJson<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Single batched PostgreSQL query retrieving all dashboard datasets in 1 round-trip
    const rows = await prisma.$queryRaw<
      Array<{
        goals: any[];
        tasks: any[];
        habits_count: number;
        focus_sessions: any[];
        badges: any[];
      }>
    >`
      SELECT
        COALESCE(
          (SELECT json_agg(g) FROM (
            SELECT "id", "title", "category", "status", "deadline", "progressPercent", "health"
            FROM "Goal"
            WHERE "userId" = ${user.id} AND "isArchived" = false
          ) g),
          '[]'::json
        ) AS goals,
        COALESCE(
          (SELECT json_agg(t) FROM (
            SELECT "id", "status", "dueDate"
            FROM "Task"
            WHERE "userId" = ${user.id}
          ) t),
          '[]'::json
        ) AS tasks,
        (SELECT COUNT(*)::int FROM "Habit" WHERE "userId" = ${user.id}) AS habits_count,
        COALESCE(
          (SELECT json_agg(f) FROM (
            SELECT "id", "durationMinutes", "createdAt"
            FROM "FocusSession"
            WHERE "userId" = ${user.id} AND "createdAt" >= ${sevenDaysAgo}
          ) f),
          '[]'::json
        ) AS focus_sessions,
        COALESCE(
          (SELECT json_agg(b) FROM (
            SELECT "id", "userId", "badgeSlug", "badgeName", "description", "icon", "xpReward", "awardedAt"
            FROM "UserBadge"
            WHERE "userId" = ${user.id}
          ) b),
          '[]'::json
        ) AS badges
    `;

    const batch = rows[0] || {
      goals: [],
      tasks: [],
      habits_count: 0,
      focus_sessions: [],
      badges: [],
    };

    const goals = batch.goals || [];
    const tasks = batch.tasks || [];
    const totalHabits = Number(batch.habits_count || 0);
    const focusSessions = batch.focus_sessions || [];
    const badges = batch.badges || [];

    const todayTasks = tasks.filter((t: any) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate).toISOString().split("T")[0] === todayStr;
    });
    const completedToday = todayTasks.filter((t: any) => t.status === "DONE").length;
    const todayCompletionRate =
      todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

    const categoryTimeMap: Record<string, number> = {};
    goals.forEach((g: any) => {
      const cat = g.category || "General";
      categoryTimeMap[cat] = (categoryTimeMap[cat] || 0) + (g.progressPercent || 0);
    });

    const categoryDistribution = Object.entries(categoryTimeMap).map(([name, value]) => ({
      name,
      value,
    }));

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyFocus = [0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
      const targetDate = new Date(Date.now() - (6 - dayOffset) * 24 * 60 * 60 * 1000);
      const targetDayStr = targetDate.toISOString().split("T")[0];
      const dayName = dayNames[targetDate.getDay()];

      const minutes = focusSessions
        .filter((s: any) => new Date(s.createdAt).toISOString().split("T")[0] === targetDayStr)
        .reduce((sum: number, s: any) => sum + (s.durationMinutes || 0), 0);

      return { day: dayName, minutes };
    });

    const healthCounts = {
      ON_TRACK: goals.filter((g: any) => g.health === "ON_TRACK").length,
      AT_RISK: goals.filter((g: any) => g.health === "AT_RISK").length,
      BEHIND: goals.filter((g: any) => g.health === "BEHIND").length,
    };

    const totalXP =
      badges.reduce((sum: number, b: any) => sum + (b.xpReward || 0), 0) + focusSessions.length * 25;
    const currentLevel = Math.floor(totalXP / 500) + 1;
    const nextLevelXP = currentLevel * 500;

    const payload = {
      summary: {
        totalGoals: goals.length,
        completedGoals: goals.filter((g: any) => g.status === "COMPLETED").length,
        todayTotalTasks: todayTasks.length,
        todayCompletedTasks: completedToday,
        todayCompletionRate,
        totalHabits,
        totalXP,
        currentLevel,
        nextLevelXP,
      },
      categoryDistribution,
      weeklyFocus,
      healthCounts,
      badges,
      upcomingDeadlines: goals
        .filter((g: any) => g.status !== "COMPLETED")
        .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .slice(0, 5)
        .map((g: any) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          deadline: g.deadline,
          progressPercent: g.progressPercent,
          health: g.health,
        })),
    };

    await setCachedJson(cacheKey, payload, 60);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
  }
}

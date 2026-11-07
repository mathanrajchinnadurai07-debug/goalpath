import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, sanitizeText, validateCsrf } from "@/lib/auth";
import { getCachedJson, invalidateUserCache, setCachedJson } from "@/lib/cache";

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(300),
  goalId: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  notes: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  estimatedMinutes: z.number().min(0).max(1440).default(30),
  actualMinutes: z.number().min(0).max(1440).default(0),
  dueDate: z.string().optional().nullable(),
  quadrant: z
    .enum(["Q1_URGENT_IMPORTANT", "Q2_IMPORTANT_NOT_URGENT", "Q3_URGENT_NOT_IMPORTANT", "Q4_NEITHER"])
    .default("Q2_IMPORTANT_NOT_URGENT"),
  tags: z.string().optional(),
});

const updateTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(300).optional(),
  goalId: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  estimatedMinutes: z.number().min(0).max(1440).optional(),
  actualMinutes: z.number().min(0).max(1440).optional(),
  dueDate: z.string().optional().nullable(),
  quadrant: z
    .enum(["Q1_URGENT_IMPORTANT", "Q2_IMPORTANT_NOT_URGENT", "Q3_URGENT_NOT_IMPORTANT", "Q4_NEITHER"])
    .optional(),
  tags: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // YYYY-MM-DD
    const goalId = searchParams.get("goalId");
    const status = searchParams.get("status");
    const includeBlocks = searchParams.get("includeBlocks") === "true";

    if (includeBlocks && date && !goalId && !status) {
      const plannerCacheKey = `cache:planner:${user.id}:${date}`;
      const cachedPlanner = await getCachedJson<any>(plannerCacheKey);
      if (cachedPlanner) {
        return NextResponse.json(cachedPlanner);
      }

      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);

      // Single batched PostgreSQL query retrieving both tasks (with goal + subtasks) and timeblocks in 1 round-trip
      const rows = await prisma.$queryRaw<Array<{ tasks: any[]; blocks: any[] }>>`
        SELECT
          COALESCE(
            (SELECT json_agg(t_row) FROM (
              SELECT
                t.*,
                CASE WHEN g."id" IS NOT NULL THEN
                  json_build_object('id', g."id", 'title', g."title", 'coverColor', g."coverColor", 'category', g."category")
                ELSE NULL END AS goal,
                COALESCE(
                  (SELECT json_agg(s) FROM "Subtask" s WHERE s."taskId" = t."id"),
                  '[]'::json
                ) AS subtasks
              FROM "Task" t
              LEFT JOIN "Goal" g ON g."id" = t."goalId" AND g."userId" = ${user.id}
              WHERE t."userId" = ${user.id}
                AND ((t."dueDate" >= ${startOfDay} AND t."dueDate" <= ${endOfDay}) OR t."dueDate" IS NULL)
              ORDER BY t."sortOrder" ASC, t."createdAt" DESC
            ) t_row),
            '[]'::json
          ) AS tasks,
          COALESCE(
            (SELECT json_agg(b_row) FROM (
              SELECT
                tb.*,
                CASE WHEN tk."id" IS NOT NULL THEN
                  json_build_object('id', tk."id", 'title', tk."title", 'priority', tk."priority", 'status', tk."status")
                ELSE NULL END AS task
              FROM "TimeBlock" tb
              LEFT JOIN "Task" tk ON tk."id" = tb."taskId" AND tk."userId" = ${user.id}
              WHERE tb."userId" = ${user.id} AND tb."date" = ${date}
              ORDER BY tb."startTime" ASC
            ) b_row),
            '[]'::json
          ) AS blocks
      `;

      const payload = {
        tasks: rows[0]?.tasks || [],
        blocks: rows[0]?.blocks || [],
      };
      await setCachedJson(plannerCacheKey, payload, 60);
      return NextResponse.json(payload);
    }

    if (!goalId && !status) {
      const todayKey = date || new Date().toISOString().split("T")[0];
      const tasksCacheKey = `cache:tasks:${user.id}:${todayKey}`;
      const cachedTasks = await getCachedJson<any>(tasksCacheKey);
      if (cachedTasks) {
        return NextResponse.json(cachedTasks);
      }
    }

    const where: any = { userId: user.id };
    if (goalId) where.goalId = goalId;
    if (status) where.status = status;

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      where.OR = [
        { dueDate: { gte: startOfDay, lte: endOfDay } },
        { dueDate: null }, // Unscheduled tasks also available in backlog
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        goal: { select: { id: true, title: true, coverColor: true, category: true } },
        subtasks: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    if (!goalId && !status) {
      const todayKey = date || new Date().toISOString().split("T")[0];
      await setCachedJson(`cache:tasks:${user.id}:${todayKey}`, { tasks }, 60);
    }

    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
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
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error as any).issues?.[0]?.message || "Invalid task input" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // IDOR verification for linked goal
    if (data.goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: data.goalId, userId: user.id },
      });
      if (!goal) {
        return NextResponse.json({ error: "Goal not found or does not belong to you" }, { status: 403 });
      }
    }

    // IDOR verification for linked milestone
    if (data.milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: { id: data.milestoneId, goal: { userId: user.id } },
      });
      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found or does not belong to you" }, { status: 403 });
      }
    }

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        goalId: data.goalId || null,
        milestoneId: data.milestoneId || null,
        title: sanitizeText(data.title),
        notes: data.notes ? sanitizeText(data.notes) : null,
        priority: data.priority,
        status: data.status,
        estimatedMinutes: data.estimatedMinutes,
        actualMinutes: data.actualMinutes,
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
        quadrant: data.quadrant,
        tags: data.tags ? sanitizeText(data.tags) : null,
      },
      include: {
        goal: { select: { id: true, title: true, coverColor: true } },
      },
    });

    await invalidateUserCache(user.id);
    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error as any).issues?.[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;

    // Verify ownership
    const existing = await prisma.task.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // IDOR protection on goalId update
    if (updates.goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: updates.goalId, userId: user.id },
      });
      if (!goal) {
        return NextResponse.json({ error: "Target goal does not belong to you" }, { status: 403 });
      }
    }

    const cleanData: any = {};
    if (updates.title !== undefined) cleanData.title = sanitizeText(updates.title);
    if (updates.notes !== undefined) cleanData.notes = updates.notes ? sanitizeText(updates.notes) : null;
    if (updates.priority !== undefined) cleanData.priority = updates.priority;
    if (updates.status !== undefined) cleanData.status = updates.status;
    if (updates.estimatedMinutes !== undefined) cleanData.estimatedMinutes = updates.estimatedMinutes;
    if (updates.actualMinutes !== undefined) cleanData.actualMinutes = updates.actualMinutes;
    if (updates.dueDate !== undefined) cleanData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    if (updates.quadrant !== undefined) cleanData.quadrant = updates.quadrant;
    if (updates.goalId !== undefined) cleanData.goalId = updates.goalId;
    if (updates.milestoneId !== undefined) cleanData.milestoneId = updates.milestoneId;
    if (updates.tags !== undefined) cleanData.tags = updates.tags ? sanitizeText(updates.tags) : null;

    const updated = await prisma.task.update({
      where: { id },
      data: cleanData,
      include: {
        goal: { select: { id: true, title: true, coverColor: true } },
      },
    });

    await invalidateUserCache(user.id);
    return NextResponse.json({ success: true, task: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
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
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    await prisma.task.deleteMany({
      where: { id, userId: user.id },
    });

    await invalidateUserCache(user.id);
    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}

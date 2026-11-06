import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, sanitizeText, validateCsrf } from "@/lib/auth";

const createGoalSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(255),
  whyItMatters: z.string().min(5, "Please elaborate why this goal matters").max(1000),
  category: z.string().default("Personal"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]).default("IN_PROGRESS"),
  coverColor: z.string().default("#4f46e5"),
  coverIcon: z.string().default("target"),
  startDate: z.string().optional(),
  deadline: z.string(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(2).max(255),
        dueDate: z.string().optional(),
      })
    )
    .optional(),
  plan: z
    .object({
      actionSteps: z.array(z.string()).default([]),
      resourcesNeeded: z.array(z.string()).default([]),
      obstaclesSolutions: z.array(z.object({ obstacle: z.string(), solution: z.string() })).default([]),
      supportPeople: z.array(z.string()).default([]),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {
      userId: user.id,
    };

    if (category && category !== "ALL") where.category = category;
    if (priority && priority !== "ALL") where.priority = priority;
    if (status && status !== "ALL") {
      where.status = status;
    } else {
      where.isArchived = false; // by default don't show archived
    }
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search } },
        { whyItMatters: { contains: search } },
      ];
    }

    const goals = await prisma.goal.findMany({
      where,
      include: {
        milestones: {
          select: { id: true, title: true, isCompleted: true, order: true },
          orderBy: { order: "asc" },
        },
        tasks: {
          select: { id: true, title: true, status: true, priority: true, dueDate: true },
        },
      },
      orderBy: [{ priority: "desc" }, { deadline: "asc" }],
    });

    return NextResponse.json({ goals });
  } catch (error: any) {
    console.error("Get goals error:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
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
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error as any).issues?.[0]?.message || (parsed.error as any).errors?.[0]?.message || "Invalid goal data" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const deadlineDate = new Date(data.deadline);

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: sanitizeText(data.title),
        whyItMatters: sanitizeText(data.whyItMatters),
        category: sanitizeText(data.category),
        priority: data.priority,
        status: data.status,
        coverColor: data.coverColor,
        coverIcon: data.coverIcon,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        deadline: deadlineDate,
        progressPercent: 0,
        health: "ON_TRACK",
        milestones: data.milestones
          ? {
              create: data.milestones.map((m, idx) => ({
                title: sanitizeText(m.title),
                order: idx + 1,
                isCompleted: false,
                dueDate: m.dueDate ? new Date(m.dueDate) : null,
              })),
            }
          : undefined,
        plan: data.plan
          ? {
              create: {
                actionSteps: JSON.stringify(data.plan.actionSteps.map(sanitizeText)),
                resourcesNeeded: JSON.stringify(data.plan.resourcesNeeded.map(sanitizeText)),
                obstaclesSolutions: JSON.stringify(
                  data.plan.obstaclesSolutions.map((os) => ({
                    obstacle: sanitizeText(os.obstacle),
                    solution: sanitizeText(os.solution),
                  }))
                ),
                supportPeople: JSON.stringify(data.plan.supportPeople.map(sanitizeText)),
              },
            }
          : undefined,
      },
      include: {
        milestones: true,
        plan: true,
      },
    });

    return NextResponse.json({ success: true, goal });
  } catch (error: any) {
    console.error("Create goal error:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

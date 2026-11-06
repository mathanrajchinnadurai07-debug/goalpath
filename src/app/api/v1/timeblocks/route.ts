import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const timeBlockSchema = z.object({
  title: z.string().min(1),
  date: z.string(), // YYYY-MM-DD
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  color: z.string().default("#3b82f6"),
  taskId: z.string().optional().nullable(),
  isCompleted: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const blocks = await prisma.timeBlock.findMany({
      where: {
        userId: user.id,
        date,
      },
      include: {
        task: {
          select: { id: true, title: true, priority: true, status: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ blocks });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch time blocks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = timeBlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid time block format" }, { status: 400 });
    }

    const data = parsed.data;

    const block = await prisma.timeBlock.create({
      data: {
        userId: user.id,
        title: data.title,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        color: data.color,
        taskId: data.taskId || null,
        isCompleted: data.isCompleted || false,
      },
      include: {
        task: {
          select: { id: true, title: true, priority: true },
        },
      },
    });

    return NextResponse.json({ success: true, block });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create time block" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Block ID required" }, { status: 400 });
    }

    const existing = await prisma.timeBlock.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    const updated = await prisma.timeBlock.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ success: true, block: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Block ID required" }, { status: 400 });
    }

    await prisma.timeBlock.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true, message: "Block deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete block" }, { status: 500 });
  }
}

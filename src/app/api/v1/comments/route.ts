import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, sanitizeText, validateCsrf } from "@/lib/auth";

const commentSchema = z.object({
  goalId: z.string().optional().nullable(),
  groupGoalId: z.string().optional().nullable(),
  content: z.string().min(1, "Comment content cannot be empty").max(2000, "Comment cannot exceed 2000 characters"),
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
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error as any).issues?.[0]?.message || "Invalid comment" },
        { status: 400 }
      );
    }

    const { goalId, groupGoalId, content } = parsed.data;
    if (!goalId && !groupGoalId) {
      return NextResponse.json({ error: "Either goalId or groupGoalId must be specified" }, { status: 400 });
    }

    // IDOR / BOLA Prevention: Verify access permission
    if (goalId) {
      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
        select: { userId: true },
      });

      if (!goal) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }

      // If not personal owner, check if user shares a group or accountability relation
      if (goal.userId !== user.id) {
        return NextResponse.json({ error: "Access denied to goal comments" }, { status: 403 });
      }
    }

    if (groupGoalId) {
      const groupGoal = await prisma.groupGoal.findUnique({
        where: { id: groupGoalId },
        select: { groupId: true },
      });

      if (!groupGoal) {
        return NextResponse.json({ error: "Group goal not found" }, { status: 404 });
      }

      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: groupGoal.groupId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json({ error: "Access denied. You are not a member of this group." }, { status: 403 });
      }
    }

    const cleanContent = sanitizeText(content);

    const comment = await prisma.goalComment.create({
      data: {
        userId: user.id,
        goalId: goalId || null,
        groupGoalId: groupGoalId || null,
        content: cleanContent,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ success: true, comment });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

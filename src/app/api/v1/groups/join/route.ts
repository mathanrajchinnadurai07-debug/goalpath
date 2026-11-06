import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const joinSchema = z.object({
  inviteCode: z.string().min(4),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { inviteCode: parsed.data.inviteCode.trim().toUpperCase() },
    });

    if (!group) {
      return NextResponse.json({ error: "No group found with this invite code." }, { status: 404 });
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "You are already a member of this group." }, { status: 400 });
    }

    const membership = await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.id,
        role: "MEMBER",
      },
    });

    return NextResponse.json({ success: true, group, membership });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
  }
}

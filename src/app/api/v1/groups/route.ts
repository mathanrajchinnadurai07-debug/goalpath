import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const createGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  description: z.string().min(5, "Description required"),
  isPublic: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.id },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
            goals: true,
            challenges: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    return NextResponse.json({
      groups: memberships.map((m) => ({
        ...m.group,
        currentUserRole: m.role,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid group data" }, { status: 400 });
    }

    const { name, description, isPublic } = parsed.data;
    const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    const group = await prisma.group.create({
      data: {
        ownerId: user.id,
        name,
        description,
        inviteCode,
        isPublic,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}

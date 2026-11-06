import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const gratitudeSchema = z.object({
  content: z.string().min(3, "Gratitude entry must be at least 3 characters"),
  category: z.string().default("General"),
  isPublic: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "my"; // "my" or "public"

    if (filter === "public") {
      // Community public gratitude wall
      const entries = await prisma.gratitudeEntry.findMany({
        where: { isPublic: true },
        include: {
          user: {
            select: { name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json({ entries });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entries = await prisma.gratitudeEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ entries });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch gratitude entries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = gratitudeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid gratitude entry" }, { status: 400 });
    }

    const entry = await prisma.gratitudeEntry.create({
      data: {
        userId: user.id,
        content: parsed.data.content,
        category: parsed.data.category,
        isPublic: parsed.data.isPublic,
      },
    });

    // Check gratitude badge
    await prisma.userBadge.upsert({
      where: {
        userId_badgeSlug: { userId: user.id, badgeSlug: "gratitude_champion" },
      },
      create: {
        userId: user.id,
        badgeSlug: "gratitude_champion",
        badgeName: "Heart of Appreciation",
        badgeIcon: "heart",
        xpReward: 150,
      },
      update: {},
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to save gratitude entry" }, { status: 500 });
  }
}

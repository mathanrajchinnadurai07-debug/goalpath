import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, sanitizeText, validateCsrf } from "@/lib/auth";

const supportPersonSchema = z.object({
  name: z.string().min(2, "Name required").max(100),
  relationship: z.string().min(2, "Relationship required (e.g. Mentor, Friend, Colleague)").max(100),
  goalId: z.string().optional().nullable(),
  howTheyHelped: z.string().min(3, "Please detail how they helped you").max(1000),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const people = await prisma.supportPerson.findMany({
      where: { userId: user.id },
      include: {
        goal: { select: { id: true, title: true, coverColor: true } },
        thankYouNotes: { orderBy: { sentAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ people });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch support people" }, { status: 500 });
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
    const parsed = supportPersonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error as any).issues?.[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // IDOR verification: Check goal ownership
    if (data.goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: data.goalId, userId: user.id },
      });
      if (!goal) {
        return NextResponse.json({ error: "Goal not found or does not belong to you" }, { status: 403 });
      }
    }

    const person = await prisma.supportPerson.create({
      data: {
        userId: user.id,
        name: sanitizeText(data.name),
        relationship: sanitizeText(data.relationship),
        goalId: data.goalId || null,
        howTheyHelped: sanitizeText(data.howTheyHelped),
        email: data.email || null,
        phone: data.phone || null,
      },
      include: {
        goal: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, person });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to add support person" }, { status: 500 });
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
      return NextResponse.json({ error: "Person ID required" }, { status: 400 });
    }

    await prisma.supportPerson.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true, message: "Support person removed" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to remove support person" }, { status: 500 });
  }
}

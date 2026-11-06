import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createAuditLog, getCurrentUser, revokeAllUserSessions, validateCsrf } from "@/lib/auth";

// Zero-knowledge user management: returns metadata ONLY, never private goals or journal notes!
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: any = {};
    if (search && search.trim()) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuspended: true,
        twoFactorEnabled: true,
        language: true,
        createdAt: true,
        _count: {
          select: {
            goals: true,
            habits: true,
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// Suspend or activate user
export async function PATCH(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, isSuspended } = body;

    if (!userId || typeof isSuspended !== "boolean") {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Protect against self-suspension
    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot suspend your own administrator account." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isSuspended },
      select: { id: true, email: true, isSuspended: true },
    });

    if (isSuspended) {
      // Invalidate all sessions immediately across PostgreSQL DB and Redis
      await revokeAllUserSessions(userId);
    }

    await createAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: isSuspended ? "ADMIN_USER_SUSPENDED" : "ADMIN_USER_UNSUSPENDED",
      resource: "User",
      details: `Target user ${updated.email} suspended=${isSuspended}`,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
  }
}

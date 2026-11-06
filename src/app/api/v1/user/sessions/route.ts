import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { getCurrentUser, revokeAllUserSessions, SESSION_COOKIE_NAME, validateCsrf } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        token: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = sessions.map((s) => ({
      id: s.id,
      isCurrent: s.token === currentToken,
      ipAddress: s.ipAddress || "Unknown IP",
      userAgent: s.userAgent || "Unknown Device",
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));

    return NextResponse.json({ sessions: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

// POST: Revoke all OTHER sessions across DB and Redis
export async function POST(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    // Use revokeAllUserSessions passing exceptToken
    await revokeAllUserSessions(user.id, currentToken);

    return NextResponse.json({ success: true, message: "Logged out from all other devices." });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to revoke sessions" }, { status: 500 });
  }
}

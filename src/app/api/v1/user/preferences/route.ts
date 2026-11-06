import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { getCurrentUser, sanitizeText, SESSION_COOKIE_NAME, validateCsrf } from "@/lib/auth";

const prefSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  timezone: z.string().max(100).optional(),
  language: z.enum(["en", "ta"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  avatarUrl: z
    .string()
    .regex(/^(https?:\/\/|\/avatars\/)/, "Avatar URL must use http, https, or relative avatar path")
    .optional()
    .or(z.literal("")),
});

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
    const parsed = prefSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error as any).issues?.[0]?.message || "Invalid preference payload" },
        { status: 400 }
      );
    }

    const cleanData: any = {};
    if (parsed.data.name !== undefined) cleanData.name = sanitizeText(parsed.data.name);
    if (parsed.data.timezone !== undefined) cleanData.timezone = parsed.data.timezone;
    if (parsed.data.language !== undefined) cleanData.language = parsed.data.language;
    if (parsed.data.theme !== undefined) cleanData.theme = parsed.data.theme;
    if (parsed.data.avatarUrl !== undefined) cleanData.avatarUrl = parsed.data.avatarUrl;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: cleanData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        timezone: true,
        language: true,
        theme: true,
        role: true,
        twoFactorEnabled: true,
        isSuspended: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Update Redis cache for this user's current session
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (currentToken) {
      await redis.set(`session:${currentToken}`, JSON.stringify(updated), "EX", 30 * 24 * 60 * 60).catch(() => {});
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}

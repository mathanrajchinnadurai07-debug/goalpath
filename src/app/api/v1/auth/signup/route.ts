import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createAuditLog, createSession, hashPassword, sanitizeText, SESSION_COOKIE_NAME, validateCsrf } from "@/lib/auth";
import { checkRateLimitAsync } from "@/lib/rate-limit";

const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  timezone: z.string().optional().default("UTC"),
  language: z.enum(["en", "ta"]).optional().default("en"),
  mainGoal: z.string().optional(),
  category: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    const limitCheck = await checkRateLimitAsync(`signup:ip:${ip}`, { maxAttempts: 5, windowMs: 300000 });
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Too many sign-up attempts. Please wait ${limitCheck.retryAfterSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error as any).issues?.[0]?.message || (parsed.error as any).errors?.[0]?.message || "Invalid input data." },
        { status: 400 }
      );
    }

    const { email, password, name, timezone, language, mainGoal, category } = parsed.data;
    const lowerEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: lowerEmail,
        passwordHash,
        name: sanitizeText(name),
        timezone,
        language,
        role: "USER",
        emailVerified: true,
      },
    });

    // If mainGoal was provided during onboarding wizard, create their first goal
    if (mainGoal && mainGoal.trim()) {
      await prisma.goal.create({
        data: {
          userId: user.id,
          title: sanitizeText(mainGoal.trim()),
          whyItMatters: "My primary North Star goal set during onboarding.",
          category: sanitizeText(category || "Personal"),
          priority: "HIGH",
          status: "IN_PROGRESS",
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days out
          coverColor: "#4f46e5",
          coverIcon: "target",
          milestones: {
            create: [
              { title: "Define roadmap and core milestones", order: 1, isCompleted: false },
              { title: "Execute phase 1 actions", order: 2, isCompleted: false },
            ],
          },
        },
      });
    }

    // Award welcome badge
    await prisma.userBadge.create({
      data: {
        userId: user.id,
        badgeSlug: "welcome_explorer",
        badgeName: "Welcome Explorer",
        badgeIcon: "compass",
        xpReward: 50,
      },
    });

    const { token, session } = await createSession(user.id, { ip, userAgent });

    await createAuditLog({
      userId: user.id,
      actorEmail: lowerEmail,
      action: "USER_SIGNUP",
      resource: "Auth",
      details: "New user account created via signup wizard",
      ipAddress: ip,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
        theme: user.theme,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: session.expiresAt,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

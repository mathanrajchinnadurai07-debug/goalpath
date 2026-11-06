import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createAuditLog, createSession, SESSION_COOKIE_NAME, validateCsrf, verifyPassword } from "@/lib/auth";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { verifyTOTP } from "@/lib/totp";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password format." }, { status: 400 });
    }

    const { email, password, totpCode } = parsed.data;
    const lowerEmail = email.toLowerCase();

    // Distributed Rate limiting:
    // 1. Per IP: 10 attempts per 5 minutes
    // 2. Per Account Email: 5 failed attempts per 10 minutes to stop brute-forcing across proxies
    const ipLimit = await checkRateLimitAsync(`login:ip:${ip}`, {
      maxAttempts: 10,
      windowMs: 300000,
      lockoutMs: 600000,
    });
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts from this network. Please wait ${ipLimit.retryAfterSec} seconds.` },
        { status: 429 }
      );
    }

    const emailLimit = await checkRateLimitAsync(`login:email:${lowerEmail}`, {
      maxAttempts: 5,
      windowMs: 600000,
      lockoutMs: 900000,
    });
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: `Account locked due to consecutive failed attempts. Please wait ${emailLimit.retryAfterSec} seconds or reset password.` },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (!user || user.isSuspended) {
      return NextResponse.json({ error: "Invalid email or credentials." }, { status: 401 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      await createAuditLog({
        actorEmail: lowerEmail,
        action: "LOGIN_FAILED",
        resource: "Auth",
        details: "Incorrect password attempt",
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: "Invalid email or credentials." }, { status: 401 });
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        return NextResponse.json({ requires2FA: true, message: "Please provide your 6-digit 2FA code." }, { status: 200 });
      }

      let valid2FA = false;
      if (user.twoFactorSecret && verifyTOTP(totpCode, user.twoFactorSecret)) {
        valid2FA = true;
      } else if (user.backupCodes) {
        // Check backup codes
        const codes: string[] = JSON.parse(user.backupCodes);
        const index = codes.findIndex((c) => c === totpCode.trim().toUpperCase());
        if (index !== -1) {
          valid2FA = true;
          // Consume backup code
          codes.splice(index, 1);
          await prisma.user.update({
            where: { id: user.id },
            data: { backupCodes: JSON.stringify(codes) },
          });
        }
      }

      if (!valid2FA) {
        return NextResponse.json({ error: "Invalid 2FA code or backup code." }, { status: 401 });
      }
    }

    // Create session (stored in DB + Redis)
    const { token, session } = await createSession(user.id, { ip, userAgent });

    await createAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "LOGIN_SUCCESS",
      resource: "Auth",
      details: "Session established successfully",
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
    console.error("Login route error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

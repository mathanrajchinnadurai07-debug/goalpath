import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { createAuditLog, hashPassword, revokeAllUserSessions, validateCsrf } from "@/lib/auth";
import { checkRateLimitAsync } from "@/lib/rate-limit";

const requestResetSchema = z.object({
  action: z.literal("request"),
  email: z.string().email(),
});

const confirmResetSchema = z.object({
  action: z.literal("confirm").optional().default("confirm"),
  email: z.string().email(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number"),
  token: z.string().min(16, "Invalid reset token format"),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await req.json();

    // 1. Handle Reset Token Request
    if (body.action === "request") {
      const parsedReq = requestResetSchema.safeParse(body);
      if (!parsedReq.success) {
        return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
      }

      const email = parsedReq.data.email.toLowerCase();
      const ipLimit = await checkRateLimitAsync(`reset:req:ip:${ip}`, { maxAttempts: 5, windowMs: 300000 });
      const emailLimit = await checkRateLimitAsync(`reset:req:email:${email}`, { maxAttempts: 3, windowMs: 900000 });

      if (!ipLimit.allowed || !emailLimit.allowed) {
        return NextResponse.json({ error: "Too many reset requests. Please wait." }, { status: 429 });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        await redis.set(`pwd-reset:${token}`, email, "EX", 900); // 15 minutes TTL

        await createAuditLog({
          userId: user.id,
          actorEmail: email,
          action: "PASSWORD_RESET_REQUESTED",
          resource: "Auth",
          ipAddress: ip,
        });

        return NextResponse.json({
          success: true,
          message: "If an account exists, a reset instructions token has been dispatched.",
          ...(process.env.NODE_ENV !== "production" ? { resetToken: token } : {}),
        });
      }

      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset instructions token has been dispatched.",
      });
    }

    // 2. Handle Reset Confirmation (New Password Submission)
    const parsedConfirm = confirmResetSchema.safeParse(body);
    if (!parsedConfirm.success) {
      return NextResponse.json(
        {
          error:
            (parsedConfirm.error as any).issues?.[0]?.message ||
            "Password must be at least 8 characters with 1 uppercase letter and 1 number.",
        },
        { status: 400 }
      );
    }

    const { email, newPassword, token } = parsedConfirm.data;
    const lowerEmail = email.toLowerCase();

    // Verify token against Redis
    const storedEmail = await redis.get(`pwd-reset:${token}`);
    if (!storedEmail || storedEmail.toLowerCase() !== lowerEmail) {
      return NextResponse.json({ error: "Invalid, expired, or already used reset token." }, { status: 400 });
    }

    // Invalidate token immediately to prevent replay
    await redis.del(`pwd-reset:${token}`);

    const user = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate all active sessions in DB and Redis
    await revokeAllUserSessions(user.id);

    await createAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "PASSWORD_RESET_SUCCESS",
      resource: "Auth",
      details: "Password reset completed with verified cryptographic token, all sessions revoked",
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: "Password has been successfully updated. Please log in.",
    });
  } catch (error: any) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}

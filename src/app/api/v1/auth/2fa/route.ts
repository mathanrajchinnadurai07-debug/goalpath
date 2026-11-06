import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { createAuditLog, getCurrentUser, validateCsrf, verifyPassword } from "@/lib/auth";
import { generateBackupCodes, generateBase32Secret, verifyTOTP } from "@/lib/totp";

// GET: Generate new TOTP secret & QR string for current user
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = generateBase32Secret(20);
    const otpAuthUrl = `otpauth://totp/GoalPath:${encodeURIComponent(
      user.email
    )}?secret=${secret}&issuer=GoalPath&period=30`;

    return NextResponse.json({
      secret,
      otpAuthUrl,
      twoFactorEnabled: user.twoFactorEnabled,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to initialize 2FA setup" }, { status: 500 });
  }
}

// POST: Confirm 2FA code, enable 2FA, generate backup codes
const verifySchema = z.object({
  secret: z.string().min(16),
  code: z.string().length(6),
});

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
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid 6-digit TOTP code format" }, { status: 400 });
    }

    const { secret, code } = parsed.data;

    const isValid = verifyTOTP(code, secret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid code. Check your authenticator app time." }, { status: 400 });
    }

    const backupCodes = generateBackupCodes(8);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        backupCodes: JSON.stringify(backupCodes),
      },
    });

    await createAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "2FA_ENABLED",
      resource: "Auth",
      details: "Two-factor authentication successfully enabled",
    });

    return NextResponse.json({
      success: true,
      message: "Two-Factor Authentication is now active.",
      backupCodes,
    });
  } catch (error: any) {
    console.error("2FA verify error:", error);
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 });
  }
}

// DELETE: Disable 2FA - Requires Password or TOTP Verification
const disable2FASchema = z.object({
  password: z.string().min(1).optional(),
  code: z.string().optional(),
});

export async function DELETE(req: NextRequest) {
  try {
    if (!validateCsrf(req)) {
      return NextResponse.json({ error: "Invalid CSRF origin" }, { status: 403 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = disable2FASchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Password or 2FA code is required to disable 2FA." }, { status: 400 });
    }

    const { password, code } = parsed.data;
    if (!password && !code) {
      return NextResponse.json({ error: "Password or 2FA code is required to disable 2FA." }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let authenticated = false;
    if (password) {
      authenticated = await verifyPassword(password, dbUser.passwordHash);
    } else if (code && dbUser.twoFactorSecret) {
      authenticated = verifyTOTP(code, dbUser.twoFactorSecret);
    }

    if (!authenticated) {
      return NextResponse.json({ error: "Authentication failed. Incorrect password or 2FA code." }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
      },
    });

    await createAuditLog({
      userId: user.id,
      actorEmail: user.email,
      action: "2FA_DISABLED",
      resource: "Auth",
      details: "Two-factor authentication disabled with verified credentials",
    });

    return NextResponse.json({ success: true, message: "Two-Factor Authentication has been disabled." });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
  }
}

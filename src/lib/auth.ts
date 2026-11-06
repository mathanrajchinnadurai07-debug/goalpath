import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import prisma from "./prisma";
import redis from "./redis";

export const SESSION_COOKIE_NAME = "goalpath_session";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, reqHeaders?: { ip?: string; userAgent?: string }) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      ipAddress: reqHeaders?.ip || null,
      userAgent: reqHeaders?.userAgent || null,
      expiresAt,
    },
    include: {
      user: {
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
      },
    },
  });

  // Store active session in Redis for distributed multi-instance lookup
  try {
    await redis.set(`session:${token}`, JSON.stringify(session.user), "EX", SESSION_TTL_SECONDS);
  } catch (err) {
    console.warn("Redis session store fallback:", err);
  }

  return { session, token };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  // 1. Attempt fast lookup in Redis
  try {
    const cachedUser = await redis.get(`session:${sessionToken}`);
    if (cachedUser) {
      const parsed = JSON.parse(cachedUser);
      if (!parsed.isSuspended) {
        return parsed;
      }
    }
  } catch {}

  // 2. Query Database if not in Redis
  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: {
      user: {
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
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date() || session.user.isSuspended) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    await redis.del(`session:${sessionToken}`).catch(() => {});
    return null;
  }

  // Populate Redis cache
  await redis.set(`session:${sessionToken}`, JSON.stringify(session.user), "EX", SESSION_TTL_SECONDS).catch(() => {});

  return session.user;
}

export async function revokeSession(token: string) {
  await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  await redis.del(`session:${token}`).catch(() => {});
}

export async function revokeAllUserSessions(userId: string, exceptToken?: string) {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        ...(exceptToken ? { token: { not: exceptToken } } : {}),
      },
      select: { token: true },
    });
    for (const s of sessions) {
      await redis.del(`session:${s.token}`).catch(() => {});
    }
    await prisma.session.deleteMany({
      where: {
        userId,
        ...(exceptToken ? { token: { not: exceptToken } } : {}),
      },
    });
  } catch (err) {
    console.error("Failed to revoke user sessions:", err);
  }
}

export async function createAuditLog(params: {
  userId?: string | null;
  actorEmail: string;
  action: string;
  resource: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        actorEmail: params.actorEmail,
        action: params.action,
        resource: params.resource,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

// CSRF Origin verification for state-changing operations
export function validateCsrf(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  if (!origin && !referer) {
    return true; // Non-browser API client or same-origin direct request
  }

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return true;
    } catch {}
  }

  if (referer && host) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === host) return true;
    } catch {}
  }

  return false;
}

// Sanitize user text inputs to prevent XSS
export function sanitizeText(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

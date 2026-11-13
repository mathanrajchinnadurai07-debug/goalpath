import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const envConfigured = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    DIRECT_URL: Boolean(process.env.DIRECT_URL?.trim()),
    REDIS_URL: Boolean(process.env.REDIS_URL?.trim()),
    APP_SECRET: Boolean(process.env.APP_SECRET?.trim()),
    NEXTAUTH_URL: Boolean(process.env.NEXTAUTH_URL?.trim()),
  };

  let dbStatus: "ok" | "error" = "error";
  let dbError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "ok";
  } catch (err: unknown) {
    dbError = err instanceof Error ? err.name : "DatabaseConnectionError";
  }

  let redisStatus: "ok" | "error" = "error";
  let redisError: string | undefined;
  try {
    await redis.set("health:ping", "1", "EX", 10);
    redisStatus = "ok";
  } catch (err: unknown) {
    redisError = err instanceof Error ? err.name : "RedisConnectionError";
  }

  const healthy = dbStatus === "ok" && redisStatus === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      envConfigured,
      services: {
        database: dbError ? { status: dbStatus, error: dbError } : { status: dbStatus },
        redis: redisError ? { status: redisStatus, error: redisError } : { status: redisStatus },
      },
    },
    { status: healthy ? 200 : 503 }
  );
}

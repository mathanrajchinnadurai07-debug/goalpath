export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    let seedUserCount = 0;
    try {
      const { prisma } = await import("@/lib/prisma");
      seedUserCount = await prisma.user.count({
        where: {
          isSeed: true,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown database error";
      console.error("⚠️ Production startup seed check could not query database:", message);
      return;
    }

    if (seedUserCount > 0) {
      console.error(
        `❌ FATAL: Production startup aborted! DATABASE_URL contains ${seedUserCount} development seed user(s) with is_seed=true. Refusing to start when NODE_ENV=production.`
      );
      process.exit(1);
    }
  }
}

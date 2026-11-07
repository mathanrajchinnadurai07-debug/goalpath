export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { prisma } = await import("@/lib/prisma");

    const seedUserCount = await prisma.user.count({
      where: {
        isSeed: true,
      },
    });

    if (seedUserCount > 0) {
      console.error(
        `❌ FATAL: Production startup aborted! DATABASE_URL contains ${seedUserCount} development seed user(s) with is_seed=true. Refusing to start when NODE_ENV=production.`
      );
      process.exit(1);
    }
  }
}

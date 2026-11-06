export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { prisma } = await import("@/lib/prisma");
    const devSeedEmails = [
      "sarah.chen@example.com",
      "kavitha.raman@example.com",
      "admin@goalpath.app",
    ];

    const seedUserCount = await prisma.user.count({
      where: {
        email: { in: devSeedEmails },
      },
    });

    if (seedUserCount > 0) {
      console.error(
        `❌ FATAL: Production startup aborted! DATABASE_URL contains ${seedUserCount} development seed user(s) (${devSeedEmails.join(", ")}). Refusing to start when NODE_ENV=production.`
      );
      process.exit(1);
    }
  }
}

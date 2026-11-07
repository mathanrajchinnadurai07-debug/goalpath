import { PrismaClient } from "@prisma/client";

async function verifyProductionDatabase() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const prisma = new PrismaClient();
  try {
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

    console.log("✅ Production database startup check passed: 0 users with is_seed=true found.");
  } finally {
    await prisma.$disconnect();
  }
}

verifyProductionDatabase().catch((err) => {
  console.error("❌ Failed to verify production database during startup:", err instanceof Error ? err.message : "Unknown error");
  process.exit(1);
});

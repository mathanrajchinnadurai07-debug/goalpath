import { PrismaClient } from "@prisma/client";

const DEV_SEED_EMAILS = [
  "sarah.chen@example.com",
  "kavitha.raman@example.com",
  "admin@goalpath.app",
];

async function verifyProductionDatabase() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const prisma = new PrismaClient();
  try {
    const seedUserCount = await prisma.user.count({
      where: {
        email: { in: DEV_SEED_EMAILS },
      },
    });

    if (seedUserCount > 0) {
      console.error(
        `❌ FATAL: Production startup aborted! DATABASE_URL contains ${seedUserCount} development seed user(s) (${DEV_SEED_EMAILS.join(", ")}). Refusing to start when NODE_ENV=production.`
      );
      process.exit(1);
    }

    console.log("✅ Production database startup check passed: 0 development seed users found.");
  } finally {
    await prisma.$disconnect();
  }
}

verifyProductionDatabase().catch((err) => {
  console.error("❌ Failed to verify production database during startup:", err instanceof Error ? err.message : "Unknown error");
  process.exit(1);
});

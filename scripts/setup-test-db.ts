import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";

async function main() {
  console.log("════════════════════════════════════════════════════════════════════════");
  console.log("  GoalPath Isolated Test Database Setup (goalpath_test)");
  console.log("════════════════════════════════════════════════════════════════════════");

  const prisma = new PrismaClient();
  try {
    try {
      await prisma.$executeRawUnsafe(`CREATE DATABASE goalpath_test;`);
      console.log("✅ Created separate PostgreSQL database: goalpath_test");
    } catch (err: any) {
      if (String(err.message).includes("already exists") || String(err.message).includes("42P04")) {
        console.log("ℹ️ Separate PostgreSQL database 'goalpath_test' already exists.");
      } else {
        throw err;
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  const baseDbUrl = process.env.DATABASE_URL || "";
  const parsed = new URL(baseDbUrl);
  parsed.pathname = "/goalpath_test";
  const testDbUrl = parsed.toString();

  // Save to gitignored .env.test
  const envContent = fs.readFileSync(".env", "utf8");
  const testEnvContent = envContent.replace(/DATABASE_URL="[^"]+"/, `DATABASE_URL="${testDbUrl}"`);
  fs.writeFileSync(".env.test", testEnvContent, "utf8");

  console.log("▶ Applying Prisma migrations to isolated database 'goalpath_test'...");
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: "inherit",
  });

  console.log("▶ Seeding isolated test database 'goalpath_test'...");
  execSync("npx tsx scripts/seed.ts", {
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
      NODE_ENV: "development",
      ALLOW_REMOTE_SEED: "true",
    },
    stdio: "inherit",
  });

  console.log("✅ Isolated test database 'goalpath_test' migrated and seeded!");
}

main().catch((e) => {
  console.error("Test DB setup failed:", e.message);
  process.exit(1);
});

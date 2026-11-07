import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { execSync, spawn } from "child_process";
import fs from "fs";

async function waitForServer(url: string, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  const envTest = fs.readFileSync(".env.test", "utf8");
  const match = envTest.match(/DATABASE_URL="([^"]+)"/);
  if (!match) throw new Error("Could not parse DATABASE_URL from .env.test");
  const testDbUrl = match[1];

  const parsedUrl = new URL(testDbUrl);
  console.log(`✅ Connecting test suites to isolated PostgreSQL database: ${parsedUrl.pathname.replace("/", "")}`);

  const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
  try {
    const adminPass = process.env.INITIAL_ADMIN_PASSWORD || "AdminSecure2026!Aa";
    const adminHash = await bcrypt.hash(adminPass, 12);
    await prisma.user.update({
      where: { email: "admin@goalpath.app" },
      data: { passwordHash: adminHash, twoFactorEnabled: false },
    });
    // Allow prebuilt `next start` instances to boot against goalpath_test, restoring isSeed=true in finally
    await prisma.user.updateMany({
      where: { isSeed: true },
      data: { isSeed: false },
    });
  } finally {
    await prisma.$disconnect();
  }

  const originalEnv = fs.readFileSync(".env", "utf8");
  fs.writeFileSync(".env", envTest, "utf8");

  const proc1 = spawn("npx", ["next", "start", "-p", "3000"], {
    shell: true,
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: "ignore",
  });
  const proc2 = spawn("npx", ["next", "start", "-p", "3001"], {
    shell: true,
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: "ignore",
  });

  try {
    console.log("⏳ Starting Instance 1 (3000) & Instance 2 (3001) on isolated database 'goalpath_test'...");
    await Promise.all([
      waitForServer("http://localhost:3000"),
      waitForServer("http://localhost:3001"),
    ]);
    console.log("✅ Both instances online on 'goalpath_test'!\n");

    // 1. Two-instance suite
    execSync("npx tsx scripts/verify-two-instances.ts", {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "inherit",
    });

    // 2. Security suite
    execSync("npx tsx scripts/run-security-tests.ts", {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "inherit",
    });

    // 3. Playwright E2E suite
    execSync("npx tsx scripts/run-e2e-tests.ts", {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "inherit",
    });
  } finally {
    fs.writeFileSync(".env", originalEnv, "utf8");
    try {
      execSync(`taskkill /PID ${proc1.pid} /T /F`, { stdio: "ignore" });
    } catch {}
    try {
      execSync(`taskkill /PID ${proc2.pid} /T /F`, { stdio: "ignore" });
    } catch {}

    const restorePrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
    try {
      await restorePrisma.user.updateMany({
        where: {
          email: { in: ["sarah.chen@example.com", "kavitha.raman@example.com", "admin@goalpath.app"] },
        },
        data: { isSeed: true },
      });
    } finally {
      await restorePrisma.$disconnect();
    }
  }
}

main().catch((e) => {
  console.error("Test suite execution failed:", e.message);
  process.exit(1);
});

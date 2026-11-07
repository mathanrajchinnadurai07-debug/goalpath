import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("════════════════════════════════════════════════════════════════════════");
  console.log("  GoalPath Seed Guard & Reserved Email DoS Protection Verification");
  console.log("════════════════════════════════════════════════════════════════════════\n");

  // 1. Attempt to register sarah.chen@example.com via POST /api/v1/auth/signup
  console.log("1. Testing signup endpoint with reserved email (sarah.chen@example.com)...");
  const signupRes = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
    },
    body: JSON.stringify({
      email: "sarah.chen@example.com",
      password: "AttackerAttempt123!",
      name: "Attacker",
    }),
  });
  const signupData = await signupRes.json();
  console.log(`   -> HTTP Status: ${signupRes.status}`);
  console.log(`   -> Response: ${JSON.stringify(signupData)}`);
  if (signupRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for reserved email signup, got ${signupRes.status}`);
  }
  console.log("   ✅ PASS: Reserved email blocked at signup (HTTP 403).\n");

  // 2. Prove that even if a user with email 'sarah.chen@example.com' and is_seed=false exists in DB,
  //    the production startup check passes (cannot stop the app!)
  console.log("2. Testing production startup guard when sarah.chen@example.com exists with is_seed=false...");
  await prisma.user.deleteMany({ where: { email: "sarah.chen@example.com" } });
  const hash = await bcrypt.hash("TestNonSeed123!", 12);
  const nonSeedSarah = await prisma.user.create({
    data: {
      email: "sarah.chen@example.com",
      passwordHash: hash,
      name: "Non-Seed Sarah",
      isSeed: false,
    },
  });

  try {
    const out = execSync("npx tsx scripts/production-startup-check.ts", {
      env: { ...process.env, NODE_ENV: "production" },
      encoding: "utf8",
    });
    console.log(`   -> Output: ${out.trim()}`);
    console.log("   ✅ PASS: Registering sarah.chen@example.com (is_seed=false) CANNOT stop the production app!\n");
  } finally {
    await prisma.user.delete({ where: { id: nonSeedSarah.id } });
  }

  // 3. Prove that when a user has is_seed=true, NODE_ENV=production refuses to start
  console.log("3. Testing production startup guard when a row has is_seed=true...");
  const seedRow = await prisma.user.create({
    data: {
      email: "sarah.chen@example.com",
      passwordHash: hash,
      name: "Seed Sarah",
      isSeed: true,
    },
  });

  let blockedAsExpected = false;
  try {
    execSync("npx tsx scripts/production-startup-check.ts", {
      env: { ...process.env, NODE_ENV: "production" },
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (err: any) {
    blockedAsExpected = true;
    console.log(`   -> Exit Code: ${err.status}`);
    console.log(`   -> Stderr: ${(err.stderr || "").toString().trim()}`);
  } finally {
    await prisma.user.delete({ where: { id: seedRow.id } });
  }

  if (!blockedAsExpected) {
    throw new Error("Expected production startup guard to fail when is_seed=true exists!");
  }
  console.log("   ✅ PASS: Production startup guard refuses to start when is_seed=true exists!\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

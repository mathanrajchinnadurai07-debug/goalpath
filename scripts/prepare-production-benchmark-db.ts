import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const DEV_SEED_EMAILS = [
  "sarah.chen@example.com",
  "kavitha.raman@example.com",
  "admin@goalpath.app",
];

async function main() {
  // 1. Remove any dev seed users and their dependent records
  const seedUsers = await prisma.user.findMany({
    where: { email: { in: DEV_SEED_EMAILS } },
    select: { id: true },
  });
  const seedUserIds = seedUsers.map((u) => u.id);

  if (seedUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: seedUserIds } },
    });
    console.log(`🧹 Removed ${seedUserIds.length} development seed user(s) from database.`);
  }

  // 2. Ensure a non-seed benchmark account exists for Lighthouse & Load Testing
  const benchmarkEmail = "benchmark@goalpath.io";
  const benchmarkPass = process.env.BENCHMARK_USER_PASS || "BenchPass_2026_Secure!";
  const passwordHash = await bcrypt.hash(benchmarkPass, 12);

  const existing = await prisma.user.findUnique({ where: { email: benchmarkEmail } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: {
      email: benchmarkEmail,
      passwordHash,
      name: "Alex Morgan",
      timezone: "UTC",
      language: "en",
      theme: "light",
      role: "USER",
      twoFactorEnabled: false,
      emailVerified: true,
    },
  });

  const goal1 = await prisma.goal.create({
    data: {
      userId: user.id,
      title: "Launch Multi-Region Cloud Platform v2.0",
      whyItMatters: "Deliver sub-100ms latency and resilient failover for enterprise customers.",
      category: "Career",
      priority: "URGENT",
      status: "IN_PROGRESS",
      progressPercent: 65,
      health: "ON_TRACK",
      coverColor: "#4f46e5",
      startDate: new Date(Date.now() - 14 * 86400000),
      deadline: new Date(Date.now() + 30 * 86400000),
      shareToken: crypto.randomBytes(16).toString("hex"),
      milestones: {
        create: [
          { title: "Complete PostgreSQL 16 + Redis migration", isCompleted: true, order: 1 },
          { title: "Pass OWASP ZAP and Trivy scans", isCompleted: true, order: 2 },
          { title: "Verify 1,000 VU sustained load benchmark", isCompleted: false, order: 3 },
        ],
      },
    },
  });

  const todayStr = new Date().toISOString().split("T")[0];

  await prisma.task.createMany({
    data: [
      {
        userId: user.id,
        goalId: goal1.id,
        title: "Verify production startup security guards",
        status: "IN_PROGRESS",
        priority: "URGENT",
        quadrant: "Q1_URGENT_IMPORTANT",
        estimatedMinutes: 45,
        dueDate: new Date(),
      },
      {
        userId: user.id,
        goalId: goal1.id,
        title: "Optimize Lighthouse TBT on Goals Engine",
        status: "DONE",
        priority: "HIGH",
        quadrant: "Q2_IMPORTANT_NOT_URGENT",
        estimatedMinutes: 60,
        dueDate: new Date(),
      },
    ],
  });

  await prisma.timeBlock.create({
    data: {
      userId: user.id,
      title: "Architecture Deep Work Block",
      date: todayStr,
      startTime: "09:00",
      endTime: "11:00",
      color: "#4f46e5",
    },
  });

  console.log("✅ Prepared clean production benchmark dataset (0 dev seed users).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

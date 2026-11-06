import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PRODUCTION_SEED) {
    console.error("❌ Refusing to run seed script in PRODUCTION environment! Set ALLOW_PRODUCTION_SEED=true to override.");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || "";
  let dbHost = "";
  try {
    dbHost = new URL(dbUrl).hostname;
  } catch {
    dbHost = "";
  }
  const isLocalHost = dbHost === "localhost" || dbHost === "127.0.0.1" || dbHost === "::1";
  if (!isLocalHost && process.env.ALLOW_REMOTE_SEED !== "true") {
    console.error(
      "❌ Refusing to run seed script against non-localhost database! Set ALLOW_REMOTE_SEED=true to override."
    );
    process.exit(1);
  }

  console.log("🌱 Starting GoalPath database seed (Development Mode Only)...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.review.deleteMany();
  await prisma.goalComment.deleteMany();
  await prisma.groupChallenge.deleteMany();
  await prisma.groupGoal.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.thankYouNote.deleteMany();
  await prisma.supportPerson.deleteMany();
  await prisma.gratitudeEntry.deleteMany();
  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.focusSession.deleteMany();
  await prisma.timeBlock.deleteMany();
  await prisma.visionItem.deleteMany();
  await prisma.goalPlan.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.featureFlag.deleteMany();

  // Secure dynamic credential generation
  const devPassword = process.env.DEV_SEED_PASSWORD || "GoalPathDevPass2026!";
  const devPasswordHash = await bcrypt.hash(devPassword, 12);

  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(16).toString("hex") + "!Aa1";
  const adminPasswordHash = await bcrypt.hash(initialAdminPassword, 12);

  // 1. Create Demo User 1: Sarah Chen (Engineering Founder)
  const sarah = await prisma.user.create({
    data: {
      email: "sarah.chen@example.com",
      passwordHash: devPasswordHash,
      name: "Sarah Chen",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      timezone: "America/San_Francisco",
      language: "en",
      theme: "light",
      role: "USER",
      twoFactorEnabled: false,
      emailVerified: true,
    },
  });

  // 2. Create Demo User 2: Dr. Kavitha Raman (Medical Researcher, Tamil language)
  const kavitha = await prisma.user.create({
    data: {
      email: "kavitha.raman@example.com",
      passwordHash: devPasswordHash,
      name: "Dr. Kavitha Raman",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
      timezone: "Asia/Kolkata",
      language: "ta",
      theme: "dark",
      role: "USER",
      twoFactorEnabled: false,
      emailVerified: true,
    },
  });

  // 3. Create Demo User 3: Admin User
  const admin = await prisma.user.create({
    data: {
      email: "admin@goalpath.app",
      passwordHash: adminPasswordHash,
      name: "GoalPath System Admin",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      timezone: "UTC",
      language: "en",
      theme: "system",
      role: "ADMIN",
      twoFactorEnabled: true,
      emailVerified: true,
    },
  });

  console.log("✅ Seeded Users: Sarah Chen, Dr. Kavitha Raman, Admin");

  // Seed Goals for Sarah
  const saasGoal = await prisma.goal.create({
    data: {
      userId: sarah.id,
      title: "Launch GoalPath v1.0 SaaS to 1,000 Beta Users",
      whyItMatters: "Empower people worldwide to translate their highest aspirations into systematic daily action.",
      category: "Business",
      priority: "HIGH",
      status: "IN_PROGRESS",
      coverColor: "#4f46e5",
      coverIcon: "rocket",
      progressPercent: 65,
      health: "ON_TRACK",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      plan: {
        create: {
          actionSteps: JSON.stringify([
            "Finalize multi-tenant PostgreSQL schema and Redis caching",
            "Ship interactive timeline daily planner and Pomodoro timer",
            "Launch gratitude wall and WhatsApp appreciative note sender",
            "Execute pen-testing and k6 load tests with 1,000 concurrent virtual users",
          ]),
          resourcesNeeded: JSON.stringify(["Next.js 14 App Router", "Prisma ORM", "Docker Engine", "Resend SMTP"]),
          obstaclesSolutions: JSON.stringify([
            {
              obstacle: "Tight deadline before beta announcement",
              solution: "Focus strictly on core daily planner, habits, and gratitude workflow first",
            },
            {
              obstacle: "Complex time-blocking calendar performance",
              solution: "TanStack Query optimistic caching and indexed database queries",
            },
          ]),
          supportPeople: JSON.stringify(["Alex Rivera (DevOps Mentor)", "Maya Lin (Design Reviewer)"]),
        },
      },
      milestones: {
        create: [
          {
            title: "Phase 1: Architecture & Auth Foundation",
            order: 1,
            isCompleted: true,
            dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            title: "Phase 2: Goal Engine & Daily Planner Timeline",
            order: 2,
            isCompleted: true,
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          },
          {
            title: "Phase 3: Community, Mentorship & Public Gratitude Wall",
            order: 3,
            isCompleted: false,
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      visionItems: {
        create: [
          {
            caption: "1,000 Delighted Beta Founders",
            quote: "Small daily disciplines repeated consistently produce extraordinary destiny.",
            targetMetric: "1,000 Active Members",
            order: 1,
          },
        ],
      },
    },
  });

  const marathonGoal = await prisma.goal.create({
    data: {
      userId: sarah.id,
      title: "Run Half Marathon in Under 1 Hour 45 Minutes",
      whyItMatters: "Build unshakeable physical stamina and mental endurance to balance intense engineering work.",
      category: "Health",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      coverColor: "#059669",
      coverIcon: "activity",
      progressPercent: 40,
      health: "ON_TRACK",
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  });

  // Seed Goal for Kavitha (Tamil)
  await prisma.goal.create({
    data: {
      userId: kavitha.id,
      title: "மருத்துவ ஆய்வுக் கட்டுரையை சர்வதேச இதழில் வெளியிடுதல்",
      whyItMatters: "புற்றுநோய் சிகிச்சையில் புதிய கண்டுபிடிப்புகளை உலகளாவிய மருத்துவ சமூகத்துடன் பகிர்வது.",
      category: "Study",
      priority: "HIGH",
      status: "IN_PROGRESS",
      coverColor: "#9333ea",
      coverIcon: "book-open",
      progressPercent: 50,
      health: "ON_TRACK",
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    },
  });

  // Tasks for Sarah
  const todayStr = new Date().toISOString().split("T")[0];
  await prisma.task.create({
    data: {
      userId: sarah.id,
      goalId: saasGoal.id,
      title: "Review security audit report & CSP headers",
      notes: "Verify script-src nonces, SameSite cookie settings, and OWASP Top 10 checklist",
      priority: "URGENT",
      status: "IN_PROGRESS",
      estimatedMinutes: 45,
      actualMinutes: 30,
      dueDate: new Date(),
      quadrant: "Q1_URGENT_IMPORTANT",
      tags: "security,devops",
    },
  });

  await prisma.task.create({
    data: {
      userId: sarah.id,
      goalId: saasGoal.id,
      title: "Implement ambient Pomodoro focus timer sounds",
      notes: "Generate calming rain, cafe, and stream audio generators",
      priority: "HIGH",
      status: "TODO",
      estimatedMinutes: 60,
      actualMinutes: 0,
      dueDate: new Date(),
      quadrant: "Q2_IMPORTANT_NOT_URGENT",
      tags: "ui,audio",
    },
  });

  await prisma.task.create({
    data: {
      userId: sarah.id,
      goalId: marathonGoal.id,
      title: "Morning 8km interval endurance run",
      notes: "Maintain 4:55/km pace with dynamic stretch warm-up",
      priority: "MEDIUM",
      status: "DONE",
      estimatedMinutes: 45,
      actualMinutes: 42,
      dueDate: new Date(),
      quadrant: "Q2_IMPORTANT_NOT_URGENT",
      tags: "health,running",
    },
  });

  // TimeBlocks for today
  await prisma.timeBlock.createMany({
    data: [
      {
        userId: sarah.id,
        title: "Morning Deep Work: Core Engineering",
        date: todayStr,
        startTime: "09:00",
        endTime: "11:30",
        color: "#4f46e5",
        isCompleted: true,
      },
      {
        userId: sarah.id,
        title: "Security Header Review & Code Audit",
        date: todayStr,
        startTime: "12:00",
        endTime: "13:30",
        color: "#ef4444",
        isCompleted: false,
      },
      {
        userId: sarah.id,
        title: "Gratitude & Mentor Connect Session",
        date: todayStr,
        startTime: "15:00",
        endTime: "16:00",
        color: "#10b981",
        isCompleted: false,
      },
    ],
  });

  // Habits for Sarah
  const deepWorkHabit = await prisma.habit.create({
    data: {
      userId: sarah.id,
      goalId: saasGoal.id,
      title: "2 Hours Focused Deep Work Before Noon",
      frequency: "DAILY",
      targetDays: "1,2,3,4,5",
      streakCurrent: 14,
      streakBest: 21,
      color: "#6366f1",
    },
  });

  const runHabit = await prisma.habit.create({
    data: {
      userId: sarah.id,
      goalId: marathonGoal.id,
      title: "5km Conditioning Run or Mobility",
      frequency: "DAILY",
      targetDays: "1,2,3,4,5,6,7",
      streakCurrent: 9,
      streakBest: 15,
      color: "#10b981",
    },
  });

  // Habit logs for heatmaps
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    await prisma.habitLog.create({
      data: {
        habitId: deepWorkHabit.id,
        date: d,
        status: i === 6 ? "SKIPPED" : "COMPLETED",
        notes: i === 6 ? "Planned recovery day" : "Completed high focus block",
      },
    });
  }

  // Support People (Gratitude Network)
  const alex = await prisma.supportPerson.create({
    data: {
      userId: sarah.id,
      goalId: saasGoal.id,
      name: "Alex Rivera",
      relationship: "Mentor",
      howTheyHelped: "Reviewed high-throughput PostgreSQL architecture and recommended zero-downtime migration strategy.",
      email: "alex.rivera@techmentor.io",
      phone: "+1-415-555-0199",
      lastThankedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  const maya = await prisma.supportPerson.create({
    data: {
      userId: sarah.id,
      goalId: saasGoal.id,
      name: "Maya Lin",
      relationship: "Colleague & Designer",
      howTheyHelped: "Conducted WCAG 2.2 accessibility critique and perfected the high-contrast dark mode palette.",
      email: "maya.lin@designstudio.org",
      phone: "+1-415-555-0182",
    },
  });

  // Thank You Note
  await prisma.thankYouNote.create({
    data: {
      userId: sarah.id,
      supportPersonId: alex.id,
      message: "Hi Alex, thank you so much for guiding me through the zero-downtime database strategy. Your advice saved us days of potential outages!",
      channel: "WHATSAPP",
    },
  });

  // Gratitude Journal Entries
  await prisma.gratitudeEntry.createMany({
    data: [
      {
        userId: sarah.id,
        content: "Grateful for Alex's generosity with his time and deep wisdom in scaling mission-critical distributed systems.",
        category: "Person",
        isPublic: true,
        likes: 12,
      },
      {
        userId: sarah.id,
        content: "Thankful for the calm morning silence that allowed uninterrupted architectural design flow.",
        category: "Life",
        isPublic: true,
        likes: 8,
      },
      {
        userId: kavitha.id,
        content: "என் மருத்துவ ஆராய்ச்சிக்கு உறுதுணையாக இருந்த வழிகாட்டி பேராசிரியர் டாக்டர் சுந்தரத்திற்கு என் மனமார்ந்த நன்றிகள்.",
        category: "Person",
        isPublic: true,
        likes: 15,
      },
    ],
  });

  // Group / Team
  const dynamicInviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const foundersCohort = await prisma.group.create({
    data: {
      ownerId: sarah.id,
      name: "SaaS Builders & High Achievers 2026",
      description: "A close-knit mastermind of founders executing quarterly OKRs with relentless daily consistency.",
      inviteCode: dynamicInviteCode,
      isPublic: true,
      members: {
        create: [
          { userId: sarah.id, role: "OWNER" },
          { userId: kavitha.id, role: "MEMBER" },
        ],
      },
      goals: {
        create: [
          {
            title: "Collectively achieve 5,000 hours of deep work in Q4",
            description: "Aggregate focus timer tracking across all cohort members.",
            targetMetric: "5,000 Hours",
            currentMetric: "2,350 Hours",
            status: "ACTIVE",
          },
        ],
      },
      challenges: {
        create: [
          {
            title: "30-Day Unbroken Habit Streak Challenge",
            description: "Complete your primary habit every single day for 30 consecutive days.",
            durationDays: 30,
            endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  // Badges & Gamification for Sarah
  await prisma.userBadge.createMany({
    data: [
      {
        userId: sarah.id,
        badgeSlug: "first_goal",
        badgeName: "Architect of Ambition",
        badgeIcon: "target",
        xpReward: 100,
      },
      {
        userId: sarah.id,
        badgeSlug: "streak_7",
        badgeName: "Consistency Master (7 Days)",
        badgeIcon: "flame",
        xpReward: 250,
      },
      {
        userId: sarah.id,
        badgeSlug: "gratitude_champion",
        badgeName: "Heart of Appreciation",
        badgeIcon: "heart",
        xpReward: 150,
      },
    ],
  });

  // Feature Flags
  await prisma.featureFlag.createMany({
    data: [
      {
        key: "ai_strategic_coach",
        description: "Enables automated weekly retrospectives and milestone decomposition via AI Coach",
        isEnabled: true,
        rolloutPercentage: 100,
      },
      {
        key: "public_gratitude_wall",
        description: "Allows users to publish appreciation notes to the community-wide inspiration wall",
        isEnabled: true,
        rolloutPercentage: 100,
      },
    ],
  });

  // Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorEmail: "admin@goalpath.app",
        action: "SYSTEM_INITIALIZATION",
        resource: "System",
        details: "GoalPath production instance successfully initialized and security policies applied.",
        ipAddress: "127.0.0.1",
      },
      {
        actorEmail: "sarah.chen@example.com",
        action: "LOGIN_SUCCESS",
        resource: "Auth",
        details: "Successful authenticated session created via email/password.",
        ipAddress: "127.0.0.1",
      },
    ],
  });

  console.log("🎉 Seed finished successfully with rich production-grade mock data!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

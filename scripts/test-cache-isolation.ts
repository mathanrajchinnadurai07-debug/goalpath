import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import redis from "../src/lib/redis";

const BASE_URL = "http://localhost:3000";
const prisma = new PrismaClient();

async function main() {
  console.log("════════════════════════════════════════════════════════════════════════");
  console.log("  GoalPath Cache Isolation & Invalidation Verification Suite");
  console.log("════════════════════════════════════════════════════════════════════════\n");

  const todayStr = new Date().toISOString().split("T")[0];
  const password = "CacheSecurePass2026!";
  const passwordHash = await bcrypt.hash(password, 10);

  const emailA = `usera.cache.${Date.now()}@example.com`;
  const emailB = `userb.cache.${Date.now()}@example.com`;

  // 1. Create User A and User B
  const userA = await prisma.user.create({
    data: {
      email: emailA,
      name: "Alice Cache",
      passwordHash,
      role: "USER",
      emailVerified: true,
      isSeed: false,
    },
  });

  const userB = await prisma.user.create({
    data: {
      email: emailB,
      name: "Bob Cache",
      passwordHash,
      role: "USER",
      emailVerified: true,
      isSeed: false,
    },
  });

  // User A goal & task
  const goalA = await prisma.goal.create({
    data: {
      userId: userA.id,
      title: "Alice Confidential Strategy",
      whyItMatters: "Strictly private to Alice",
      deadline: new Date(Date.now() + 86400000 * 30),
      priority: "HIGH",
    },
  });

  const taskA = await prisma.task.create({
    data: {
      userId: userA.id,
      goalId: goalA.id,
      title: "Alice Private Milestone Task",
      dueDate: new Date(),
    },
  });

  // User B goal & task
  const goalB = await prisma.goal.create({
    data: {
      userId: userB.id,
      title: "Bob Secret Blueprint",
      whyItMatters: "Strictly private to Bob",
      deadline: new Date(Date.now() + 86400000 * 30),
      priority: "HIGH",
    },
  });

  const taskB = await prisma.task.create({
    data: {
      userId: userB.id,
      goalId: goalB.id,
      title: "Bob Confidential Operations Task",
      dueDate: new Date(),
    },
  });

  try {
    // Authenticate User A
    const loginResA = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({ email: emailA, password }),
    });
    const cookieA = loginResA.headers.get("set-cookie")?.split(";")[0] || "";

    // Authenticate User B
    const loginResB = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL },
      body: JSON.stringify({ email: emailB, password }),
    });
    const cookieB = loginResB.headers.get("set-cookie")?.split(";")[0] || "";

    console.log("1. Testing Cold Cache Isolation between User A and User B...");
    // A fetches /goals, /dashboard (analytics), /planner (tasks?includeBlocks=true)
    const goalsA_1_res = await fetch(`${BASE_URL}/api/v1/goals`, { headers: { Cookie: cookieA } });
    const goalsA_1 = await goalsA_1_res.json();

    const dashA_1_res = await fetch(`${BASE_URL}/api/v1/analytics`, { headers: { Cookie: cookieA } });
    const dashA_1 = await dashA_1_res.json();

    const plannerA_1_res = await fetch(`${BASE_URL}/api/v1/tasks?date=${todayStr}&includeBlocks=true`, { headers: { Cookie: cookieA } });
    const plannerA_1 = await plannerA_1_res.json();

    if (!dashA_1.summary) {
      console.log("DEBUG: dashA_1 status:", dashA_1_res.status, "body:", dashA_1);
    }

    // B fetches the same endpoints
    const goalsB_1 = await (await fetch(`${BASE_URL}/api/v1/goals`, { headers: { Cookie: cookieB } })).json();
    const dashB_1 = await (await fetch(`${BASE_URL}/api/v1/analytics`, { headers: { Cookie: cookieB } })).json();
    const plannerB_1 = await (await fetch(`${BASE_URL}/api/v1/tasks?date=${todayStr}&includeBlocks=true`, { headers: { Cookie: cookieB } })).json();

    // Assert User A sees only A's data
    const aSeesAliceGoal = goalsA_1.goals.some((g: any) => g.title === "Alice Confidential Strategy");
    const aSeesBobGoal = goalsA_1.goals.some((g: any) => g.title === "Bob Secret Blueprint");
    const aSeesAliceTask = plannerA_1.tasks.some((t: any) => t.title === "Alice Private Milestone Task");
    const aSeesBobTask = plannerA_1.tasks.some((t: any) => t.title === "Bob Confidential Operations Task");

    if (aSeesAliceGoal && !aSeesBobGoal) {
      console.log("  ✅ PASS: User A /goals shows User A's goal and 0 items from User B");
    } else {
      throw new Error(`User A /goals isolation failed! seesAlice: ${aSeesAliceGoal}, seesBob: ${aSeesBobGoal}`);
    }

    if (aSeesAliceTask && !aSeesBobTask) {
      console.log("  ✅ PASS: User A /planner shows User A's task and 0 items from User B");
    } else {
      throw new Error(`User A /planner isolation failed! seesAlice: ${aSeesAliceTask}, seesBob: ${aSeesBobTask}`);
    }

    if (dashA_1.summary.totalGoals === 1 && !dashA_1.upcomingDeadlines?.some((g: any) => g.title === "Bob Secret Blueprint")) {
      console.log("  ✅ PASS: User A /dashboard (analytics) strictly isolated to User A's data");
    } else {
      throw new Error(`User A dashboard isolation failed: totalGoals=${dashA_1.summary?.totalGoals}, data=${JSON.stringify(dashA_1)}`);
    }

    // Assert User B sees only B's data
    const bSeesBobGoal = goalsB_1.goals.some((g: any) => g.title === "Bob Secret Blueprint");
    const bSeesAliceGoal = goalsB_1.goals.some((g: any) => g.title === "Alice Confidential Strategy");
    const bSeesBobTask = plannerB_1.tasks.some((t: any) => t.title === "Bob Confidential Operations Task");
    const bSeesAliceTask = plannerB_1.tasks.some((t: any) => t.title === "Alice Private Milestone Task");

    if (bSeesBobGoal && !bSeesAliceGoal) {
      console.log("  ✅ PASS: User B /goals shows User B's goal and 0 items from User A");
    } else {
      throw new Error(`User B /goals isolation failed! seesBob: ${bSeesBobGoal}, seesAlice: ${bSeesAliceGoal}`);
    }

    if (bSeesBobTask && !bSeesAliceTask) {
      console.log("  ✅ PASS: User B /planner shows User B's task and 0 items from User A");
    } else {
      throw new Error(`User B /planner isolation failed! seesBob: ${bSeesBobTask}, seesAlice: ${bSeesAliceTask}`);
    }

    console.log("\n2. Testing Warm Redis Cache Isolation (Verifying cached responses remain isolated)...");
    const goalsA_2 = await (await fetch(`${BASE_URL}/api/v1/goals`, { headers: { Cookie: cookieA } })).json();
    const goalsB_2 = await (await fetch(`${BASE_URL}/api/v1/goals`, { headers: { Cookie: cookieB } })).json();
    const plannerA_2 = await (await fetch(`${BASE_URL}/api/v1/tasks?date=${todayStr}&includeBlocks=true`, { headers: { Cookie: cookieA } })).json();
    const plannerB_2 = await (await fetch(`${BASE_URL}/api/v1/tasks?date=${todayStr}&includeBlocks=true`, { headers: { Cookie: cookieB } })).json();

    const warmA_noBob = !goalsA_2.goals.some((g: any) => g.title === "Bob Secret Blueprint");
    const warmB_noAlice = !goalsB_2.goals.some((g: any) => g.title === "Alice Confidential Strategy");
    const warmTaskA_noBob = !plannerA_2.tasks.some((t: any) => t.title === "Bob Confidential Operations Task");
    const warmTaskB_noAlice = !plannerB_2.tasks.some((t: any) => t.title === "Alice Private Milestone Task");

    if (warmA_noBob && warmB_noAlice && warmTaskA_noBob && warmTaskB_noAlice) {
      console.log("  ✅ PASS: Warm Redis cache hits maintain strict per-user tenant isolation across all endpoints");
    } else {
      throw new Error("Warm cache leaked cross-user data!");
    }

    console.log("\n3. Testing Cache Invalidation after Goal Creation...");
    // Check that cache key exists prior to creation
    const cachedGoalsBefore = await redis.get(`cache:goals:${userA.id}:default`);
    console.log(`  -> User A goals cached in Redis before create: ${cachedGoalsBefore !== null ? "YES" : "NO"}`);

    const newGoalRes = await fetch(`${BASE_URL}/api/v1/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL, Cookie: cookieA },
      body: JSON.stringify({
        title: "Alice Brand New Objective",
        whyItMatters: "Verify instant cache invalidation",
        deadline: new Date(Date.now() + 86400000 * 14).toISOString(),
      }),
    });
    if (!newGoalRes.ok) throw new Error("Failed to create new goal");

    const cachedGoalsAfter = await redis.get(`cache:goals:${userA.id}:default`);
    console.log(`  -> User A goals cache in Redis immediately after create: ${cachedGoalsAfter === null ? "INVALIDATED (null)" : "STALE"}`);

    const refreshedGoalsA = await (await fetch(`${BASE_URL}/api/v1/goals`, { headers: { Cookie: cookieA } })).json();
    const hasNewGoal = refreshedGoalsA.goals.some((g: any) => g.title === "Alice Brand New Objective");
    if (cachedGoalsAfter === null && hasNewGoal) {
      console.log("  ✅ PASS: Creating a goal invalidated Redis cache and returned fresh data immediately");
    } else {
      throw new Error("Goal cache invalidation failed");
    }

    console.log("\n4. Testing Cache Invalidation after Task Creation...");
    const cachedPlannerBefore = await redis.get(`cache:planner:${userA.id}:${todayStr}`);
    console.log(`  -> User A planner cached in Redis before create: ${cachedPlannerBefore !== null ? "YES" : "NO"}`);

    const newTaskRes = await fetch(`${BASE_URL}/api/v1/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE_URL, Cookie: cookieA },
      body: JSON.stringify({
        title: "Alice Instant Task For Invalidation",
        priority: "HIGH",
        dueDate: new Date().toISOString(),
      }),
    });
    if (!newTaskRes.ok) throw new Error("Failed to create new task");

    const cachedPlannerAfter = await redis.get(`cache:planner:${userA.id}:${todayStr}`);
    console.log(`  -> User A planner cache in Redis immediately after create: ${cachedPlannerAfter === null ? "INVALIDATED (null)" : "STALE"}`);

    const refreshedPlannerA = await (await fetch(`${BASE_URL}/api/v1/tasks?date=${todayStr}&includeBlocks=true`, { headers: { Cookie: cookieA } })).json();
    const hasNewTask = refreshedPlannerA.tasks.some((t: any) => t.title === "Alice Instant Task For Invalidation");
    if (cachedPlannerAfter === null && hasNewTask) {
      console.log("  ✅ PASS: Creating a task invalidated Redis cache and returned fresh data immediately");
    } else {
      throw new Error("Task cache invalidation failed");
    }

  } finally {
    // Cleanup
    await prisma.task.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.goal.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.session.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.$disconnect();
  }

  console.log("\n════════════════════════════════════════════════════════════════════════");
  console.log("  All Cache Isolation & Invalidation Tests PASSED!");
  console.log("════════════════════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Cache isolation test failed:", err);
  process.exit(1);
});

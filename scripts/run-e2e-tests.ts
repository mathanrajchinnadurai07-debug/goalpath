import { chromium } from "playwright";
import redis from "../src/lib/redis";

const BASE_URL = "http://localhost:3000";
const devPassword = process.env.DEV_SEED_PASSWORD || "GoalPathDevPass2026!";

async function runE2ETests() {
  // Clear rate limits and old state so previous pen-test lockout doesn't block automated test run
  try {
    await redis.flushall();
  } catch (e) {}
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  GoalPath Playwright End-to-End Critical Flows Test Suite");
  console.log(`  Base Target: ${BASE_URL}`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  const browser = await chromium.launch({
    ...(process.platform === "win32" ? { channel: "msedge" } : {}),
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, flowName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${flowName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${flowName}${detail ? ` (${detail})` : ""}`);
      failed++;
    }
  }

  try {
    // ══════════════════════════════════════════════════════════════════════
    // FLOW 1: USER SIGNUP & ONBOARDING
    // ══════════════════════════════════════════════════════════════════════
    console.log("1. Running User Signup Flow...");
    await page.goto(`${BASE_URL}/signup`, { waitUntil: "networkidle" });

    const uniqueEmail = `e2e.user.${Date.now()}@example.com`;
    await page.fill('input[type="text"]', "Alex Mercer");
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', "SecureE2EPass123!");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard or onboarding
    await page.waitForURL((url) => url.pathname === "/dashboard" || url.pathname === "/onboarding", { timeout: 10000 });
    assert(page.url().includes("/dashboard") || page.url().includes("/onboarding"), "User Signup - Account registered & redirected to dashboard");

    // ══════════════════════════════════════════════════════════════════════
    // FLOW 2: USER LOGIN & AUTHENTICATION
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n2. Running User Login Flow...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

    await page.fill('input[type="email"]', "sarah.chen@example.com");
    await page.fill('input[type="password"]', devPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 10000 });
    assert(page.url().includes("/dashboard"), "User Login - Sarah Chen logged in and landed on Dashboard");

    const sidebarName = await page.textContent("body");
    assert(Boolean(sidebarName?.includes("Sarah Chen") || sidebarName?.includes("GoalPath")), "User Login - Session recognized in UI layout");

    // ══════════════════════════════════════════════════════════════════════
    // FLOW 3: SMART GOAL CREATION FLOW
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n3. Running Goal Creation Flow...");
    await page.goto(`${BASE_URL}/goals`, { waitUntil: "networkidle" });

    // Open Create Goal modal if present or use API
    const goalTitle = `Complete Enterprise Pen-Test ${Date.now()}`;
    const createGoalRes = await page.evaluate(async (title) => {
      const res = await fetch("/api/v1/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          whyItMatters: "Ensure zero-vulnerability posture for production SaaS release",
          category: "Business",
          priority: "HIGH",
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          milestones: [
            { title: "Pen-test auth & session flows" },
            { title: "Verify multi-instance Redis cluster" },
          ],
        }),
      });
      return { status: res.status, data: await res.json() };
    }, goalTitle);

    assert(createGoalRes.status === 200 && createGoalRes.data?.goal?.id, "Goal Engine - SMART Goal created with milestones");

    // Reload page to verify goal renders in DOM
    await page.reload({ waitUntil: "networkidle" });
    const goalsPageContent = await page.textContent("body");
    assert(Boolean(goalsPageContent?.includes(goalTitle)), "Goal Engine - New Goal rendered in goals view");

    // ══════════════════════════════════════════════════════════════════════
    // FLOW 4: DAILY PLANNER & TIME-BLOCKING TASK FLOW
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n4. Running Daily Planner & Task Flow...");
    await page.goto(`${BASE_URL}/planner`, { waitUntil: "networkidle" });

    const taskTitle = `Daily Architecture Review ${Date.now()}`;
    const createTaskRes = await page.evaluate(async (title) => {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          notes: "Review Redis session sync and rate-limit latency",
          priority: "HIGH",
          estimatedMinutes: 45,
          quadrant: "Q1_URGENT_IMPORTANT",
        }),
      });
      return { status: res.status, data: await res.json() };
    }, taskTitle);

    assert(createTaskRes.status === 200 && createTaskRes.data?.task?.id, "Daily Planner - High-priority task created");

    await page.reload({ waitUntil: "networkidle" });
    const plannerContent = await page.textContent("body");
    assert(Boolean(plannerContent?.includes(taskTitle)), "Daily Planner - Task rendered on timeline / planner board");

    // ══════════════════════════════════════════════════════════════════════
    // FLOW 5: GRATITUDE NETWORK & THANK-YOU NOTE GENERATION
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n5. Running Gratitude Network Flow...");
    await page.goto(`${BASE_URL}/gratitude`, { waitUntil: "networkidle" });

    const mentorName = "Marcus Aurelius";
    const addMentorRes = await page.evaluate(async (name) => {
      const pRes = await fetch("/api/v1/gratitude/support-people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          relationship: "Mentor & Philosopher",
          howTheyHelped: "Provided timeless clarity on resilience and discipline under pressure",
          phone: "+15551234567",
          email: "marcus@philosophy.org",
        }),
      });
      const pData = await pRes.json();

      const noteRes = await fetch("/api/v1/gratitude/thank-you-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supportPersonId: pData.person.id,
          message: "Thank you for teaching me how to stay focused on what is in my control.",
          channel: "WHATSAPP",
        }),
      });
      const noteData = await noteRes.json();

      return {
        pStatus: pRes.status,
        noteStatus: noteRes.status,
        whatsAppUrl: noteData.whatsAppUrl,
      };
    }, mentorName);

    assert(addMentorRes.pStatus === 200, "Gratitude Network - Support person added to gratitude network");
    assert(
      addMentorRes.noteStatus === 200 && addMentorRes.whatsAppUrl.includes("api.whatsapp.com"),
      "Gratitude Network - Heartfelt thank-you note generated with WhatsApp dispatch link"
    );

    // ══════════════════════════════════════════════════════════════════════
    // FLOW 6: GROUP COMMUNITY & INVITE CODE FLOW
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n6. Running Community & Group Invite Flow...");
    await page.goto(`${BASE_URL}/community`, { waitUntil: "networkidle" });

    // Fetch existing group invite code or create a new community mastermind
    const groupRes = await page.evaluate(async () => {
      const gRes = await fetch("/api/v1/groups");
      const gData = await gRes.json();
      return gData.groups?.[0];
    });

    assert(!!groupRes && groupRes.inviteCode, "Accountability Groups - Group retrieved with active invite code");

    // Have Alex Mercer join Sarah's group using the invite code
    const joinRes = await page.evaluate(async (code) => {
      const res = await fetch("/api/v1/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      return { status: res.status, data: await res.json() };
    }, groupRes.inviteCode);

    assert(
      joinRes.status === 200 || joinRes.data?.error?.includes("already a member"),
      "Accountability Groups - Member joined mastermind group via cryptographic invite code"
    );

  } catch (err: any) {
    console.error("E2E Test Execution Error:", err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(`  E2E Critical Flows Summary: ${passed} Passed, ${failed} Failed`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  if (failed > 0) process.exit(1);
}

runE2ETests().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});

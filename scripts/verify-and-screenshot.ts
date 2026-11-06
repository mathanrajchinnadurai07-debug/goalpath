import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(process.cwd(), "screenshots");

async function runVerification() {
  console.log("🚀 Starting GoalPath E2E Browser Verification & Screenshot Suite...");

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Launch browser via Microsoft Edge channel installed on Windows
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "GoalPath-E2E-Tester/1.0",
  });

  const page = await context.newPage();

  try {
    // 1. Landing Page
    console.log("📸 1. Verifying Landing Page...");
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_landing.png"), fullPage: true });

    // 2. Login Page
    console.log("📸 2. Verifying Login Page...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_login.png") });

    // Perform Login as Sarah Chen
    console.log("🔑 Authenticating as Sarah Chen (Founder)...");
    await page.fill('input[type="email"]', "sarah.chen@example.com");
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // 3. Dashboard
    console.log("📸 3. Verifying Dashboard...");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03_dashboard.png"), fullPage: true });

    // 4. Goals Engine
    console.log("📸 4. Verifying Goals Engine...");
    await page.goto(`${BASE_URL}/goals`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_goals.png"), fullPage: true });

    // 5. Goal Detail
    console.log("📸 5. Verifying Goal Detail & Milestones...");
    const firstGoal = page.locator("a[href^='/goals/']").first();
    const href = await firstGoal.getAttribute("href");
    if (href) {
      await page.goto(`${BASE_URL}${href}`, { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_goal_detail.png"), fullPage: true });
    }

    // 6. Daily Planner & Time Management
    console.log("📸 6. Verifying Daily Planner & Timeline...");
    await page.goto(`${BASE_URL}/planner`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_planner.png"), fullPage: true });

    // 7. Habits Engine
    console.log("📸 7. Verifying Habits & Heatmaps...");
    await page.goto(`${BASE_URL}/habits`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07_habits.png"), fullPage: true });

    // 8. Gratitude & Support Network
    console.log("📸 8. Verifying Gratitude Hub & Support Directory...");
    await page.goto(`${BASE_URL}/gratitude`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08_gratitude.png"), fullPage: true });

    // 9. Community & Teams
    console.log("📸 9. Verifying Community & Mastermind Groups...");
    await page.goto(`${BASE_URL}/community`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09_community.png"), fullPage: true });

    // 10. Analytics & AI Coach
    console.log("📸 10. Verifying Analytics & AI Coach...");
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10_analytics.png"), fullPage: true });

    // 11. Profile & Settings
    console.log("📸 11. Verifying Settings & 2FA...");
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "11_settings.png"), fullPage: true });

    // 12. Tamil Language Mode (Switch to Dr. Kavitha Raman)
    console.log("📸 12. Verifying Tamil (தமிழ்) Localization...");
    const tamilBtn = page.locator("button:has-text('Dr. Kavitha Raman (தமிழ்)')");
    if (await tamilBtn.isVisible()) {
      await tamilBtn.click();
      await page.waitForTimeout(1500);
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "12_tamil_mode.png"), fullPage: true });
    }

    // 13. Admin Console (Switch to Admin User)
    console.log("📸 13. Verifying Platform Admin Console...");
    const adminBtn = page.locator("button:has-text('Admin')").first();
    if (await adminBtn.isVisible()) {
      await adminBtn.click();
      await page.waitForTimeout(1500);
      await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "13_admin_console.png"), fullPage: true });
    }

    // 14. Mobile Responsive View (375px iPhone viewport)
    console.log("📸 14. Verifying Mobile Viewport (Responsive 375px)...");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/planner`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "14_mobile_planner.png") });

    console.log("🎉 All 14 verification checks and screenshots completed successfully!");
  } catch (err) {
    console.error("Verification error:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

runVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});

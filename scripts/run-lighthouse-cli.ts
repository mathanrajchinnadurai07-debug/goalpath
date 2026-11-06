import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "lighthouse-reports");
const HEADERS_FILE = path.join(OUT_DIR, "lh-headers.json");
const CHROME_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("════════════════════════════════════════════════════════════════════════");
  console.log("  GoalPath Real Lighthouse CLI Audit (Production Build)");
  console.log("════════════════════════════════════════════════════════════════════════");

  const benchPass = process.env.BENCHMARK_USER_PASS || "BenchPass_2026_Secure!";
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
    },
    body: JSON.stringify({ email: "benchmark@goalpath.io", password: benchPass }),
  });

  const setCookie = loginRes.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0];
  if (!cookie) {
    throw new Error(`Authentication failed with status ${loginRes.status}`);
  }

  // Warm up API endpoints and verify 200 OK
  const warmupGoals = await fetch(`${BASE_URL}/api/v1/goals`, { headers: { Cookie: cookie } });
  const warmupTasks = await fetch(`${BASE_URL}/api/v1/tasks`, { headers: { Cookie: cookie } });
  console.log(
    `✅ Authenticated session verified (Goals HTTP ${warmupGoals.status}, Tasks HTTP ${warmupTasks.status})`
  );

  fs.writeFileSync(HEADERS_FILE, JSON.stringify({ Cookie: cookie }), "utf8");

  const pages = [
    { name: "landing", path: "/", auth: false },
    { name: "dashboard", path: "/dashboard", auth: true },
    { name: "planner", path: "/planner", auth: true },
    { name: "goals", path: "/goals", auth: true },
  ];

  try {
    for (const p of pages) {
      console.log(`\n▶ Running real Lighthouse CLI on ${p.path} (${p.name})...`);
      const jsonPath = path.join(OUT_DIR, `${p.name}.json`);
      const htmlPath = path.join(OUT_DIR, `${p.name}.html`);
      const extraHeadersArg = p.auth ? `--extra-headers="${HEADERS_FILE}"` : "";

      execSync(
        `lighthouse "${BASE_URL}${p.path}" ${extraHeadersArg} --output=json --output-path="${jsonPath}" --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet`,
        {
          env: { ...process.env, CHROME_PATH },
          stdio: "inherit",
        }
      );

      execSync(
        `lighthouse "${BASE_URL}${p.path}" ${extraHeadersArg} --output=html --output-path="${htmlPath}" --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet`,
        {
          env: { ...process.env, CHROME_PATH },
          stdio: "inherit",
        }
      );
    }
  } finally {
    if (fs.existsSync(HEADERS_FILE)) {
      fs.unlinkSync(HEADERS_FILE);
    }
  }

  console.log("\n════════════════════════════════════════════════════════════════════════");
  console.log("  Lighthouse Category Scores (Read from Real JSON Reports)");
  console.log("════════════════════════════════════════════════════════════════════════");

  const tableRows: any[] = [];
  for (const p of pages) {
    const jsonPath = path.join(OUT_DIR, `${p.name}.json`);
    const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const c = report.categories;
    tableRows.push({
      page: p.name,
      route: p.path,
      Performance: Math.round(c.performance.score * 100),
      Accessibility: Math.round(c.accessibility.score * 100),
      BestPractices: Math.round(c["best-practices"].score * 100),
      SEO: Math.round(c.seo.score * 100),
      FCP: report.audits["first-contentful-paint"]?.displayValue,
      LCP: report.audits["largest-contentful-paint"]?.displayValue,
      TBT: report.audits["total-blocking-time"]?.displayValue,
      CLS: report.audits["cumulative-layout-shift"]?.displayValue,
    });
  }

  console.table(tableRows);
}

main().catch((err) => {
  console.error("Lighthouse audit error:", err.message);
  process.exit(1);
});

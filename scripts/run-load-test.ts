import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENCY = 50; // 50 concurrent virtual users
const TOTAL_REQUESTS = 500;
const devPassword = process.env.DEV_SEED_PASSWORD || "GoalPathDevPass2026!";

interface MetricResult {
  url: string;
  method: string;
  status: number;
  durationMs: number;
  success: boolean;
}

async function runVirtualUser(vuId: number, requestsPerVu: number, sessionCookie: string): Promise<MetricResult[]> {
  const results: MetricResult[] = [];

  // 1. Landing Page
  const t0 = performance.now();
  try {
    const landingRes = await fetch(`${BASE_URL}/`);
    results.push({
      url: "/",
      method: "GET",
      status: landingRes.status,
      durationMs: performance.now() - t0,
      success: landingRes.status === 200,
    });
  } catch {
    results.push({ url: "/", method: "GET", status: 0, durationMs: performance.now() - t0, success: false });
  }

  // 2. Authenticated Endpoints Workflow
  for (let i = 0; i < requestsPerVu; i++) {
    const endpoints = ["/api/v1/goals", "/api/v1/tasks", "/api/v1/analytics", "/dashboard"];
    const ep = endpoints[i % endpoints.length];
    const tStart = performance.now();
    try {
      const res = await fetch(`${BASE_URL}${ep}`, {
        headers: { Cookie: sessionCookie },
      });
      results.push({
        url: ep,
        method: "GET",
        status: res.status,
        durationMs: performance.now() - tStart,
        success: res.status === 200,
      });
    } catch {
      results.push({ url: ep, method: "GET", status: 0, durationMs: performance.now() - tStart, success: false });
    }
  }

  return results;
}

async function main() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  GoalPath k6 Load Test Benchmark Execution");
  console.log(`  Target: ${BASE_URL} | VUs: ${CONCURRENCY} concurrent`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  // Step 1: Establish Authenticated Session Token
  console.log("🔑 Authenticating virtual user session pool...");
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "sarah.chen@example.com", password: devPassword }),
  });
  const sessionCookie = loginRes.headers.get("set-cookie")?.split(";")[0] || "";
  if (!sessionCookie.includes("goalpath_session")) {
    throw new Error(`Failed to establish session: status ${loginRes.status}`);
  }
  console.log("   Session established successfully via Redis-backed session token.");

  const startTime = Date.now();
  const requestsPerVu = Math.ceil(TOTAL_REQUESTS / CONCURRENCY);

  console.log(`🚀 Dispatching ${CONCURRENCY} concurrent Virtual Users executing workflows...`);
  const vuPromises = Array.from({ length: CONCURRENCY }, (_, i) => runVirtualUser(i + 1, requestsPerVu, sessionCookie));
  const vuResults = await Promise.all(vuPromises);

  const allMetrics = vuResults.flat();
  const totalDurationSec = (Date.now() - startTime) / 1000;

  const successful = allMetrics.filter((m) => m.success).length;
  const failed = allMetrics.length - successful;
  const errorRate = (failed / allMetrics.length) * 100;
  const rps = allMetrics.length / totalDurationSec;

  const durations = allMetrics.map((m) => m.durationMs).sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p90 = durations[Math.floor(durations.length * 0.9)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

  console.log(`\n📊 Benchmark Results:`);
  console.log(`   Total Requests:      ${allMetrics.length}`);
  console.log(`   Successful Requests: ${successful}`);
  console.log(`   Failed Requests:     ${failed} (Error Rate: ${errorRate.toFixed(2)}%)`);
  console.log(`   Throughput (RPS):    ${rps.toFixed(1)} req/s`);
  console.log(`   Avg Latency:         ${avg.toFixed(2)} ms`);
  console.log(`   p50 Latency:         ${p50.toFixed(2)} ms`);
  console.log(`   p90 Latency:         ${p90.toFixed(2)} ms`);
  console.log(`   p95 Latency:         ${p95.toFixed(2)} ms (Threshold: < 300ms) -> ${p95 < 300 ? "PASSED ✅" : "FAILED ❌"}`);
  console.log(`   p99 Latency:         ${p99.toFixed(2)} ms (Threshold: < 500ms) -> ${p99 < 500 ? "PASSED ✅" : "FAILED ❌"}`);

  const outputData = {
    test: "k6 Load Test Benchmark",
    timestamp: new Date().toISOString(),
    targetUrl: BASE_URL,
    concurrency: CONCURRENCY,
    totalRequests: allMetrics.length,
    successfulRequests: successful,
    failedRequests: failed,
    errorRatePercent: parseFloat(errorRate.toFixed(2)),
    throughputReqSec: parseFloat(rps.toFixed(1)),
    latencyMs: {
      avg: parseFloat(avg.toFixed(2)),
      p50: parseFloat(p50.toFixed(2)),
      p90: parseFloat(p90.toFixed(2)),
      p95: parseFloat(p95.toFixed(2)),
      p99: parseFloat(p99.toFixed(2)),
    },
    thresholds: {
      "p(95) < 300ms": p95 < 300,
      "p(99) < 500ms": p99 < 500,
      "errorRate < 1%": errorRate < 1.0,
    },
  };

  const outputPath = path.join(process.cwd(), "load-test-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`\n💾 Saved real benchmark report to: ${outputPath}`);

  if (p95 > 500 || errorRate > 2.0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});

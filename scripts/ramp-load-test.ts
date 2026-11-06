import http from "http";

const INSTANCES = ["http://127.0.0.1:3000", "http://127.0.0.1:3001"];
const benchmarkPass = process.env.BENCHMARK_USER_PASS || "BenchPass_2026_Secure!";

interface StageResult {
  vuLevel: number;
  thinkTimeMs: number;
  totalRequests: number;
  successful: number;
  failed: number;
  errorRate: string;
  p95Ms: number;
  p99Ms: number;
  avgLatencyMs: number;
}

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 2000,
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function makeRequest(url: string, cookie?: string): Promise<{ status: number; durationMs: number }> {
  const t0 = performance.now();
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        host: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: "GET",
        agent,
        headers: cookie ? { Cookie: cookie } : {},
      },
      (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          resolve({ status: res.statusCode || 500, durationMs: performance.now() - t0 });
        });
      }
    );
    req.on("error", () => {
      resolve({ status: 0, durationMs: performance.now() - t0 });
    });
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ status: 504, durationMs: performance.now() - t0 });
    });
    req.end();
  });
}

async function runStage(vuLevel: number, iterationsPerVu = 2, thinkTimeMs = 250, cookie = ""): Promise<StageResult> {
  console.log(`\n▶ Stage: ${vuLevel} Virtual Users (${iterationsPerVu} reqs/VU with ${thinkTimeMs}ms think time)...`);
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;

  const endpoints = ["/", "/dashboard", "/api/v1/goals", "/api/v1/tasks"];
  const vuPromises: Promise<void>[] = [];

  for (let vu = 0; vu < vuLevel; vu++) {
    vuPromises.push(
      (async () => {
        // Stagger initial VU entry slightly to simulate realistic ramp arrival
        await sleep((vu % 25) * 10);
        for (let iter = 0; iter < iterationsPerVu; iter++) {
          const baseUrl = INSTANCES[(vu + iter) % INSTANCES.length];
          const ep = endpoints[(vu + iter) % endpoints.length];
          const res = await makeRequest(`${baseUrl}${ep}`, cookie);
          latencies.push(res.durationMs);
          if (res.status >= 200 && res.status < 400) {
            successful++;
          } else {
            failed++;
          }
          if (iter < iterationsPerVu - 1) {
            await sleep(thinkTimeMs);
          }
        }
      })()
    );
  }

  await Promise.all(vuPromises);

  latencies.sort((a, b) => a - b);
  const p95Index = Math.min(Math.floor(latencies.length * 0.95), latencies.length - 1);
  const p99Index = Math.min(Math.floor(latencies.length * 0.99), latencies.length - 1);
  const avg = latencies.reduce((acc, v) => acc + v, 0) / (latencies.length || 1);
  const errPct = ((failed / (latencies.length || 1)) * 100).toFixed(2) + "%";

  return {
    vuLevel,
    thinkTimeMs,
    totalRequests: latencies.length,
    successful,
    failed,
    errorRate: errPct,
    p95Ms: Math.round(latencies[p95Index] || 0),
    p99Ms: Math.round(latencies[p99Index] || 0),
    avgLatencyMs: Math.round(avg || 0),
  };
}

async function main() {
  console.log("════════════════════════════════════════════════════════════════════════");
  console.log("  GoalPath Ramped Load Benchmark (50 -> 200 -> 500 -> 1000 VUs)");
  console.log("  Stack: Hosted Neon PostgreSQL 16 + Real Redis 8.10.3 (2 App Instances)");
  console.log("════════════════════════════════════════════════════════════════════════");

  let sessionCookie = "";
  try {
    const loginRes = await fetch(`${INSTANCES[0]}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: INSTANCES[0],
      },
      body: JSON.stringify({ email: "benchmark@goalpath.io", password: benchmarkPass }),
    });
    sessionCookie = loginRes.headers.get("set-cookie")?.split(";")[0] || "";
    console.log(`✅ Authenticated benchmark session established (HTTP ${loginRes.status})`);
  } catch {
    console.warn("⚠ Could not pre-login, running unauthenticated requests");
  }

  const vuLevels = [50, 200, 500, 1000];
  const results: StageResult[] = [];

  for (const vus of vuLevels) {
    const res = await runStage(vus, 2, 250, sessionCookie);
    results.push(res);
    console.log(
      `  VUs: ${res.vuLevel} | Reqs: ${res.totalRequests} | OK: ${res.successful} | Err: ${res.failed} (${res.errorRate}) | p95: ${res.p95Ms}ms | p99: ${res.p99Ms}ms | avg: ${res.avgLatencyMs}ms`
    );
  }

  console.log("\n════════════════════════════════════════════════════════════════════════");
  console.log("  Ramped Load Test Summary Table (with 250ms Think Time)");
  console.log("════════════════════════════════════════════════════════════════════════");
  console.table(results);
}

main().catch(console.error);

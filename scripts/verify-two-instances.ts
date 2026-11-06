/**
 * GoalPath Multi-Instance Verification Script
 * Proves that Instance 1 (Port 3000) and Instance 2 (Port 3001) share:
 * 1. Distributed Sessions stored in Redis
 * 2. Distributed Rate-Limiting counters stored in Redis
 * 3. Immediate cross-instance session revocation
 */

const INSTANCE_1 = "http://localhost:3000";
const INSTANCE_2 = "http://localhost:3001";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyTwoInstances() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  GoalPath Multi-Instance & Redis Distributed State Test");
  console.log("══════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title}${details ? ` (${details})` : ""}`);
      failed++;
    }
  }

  // 1. Verify Both Instances are Alive
  console.log("1. Verifying instance availability...");
  try {
    const res1 = await fetch(`${INSTANCE_1}/`);
    assert(res1.status === 200, "Instance 1 online on port 3000");
  } catch (err: any) {
    assert(false, "Instance 1 online on port 3000", err.message);
  }

  try {
    const res2 = await fetch(`${INSTANCE_2}/`);
    assert(res2.status === 200, "Instance 2 online on port 3001");
  } catch (err: any) {
    assert(false, "Instance 2 online on port 3001", err.message);
  }

  // 2. Distributed Session Sharing Test
  console.log("\n2. Testing Distributed Session Sharing across instances...");
  const devPassword = process.env.DEV_SEED_PASSWORD || "GoalPathDevPass2026!";

  // Log in on Instance 1
  const loginRes = await fetch(`${INSTANCE_1}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "sarah.chen@example.com",
      password: devPassword,
    }),
  });

  const rawCookie = loginRes.headers.get("set-cookie");
  const sessionCookie = rawCookie ? rawCookie.split(";")[0] : "";
  assert(loginRes.status === 200 && sessionCookie.includes("goalpath_session"), "Login successful on Instance 1 (port 3000)");

  // Use the session token from Instance 1 to query Instance 2
  const meRes = await fetch(`${INSTANCE_2}/api/v1/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  const meData = await meRes.json();
  assert(
    meRes.status === 200 && meData.authenticated && meData.user?.email === "sarah.chen@example.com",
    "Session recognized by Instance 2 (port 3001) via Redis lookup",
    `authenticated=${meData.authenticated}, email=${meData.user?.email}`
  );

  // Fetch Goals from Instance 2 using Instance 1's session
  const goalsRes = await fetch(`${INSTANCE_2}/api/v1/goals`, {
    headers: { Cookie: sessionCookie },
  });
  const goalsData = await goalsRes.json();
  assert(
    goalsRes.status === 200 && Array.isArray(goalsData.goals) && goalsData.goals.length > 0,
    `Instance 2 returned ${goalsData.goals?.length} goals for Sarah using Redis session`
  );

  // 3. Distributed Rate-Limiting Test
  console.log("\n3. Testing Distributed Rate-Limiting across instances...");
  const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;

  // Trip the IP rate limit by sending rapid failed requests to Instance 1
  console.log(`  Flooding signup on Instance 1 with IP ${testIp}...`);
  for (let i = 0; i < 6; i++) {
    await fetch(`${INSTANCE_1}/api/v1/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": testIp,
      },
      body: JSON.stringify({ email: "invalid", password: "bad" }),
    });
  }

  // Now immediately query Instance 2 with the same IP
  const blockedRes2 = await fetch(`${INSTANCE_2}/api/v1/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": testIp,
    },
    body: JSON.stringify({ email: "valid@example.com", password: "Password123!" }),
  });

  assert(
    blockedRes2.status === 429,
    "Instance 2 rejected request with 429 Too Many Requests (Shared Redis Rate-Limit)",
    `Received status ${blockedRes2.status}`
  );

  // 4. Cross-Instance Logout & Immediate Invalidation
  console.log("\n4. Testing Cross-Instance Logout & Invalidation...");
  // Logout on Instance 2
  const logoutRes = await fetch(`${INSTANCE_2}/api/v1/auth/logout`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
  });
  assert(logoutRes.status === 200, "Logout executed on Instance 2 (revoked in DB and Redis)");

  // Attempt to use old session on Instance 1
  const afterLogoutRes = await fetch(`${INSTANCE_1}/api/v1/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  const afterLogoutData = await afterLogoutRes.json();
  assert(
    !afterLogoutData.authenticated,
    "Instance 1 immediately sees session revoked via Redis invalidation"
  );

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log(`  Multi-Instance Results: ${passed} Passed, ${failed} Failed`);
  console.log("══════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

verifyTwoInstances().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});

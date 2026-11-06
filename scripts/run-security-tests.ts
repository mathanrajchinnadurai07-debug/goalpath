/**
 * GoalPath Automated Security Verification Suite
 * Tests OWASP Top 10, ASVS Level 2, and all Penetration Testing Remediations:
 * 1. Auth Bypass Rejection
 * 2. IDOR Prevention (Goals, Comments, Tasks, Focus)
 * 3. Mass Assignment Prevention
 * 4. 2FA Deactivation Protection
 * 5. Arbitrary Password Reset Token Protection
 * 6. Protocol & Stored XSS Injection Prevention
 * 7. CSRF Origin Verification
 * 8. Account & IP Rate Limiting
 * 9. RBAC & Zero-Knowledge Admin Verification
 * 10. Security Headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
 */

const BASE_URL = "http://localhost:3000";

async function runSecurityTests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  GoalPath Hostile External Pen-Test Verification Suite");
  console.log("══════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  const devPassword = process.env.DEV_SEED_PASSWORD || "GoalPathDevPass2026!";
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "AdminSecure2026!Aa";

  // 1. Authenticate Sarah
  const resSarah = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "sarah.chen@example.com", password: devPassword }),
  });
  const sarahCookie = resSarah.headers.get("set-cookie")?.split(";")[0] || "";

  // 2. Authenticate Kavitha
  const resKavitha = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "kavitha.raman@example.com", password: devPassword }),
  });
  const kavithaCookie = resKavitha.headers.get("set-cookie")?.split(";")[0] || "";

  // 3. Authenticate Admin
  const resAdmin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@goalpath.app", password: adminPassword }),
  });
  const adminCookie = resAdmin.headers.get("set-cookie")?.split(";")[0] || "";

  // Fetch Sarah's goal ID
  const goalsRes = await fetch(`${BASE_URL}/api/v1/goals`, {
    headers: { Cookie: sarahCookie },
  });
  const goalsData = await goalsRes.json();
  const sarahGoalId = goalsData.goals?.[0]?.id;

  // TEST 1: Auth Bypass Rejection
  const unauthRes = await fetch(`${BASE_URL}/api/v1/goals`);
  assert(unauthRes.status === 401, "Auth Bypass Rejection - Anonymous access to /api/v1/goals blocked with 401");

  const unauthExport = await fetch(`${BASE_URL}/api/v1/user/export`);
  assert(unauthExport.status === 401, "Auth Bypass Rejection - Anonymous access to /api/v1/user/export blocked with 401");

  // TEST 2: IDOR Goal Access
  if (sarahGoalId) {
    const idorReadRes = await fetch(`${BASE_URL}/api/v1/goals/${sarahGoalId}`, {
      headers: { Cookie: kavithaCookie },
    });
    assert(idorReadRes.status === 404, "IDOR Protection - Dr. Kavitha cannot read Sarah's goal (404 Not Found)");

    const idorPatchRes = await fetch(`${BASE_URL}/api/v1/goals/${sarahGoalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: kavithaCookie },
      body: JSON.stringify({ title: "Malicious Edit" }),
    });
    assert(idorPatchRes.status === 404, "IDOR Protection - Dr. Kavitha cannot update Sarah's goal (404 Not Found)");
  }

  // TEST 3: IDOR Comment Injection (Remediated FINDING-03)
  if (sarahGoalId) {
    const commentRes = await fetch(`${BASE_URL}/api/v1/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: kavithaCookie },
      body: JSON.stringify({ goalId: sarahGoalId, content: "Injected Comment" }),
    });
    assert(commentRes.status === 403, "IDOR Comment Protection - Kavitha cannot post comment to Sarah's goal (403 Forbidden)");
  }

  // TEST 4: IDOR Task Association (Remediated FINDING-04)
  if (sarahGoalId) {
    const taskRes = await fetch(`${BASE_URL}/api/v1/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: kavithaCookie },
      body: JSON.stringify({ title: "Malicious Linked Task", goalId: sarahGoalId }),
    });
    assert(taskRes.status === 403, "IDOR Task Association - Cannot link task to unowned goal (403 Forbidden)");
  }

  // TEST 5: Mass Assignment Protection on Task Updates (Remediated FINDING-05)
  // Create a legitimate task for Kavitha first
  const createKavithaTask = await fetch(`${BASE_URL}/api/v1/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: kavithaCookie },
    body: JSON.stringify({ title: "Kavitha Daily Task" }),
  });
  const kavithaTask = await createKavithaTask.json();
  const taskId = kavithaTask.task?.id;

  if (taskId) {
    // Attempt mass assignment to reassign task to Sarah
    const patchTaskRes = await fetch(`${BASE_URL}/api/v1/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: kavithaCookie },
      body: JSON.stringify({ id: taskId, userId: "foreign-user-id" }),
    });
    const patchTaskData = await patchTaskRes.json();
    assert(
      patchTaskData.task?.userId !== "foreign-user-id",
      "Mass Assignment Protection - Task userId parameter cannot be modified via PATCH"
    );
  }

  // TEST 6: Arbitrary Password Reset Rejection (Remediated FINDING-01)
  const fakeResetRes = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "sarah.chen@example.com",
      newPassword: "HackedPassword123!",
      token: "unauthorized_token_12345",
    }),
  });
  assert(fakeResetRes.status === 400, "Password Reset Protection - Arbitrary reset token rejected (400 Bad Request)");

  // TEST 7: 2FA Deactivation Protection (Remediated FINDING-02)
  const unauth2FADelete = await fetch(`${BASE_URL}/api/v1/auth/2fa`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Cookie: sarahCookie },
    body: JSON.stringify({}),
  });
  assert(
    unauth2FADelete.status === 400 || unauth2FADelete.status === 401,
    "2FA Deactivation Protection - 2FA cannot be disabled without password or TOTP re-authentication"
  );

  // TEST 8: Protocol Injection & Safe URL Validation (Remediated FINDING-09)
  const xssUrlRes = await fetch(`${BASE_URL}/api/v1/user/preferences`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: sarahCookie },
    body: JSON.stringify({ avatarUrl: "javascript:alert(document.domain)" }),
  });
  assert(xssUrlRes.status === 400, "Protocol Injection Protection - javascript: pseudo-protocol in avatarUrl rejected");

  // TEST 9: Stored XSS Sanitization (Remediated FINDING-09)
  const xssTaskRes = await fetch(`${BASE_URL}/api/v1/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sarahCookie },
    body: JSON.stringify({ title: "<script>alert('xss')</script>Goal Task" }),
  });
  const xssTaskData = await xssTaskRes.json();
  assert(
    xssTaskData.task?.title && !xssTaskData.task.title.includes("<script>"),
    "Stored XSS Sanitization - HTML tags sanitized before storage"
  );

  // TEST 10: CSRF Origin Protection (Remediated FINDING-10)
  const csrfRes = await fetch(`${BASE_URL}/api/v1/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sarahCookie,
      Origin: "https://evil-attacker-site.com",
    },
    body: JSON.stringify({ title: "CSRF Task Attempt" }),
  });
  assert(csrfRes.status === 403, "CSRF Origin Protection - Cross-site origin rejected with 403 Forbidden");

  // TEST 11: Account Rate Limiting (Remediated FINDING-06)
  const testEmail = `victim-${Date.now()}@example.com`;
  let rateLimited = false;
  for (let i = 0; i < 7; i++) {
    const rlRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "WrongPassword123!" }),
    });
    if (rlRes.status === 429) {
      rateLimited = true;
      break;
    }
  }
  assert(rateLimited, "Distributed Rate Limiting - Consecutive failed login attempts trigger 429 Lockout");

  // TEST 12: RBAC Admin Protection
  const adminForbiddenRes = await fetch(`${BASE_URL}/api/v1/admin/overview`, {
    headers: { Cookie: sarahCookie },
  });
  assert(adminForbiddenRes.status === 403, "RBAC Enforcement - Standard user rejected from /api/v1/admin/overview (403)");

  // TEST 13: Zero-Knowledge Admin Verification
  const adminUsersRes = await fetch(`${BASE_URL}/api/v1/admin/users`, {
    headers: { Cookie: adminCookie },
  });
  const adminUsersData = await adminUsersRes.json();
  let zeroKnowledgeCompliant = true;
  for (const u of adminUsersData.users || []) {
    if (u.goals !== undefined || u.gratitudeEntries !== undefined || u.passwordHash !== undefined) {
      zeroKnowledgeCompliant = false;
      break;
    }
  }
  assert(zeroKnowledgeCompliant, "Zero-Knowledge Admin - Private user goals/journals/passwords omitted from admin view");

  // TEST 14: Security Headers
  const headerRes = await fetch(`${BASE_URL}/`);
  const csp = headerRes.headers.get("content-security-policy");
  const hsts = headerRes.headers.get("strict-transport-security");
  const xcto = headerRes.headers.get("x-content-type-options");
  const xfo = headerRes.headers.get("x-frame-options");

  assert(!!csp && csp.includes("default-src 'self'"), "Security Headers - Strict CSP active");
  assert(!!hsts && hsts.includes("max-age="), "Security Headers - Strict-Transport-Security (HSTS) active");
  assert(xcto === "nosniff", "Security Headers - X-Content-Type-Options: nosniff active");
  assert(xfo === "DENY", "Security Headers - X-Frame-Options: DENY active");

  console.log(`\n══════════════════════════════════════════════════════════════`);
  console.log(`  Security Suite Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`══════════════════════════════════════════════════════════════\n`);

  if (failed > 0) process.exit(1);
}

runSecurityTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});

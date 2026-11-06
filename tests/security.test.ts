import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = "http://localhost:3000";

describe("GoalPath Cybersecurity Verification Suite (OWASP ASVS Level 2)", () => {
  let sarahCookie = "";
  let kavithaCookie = "";
  let adminCookie = "";
  let sarahGoalId = "";

  beforeAll(async () => {
    // 1. Authenticate Sarah
    const resSarah = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "sarah.chen@example.com", password: "Password123!" }),
    });
    const setCookieSarah = resSarah.headers.get("set-cookie");
    if (setCookieSarah) {
      sarahCookie = setCookieSarah.split(";")[0];
    }

    // 2. Authenticate Kavitha
    const resKavitha = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "kavitha.raman@example.com", password: "Password123!" }),
    });
    const setCookieKavitha = resKavitha.headers.get("set-cookie");
    if (setCookieKavitha) {
      kavithaCookie = setCookieKavitha.split(";")[0];
    }

    // 3. Authenticate Admin
    const resAdmin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@goalpath.app", password: "Password123!" }),
    });
    const setCookieAdmin = resAdmin.headers.get("set-cookie");
    if (setCookieAdmin) {
      adminCookie = setCookieAdmin.split(";")[0];
    }

    // Fetch Sarah's first goal ID
    const goalsRes = await fetch(`${BASE_URL}/api/v1/goals`, {
      headers: { Cookie: sarahCookie },
    });
    const goalsData = await goalsRes.json();
    if (goalsData.goals && goalsData.goals.length > 0) {
      sarahGoalId = goalsData.goals[0].id;
    }
  });

  it("Test 1: Auth Bypass Rejection - Anonymous requests to private routes return 401", async () => {
    const endpoints = [
      "/api/v1/goals",
      "/api/v1/tasks",
      "/api/v1/habits",
      "/api/v1/gratitude",
      "/api/v1/user/export",
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${BASE_URL}${ep}`);
      expect(res.status).toBe(401);
    }
  });

  it("Test 2: IDOR Protection - User B cannot read User A's private goal", async () => {
    if (!sarahGoalId) return;

    // Dr. Kavitha attempts to fetch Sarah's goal directly by ID
    const res = await fetch(`${BASE_URL}/api/v1/goals/${sarahGoalId}`, {
      headers: { Cookie: kavithaCookie },
    });

    // Must return 404 Not Found to prevent resource enumeration and data leakage
    expect(res.status).toBe(404);
  });

  it("Test 3: IDOR Mutation Protection - User B cannot update or delete User A's goal", async () => {
    if (!sarahGoalId) return;

    // Dr. Kavitha attempts to maliciously patch Sarah's goal
    const patchRes = await fetch(`${BASE_URL}/api/v1/goals/${sarahGoalId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: kavithaCookie,
      },
      body: JSON.stringify({ title: "Hacked Title" }),
    });
    expect(patchRes.status).toBe(404);

    // Dr. Kavitha attempts to delete Sarah's goal
    const delRes = await fetch(`${BASE_URL}/api/v1/goals/${sarahGoalId}`, {
      method: "DELETE",
      headers: { Cookie: kavithaCookie },
    });
    expect(delRes.status).toBe(404);
  });

  it("Test 4: RBAC Enforcement - Non-admin user cannot access Admin Console APIs", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/overview`, {
      headers: { Cookie: sarahCookie },
    });
    expect(res.status).toBe(403);

    const userManagementRes = await fetch(`${BASE_URL}/api/v1/admin/users`, {
      headers: { Cookie: sarahCookie },
    });
    expect(userManagementRes.status).toBe(403);
  });

  it("Test 5: Zero-Knowledge Admin Verification - Admin cannot view private user content", async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/users`, {
      headers: { Cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const data = await res.json();

    // Verify response contains only metadata counts, never private goal titles or notes
    expect(Array.isArray(data.users)).toBe(true);
    for (const u of data.users) {
      expect(u.goals).toBeUndefined();
      expect(u.gratitudeEntries).toBeUndefined();
      expect(u.passwordHash).toBeUndefined();
      expect(u._count).toBeDefined();
    }
  });

  it("Test 6: Security Headers Validation - Strict CSP, HSTS, and X-Content-Type-Options", async () => {
    const res = await fetch(`${BASE_URL}/`);
    const csp = res.headers.get("content-security-policy");
    const hsts = res.headers.get("strict-transport-security");
    const xcto = res.headers.get("x-content-type-options");
    const xfo = res.headers.get("x-frame-options");

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(hsts).toContain("max-age=");
    expect(xcto).toBe("nosniff");
    expect(xfo).toBe("DENY");
  });

  it("Test 7: Password Complexity & Zod Input Validation", async () => {
    const weakSignup = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test.weak@example.com",
        password: "short", // Fails minimum length and complexity
        name: "Test",
      }),
    });
    expect(weakSignup.status).toBe(400);
  });
});

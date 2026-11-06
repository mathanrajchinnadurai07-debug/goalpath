// GoalPath k6 Sustained Ramp Load Test Scenario
// Ramps 50 -> 200 -> 500 VUs over 6 minutes with realistic think time between requests

import http from "k6/http";
import { check, sleep, group } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 50 },   // Stage 1: Ramp to 50 VUs
    { duration: "2m", target: 200 },  // Stage 2: Sustained ramp to 200 VUs
    { duration: "2m", target: 500 },  // Stage 3: Sustained ramp to 500 VUs
    { duration: "1m", target: 0 },    // Stage 4: Graceful ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const BENCHMARK_PASSWORD = __ENV.BENCHMARK_USER_PASS || "BenchPass_2026_Secure!";

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: "benchmark@goalpath.io",
      password: BENCHMARK_PASSWORD,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
    }
  );

  const sessionCookie =
    loginRes.cookies["goalpath_session"] && loginRes.cookies["goalpath_session"][0]
      ? loginRes.cookies["goalpath_session"][0].value
      : "";

  return { sessionCookie };
}

export default function (data) {
  const authHeaders = data.sessionCookie
    ? { Cookie: `goalpath_session=${data.sessionCookie}` }
    : {};

  group("01_Public_Landing", () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      "landing status is 200": (r) => r.status === 200,
    });
    sleep(1);
  });

  group("02_Authenticated_Planner_And_Goals", () => {
    const goalsRes = http.get(`${BASE_URL}/api/v1/goals`, { headers: authHeaders });
    check(goalsRes, {
      "goals status is 200": (r) => r.status === 200,
    });
    sleep(1);

    const tasksRes = http.get(`${BASE_URL}/api/v1/tasks`, { headers: authHeaders });
    check(tasksRes, {
      "tasks status is 200": (r) => r.status === 200,
    });
    sleep(1);

    const analyticsRes = http.get(`${BASE_URL}/api/v1/analytics`, { headers: authHeaders });
    check(analyticsRes, {
      "analytics status is 200": (r) => r.status === 200,
    });
    sleep(1.5);
  });
}

export function handleSummary(data) {
  return {
    "k6-summary.json": JSON.stringify(data, null, 2),
  };
}

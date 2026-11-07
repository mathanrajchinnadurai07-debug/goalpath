# GoalPath Deployment Guide & Checklist (`DEPLOYMENT.md`)

---

## 1. Configurable Regions (App + Database + Redis Co-Location) — `[PARTIAL]`

> **Status: `PARTIAL`** (Configured in Terraform variables and documentation; actual deployment to AWS Singapore `ap-southeast-1` or Vercel `sin1` requires user cloud account credentials).

Always deploy the Next.js application, Neon PostgreSQL database, and Upstash Redis instance in the **same geographic region** so database and cache round-trips stay sub-5ms internally.

| Target User Base | Recommended App Region (`APP_REGION`) | Recommended Neon Region (`NEON_REGION`) | Recommended Upstash Region | Expected RTT |
| :--- | :--- | :--- | :--- | :--- |
| **India / South Asia (Recommended)** | **`ap-southeast-1` / Vercel `sin1` (Singapore)** | **`aws-ap-southeast-1` (Singapore)** | **`ap-southeast-1` (Singapore)** | **~35–45 ms from India (<2 ms App-to-DB)** |
| Europe / UK | `eu-central-1` / Vercel `fra1` (Frankfurt) | `aws-eu-central-1` (Frankfurt) | `eu-central-1` (Frankfurt) | <2 ms App-to-DB |
| North America (East) | `us-east-1` / Vercel `iad1` (N. Virginia) | `aws-us-east-1` (N. Virginia) | `us-east-1` (N. Virginia) | <2 ms App-to-DB |

### Region Configuration Variables
- **Terraform (`terraform/main.tf`):**
  ```bash
  terraform plan \
    -var="app_region=ap-southeast-1" \
    -var="neon_region=aws-ap-southeast-1"
  ```
- **Vercel / Serverless Function Region:** Set Function Region to **Singapore (`sin1` / `ap-southeast-1`)** in Project Settings $\rightarrow$ Functions.
- **Neon CLI / Console:** Select region **`aws-ap-southeast-1` (Asia Pacific — Singapore)** when creating your production project and test branch.

---

## 2. Step-by-Step Deployment Checklist — `[PARTIAL]`

> **Status: `PARTIAL`** (Checklist documented and tested locally against isolated database; final execution depends on user creating remote GitHub repo, adding secrets, and triggering the workflow).

### Step 1: Create the GitHub Repository & Push Code
- [ ] Create a new private or public repository on GitHub (e.g., `https://github.com/<your-org>/goalpath.git`).
- [ ] Verify `.env` is ignored (`git check-ignore -v .env`) and zero secrets exist in git history:
  ```bash
  gitleaks git . --log-opts="--all" --verbose
  ```
- [ ] Add the GitHub remote and push `master`:
  ```bash
  git remote add origin https://github.com/<your-org>/goalpath.git
  git branch -M main
  git push -u origin main
  ```

### Step 2: Provision Co-Located Database & Redis in Singapore (`ap-southeast-1`)
- [ ] **Neon PostgreSQL 16 (`aws-ap-southeast-1`):**
  1. In the [Neon Console](https://console.neon.tech), create a project in **AWS Asia Pacific (Singapore) — `aws-ap-southeast-1`**.
  2. Create two branches:
     - `main` (Production database — **never** run `seed.ts` against this branch)
     - `test` (Isolated test branch for E2E/Security suites)
  3. Copy the pooled connection URI (`?sslmode=require&connect_timeout=15`) for `DATABASE_URL`.
- [ ] **Upstash Redis 7 (`ap-southeast-1`):**
  1. In the [Upstash Console](https://console.upstash.com), create a Redis database in **AWS `ap-southeast-1` (Singapore)** with TLS enabled.
  2. Copy the `rediss://` endpoint URL for `REDIS_URL`.

### Step 3: Set GitHub Repository Secrets & Environment Variables
- [ ] In GitHub, navigate to **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions** and add:
  - `DATABASE_URL`: Pooled PostgreSQL connection string for your production/staging database.
  - `TEST_DATABASE_URL`: Pooled PostgreSQL connection string for your isolated test database branch.
  - `REDIS_URL`: TLS Redis connection string.
  - `APP_SECRET`: 32+ byte random secret generated via `openssl rand -hex 32`.
- [ ] In GitHub **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions $\rightarrow$ Variables**, add:
  - `APP_REGION`: `ap-southeast-1`
  - `NEON_REGION`: `aws-ap-southeast-1`

### Step 4: Deploy the Application in Singapore (`ap-southeast-1` / `sin1`)
- [ ] **Option A — Vercel / Managed Cloud:**
  1. Import your GitHub repository into Vercel.
  2. Under **Settings $\rightarrow$ Functions**, set **Function Region** to **Singapore (`sin1` — `ap-southeast-1`)** so compute runs in the exact same AWS datacenter region as Neon (`aws-ap-southeast-1`) and Upstash (`ap-southeast-1`).
  3. Add `DATABASE_URL`, `REDIS_URL`, `APP_SECRET`, `NEXTAUTH_URL`, and `NODE_ENV=production` in **Settings $\rightarrow$ Environment Variables**.
  4. Run production schema migrations before first boot:
     ```bash
     npx prisma migrate deploy
     ```
  5. Deploy and verify the production startup guard logs:
     `✅ Production database startup check passed: 0 users with is_seed=true found.`
- [ ] **Option B — Docker Compose / Self-Hosted VPS (Singapore `ap-southeast-1`):**
  ```bash
  cp .env.example .env
  # Populate DATABASE_URL, REDIS_URL, and APP_SECRET in .env
  docker compose up -d --build
  docker compose exec app npx prisma migrate deploy
  ```

### Step 5: Run & Verify the GitHub Actions CI/CD Workflow
- [ ] Navigate to the **Actions** tab in your GitHub repository and select **GoalPath Production CI/CD & Security Pipeline** (`.github/workflows/ci-cd.yml`).
- [ ] Trigger a push to `main` (or click **Run workflow**).
- [ ] Verify all pipeline stages succeed on the Linux runner (`postgres:16-alpine` + `redis:7-alpine` service containers):
  1. **Gitleaks** full git history secret scan (`0 leaks found`)
  2. **Semgrep** OWASP Top 10 SAST scan (`0 findings`)
  3. **`npm audit`** (`0 high/critical vulnerabilities`)
  4. **Production Startup Guard Test** (verifies `NODE_ENV=production` aborts when `is_seed=true` rows exist, and passes when `is_seed=false`)
  5. **Two-Instance Redis Distributed State & Rate-Limit Suite** (`8/8 PASS`)
  6. **Hostile External Pen-Test Security Suite** (`19/19 PASS`)
  7. **Playwright E2E Suite** (`11/11 PASS`)
  8. **OWASP ZAP Baseline Scan** (`ghcr.io/zaproxy/zaproxy:stable`)
  9. **Trivy Container Image Scan** (`aquasec/trivy:latest`)
  10. **k6 Sustained Ramp Load Test** (`grafana/k6:latest`, `50 -> 200 -> 500 VUs` with think time)
- [ ] Download the `goalpath-verification-reports` artifact bundle from the completed workflow run to archive the HTML/JSON reports.

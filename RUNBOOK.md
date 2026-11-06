# GoalPath Production Operations Runbook (RUNBOOK.md)

---

## 1. Zero-Downtime Deployment Procedure

### 1.1 Automated Containerized Release
1. Build the release container:
   ```bash
   docker build -t goalpath:v1.0.0 .
   ```
2. Run database migration in non-blocking mode:
   ```bash
   npx prisma migrate deploy
   ```
3. Update docker compose service with rolling recreation:
   ```bash
   docker compose up -d --no-deps --build app
   ```
4. Verify healthcheck endpoint:
   ```bash
   curl -I http://localhost:3000/
   ```

---

## 2. Automated Backups & Disaster Recovery

### 2.1 Daily Automated Backup Execution
- **Frequency**: Every 24 hours at 02:00 UTC.
- **RPO (Recovery Point Objective)**: $\le 1$ hour (WAL archiving enabled).
- **RTO (Recovery Time Objective)**: $\le 15$ minutes.

Backup Command (PostgreSQL):
```bash
docker exec -t goalpath-postgres pg_dump -U goalpath_user -F c -b -v -f /var/lib/postgresql/data/backup_$(date +%Y%m%d_%H%M%S).dump goalpath_db
```

### 2.2 Restoration Drill Runbook
1. Stop the application web tier to halt incoming writes:
   ```bash
   docker compose stop app
   ```
2. Restore database from snapshot:
   ```bash
   docker exec -t goalpath-postgres pg_restore -U goalpath_user -d goalpath_db -v /var/lib/postgresql/data/backup_target.dump
   ```
3. Start the application tier:
   ```bash
   docker compose start app
   ```
4. Execute audit query verifying row counts:
   ```bash
   npx tsx scripts/run-security-tests.ts
   ```

---

## 3. Secret Rotation Procedures

### 3.1 Rotating Application Secret (`APP_SECRET` / JWT Key)
1. Generate a new high-entropy 32-byte secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update the environment variable in secrets manager / `.env`.
3. Perform a zero-downtime rolling restart. Existing active database sessions remain valid because sessions validate against database tokens.

### 3.2 Database Password Rotation
1. Update credentials in PostgreSQL role:
   ```sql
   ALTER USER goalpath_user WITH PASSWORD 'new_secure_password_here';
   ```
2. Update `DATABASE_URL` in `.env`.
3. Restart `goalpath-app` container.

---

## 4. Incident Response & Triage

| Symptom | Probable Cause | Triage & Mitigation Action |
|---|---|---|
| **High 500 Error Spike** | Database connection exhaustion | Inspect connection pool limits. Scale Aurora serverless v2 capacity or verify Prisma connection string pool sizing (`?connection_limit=20`). |
| **High 429 Rate Limit Spike** | Distributed brute force / crawler | Check `/api/v1/admin/audit-logs` for attacking IP ranges. Add firewall rule in Cloudflare / AWS WAF. |
| **Memory Spike on Web Pod** | Audio synthesizer or uncollected timers | Check active node processes. The Web Audio synthesizer runs purely in browser client; check Next.js memory footprint and restart pod if needed. |

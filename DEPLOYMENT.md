# GoalPath Deployment Guide (DEPLOYMENT.md)

---

## Option 1: Managed Cloud Deployment (Vercel + Supabase / Neon + Upstash)

This configuration requires minimal maintenance and scales automatically from zero to millions of users.

### 1. Database Setup (Supabase / Neon)
1. Create a PostgreSQL project on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Copy the Connection Pooling URL (`postgresql://...`).
3. Set `DATABASE_URL` in your environment.

### 2. Redis Setup (Upstash)
1. Create a serverless Redis database on [Upstash](https://upstash.com).
2. Copy the REST / Redis connection URL.
3. Set `REDIS_URL` in your environment.

### 3. Vercel Deployment
1. Connect your GitHub repository to Vercel.
2. In Project Settings $\rightarrow$ Environment Variables, configure:
   ```env
   DATABASE_URL="postgresql://user:pass@ep-pooler.us-east-1.aws.neon.tech/goalpath?sslmode=require"
   APP_SECRET="generate-32-char-random-secret"
   NEXTAUTH_URL="https://your-goalpath-domain.com"
   NODE_ENV="production"
   ```
3. Deploy! Next.js will automatically build and distribute the app across global edge points.

---

## Option 2: Self-Hosted Docker Deployment (VPS + Docker Compose + Nginx)

For organizations requiring total data sovereignty and air-gapped security.

### 1. Provision Host
- Ubuntu 22.04 LTS / Debian 12 (Minimum 2 vCPU, 4GB RAM, 40GB SSD).
- Install Docker and Docker Compose plugin:
  ```bash
  sudo apt update && sudo apt install -y docker.io docker-compose-plugin
  ```

### 2. Clone & Configure
```bash
git clone https://github.com/your-org/goalpath.git /opt/goalpath
cd /opt/goalpath
cp .env.example .env
```
Edit `.env` to configure strong passwords for `POSTGRES_PASSWORD` and `APP_SECRET`.

### 3. Launch Services
```bash
docker compose up -d
```
Verify running containers:
```bash
docker compose ps
```

### 4. Database Seeding & Migrations
```bash
docker compose exec app npx prisma db push
docker compose exec app npx tsx scripts/seed.ts
```

### 5. Nginx Reverse Proxy with Let's Encrypt SSL
Create `/etc/nginx/sites-available/goalpath`:
```nginx
server {
    server_name goalpath.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Obtain SSL certificate:
```bash
sudo certbot --nginx -d goalpath.yourdomain.com
```

$env:CHROME_PATH = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outDir = "d:\asta\lighthouse-reports"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "══════════════════════════════════════════════════════════════════"
Write-Host "  GoalPath Real Lighthouse CLI Audit for 4 Core Pages"
Write-Host "══════════════════════════════════════════════════════════════════"

# Authenticate benchmark user without printing credentials or tokens
$benchPass = if ($env:BENCHMARK_USER_PASS) { $env:BENCHMARK_USER_PASS } else { "BenchPass_2026_Secure!" }
$loginBody = @{ email = "benchmark@goalpath.io"; password = $benchPass } | ConvertTo-Json
$loginRes = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -Headers @{ Origin = "http://localhost:3000" } -UseBasicParsing
$cookie = ($loginRes.Headers["Set-Cookie"] -split ";")[0]
Write-Host "✅ Authenticated session established (HTTP $($loginRes.StatusCode))"

# Warm up /goals and /planner API routes once so Neon connection is active
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/goals" -Headers @{ Cookie = $cookie } -UseBasicParsing | Out-Null
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/tasks" -Headers @{ Cookie = $cookie } -UseBasicParsing | Out-Null

# 1. Landing
Write-Host "`n[1/4] Auditing / (Landing)..."
cmd /c "lighthouse http://localhost:3000/ --output=json --output=html --output-path=""$outDir\landing"" --chrome-flags=""--headless --no-sandbox --disable-gpu"" --quiet"

# 2. Dashboard
Write-Host "[2/4] Auditing /dashboard (Dashboard)..."
$extraHeaders = "{`"Cookie`":`"$cookie`"}"
$headersFile = "$outDir\lh-headers.json"
Set-Content -Path $headersFile -Value $extraHeaders -NoNewline

cmd /c "lighthouse http://localhost:3000/dashboard --extra-headers=""$headersFile"" --output=json --output=html --output-path=""$outDir\dashboard"" --chrome-flags=""--headless --no-sandbox --disable-gpu"" --quiet"

# 3. Planner
Write-Host "[3/4] Auditing /planner (Daily Planner)..."
cmd /c "lighthouse http://localhost:3000/planner --extra-headers=""$headersFile"" --output=json --output=html --output-path=""$outDir\planner"" --chrome-flags=""--headless --no-sandbox --disable-gpu"" --quiet"

# 4. Goals
Write-Host "[4/4] Auditing /goals (Goals Engine)..."
cmd /c "lighthouse http://localhost:3000/goals --extra-headers=""$headersFile"" --output=json --output=html --output-path=""$outDir\goals"" --chrome-flags=""--headless --no-sandbox --disable-gpu"" --quiet"

Remove-Item -Path $headersFile -Force -ErrorAction SilentlyContinue
Write-Host "`n✅ All 4 Lighthouse audits completed!"

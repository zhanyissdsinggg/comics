$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"

Write-Host "Starting database..."
& (Join-Path $PSScriptRoot "db-start.ps1") | Out-Null

Write-Host "Backend prisma push..."
Push-Location $backend
& npm run prisma:push
& npm run build
Pop-Location

Write-Host "Starting backend..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run start:dev" -WorkingDirectory $backend
& (Join-Path $PSScriptRoot "wait-http.ps1") -Url "http://localhost:4000/api/health" -TimeoutSec 40 | Out-Null

Write-Host "Frontend lint/build..."
Push-Location $root
& npm run lint
& npm run build
Pop-Location

Write-Host "Backend self-check..."
Push-Location $backend
& npm run self-check
Pop-Location

Write-Host "Health-check..."
Push-Location $root
& npm run health-check
Pop-Location

Write-Host "CI check done."

$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting PostgreSQL..."
& (Join-Path $PSScriptRoot "db-start.ps1") | Out-Null

Write-Host "Starting backend..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run start:dev" -WorkingDirectory (Join-Path $root "backend")
& (Join-Path $PSScriptRoot "wait-http.ps1") -Url "http://localhost:4000/api/health" -TimeoutSec 40 | Out-Null

Write-Host "Starting frontend..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory $root

Write-Host "All services started."

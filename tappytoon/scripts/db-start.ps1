$pgBin = "C:/Program Files/PostgreSQL/15/bin"
$pgData = "C:/Program Files/PostgreSQL/15/data"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$logFile = Join-Path $env:USERPROFILE "pg-logfile"

if (-not (Test-Path $pgCtl)) {
  Write-Host "PostgreSQL not found at $pgCtl"
  exit 1
}

& $pgCtl -D $pgData -l $logFile start | Out-Null
Start-Sleep -Seconds 1
& (Join-Path $pgBin "pg_isready.exe") -h "localhost" -p 5432

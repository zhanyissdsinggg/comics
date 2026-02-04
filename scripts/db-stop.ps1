$pgBin = "C:/Program Files/PostgreSQL/15/bin"
$pgData = "C:/Program Files/PostgreSQL/15/data"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"

if (-not (Test-Path $pgCtl)) {
  Write-Host "PostgreSQL not found at $pgCtl"
  exit 1
}

& $pgCtl -D $pgData stop

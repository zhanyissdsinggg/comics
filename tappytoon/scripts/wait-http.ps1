param(
  [string]$Url = "http://localhost:4000/api/health",
  [int]$TimeoutSec = 30,
  [int]$IntervalMs = 500
)

$start = Get-Date
while ($true) {
  try {
    $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
      Write-Host "Ready: $Url ($($resp.StatusCode))"
      exit 0
    }
  } catch {
    # ignore and retry
  }
  $elapsed = (Get-Date) - $start
  if ($elapsed.TotalSeconds -ge $TimeoutSec) {
    Write-Host "Timeout waiting for $Url"
    exit 1
  }
  Start-Sleep -Milliseconds $IntervalMs
}

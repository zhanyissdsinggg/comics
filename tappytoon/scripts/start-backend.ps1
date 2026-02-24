$root = "c:/Users/86133/Downloads/tappytoon-nextjs/tappytoon"
$backend = "$root/backend"
$logs = "$root/.logs"
New-Item -ItemType Directory -Path "$logs" -Force | Out-Null

$outLog = "$logs/backend.out.log"
$errLog = "$logs/backend.err.log"

Start-Process -FilePath "npm" -ArgumentList "run","start:dev" -WorkingDirectory "$backend" -RedirectStandardOutput "$outLog" -RedirectStandardError "$errLog" | Out-Null
Write-Host "Backend start command issued. Logs:"
Write-Host "  $outLog"
Write-Host "  $errLog"

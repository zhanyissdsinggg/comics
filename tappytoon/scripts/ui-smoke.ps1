param(
  [string]$BaseUrl = "http://localhost:3003"
)

$ErrorActionPreference = "Stop"

function New-Session {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  return $session
}

function Test-Page($session, $url, $label, $expectStatus) {
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -WebSession $session
    $status = [int]$resp.StatusCode
  } catch {
    $response = $_.Exception.Response
    if ($response -and $response.StatusCode) {
      $status = [int]$response.StatusCode
    } else {
      $status = 0
    }
  }
  $ok = $status -eq $expectStatus
  if ($ok) {
    $flag = "OK"
  } else {
    $flag = "FAIL"
  }
  Write-Output ("[{0}] {1} -> {2} (expect {3})" -f $flag, $label, $status, $expectStatus)
}

function Ensure-Login($session, $baseUri, $email, $password) {
  $payload = @{ email = $email; password = $password } | ConvertTo-Json
  try {
    Invoke-WebRequest -Uri "$($baseUri)/api/auth/login" -Method Post -ContentType "application/json" -Body $payload -UseBasicParsing -WebSession $session | Out-Null
    $cookies = $session.Cookies.GetCookies($baseUri)
    return ($cookies["mn_session"] -ne $null)
  } catch {
    $registerPayload = @{ email = $email; password = $password } | ConvertTo-Json
    Invoke-WebRequest -Uri "$($baseUri)/api/auth/register" -Method Post -ContentType "application/json" -Body $registerPayload -UseBasicParsing -WebSession $session | Out-Null
    Invoke-WebRequest -Uri "$($baseUri)/api/auth/login" -Method Post -ContentType "application/json" -Body $payload -UseBasicParsing -WebSession $session | Out-Null
    $cookies = $session.Cookies.GetCookies($baseUri)
    return ($cookies["mn_session"] -ne $null)
  }
}

function Set-CookieValue($session, $baseUri, $name, $value) {
  $cookie = New-Object System.Net.Cookie($name, $value, "/", $baseUri.Host)
  $session.Cookies.Add($cookie)
}

$baseUri = [System.Uri]$BaseUrl
$session = New-Session

Write-Output "== UI smoke without cookies =="
Test-Page $session "$BaseUrl/" "home" 200
Test-Page $session "$BaseUrl/adult" "adult hub" 200
Test-Page $session "$BaseUrl/adult-gate?reason=NEED_LOGIN&returnTo=%2Fadult" "adult gate login" 200
Test-Page $session "$BaseUrl/library" "library" 200
Test-Page $session "$BaseUrl/search?q=midnight" "search" 200

Write-Output "== UI smoke with login + adult cookies =="
$email = "qa+{0}@example.com" -f (Get-Date -Format "yyyyMMddHHmmss")
$loggedIn = Ensure-Login $session $BaseUrl $email "pass123"
if (-not $loggedIn) {
  Write-Output "[FAIL] login failed"
}
Set-CookieValue $session $baseUri "mn_is_signed_in" "1"
Set-CookieValue $session $baseUri "mn_adult_confirmed" "1"
Set-CookieValue $session $baseUri "mn_adult_mode" "1"

Test-Page $session "$BaseUrl/adult" "adult hub (adult mode)" 200
Test-Page $session "$BaseUrl/series/c1" "series page" 200
Test-Page $session "$BaseUrl/read/c1/c1e1" "reader page" 200

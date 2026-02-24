param(
  [string]$BaseUrl = "http://localhost:3003"
)

$ErrorActionPreference = "Stop"

function New-Session {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  return $session
}

function Set-CookieValue($session, $baseUri, $name, $value) {
  $cookie = New-Object System.Net.Cookie($name, $value, "/", $baseUri.Host)
  $session.Cookies.Add($cookie)
}

function Test-Url($session, $url, $label, $expectStatus) {
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

function Get-Json($session, $url) {
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -WebSession $session
    return $resp.Content | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Ensure-Login($session, $baseUri, $email, $password) {
  $baseUrl = $baseUri.AbsoluteUri.TrimEnd("/")
  $payload = @{ email = $email; password = $password } | ConvertTo-Json
  try {
    Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $payload -UseBasicParsing -WebSession $session | Out-Null
    $cookies = $session.Cookies.GetCookies($baseUri)
    return ($cookies["mn_session"] -ne $null)
  } catch {
    $registerPayload = @{ email = $email; password = $password } | ConvertTo-Json
    Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $registerPayload -UseBasicParsing -WebSession $session | Out-Null
    Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $payload -UseBasicParsing -WebSession $session | Out-Null
    $cookies = $session.Cookies.GetCookies($baseUri)
    return ($cookies["mn_session"] -ne $null)
  }
}

$baseUri = [System.Uri]$BaseUrl
$session = New-Session

Write-Output "== Adult gate without cookies =="
Test-Url $session "$BaseUrl/api/series?adult=1" "series adult=1" 403
Test-Url $session "$BaseUrl/api/search?q=midnight&adult=1" "search adult=1" 403
Test-Url $session "$BaseUrl/api/rankings?adult=1" "rankings adult=1" 403
Test-Url $session "$BaseUrl/api/search/keywords?adult=1" "keywords adult=1" 403

$safeList = Get-Json $session "$BaseUrl/api/series?adult=0"
$safeSeriesId = $null
if ($safeList -and $safeList.results -and $safeList.results.Count -gt 0) {
  $safeSeriesId = $safeList.results[0].id
}
if ($safeSeriesId) {
  Test-Url $session "$BaseUrl/api/series/$safeSeriesId?adult=0" "series detail safe" 200
  Test-Url $session "$BaseUrl/api/comments?seriesId=$safeSeriesId" "comments safe" 200
  $safeDetail = Get-Json $session "$BaseUrl/api/series/$safeSeriesId?adult=0"
  $safeEpisodeId = $null
  if ($safeDetail -and $safeDetail.episodes -and $safeDetail.episodes.Count -gt 0) {
    $safeEpisodeId = $safeDetail.episodes[0].id
  }
  if ($safeEpisodeId) {
    Test-Url $session "$BaseUrl/api/episode?seriesId=$safeSeriesId&episodeId=$safeEpisodeId" "episode safe" 200
  }
}

Write-Output "== Login + enable adult cookies =="
$email = "qa+{0}-{1}@example.com" -f (Get-Date -Format "yyyyMMddHHmmss"), (Get-Random -Maximum 9999)
$loggedIn = Ensure-Login $session $baseUri $email "pass123"
if ($loggedIn) {
  $cookieJar = $session.Cookies.GetCookies($baseUri)
  Test-Url $session "$BaseUrl/api/auth/me" "auth me" 200
} else {
  Write-Output "[FAIL] login failed"
}
Set-CookieValue $session $baseUri "mn_is_signed_in" "1"
Set-CookieValue $session $baseUri "mn_adult_confirmed" "1"
Set-CookieValue $session $baseUri "mn_adult_mode" "1"

Test-Url $session "$BaseUrl/api/series?adult=1" "series adult=1" 200
Test-Url $session "$BaseUrl/api/search?q=midnight&adult=1" "search adult=1" 200
Test-Url $session "$BaseUrl/api/rankings?adult=1" "rankings adult=1" 200
Test-Url $session "$BaseUrl/api/notifications?adult=1" "notifications adult=1" 200
Test-Url $session "$BaseUrl/api/search/keywords?adult=1" "keywords adult=1" 200

$adultList = Get-Json $session "$BaseUrl/api/series?adult=1"
$adultSeriesId = $null
if ($adultList -and $adultList.results -and $adultList.results.Count -gt 0) {
  $adultSeriesId = $adultList.results[0].id
}
if ($adultSeriesId) {
  Test-Url $session "$BaseUrl/api/series/$adultSeriesId?adult=1" "series detail adult" 200
  Test-Url $session "$BaseUrl/api/comments?seriesId=$adultSeriesId" "comments adult" 200
  $adultDetail = Get-Json $session "$BaseUrl/api/series/$adultSeriesId?adult=1"
  $adultEpisodeId = $null
  if ($adultDetail -and $adultDetail.episodes -and $adultDetail.episodes.Count -gt 0) {
    $adultEpisodeId = $adultDetail.episodes[0].id
  }
  if ($adultEpisodeId) {
    Test-Url $session "$BaseUrl/api/episode?seriesId=$adultSeriesId&episodeId=$adultEpisodeId" "episode adult" 200
  }
  $ratingPayload = @{ seriesId = $adultSeriesId; rating = 5 } | ConvertTo-Json
  try {
    $ratingResp = Invoke-WebRequest -Uri "$BaseUrl/api/ratings" -Method Post -ContentType "application/json" -Body $ratingPayload -UseBasicParsing -WebSession $session
    Write-Output ("[OK] rating adult -> " + $ratingResp.StatusCode)
  } catch {
    $response = $_.Exception.Response
    if ($response -and $response.StatusCode) {
      Write-Output ("[FAIL] rating adult -> " + [int]$response.StatusCode)
    } else {
      Write-Output "[FAIL] rating adult -> error"
    }
  }
}

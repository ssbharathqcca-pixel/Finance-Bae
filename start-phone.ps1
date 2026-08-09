# Start GBP for Android + iPhone Expo Go (tunnel mode — works around Windows firewall)
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$env:EXPO_NO_TELEMETRY = "1"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GBP phone connect (TUNNEL mode)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Free port 8081
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped old process on 8081 (PID $($_.OwningProcess))"
  } catch {}
}
Start-Sleep -Seconds 1

# Start expo tunnel in a new window so you can see logs
$cmd = @"
cd `"$PSScriptRoot`"
`$env:EXPO_NO_TELEMETRY='1'
npx expo start --tunnel --clear --port 8081
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd

Write-Host "Waiting for tunnel (up to 90s)..." -ForegroundColor Yellow
$url = $null
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 2
  try {
    $ngrok = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
    $t = $ngrok.tunnels | Where-Object { $_.public_url -match 'https://' } | Select-Object -First 1
    if ($t) {
      $hostName = ([Uri]$t.public_url).Host
      $url = "exp://${hostName}:80"
      break
    }
  } catch {}
  Write-Host -NoNewline "."
}
Write-Host ""

if (-not $url) {
  Write-Host "Tunnel not ready yet. In the Expo window wait for 'Tunnel ready'," -ForegroundColor Red
  Write-Host "then open http://127.0.0.1:4040 in your browser to copy the public URL." -ForegroundColor Red
  Write-Host "Convert https://NAME.exp.direct  ->  exp://NAME.exp.direct:80" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PASTE THIS IN EXPO GO ON YOUR PHONE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  $url" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ""
Write-Host "iPhone:  Expo Go -> Enter URL manually" -ForegroundColor Cyan
Write-Host "Android: Expo Go -> Enter URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Keep the other PowerShell window OPEN while you use the app." -ForegroundColor Yellow
Write-Host ""

# Write latest URL for the HTML helper
@"
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Open GBP in Expo Go</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 420px; margin: 40px auto; padding: 16px; text-align: center; }
    code { display:block; background:#111; color:#0f0; padding:16px; border-radius:12px; word-break:break-all; margin:16px 0; }
    a.btn { display:inline-block; background:#059669; color:#fff; padding:14px 20px; border-radius:12px; text-decoration:none; font-weight:700; }
    img { margin: 20px auto; max-width: 260px; }
    p { color:#444; line-height:1.5; }
  </style>
</head>
<body>
  <h1>GBP → Expo Go</h1>
  <p>Scan the QR with your phone camera / Expo Go, or tap the button on the phone.</p>
  <img alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=$([uri]::EscapeDataString($url))" />
  <code>$url</code>
  <p><a class="btn" href="$url">Open in Expo Go</a></p>
  <p>If it times out, re-run <b>start-phone.ps1</b> on the PC and refresh this page.</p>
</body>
</html>
"@ | Set-Content -Path (Join-Path $PSScriptRoot "open-on-phone.html") -Encoding UTF8

Write-Host "Also opened open-on-phone.html (QR + link)." -ForegroundColor Cyan
Start-Process (Join-Path $PSScriptRoot "open-on-phone.html")

# Start GBP for Expo Go on the SAME Wi-Fi (LAN — no tunnel).
# Prerequisite: run fix-lan-firewall.ps1 once as Administrator.

$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$env:EXPO_NO_TELEMETRY = "1"

# Detect Wi-Fi IPv4 (skip WSL / virtual)
$lanIp = (
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.InterfaceAlias -notmatch 'WSL|vEthernet|Loopback|Virtual|Hyper-V|Bluetooth' -and
    ($_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.1[6-9].*' -or $_.IPAddress -like '172.2[0-9].*' -or $_.IPAddress -like '172.3[0-1].*')
  } |
  Sort-Object { if ($_.InterfaceAlias -match 'Wi-?Fi|Wireless') { 0 } else { 1 } } |
  Select-Object -First 1
).IPAddress

if (-not $lanIp) {
  Write-Host "Could not detect LAN IP. Connect to Wi-Fi and retry." -ForegroundColor Red
  exit 1
}

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanIp
$env:EXPO_DEVTOOLS_LISTEN_ADDRESS = "0.0.0.0"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GBP phone connect (LAN / same Wi-Fi)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PC Wi-Fi IP:  $lanIp" -ForegroundColor White
Write-Host "  Expo URL:     exp://${lanIp}:8081" -ForegroundColor Green
Write-Host ""
Write-Host "  iPhone / Android Expo Go:" -ForegroundColor Cyan
Write-Host "    → Enter URL → exp://${lanIp}:8081" -ForegroundColor White
Write-Host ""
Write-Host "  Web still works: http://localhost:8081" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  If phone times out: right-click fix-lan-firewall.ps1 → Run with PowerShell" -ForegroundColor Yellow
Write-Host "  (approve UAC once). Tunnel is only needed if your router blocks device-to-device." -ForegroundColor Yellow
Write-Host ""

# Free 8081
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped old process on 8081 (PID $($_.OwningProcess))"
  } catch {}
}
Start-Sleep -Seconds 1

$expUrl = "exp://${lanIp}:8081"
$html = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Open GBP in Expo Go (LAN)</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 440px; margin: 40px auto; padding: 16px; text-align: center; }
    code { display:block; background:#111; color:#0f0; padding:16px; border-radius:12px; word-break:break-all; margin:16px 0; font-size:16px; }
    a.btn { display:inline-block; background:#059669; color:#fff; padding:14px 20px; border-radius:12px; text-decoration:none; font-weight:700; margin:6px; }
    p { color:#444; line-height:1.5; }
    .warn { background:#FEF3C7; padding:12px; border-radius:10px; text-align:left; font-size:14px; }
  </style>
</head>
<body>
  <h1>GBP → Expo Go (same Wi‑Fi)</h1>
  <p>PC and phones must be on the <b>same Wi‑Fi</b> (not guest/IoT).</p>
  <img alt="QR" width="260" height="260" src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=$([uri]::EscapeDataString($expUrl))" />
  <code>$expUrl</code>
  <p><a class="btn" href="$expUrl">Open in Expo Go</a></p>
  <div class="warn">
    <b>Phone times out?</b><br/>
    1. On PC: right‑click <code>fix-lan-firewall.ps1</code> → Run with PowerShell → Yes on UAC.<br/>
    2. Force‑close Expo Go and enter the URL above again.<br/>
    3. Turn off VPN on phone/PC.<br/>
    4. Only if still blocked: use tunnel (<code>npm run start:tunnel</code>).
  </div>
</body>
</html>
"@
Set-Content -Path (Join-Path $PSScriptRoot "open-on-phone.html") -Value $html -Encoding UTF8
Set-Content -Path (Join-Path $PSScriptRoot ".lan-ip.txt") -Value $lanIp -Encoding ascii
Set-Content -Path (Join-Path $PSScriptRoot "CONNECT_PHONE.txt") -Value @"
GBP LAN connect (same Wi-Fi — no tunnel needed if firewall is open)

1. FORCE CLOSE Expo Go on both phones.
2. Reopen Expo Go → Enter URL:

$expUrl

3. Or open open-on-phone.html on the PC and scan the QR.

Web: http://localhost:8081

If timeout: run fix-lan-firewall.ps1 as Administrator once.
"@ -Encoding UTF8

try { Start-Process (Join-Path $PSScriptRoot "open-on-phone.html") } catch {}

Write-Host "Starting Metro with LAN host $lanIp ..." -ForegroundColor Cyan
& "C:\Program Files\nodejs\npx.cmd" expo start --lan --clear --port 8081

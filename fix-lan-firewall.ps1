# Run once (Administrator) so phones on the same Wi-Fi can reach Metro.
# Without this, Windows Public network profile blocks Expo Go → timeouts.
# Tunnel is NOT required if this succeeds.

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "GBP — open Windows Firewall for Expo LAN" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
  Write-Host "Requesting Administrator permission (UAC)..." -ForegroundColor Yellow
  $script = $MyInvocation.MyCommand.Path
  Start-Process powershell -Verb RunAs -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$script`""
  ) | Out-Null
  exit 0
}

$ports = @(8081, 19000, 19001, 19002)
foreach ($port in $ports) {
  $name = "GBP Expo TCP $port"
  $existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Already exists: $name"
  } else {
    New-NetFirewallRule `
      -DisplayName $name `
      -Direction Inbound `
      -Protocol TCP `
      -LocalPort $port `
      -Action Allow `
      -Profile Any | Out-Null
    Write-Host "Created: $name" -ForegroundColor Green
  }
}

$node = "C:\Program Files\nodejs\node.exe"
if (Test-Path $node) {
  $name = "GBP Node.js Expo"
  if (-not (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule `
      -DisplayName $name `
      -Direction Inbound `
      -Program $node `
      -Action Allow `
      -Profile Any | Out-Null
    Write-Host "Created: $name" -ForegroundColor Green
  } else {
    Write-Host "Already exists: $name"
  }
}

# Prefer Private network so Windows is less aggressive
Get-NetConnectionProfile | Where-Object { $_.InterfaceAlias -match 'Wi-?Fi|Wireless' } | ForEach-Object {
  try {
    Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private -ErrorAction Stop
    Write-Host "Wi-Fi profile set to Private: $($_.Name)" -ForegroundColor Green
  } catch {
    Write-Host "Could not set Private (OK if Group Policy locks it): $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "Done. Close this window, then run start-lan.ps1 (or npm run start:lan)." -ForegroundColor Cyan
Write-Host "On phones use: exp://YOUR_PC_WIFI_IP:8081" -ForegroundColor Cyan
Write-Host ""
pause

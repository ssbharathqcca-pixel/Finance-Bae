# Fix: Expo Go “request timed out” (web works, phone fails)

This is almost always a **network** problem, not a bug in the app.  
The browser runs on your PC, so it never has to cross Wi‑Fi. Expo Go on your iPhone **must** reach your PC.

Your PC Wi‑Fi IP (example): `192.168.1.228`

---

## Best fix for you: Tunnel mode

On the PC, **stop** any old Expo window (Ctrl+C), then:

```powershell
cd C:\Users\pavan\OneDrive\Desktop\GBP
npm run start:tunnel
```

Wait until you see a **new QR code** (may take 30–60 seconds the first time).

On iPhone:
1. Open **Expo Go** (update it from the App Store if needed)
2. Scan that QR code  
   or **Enter URL** and paste the `exp://…` / tunnel URL shown in the terminal

Tunnel sends traffic through Expo’s servers, so Windows Firewall and “AP isolation” Wi‑Fi usually stop blocking you.

---

## If you want LAN (faster, same Wi‑Fi only)

### 1. Same network
- iPhone and PC on the **same Wi‑Fi**
- Avoid guest / “IoT” / work Wi‑Fi that isolates devices

### 2. Open Windows Firewall (one-time, as Administrator)

Open **PowerShell as Administrator** and run:

```powershell
New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private,Public
New-NetFirewallRule -DisplayName "Expo 19000" -Direction Inbound -Protocol TCP -LocalPort 19000 -Action Allow -Profile Private,Public
New-NetFirewallRule -DisplayName "Expo 19001" -Direction Inbound -Protocol TCP -LocalPort 19001 -Action Allow -Profile Private,Public
New-NetFirewallRule -DisplayName "Expo 19002" -Direction Inbound -Protocol TCP -LocalPort 19002 -Action Allow -Profile Private,Public
```

Or: Windows Security → Firewall → Allow an app → allow **Node.js** for Private networks.

### 3. Force the correct PC IP

```powershell
cd C:\Users\pavan\OneDrive\Desktop\GBP
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.1.228"
npm run start:lan
```

(Replace the IP if `ipconfig` shows a different Wi‑Fi address.)

In Expo Go, you can also open:

`exp://192.168.1.228:8081`

---

## Quick checklist

| Check | |
|--------|--|
| Web works | App code is fine |
| Timeout on phone | Phone cannot reach Metro on PC |
| Use tunnel | `npm run start:tunnel` |
| Same Wi‑Fi | Required for LAN only |
| Firewall | Often blocks port 8081 without Admin allow |
| VPN | Turn off VPN on phone/PC while testing |

---

## Scripts in this project

| Command | Use |
|---------|-----|
| `npm run start:tunnel` | **Recommended** when Expo Go times out |
| `npm run start:lan` | Same Wi‑Fi + firewall fixed |
| `npm run web` | Browser only |

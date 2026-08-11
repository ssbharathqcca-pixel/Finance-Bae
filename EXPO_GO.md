# Expo Go on phone (same Wi‑Fi)

Web uses `localhost` on your PC. Phones must reach your PC’s **Wi‑Fi IP** (e.g. `192.168.1.228:8081`).

## Why same Wi‑Fi still fails

| Cause | What happens |
|--------|----------------|
| Windows Firewall (most common) | Phone packets dropped → Expo Go timeout |
| Network profile **Public** | Windows blocks inbound more aggressively |
| Metro advertises `localhost` | QR is wrong for phones |
| Guest / AP isolation Wi‑Fi | Router blocks phone ↔ PC (tunnel only option) |
| VPN on phone or PC | Breaks LAN discovery |

**Tunnel is not required** when firewall + LAN IP are correct. Tunnel only works around blocked LAN.

---

## One-time: open firewall (Administrator)

On the PC:

```powershell
cd C:\Users\pavan\OneDrive\Desktop\GBP
npm run fix:firewall
```

Approve the **UAC** prompt. This allows ports **8081** (and Expo helper ports) inbound.

---

## Every time: start LAN mode

```powershell
cd C:\Users\pavan\OneDrive\Desktop\GBP
npm run start:lan
```

Then on **iPhone / Android Expo Go**:

1. Force‑close Expo Go  
2. **Enter URL** (do not use an old tunnel QR):

```text
exp://192.168.1.228:8081
```

(Use the IP printed by `start-lan.ps1` if yours differs.)

Or open `open-on-phone.html` and scan the QR.

Web still works at: http://localhost:8081

---

## If LAN still times out

1. PC and phones on the **same** SSID (not guest/IoT).  
2. VPN off on all devices.  
3. Re-run `npm run fix:firewall` and accept UAC.  
4. Last resort only: `npm run start:tunnel` then scan the new tunnel QR.

---

## Scripts

| Command | Use |
|---------|-----|
| `npm run fix:firewall` | One-time Windows allow rules (Admin) |
| `npm run start:lan` | Same Wi‑Fi, correct IP + QR |
| `npm run start:tunnel` | Bypass firewall/router isolation |
| `npm run web` | Browser only |

# GBP — Guided Budget Platform

Multi-platform finance companion for **North Americans** (United States & Canada).

One lucid app for:

- **Expense tracking** — categories, deductible flags, budget links  
- **Tax readiness** — educational **IRS** & **CRA** annual liability estimates  
- **Deductions management** — year-scoped write-offs  
- **Evidence vault** — organize notes/references for IRS & CRA notices  
- **Life budgets** — house parties, get-togethers, trips, dinner/lunch dates  
- **Home down-payment planner** — capital building tools  
- **Pet budgets** — monthly care envelopes + pet spend  
- **Calculator gadget** — quick math with haptic feedback  
- **iOS · Android · Web** via **Expo (React Native)**

> **Disclaimer:** Tax estimates are educational only and are **not** professional tax advice. Always verify with the IRS, CRA, or a licensed professional.

---

## Stack

| Layer | Choice |
|--------|--------|
| App framework | Expo SDK 57 + Expo Router |
| UI | React Native + custom design system |
| Motion | Fade/press scale + Reanimated ready |
| State | Zustand + AsyncStorage persistence |
| Platforms | iOS, Android, Web |

---

## Quick start

```bash
cd C:\Users\pavan\OneDrive\Desktop\GBP
npm install
npx expo start --clear   # scan QR with Expo Go on iPhone
npm run web              # browser
```

**iPhone (Expo Go):** same Wi‑Fi as the PC, latest Expo Go from the App Store.  
If the QR fails: `npx expo start --tunnel --clear`  
Full steps: see **EXPO_GO.md**.

**Requirements:** Node.js 20+. Expo SDK **57** (packages must match — run `npx expo-doctor`).

---

## App map

```
app/
  (tabs)/          Home · Expenses · Budgets · Tax · Gadgets
  expense/add      Log spending
  budget/create    Life-event envelopes
  tax/             Estimator · Deductions · Evidence vault
  tools/           Calculator · Down payment · Pets
  settings         Country (US/CA), currency, theme
src/
  components/ui    Lucid UI primitives
  store            On-device finance state
  lib/tax          Educational US/CA estimators
  theme            Design tokens
```

---

## Evidence vault (camera + PDF)

On **Tax → Evidence vault** (or Gadgets → Evidence vault):

- **Camera** — photograph IRS/CRA notices and receipts  
- **Gallery** — multi-select images  
- **PDF / file** — pick PDFs and images via the system document picker  
- Files are **copied into app storage** on iOS/Android (`documentDirectory/evidence-vault/`)  
- Metadata + local URIs persist with Zustand/AsyncStorage  
- Removing an evidence item deletes its stored files  

Permissions are configured in `app.json` (`expo-image-picker`, camera & photo library).

---

## Privacy-first CSV expense import (optional)

**Manual entry is always available.** CSV import is opt-in only.

| Principle | How GBP implements it |
|-----------|------------------------|
| User discretion | Explicit multi-checkbox consent before any file is read |
| No bank connection | No Plaid/open banking — user exports their own CSV |
| Local processing | File is read on-device; not uploaded to GBP servers |
| Data minimization | Only **name, category, amount, payment mode**, optional **date** |
| Deny-list | Account/routing/card/SSN/SIN/address/email columns cannot be mapped |
| Redaction | Long digit runs & identifiers stripped from expense names |
| Discard source | Original CSV text is dropped from memory after import/cancel |

Template columns: `name,amount,category,payment_method,date`

Path: **Expenses → CSV import** or **Settings → Privacy**.

> Not legal advice. Design aims to support privacy expectations (e.g. PIPEDA purpose limitation, US state minimization) for a personal on-device app.

---

## Tax tables & credits (educational)

| Coverage | Details |
|----------|---------|
| **US federal** | Brackets by filing status (single, MFJ, MFS, HOH) + standard deduction |
| **US states + DC** | No-tax states, flat-rate, and progressive models |
| **CA federal** | Progressive brackets + BPA credit at lowest rate |
| **CA provinces/territories** | All 13 with BPA-style credits; QC abatement simplified |
| **Credits** | US Child Tax Credit (simplified); CA BPA + dependent-style + QC abatement |

Path: **Tax → Estimator**. Figures are **illustrative**, not filing software.

---

## Split bills (trips & parties)

Fair-share ledgers for **house parties, get-togethers, trips, dinner/lunch dates**.

| Feature | Detail |
|---------|--------|
| Groups | People (first names only) + optional budget link |
| Expenses | Who paid, equal split or subset of friends |
| Settle up | Minimal transfer suggestions (A → B amounts) |
| Balances | Who is owed / who owes |
| Expenses | One-tap **log my share** into personal expenses |

Privacy: **no bank accounts** — only display names and dollar amounts, stored on-device.

Paths: **Budgets → Split bills**, **Gadgets → Split bills**, or `/split`.

---

## Auth & encrypted cloud sync

| Mode | Behavior |
|------|----------|
| **Guest** | Full app, device-local only |
| **Account** | Email + hashed password on-device; session token in SecureStore |
| **Export** | Encrypt finance snapshot with a **backup passphrase** → JSON file |
| **Restore** | Pick encrypted file + passphrase → replace local data |
| **Cloud opt-in** | Optional; only uploads the **already-encrypted** blob |

Remote sync activates when you set:

```bash
# .env or app config
EXPO_PUBLIC_SYNC_URL=https://your-sync-api.example.com
```

Expected API (you host):

- `POST /v1/backups` — body `{ backup }` + `Authorization: Bearer <token>`
- `GET /v1/backups/latest` — returns `{ backup }`

Passwords and bank data are never required. Evidence binary files may remain device-local after restore if paths differ.

Paths: **Home 👤**, **Settings → Account**, **Gadgets → Account & sync**.

---

## Dashboard & debt tracker

**Dashboard** tab shows income, expenses, and savings with calm growth-focused colors (teal/green for income & savings, soft amber for spend, coral only for debt).

| View | Charts |
|------|--------|
| Income vs spend | Pie or bars |
| Categories | Pie or bars of this month’s spending |
| 6-month trend | Line plot: income · expenses · implied savings |

**Debt tracker** (`/debt`): total principal, weighted APR, estimated **cost of funds** (balance × APR), and breakdown for home loans, capex, credit cards, personal loans, overdraft, hand loans, auto, student, and other.

Set monthly take-home and savings balance in **Dashboard** or **Settings**.

---

## Loan & card eligibility guide (suggestive only)

Educational estimates for **home loans**, **personal loans**, **credit cards**, and **limit increases**, using US- or Canada-style themes:

- Debt load vs income  
- Money left after bills  
- Credit score band (you enter an estimate)  
- Job / income stability  
- Down payment & loan-to-value (home)  
- Card utilization & on-time history (cards / increases)  

**Not a bank decision.** No real credit pull. Final eligibility stays with each financial institution.

Path: **Gadgets → Eligibility** or `/eligibility`.

---

## Tax installment push reminders

Local notifications (iOS/Android) for:

| Region | Typical dates (confirm yearly) |
|--------|--------------------------------|
| **US** | Apr 15, Jun 15, Sep 15, Jan 15 (next year) |
| **CA** | Mar 15, Jun 15, Sep 15, Dec 15 |

Configure days-before, hour, and country under **Account & reminders**. Web shows the calendar in-app; reliable push needs a device build / Expo Go.

---

## Roadmap (next grind)

1. ~~Secure document upload for evidence (camera + PDF)~~ ✅  
2. ~~Bank/CSV import for expenses (privacy-first, opt-in)~~ ✅  
3. ~~Deeper state/province tax tables & credits~~ ✅  
4. ~~Shared trip/party split bills~~ ✅  
5. ~~Cloud sync + auth~~ ✅  
6. ~~Push reminders for estimated tax installments~~ ✅  

---

## License

Private project — all rights reserved unless you add a license.

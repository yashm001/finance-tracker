# CLAUDE.md — Personal Finance Tracker

## PROJECT CONTEXT

**Project:** Personal Finance Tracker (PWA)

## PROJECT RULES

- **Session start:** Read `tasks/lessons.md` and apply all rules before touching any code
- **During work:** Update `tasks/todo.md` as you work — mark items done, add new ones
- **Session end:** Run `/session-end` to rewrite `primer.md` with current state
- **On corrections:** When the user corrects you, write the lesson to `tasks/lessons.md` as a rule
- `.claude-memory.md` is auto-populated by a post-commit hook — check it for recent commit history

---

## Project Overview

A personal finance tracking system with three pieces:

1. **Google Sheet** — single source of truth for all transaction data
2. **iOS Shortcut** — quick-entry via Back Tap (double-tap iPhone back) → posts to Google Apps Script → appends row to sheet
3. **PWA Web App** — dashboard + transaction manager that reads/writes the same sheet via the same Apps Script API

This repo contains **Piece 3: the PWA**. Pieces 1 and 2 are already built and working.

## Architecture

```
iPhone Back Tap → iOS Shortcut → Apps Script → Google Sheet
                                                    ↕
              PWA (this repo) → Apps Script API → Google Sheet
```

The Google Sheet is the single source of truth. The Apps Script serves as the API layer. Both the Shortcut and PWA hit the same endpoints.

## Google Sheet Schema

**Sheet name:** `Transactions`

| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | Sr No. | Number | Auto-incremented |
| B | Name | Text | Transaction name (e.g., "SovaX", "Swiggy") |
| C | Date | Date | Format: dd-mmm-yyyy |
| D | Amount | Number | INR, format: ₹ with Indian grouping (lakhs/crores) |
| E | Mode | Text | Payment mode dropdown |
| F | Category | Text | "Personal" or "Work" |
| G | Sub-category | Text | Spending category dropdown |
| H | Description | Text | Optional notes |
| I | Year | Formula | `=YEAR(C)` — auto-calculated |
| J | Month | Formula | `=MONTH(C)` — auto-calculated |
| K | FY Start | Formula | `=IF(MONTH>=4, YEAR, YEAR-1)` — Indian financial year |
| L | Day | Formula | `=TEXT(C,"ddd")` — auto-calculated |

Columns I–L are formula columns. The API sets them when adding rows. Never write to them directly.

### Financial Year

All reporting uses Indian FY: April 1 → March 31. FY 2026-27 = Apr 2026 – Mar 2027. The `FY Start` column (K) stores the starting year of the FY a transaction belongs to.

### Dropdown Values

**Modes:** Infinia, Atlas, AmazonPay, SBI ELITE, Biz Black, UPI, Cash, NetBanking

**Categories:** Personal, Work

**Sub-categories:** Food & Dining, Groceries, Transport, Shopping, Health & Wellness, Entertainment, Travel, Bills & Utilities, Rent, Subscriptions, Investment, Trading, Gifts, Education, Other

These are editable via the Lists tab in the sheet. The API validates against these.

## Apps Script API

Base URL: deployed as Google Apps Script web app (user provides their own URL).

### Endpoints

**Add transaction (POST):**
```json
{
  "action": "quick_add",
  "amount": 250,
  "name": "Coffee",
  "category": "Personal",
  "mode": "UPI",
  "subcategory": "Food & Dining",
  "description": "optional note"
}
```
Response: `{"status":"ok","message":"Added: Coffee — ₹250","row":24,"data":{...}}`

**Get transactions (GET):**
```
?action=transactions           → all transactions
?action=transactions&fy=2026   → filtered by FY
?action=transactions&fy=2026&month=4  → filtered by FY + month
```
Response: `{"status":"ok","count":22,"transactions":[...]}`

Each transaction includes a `row` field (the sheet row number) used for edit/delete.

**Get FY summary (GET):**
```
?action=summary&fy=2026
```
Response:
```json
{
  "status": "ok",
  "fy": 2026,
  "fyTotal": 145000,
  "personal": 120000,
  "work": 25000,
  "avgPerMonth": 72500,
  "distinctMonths": 2,
  "byMonth": {"4": 80000, "5": 65000},
  "byMode": {"UPI": 50000, "Infinia": 95000},
  "bySubcat": {"Food & Dining": 30000, ...}
}
```

**Get dropdown options (GET):**
```
?action=dropdown_options
```
Response: `{"status":"ok","modes":[...],"categories":[...],"subcategories":[...]}`

**Edit transaction (POST):**
```json
{"action": "edit", "row": 5, "amount": 300, "name": "Updated Name"}
```
Only include fields you want to change.

**Delete transaction (POST):**
```json
{"action": "delete", "row": 5}
```

### API Notes

- The API URL is user-specific (their own Google Apps Script deployment)
- No auth headers needed — the Apps Script is deployed with "Anyone" access
- The URL acts as a secret key; don't hardcode it in the repo
- Date format from API: `YYYY-MM-DD`
- All amounts are in INR (Indian Rupees)
- Timezone: Asia/Kolkata (IST)

## Currency Formatting

Use Indian number system:
- ₹15,999
- ₹1,23,456 (1 lakh 23 thousand)
- ₹1,23,45,678 (1 crore 23 lakh)

Use `toLocaleString("en-IN")` for formatting.

## Dashboard KPIs

The dashboard should show (matching the Excel Dashboard tab):

**Focus month cards:**
- Total spend for selected month
- Personal vs Work split
- Transaction count

**FY cards:**
- FY total spend
- FY Personal / Work split
- Avg per month (= FY total ÷ number of months with data, NOT ÷ 12)

**Breakdowns:**
- Monthly breakdown in FY order (Apr → Mar) with bar visualization
- Spend by payment mode (FY) with progress bars
- Spend by sub-category (selected month) with progress bars

**Month selector:** pill/tab bar showing Apr → Mar in FY order.

## PWA Requirements

### Tech Stack
- Vite + React
- Tailwind CSS (or inline styles)
- Single-page app, no routing needed
- PWA manifest + service worker for add-to-homescreen

### Views
1. **Dashboard** — KPIs, breakdowns, charts (default view)
2. **Transactions** — list with edit/delete, filtered by month
3. **Add** — form to add new transaction (all fields)
4. **Settings** — enter/update Apps Script URL, sync status

### Design
- Mobile-first (max-width ~430px, centered on desktop)
- Dark theme (matches the React artifact already built)
- Bottom navigation: Dashboard | History | + Add | Settings
- INR formatting throughout
- FY-oriented (Apr → Mar)

### Data Flow
- On load: fetch transactions from Apps Script API
- Cache in React state (no localStorage — use React state only)
- Add/Edit/Delete: POST to API, then refresh local state
- Settings: store API URL (this one can use persistent storage)

### Offline
- Service worker caches the app shell
- Data requires network (reads from Google Sheets)
- Queued writes can be a future enhancement

## File Structure (target)

```
finance-tracker-pwa/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icon-192.png
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── api.js            ← Apps Script API client
│   ├── utils.js           ← formatINR, date helpers, FY logic
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── Transactions.jsx
│   │   ├── AddTransaction.jsx
│   │   ├── Settings.jsx
│   │   ├── KPICard.jsx
│   │   ├── BottomNav.jsx
│   │   └── MonthPills.jsx
│   └── styles/
│       └── index.css
├── CLAUDE.md
└── README.md
```

## Deployment

- Host on Vercel (connect GitHub repo → auto-deploy on push)
- Free tier is sufficient
- Add PWA to iPhone homescreen for app-like experience

## Commands

```bash
npm install          # install dependencies
npm run dev          # local dev server
npm run build        # production build
npm run preview      # preview production build
```

## Key Decisions

- **No backend** — Apps Script IS the backend
- **No auth in PWA** — the Apps Script URL is the auth (anyone with URL can access)
- **No localStorage for data** — fetch fresh from API each time (source of truth = sheet)
- **API URL stored in persistent storage** — so user doesn't re-enter it every session
- **FY-first** — every date grouping uses Indian financial year (Apr–Mar)
- **Avg/month** — always divides by months with actual data, never by 12
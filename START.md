# START.md — Project Context & Getting Started

## What This Project Is

A mobile-first PWA that serves as a dashboard and transaction manager for a personal finance tracking system. It connects to a Google Sheet (the source of truth) via a Google Apps Script API.

This is **Piece 3** of a three-piece system:

### Piece 1: Google Sheet (✅ built)
An Excel/Google Sheets workbook with:
- **Transactions** tab — main data entry (Sr No, Name, Date, Amount, Mode, Category, Sub-category, Description + 4 formula columns)
- **Dashboard** tab — KPIs, monthly breakdown, mode/sub-category spend tables, charts
- **Monthly Pivot** — Mode × Month matrix with heat map (FY order)
- **Category Pivot** — Personal vs Work × Month
- **Sub-Category Pivot** — Sub-cat × Month with heat map
- **Lists** tab — editable dropdown values (Modes, Categories, Sub-categories)

Key features:
- Indian rupee formatting (`₹1,23,456`)
- Financial year orientation (Apr 1 – Mar 31)
- Avg/month = total ÷ months with actual data (not ÷ 12)
- Dropdowns linked to Lists tab for easy editing

### Piece 2: iOS Shortcut + Apps Script API (✅ built)

**Google Apps Script** (deployed as web app):
- `doGet()` handles reads: transactions, summary, dropdown_options, ping
- `doPost()` handles writes: quick_add, edit, delete
- Finds first empty row by scanning column B (not `getLastRow()` which counts formatted rows)
- Sets formula columns (I–L) on each new row
- Date handling uses `Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd")` to avoid timezone issues
- Writes date as string (`YYYY-MM-DD`) and lets Sheets auto-parse — avoids `new Date()` timezone shift

**iOS Shortcut** ("Log Expense"):
- Ask for Number → amount
- Ask for Text → name
- Choose from List → category (Personal / Work)
- Choose from List → mode (Infinia, Atlas, UPI, etc.)
- Choose from List → subcategory (Food & Dining, Transport, etc.)
- Get Contents of URL → POST JSON to Apps Script
- Show Notification → confirmation

**Back Tap** wired in: Settings → Accessibility → Touch → Back Tap → Double Tap → Log Expense

### Piece 3: PWA (🔨 this repo)

What we're building now. A React web app that:
- Reads all transactions from the same Google Sheet via Apps Script
- Shows a dashboard with KPIs and breakdowns (mirrors the Excel Dashboard tab)
- Lists transactions with edit/delete capability
- Adds transactions (full form with all fields)
- Stores the API URL persistently so the user enters it once

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
git clone <this-repo>
cd finance-tracker-pwa
npm install
npm run dev
```

### Configuration
The app needs the user's Google Apps Script URL. This is entered in the Settings screen on first launch and stored persistently. No `.env` file needed — the URL is user-specific.

### Testing the API
Before building, verify the API works:

```bash
# Ping
curl "YOUR_APPS_SCRIPT_URL?action=ping"

# Get transactions
curl "YOUR_APPS_SCRIPT_URL?action=transactions&fy=2026"

# Get summary
curl "YOUR_APPS_SCRIPT_URL?action=summary&fy=2026"

# Add transaction
curl -X POST "YOUR_APPS_SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"quick_add","amount":100,"name":"Test","category":"Personal","mode":"UPI","subcategory":"Food & Dining"}'
```

## Design Reference

### UI/UX Targets
- Mobile-first, dark theme, max-width 430px
- Bottom tab navigation: Dashboard | History | + (Add) | Settings
- The "+" button is a floating FAB-style circle in the nav bar
- Month selector as horizontal scrollable pills (Apr → Mar)
- KPI cards with large monospace numbers
- Progress bars for mode/sub-category breakdowns
- Transaction cards with tags for mode, category, sub-category
- Edit/delete inline on each transaction card

### Color Palette
```
Background:     #0A0E17
Card surface:   rgba(255,255,255,0.03)
Card border:    rgba(255,255,255,0.06)
Primary:        #6366F1 (indigo) / #818CF8 (light indigo)
Success:        #10B981 (green — Personal)
Info:           #3B82F6 (blue — Work)
Warning:        #F59E0B (amber — sub-categories)
Text primary:   #F1F5F9
Text secondary: rgba(255,255,255,0.4)
Text muted:     rgba(255,255,255,0.2)
```

### Typography
- Primary: 'DM Sans' (Google Fonts)
- Monospace (numbers): 'JetBrains Mono' (Google Fonts)

### Existing React Artifact
A working prototype was already built as a Claude artifact (single JSX file). It has:
- Dashboard with KPI cards, month pills, mode/sub-category breakdowns
- Transaction list with edit/delete
- Add form with chip selectors for mode/category/sub-category
- Settings page with API URL input
- Bottom navigation
- Toast notifications
- In-memory state with persistent storage for data

The PWA should match this design but connect to the real API instead of local state.

## API Contract

See CLAUDE.md for full API documentation. Key points:

- Base URL: user-provided Apps Script URL (stored in settings)
- No auth headers — URL is the auth
- All responses are JSON with `status: "ok"` or `status: "error"`
- Transactions include a `row` field for edit/delete operations
- Date format: `YYYY-MM-DD`
- All amounts in INR (numbers, not strings)

## Deployment

### Vercel (recommended)
1. Push to GitHub
2. Import repo in Vercel dashboard
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy

### PWA Installation
After deploying, open the URL on iPhone Safari → Share → Add to Home Screen. The app runs fullscreen with its own icon.

## Known Gotchas

1. **Row detection**: Apps Script finds the first empty row by scanning column B (Name), not `getLastRow()`. The sheet has 500 pre-formatted rows with formulas, so `getLastRow()` returns 501.

2. **Date timezone**: Writing `new Date(year, month, day)` in Apps Script can shift dates by ±1 day. The fix: write the date as a string (`YYYY-MM-DD`) and let Google Sheets parse it.

3. **INR formatting**: Use `₹` prefix + `toLocaleString("en-IN")` for Indian grouping. The format `[$₹-hi-IN]#,##,##0` works in both Excel and Google Sheets.

4. **Avg/month**: Divide FY total by the count of months that have at least one transaction. Never divide by 12.

5. **FY logic**: If month >= 4, FY start year = current year. If month < 4 (Jan/Feb/Mar), FY start year = current year - 1.

6. **Apps Script redeployment**: After editing the script, you must create a new deployment version (Deploy → Manage deployments → edit → new version) for changes to take effect. Just saving the code is not enough.

7. **CORS**: Apps Script web apps handle CORS automatically for `fetch()` calls. Use `mode: 'no-cors'` if you run into issues, but typically `redirect: 'follow'` is needed because Apps Script responds with a 302 redirect.

8. **Apps Script redirect**: `fetch()` calls to Apps Script need `redirect: 'follow'`. The initial URL returns a 302 to the actual response. Example:
   ```js
   const res = await fetch(API_URL + "?action=transactions", {
     redirect: "follow"
   });
   ```
   For POST requests, some browsers don't follow redirects properly. If this happens, the workaround is to use `mode: 'no-cors'` or handle the redirect manually.
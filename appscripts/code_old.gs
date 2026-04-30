// ═══════════════════════════════════════════════════════════════════
// PERSONAL FINANCE TRACKER — Google Apps Script Backend
// ═══════════════════════════════════════════════════════════════════
//
// This script turns your Google Sheet into an API that your
// iOS Shortcut (and later, PWA) can talk to.
//
// SETUP INSTRUCTIONS:
// ───────────────────
// 1. Open your Google Sheet (the finance tracker we built)
// 2. Go to Extensions → Apps Script
// 3. Delete any existing code in Code.gs
// 4. Paste this entire file
// 5. Click 💾 Save
// 6. Click Deploy → New deployment
//    - Type: Web app
//    - Execute as: Me
//    - Who has access: Anyone (so the Shortcut can hit it without OAuth)
// 7. Click Deploy → Authorize → Allow
// 8. Copy the Web App URL (looks like: https://script.google.com/macros/s/AKfyc.../exec)
// 9. That URL goes into your iOS Shortcut
//
// ═══════════════════════════════════════════════════════════════════

// ─── CONFIG ───
// Sheet name must match exactly
const SHEET_NAME = "Transactions";

// Column mapping (1-indexed, matching your sheet)
// A=Sr No | B=Name | C=Date | D=Amount | E=Mode | F=Category | G=Sub-category | H=Description
// I=Year | J=Month | K=FY Start | L=Day (these are formula columns, auto-calculated)

const COL = {
  SR_NO: 1,
  NAME: 2,
  DATE: 3,
  AMOUNT: 4,
  MODE: 5,
  CATEGORY: 6,
  SUBCATEGORY: 7,
  DESCRIPTION: 8,
  YEAR: 9,       // formula
  MONTH: 10,     // formula
  FY_START: 11,  // formula
  DAY: 12,       // formula
};

// Fallback dropdown values (used only if Lists sheet is missing)
const FALLBACK_MODES = [
  "Infinia", "Atlas", "AmazonPay", "SBI ELITE",
  "Biz Black", "UPI", "Cash", "NetBanking"
];

const FALLBACK_CATEGORIES = ["Personal", "Work"];

const FALLBACK_SUBCATEGORIES = [
  "Food & Dining", "Groceries", "Transport", "Shopping",
  "Health & Wellness", "Entertainment", "Travel",
  "Bills & Utilities", "Rent", "Subscriptions",
  "Investment", "Trading", "Gifts", "Education", "Other"
];

/**
 * Reads dropdown values from the Lists sheet (source of truth).
 * Layout: B=Mode, C=Category, D=Sub-category, data starts at row 5.
 * Falls back to hardcoded arrays if the Lists sheet doesn't exist.
 */
function getDropdownsFromSheet() {
  const listsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Lists");
  if (!listsSheet) {
    return {
      modes: FALLBACK_MODES,
      categories: FALLBACK_CATEGORIES,
      subcategories: FALLBACK_SUBCATEGORIES,
    };
  }

  // Reserved rows per the Lists sheet: Mode up to 20, Category up to 10, Sub-category up to 30
  const modesData = listsSheet.getRange("B5:B24").getValues();
  const catsData = listsSheet.getRange("C5:C14").getValues();
  const subcatsData = listsSheet.getRange("D5:D34").getValues();

  const filter = (data) => data.map(r => String(r[0]).trim()).filter(v => v !== "" && v !== "undefined");

  return {
    modes: filter(modesData),
    categories: filter(catsData),
    subcategories: filter(subcatsData),
  };
}


// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Handles GET requests — used to read transactions (for PWA later)
 */
function doGet(e) {
  try {
    const action = e?.parameter?.action || "ping";

    if (action === "ping") {
      return jsonResponse({ status: "ok", message: "Finance Tracker API is live" });
    }

    if (action === "transactions") {
      return getTransactions(e);
    }

    if (action === "summary") {
      return getSummary(e);
    }

    if (action === "dropdown_options") {
      const dropdowns = getDropdownsFromSheet();
      return jsonResponse({
        status: "ok",
        modes: dropdowns.modes,
        categories: dropdowns.categories,
        subcategories: dropdowns.subcategories,
      });
    }

    return jsonResponse({ status: "error", message: "Unknown action: " + action });

  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

/**
 * Handles POST requests — used to add/edit/delete transactions
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || "add";

    if (action === "add") {
      return addTransaction(body);
    }

    if (action === "edit") {
      return editTransaction(body);
    }

    if (action === "delete") {
      return deleteTransaction(body);
    }

    // Quick add — minimal fields from iOS Shortcut
    if (action === "quick_add") {
      return quickAdd(body);
    }

    return jsonResponse({ status: "error", message: "Unknown action: " + action });

  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}


// ═══════════════════════════════════════════════════════════════════
// WRITE OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Quick Add — called by iOS Shortcut
 * Expects: { action: "quick_add", amount, name, category, mode, subcategory?, description? }
 * All fields except amount are optional with sensible defaults
 */
function quickAdd(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet not found: " + SHEET_NAME });

  // Parse & validate amount
  const amount = parseFloat(body.amount);
  if (isNaN(amount) || amount <= 0) {
    return jsonResponse({ status: "error", message: "Invalid amount" });
  }

  // Validate against Lists sheet (source of truth)
  const dropdowns = getDropdownsFromSheet();
  const name = (body.name || "Quick Entry").trim();
  const category = dropdowns.categories.includes(body.category) ? body.category : "Personal";
  const mode = dropdowns.modes.includes(body.mode) ? body.mode : "UPI";
  const subcategory = dropdowns.subcategories.includes(body.subcategory) ? body.subcategory : "";
  const description = (body.description || "").trim();
  const dateStr = body.date || todayFormatted(); // Allow override, default to today

  // Find the first empty row by scanning column B (Name)
  // sheet.getLastRow() includes rows with formulas/formatting,
  // so we check actual data in column B instead
  const nameCol = sheet.getRange("B2:B").getValues();
  let dataRows = 0;
  for (let i = 0; i < nameCol.length; i++) {
    if (nameCol[i][0] === "" || nameCol[i][0] === null) break;
    dataRows++;
  }
  const newRow = dataRows + 2; // +2 because row 1 is header, dataRows is 0-indexed count
  const srNo = dataRows + 1;  // Sr No = count of existing entries + 1
  const rowData = [
    srNo,           // A: Sr No
    name,           // B: Name
    dateStr,        // C: Date (as string, will be parsed)
    amount,         // D: Amount
    mode,           // E: Mode
    category,       // F: Category
    subcategory,    // G: Sub-category
    description,    // H: Description
  ];

  // Write data columns A-H
  sheet.getRange(newRow, 1, 1, 8).setValues([rowData]);

  // Set date — write as string and let Sheets parse it to avoid timezone shift
  sheet.getRange(newRow, COL.DATE).setValue(dateStr);
  sheet.getRange(newRow, COL.DATE).setNumberFormat("dd-mmm-yyyy");

  // Set the formula columns (I, J, K, L) — same formulas as your template
  const r = newRow;
  sheet.getRange(r, COL.YEAR).setFormula(`=IF(C${r}="","",YEAR(C${r}))`);
  sheet.getRange(r, COL.MONTH).setFormula(`=IF(C${r}="","",MONTH(C${r}))`);
  sheet.getRange(r, COL.FY_START).setFormula(`=IF(C${r}="","",IF(MONTH(C${r})>=4,YEAR(C${r}),YEAR(C${r})-1))`);
  sheet.getRange(r, COL.DAY).setFormula(`=IF(C${r}="","",TEXT(C${r},"ddd"))`);

  // Format amount as number
  sheet.getRange(r, COL.AMOUNT).setNumberFormat('[$₹-hi-IN]#,##,##0');

  return jsonResponse({
    status: "ok",
    message: `Added: ${name} — ₹${amount}`,
    row: newRow,
    data: { srNo, name, date: dateStr, amount, mode, category, subcategory, description }
  });
}

/**
 * Full Add — called by PWA (more fields, same logic)
 */
function addTransaction(body) {
  // Reuse quickAdd — it handles all fields
  return quickAdd(body);
}

/**
 * Edit transaction by row number
 * Expects: { action: "edit", row: 5, ...fields to update }
 */
function editTransaction(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet not found" });

  const row = parseInt(body.row);
  if (isNaN(row) || row < 2 || row > sheet.getLastRow()) {
    return jsonResponse({ status: "error", message: "Invalid row: " + body.row });
  }

  // Update only provided fields
  if (body.name !== undefined) sheet.getRange(row, COL.NAME).setValue(body.name);
  if (body.amount !== undefined) {
    sheet.getRange(row, COL.AMOUNT).setValue(parseFloat(body.amount));
    sheet.getRange(row, COL.AMOUNT).setNumberFormat('[$₹-hi-IN]#,##,##0');
  }
  if (body.date !== undefined) {
    const parts = body.date.split("-");
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      sheet.getRange(row, COL.DATE).setValue(d);
      sheet.getRange(row, COL.DATE).setNumberFormat("dd-mmm-yyyy");
    }
  }
  if (body.mode !== undefined) sheet.getRange(row, COL.MODE).setValue(body.mode);
  if (body.category !== undefined) sheet.getRange(row, COL.CATEGORY).setValue(body.category);
  if (body.subcategory !== undefined) sheet.getRange(row, COL.SUBCATEGORY).setValue(body.subcategory);
  if (body.description !== undefined) sheet.getRange(row, COL.DESCRIPTION).setValue(body.description);

  return jsonResponse({ status: "ok", message: "Updated row " + row });
}

/**
 * Delete transaction by row number
 * Expects: { action: "delete", row: 5 }
 */
function deleteTransaction(body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet not found" });

  const row = parseInt(body.row);
  const lastDataRow = getLastDataRow(sheet);
  if (isNaN(row) || row < 2 || row > lastDataRow) {
    return jsonResponse({ status: "error", message: "Invalid row: " + body.row });
  }

  sheet.deleteRow(row);
  return jsonResponse({ status: "ok", message: "Deleted row " + row });
}


// ═══════════════════════════════════════════════════════════════════
// READ OPERATIONS (for PWA later)
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all transactions, optionally filtered by month/year/FY
 * Params: ?action=transactions&fy=2026&month=4
 */
function getTransactions(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet not found" });

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResponse({ status: "ok", transactions: [] });

  const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  const filterFY = e?.parameter?.fy ? parseInt(e.parameter.fy) : null;
  const filterMonth = e?.parameter?.month ? parseInt(e.parameter.month) : null;

  const transactions = [];
  data.forEach((row, i) => {
    if (!row[0] && !row[1]) return; // Skip empty rows

    const tx = {
      row: i + 2, // Actual sheet row (for edit/delete)
      srNo: row[COL.SR_NO - 1],
      name: row[COL.NAME - 1],
      date: formatDate(row[COL.DATE - 1]),
      amount: row[COL.AMOUNT - 1],
      mode: row[COL.MODE - 1],
      category: row[COL.CATEGORY - 1],
      subcategory: row[COL.SUBCATEGORY - 1],
      description: row[COL.DESCRIPTION - 1],
      year: row[COL.YEAR - 1],
      month: row[COL.MONTH - 1],
      fyStart: row[COL.FY_START - 1],
      day: row[COL.DAY - 1],
    };

    // Apply filters
    if (filterFY !== null && tx.fyStart !== filterFY) return;
    if (filterMonth !== null && tx.month !== filterMonth) return;

    transactions.push(tx);
  });

  return jsonResponse({ status: "ok", count: transactions.length, transactions });
}

/**
 * Get monthly summary for dashboard
 * Params: ?action=summary&fy=2026
 */
function getSummary(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return jsonResponse({ status: "error", message: "Sheet not found" });

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonResponse({ status: "ok", summary: {} });

  const fy = e?.parameter?.fy ? parseInt(e.parameter.fy) : getCurrentFY();
  const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();

  let fyTotal = 0, personal = 0, work = 0;
  const byMonth = {};
  const byMode = {};
  const bySubcat = {};

  data.forEach(row => {
    const fyStart = row[COL.FY_START - 1];
    if (fyStart !== fy) return;

    const amount = parseFloat(row[COL.AMOUNT - 1]) || 0;
    const month = row[COL.MONTH - 1];
    const mode = row[COL.MODE - 1];
    const cat = row[COL.CATEGORY - 1];
    const subcat = row[COL.SUBCATEGORY - 1];

    // Exclude Tax category from fyTotal (personal/work already only count their own)
    if (cat !== "Tax") fyTotal += amount;
    if (cat === "Personal") personal += amount;
    if (cat === "Work") work += amount;

    byMonth[month] = (byMonth[month] || 0) + amount;
    if (mode) byMode[mode] = (byMode[mode] || 0) + amount;
    if (subcat) bySubcat[subcat] = (bySubcat[subcat] || 0) + amount;
  });

  const distinctMonths = Object.keys(byMonth).length;

  return jsonResponse({
    status: "ok",
    fy,
    fyTotal,
    personal,
    work,
    avgPerMonth: distinctMonths > 0 ? Math.round(fyTotal / distinctMonths) : 0,
    distinctMonths,
    byMonth,
    byMode,
    bySubcat,
  });
}


// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Find the last row with actual data in column B (Name).
 * sheet.getLastRow() includes rows with formulas/formatting,
 * which gives wrong results on pre-formatted templates.
 */
function getLastDataRow(sheet) {
  const nameCol = sheet.getRange("B2:B").getValues();
  let lastData = 1; // header row
  for (let i = 0; i < nameCol.length; i++) {
    if (nameCol[i][0] === "" || nameCol[i][0] === null) break;
    lastData = i + 2; // convert to 1-indexed sheet row
  }
  return lastData;
}

function todayFormatted() {
  return Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
}

function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val);
}

function getCurrentFY() {
  const now = new Date();
  const m = now.getMonth() + 1;
  return m >= 4 ? now.getFullYear() : now.getFullYear() - 1;
}


// ═══════════════════════════════════════════════════════════════════
// TEST FUNCTION (run manually in Apps Script editor to verify)
// ═══════════════════════════════════════════════════════════════════

function testQuickAdd() {
  const result = quickAdd({
    amount: 250,
    name: "Test Coffee",
    category: "Personal",
    mode: "UPI",
    subcategory: "Food & Dining",
    description: "Testing from Apps Script",
  });
  Logger.log(result.getContent());
}
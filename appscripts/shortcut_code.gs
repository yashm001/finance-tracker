// ═══════════════════════════════════════════════════════════════════
// PERSONAL FINANCE TRACKER — Apps Script Backend (iOS Shortcut)
// ═══════════════════════════════════════════════════════════════════
//
// This is a SEPARATE Apps Script project for the iOS Shortcut.
// It only supports quick_add (adding transactions).
// It validates requests using an API key stored in Script Properties.
//
// SETUP INSTRUCTIONS:
// ───────────────────
// 1. Create a NEW Apps Script project (not the same one as the PWA)
//    - Go to https://script.google.com → New project
//    - OR open your Google Sheet → Extensions → Apps Script → create a new script file
//    Note: Each Sheet can only have one Apps Script project.
//    If the PWA script is already attached to the Sheet, create
//    a standalone project and open the Sheet by URL (see SHEET_URL below).
// 2. Paste this entire file into Code.gs
// 3. Update SHEET_URL below with your Google Sheet URL
// 4. Go to Project Settings → Script Properties and add:
//    - SHORTCUT_API_KEY = a random secret string (e.g. generate with: openssl rand -hex 32)
// 5. Deploy → New deployment
//    - Type: Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Copy the Web App URL → paste into your iOS Shortcut
// 7. In the iOS Shortcut, add the api_key field to the JSON body
//
// ═══════════════════════════════════════════════════════════════════

// ─── CONFIG ───
// If this is a standalone project (not bound to the Sheet),
// set the Sheet URL here. Otherwise leave empty to use the bound sheet.
const SHEET_URL = ""; // e.g. "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
const SHEET_NAME = "Transactions";

const COL = {
  SR_NO: 1,
  NAME: 2,
  DATE: 3,
  AMOUNT: 4,
  MODE: 5,
  CATEGORY: 6,
  SUBCATEGORY: 7,
  DESCRIPTION: 8,
  YEAR: 9,
  MONTH: 10,
  FY_START: 11,
  DAY: 12,
};

function getSheet_() {
  const ss = SHEET_URL
    ? SpreadsheetApp.openByUrl(SHEET_URL)
    : SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME);
}

/**
 * Reads dropdown values from the Lists sheet for validation.
 */
function getDropdownsFromSheet_() {
  const ss = SHEET_URL
    ? SpreadsheetApp.openByUrl(SHEET_URL)
    : SpreadsheetApp.getActiveSpreadsheet();
  const listsSheet = ss.getSheetByName("Lists");
  if (!listsSheet) {
    return {
      modes: ["Infinia", "Atlas", "AmazonPay", "SBI ELITE", "Biz Black", "UPI", "Cash", "NetBanking"],
      categories: ["Personal", "Work"],
      subcategories: ["Food & Dining", "Groceries", "Transport", "Shopping", "Health & Wellness", "Entertainment", "Travel", "Bills & Utilities", "Rent", "Subscriptions", "Investment", "Trading", "Gifts", "Education", "Other"],
    };
  }

  const modesData = listsSheet.getRange("B5:B24").getValues();
  const catsData = listsSheet.getRange("C5:C14").getValues();
  const subcatsData = listsSheet.getRange("D5:D34").getValues();
  const filter = (data) => data.map(r => String(r[0]).trim()).filter(v => v !== "" && v !== "undefined");

  return { modes: filter(modesData), categories: filter(catsData), subcategories: filter(subcatsData) };
}


// ═══════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════

function validateApiKey_(apiKey) {
  if (!apiKey) {
    throw new Error("No API key provided");
  }

  const expected = PropertiesService.getScriptProperties().getProperty("SHORTCUT_API_KEY");
  if (!expected) {
    throw new Error("Server misconfigured: SHORTCUT_API_KEY not set");
  }

  if (apiKey !== expected) {
    throw new Error("Invalid API key");
  }
}


// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER — POST only, quick_add only
// ═══════════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // Authenticate
    validateApiKey_(body.api_key);
    delete body.api_key;

    // Only allow quick_add
    if (body.action !== "quick_add") {
      return jsonResponse_({ status: "error", message: "Only quick_add is allowed via Shortcut" });
    }

    return quickAdd_(body);

  } catch (err) {
    return jsonResponse_({ status: "error", message: err.message });
  }
}

function doGet(e) {
  return jsonResponse_({ status: "error", message: "This endpoint only accepts POST requests" });
}


// ═══════════════════════════════════════════════════════════════════
// QUICK ADD
// ═══════════════════════════════════════════════════════════════════

function quickAdd_(body) {
  const sheet = getSheet_();
  if (!sheet) return jsonResponse_({ status: "error", message: "Sheet not found: " + SHEET_NAME });

  const amount = parseFloat(body.amount);
  if (isNaN(amount) || amount <= 0) {
    return jsonResponse_({ status: "error", message: "Invalid amount" });
  }

  const dropdowns = getDropdownsFromSheet_();
  const name = (body.name || "Quick Entry").trim();
  const category = dropdowns.categories.includes(body.category) ? body.category : "Personal";
  const mode = dropdowns.modes.includes(body.mode) ? body.mode : "UPI";
  const subcategory = dropdowns.subcategories.includes(body.subcategory) ? body.subcategory : "";
  const description = (body.description || "").trim();
  const dateStr = body.date || Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");

  // Find next empty row via column B
  const nameCol = sheet.getRange("B2:B").getValues();
  let dataRows = 0;
  for (let i = 0; i < nameCol.length; i++) {
    if (nameCol[i][0] === "" || nameCol[i][0] === null) break;
    dataRows++;
  }
  const newRow = dataRows + 2;
  const srNo = dataRows + 1;

  const rowData = [srNo, name, dateStr, amount, mode, category, subcategory, description];
  sheet.getRange(newRow, 1, 1, 8).setValues([rowData]);

  // Set date format
  sheet.getRange(newRow, COL.DATE).setValue(dateStr);
  sheet.getRange(newRow, COL.DATE).setNumberFormat("dd-mmm-yyyy");

  // Set formula columns
  const r = newRow;
  sheet.getRange(r, COL.YEAR).setFormula(`=IF(C${r}="","",YEAR(C${r}))`);
  sheet.getRange(r, COL.MONTH).setFormula(`=IF(C${r}="","",MONTH(C${r}))`);
  sheet.getRange(r, COL.FY_START).setFormula(`=IF(C${r}="","",IF(MONTH(C${r})>=4,YEAR(C${r}),YEAR(C${r})-1))`);
  sheet.getRange(r, COL.DAY).setFormula(`=IF(C${r}="","",TEXT(C${r},"ddd"))`);

  // Format amount
  sheet.getRange(r, COL.AMOUNT).setNumberFormat('[$₹-hi-IN]#,##,##0');

  return jsonResponse_({
    status: "ok",
    message: `Added: ${name} — ₹${amount}`,
    row: newRow,
    data: { srNo, name, date: dateStr, amount, mode, category, subcategory, description }
  });
}


// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

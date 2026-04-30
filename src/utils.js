/**
 * Format a number as INR with Indian grouping (lakhs/crores).
 * e.g. 123456 → "₹1,23,456"
 */
export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  return '₹' + Math.round(Number(amount)).toLocaleString('en-IN');
}

/**
 * Convert a number to Indian currency words.
 * e.g. 600 → "Six Hundred", 60050 → "Sixty Thousand Fifty",
 * 150000 → "One Lakh Fifty Thousand", 2500000 → "Twenty Five Lakh"
 */
export function amountToWords(amount) {
  const n = Math.round(Number(amount));
  if (isNaN(n) || n <= 0) return '';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function under100(num) {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  }

  function convert(num) {
    if (num === 0) return '';
    if (num < 100) return under100(num);
    if (num < 1000) {
      const rem = num % 100;
      return ones[Math.floor(num / 100)] + ' Hundred' + (rem ? ' ' + under100(rem) : '');
    }

    const parts = [];
    // Crore (1,00,00,000)
    if (num >= 10000000) {
      parts.push(convert(Math.floor(num / 10000000)) + ' Crore');
      num %= 10000000;
    }
    // Lakh (1,00,000)
    if (num >= 100000) {
      parts.push(convert(Math.floor(num / 100000)) + ' Lakh');
      num %= 100000;
    }
    // Thousand (1,000)
    if (num >= 1000) {
      parts.push(convert(Math.floor(num / 1000)) + ' Thousand');
      num %= 1000;
    }
    // Remainder
    if (num > 0) parts.push(convert(num));
    return parts.join(' ');
  }

  return convert(n);
}

/**
 * Get the FY start year for a given date.
 * Indian FY: Apr 1 – Mar 31. If month >= 4, FY start = year. Else FY start = year - 1.
 */
export function getFYForDate(date) {
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();
  return month >= 4 ? year : year - 1;
}

/**
 * Get current FY start year based on IST.
 */
export function getCurrentFY() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return getFYForDate(now);
}

/**
 * Get current month number (1-12) in IST.
 */
export function getCurrentMonth() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return now.getMonth() + 1;
}

/**
 * FY-ordered month numbers: Apr(4) → Mar(3).
 */
export function getFYMonths() {
  return [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
}

/**
 * Short month name from month number (1-indexed).
 * e.g. 4 → "Apr", 1 → "Jan"
 */
export function getMonthName(monthNum) {
  const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[monthNum] || '';
}

/**
 * FY display label. e.g. 2026 → "FY 2026-27"
 */
export function getFYLabel(fyStart) {
  return `FY ${fyStart}-${String(fyStart + 1).slice(2)}`;
}

/**
 * Format a date string (YYYY-MM-DD) to display format (dd MMM yyyy).
 * e.g. "2026-04-15" → "15 Apr 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${getMonthName(m)} ${y}`;
}

/**
 * Pad a number to 2 digits. e.g. 4 → "04"
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Get a YYYY-MM-DD string for a Date object.
 */
function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Get the current date in IST as a Date object.
 */
function nowIST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

/**
 * Get date range { from, to } for a preset key.
 * Dates are YYYY-MM-DD strings in IST.
 */
export function getDateRangeForPreset(preset) {
  const now = nowIST();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  switch (preset) {
    case 'this_month':
      return {
        from: `${y}-${pad(m + 1)}-01`,
        to: toDateStr(now),
      };
    case 'last_month': {
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m, 0); // day 0 of current month = last day of prev
      return { from: toDateStr(from), to: toDateStr(to) };
    }
    case 'last_3_months': {
      const from = new Date(y, m - 2, 1);
      return { from: toDateStr(from), to: toDateStr(now) };
    }
    case 'current_fy': {
      const fyStart = getCurrentFY();
      return {
        from: `${fyStart}-04-01`,
        to: toDateStr(now),
      };
    }
    default:
      return {
        from: `${y}-${pad(m + 1)}-01`,
        to: toDateStr(now),
      };
  }
}

/**
 * Check if a YYYY-MM-DD date string falls within a range (inclusive).
 */
export function isDateInRange(dateStr, fromStr, toStr) {
  return dateStr >= fromStr && dateStr <= toStr;
}

/**
 * Format a date range as a human-readable string.
 * e.g. "1 Apr - 30 Apr 2026" or "1 Feb 2026 - 30 Apr 2026"
 */
export function formatDateRange(fromStr, toStr) {
  if (!fromStr || !toStr) return '';
  const [fy, fm] = fromStr.split('-').map(Number);
  const [ty] = toStr.split('-').map(Number);
  if (fy === ty) {
    const [, , fd] = fromStr.split('-').map(Number);
    return `${fd} ${getMonthName(fm)} - ${formatDate(toStr)}`;
  }
  return `${formatDate(fromStr)} - ${formatDate(toStr)}`;
}

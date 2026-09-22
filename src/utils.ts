/**
 * Convert standard YYYY-MM-DD string to Thai Buddhist Era (พ.ศ.) format (DD/MM/YYYY)
 */
export function formatDateBE(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  
  const cleanStr = String(dateStr).trim();

  // 1. If it's already in DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanStr)) {
    const parts = cleanStr.split('/');
    const d = parts[0];
    const m = parts[1];
    const y = parseInt(parts[2], 10);
    if (y > 2400) {
      return cleanStr; // Already BE
    } else {
      return `${d}/${m}/${y + 543}`; // Convert to BE
    }
  }

  // 2. If it is in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const parts = cleanStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parts[1];
    const d = parts[2];
    if (y > 2400) {
      return `${d}/${m}/${y}`; // Already BE
    } else {
      return `${d}/${m}/${y + 543}`; // Convert to BE
    }
  }

  try {
    const dateObj = new Date(cleanStr);
    if (isNaN(dateObj.getTime())) {
      // Fallback for manual YYYY-MM-DD parsing if standard Date fails
      const match = cleanStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = match[2];
        const d = match[3];
        const finalYear = y > 2400 ? y : y + 543;
        return `${d}/${m}/${finalYear}`;
      }
      return cleanStr;
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const rawYear = dateObj.getFullYear();
    const finalYear = rawYear > 2400 ? rawYear : rawYear + 543;

    return `${day}/${month}/${finalYear}`;
  } catch (error) {
    return cleanStr;
  }
}

/**
 * Helper to normalize any date string (BE DD/MM/YYYY, ISO YYYY-MM-DD, or native Date)
 * into a comparable standard Gregorian YYYY-MM-DD string.
 */
function toISODate(dateStr: string | null | undefined): string {
  if (!dateStr) return '0000-00-00';
  const cleanStr = String(dateStr).trim();

  // 1. If it's in DD/MM/YYYY (with optional 1 or 2 digit day/month)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanStr)) {
    const parts = cleanStr.split('/');
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    let y = parseInt(parts[2], 10);
    if (y > 2400) {
      y = y - 543; // Convert Buddhist Era to Gregorian Era
    }
    return `${y}-${m}-${d}`;
  }

  // 2. If it is in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const parts = cleanStr.split('-');
    let y = parseInt(parts[0], 10);
    const m = parts[1];
    const d = parts[2];
    if (y > 2400) {
      y = y - 543; // Convert Buddhist Era to Gregorian Era
    }
    return `${y}-${m}-${d}`;
  }

  // 3. Fallback to standard Date parsing
  try {
    const dateObj = new Date(cleanStr);
    if (!isNaN(dateObj.getTime())) {
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      let y = dateObj.getFullYear();
      if (y > 2400) {
        y = y - 543;
      }
      return `${y}-${m}-${d}`;
    }
  } catch (e) {}

  return cleanStr;
}

/**
 * Robust sorting function to sort records by:
 * 1. Date newest first (descending)
 * 2. Doc No/ID newest first (descending) within the same date
 */
export function sortNewestFirst<T extends { date: string; id: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    // 1. Compare normalized dates descending
    const dateA = toISODate(a.date);
    const dateB = toISODate(b.date);
    const dateCompare = dateB.localeCompare(dateA);
    if (dateCompare !== 0) return dateCompare;

    // 2. Compare Doc No descending (if present)
    const aDoc = (a as any).docNo;
    const bDoc = (b as any).docNo;
    if (aDoc !== undefined && bDoc !== undefined && aDoc !== null && bDoc !== null) {
      const aDocStr = String(aDoc);
      const bDocStr = String(bDoc);
      const docCompare = bDocStr.localeCompare(aDocStr);
      if (docCompare !== 0) return docCompare;
    }

    // 3. Fallback to ID descending (ID usually has timestamp or is unique sequential)
    const aId = String(a.id || '');
    const bId = String(b.id || '');
    return bId.localeCompare(aId);
  });
}

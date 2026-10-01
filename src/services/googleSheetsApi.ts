import { getAccessToken } from './auth';
import { 
  PackagingInspection, 
  FGWeightCheck, 
  RawMaterialReceiving, 
  RMWeightCheck, 
  ExpDateRecord, 
  MasterData 
} from '../types';

export const SHEET_HEADERS: Record<string, string[]> = {
  Packaging_Inspection: ['id', 'date', 'docNo', 'fgCode', 'batch', 'quantityKg', 'customer', 'status', 'inspector'],
  FG_Weight_Check: ['id', 'date', 'fgCode', 'batch', 'quantityKg', 'standardWeightKg', 'samples', 'averageWeight', 'status', 'note', 'inspector'],
  Raw_Material_Receiving: ['id', 'date', 'docNo', 'rmCode', 'batch', 'deliveryNo', 'poNo', 'quantityKg', 'supplier', 'status', 'inspector'],
  RM_Weight_Check: ['id', 'date', 'rmCode', 'batch', 'quantityKg', 'standardWeightKg', 'samples', 'averageWeight', 'status', 'note', 'inspector'],
  Exp_Date: ['id', 'date', 'rmCode', 'batch', 'mfgDate', 'expDate', 'status', 'note', 'inspector'],
};

const STORAGE_KEY_SPREADSHEET_ID = 'google_direct_spreadsheet_id';

export function getStoredSpreadsheetId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_SPREADSHEET_ID) || '';
}

export function setStoredSpreadsheetId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, id);
}

export function clearStoredSpreadsheetId() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_SPREADSHEET_ID);
}

/**
 * Extracts clean Google Spreadsheet ID from a URL or raw ID string
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Match https://docs.google.com/spreadsheets/d/([a-zA-Z0-9-_]+)
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Otherwise treat as raw ID if it doesn't contain slashes
  if (!trimmed.includes('/') && trimmed.length >= 15) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Helper to make authorized Google Sheets API v4 calls
 */
async function sheetsFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google Account เพื่อเชื่อมต่อ Google Sheets โดยตรง');
  }

  const url = endpoint.startsWith('https://') 
    ? endpoint 
    : `https://sheets.googleapis.com/v4/spreadsheets/${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errMessage = `Google Sheets API Error (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errMessage = errJson.error.message;
      }
    } catch {
      const text = await res.text();
      if (text) errMessage = text;
    }

    if (res.status === 401) {
      throw new Error('เซสชัน Google หมดอายุ กรุณาคลิกลงชื่อเข้าใช้ Google อีกครั้ง');
    }
    if (res.status === 403) {
      throw new Error('ไม่มีสิทธิ์เข้าถึง Google Sheets นี้ กรุณาตรวจสอบว่าบัญชี Google ของคุณเป็นเจ้าของหรือได้รับสิทธิ์แก้ไข (Editor)');
    }
    if (res.status === 404) {
      throw new Error('ไม่พบสเปรดชีต Google Sheet ตามรหัสหรือลิงก์ที่ระบุ กรุณาตรวจสอบลิงก์อีกครั้ง');
    }

    throw new Error(errMessage);
  }

  return res.json();
}

/**
 * Format a record row according to headers
 */
function recordToRow(headers: string[], record: any, sheetName: string): any[] {
  return headers.map(header => {
    if (sheetName === 'FG_Weight_Check' || sheetName === 'RM_Weight_Check') {
      if (header === 'samples') {
        const samplesArr = record.samples || [];
        const container = record.containerType || (sheetName === 'FG_Weight_Check' ? 'กล่อง' : 'ถุง');
        return `${samplesArr.length} , ${container}`;
      }
      if (header === 'averageWeight') {
        const samplesArr = record.samples || [];
        if (samplesArr.length > 0) {
          return samplesArr.join('/');
        }
        return '';
      }
    }
    const val = record[header];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

/**
 * Parse rows into record objects
 */
function rowsToRecords(headers: string[], rows: any[][], sheetName: string): any[] {
  if (!rows || rows.length === 0) return [];
  
  return rows.map((row, rowIdx) => {
    const rec: any = {};
    headers.forEach((header, colIdx) => {
      rec[header] = row[colIdx] !== undefined ? row[colIdx] : '';
    });

    if (sheetName === 'FG_Weight_Check' || sheetName === 'RM_Weight_Check') {
      const samplesRaw = String(rec.samples || '').trim();
      const avgWeightRaw = String(rec.averageWeight || '').trim();

      let containerType = sheetName === 'FG_Weight_Check' ? 'กล่อง' : 'ถุง';
      if (samplesRaw.includes(',')) {
        const parts = samplesRaw.split(',');
        containerType = parts[1] ? parts[1].trim() : containerType;
      }
      rec.containerType = containerType;

      let samplesArr: number[] = [];
      if (avgWeightRaw.includes('/')) {
        samplesArr = avgWeightRaw
          .split('/')
          .map(item => parseFloat(item.trim()))
          .filter(v => !isNaN(v));
      } else if (avgWeightRaw !== '') {
        const singleVal = parseFloat(avgWeightRaw);
        if (!isNaN(singleVal)) samplesArr = [singleVal];
      }
      rec.samples = samplesArr;

      if (samplesArr.length > 0) {
        const sum = samplesArr.reduce((a, b) => a + b, 0);
        rec.averageWeight = parseFloat((sum / samplesArr.length).toFixed(2));
      } else {
        rec.averageWeight = 0;
      }
    }

    if (!rec.id) {
      rec.id = `${sheetName.toLowerCase().slice(0, 3)}-${Date.now()}-${rowIdx}`;
    }

    return rec;
  });
}

/**
 * Ensures all required sheets and header rows exist in the spreadsheet
 */
export async function ensureSpreadsheetStructure(spreadsheetId: string) {
  // 1. Fetch metadata
  const meta = await sheetsFetch(spreadsheetId);
  const existingSheets: Array<{ title: string; id: number }> = (meta.sheets || []).map((s: any) => ({
    title: s.properties.title,
    id: s.properties.sheetId,
  }));

  const existingTitles = new Set(existingSheets.map(s => s.title));
  const missingSheets = Object.keys(SHEET_HEADERS).filter(title => !existingTitles.has(title));

  // 2. Add missing sheets if any
  if (missingSheets.length > 0) {
    const requests = missingSheets.map(title => ({
      addSheet: {
        properties: { title }
      }
    }));
    await sheetsFetch(`${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests })
    });
  }

  // 3. Check and write header rows if empty
  const ranges = Object.keys(SHEET_HEADERS).map(name => `'${name}'!A1:Z1`);
  const valuesData = await sheetsFetch(
    `${spreadsheetId}/values:batchGet?${ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')}`
  );

  const headerUpdates: Array<{ range: string; values: string[][] }> = [];
  (valuesData.valueRanges || []).forEach((vr: any, idx: number) => {
    const sheetName = Object.keys(SHEET_HEADERS)[idx];
    const expectedHeaders = SHEET_HEADERS[sheetName];
    if (!vr.values || vr.values.length === 0 || vr.values[0].length === 0) {
      headerUpdates.push({
        range: `'${sheetName}'!A1:${String.fromCharCode(64 + expectedHeaders.length)}1`,
        values: [expectedHeaders]
      });
    }
  });

  if (headerUpdates.length > 0) {
    await sheetsFetch(`${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headerUpdates
      })
    });
  }
}

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive with all 5 sheets and headers
 */
export async function createNewSpreadsheet(title: string = 'ระบบตรวจสอบชิ้นงานและสุ่มชั่ง FG-RM'): Promise<{ spreadsheetId: string; url: string }> {
  const body = {
    properties: {
      title,
    },
    sheets: Object.keys(SHEET_HEADERS).map(sheetTitle => ({
      properties: {
        title: sheetTitle,
      }
    }))
  };

  const created = await sheetsFetch('', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  const spreadsheetId = created.spreadsheetId;

  // Add header rows
  const headerUpdates = Object.keys(SHEET_HEADERS).map(sheetName => ({
    range: `'${sheetName}'!A1:${String.fromCharCode(64 + SHEET_HEADERS[sheetName].length)}1`,
    values: [SHEET_HEADERS[sheetName]]
  }));

  await sheetsFetch(`${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: headerUpdates
    })
  });

  setStoredSpreadsheetId(spreadsheetId);

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  };
}

/**
 * Read all data from the Google Spreadsheet
 */
export async function fetchAllFromGoogleSheets(spreadsheetId: string): Promise<{
  packaging: PackagingInspection[];
  fgWeight: FGWeightCheck[];
  rmReceiving: RawMaterialReceiving[];
  rmWeight: RMWeightCheck[];
  expDate: ExpDateRecord[];
  masterData: MasterData;
}> {
  await ensureSpreadsheetStructure(spreadsheetId);

  const sheetNames = Object.keys(SHEET_HEADERS);
  const ranges = sheetNames.map(name => `'${name}'!A1:Z5000`);
  const valuesData = await sheetsFetch(
    `${spreadsheetId}/values:batchGet?${ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')}`
  );

  const rawMap: Record<string, any[]> = {};

  (valuesData.valueRanges || []).forEach((vr: any, idx: number) => {
    const sheetName = sheetNames[idx];
    const rows = vr.values || [];
    if (rows.length <= 1) {
      rawMap[sheetName] = [];
    } else {
      const headers = rows[0].map((h: any) => String(h).trim());
      const dataRows = rows.slice(1);
      rawMap[sheetName] = rowsToRecords(headers, dataRows, sheetName);
    }
  });

  // Extract master data
  const customers = new Set<string>();
  const fgCodes = new Set<string>();
  const rmCodes = new Set<string>();
  const suppliers = new Set<string>();

  (rawMap['Packaging_Inspection'] || []).forEach(p => {
    if (p.customer) customers.add(p.customer);
    if (p.fgCode) fgCodes.add(p.fgCode);
  });
  (rawMap['FG_Weight_Check'] || []).forEach(f => {
    if (f.fgCode) fgCodes.add(f.fgCode);
  });
  (rawMap['Raw_Material_Receiving'] || []).forEach(r => {
    if (r.rmCode) rmCodes.add(r.rmCode);
    if (r.supplier) suppliers.add(r.supplier);
  });
  (rawMap['RM_Weight_Check'] || []).forEach(r => {
    if (r.rmCode) rmCodes.add(r.rmCode);
  });
  (rawMap['Exp_Date'] || []).forEach(e => {
    if (e.rmCode) rmCodes.add(e.rmCode);
  });

  return {
    packaging: rawMap['Packaging_Inspection'] || [],
    fgWeight: rawMap['FG_Weight_Check'] || [],
    rmReceiving: rawMap['Raw_Material_Receiving'] || [],
    rmWeight: rawMap['RM_Weight_Check'] || [],
    expDate: rawMap['Exp_Date'] || [],
    masterData: {
      customers: Array.from(customers).filter(Boolean),
      fgCodes: Array.from(fgCodes).filter(Boolean),
      rmCodes: Array.from(rmCodes).filter(Boolean),
      suppliers: Array.from(suppliers).filter(Boolean)
    }
  };
}

/**
 * Write operation directly to Google Sheets API v4
 */
export async function writeToGoogleSheets(
  spreadsheetId: string,
  action: 'create' | 'update' | 'delete',
  sheetName: 'Packaging_Inspection' | 'FG_Weight_Check' | 'Raw_Material_Receiving' | 'RM_Weight_Check' | 'Exp_Date',
  record: any
): Promise<{ success: boolean; message: string }> {
  await ensureSpreadsheetStructure(spreadsheetId);
  const headers = SHEET_HEADERS[sheetName] || [];

  if (action === 'create') {
    // 1. Check if record ID already exists in sheet
    const idRange = await sheetsFetch(
      `${spreadsheetId}/values/'${sheetName}'!A:A`
    );
    const existingRows = idRange.values || [];
    let existingRowIdx = -1;
    for (let i = 1; i < existingRows.length; i++) {
      if (existingRows[i][0] && String(existingRows[i][0]).trim() === String(record.id).trim()) {
        existingRowIdx = i + 1; // 1-indexed
        break;
      }
    }

    const rowValues = recordToRow(headers, record, sheetName);

    if (existingRowIdx !== -1) {
      // Update existing row
      const range = `'${sheetName}'!A${existingRowIdx}:${String.fromCharCode(64 + headers.length)}${existingRowIdx}`;
      await sheetsFetch(`${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        body: JSON.stringify({ values: [rowValues] })
      });
      return { success: true, message: 'อัปเดตข้อมูลรายการเดิมใน Google Sheets สำเร็จ' };
    }

    // Append new row
    await sheetsFetch(`${spreadsheetId}/values/'${sheetName}'!A:${String.fromCharCode(64 + headers.length)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: JSON.stringify({ values: [rowValues] })
    });
    return { success: true, message: 'บันทึกข้อมูลลง Google Sheets สำเร็จ' };
  }

  if (action === 'update') {
    const idRange = await sheetsFetch(
      `${spreadsheetId}/values/'${sheetName}'!A:A`
    );
    const existingRows = idRange.values || [];
    let existingRowIdx = -1;
    for (let i = 1; i < existingRows.length; i++) {
      if (existingRows[i][0] && String(existingRows[i][0]).trim() === String(record.id).trim()) {
        existingRowIdx = i + 1;
        break;
      }
    }

    const rowValues = recordToRow(headers, record, sheetName);

    if (existingRowIdx !== -1) {
      const range = `'${sheetName}'!A${existingRowIdx}:${String.fromCharCode(64 + headers.length)}${existingRowIdx}`;
      await sheetsFetch(`${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        body: JSON.stringify({ values: [rowValues] })
      });
      return { success: true, message: 'อัปเดตข้อมูลใน Google Sheets สำเร็จ' };
    } else {
      // Append if not found
      await sheetsFetch(`${spreadsheetId}/values/'${sheetName}'!A:${String.fromCharCode(64 + headers.length)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        body: JSON.stringify({ values: [rowValues] })
      });
      return { success: true, message: 'บันทึกเป็นรายการใหม่ใน Google Sheets สำเร็จ' };
    }
  }

  if (action === 'delete') {
    // Find row
    const idRange = await sheetsFetch(
      `${spreadsheetId}/values/'${sheetName}'!A:A`
    );
    const existingRows = idRange.values || [];
    let rowIdxToDelete = -1;
    for (let i = existingRows.length - 1; i >= 1; i--) {
      if (existingRows[i][0] && String(existingRows[i][0]).trim() === String(record.id).trim()) {
        rowIdxToDelete = i + 1;
        break;
      }
    }

    if (rowIdxToDelete !== -1) {
      // Clear row values
      const range = `'${sheetName}'!A${rowIdxToDelete}:${String.fromCharCode(64 + headers.length)}${rowIdxToDelete}`;
      await sheetsFetch(`${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      return { success: true, message: 'ลบรายการออกจาก Google Sheets เรียบร้อย' };
    }

    return { success: true, message: 'ไม่พบรายการใน Google Sheets (ถูกลบไปแล้ว)' };
  }

  return { success: false, message: 'คำสั่งไม่ถูกต้อง' };
}

/**
 * Batch upload existing local records to Google Sheets
 */
export async function batchUploadToGoogleSheets(
  spreadsheetId: string,
  recordsMap: {
    packaging?: PackagingInspection[];
    fgWeight?: FGWeightCheck[];
    rmReceiving?: RawMaterialReceiving[];
    rmWeight?: RMWeightCheck[];
    expDate?: ExpDateRecord[];
  }
): Promise<{ success: boolean; count: number; message: string }> {
  await ensureSpreadsheetStructure(spreadsheetId);

  let totalCount = 0;
  const updates: Array<{ range: string; values: any[][] }> = [];

  const checkAndPrepare = async (sheetName: string, records?: any[]) => {
    if (!records || records.length === 0) return;
    const headers = SHEET_HEADERS[sheetName];

    // Get existing IDs in the sheet
    const idRes = await sheetsFetch(`${spreadsheetId}/values/'${sheetName}'!A:A`);
    const existingIds = new Set(
      (idRes.values || []).slice(1).map((r: any) => String(r[0] || '').trim()).filter(Boolean)
    );

    const newRecords = records.filter(r => !existingIds.has(String(r.id || '').trim()));
    if (newRecords.length > 0) {
      const rows = newRecords.map(r => recordToRow(headers, r, sheetName));
      await sheetsFetch(`${spreadsheetId}/values/'${sheetName}'!A:${String.fromCharCode(64 + headers.length)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        body: JSON.stringify({ values: rows })
      });
      totalCount += newRecords.length;
    }
  };

  await checkAndPrepare('Packaging_Inspection', recordsMap.packaging);
  await checkAndPrepare('FG_Weight_Check', recordsMap.fgWeight);
  await checkAndPrepare('Raw_Material_Receiving', recordsMap.rmReceiving);
  await checkAndPrepare('RM_Weight_Check', recordsMap.rmWeight);
  await checkAndPrepare('Exp_Date', recordsMap.expDate);

  return {
    success: true,
    count: totalCount,
    message: totalCount > 0 
      ? `อัปโหลดข้อมูลใหม่สำเร็จจำนวน ${totalCount} รายการ เข้าสู่ Google Sheets เรียบร้อยแล้วค่ะ` 
      : 'ข้อมูลทุกรายการมีอยู่ใน Google Sheets อยู่แล้วค่ะ'
  };
}

/**
 * Searches and lists recent Google Spreadsheets from the user's Google Drive
 */
export async function searchRecentSpreadsheets(searchTerm: string = ''): Promise<{ id: string; name: string }[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google Account ก่อนค่ะ');
  }

  let query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed = false";
  if (searchTerm.trim()) {
    const escapedTerm = searchTerm.replace(/'/g, "\\'");
    query += ` and name contains '${escapedTerm}'`;
  }

  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodedQuery}&orderBy=modifiedTime desc&pageSize=15&fields=files(id,name)`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`ไม่สามารถค้นหาไฟล์ใน Google Drive ได้ (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

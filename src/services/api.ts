import { 
  PackagingInspection, 
  FGWeightCheck, 
  RawMaterialReceiving, 
  RMWeightCheck, 
  ExpDateRecord, 
  MasterData 
} from '../types';
import { 
  INITIAL_PACKAGING, 
  INITIAL_FG_WEIGHT, 
  INITIAL_RM_RECEIVING, 
  INITIAL_RM_WEIGHT, 
  INITIAL_EXP_DATE, 
  INITIAL_MASTER_DATA 
} from '../data/mockData';

// Get Google Apps Script URL from local storage or environment variables
export function getAppsScriptUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('apps_script_url');
    if (saved) return saved;
  }
  return ((import.meta as any).env?.VITE_APPS_SCRIPT_URL as string) || '';
}

export function setAppsScriptUrl(url: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('apps_script_url', url);
  }
}

export function clearAppsScriptUrl() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('apps_script_url');
  }
}

// Check if Apps Script is connected
export function isConnectedToSheets(): boolean {
  return !!getAppsScriptUrl();
}

// Fallback Local Storage Storage Key Constants
const KEYS = {
  PACKAGING: 'fg_rm_inspection_packaging',
  FG_WEIGHT: 'fg_rm_inspection_fg_weight',
  RM_RECEIVING: 'fg_rm_inspection_rm_receiving',
  RM_WEIGHT: 'fg_rm_inspection_rm_weight',
  EXP_DATE: 'fg_rm_inspection_exp_date',
  MASTER_DATA: 'fg_rm_inspection_master_data'
};

// Retrieve data from Local Storage (fallback)
function getLocal<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
}

// Save data to Local Storage (fallback)
function saveLocal<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// Helper to auto-extract master data on local changes
function extractAndSaveLocalMaster() {
  const packaging = getLocal<PackagingInspection[]>(KEYS.PACKAGING, INITIAL_PACKAGING);
  const fgWeight = getLocal<FGWeightCheck[]>(KEYS.FG_WEIGHT, INITIAL_FG_WEIGHT);
  const receiving = getLocal<RawMaterialReceiving[]>(KEYS.RM_RECEIVING, INITIAL_RM_RECEIVING);
  const rmWeight = getLocal<RMWeightCheck[]>(KEYS.RM_WEIGHT, INITIAL_RM_WEIGHT);
  const expDates = getLocal<ExpDateRecord[]>(KEYS.EXP_DATE, INITIAL_EXP_DATE);

  const customersSet = new Set<string>();
  const fgCodesSet = new Set<string>();
  const rmCodesSet = new Set<string>();
  const suppliersSet = new Set<string>();

  // Add initial lists as defaults
  INITIAL_MASTER_DATA.customers.forEach(c => customersSet.add(c));
  INITIAL_MASTER_DATA.fgCodes.forEach(f => fgCodesSet.add(f));
  INITIAL_MASTER_DATA.rmCodes.forEach(r => rmCodesSet.add(r));
  INITIAL_MASTER_DATA.suppliers.forEach(s => suppliersSet.add(s));

  // Extract from transactions
  packaging.forEach(item => {
    if (item.customer) customersSet.add(item.customer);
    if (item.fgCode) fgCodesSet.add(item.fgCode);
  });
  fgWeight.forEach(item => {
    if (item.fgCode) fgCodesSet.add(item.fgCode);
  });
  receiving.forEach(item => {
    if (item.rmCode) rmCodesSet.add(item.rmCode);
    if (item.supplier) suppliersSet.add(item.supplier);
  });
  rmWeight.forEach(item => {
    if (item.rmCode) rmCodesSet.add(item.rmCode);
  });
  expDates.forEach(item => {
    if (item.rmCode) rmCodesSet.add(item.rmCode);
  });

  const updatedMaster: MasterData = {
    customers: Array.from(customersSet).filter(Boolean),
    fgCodes: Array.from(fgCodesSet).filter(Boolean),
    rmCodes: Array.from(rmCodesSet).filter(Boolean),
    suppliers: Array.from(suppliersSet).filter(Boolean)
  };

  saveLocal(KEYS.MASTER_DATA, updatedMaster);
  return updatedMaster;
}

// Initialise Local Storage with Mock Data if empty
export function initLocalData() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(KEYS.PACKAGING)) saveLocal(KEYS.PACKAGING, INITIAL_PACKAGING);
  if (!localStorage.getItem(KEYS.FG_WEIGHT)) saveLocal(KEYS.FG_WEIGHT, INITIAL_FG_WEIGHT);
  if (!localStorage.getItem(KEYS.RM_RECEIVING)) saveLocal(KEYS.RM_RECEIVING, INITIAL_RM_RECEIVING);
  if (!localStorage.getItem(KEYS.RM_WEIGHT)) saveLocal(KEYS.RM_WEIGHT, INITIAL_RM_WEIGHT);
  if (!localStorage.getItem(KEYS.EXP_DATE)) saveLocal(KEYS.EXP_DATE, INITIAL_EXP_DATE);
  extractAndSaveLocalMaster();
}

// Helper to sanitize records and guarantee unique, non-empty IDs
function sanitizeRecords<T extends { id: string }>(records: T[], prefix: string): T[] {
  if (!Array.isArray(records)) return [];
  const seenIds = new Set<string>();
  return records.map((rec: any, idx) => {
    let id = rec.id ? String(rec.id).trim() : '';
    // Generate a unique ID if it is empty or already exists
    if (!id || seenIds.has(id)) {
      id = `${prefix}-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
    }
    seenIds.add(id);

    // Create a copy to prevent mutation issues
    const sanitized = { ...rec, id };

    // Standardize and normalize 'status' attribute
    if ('status' in sanitized || prefix === 'fgw' || prefix === 'rmw' || prefix === 'pkg' || prefix === 'rmr') {
      const currentStatus = String(sanitized.status || '').trim();
      const samples = sanitized.samples || [];

      if (prefix === 'fgw' || prefix === 'rmw') {
        // For FG / RM Weighing:
        // 1. If samples are empty, it is definitely a task waiting to be weighed ("รอชั่ง") -> 'Pending'
        if (!Array.isArray(samples) || samples.length === 0) {
          sanitized.status = 'Pending';
        } else {
          // 2. If samples are present, parse status from spreadsheet cells or calculate it
          const sUpper = currentStatus.toUpperCase();
          const passedVal = String(sanitized['ผ่าน'] || sanitized['pass'] || '').toUpperCase().trim();
          const failedVal = String(sanitized['ไม่ผ่าน'] || sanitized['fail'] || '').toUpperCase().trim();

          if (sUpper === 'PASS' || sUpper === 'TRUE' || passedVal === 'TRUE' || passedVal === 'PASS' || passedVal === 'ผ่าน') {
            sanitized.status = 'Pass';
          } else if (sUpper === 'FAIL' || sUpper === 'FALSE' || failedVal === 'TRUE' || failedVal === 'FAIL' || failedVal === 'ไม่ผ่าน') {
            sanitized.status = 'Fail';
          } else {
            // Default: Auto calculate based on standard and 5% tolerance
            const standard = parseFloat(sanitized.standardWeightKg) || 0;
            const avg = samples.reduce((a: number, b: number) => a + b, 0) / samples.length;
            if (standard > 0) {
              const variance = Math.abs(avg - standard) / standard;
              sanitized.status = variance <= 0.05 ? 'Pass' : 'Fail';
            } else {
              sanitized.status = 'Pass';
            }
          }
        }
      } else if (prefix === 'pkg' || prefix === 'rmr') {
        // For general Inspection/Receiving
        const sUpper = currentStatus.toUpperCase();
        if (sUpper === 'PASS' || sUpper === 'TRUE' || sUpper === 'ผ่าน') {
          sanitized.status = 'Pass';
        } else if (sUpper === 'FAIL' || sUpper === 'FALSE' || sUpper === 'ไม่ผ่าน') {
          sanitized.status = 'Fail';
        } else {
          sanitized.status = 'Pending';
        }
      }
    }

    return sanitized as T;
  });
}

export interface FetchResult {
  packaging: PackagingInspection[];
  fgWeight: FGWeightCheck[];
  rmReceiving: RawMaterialReceiving[];
  rmWeight: RMWeightCheck[];
  expDate: ExpDateRecord[];
  masterData: MasterData;
}

// Load All Data from Sheets API or Fallback Local Storage
export async function fetchAllData(): Promise<FetchResult> {
  const url = getAppsScriptUrl();
  if (url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fetch from Google Sheets failed with status ' + res.status);
      const result = await res.json();
      if (result.success) {
        // Read current local storage first to prevent accidental wipes when connecting to a blank sheet
        const localPkgs = sanitizeRecords<PackagingInspection>(getLocal<PackagingInspection[]>(KEYS.PACKAGING, []), 'pkg');
        const localFgW = sanitizeRecords<FGWeightCheck>(getLocal<FGWeightCheck[]>(KEYS.FG_WEIGHT, []), 'fgw');
        const localRmR = sanitizeRecords<RawMaterialReceiving>(getLocal<RawMaterialReceiving[]>(KEYS.RM_RECEIVING, []), 'rmr');
        const localRmW = sanitizeRecords<RMWeightCheck>(getLocal<RMWeightCheck[]>(KEYS.RM_WEIGHT, []), 'rmw');
        const localExp = sanitizeRecords<ExpDateRecord>(getLocal<ExpDateRecord[]>(KEYS.EXP_DATE, []), 'exp');
        
        const isSheetEmpty = 
          (!result.packaging || result.packaging.length === 0) &&
          (!result.fgWeight || result.fgWeight.length === 0) &&
          (!result.rmReceiving || result.rmReceiving.length === 0) &&
          (!result.rmWeight || result.rmWeight.length === 0) &&
          (!result.expDate || result.expDate.length === 0);
          
        const isLocalNotEmpty = 
          localPkgs.length > 0 || 
          localFgW.length > 0 || 
          localRmR.length > 0 || 
          localRmW.length > 0 || 
          localExp.length > 0;

        if (isSheetEmpty && isLocalNotEmpty) {
          console.log('Google Sheets is empty but local storage has data. Preserving local data for sync.');
          return {
            packaging: localPkgs,
            fgWeight: localFgW,
            rmReceiving: localRmR,
            rmWeight: localRmW,
            expDate: localExp,
            masterData: getLocal<MasterData>(KEYS.MASTER_DATA, INITIAL_MASTER_DATA)
          };
        }

        const sanitizedPackaging = sanitizeRecords<PackagingInspection>(result.packaging || [], 'pkg');
        const sanitizedFgWeight = sanitizeRecords<FGWeightCheck>(result.fgWeight || [], 'fgw');
        const sanitizedRmReceiving = sanitizeRecords<RawMaterialReceiving>(result.rmReceiving || [], 'rmr');
        const sanitizedRmWeight = sanitizeRecords<RMWeightCheck>(result.rmWeight || [], 'rmw');
        const sanitizedExpDate = sanitizeRecords<ExpDateRecord>(result.expDate || [], 'exp');

        // Cache sheet results locally to enable offline fallback
        saveLocal(KEYS.PACKAGING, sanitizedPackaging);
        saveLocal(KEYS.FG_WEIGHT, sanitizedFgWeight);
        saveLocal(KEYS.RM_RECEIVING, sanitizedRmReceiving);
        saveLocal(KEYS.RM_WEIGHT, sanitizedRmWeight);
        saveLocal(KEYS.EXP_DATE, sanitizedExpDate);
        saveLocal(KEYS.MASTER_DATA, result.masterData || INITIAL_MASTER_DATA);

        return {
          packaging: sanitizedPackaging,
          fgWeight: sanitizedFgWeight,
          rmReceiving: sanitizedRmReceiving,
          rmWeight: sanitizedRmWeight,
          expDate: sanitizedExpDate,
          masterData: result.masterData || INITIAL_MASTER_DATA
        };
      } else {
        throw new Error(result.message || 'Apps Script returned failure');
      }
    } catch (error: any) {
      console.warn('Google Sheets loading failed. Falling back to local storage cache.', error);
      throw error;
    }
  }

  // Fallback to local storage
  initLocalData();
  return {
    packaging: sanitizeRecords<PackagingInspection>(getLocal<PackagingInspection[]>(KEYS.PACKAGING, INITIAL_PACKAGING), 'pkg'),
    fgWeight: sanitizeRecords<FGWeightCheck>(getLocal<FGWeightCheck[]>(KEYS.FG_WEIGHT, INITIAL_FG_WEIGHT), 'fgw'),
    rmReceiving: sanitizeRecords<RawMaterialReceiving>(getLocal<RawMaterialReceiving[]>(KEYS.RM_RECEIVING, INITIAL_RM_RECEIVING), 'rmr'),
    rmWeight: sanitizeRecords<RMWeightCheck>(getLocal<RMWeightCheck[]>(KEYS.RM_WEIGHT, INITIAL_RM_WEIGHT), 'rmw'),
    expDate: sanitizeRecords<ExpDateRecord>(getLocal<ExpDateRecord[]>(KEYS.EXP_DATE, INITIAL_EXP_DATE), 'exp'),
    masterData: getLocal<MasterData>(KEYS.MASTER_DATA, INITIAL_MASTER_DATA)
  };
}

// Write operation to Sheets Web App or Local Storage Fallback
export async function writeRecord(
  action: 'create' | 'update' | 'delete',
  sheetName: 'Packaging_Inspection' | 'FG_Weight_Check' | 'Raw_Material_Receiving' | 'RM_Weight_Check' | 'Exp_Date',
  data: any
): Promise<{ success: boolean; message: string; masterData?: MasterData }> {
  const url = getAppsScriptUrl();
  if (url) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Standard CORS-friendly request for Google Apps Script Web Apps
        },
        body: JSON.stringify({ action, sheetName, data })
      });
      if (!response.ok) throw new Error('HTTP Error: ' + response.status);
      const result = await response.json();
      if (result.success) {
        return { 
          success: true, 
          message: result.message || 'Operation successful',
          masterData: result.masterData 
        };
      } else {
        // Self-healing client side: if update fails because the record was not found, auto-convert to 'create'
        if (action === 'update' && result.message && result.message.toLowerCase().includes('not found')) {
          console.warn(`Record not found for update in sheet ${sheetName}. Auto-converting to create...`);
          return writeRecord('create', sheetName, data);
        }
        // Self-healing client side: if delete fails because the record was not found, it's already deleted
        if (action === 'delete' && result.message && result.message.toLowerCase().includes('not found')) {
          console.warn(`Record already deleted or not found in sheet ${sheetName}. Success.`);
          return { 
            success: true, 
            message: 'Record already deleted or not found in sheet',
            masterData: result.masterData 
          };
        }
        throw new Error(result.message || 'Operation failed');
      }
    } catch (error: any) {
      console.error('Google Sheets write failed. Storing in local storage fallback.', error);
      return { success: false, message: 'Google Sheets sync failed: ' + error.message };
    }
  }

  // Fallback Local CRUD
  let localKey = '';
  if (sheetName === 'Packaging_Inspection') localKey = KEYS.PACKAGING;
  else if (sheetName === 'FG_Weight_Check') localKey = KEYS.FG_WEIGHT;
  else if (sheetName === 'Raw_Material_Receiving') localKey = KEYS.RM_RECEIVING;
  else if (sheetName === 'RM_Weight_Check') localKey = KEYS.RM_WEIGHT;
  else if (sheetName === 'Exp_Date') localKey = KEYS.EXP_DATE;

  const records = getLocal<any[]>(localKey, []);
  if (action === 'create') {
    records.push(data);
  } else if (action === 'update') {
    const idx = records.findIndex(r => r.id === data.id);
    if (idx !== -1) {
      records[idx] = data;
    }
  } else if (action === 'delete') {
    const idx = records.findIndex(r => r.id === data.id);
    if (idx !== -1) {
      records.splice(idx, 1);
    }
  }

  saveLocal(localKey, records);
  const updatedMaster = extractAndSaveLocalMaster();

  return { 
    success: true, 
    message: `Record ${action}d locally (Local Mode)`,
    masterData: updatedMaster
  };
}

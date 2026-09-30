import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  PackagingInspection, 
  FGWeightCheck, 
  RawMaterialReceiving, 
  RMWeightCheck, 
  ExpDateRecord, 
  MasterData, 
  UserRole, 
  ActiveTab 
} from '../types';
import { 
  fetchAllData, 
  writeRecord as apiWriteRecord, 
  getAppsScriptUrl, 
  setAppsScriptUrl, 
  isConnectedToSheets, 
  clearAppsScriptUrl 
} from '../services/api';

export interface AppNotification {
  type: 'success' | 'confirm';
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AppContextType {
  userRole: UserRole;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isSyncing: boolean;
  isConnected: boolean;
  appsScriptUrl: string;
  updateAppsScript: (url: string) => Promise<boolean>;
  disconnectSheets: () => void;
  loginAsAdmin: (pin: string) => boolean;
  logoutAdmin: () => void;
  refreshData: () => Promise<void>;
  
  // Custom Notifications / Confirm Modal
  notification: AppNotification | null;
  triggerSuccess: (message: string) => void;
  triggerConfirm: (message: string, onConfirm: () => void) => void;
  closeNotification: () => void;
  
  // Data
  packagingRecords: PackagingInspection[];
  fgWeightRecords: FGWeightCheck[];
  rmReceivingRecords: RawMaterialReceiving[];
  rmWeightRecords: RMWeightCheck[];
  expDateRecords: ExpDateRecord[];
  masterData: MasterData;
  
  // CRUD
  addPackaging: (rec: Omit<PackagingInspection, 'id' | 'status'>) => Promise<void>;
  updatePackaging: (rec: PackagingInspection) => Promise<void>;
  deletePackaging: (id: string) => Promise<void>;
  
  addFGWeight: (rec: Omit<FGWeightCheck, 'id' | 'status'>) => Promise<void>;
  updateFGWeight: (rec: FGWeightCheck) => Promise<void>;
  deleteFGWeight: (id: string) => Promise<void>;
  
  addRMReceiving: (rec: Omit<RawMaterialReceiving, 'id' | 'status'>) => Promise<void>;
  updateRMReceiving: (rec: RawMaterialReceiving) => Promise<void>;
  deleteRMReceiving: (id: string) => Promise<void>;
  
  addRMWeight: (rec: Omit<RMWeightCheck, 'id' | 'status'>) => Promise<void>;
  updateRMWeight: (rec: RMWeightCheck) => Promise<void>;
  deleteRMWeight: (id: string) => Promise<void>;
  
  addExpDate: (rec: Omit<ExpDateRecord, 'id' | 'status'>) => Promise<void>;
  updateExpDate: (rec: ExpDateRecord) => Promise<void>;
  deleteExpDate: (id: string) => Promise<void>;
  
  // Custom Master Add (Direct)
  addMasterItem: (type: keyof MasterData, value: string) => Promise<void>;
  importFGWeightBatch: (records: FGWeightCheck[]) => Promise<void>;
  resetFGWeightToDefault: () => void;
  uploadLocalDataToSheets: () => Promise<{ success: boolean; count: number; message: string }>;
  
  // FG Weight Filter state from Dashboard interaction
  fgWeightFilterPendingOnly: boolean;
  setFgWeightFilterPendingOnly: (val: boolean) => void;
  connectionError: string | null;
  setConnectionError: (err: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>('General');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [appsScriptUrl, setUrlState] = useState<string>('');
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [fgWeightFilterPendingOnly, setFgWeightFilterPendingOnly] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const writeRecord = async (
    action: 'create' | 'update' | 'delete',
    sheetName: 'Packaging_Inspection' | 'FG_Weight_Check' | 'Raw_Material_Receiving' | 'RM_Weight_Check' | 'Exp_Date',
    data: any
  ) => {
    try {
      const res = await apiWriteRecord(action, sheetName, data);
      if (!res.success) {
        setConnectionError(res.message);
      } else {
        setConnectionError(null);
      }
      return res;
    } catch (e: any) {
      setConnectionError(e.message || 'Unknown write error');
      return { success: false, message: e.message, masterData: undefined };
    }
  };

  const triggerSuccess = (message: string) => {
    setNotification({
      type: 'success',
      message
    });
    // Auto dismiss after 2.5 seconds
    setTimeout(() => {
      setNotification(prev => prev?.type === 'success' ? null : prev);
    }, 2500);
  };

  const triggerConfirm = (message: string, onConfirm: () => void) => {
    setNotification({
      type: 'confirm',
      message,
      onConfirm: () => {
        onConfirm();
        setNotification(null);
      },
      onCancel: () => {
        setNotification(null);
      }
    });
  };

  const closeNotification = () => {
    setNotification(null);
  };

  const [packagingRecords, setPackagingRecords] = useState<PackagingInspection[]>([]);
  const [fgWeightRecords, setFgWeightRecords] = useState<FGWeightCheck[]>([]);
  const [rmReceivingRecords, setRmReceivingRecords] = useState<RawMaterialReceiving[]>([]);
  const [rmWeightRecords, setRMWeightRecords] = useState<RMWeightCheck[]>([]);
  const [expDateRecords, setExpDateRecords] = useState<ExpDateRecord[]>([]);
  const [masterData, setMasterData] = useState<MasterData>({
    customers: [],
    fgCodes: [],
    rmCodes: [],
    suppliers: []
  });

  // Load configuration and data on startup
  useEffect(() => {
    const url = getAppsScriptUrl();
    setUrlState(url);
    setIsConnected(!!url);
    refreshData();
  }, []);

  const getMergedMasterData = (fetchedMaster: MasterData): MasterData => {
    let manualMaster: MasterData = { customers: [], fgCodes: [], rmCodes: [], suppliers: [] };
    if (typeof window !== 'undefined') {
      const savedManual = localStorage.getItem('fg_rm_inspection_manual_master_data');
      if (savedManual) {
        try {
          manualMaster = JSON.parse(savedManual);
        } catch (e) {}
      }
    }
    return {
      customers: Array.from(new Set([...(fetchedMaster?.customers || []), ...(manualMaster?.customers || [])])),
      fgCodes: Array.from(new Set([...(fetchedMaster?.fgCodes || []), ...(manualMaster?.fgCodes || [])])),
      rmCodes: Array.from(new Set([...(fetchedMaster?.rmCodes || []), ...(manualMaster?.rmCodes || [])])),
      suppliers: Array.from(new Set([...(fetchedMaster?.suppliers || []), ...(manualMaster?.suppliers || [])]))
    };
  };

  const refreshData = async () => {
    setIsSyncing(true);
    setConnectionError(null);
    try {
      const data = await fetchAllData();
      setPackagingRecords(data.packaging);
      setFgWeightRecords(data.fgWeight);
      setRmReceivingRecords(data.rmReceiving);
      setRMWeightRecords(data.rmWeight);
      setExpDateRecords(data.expDate);
      setMasterData(getMergedMasterData(data.masterData));
    } catch (e: any) {
      console.warn('Google Sheets loading failed, running in Local Mode:', e);
      if (getAppsScriptUrl()) {
        setConnectionError(e.message || 'Connection failed');
        // Retrieve cached local data so the app displays something
        const mock = await import('../data/mockData');
        const getLocalWithFallback = (key: string, fb: any) => {
          try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : fb;
          } catch {
            return fb;
          }
        };
        setPackagingRecords(getLocalWithFallback('fg_rm_inspection_packaging', mock.INITIAL_PACKAGING));
        setFgWeightRecords(getLocalWithFallback('fg_rm_inspection_fg_weight', mock.INITIAL_FG_WEIGHT));
        setRmReceivingRecords(getLocalWithFallback('fg_rm_inspection_rm_receiving', mock.INITIAL_RM_RECEIVING));
        setRMWeightRecords(getLocalWithFallback('fg_rm_inspection_rm_weight', mock.INITIAL_RM_WEIGHT));
        setExpDateRecords(getLocalWithFallback('fg_rm_inspection_exp_date', mock.INITIAL_EXP_DATE));
        setMasterData(getMergedMasterData(getLocalWithFallback('fg_rm_inspection_master_data', mock.INITIAL_MASTER_DATA)));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const updateAppsScript = async (url: string): Promise<boolean> => {
    setIsSyncing(true);
    setConnectionError(null);
    try {
      // Test URL connection with direct fetch first, fallback to proxy
      let json;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Status: ' + res.status);
        json = await res.json();
      } catch (directErr: any) {
        console.warn('Direct connection test failed, trying server-side proxy...', directErr);
        const proxyRes = await fetch('/api/proxy-sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, method: 'GET' }),
        });
        
        if (!proxyRes.ok) {
          const errText = await proxyRes.text();
          try {
            const errJson = JSON.parse(errText);
            throw new Error(errJson.message || `Proxy server returned status ${proxyRes.status}`);
          } catch {
            throw new Error(`Proxy server returned status ${proxyRes.status}: ${errText}`);
          }
        }
        
        json = await proxyRes.json();
      }

      if (json.success) {
        setAppsScriptUrl(url);
        setUrlState(url);
        setIsConnected(true);
        setConnectionError(null);

        const isSheetEmpty = 
          (!json.packaging || json.packaging.length === 0) &&
          (!json.fgWeight || json.fgWeight.length === 0) &&
          (!json.rmReceiving || json.rmReceiving.length === 0) &&
          (!json.rmWeight || json.rmWeight.length === 0) &&
          (!json.expDate || json.expDate.length === 0);
          
        const isLocalNotEmpty = 
          packagingRecords.length > 0 || 
          fgWeightRecords.length > 0 || 
          rmReceivingRecords.length > 0 || 
          rmWeightRecords.length > 0 || 
          expDateRecords.length > 0;

        if (isSheetEmpty && isLocalNotEmpty) {
          // Google Sheets is empty but we have local data! 
          // Do not clear the UI records or local cache; keep them and show success,
          // so the user can immediately click upload to sync them.
          console.log('Google Sheets is empty but React state has data. Preserving current state.');
          setAppsScriptUrl(url);
          setUrlState(url);
          setIsConnected(true);
          return true;
        }

        // Load data immediately
        setPackagingRecords(json.packaging || []);
        setFgWeightRecords(json.fgWeight || []);
        setRmReceivingRecords(json.rmReceiving || []);
        setRMWeightRecords(json.rmWeight || []);
        setExpDateRecords(json.expDate || []);
        setMasterData(getMergedMasterData(json.masterData));

        // Cache to local storage
        saveToLocalStorage('fg_rm_inspection_packaging', json.packaging || []);
        saveToLocalStorage('fg_rm_inspection_fg_weight', json.fgWeight || []);
        saveToLocalStorage('fg_rm_inspection_rm_receiving', json.rmReceiving || []);
        saveToLocalStorage('fg_rm_inspection_rm_weight', json.rmWeight || []);
        saveToLocalStorage('fg_rm_inspection_exp_date', json.expDate || []);
        saveToLocalStorage('fg_rm_inspection_master_data', json.masterData || { customers: [], fgCodes: [], rmCodes: [], suppliers: [] });

        return true;
      }
      setConnectionError(json.message || 'Connection returned success=false');
      return false;
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setConnectionError(error.message || 'Connection test failed');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnectSheets = () => {
    clearAppsScriptUrl();
    setUrlState('');
    setIsConnected(false);
    refreshData(); // Resets back to local data
  };

  const loginAsAdmin = (pin: string): boolean => {
    // PIN requirement
    if (pin === '1234') {
      setUserRole('Admin');
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setUserRole('General');
  };

  // CRUD Actions helper to verify master data lists
  const handleMasterUpdates = (master?: MasterData) => {
    if (master) {
      setMasterData(master);
    } else {
      // Trigger a soft local refresh of master data
      refreshData();
    }
  };

  const saveToLocalStorage = (key: string, data: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // 1. Packaging Inspection
  const addPackaging = async (rec: Omit<PackagingInspection, 'id' | 'status'>) => {
    const id = 'pkg-' + Date.now();
    const newRecord: PackagingInspection = { ...rec, id, status: 'Pending' };
    
    // Auto-create corresponding FG Weight Check record (Pending)
    const fgwId = 'fgw-' + Date.now();
    const newFGWRecord: FGWeightCheck = {
      id: fgwId,
      date: rec.date,
      fgCode: rec.fgCode,
      batch: rec.batch,
      quantityKg: rec.quantityKg,
      standardWeightKg: 20, // default standard weight
      samples: [],
      averageWeight: 0,
      status: 'Pending',
      containerType: 'กล่อง',
      inspector: rec.inspector || 'QC Operator'
    };
    
    // Optimistic UI updates for both tables
    setPackagingRecords(prev => {
      const updated = [newRecord, ...prev];
      saveToLocalStorage('fg_rm_inspection_packaging', updated);
      return updated;
    });
    setFgWeightRecords(prev => {
      const updated = [newFGWRecord, ...prev];
      saveToLocalStorage('fg_rm_inspection_fg_weight', updated);
      return updated;
    });
    
    const res = await writeRecord('create', 'Packaging_Inspection', newRecord);
    // Write corresponding FG Weight Check record to Sheets
    await writeRecord('create', 'FG_Weight_Check', newFGWRecord);
    
    handleMasterUpdates(res.masterData);
  };

  const updatePackaging = async (rec: PackagingInspection) => {
    setPackagingRecords(prev => {
      const updated = prev.map(r => r.id === rec.id ? rec : r);
      saveToLocalStorage('fg_rm_inspection_packaging', updated);
      return updated;
    });
    const res = await writeRecord('update', 'Packaging_Inspection', rec);
    handleMasterUpdates(res.masterData);
  };

  const deletePackaging = async (id: string) => {
    const pkgRec = packagingRecords.find(r => r.id === id);

    setPackagingRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveToLocalStorage('fg_rm_inspection_packaging', updated);
      return updated;
    });
    await writeRecord('delete', 'Packaging_Inspection', { id });

    if (pkgRec) {
      const linkedFGW = fgWeightRecords.find(r => r.fgCode === pkgRec.fgCode && r.batch === pkgRec.batch);
      if (linkedFGW) {
        setFgWeightRecords(prev => {
          const updated = prev.filter(r => r.id !== linkedFGW.id);
          saveToLocalStorage('fg_rm_inspection_fg_weight', updated);
          return updated;
        });
        await writeRecord('delete', 'FG_Weight_Check', { id: linkedFGW.id });
      }
    }
  };

  // 2. FG Weight Check
  const addFGWeight = async (rec: Omit<FGWeightCheck, 'id' | 'status'> & { status?: 'Pass' | 'Fail' | 'Pending' }) => {
    const id = 'fgw-' + Date.now();
    const avg = rec.samples.length > 0 ? rec.samples.reduce((a, b) => a + b, 0) / rec.samples.length : 0;
    
    // Auto Pass/Fail Logic based on weight variance (within 1% tolerance)
    const variance = Math.abs(avg - rec.standardWeightKg) / rec.standardWeightKg;
    const calculatedStatus = variance <= 0.01 ? 'Pass' : 'Fail';
    const status = rec.status || calculatedStatus;

    const newRecord: FGWeightCheck = { 
      ...rec, 
      id, 
      averageWeight: parseFloat(avg.toFixed(2)), 
      status 
    };
    
    setFgWeightRecords(prev => {
      const updated = [newRecord, ...prev];
      saveToLocalStorage('fg_rm_inspection_fg_weight', updated);
      return updated;
    });
    const res = await writeRecord('create', 'FG_Weight_Check', newRecord);
    handleMasterUpdates(res.masterData);
  };

  const updateFGWeight = async (rec: FGWeightCheck) => {
    setFgWeightRecords(prev => {
      const updated = prev.map(r => r.id === rec.id ? rec : r);
      saveToLocalStorage('fg_rm_inspection_fg_weight', updated);
      return updated;
    });
    const res = await writeRecord('update', 'FG_Weight_Check', rec);
    handleMasterUpdates(res.masterData);
  };

  const deleteFGWeight = async (id: string) => {
    setFgWeightRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveToLocalStorage('fg_rm_inspection_fg_weight', updated);
      return updated;
    });
    const res = await writeRecord('delete', 'FG_Weight_Check', { id });
    handleMasterUpdates(res.masterData);
  };

  // 3. RM Receiving
  const addRMReceiving = async (rec: Omit<RawMaterialReceiving, 'id' | 'status'>) => {
    const id = 'rmr-' + Date.now();
    const newRecord: RawMaterialReceiving = { ...rec, id, status: 'Pending' };
    
    // Auto-create corresponding RM Weight Check record
    const rmwId = 'rmw-' + Date.now();
    const newRMWeightRecord: RMWeightCheck = {
      id: rmwId,
      date: rec.date,
      rmCode: rec.rmCode,
      batch: rec.batch,
      quantityKg: rec.quantityKg,
      standardWeightKg: 25, // default standard weight
      samples: [],
      averageWeight: 0,
      status: 'Pending',
      containerType: 'ถุง',
      inspector: rec.inspector || 'QC Operator'
    };

    // Auto-create corresponding Expiry Date record
    const expId = 'exp-' + Date.now();
    const newExpRecord: ExpDateRecord = {
      id: expId,
      date: rec.date,
      rmCode: rec.rmCode,
      batch: rec.batch,
      mfgDate: '',
      expDate: '',
      status: 'Pending',
      inspector: rec.inspector || 'QC Operator'
    };

    // Optimistic state updates for all tables
    setRmReceivingRecords(prev => {
      const updated = [newRecord, ...prev];
      saveToLocalStorage('fg_rm_inspection_rm_receiving', updated);
      return updated;
    });
    setRMWeightRecords(prev => {
      const updated = [newRMWeightRecord, ...prev];
      saveToLocalStorage('fg_rm_inspection_rm_weight', updated);
      return updated;
    });
    setExpDateRecords(prev => {
      const updated = [newExpRecord, ...prev];
      saveToLocalStorage('fg_rm_inspection_exp_date', updated);
      return updated;
    });

    // Send creations to Google Sheets backend
    const res = await writeRecord('create', 'Raw_Material_Receiving', newRecord);
    await writeRecord('create', 'RM_Weight_Check', newRMWeightRecord);
    await writeRecord('create', 'Exp_Date', newExpRecord);

    handleMasterUpdates(res.masterData);
  };

  const updateRMReceiving = async (rec: RawMaterialReceiving) => {
    setRmReceivingRecords(prev => {
      const updated = prev.map(r => r.id === rec.id ? rec : r);
      saveToLocalStorage('fg_rm_inspection_rm_receiving', updated);
      return updated;
    });
    const res = await writeRecord('update', 'Raw_Material_Receiving', rec);
    handleMasterUpdates(res.masterData);
  };

  const deleteRMReceiving = async (id: string) => {
    const rmRec = rmReceivingRecords.find(r => r.id === id);

    setRmReceivingRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveToLocalStorage('fg_rm_inspection_rm_receiving', updated);
      return updated;
    });
    await writeRecord('delete', 'Raw_Material_Receiving', { id });

    if (rmRec) {
      const linkedRMW = rmWeightRecords.find(r => r.rmCode === rmRec.rmCode && r.batch === rmRec.batch);
      if (linkedRMW) {
        setRMWeightRecords(prev => {
          const updated = prev.filter(r => r.id !== linkedRMW.id);
          saveToLocalStorage('fg_rm_inspection_rm_weight', updated);
          return updated;
        });
        await writeRecord('delete', 'RM_Weight_Check', { id: linkedRMW.id });
      }

      const linkedExp = expDateRecords.find(r => r.rmCode === rmRec.rmCode && r.batch === rmRec.batch);
      if (linkedExp) {
        setExpDateRecords(prev => {
          const updated = prev.filter(r => r.id !== linkedExp.id);
          saveToLocalStorage('fg_rm_inspection_exp_date', updated);
          return updated;
        });
        await writeRecord('delete', 'Exp_Date', { id: linkedExp.id });
      }
    }
  };

  // 4. RM Weight Check
  const addRMWeight = async (rec: Omit<RMWeightCheck, 'id' | 'status'> & { status?: 'Pass' | 'Fail' | 'Pending' }) => {
    const id = 'rmw-' + Date.now();
    const avg = rec.samples.length > 0 ? rec.samples.reduce((a, b) => a + b, 0) / rec.samples.length : 0;
    const variance = Math.abs(avg - rec.standardWeightKg) / rec.standardWeightKg;
    const calculatedStatus = variance <= 0.015 ? 'Pass' : 'Fail'; // 1.5% tolerance for raw materials
    const status = rec.status || calculatedStatus;

    const newRecord: RMWeightCheck = { 
      ...rec, 
      id, 
      averageWeight: parseFloat(avg.toFixed(2)), 
      status 
    };

    setRMWeightRecords(prev => {
      const updated = [newRecord, ...prev];
      saveToLocalStorage('fg_rm_inspection_rm_weight', updated);
      return updated;
    });
    const res = await writeRecord('create', 'RM_Weight_Check', newRecord);
    handleMasterUpdates(res.masterData);
  };

  const updateRMWeight = async (rec: RMWeightCheck) => {
    setRMWeightRecords(prev => {
      const updated = prev.map(r => r.id === rec.id ? rec : r);
      saveToLocalStorage('fg_rm_inspection_rm_weight', updated);
      return updated;
    });
    const res = await writeRecord('update', 'RM_Weight_Check', rec);
    handleMasterUpdates(res.masterData);
  };

  const deleteRMWeight = async (id: string) => {
    setRMWeightRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveToLocalStorage('fg_rm_inspection_rm_weight', updated);
      return updated;
    });
    const res = await writeRecord('delete', 'RM_Weight_Check', { id });
    handleMasterUpdates(res.masterData);
  };

  // 5. Exp Date Records
  const addExpDate = async (rec: Omit<ExpDateRecord, 'id' | 'status'>) => {
    const id = 'exp-' + Date.now();
    
    let status: 'Active' | 'Near Expiry' | 'Expired' | 'Pending' = 'Active';
    if (!rec.expDate) {
      status = 'Pending';
    } else {
      const today = new Date();
      const exp = new Date(rec.expDate);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) status = 'Expired';
      else if (diffDays <= 120) status = 'Near Expiry'; // 4 months Near Expiry
    }

    const newRecord: ExpDateRecord = { ...rec, id, status };
    
    setExpDateRecords(prev => {
      const updated = [newRecord, ...prev];
      saveToLocalStorage('fg_rm_inspection_exp_date', updated);
      return updated;
    });
    const res = await writeRecord('create', 'Exp_Date', newRecord);
    handleMasterUpdates(res.masterData);
  };

  const updateExpDate = async (rec: ExpDateRecord) => {
    let status: 'Active' | 'Near Expiry' | 'Expired' | 'Pending' = 'Active';
    if (!rec.expDate) {
      status = 'Pending';
    } else {
      const today = new Date();
      const exp = new Date(rec.expDate);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) status = 'Expired';
      else if (diffDays <= 120) status = 'Near Expiry';
    }

    const updated: ExpDateRecord = { ...rec, status };

    setExpDateRecords(prev => {
      const list = prev.map(r => r.id === rec.id ? updated : r);
      saveToLocalStorage('fg_rm_inspection_exp_date', list);
      return list;
    });
    const res = await writeRecord('update', 'Exp_Date', updated);
    handleMasterUpdates(res.masterData);
  };

  const deleteExpDate = async (id: string) => {
    setExpDateRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveToLocalStorage('fg_rm_inspection_exp_date', updated);
      return updated;
    });
    const res = await writeRecord('delete', 'Exp_Date', { id });
    handleMasterUpdates(res.masterData);
  };

  // Direct append of Master Item (e.g. forced from Master Data management tab)
  const addMasterItem = async (type: keyof MasterData, value: string) => {
    if (!value.trim()) return;
    const cleanValue = value.trim();
    
    // Verify it doesn't already exist
    if (masterData[type].indexOf(cleanValue) !== -1) return;

    // Get current manual master items
    let manualMaster: MasterData = { customers: [], fgCodes: [], rmCodes: [], suppliers: [] };
    if (typeof window !== 'undefined') {
      const savedManual = localStorage.getItem('fg_rm_inspection_manual_master_data');
      if (savedManual) {
        try {
          manualMaster = JSON.parse(savedManual);
        } catch (e) {}
      }
    }

    // Update manual list
    if (!manualMaster[type]) manualMaster[type] = [];
    if (manualMaster[type].indexOf(cleanValue) === -1) {
      manualMaster[type].push(cleanValue);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('fg_rm_inspection_manual_master_data', JSON.stringify(manualMaster));
    }

    // Update active state
    setMasterData(prev => ({
      ...prev,
      [type]: Array.from(new Set([...(prev[type] || []), cleanValue]))
    }));
  };

  const importFGWeightBatch = async (records: FGWeightCheck[]) => {
    // Find filtered imports that do not exist in the current state to prevent duplicates
    let filteredImports: FGWeightCheck[] = [];
    setFgWeightRecords(prev => {
      const existingKeys = new Set(prev.map(r => `${r.date}_${r.fgCode}_${r.batch}`));
      filteredImports = records.filter(r => !existingKeys.has(`${r.date}_${r.fgCode}_${r.batch}`));
      const merged = [...filteredImports, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('fg_rm_inspection_fg_weight', JSON.stringify(merged));
      }
      return merged;
    });

    const newFGCodes = Array.from(new Set(records.map(r => r.fgCode)));
    setMasterData(prev => {
      const updatedCodes = Array.from(new Set([...prev.fgCodes, ...newFGCodes]));
      const updated = { ...prev, fgCodes: updatedCodes };
      if (typeof window !== 'undefined') {
        localStorage.setItem('fg_rm_inspection_master_data', JSON.stringify(updated));
      }
      return updated;
    });

    // If connected to Google Sheets, push these new records immediately so they are persistent and don't get overwritten!
    if (appsScriptUrl && filteredImports.length > 0) {
      setIsSyncing(true);
      try {
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'batchCreate', sheetName: 'FG_Weight_Check', data: filteredImports })
        });
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
            console.log('Successfully synced batch to Google Sheets');
          } else {
            // Fallback to sequential write if batch is not supported
            for (const rec of filteredImports) {
              await writeRecord('create', 'FG_Weight_Check', rec);
            }
          }
        } else {
          for (const rec of filteredImports) {
            await writeRecord('create', 'FG_Weight_Check', rec);
          }
        }
        // Force state reload directly from Google Sheets to ensure perfect synchronisation
        await refreshData();
      } catch (err) {
        console.error('Failed to sync imported batch to Google Sheets:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const resetFGWeightToDefault = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fg_rm_inspection_fg_weight');
      localStorage.removeItem('fg_rm_inspection_master_data');
    }
    // Perform a clean reload from default mockData.ts
    refreshData();
  };

  const uploadLocalDataToSheets = async (): Promise<{ success: boolean; count: number; message: string }> => {
    if (!appsScriptUrl) return { success: false, count: 0, message: 'กรุณาเชื่อมต่อ Google Sheets ก่อนส่งข้อมูล' };
    setIsSyncing(true);
    try {
      // Import defaults directly
      const mock = await import('../data/mockData');
      
      const getLocalWithFallback = (key: string, fb: any) => {
        try {
          const val = localStorage.getItem(key);
          return val ? JSON.parse(val) : fb;
        } catch {
          return fb;
        }
      };

      const pkgs = getLocalWithFallback('fg_rm_inspection_packaging', mock.INITIAL_PACKAGING);
      const fgWeights = getLocalWithFallback('fg_rm_inspection_fg_weight', mock.INITIAL_FG_WEIGHT);
      const rmRecs = getLocalWithFallback('fg_rm_inspection_rm_receiving', mock.INITIAL_RM_RECEIVING);
      const rmWeights = getLocalWithFallback('fg_rm_inspection_rm_weight', mock.INITIAL_RM_WEIGHT);
      const exps = getLocalWithFallback('fg_rm_inspection_exp_date', mock.INITIAL_EXP_DATE);

      const uploadSheet = async (sheetName: string, records: any[]) => {
        if (records.length === 0) return;
        try {
          const response = await fetch(appsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'batchCreate', sheetName, data: records })
          });
          if (!response.ok) throw new Error('Network response was not ok');
          const resJson = await response.json();
          if (!resJson.success) {
            console.warn('batchCreate not supported by current script, falling back to sequential writes');
            for (const rec of records) {
              await writeRecord('create', sheetName as any, rec);
            }
          }
        } catch (e) {
          console.warn('Batch upload failed, falling back to sequential writes:', e);
          for (const rec of records) {
            await writeRecord('create', sheetName as any, rec);
          }
        }
      };

      await uploadSheet('Packaging_Inspection', pkgs);
      await uploadSheet('FG_Weight_Check', fgWeights);
      await uploadSheet('Raw_Material_Receiving', rmRecs);
      await uploadSheet('RM_Weight_Check', rmWeights);
      await uploadSheet('Exp_Date', exps);

      await refreshData();
      const totalCount = pkgs.length + fgWeights.length + rmRecs.length + rmWeights.length + exps.length;
      return { success: true, count: totalCount, message: `อัปโหลดข้อมูลประวัติทั้งหมดสำเร็จเรียบร้อย รวม ${totalCount} รายการ!` };
    } catch (err: any) {
      console.error('Upload local data failed:', err);
      return { success: false, count: 0, message: 'การอัปโหลดขัดข้อง: ' + err.message };
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppContext.Provider value={{
      userRole,
      activeTab,
      setActiveTab,
      isSyncing,
      isConnected,
      appsScriptUrl,
      updateAppsScript,
      disconnectSheets,
      loginAsAdmin,
      logoutAdmin,
      refreshData,
      
      notification,
      triggerSuccess,
      triggerConfirm,
      closeNotification,
      
      packagingRecords,
      fgWeightRecords,
      rmReceivingRecords,
      rmWeightRecords,
      expDateRecords,
      masterData,
      
      addPackaging,
      updatePackaging,
      deletePackaging,
      
      addFGWeight,
      updateFGWeight,
      deleteFGWeight,
      
      addRMReceiving,
      updateRMReceiving,
      deleteRMReceiving,
      
      addRMWeight,
      updateRMWeight,
      deleteRMWeight,
      
      addExpDate,
      updateExpDate,
      deleteExpDate,
      
      addMasterItem,
      importFGWeightBatch,
      resetFGWeightToDefault,
      uploadLocalDataToSheets,
      
      fgWeightFilterPendingOnly,
      setFgWeightFilterPendingOnly,
      connectionError,
      setConnectionError
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside an AppProvider');
  return context;
}

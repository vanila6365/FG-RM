import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { searchRecentSpreadsheets } from '../services/googleSheetsApi';
import { 
  Database, 
  CheckCircle, 
  Copy, 
  Link, 
  HelpCircle as HelpIcon, 
  ClipboardCheck, 
  Unlink, 
  AlertCircle, 
  UploadCloud, 
  ExternalLink, 
  Sparkles,
  FileSpreadsheet,
  LogIn,
  LogOut,
  RefreshCw
} from 'lucide-react';

export function AppsScriptSetup() {
  const { 
    appsScriptUrl, 
    updateAppsScript, 
    isConnected, 
    connectionType,
    googleUser,
    googleSpreadsheetId,
    signInWithGoogle,
    signOutGoogle,
    connectGoogleSpreadsheet,
    createAndConnectNewSpreadsheet,
    disconnectSheets, 
    isSyncing, 
    uploadLocalDataToSheets, 
    connectionError 
  } = useApp();

  // Tab: 'direct' (Direct Google Sheets API - Recommended) vs 'appscript' (Legacy Web App)
  // Force 'appscript' as the default to allow anonymous submissions for friends and coworkers
  const [activeTab, setActiveTab] = useState<'direct' | 'appscript'>('appscript');

  // Direct Sheets State
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isConnectingDirect, setIsConnectingDirect] = useState(false);
  const [directMessage, setDirectMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Drive Search State
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQueryError, setSearchQueryError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Automatically fetch recent spreadsheets when logged in
  React.useEffect(() => {
    if (googleUser && activeTab === 'direct' && !isConnected) {
      handleLoadRecentSheets();
    }
  }, [googleUser, activeTab, isConnected]);

  const handleLoadRecentSheets = async (term: string = '') => {
    setIsSearching(true);
    setSearchQueryError('');
    try {
      const files = await searchRecentSpreadsheets(term);
      setSearchResults(files);
      setHasSearched(true);
    } catch (err: any) {
      console.error('Error fetching spreadsheets:', err);
      if (term) {
        setSearchQueryError('ไม่สามารถโหลดข้อมูลสเปรดชีตจาก Google Drive ได้ค่ะ กรุณาลองกรอก URL โดยตรงแทนนะคะ');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRecentSheet = async (sheetId: string) => {
    setDirectMessage(null);
    setIsConnectingDirect(true);
    try {
      const ok = await connectGoogleSpreadsheet(sheetId);
      if (ok) {
        setDirectMessage({ type: 'success', text: 'เชื่อมต่อกับ Google Sheet เรียบร้อยแล้วค่ะ!' });
        setSheetUrlInput('');
      } else {
        setDirectMessage({ type: 'error', text: connectionError || 'ไม่สามารถเชื่อมต่อกับ Google Sheet นี้ได้' });
      }
    } catch (err: any) {
      setDirectMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setIsConnectingDirect(false);
    }
  };

  // Apps Script State
  const [urlInput, setUrlInput] = useState(appsScriptUrl || '');
  const [copied, setCachedCopied] = useState(false);
  const [connectError, setConnectError] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; success: boolean; count?: number; error?: string } | null>(null);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isCustomDomain = hostname && !hostname.includes('localhost') && !hostname.includes('127.0.0.1') && !hostname.includes('run.app');

  const isUnauthorizedDomainError = connectionError && (
    connectionError.toLowerCase().includes('unauthorized-domain') || 
    connectionError.toLowerCase().includes('authorized domain') ||
    connectionError.toLowerCase().includes('auth/unauthorized-domain') ||
    connectionError.toLowerCase().includes('ไม่ได้รับอนุญาต')
  );

  const isPopupBlockedError = connectionError && (
    connectionError.toLowerCase().includes('popup-blocked') ||
    connectionError.toLowerCase().includes('popup_blocked') ||
    connectionError.toLowerCase().includes('บล็อก')
  );

  // Handle Google Direct Connect with URL/ID
  const handleDirectConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrlInput.trim()) return;

    setDirectMessage(null);
    setIsConnectingDirect(true);
    try {
      const ok = await connectGoogleSpreadsheet(sheetUrlInput.trim());
      if (ok) {
        setDirectMessage({ type: 'success', text: 'เชื่อมต่อกับ Google Sheet เรียบร้อยแล้วค่ะ!' });
        setSheetUrlInput('');
      } else {
        setDirectMessage({ type: 'error', text: connectionError || 'ไม่สามารถเชื่อมต่อกับ Google Sheet นี้ได้' });
      }
    } catch (err: any) {
      setDirectMessage({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setIsConnectingDirect(false);
    }
  };

  // Handle Create New Spreadsheet Automatically
  const handleCreateNewSheet = async () => {
    setDirectMessage(null);
    setIsCreatingSheet(true);
    try {
      const res = await createAndConnectNewSpreadsheet();
      setDirectMessage({ 
        type: 'success', 
        text: `สร้าง Google Sheet ใหม่และเชื่อมต่อเรียบร้อยแล้วค่ะ! พร้อมนำเข้าข้อมูลประวัติเข้าชีตอัตโนมัติ` 
      });
    } catch (err: any) {
      setDirectMessage({ type: 'error', text: err.message || 'ไม่สามารถสร้าง Google Sheet ใหม่ได้' });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Handle Apps Script Connect
  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError(false);
    setConnectSuccess(false);
    
    if (!urlInput.trim()) return;
    
    const success = await updateAppsScript(urlInput.trim());
    if (success) {
      setConnectSuccess(true);
    } else {
      setConnectError(true);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCachedCopied(true);
    setTimeout(() => setCachedCopied(false), 2500);
  };

  // The Apps Script Code to be shown
  const appsScriptCode = `/**
 * Google Apps Script for FG & RM Quality & Weight Inspection System (v2.2 - Bulletproof Version)
 * 
 * วิธีการตั้งค่า Deployment ในหน้า Apps Script เพื่อให้เพื่อนๆ คีย์ข้อมูลได้โดยไม่ต้องล็อกอิน:
 * 1. คลิกปุ่ม "การทำให้ใช้งานได้ใหม่" (New Deployment) ทางด้านบนขวา
 * 2. เลือกประเภทเป็น "เว็บแอป" (Web App)
 * 3. ตั้งค่าการเข้าถึงดังนี้:
 *    - Execute as (เรียกใช้ในฐานะ): Me (อีเมลของคุณเอง - เจ้าของชีต)
 *    - Who has access (ผู้มีสิทธิ์เข้าถึง): Anyone (ทุกคน) <-- สำคัญมาก ห้ามเลือกตัวเลือกอื่น!
 * 4. กด Deploy และคัดลอกลิงก์เว็บแอปที่ลงท้ายด้วย "/exec" มาใส่ในหน้าต่างตั้งค่าของเว็บแอปค่ะ
 */

// หากใช้ Apps Script แบบสร้างจากภายนอกสเปรดชีต (Standalone) ให้ระบุรหัสสเปรดชีต (Spreadsheet ID) ในเครื่องหมายคำพูดด้านล่างนี้ได้เลยค่ะ 
// (หากสร้างจากเมนู "ส่วนขยาย > Apps Script" ภายใน Google Sheets อยู่แล้ว สามารถเว้นเป็น "" ได้เลยค่ะ)
var SPREADSHEET_ID = "";

function getSpreadsheet() {
  if (typeof SPREADSHEET_ID === "string" && SPREADSHEET_ID.trim() !== "") {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (e) {
      throw new Error("ไม่สามารถเปิดสเปรดชีตจาก SPREADSHEET_ID ที่ระบุได้ กรุณาตรวจสอบ ID ให้ถูกต้อง หรือตั้งค่าสิทธิ์แชร์ไฟล์เป็น 'ทุกคนที่มีลิงก์' (Anyone with link) ค่ะ: " + e.message);
    }
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}
  
  throw new Error("ไม่พบสเปรดชีตที่ทำงานร่วมกัน กรุณาระบุ Spreadsheet ID ในส่วนหัวของโค้ดสคริปต์นี้เพื่อแก้ปัญหาค่ะ");
}

function doGet(e) {
  try {
    var ss = getSpreadsheet();
    initSheets(ss);
    
    var masterData = updateAndExtractMasterData(ss);
    
    var responseData = {
      success: true,
      packaging: getSheetRecords(ss.getSheetByName("Packaging_Inspection")),
      fgWeight: getSheetRecords(ss.getSheetByName("FG_Weight_Check")),
      rmReceiving: getSheetRecords(ss.getSheetByName("Raw_Material_Receiving")),
      rmWeight: getSheetRecords(ss.getSheetByName("RM_Weight_Check")),
      expDate: getSheetRecords(ss.getSheetByName("Exp_Date")),
      masterData: masterData
    };
    
    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = getSpreadsheet();
    initSheets(ss);
    
    var responseData = { success: false, message: "" };
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action; // 'create' | 'update' | 'delete' | 'batchCreate'
    var sheetName = postData.sheetName;
    var payload = postData.data;
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("ไม่พบแท็บชีตชื่อ: " + sheetName);
    }
    
    if (action === 'create') {
      var id = payload.id;
      var rowNum = id ? findRowIndexById(sheet, id) : -1;
      
      if (rowNum !== -1) {
        var headers = getHeaders(sheet);
        headers.forEach(function(header, colIdx) {
          if (header === "id") return;
          var value = formatCellValue(header, payload, sheetName);
          sheet.getRange(rowNum, colIdx + 1).setValue(value);
        });
        responseData.success = true;
        responseData.message = "แก้ไขข้อมูลซ้ำเรียบร้อยแล้ว (อัปเดตข้อมูลแถวเดิม)";
      } else {
        var headers = getHeaders(sheet);
        var newRowValues = headers.map(function(header) {
          return formatCellValue(header, payload, sheetName);
        });
        sheet.appendRow(newRowValues);
        responseData.success = true;
        responseData.message = "เพิ่มข้อมูลใหม่ลงในชีตสำเร็จเรียบร้อยแล้วค่ะ";
      }
      
    } else if (action === 'batchCreate') {
      var headers = getHeaders(sheet);
      var records = payload;
      if (Array.isArray(records)) {
        var existingIds = {};
        var dataRange = sheet.getDataRange().getValues();
        var idColIdx = headers.indexOf("id");
        if (idColIdx !== -1) {
          for (var i = 1; i < dataRange.length; i++) {
            var val = dataRange[i][idColIdx].toString().trim();
            if (val) {
              existingIds[val] = i + 1;
            }
          }
        }
        
        var rowsToAppend = [];
        records.forEach(function(rec) {
          var recId = rec.id ? rec.id.toString().trim() : "";
          if (recId && existingIds[recId]) {
            var existingRowNum = existingIds[recId];
            headers.forEach(function(header, colIdx) {
              if (header === "id") return;
              var value = formatCellValue(header, rec, sheetName);
              sheet.getRange(existingRowNum, colIdx + 1).setValue(value);
            });
          } else {
            var rowValues = headers.map(function(header) {
              return formatCellValue(header, rec, sheetName);
            });
            rowsToAppend.push(rowValues);
          }
        });
        
        if (rowsToAppend.length > 0) {
          var startRow = sheet.getLastRow() + 1;
          var numRows = rowsToAppend.length;
          var numCols = headers.length;
          sheet.getRange(startRow, 1, numRows, numCols).setValues(rowsToAppend);
        }
        
        responseData.success = true;
        responseData.message = "ซิงค์อัปเดตประวัติทั้งหมดเรียบร้อย จำนวน: " + records.length + " รายการ";
      } else {
        throw new Error("โครงสร้างข้อมูลในการซิงค์แบบกลุ่มไม่ถูกต้อง");
      }
      
    } else if (action === 'update') {
      var id = payload.id;
      if (!id) throw new Error("ไม่พบ ID สำหรับการอัปเดตข้อมูล");
      
      var rowNum = findRowIndexById(sheet, id);
      var headers = getHeaders(sheet);
      
      if (rowNum === -1) {
        var newRowValues = headers.map(function(header) {
          return formatCellValue(header, payload, sheetName);
        });
        sheet.appendRow(newRowValues);
        responseData.success = true;
        responseData.message = "ไม่พบรายการแก้ไข จึงถูกเพิ่มเข้าไปเป็นรายการใหม่เรียบร้อยค่ะ";
      } else {
        headers.forEach(function(header, colIdx) {
          if (header === "id") return;
          var value = formatCellValue(header, payload, sheetName);
          sheet.getRange(rowNum, colIdx + 1).setValue(value);
        });
        responseData.success = true;
        responseData.message = "แก้ไขข้อมูลแถวสำเร็จเรียบร้อยค่ะ";
      }
      
    } else if (action === 'delete') {
      var id = payload.id;
      if (!id) throw new Error("ไม่พบ ID สำหรับการลบข้อมูล");
      
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idColIdx = headers.indexOf("id");
      var deletedCount = 0;
      
      if (idColIdx !== -1) {
        var idStr = id.toString().trim();
        for (var i = data.length - 1; i >= 1; i--) {
          if (compareIds(data[i][idColIdx], idStr)) {
            sheet.deleteRow(i + 1);
            deletedCount++;
          }
        }
      }
      
      responseData.success = true;
      responseData.message = "ลบรายการออกจากสเปรดชีตสำเร็จค่ะ (จำนวน: " + deletedCount + " แถว)";
    }
    
    var masterData = updateAndExtractMasterData(ss);
    responseData.masterData = masterData;
    
    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function initSheets(ss) {
  var requiredSheets = {
    "Packaging_Inspection": ["id", "date", "docNo", "fgCode", "batch", "quantityKg", "customer", "status", "inspector"],
    "FG_Weight_Check": ["id", "date", "fgCode", "batch", "quantityKg", "standardWeightKg", "samples", "averageWeight", "status", "note", "inspector"],
    "Raw_Material_Receiving": ["id", "date", "docNo", "rmCode", "batch", "deliveryNo", "poNo", "quantityKg", "supplier", "status", "inspector"],
    "RM_Weight_Check": ["id", "date", "rmCode", "batch", "quantityKg", "standardWeightKg", "samples", "averageWeight", "status", "note", "inspector"],
    "Exp_Date": ["id", "date", "rmCode", "batch", "mfgDate", "expDate", "status", "note", "inspector"],
    "Master_Data": ["customers", "fgCodes", "rmCodes", "suppliers"]
  };
  
  for (var sheetName in requiredSheets) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(requiredSheets[sheetName]);
    }
  }
}

function formatCellValue(header, record, sheetName) {
  var value = record[header];
  if (sheetName === "FG_Weight_Check" || sheetName === "RM_Weight_Check") {
    if (header === "samples") {
      var samplesArr = record.samples || [];
      var container = record.containerType || (sheetName === "FG_Weight_Check" ? "กล่อง" : "ถุง");
      return samplesArr.length + " , " + container;
    }
    if (header === "averageWeight") {
      var samplesArr = record.samples || [];
      if (samplesArr.length > 0) {
        return samplesArr.join("/");
      }
      return "";
    }
  }
  
  if (header === "samples") {
    return JSON.stringify(value || []);
  }
  return value !== undefined ? value : "";
}

function getSheetRecords(sheet) {
  var sheetName = sheet.getName();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var headers = data[0];
  var records = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var record = {};
    var hasData = false;
    
    headers.forEach(function(header, idx) {
      var val = row[idx];
      if (val !== "") hasData = true;
      record[header] = val;
    });
    
    if (hasData) {
      if (sheetName === "FG_Weight_Check" || sheetName === "RM_Weight_Check") {
        var samplesRaw = record["samples"] ? record["samples"].toString().trim() : "";
        var avgWeightRaw = record["averageWeight"] ? record["averageWeight"].toString().trim() : "";
        
        var containerType = sheetName === "FG_Weight_Check" ? "กล่อง" : "ถุง";
        if (samplesRaw.indexOf(",") !== -1) {
          var parts = samplesRaw.split(",");
          containerType = parts[1] ? parts[1].trim() : containerType;
        }
        record["containerType"] = containerType;
        
        var samplesArr = [];
        if (avgWeightRaw.indexOf("/") !== -1) {
          samplesArr = avgWeightRaw.split("/").map(function(item) {
            return parseFloat(item.trim()) || 0;
          }).filter(function(v) { return !isNaN(v); });
        } else if (avgWeightRaw !== "") {
          var singleVal = parseFloat(avgWeightRaw);
          if (!isNaN(singleVal)) {
            samplesArr = [singleVal];
          }
        }
        record["samples"] = samplesArr;
        
        if (samplesArr.length > 0) {
          var sum = samplesArr.reduce(function(a, b) { return a + b; }, 0);
          record["averageWeight"] = parseFloat((sum / samplesArr.length).toFixed(2));
        } else {
          record["averageWeight"] = 0;
        }
      } else {
        if (record["samples"] !== undefined) {
          try {
            record["samples"] = JSON.parse(record["samples"] || "[]");
          } catch (e) {
            record["samples"] = [];
          }
        }
      }
      
      records.push(record);
    }
  }
  return records;
}

function compareIds(id1, id2) {
  if (id1 === undefined || id1 === null || id2 === undefined || id2 === null) return false;
  var s1 = id1.toString().trim();
  var s2 = id2.toString().trim();
  if (s1 === s2) return true;
  if (s1.indexOf('.') !== -1 && s1.endsWith('.0')) s1 = s1.substring(0, s1.length - 2);
  if (s2.indexOf('.') !== -1 && s2.endsWith('.0')) s2 = s2.substring(0, s2.length - 2);
  if (s1 === s2) return true;
  if (!isNaN(s1) && !isNaN(s2)) return Number(s1) === Number(s2);
  return false;
}

function findRowIndexById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idColIdx = headers.indexOf("id");
  if (idColIdx === -1) return -1;
  for (var i = 1; i < data.length; i++) {
    if (compareIds(data[i][idColIdx], id)) return i + 1;
  }
  return -1;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function updateAndExtractMasterData(ss) {
  var pkgSheet = ss.getSheetByName("Packaging_Inspection");
  var fgWSheet = ss.getSheetByName("FG_Weight_Check");
  var rmSheet = ss.getSheetByName("Raw_Material_Receiving");
  var rmWSheet = ss.getSheetByName("RM_Weight_Check");
  var expSheet = ss.getSheetByName("Exp_Date");
  
  var customers = [];
  var fgCodes = [];
  var rmCodes = [];
  var suppliers = [];
  
  if (pkgSheet) {
    var pkgData = getSheetRecords(pkgSheet);
    pkgData.forEach(function(r) {
      if (r.customer && customers.indexOf(r.customer.trim()) === -1) customers.push(r.customer.trim());
      if (r.fgCode && fgCodes.indexOf(r.fgCode.trim()) === -1) fgCodes.push(r.fgCode.trim());
    });
  }
  if (fgWSheet) {
    var fgWData = getSheetRecords(fgWSheet);
    fgWData.forEach(function(r) {
      if (r.fgCode && fgCodes.indexOf(r.fgCode.trim()) === -1) fgCodes.push(r.fgCode.trim());
    });
  }
  if (rmSheet) {
    var rmData = getSheetRecords(rmSheet);
    rmData.forEach(function(r) {
      if (r.rmCode && rmCodes.indexOf(r.rmCode.trim()) === -1) rmCodes.push(r.rmCode.trim());
      if (r.supplier && suppliers.indexOf(r.supplier.trim()) === -1) suppliers.push(r.supplier.trim());
    });
  }
  if (rmWSheet) {
    var rmWData = getSheetRecords(rmWSheet);
    rmWData.forEach(function(r) {
      if (r.rmCode && rmCodes.indexOf(r.rmCode.trim()) === -1) rmCodes.push(r.rmCode.trim());
    });
  }
  if (expSheet) {
    var expData = getSheetRecords(expSheet);
    expData.forEach(function(r) {
      if (r.rmCode && rmCodes.indexOf(r.rmCode.trim()) === -1) rmCodes.push(r.rmCode.trim());
    });
  }
  
  customers = customers.filter(Boolean);
  fgCodes = fgCodes.filter(Boolean);
  rmCodes = rmCodes.filter(Boolean);
  suppliers = suppliers.filter(Boolean);
  
  var masterSheet = ss.getSheetByName("Master_Data");
  if (masterSheet) {
    masterSheet.clearContents();
    masterSheet.getRange(1, 1, 1, 4).setValues([["customers", "fgCodes", "rmCodes", "suppliers"]]);
    var maxLen = Math.max(customers.length, fgCodes.length, rmCodes.length, suppliers.length);
    if (maxLen > 0) {
      var rowsToWrite = [];
      for (var i = 0; i < maxLen; i++) {
        rowsToWrite.push([customers[i] || "", fgCodes[i] || "", rmCodes[i] || "", suppliers[i] || ""]);
      }
      masterSheet.getRange(2, 1, rowsToWrite.length, 4).setValues(rowsToWrite);
    }
  }
  return { customers: customers, fgCodes: fgCodes, rmCodes: rmCodes, suppliers: suppliers };
}
`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Streamlined Setup Header specifically optimized for anonymous coworkers access via Apps Script */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span>การเชื่อมต่อ Google Sheets (ผ่าน Apps Script)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              ตั้งค่าและเชื่อมต่อสเปรดชีตของคุณผ่าน Apps Script เพื่อให้เพื่อนร่วมงานกรอกข้อมูลได้ทันทีโดยไม่ต้องลงชื่อเข้าใช้ค่ะ
            </p>
          </div>
        </div>

        {/* TAB: APPS SCRIPT WEB APP CONNECTION SETUP */}
        {activeTab === 'appscript' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Instructions Pane */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-slate-700">
                  <h4 className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>คำแนะนำสำคัญสำหรับกรอกข้อมูลร่วมกัน (โดยไม่ต้องลงชื่อเข้าใช้)</span>
                  </h4>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    หากต้องการให้เพื่อนๆ หรือเพื่อนร่วมงานคนอื่นๆ สามารถเข้ามาร่วมกรอกข้อมูลลงสเปรดชีตเดียวกันได้<strong>โดยไม่ต้องลงชื่อเข้าใช้ Google</strong> กรุณาตั้งค่าสิทธิ์ตอนทำให้ใช้งานได้ใหม่ (New deployment) เป็น <strong>"Anyone" (ทุกคน)</strong> นะคะ
                  </p>
                </div>

                <div>
                  <span className="font-extrabold text-blue-600 mr-2">ขั้นตอนที่ 1:</span>
                  <strong>เปิด Apps Script ใน Google Sheets</strong>
                  <p className="mt-1 pl-6 text-slate-500">
                    เปิด Google Spreadsheet ของคุณ ไปที่เมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong>
                  </p>
                </div>

                <div>
                  <span className="font-extrabold text-blue-600 mr-2">ขั้นตอนที่ 2:</span>
                  <strong>วางโค้ด Apps Script ลงใน Code.gs</strong>
                  <p className="mt-1 pl-6 text-slate-500">
                    คัดลอกโค้ดสคริปต์ด้านล่างนี้ทั้งหมด วางทับไฟล์ <code>Code.gs</code> แล้วกดบันทึก
                  </p>
                </div>

                <div>
                  <span className="font-extrabold text-blue-600 mr-2">ขั้นตอนที่ 3:</span>
                  <strong>Deploy เว็บแอป (Deploy as Web App)</strong>
                  <ul className="list-disc pl-12 mt-1 space-y-1 text-slate-500">
                    <li>คลิกปุ่ม <strong>Deploy (การทำให้ใช้งานได้)</strong> &gt; <strong>New deployment (การทำให้ใช้งานได้ใหม่)</strong></li>
                    <li>เลือกประเภทเป็น <strong>Web app (เว็บแอป)</strong></li>
                    <li><strong>Execute as:</strong> Me (อีเมลของคุณ)</li>
                    <li><strong>Who has access:</strong> Anyone (ทุกคน)</li>
                    <li>คัดลอก URL เว็บแอป (ลงท้ายด้วย <code>/exec</code>) นำมาวางที่กล่องด้านขวา</li>
                  </ul>
                </div>
              </div>

              {/* Code display pane */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-800 text-white rounded-t-xl px-4 py-3">
                  <span className="text-xs font-mono font-bold text-slate-300">Code.gs (Google Apps Script Code)</span>
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกโค้ดสคริปต์</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-b-xl text-[10px] sm:text-xs font-mono overflow-x-auto max-h-80 leading-relaxed select-all">
                  {appsScriptCode}
                </pre>
              </div>
            </div>

            {/* Connection Form Pane */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 space-y-5 self-start">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-2">
                  <Link className="w-4 h-4 text-blue-600" />
                  <span>เชื่อมต่อ Apps Script URL</span>
                </h3>
              </div>

              {isConnected && connectionType === 'appscript' ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                    <h4 className="font-extrabold text-xs text-emerald-900 mt-2">เชื่อมต่อผ่าน Apps Script เรียบร้อย</h4>
                    <p className="text-[10px] text-emerald-700 mt-1 break-all font-mono">
                      {appsScriptUrl}
                    </p>
                  </div>

                  <button
                    onClick={disconnectSheets}
                    className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 border border-red-200 hover:bg-red-50 text-red-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Unlink className="w-4 h-4" />
                    <span>ตัดการเชื่อมต่อ</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnectSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      วางลิงก์เว็บแอป (ลงท้ายด้วย /exec)
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono bg-white"
                    />
                  </div>

                  {connectError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{connectionError || 'ไม่สามารถเชื่อมต่อกับ Apps Script นี้ได้ กรุณาตรวจสอบว่าเลือกระดับสิทธิ์เป็น Anyone แล้วหรือยัง'}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSyncing}
                    className="w-full inline-flex items-center justify-center space-x-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>{isSyncing ? 'กำลังทดสอบ...' : 'เชื่อมต่อ Apps Script'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { HelpCircle, Database, CheckCircle, Copy, Link, ShieldCheck, HelpCircle as HelpIcon, Lock, ClipboardCheck, Unlink, AlertCircle, UploadCloud } from 'lucide-react';

export function AppsScriptSetup() {
  const { appsScriptUrl, updateAppsScript, isConnected, disconnectSheets, isSyncing, uploadLocalDataToSheets } = useApp();
  const [urlInput, setUrlInput] = useState(appsScriptUrl || '');
  const [copied, setCachedCopied] = useState(false);
  const [connectError, setConnectError] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; success: boolean; count?: number; error?: string } | null>(null);

  // The Apps Script Code to be shown
  const appsScriptCode = `/**
 * Google Apps Script for FG & RM Quality & Weight Inspection System
 * Deploy this script as a "Web App" with the following settings:
 * - Execute as: Me (Your email)
 * - Who has access: Anyone (This allows your React App to fetch it securely)
 */

function doGet(e) {
  var action = e.param ? e.param.action : null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create sheets if they do not exist
  initSheets(ss);
  
  // Extract and update Master Data before returning
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
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  initSheets(ss);
  
  var responseData = { success: false, message: "" };
  
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action; // 'create' | 'update' | 'delete' | 'batchCreate'
    var sheetName = postData.sheetName; // 'Packaging_Inspection' | 'FG_Weight_Check' | etc.
    var payload = postData.data;
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    if (action === 'create') {
      var id = payload.id;
      var rowNum = id ? findRowIndexById(sheet, id) : -1;
      
      if (rowNum !== -1) {
        // If ID already exists, update it instead of creating a duplicate!
        var headers = getHeaders(sheet);
        headers.forEach(function(header, colIdx) {
          if (header === "id") return;
          var value = formatCellValue(header, payload, sheetName);
          sheet.getRange(rowNum, colIdx + 1).setValue(value);
        });
        responseData.success = true;
        responseData.message = "Record already exists. Updated existing record instead of duplicating.";
      } else {
        // Append row
        var headers = getHeaders(sheet);
        var newRowValues = headers.map(function(header) {
          return formatCellValue(header, payload, sheetName);
        });
        sheet.appendRow(newRowValues);
        responseData.success = true;
        responseData.message = "Record created successfully";
      }
      
    } else if (action === 'batchCreate') {
      var headers = getHeaders(sheet);
      var records = payload; // payload is the array of records
      if (Array.isArray(records)) {
        var existingIds = {};
        var dataRange = sheet.getDataRange().getValues();
        var idColIdx = findIdColumnIndex(headers);
        if (idColIdx !== -1) {
          for (var i = 1; i < dataRange.length; i++) {
            var val = dataRange[i][idColIdx].toString().trim();
            if (val) {
              existingIds[val] = i + 1; // 1-indexed row number
            }
          }
        }
        
        var rowsToAppend = [];
        records.forEach(function(rec) {
          var recId = rec.id ? rec.id.toString().trim() : "";
          if (recId && existingIds[recId]) {
            // Update existing row to prevent duplicate
            var existingRowNum = existingIds[recId];
            headers.forEach(function(header, colIdx) {
              if (header === "id") return;
              var value = formatCellValue(header, rec, sheetName);
              sheet.getRange(existingRowNum, colIdx + 1).setValue(value);
            });
          } else {
            // Queue row for appending
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
        responseData.message = "Batch import complete: " + records.length + " records processed.";
      } else {
        throw new Error("Payload for batchCreate must be an array");
      }
      
    } else if (action === 'update') {
      var id = payload.id;
      if (!id) throw new Error("Missing ID for update");
      
      var rowNum = findRowIndexById(sheet, id);
      var headers = getHeaders(sheet);
      
      if (rowNum === -1) {
        // Self-heal: If not found for update, append as a new record
        var newRowValues = headers.map(function(header) {
          return formatCellValue(header, payload, sheetName);
        });
        sheet.appendRow(newRowValues);
        responseData.success = true;
        responseData.message = "Record not found for update. Appended as new record.";
      } else {
        headers.forEach(function(header, colIdx) {
          if (header === "id") return; // Keep ID same
          var value = formatCellValue(header, payload, sheetName);
          sheet.getRange(rowNum, colIdx + 1).setValue(value);
        });
        responseData.success = true;
        responseData.message = "Record updated successfully";
      }
      
    } else if (action === 'delete') {
      var id = payload.id;
      if (!id) throw new Error("Missing ID for deletion");
      
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var idColIdx = findIdColumnIndex(headers);
      var deletedCount = 0;
      
      if (idColIdx !== -1) {
        var idStr = id.toString().trim();
        // Traverse bottom-to-top to safely delete duplicates of the same ID
        for (var i = data.length - 1; i >= 1; i--) {
          if (compareIds(data[i][idColIdx], idStr)) {
            sheet.deleteRow(i + 1);
            deletedCount++;
          }
        }
      }
      
      responseData.success = true;
      responseData.message = deletedCount > 0 
        ? "Deleted " + deletedCount + " matching record(s)" 
        : "Record already deleted or not found in sheet";
    }
    
    // Auto update and extract Master Data on any change
    var masterData = updateAndExtractMasterData(ss);
    responseData.masterData = masterData;
    
  } catch (error) {
    responseData.success = false;
    responseData.message = error.toString();
  }
  
  // Return response with CORS handling
  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ensures all required sheets and headers are initialized
 */
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

/**
 * Normalizes Thai/English header names to standard camelCase/English keys used in React
 */
function findIdColumnIndex(headers) {
  for (var i = 0; i < headers.length; i++) {
    if (getNormalizedKey(headers[i]) === "id") {
      return i;
    }
  }
  return headers.indexOf("id");
}

function getNormalizedKey(header) {
  if (!header) return "";
  var h = header.toString().trim().toLowerCase();
  
  if (h === "id" || h === "ไอดี" || h === "ลำดับ" || h === "รหัสอ้างอิง") return "id";
  if (h === "date" || h === "วันที่" || h === "วันที่ชั่ง" || h === "วันที") return "date";
  if (h === "fgcode" || h === "รหัสสินค้า" || h === "รหัสกาว" || h === "รหัส") return "fgCode";
  if (h === "rmcode" || h === "รหัสวัตถุดิบ") return "rmCode";
  if (h === "batch" || h === "แบทช์" || h === "แบท") return "batch";
  if (h === "quantitykg" || h === "จำนวน kg." || h === "จำนวน kg" || h === "จำนวน" || h === "จำนวน kg.") return "quantityKg";
  if (h === "standardweightkg" || h === "น้ำหนัก standard kg." || h === "น้ำหนัก standard" || h === "มาตรฐาน" || h === "น้ำหนักเป้าหมาย") return "standardWeightKg";
  if (h === "samples" || h === "สุ่มตรวจ เช่น ถุง, ถัง, กล่อง, กรง" || h === "สุ่มชั่ง" || h === "ภาชนะ" || h === "จำนวนสุ่ม" || h === "สุ่มตรวจ") return "samples";
  if (h === "averageweight" || h === "น้ำหนักที่ชั่งได้ (kg.)" || h === "สุ่มชั่งเฉลี่ย" || h === "เฉลี่ย" || h === "น้ำหนักที่ชั่งได้") return "averageWeight";
  if (h === "status" || h === "สถานะ" || h === "ผลการตรวจสอบ" || h === "ผ่าน") return "status";
  if (h === "note" || h === "หมายเหตุ") return "note";
  if (h === "inspector" || h === "ผู้ตรวจสอบ" || h === "ผู้ชั่ง") return "inspector";
  if (h === "docno" || h === "เลขที่เอกสาร") return "docNo";
  if (h === "deliveryno" || h === "เลขที่ใบส่งสินค้า") return "deliveryNo";
  if (h === "pono" || h === "เลขที่ใบสั่งซื้อ") return "poNo";
  if (h === "customer" || h === "ลูกค้า" || h === "ชื่อลูกค้า") return "customer";
  if (h === "supplier" || h === "ผู้จัดจำหน่าย" || h === "ผู้ขาย") return "supplier";
  if (h === "mfgdate" || h === "วันผลิต") return "mfgDate";
  if (h === "expdate" || h === "วันหมดอายุ") return "expDate";
  
  return header;
}

/**
 * Format records for Google Sheets based on headers and user friendly preferences
 */
function formatCellValue(header, record, sheetName) {
  var normKey = getNormalizedKey(header);
  var value = record[normKey];
  
  if (sheetName === "FG_Weight_Check" || sheetName === "RM_Weight_Check") {
    if (normKey === "samples") {
      var samplesArr = record.samples || [];
      var container = record.containerType || (sheetName === "FG_Weight_Check" ? "กล่อง" : "ถุง");
      return samplesArr.length + " , " + container;
    }
    if (normKey === "averageWeight") {
      var samplesArr = record.samples || [];
      if (samplesArr.length > 0) {
        return samplesArr.join("/");
      }
      return "";
    }
  }
  
  if (normKey === "samples") {
    return JSON.stringify(value || []);
  }
  return value !== undefined ? value : "";
}

/**
 * Helper to parse all rows in a sheet into an array of objects
 */
function getSheetRecords(sheet) {
  var sheetName = sheet.getName();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Only headers or empty
  
  var headers = data[0];
  var records = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var record = {};
    var hasData = false;
    
    headers.forEach(function(header, idx) {
      var val = row[idx];
      if (val !== "") hasData = true;
      var normKey = getNormalizedKey(header);
      record[normKey] = val;
    });
    
    if (hasData) {
      if (sheetName === "FG_Weight_Check" || sheetName === "RM_Weight_Check") {
        var samplesRaw = record["samples"] ? record["samples"].toString().trim() : "";
        var avgWeightRaw = record["averageWeight"] ? record["averageWeight"].toString().trim() : "";
        
        var containerType = sheetName === "FG_Weight_Check" ? "กล่อง" : "ถุง";
        var samplesArr = [];
        
        // Self-heal: If samplesRaw contains JSON array (old format written by old script), parse it
        if (samplesRaw.indexOf("[") === 0 && samplesRaw.indexOf("]") !== -1) {
          try {
            samplesArr = JSON.parse(samplesRaw);
          } catch (e) {
            samplesArr = [];
          }
        } else {
          // New format: e.g. "4 , กล่อง"
          if (samplesRaw.indexOf(",") !== -1) {
            var parts = samplesRaw.split(",");
            containerType = parts[1] ? parts[1].trim() : containerType;
          }
          
          // Parse samples array from averageWeight cell (e.g. "20.50/20.55/20.60")
          if (avgWeightRaw.indexOf("/") !== -1) {
            samplesArr = avgWeightRaw.split("/").map(function(item) {
              return parseFloat(item.trim()) || 0;
            }).filter(function(v) { return !isNaN(v) && v > 0; });
          } else if (avgWeightRaw !== "") {
            var singleVal = parseFloat(avgWeightRaw);
            if (!isNaN(singleVal)) {
              samplesArr = [singleVal];
            }
          }
        }
        
        record["containerType"] = containerType;
        record["samples"] = samplesArr;
        
        // Compute the actual numeric averageWeight for the React app
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

/**
 * Robust ID helper to prevent numeric/decimal mismatch
 */
function compareIds(id1, id2) {
  if (id1 === undefined || id1 === null || id2 === undefined || id2 === null) return false;
  
  var s1 = id1.toString().trim();
  var s2 = id2.toString().trim();
  
  if (s1 === s2) return true;
  
  // If one of them has .0 at the end (e.g., from Google Sheets number format), remove it
  if (s1.indexOf('.') !== -1 && s1.endsWith('.0')) {
    s1 = s1.substring(0, s1.length - 2);
  }
  if (s2.indexOf('.') !== -1 && s2.endsWith('.0')) {
    s2 = s2.substring(0, s2.length - 2);
  }
  
  if (s1 === s2) return true;
  
  // Try numeric comparison if both look like numbers
  if (!isNaN(s1) && !isNaN(s2)) {
    return Number(s1) === Number(s2);
  }
  
  return false;
}

/**
 * Finds row index in a sheet based on the 'id' column value
 */
function findRowIndexById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idColIdx = findIdColumnIndex(headers);
  if (idColIdx === -1) return -1;
  
  for (var i = 1; i < data.length; i++) {
    if (compareIds(data[i][idColIdx], id)) {
      return i + 1; // 1-indexed row number
    }
  }
  return -1;
}

/**
 * Get headers of a sheet
 */
function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/**
 * Automatically extracts unique Customer, FG Code, RM Code, and Supplier
 * from transactions, saves them to the Master_Data sheet, and returns them
 */
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
  
  // Extract Customers & FG Codes from Packaging
  if (pkgSheet) {
    var pkgData = getSheetRecords(pkgSheet);
    pkgData.forEach(function(r) {
      if (r.customer && customers.indexOf(r.customer.trim()) === -1) {
        customers.push(r.customer.trim());
      }
      if (r.fgCode && fgCodes.indexOf(r.fgCode.trim()) === -1) {
        fgCodes.push(r.fgCode.trim());
      }
    });
  }
  
  // Extract FG Codes from FG Weight
  if (fgWSheet) {
    var fgWData = getSheetRecords(fgWSheet);
    fgWData.forEach(function(r) {
      if (r.fgCode && fgCodes.indexOf(r.fgCode.trim()) === -1) {
        fgCodes.push(r.fgCode.trim());
      }
    });
  }
  
  // Extract RM Codes & Suppliers from RM Receiving
  if (rmSheet) {
    var rmData = getSheetRecords(rmSheet);
    rmData.forEach(function(r) {
      if (r.rmCode && rmCodes.indexOf(r.rmCode.trim()) === -1) {
        rmCodes.push(r.rmCode.trim());
      }
      if (r.supplier && suppliers.indexOf(r.supplier.trim()) === -1) {
        suppliers.push(r.supplier.trim());
      }
    });
  }
  
  // Extract RM Codes from RM Weight
  if (rmWSheet) {
    var rmWData = getSheetRecords(rmWSheet);
    rmWData.forEach(function(r) {
      if (r.rmCode && rmCodes.indexOf(r.rmCode.trim()) === -1) {
        rmCodes.push(r.rmCode.trim());
      }
    });
  }
  
  // Extract RM Codes from Exp Date
  if (expSheet) {
    var expData = getSheetRecords(expSheet);
    expData.forEach(function(r) {
      if (r.rmCode && rmCodes.indexOf(r.rmCode.trim()) === -1) {
        rmCodes.push(r.rmCode.trim());
      }
    });
  }
  
  // Filter out empty entries
  customers = customers.filter(Boolean);
  fgCodes = fgCodes.filter(Boolean);
  rmCodes = rmCodes.filter(Boolean);
  suppliers = suppliers.filter(Boolean);
  
  // Write to Master_Data Sheet
  var masterSheet = ss.getSheetByName("Master_Data");
  if (masterSheet) {
    masterSheet.clearContents();
    masterSheet.getRange(1, 1, 1, 4).setValues([["customers", "fgCodes", "rmCodes", "suppliers"]]);
    
    var maxLen = Math.max(customers.length, fgCodes.length, rmCodes.length, suppliers.length);
    if (maxLen > 0) {
      var rowsToWrite = [];
      for (var i = 0; i < maxLen; i++) {
        rowsToWrite.push([
          customers[i] || "",
          fgCodes[i] || "",
          rmCodes[i] || "",
          suppliers[i] || ""
        ]);
      }
      masterSheet.getRange(2, 1, rowsToWrite.length, 4).setValues(rowsToWrite);
    }
  }
  
  return {
    customers: customers,
    fgCodes: fgCodes,
    rmCodes: rmCodes,
    suppliers: suppliers
  };
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCachedCopied(true);
    setTimeout(() => setCachedCopied(false), 2000);
  };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Instructions Pane */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-extrabold text-lg text-slate-800 flex items-center space-x-2">
            <HelpIcon className="w-5 h-5 text-blue-600" />
            <span>ขั้นตอนการเชื่อมต่อ Google Sheets เป็นฐานข้อมูลแบบ Real-time</span>
          </h2>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
          <div>
            <span className="font-extrabold text-blue-600 mr-2">ขั้นตอนที่ 1:</span>
            <strong>สร้างและเตรียม Google Spreadsheet</strong>
            <p className="mt-1 pl-6 text-slate-500">
              สร้าง Google Spreadsheet ขึ้นมาใหม่ 1 แผ่น (ไม่จำเป็นต้องสร้างแท็บชีตย่อยเอง สคริปต์จะสร้างให้ทั้งหมดโดยอัตโนมัติในการรันครั้งแรก)
            </p>
          </div>

          <div>
            <span className="font-extrabold text-blue-600 mr-2">ขั้นตอนที่ 2:</span>
            <strong>เปิด Apps Script Editor</strong>
            <p className="mt-1 pl-6 text-slate-500">
              ไปที่เมนู <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong> บนเมนูบาร์ของ Google Sheets ของคุณ
            </p>
          </div>

          <div>
            <span className="font-extrabold text-blue-600 mr-2">ขั้นตอนที่ 3:</span>
            <strong>วางโค้ด Apps Script ลงใน Code.gs</strong>
            <p className="mt-1 pl-6 text-slate-500">
              คัดลอกโค้ดสคริปต์ด้านล่างนี้ทั้งหมด วางทับไฟล์ <code>Code.gs</code> ในหน้าต่าง Apps Script แล้วกดปุ่มบันทึก (ไอคอนแผ่นดิสก์)
            </p>
          </div>

          <div>
            <span className="font-extrabold text-blue-600 mr-2">ขั้นตอนที่ 4:</span>
            <strong>การใช้งานและการ Deploy เว็บแอป (Deploy Web App)</strong>
            <ul className="list-disc pl-12 mt-1 space-y-1 text-slate-500">
              <li>คลิกปุ่ม <strong>การทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้ใหม่ (New deployment)</strong></li>
              <li>เลือกประเภทการเชื่อมต่อเป็น <strong>เว็บแอป (Web App)</strong></li>
              <li>ตั้งค่าดังนี้:
                <ul className="list-decimal pl-6 mt-1 space-y-0.5">
                  <li><strong>เรียกใช้ในฐานะ (Execute as):</strong> ฉัน (อีเมลของคุณ)</li>
                  <li><strong>ผู้มีสิทธิ์เข้าถึง (Who has access):</strong> ทุกคน (Anyone) <em>*สำคัญมาก* เพื่ออนุญาตให้ระบบส่งข้อมูลแบบข้ามโดเมนได้</em></li>
                </ul>
              </li>
              <li>คลิกปุ่ม Deploy, อนุมัติสิทธิ์ (Authorize access) ให้เรียบร้อย</li>
              <li>คัดลอก <strong>URL เว็บแอป (Web App URL)</strong> ที่ได้รับ (ลิงก์จะลงท้ายด้วย <code>/exec</code>) มาใช้กรอกในเมนูทางด้านขวา</li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-slate-700 space-y-2 mt-4">
            <h4 className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>⚠️ สำคัญมาก: สำหรับผู้ที่เคยเชื่อมต่อแล้ว และอัปเดตแก้โค้ดใหม่!</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              เมื่อคุณทำการคัดลอกโค้ดสคริปต์เวอร์ชันใหม่ไปวางทับในหน้า Apps Script <strong>สเปรดชีตจะยังไม่ทำงานด้วยโค้ดเวอร์ชันใหม่</strong> จนกว่าคุณจะกดทำการ Deploy เป็นเวอร์ชันใหม่! หากไม่อัปเดตเวอร์ชัน Google จะยังประมวลผลด้วยโค้ดเก่า ทำให้แสดงผลผิดพลาดเป็นค่า <code>[array]</code> แทน
            </p>
            <div className="text-xs font-bold text-slate-700 pl-4 border-l-2 border-amber-300">
              วิธีการอัปเดตเพื่อเปิดใช้งานสคริปต์ตัวใหม่:
              <ol className="list-decimal pl-5 font-normal text-slate-600 mt-1 space-y-0.5">
                <li>ในหน้าต่าง Apps Script คลิกปุ่ม <strong>การทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>จัดการการทำให้ใช้งานได้ (Manage deployments)</strong></li>
                <li>คลิกไอคอน <strong>แก้ไข (รูปดินสอ)</strong> ตรงรายการ Web App หลักของคุณ</li>
                <li>ในหัวข้อ <strong>เวอร์ชัน (Version)</strong> ให้คลิกแล้วเลือก <strong>เวอร์ชันใหม่ (New version)</strong></li>
                <li>กดปุ่ม <strong>การทำให้ใช้งานได้ (Deploy)</strong> เพื่อบันทึกข้อมูล</li>
                <li>คัดลอกลิงก์ใหม่ที่ปรากฏนำมาวางและกดเชื่อมต่อในระบบทางด้านขวาอีกครั้งค่ะ!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Code display pane */}
        <div className="space-y-2">
          <div className="flex justify-between items-center bg-slate-800 text-white rounded-t-xl px-4 py-3">
            <span className="text-xs font-mono font-bold text-slate-300">Code.gs (Google Apps Script Code)</span>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition focus:outline-none"
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
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-b-xl text-[10px] sm:text-xs font-mono overflow-x-auto max-h-96 leading-relaxed select-all">
            {appsScriptCode}
          </pre>
        </div>
      </div>

      {/* Connection Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 self-start h-auto">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-extrabold text-base text-slate-800 flex items-center space-x-2">
            <Link className="w-4 h-4 text-blue-600" />
            <span>เชื่อมต่อ API เว็บแอป</span>
          </h2>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-extrabold text-sm text-emerald-900 mt-2">เชื่อมต่อสเปรดชีตเรียบร้อยแล้ว!</h4>
              <p className="text-[10px] text-emerald-700 mt-1 break-all font-mono leading-relaxed">
                {appsScriptUrl}
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              สเปรดชีตของคุณพร้อมทำงานแบบ Real-time ทุกครั้งที่คุณคีย์ข้อมูล ตรวจสอบสุ่มชั่งน้ำหนัก หรือระบุอายุสารเคมี สเปรดชีตจะอัปเดตแบบทันที!
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-blue-600" />
                <span>ซิงค์ประวัติข้อมูลเดิมขึ้น Google Sheets</span>
              </span>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                เนื่องจากการเชื่อมต่อกับชีตว่างใหม่ระบบจะโหลดหน้าเปล่า หากคุณต้องการส่งออกข้อมูลประวัติที่อยู่บนอุปกรณ์ขณะนี้ (รวมถึงประวัติ 66 รายการที่คุณนำเข้า) ขึ้นไปยัง Google Sheets ของคุณ ให้กดปุ่มด้านล่างนี้ค่ะ
              </p>
              
              {syncStatus?.success && (
                <div className="p-2.5 bg-emerald-100 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-bold">
                  ✓ ซิงค์ข้อมูลทั้งหมด {syncStatus.count} รายการขึ้นสเปรดชีตเรียบร้อยแล้ว!
                </div>
              )}

              {syncStatus?.error && (
                <div className="p-2.5 bg-red-100 border border-red-200 rounded-lg text-xs text-red-800 font-bold">
                  ⚠ {syncStatus.error}
                </div>
              )}

              <button
                type="button"
                disabled={syncStatus?.loading}
                onClick={async () => {
                  setSyncStatus({ loading: true, success: false });
                  const res = await uploadLocalDataToSheets();
                  if (res.success) {
                    setSyncStatus({ loading: false, success: true, count: res.count });
                  } else {
                    setSyncStatus({ loading: false, success: false, error: res.message });
                  }
                }}
                className="w-full inline-flex items-center justify-center space-x-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{syncStatus?.loading ? 'กำลังส่งข้อมูลขึ้น Google Sheets...' : 'อัปโหลดข้อมูลประวัติขึ้น Google Sheets'}</span>
              </button>
            </div>

            <button
              onClick={disconnectSheets}
              className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 border border-red-200 hover:bg-red-50 text-red-700 rounded-xl text-xs font-bold transition focus:outline-none"
            >
              <Unlink className="w-4 h-4" />
              <span>ตัดการเชื่อมต่อ (กลับไปใช้งานโหมดทดลอง)</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleConnectSubmit} className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              กรอก URL เว็บแอปที่ได้จากการ Deploy ใน Google Apps Script เพื่อเปิดใช้งานฐานข้อมูลแบบเรียลไทม์ทันที
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วางลิงก์เว็บแอป (Google Apps Script Web App URL)
              </label>
              <textarea
                required
                rows={3}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
              />
            </div>

            {connectError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>
                  ไม่สามารถตรวจสอบลิงก์ดังกล่าวได้ กรุณาตรวจสอบว่าเลือก Deploy เป็น Web App, Execute as "Me", และ Everyone is enabled หรือไม่
                </span>
              </div>
            )}

            {connectSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-emerald-800">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>เชื่อมต่อสำเร็จ! ดึงข้อมูลสเปรดชีตเรียบร้อย</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSyncing}
              className="w-full inline-flex items-center justify-center space-x-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition focus:outline-none"
            >
              <Link className="w-4 h-4" />
              <span>{isSyncing ? 'กำลังตรวจสอบ...' : 'ทดสอบและเริ่มใช้งาน'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

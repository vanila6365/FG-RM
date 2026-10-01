/**
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
    var sheetName = postData.sheetName; // 'Packaging_Inspection' | 'FG_Weight_Check' | etc.
    var payload = postData.data;
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("ไม่พบแท็บชีตชื่อ: " + sheetName);
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
        responseData.message = "แก้ไขข้อมูลซ้ำเรียบร้อยแล้ว (อัปเดตข้อมูลแถวเดิม)";
      } else {
        // Append row
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
      var records = payload; // payload is the array of records
      if (Array.isArray(records)) {
        var existingIds = {};
        var dataRange = sheet.getDataRange().getValues();
        var idColIdx = headers.indexOf("id");
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
        // Self-heal: If not found for update, append as a new record
        var newRowValues = headers.map(function(header) {
          return formatCellValue(header, payload, sheetName);
        });
        sheet.appendRow(newRowValues);
        responseData.success = true;
        responseData.message = "ไม่พบรายการแก้ไข จึงถูกเพิ่มเข้าไปเป็นรายการใหม่เรียบร้อยค่ะ";
      } else {
        headers.forEach(function(header, colIdx) {
          if (header === "id") return; // Keep ID same
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
        // Traverse bottom-to-top to safely delete duplicates of the same ID
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
    
    // Auto update and extract Master Data on any change
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
 * Format records for Google Sheets based on headers and user friendly preferences
 */
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
      record[header] = val;
    });
    
    if (hasData) {
      if (sheetName === "FG_Weight_Check" || sheetName === "RM_Weight_Check") {
        var samplesRaw = record["samples"] ? record["samples"].toString().trim() : "";
        var avgWeightRaw = record["averageWeight"] ? record["averageWeight"].toString().trim() : "";
        
        // 1. Parse containerType and sample count from samples cell (e.g. "4 , กล่อง")
        var containerType = sheetName === "FG_Weight_Check" ? "กล่อง" : "ถุง";
        if (samplesRaw.indexOf(",") !== -1) {
          var parts = samplesRaw.split(",");
          containerType = parts[1] ? parts[1].trim() : containerType;
        }
        record["containerType"] = containerType;
        
        // 2. Parse samples array from averageWeight cell (e.g. "20.50/20.55/20.60")
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
        
        // 3. Compute the actual numeric averageWeight for the React app
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
  var idColIdx = headers.indexOf("id");
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

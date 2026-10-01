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
  const [activeTab, setActiveTab] = useState<'direct' | 'appscript'>(
    connectionType === 'appscript' ? 'appscript' : 'direct'
  );

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
 * Google Apps Script for FG & RM Quality & Weight Inspection System
 * Deploy this script as a "Web App" with the following settings:
 * - Execute as: Me (Your email)
 * - Who has access: Anyone (This allows your React App to fetch it securely)
 */

function doGet(e) {
  var action = e.param ? e.param.action : null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  initSheets(ss);
  var responseData = { success: false, message: "" };
  
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var sheetName = postData.sheetName;
    var payload = postData.data;
    
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet not found: " + sheetName);
    
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
        responseData.message = "Updated existing record";
      } else {
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
      var records = payload;
      if (Array.isArray(records)) {
        var rowsToAppend = records.map(function(rec) {
          return headers.map(function(h) { return formatCellValue(h, rec, sheetName); });
        });
        if (rowsToAppend.length > 0) {
          var startRow = sheet.getLastRow() + 1;
          sheet.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
        }
        responseData.success = true;
        responseData.message = "Batch created successfully";
      }
    } else if (action === 'update') {
      var id = payload.id;
      var rowNum = findRowIndexById(sheet, id);
      var headers = getHeaders(sheet);
      if (rowNum !== -1) {
        headers.forEach(function(header, colIdx) {
          if (header === "id") return;
          sheet.getRange(rowNum, colIdx + 1).setValue(formatCellValue(header, payload, sheetName));
        });
        responseData.success = true;
        responseData.message = "Updated successfully";
      }
    } else if (action === 'delete') {
      var id = payload.id;
      var rowNum = findRowIndexById(sheet, id);
      if (rowNum !== -1) {
        sheet.deleteRow(rowNum);
        responseData.success = true;
        responseData.message = "Deleted successfully";
      }
    }
  } catch (error) {
    responseData.success = false;
    responseData.message = error.toString();
  }
  return ContentService.createTextOutput(JSON.stringify(responseData)).setMimeType(ContentService.MimeType.JSON);
}

function initSheets(ss) {
  var requiredSheets = {
    "Packaging_Inspection": ["id", "date", "docNo", "fgCode", "batch", "quantityKg", "customer", "status", "inspector"],
    "FG_Weight_Check": ["id", "date", "fgCode", "batch", "quantityKg", "standardWeightKg", "samples", "averageWeight", "status", "note", "inspector"],
    "Raw_Material_Receiving": ["id", "date", "docNo", "rmCode", "batch", "deliveryNo", "poNo", "quantityKg", "supplier", "status", "inspector"],
    "RM_Weight_Check": ["id", "date", "rmCode", "batch", "quantityKg", "standardWeightKg", "samples", "averageWeight", "status", "note", "inspector"],
    "Exp_Date": ["id", "date", "rmCode", "batch", "mfgDate", "expDate", "status", "note", "inspector"]
  };
  for (var name in requiredSheets) {
    if (!ss.getSheetByName(name)) {
      var sheet = ss.insertSheet(name);
      sheet.appendRow(requiredSheets[name]);
    }
  }
}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Tab Switcher Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span>การเชื่อมต่อ Google Sheets</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              เลือกวิธีการเชื่อมต่อฐานข้อมูล Google Sheets ตามที่คุณสะดวกที่สุด
            </p>
          </div>

          {/* Tab Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'direct'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>เชื่อมต่อตรง (ไม่ต้องใช้สคริปต์)</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-black">
                แนะนำ
              </span>
            </button>
            <button
              onClick={() => setActiveTab('appscript')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'appscript'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              <span>Apps Script Web App</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DIRECT GOOGLE SHEETS (NO APPS SCRIPT) */}
        {activeTab === 'direct' && (
          <div className="mt-6 space-y-6">
            {/* Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-blue-950 text-sm sm:text-base">
                    เชื่อมต่อผ่านบัญชี Google โดยตรง (ไม่ต้องใส่ลิงก์สคริปต์)
                  </h3>
                  <p className="text-xs text-blue-800/90 mt-1 leading-relaxed">
                    คุณสามารถเชื่อมต่อกับ Google Sheets ได้ทันทีโดยไม่ต้องเปิด Apps Script ไม่ต้องเขียนหรือคัดลอกโค้ด ไม่ต้องตั้งค่า Deploy และไม่มีปัญหาลิงก์เสียหรือสิทธิ์ขัดข้อง เพียงลงชื่อเข้าใช้ด้วย Google เท่านั้นค่ะ
                  </p>
                </div>
              </div>
            </div>

            {/* Notification messages */}
            {directMessage && (
              <div className={`p-4 rounded-xl border text-xs font-medium leading-relaxed flex items-start space-x-2.5 ${
                directMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}>
                {directMessage.type === 'success' ? (
                  <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-600 mt-0.5" />
                )}
                <span>{directMessage.text}</span>
              </div>
            )}

            {/* Step 1: Google Account Authentication */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                ขั้นตอนที่ 1 : เข้าสู่ระบบด้วย Google
              </span>

              {/* Informative Warning for Custom Domain / Vercel Deployments */}
              {isCustomDomain && !googleUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-slate-800">
                  <div className="flex items-start space-x-2.5">
                    <Database className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-blue-950 text-xs sm:text-sm">📢 คุณกำลังเปิดใช้งานแอปผ่านโดเมนส่วนตัว: {hostname}</h4>
                      <p className="text-xs text-blue-800 leading-relaxed mt-0.5">
                        ระบบกำลังทำงานผ่าน Vercel หรือโดเมนเฉพาะตัวของคุณค่ะ เพื่อให้ลงชื่อเข้าใช้ด้วย Google ได้สำเร็จ อย่าลืมนำโดเมนนี้ไปลงทะเบียนใน <strong>Authorized domains</strong> ของระบบ Firebase Console ของคุณด้วยนะคะ! (กรุณาดูคู่มือสีแดงด้านล่าง หากกดลงชื่อเข้าใช้แล้วพบข้อผิดพลาด)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isInIframe && !googleUser && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 text-slate-800">
                  <div className="flex items-start space-x-2.5">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm">⚠️ คำแนะนำสำหรับผู้ใช้งานบน AI Studio</h4>
                      <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                        ระบบตรวจพบว่าคุณกำลังเปิดแอปนี้อยู่ภายใน **Iframe หน้าทดสอบของ AI Studio** ซึ่งเบราว์เซอร์จะบล็อกป๊อปอัปความปลอดภัยและการเชื่อมต่อคุ้กกี้สำหรับการล็อกอินด้วย Google เสมอค่ะ
                      </p>
                      <p className="text-xs text-amber-800/90 leading-relaxed mt-1 font-bold">
                        กรุณากดปุ่มด้านล่างเพื่อเปิดใช้งานแอปในหน้าต่างใหม่ (เต็มหน้าจอ) จากนั้นคุณจะสามารถกดลงชื่อเข้าใช้ Google และใช้งานได้อย่างราบรื่น 100% เลยค่ะ!
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.open(window.location.origin, '_blank')}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>🌐 เปิดแอปในแท็บใหม่เพื่อล็อกอิน (แนะนำ)</span>
                  </button>
                </div>
              )}

              {!googleUser ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        ลงชื่อเข้าใช้ด้วยบัญชี Google ของคุณ
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        เพื่ออนุญาตให้แอปอ่านและบันทึกข้อมูลผลการชั่งน้ำหนักลงสเปรดชีตของคุณโดยตรง โดยได้รับความยินยอมและการอนุญาตจากผู้ใช้งาน
                      </p>
                    </div>

                    {/* Standard Sign in with Google Button */}
                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      className="inline-flex items-center space-x-3 px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                    >
                      <svg className="w-4.5 h-4.5" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      <span>Sign in with Google</span>
                    </button>
                  </div>

                  {/* Comprehensive Error Handling Box if Authentication fails */}
                  {connectionError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start space-x-2.5">
                        <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-extrabold text-red-950 text-xs sm:text-sm">❌ ไม่สามารถลงชื่อเข้าใช้งานได้</h4>
                          <p className="text-xs text-red-800 leading-relaxed mt-1 font-mono break-all bg-red-100/30 p-2 rounded-lg border border-red-200/40">
                            {connectionError}
                          </p>
                        </div>
                      </div>

                      {isUnauthorizedDomainError && (
                        <div className="bg-white border border-red-100 rounded-lg p-3.5 space-y-3.5 text-xs text-slate-700 shadow-xs">
                          <div className="font-bold text-red-900 border-b border-red-100 pb-1.5 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                            <span>💡 วิธีแก้ไขด่วนสำหรับโดเมน Vercel / โดเมนส่วนตัว (ทำเพียงครั้งเดียว):</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed font-medium">
                            เนื่องจากคุณเปิดเว็บแอปจากโดเมน <span className="underline decoration-blue-500 decoration-2 font-bold font-mono text-blue-600">{hostname || 'Vercel'}</span> ตัวเบราว์เซอร์จะปฏิเสธการเชื่อมต่อหากระบบ Firebase ยังไม่ได้รับการอนุญาตโดเมนนี้ค่ะ สามารถเพิ่มโดเมนได้ตามขั้นตอนนี้เลยค่ะ:
                          </p>
                          <ol className="list-decimal pl-5 space-y-2.5 text-slate-600 leading-relaxed">
                            <li>
                              เปิดไปที่ลิ้งค์ <strong><a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 underline font-black inline-flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded">Firebase Console <ExternalLink className="w-3.5 h-3.5 inline" /></a></strong> ด้วยเบราว์เซอร์ที่มีสิทธิ์โปรเจกต์ของคุณ
                            </li>
                            <li>
                              กดเลือกโปรเจกต์ของคุณ ที่มีชื่อว่า: <strong className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-900">gen-lang-client-0486838165</strong>
                            </li>
                            <li>
                              ที่แถบเมนูด้านซ้ายสุด ให้เลือกเมนูย่อย <strong>Build</strong> &gt; <strong>Authentication</strong> (การตรวจสอบสิทธิ์)
                            </li>
                            <li>
                              คลิกแท็บ <strong>Settings (การตั้งค่า)</strong> ที่อยู่บริเวณแถบด้านบนขวา
                            </li>
                            <li>
                              ที่แถบด้านซ้ายสุดภายใต้แท็บตั้งค่า คลิกเมนูย่อย <strong>Authorized domains (โดเมนที่ได้รับอนุญาต)</strong>
                            </li>
                            <li>
                              คลิกปุ่ม <strong>Add domain (เพิ่มโดเมน)</strong> จากนั้นกรอกชื่อโดเมนเว็บแอปของคุณด้านล่างนี้ลงไป:
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="bg-slate-100 border border-slate-200 text-slate-900 font-mono font-bold px-2.5 py-1 rounded-lg text-xs select-all shrink-0">
                                  {hostname || 'your-app-domain.vercel.app'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">(คัดลอกส่วนนี้ไปวางได้เลยค่ะ)</span>
                              </div>
                            </li>
                            <li>
                              กดปุ่ม <strong>Add (เพิ่ม)</strong> เพื่อบันทึกรายการ
                            </li>
                            <li>
                              กลับมายังหน้าเว็บนี้ แล้วกดปุ่ม <strong>Sign in with Google</strong> เพื่อล็อกอินใหม่อีกครั้งได้ทันทีเลยค่ะ! 🎉
                            </li>
                          </ol>
                        </div>
                      )}

                      {isPopupBlockedError && (
                        <div className="bg-white border border-red-100 rounded-lg p-3 text-xs text-slate-700">
                          <p className="font-bold text-red-900 mb-1">💡 วิธีแก้ปัญหาป๊อปอัปถูกบล็อก:</p>
                          <p className="leading-relaxed">
                            เนื่องจากบางเบราว์เซอร์บล็อกป๊อปอัปอัตโนมัติ กรุณาสังเกตไอคอนรูปกากบาทหรือหน้าต่างถูกบล็อกบริเวณมุมขวาสุดของแถบที่อยู่เว็บ (Address Bar) แล้วคลิกเลือก <strong>"อนุญาตป๊อปอัปจากเว็บไซต์นี้เสมอ"</strong> จากนั้นลองกดลงชื่อเข้าใช้ใหม่อีกครั้งนะคะ
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                  <div className="flex items-center space-x-3">
                    {googleUser.photoURL ? (
                      <img 
                        src={googleUser.photoURL} 
                        alt={googleUser.displayName || 'User'} 
                        className="w-10 h-10 rounded-full border border-slate-200 shadow-xs" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {(googleUser.email || 'G')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-800">
                          {googleUser.displayName || 'ผู้ใช้งาน Google'}
                        </h4>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ ลงชื่อเข้าใช้แล้ว
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {googleUser.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={signOutGoogle}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ออกจากระบบ Google</span>
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Spreadsheet Connection & Management */}
            <div className="space-y-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                ขั้นตอนที่ 2 : เลือกหรือสร้าง Google Sheet
              </span>

              {isConnected && connectionType === 'direct' && googleSpreadsheetId ? (
                /* Connected State Card */
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-emerald-950">
                            เชื่อมต่อกับ Google Sheet เรียบร้อยแล้ว (Direct API)
                          </h4>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        </div>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          ระบบกำลังอ่านและบันทึกข้อมูลสุ่มชั่งและคุมอายุเข้าสู่ Google Sheet แบบเรียลไทม์โดยตรงค่ะ
                        </p>
                        <p className="text-[11px] font-mono text-emerald-700 mt-1 break-all bg-emerald-100/60 px-2 py-1 rounded-md">
                          Spreadsheet ID: {googleSpreadsheetId}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`https://docs.google.com/spreadsheets/d/${googleSpreadsheetId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>เปิดดูใน Google Sheets</span>
                    </a>
                  </div>

                  {/* Sync Upload Current Data Box */}
                  <div className="bg-white border border-emerald-200/80 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-slate-800">
                        <UploadCloud className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold">อัปโหลดข้อมูลประวัติทั้งหมดเข้าสู่ชีต</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {isSyncing ? 'กำลังทำงาน...' : 'พร้อมซิงค์'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      หากคุณมีข้อมูลที่กรอกไว้ในเครื่องแล้วต้องการให้ส่งขึ้นไปบรรจุใน Google Sheet ทันที สามารถกดปุ่มด้านล่างนี้ได้เลยค่ะ (จะไม่สร้างข้อมูลซ้ำ)
                    </p>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={async () => {
                        const res = await uploadLocalDataToSheets();
                        if (res.success) {
                          setDirectMessage({ type: 'success', text: res.message });
                        } else {
                          setDirectMessage({ type: 'error', text: res.message });
                        }
                      }}
                      className="w-full inline-flex items-center justify-center space-x-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{isSyncing ? 'กำลังอัปโหลด...' : 'อัปโหลดข้อมูลประวัติขึ้น Google Sheets เดี๋ยวนี้'}</span>
                    </button>
                  </div>

                  {/* Disconnect Button */}
                  <button
                    type="button"
                    onClick={disconnectSheets}
                    className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 border border-red-200 hover:bg-red-50 text-red-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Unlink className="w-4 h-4" />
                    <span>ตัดการเชื่อมต่อ Google Sheet นี้</span>
                  </button>
                </div>
              ) : (
                /* Unconnected: Options to Connect */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option A: Create New Sheet with 1-Click */}
                  <div className="bg-white border-2 border-dashed border-blue-200 hover:border-blue-300 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition">
                    <div className="space-y-2">
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>ตัวเลือกที่ 1 : สะดวกและง่ายที่สุด</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-800">
                        สร้าง Google Sheet ใหม่ให้อัตโนมัติ
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        ระบบจะสร้างสเปรดชีตชื่อ <strong>"ระบบตรวจสอบชิ้นงานและสุ่มชั่ง FG-RM"</strong> ใน Google Drive ของคุณ พร้อมทั้งเตรียมหัวตารางทั้ง 5 แท็บ และนำเข้าข้อมูลประวัติปัจจุบันทั้งหมดให้ทันทีในคลิกเดียว!
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isCreatingSheet || !googleUser}
                      onClick={handleCreateNewSheet}
                      className="w-full inline-flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isCreatingSheet ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>กำลังสร้าง Google Sheet ใหม่และเชื่อมต่อ...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>🚀 คลิกสร้าง Google Sheet ใหม่ทันที</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Option B: Connect to Existing Sheet */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                        <Link className="w-3.5 h-3.5 text-slate-600" />
                        <span>ตัวเลือกที่ 2 : ใช้สเปรดชีตที่มีอยู่แล้ว</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-800">
                        เลือกสเปรดชีตจาก Google Drive หรือวางลิงก์
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        ค้นหาและเลือกสเปรดชีตที่มีอยู่แล้วใน Google Drive ของคุณ หรือวางลิงก์สเปรดชีตเพื่อเชื่อมต่อทันทีค่ะ
                      </p>
                    </div>

                    {googleUser && (
                      <div className="space-y-3 border-t border-b border-slate-100 py-3.5">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleLoadRecentSheets(searchTerm);
                              }
                            }}
                            placeholder="🔍 พิมพ์ชื่อสเปรดชีตเพื่อค้นหา..."
                            className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleLoadRecentSheets(searchTerm)}
                            disabled={isSearching}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                          >
                            {isSearching ? 'กำลังค้น...' : 'ค้นหา'}
                          </button>
                        </div>

                        {searchQueryError && (
                          <p className="text-[10px] text-red-600 font-medium">{searchQueryError}</p>
                        )}

                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1.5">
                          <p className="text-[10px] text-slate-400 font-bold px-1 py-0.5 uppercase tracking-wider">
                            ชีตของคุณใน Google Drive (15 รายการล่าสุด):
                          </p>
                          {isSearching && searchResults.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs flex items-center justify-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>กำลังโหลดสเปรดชีต...</span>
                            </div>
                          ) : searchResults.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs">
                              ไม่พบชีตที่ต้องการค้นหา
                            </div>
                          ) : (
                            searchResults.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between gap-2 p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-700 truncate" title={file.name}>
                                    📊 {file.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-mono truncate">ID: {file.id}</p>
                                </div>
                                <button
                                  type="button"
                                  disabled={isConnectingDirect}
                                  onClick={() => handleSelectRecentSheet(file.id)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
                                >
                                  เชื่อมต่อ
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Manual Link paste fallback */}
                    <form onSubmit={handleDirectConnect} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          หรือวางลิงก์เบราว์เซอร์สเปรดชีตโดยตรง:
                        </label>
                        <input
                          type="text"
                          required
                          value={sheetUrlInput}
                          onChange={(e) => setSheetUrlInput(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono bg-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isConnectingDirect || !googleUser || !sheetUrlInput.trim()}
                        className="w-full inline-flex items-center justify-center space-x-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {isConnectingDirect ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>กำลังตรวจสอบและเชื่อมต่อ...</span>
                          </>
                        ) : (
                          <>
                            <Link className="w-3.5 h-3.5" />
                            <span>เชื่อมต่อกับลิงก์สเปรดชีตนี้</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: APPS SCRIPT WEB APP (LEGACY OPTION) */}
        {activeTab === 'appscript' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Instructions Pane */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-slate-700">
                  <h4 className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>คำแนะนำ</span>
                  </h4>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    หากคุณพบปัญหาข้อผิดพลาดกับลิงก์ Apps Script (เช่น 404 ไม่พบไฟล์ หรือ Load failed) แนะนำให้ใช้แท็บ <strong>"เชื่อมต่อตรง (ไม่ต้องใช้สคริปต์)"</strong> ด้านบน เพื่อความสะดวก รวดเร็ว และไม่มีปัญหาลิงก์เสียค่ะ
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

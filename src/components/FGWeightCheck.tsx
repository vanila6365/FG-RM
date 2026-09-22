import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FGWeightCheck } from '../types';
import { Scale, Search, Plus, Trash2, Edit2, AlertCircle, Save, CheckCircle2, ChevronRight, XCircle, Upload, Download, RefreshCw, Database, Clock } from 'lucide-react';
import { formatDateBE, sortNewestFirst } from '../utils';

export function FGWeightCheckView() {
  const { 
    fgWeightRecords, 
    addFGWeight, 
    updateFGWeight, 
    deleteFGWeight, 
    masterData, 
    userRole,
    importFGWeightBatch,
    resetFGWeightToDefault,
    triggerSuccess,
    triggerConfirm,
    fgWeightFilterPendingOnly,
    setFgWeightFilterPendingOnly
  } = useApp();

  const [search, setSearch] = useState('');
  const [showAddForm, setShowForm] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fgCode, setFgCode] = useState('');
  const [batch, setBatch] = useState('');
  const [quantityKg, setQuantityKg] = useState<number | ''>('');
  const [standardWeightKg, setStandardWeightKg] = useState<number>(20);
  const [inspector, setInspector] = useState(() => localStorage.getItem('last_inspector_fgw') || '');
  const [note, setNote] = useState('');
  const [containerType, setContainerType] = useState<string>('กล่อง');
  const [manualStatus, setManualStatus] = useState<'Pass' | 'Fail' | null>(null);
  const [isManualStandardWeight, setIsManualStandardWeight] = useState<boolean>(false);
  
  // Dynamic samples
  const [sampleInputs, setSampleInputs] = useState<string[]>(['', '', '', '']); // default 4 samples as shown in image

  // CSV Utility states
  const [csvTextInput, setCsvTextInput] = useState('');
  const [showCSVPanel, setShowCSVPanel] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleCSVImport = () => {
    setImportError(null);
    setImportCount(null);
    
    if (!csvTextInput.trim()) {
      setImportError('กรุณากรอกหรือวางข้อมูล CSV ก่อนคลิกนำเข้า');
      return;
    }

    try {
      const lines = csvTextInput.split('\n').map(l => l.trim()).filter(Boolean);
      const records: FGWeightCheck[] = [];
      
      const splitRow = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const parseDate = (dateStr: string): string => {
        const parts = dateStr.trim().split('/');
        if (parts.length < 3) return dateStr;
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (year > 2400) year = year - 543;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      };

      let startIdx = 0;
      if (lines[0].includes('รหัสสินค้า') || lines[0].includes('วันที่') || lines[0].includes('Batch')) {
        startIdx = 1;
      }

      for (let i = startIdx; i < lines.length; i++) {
        const cols = splitRow(lines[i]);
        if (cols.length < 3 || !cols[0] || !cols[1]) continue;
        
        const rawDate = cols[0];
        const fgCode = cols[1];
        const batch = cols[2];
        const quantityKg = parseFloat(cols[3].replace(/[",\s]/g, '')) || 0;
        const standardWeightKg = parseFloat(cols[4].replace(/[",\s]/g, '')) || 0;
        const noteStr = cols[5] ? cols[5].replace(/^"|"$/g, '').trim() : '';
        const passVal = cols[6]?.toUpperCase();
        
        let status: 'Pass' | 'Fail' | 'Pending' = 'Pending';
        if (passVal === 'TRUE' || passVal === 'PASS') {
          status = 'Pass';
        } else if (cols[7]?.toUpperCase() === 'TRUE' || cols[7]?.toUpperCase() === 'FAIL') {
          status = 'Fail';
        }

        const weightStr = cols[8] || '';
        const samples = weightStr ? weightStr.split('/').map(w => parseFloat(w.trim())).filter(w => !isNaN(w) && w > 0) : [];
        const averageWeight = samples.length > 0 
          ? parseFloat((samples.reduce((sum, val) => sum + val, 0) / samples.length).toFixed(2)) 
          : 0;

        records.push({
          id: `fgw-imported-${Date.now()}-${i}`,
          date: parseDate(rawDate),
          fgCode,
          batch,
          quantityKg,
          standardWeightKg,
          samples,
          averageWeight,
          status,
          note: noteStr || undefined,
          inspector: 'ประเสริฐ ศรีสุข (QC)'
        });
      }

      if (records.length === 0) {
        setImportError('ไม่พบข้อมูลรูปแบบที่ถูกต้องใน CSV ที่วาง');
        return;
      }

      importFGWeightBatch(records);
      setImportCount(records.length);
      setCsvTextInput('');
      setTimeout(() => setImportCount(null), 4000);
    } catch (e: any) {
      setImportError('เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล: ' + e.message);
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['วันที่', 'รหัสสินค้า', 'Batch', 'จำนวน Kg.', 'น้ำหนัก Standard Kg.', 'สุ่มตรวจ เช่น ถุง, ถัง, กล่อง, กรง', 'ผ่าน', 'ไม่ผ่าน', 'น้ำหนักที่ชั่งได้ (Kg.)', 'หมายเหตุ'];
      const rows = fgWeightRecords.map(r => {
        const passVal = r.status === 'Pass' ? 'TRUE' : 'FALSE';
        const failVal = r.status === 'Fail' ? 'TRUE' : 'FALSE';
        const weightStr = r.samples.join('/');
        return [
          r.date,
          r.fgCode,
          r.batch,
          r.quantityKg,
          r.standardWeightKg,
          `"${r.note || ''}"`,
          passVal,
          failVal,
          weightStr,
          ''
        ].join(',');
      });

      const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `FG_Weight_Checks_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert('Export failed: ' + e.message);
    }
  };

  // Suggestions state
  const [showFGSuggest, setShowFgSuggest] = useState(false);

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<FGWeightCheck | null>(null);
  const [editSampleInputs, setEditSampleInputs] = useState<string[]>([]);

  // Calculate stats on typed inputs
  const currentSamples = sampleInputs.map(Number).filter(n => !isNaN(n) && n > 0);
  const currentAvg = currentSamples.length > 0 
    ? parseFloat((currentSamples.reduce((a, b) => a + b, 0) / currentSamples.length).toFixed(2)) 
    : 0;
  const currentVariance = standardWeightKg > 0 ? Math.abs(currentAvg - standardWeightKg) / standardWeightKg : 0;
  const currentPass = currentVariance <= 0.01; // within 1% tolerance

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fgCode.trim() || !batch.trim() || currentSamples.length === 0) {
      alert('กรุณากรอกรหัส ผลิตภัณฑ์ แบทช์ และค่าน้ำหนักสุ่มตรวจอย่างน้อย 1 รายการ');
      return;
    }

    if (inspector) {
      localStorage.setItem('last_inspector_fgw', inspector);
    }

    const finalStatus = manualStatus !== null ? manualStatus : (currentPass ? 'Pass' : 'Fail');

    addFGWeight({
      date,
      fgCode: fgCode.trim(),
      batch: batch.trim(),
      quantityKg: Number(quantityKg) || 0,
      standardWeightKg: Number(standardWeightKg),
      samples: currentSamples,
      averageWeight: currentAvg,
      containerType: containerType,
      status: finalStatus,
      note: note.trim(),
      inspector: inspector.trim() || 'QC Operator'
    });

    triggerSuccess('เพิ่มข้อมูลใบชั่งสุ่มตรวจน้ำหนัก FG สำเร็จเรียบร้อย!');

    setFgCode('');
    setBatch('');
    setQuantityKg('');
    setNote('');
    setSampleInputs(['', '', '', '']); // reset to 4 as shown in photo
    setContainerType('กล่อง');
    setManualStatus(null);
    setIsManualStandardWeight(false);
    setShowForm(false);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const parsedSamples = editSampleInputs.map(Number).filter(n => !isNaN(n) && n > 0);
    const avg = parsedSamples.length > 0 ? parsedSamples.reduce((a, b) => a + b, 0) / parsedSamples.length : 0;
    const variance = Math.abs(avg - editingRecord.standardWeightKg) / editingRecord.standardWeightKg;
    const calculatedPass = variance <= 0.01;
    const finalStatus = manualStatus !== null ? manualStatus : (calculatedPass ? 'Pass' : 'Fail');

    updateFGWeight({
      ...editingRecord,
      samples: parsedSamples,
      averageWeight: parseFloat(avg.toFixed(2)),
      containerType: containerType,
      status: finalStatus
    });
    
    triggerSuccess('บันทึกการแก้ไขข้อมูลน้ำหนักสุ่ม FG สำเร็จเรียบร้อย!');
    setEditingRecord(null);
  };

  const handleSampleCountChange = (count: number) => {
    setSampleInputs(prev => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        return [...prev, ...Array(count - prev.length).fill('')];
      } else {
        return prev.slice(0, count);
      }
    });
  };

  const handleEditSampleCountChange = (count: number) => {
    setEditSampleInputs(prev => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        return [...prev, ...Array(count - prev.length).fill('')];
      } else {
        return prev.slice(0, count);
      }
    });
  };

  const handleSampleChange = (index: number, val: string) => {
    const updated = [...sampleInputs];
    updated[index] = val;
    setSampleInputs(updated);
  };

  const startEdit = (rec: FGWeightCheck) => {
    setEditingRecord(rec);
    setEditSampleInputs(rec.samples && rec.samples.length > 0 ? rec.samples.map(String) : ['', '', '', '']);
    setContainerType(rec.containerType || 'กล่อง');
    setManualStatus(rec.status === 'Pending' ? null : rec.status);
    setIsManualStandardWeight(![5, 10, 15, 20, 25, 50, 100, 200, 500, 650, 1000, 1050, 1100, 1200].includes(rec.standardWeightKg));
    setShowForm(false);
  };

  let filteredRecords = sortNewestFirst<FGWeightCheck>(
    fgWeightRecords.filter(r => 
      String(r.fgCode || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.batch || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  if (fgWeightFilterPendingOnly) {
    filteredRecords = filteredRecords.filter(r => r.status === 'Pending');
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center space-x-2 text-slate-800">
          <Scale className="w-5 h-5 text-emerald-600" />
          <h2 className="font-extrabold text-lg">2. ระบบชั่งสุ่มตรวจและตรวจสอบน้ำหนัก Finished Goods (FG)</h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowForm(!showAddForm);
              setShowCSVPanel(false);
              setEditingRecord(null);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'ปิดฟอร์ม' : 'คีย์ผลตรวจสอบน้ำหนักใหม่'}</span>
          </button>

          <button
            onClick={() => setFgWeightFilterPendingOnly(!fgWeightFilterPendingOnly)}
            className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              fgWeightFilterPendingOnly
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'
            }`}
            title="กรองเฉพาะรายการที่ยังไม่ได้กรอกผลชั่งสุ่ม"
          >
            <Clock className="w-4 h-4" />
            <span>{fgWeightFilterPendingOnly ? 'แสดงทั้งหมด' : `รอชั่ง (${fgWeightRecords.filter(r => r.status === 'Pending').length})`}</span>
          </button>
        </div>
      </div>

      {/* CSV panel */}
      {showCSVPanel && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 animate-fadeIn">
          <div className="border-b border-slate-200 pb-2 mb-1 flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>นำเข้าข้อมูลจากไฟล์หรือคัดลอกตารางมาวาง (CSV Import / Export)</span>
            </span>
            <button 
              onClick={() => {
                if (confirm('คุณแน่ใจว่าต้องการล้างข้อมูลแคชทั้งหมดและโหลดข้อมูลจากตัวเลือก CSV เริ่มต้น?')) {
                  resetFGWeightToDefault();
                  alert('ล้างแคชและโหลดข้อมูลตัวอย่างสำเร็จ!');
                }
              }}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition animate-pulse"
              title="รีเซ็ตและโหลดตัวอย่าง CSV จากแอป"
            >
              <RefreshCw className="w-3 h-3" />
              <span>โหลดข้อมูลจากไฟล์ CSV เริ่มต้น</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            คุณสามารถคัดลอกแถวตารางข้อมูล (ที่มีคอลัมน์ วันที่, รหัสสินค้า, Batch, จำนวน, มาตรฐาน...) มาวางในกล่องข้อความด้านล่างนี้ หรือเลือกไฟล์ .csv เพื่อบันทึกประวัติย่อยเข้าระบบและอัปเดต Master Data โดยอัตโนมัติ
          </p>

          <div className="space-y-2">
            <textarea
              rows={4}
              placeholder="วางแถวข้อมูล CSV ที่นี่...&#10;เช่น: 1/7/2569,TS H991,690733,930,500,&quot;2 , กรง&quot;,TRUE,FALSE,554.8/564,"
              value={csvTextInput}
              onChange={(e) => setCsvTextInput(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const text = event.target?.result as string;
                        setCsvTextInput(text);
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center space-x-1 transition bg-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ส่งออก CSV (Export)</span>
                </button>
                <button
                  type="button"
                  onClick={handleCSVImport}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 transition shadow-md shadow-emerald-500/10"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>ประมวลผลและนำเข้า (Import)</span>
                </button>
              </div>
            </div>
          </div>

          {importCount !== null && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>นำเข้าข้อมูลสำเร็จทั้งหมด {importCount} แถวแล้ว!</span>
            </div>
          )}

          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-bold flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{importError}</span>
            </div>
          )}
        </div>
      )}

      {/* Creation form */}
      {showAddForm && (
        <form onSubmit={handleCreateSubmit} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg animate-fadeIn space-y-0">
          <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-full text-white">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">บันทึกผลการชั่งน้ำหนัก (FG Weight Check)</h3>
                <p className="text-xs text-emerald-100 font-medium">
                  {fgCode || 'เลือกผลิตภัณฑ์'} | Batch: {batch || 'ยังไม่ได้ระบุ'} | จำนวน: {quantityKg ? `${quantityKg} Kg.` : 'ยังไม่ได้ระบุ'}
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1 hover:bg-white/10 rounded-lg text-white transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* 1. Production Info Card */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 space-y-3">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>ข้อมูลรายการผลิต (Production Info)</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">วันที่ (Date)</label>
                  <input 
                    type="date" 
                    required
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" 
                  />
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">รหัสสินค้า (FG Code)</label>
                  <input 
                    type="text" 
                    required
                    value={fgCode}
                    onFocus={() => setShowFgSuggest(true)}
                    onBlur={() => setTimeout(() => setShowFgSuggest(false), 200)}
                    onChange={(e) => setFgCode(e.target.value)}
                    placeholder="รหัสสินค้า..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100" 
                  />
                  {showFGSuggest && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto font-sans">
                      {masterData.fgCodes
                        .filter(c => c.toLowerCase().includes(fgCode.toLowerCase()))
                        .map(code => (
                          <button
                            key={code}
                            type="button"
                            onMouseDown={() => setFgCode(code)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            {code}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Batch (Lot) *</label>
                  <input 
                    type="text" 
                    required
                    value={batch} 
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="ระบุ Batch..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 font-mono" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">จำนวน (Kg.)</label>
                  <input 
                    type="number"
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(e.target.value ? Number(e.target.value) : '')}
                    placeholder="จำนวน Kg..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
            </div>

            {/* 2. Standard Weights Preset Buttons */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="block text-xs font-bold text-slate-700">น้ำหนักมาตรฐาน Standard Weight (Kg.)</label>
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 20, 25, 50, 100, 200, 500, 650, 1000, 1050, 1100, 1200].map((preset) => {
                  const isSelected = !isManualStandardWeight && standardWeightKg === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setStandardWeightKg(preset);
                        setIsManualStandardWeight(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset === 5 ? '5 kg.' : preset.toLocaleString()}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setIsManualStandardWeight(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isManualStandardWeight
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ระบุเอง
                </button>
              </div>
              {isManualStandardWeight && (
                <div className="mt-2 flex items-center gap-1.5 animate-fadeIn">
                  <input
                    type="number"
                    value={standardWeightKg || ''}
                    onChange={(e) => setStandardWeightKg(Number(e.target.value))}
                    placeholder="กรอกค่าน้ำหนักมาตรฐาน..."
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-100 bg-white"
                  />
                  <span className="text-xs text-slate-500 font-bold">Kg.</span>
                </div>
              )}
            </div>

            {/* 3. Sample Size & Container Dropdowns & Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">จำนวนตัวอย่างที่สุ่มชั่ง</label>
                <select
                  value={sampleInputs.length}
                  onChange={(e) => handleSampleCountChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  {Array.from({ length: 15 }, (_, i) => i + 1).map(count => (
                    <option key={count} value={count}>{count} ชิ้น / ภาชนะ</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทภาชนะบรรจุ (Container)</label>
                <select
                  value={containerType}
                  onChange={(e) => setContainerType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  {['ถุง', 'กระสอบ', 'ถัง', 'กรง', 'กล่อง', 'เบ๊าท์'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ผลการตรวจสอบ (ผ่าน / ไม่ผ่าน)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualStatus('Pass')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs inline-flex items-center justify-center space-x-1.5 transition-all border ${
                      (manualStatus === 'Pass' || (manualStatus === null && currentPass))
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>ผ่าน (Pass)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualStatus('Fail')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs inline-flex items-center justify-center space-x-1.5 transition-all border ${
                      (manualStatus === 'Fail' || (manualStatus === null && !currentPass))
                        ? 'bg-red-600 border-red-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>ไม่ผ่าน (Fail)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Weighing Inputs Grid */}
            <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4 space-y-2 pt-3 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-emerald-100 pb-1">
                <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span>น้ำหนักที่ชั่งได้ ({sampleInputs.length} {containerType})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold">จะถูกคั่นด้วย / เช่น 20.50/20.60</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1">
                {sampleInputs.map((val, idx) => (
                  <div key={idx}>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">{containerType} #{idx+1}</span>
                    <input 
                      type="number" 
                      step="any"
                      required
                      value={val}
                      onChange={(e) => handleSampleChange(idx, e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 text-xs text-center border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 font-mono font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Additional Stats & Note */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">สุ่มชั่งเฉลี่ย (Avg):</span>
                  <span className="font-extrabold text-blue-600 font-mono">{currentAvg.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-slate-400 font-bold">ส่วนเบี่ยงเบน (Diff):</span>
                  <span className="font-extrabold text-slate-600 font-mono">
                    {Math.abs(currentAvg - standardWeightKg).toFixed(2)} kg ({ (currentVariance * 100).toFixed(1) }%)
                  </span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ (Note)</label>
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="กรอกหมายเหตุเพิ่มเติม (ถ้ามี)..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition bg-white"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/10 transition inline-flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกน้ำหนัก</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Editing Modal */}
      {editingRecord && (
        <form onSubmit={handleUpdateSubmit} className="bg-white rounded-2xl border-2 border-amber-400 overflow-hidden shadow-xl animate-fadeIn space-y-0">
          <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-full text-white">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">บันทึกผลการชั่งน้ำหนัก (FG Weight Check) - แก้ไขข้อมูล</h3>
                <p className="text-xs text-emerald-100 font-medium">
                  {editingRecord.fgCode} | Batch: {editingRecord.batch} | จำนวน: {editingRecord.quantityKg ? `${editingRecord.quantityKg} Kg.` : 'ยังไม่ได้ระบุ'}
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setEditingRecord(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-white transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* 1. Production Info Card (Editing) */}
            <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-4 space-y-3">
              <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-700" />
                <span>ข้อมูลรายการผลิต (Production Info)</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">วันที่ (Date)</label>
                  <input 
                    type="date" 
                    required
                    value={editingRecord.date} 
                    onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">รหัสสินค้า (FG Code)</label>
                  <input 
                    type="text" 
                    required
                    value={editingRecord.fgCode}
                    onChange={(e) => setEditingRecord({ ...editingRecord, fgCode: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Batch (Lot) *</label>
                  <input 
                    type="text" 
                    required
                    value={editingRecord.batch} 
                    onChange={(e) => setEditingRecord({ ...editingRecord, batch: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">จำนวน (Kg.)</label>
                  <input 
                    type="number"
                    value={editingRecord.quantityKg || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, quantityKg: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Standard Weights Preset Buttons (Editing) */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="block text-xs font-bold text-slate-700">น้ำหนักมาตรฐาน Standard Weight (Kg.)</label>
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 20, 25, 50, 100, 200, 500, 650, 1000, 1050, 1100, 1200].map((preset) => {
                  const isSelected = !isManualStandardWeight && editingRecord.standardWeightKg === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setEditingRecord({ ...editingRecord, standardWeightKg: preset });
                        setIsManualStandardWeight(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset === 5 ? '5 kg.' : preset.toLocaleString()}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setIsManualStandardWeight(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isManualStandardWeight
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ระบุเอง
                </button>
              </div>
              {isManualStandardWeight && (
                <div className="mt-2 flex items-center gap-1.5 animate-fadeIn">
                  <input
                    type="number"
                    value={editingRecord.standardWeightKg || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, standardWeightKg: Number(e.target.value) })}
                    placeholder="กรอกค่าน้ำหนักมาตรฐาน..."
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-100 bg-white"
                  />
                  <span className="text-xs text-slate-500 font-bold">Kg.</span>
                </div>
              )}
            </div>

            {/* 3. Sample Size & Container Dropdowns & Status (Editing) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">จำนวนตัวอย่างที่สุ่มชั่ง</label>
                <select
                  value={editSampleInputs.length}
                  onChange={(e) => handleEditSampleCountChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold focus:outline-none"
                >
                  {Array.from({ length: 15 }, (_, i) => i + 1).map(count => (
                    <option key={count} value={count}>{count} ชิ้น / ภาชนะ</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ประเภทภาชนะบรรจุ (Container)</label>
                <select
                  value={containerType}
                  onChange={(e) => setContainerType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-bold focus:outline-none"
                >
                  {['ถุง', 'กระสอบ', 'ถัง', 'กรง', 'กล่อง', 'เบ๊าท์'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ผลการตรวจสอบ (ผ่าน / ไม่ผ่าน)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualStatus('Pass')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs inline-flex items-center justify-center space-x-1.5 transition-all border ${
                      manualStatus === 'Pass'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>ผ่าน (Pass)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualStatus('Fail')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs inline-flex items-center justify-center space-x-1.5 transition-all border ${
                      manualStatus === 'Fail'
                        ? 'bg-red-600 border-red-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>ไม่ผ่าน (Fail)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Weighing Inputs Grid (Editing) */}
            <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4 space-y-2 pt-3 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-emerald-100 pb-1">
                <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span>น้ำหนักที่ชั่งได้ ({editSampleInputs.length} {containerType})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold">จะถูกคั่นด้วย / เช่น 20.50/20.60</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1">
                {editSampleInputs.map((val, idx) => (
                  <div key={idx}>
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">{containerType} #{idx+1}</span>
                    <input 
                      type="number" 
                      step="any"
                      required
                      value={val}
                      onChange={(e) => {
                        const updated = [...editSampleInputs];
                        updated[idx] = e.target.value;
                        setEditSampleInputs(updated);
                      }}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 text-xs text-center border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 font-mono font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Note & Inspector (Editing) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ตรวจสอบ (Inspector)</label>
                <input 
                  type="text" 
                  value={editingRecord.inspector} 
                  onChange={(e) => setEditingRecord({ ...editingRecord, inspector: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ (Note)</label>
                <input 
                  type="text" 
                  value={editingRecord.note || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, note: e.target.value })}
                  placeholder="กรอกหมายเหตุเพิ่มเติม (ถ้ามี)..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* Actions Footer (Editing) */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  triggerConfirm('คุณแน่ใจว่าต้องการลบใบสุ่มชั่งน้ำหนัก FG ใบนี้ใช่ไหม?', () => {
                    deleteFGWeight(editingRecord.id);
                    setEditingRecord(null);
                  });
                }}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold text-red-600 transition inline-flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบรายการนี้</span>
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition bg-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/10 transition inline-flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกน้ำหนัก</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* History check weight table */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            placeholder="ค้นหาประวัติตามรหัสกาว หรือแบทช์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3">วันที่ชั่ง</th>
                <th className="p-3">รหัสกาว (FG Code)</th>
                <th className="p-3">Batch</th>
                <th className="p-3 text-right">มาตรฐาน (Std)</th>
                <th className="p-3">ภาชนะ</th>
                <th className="p-3">น้ำหนักสุ่มทั้งหมด</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">หมายเหตุ</th>
                <th className="p-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r, idx) => (
                  <tr 
                    key={`${r.id || 'fgw'}-${idx}`} 
                    onClick={() => startEdit(r)}
                    className="hover:bg-amber-50/30 cursor-pointer transition-colors group"
                    title="คลิกเพื่อแก้ไขข้อมูลแถวนี้"
                  >
                    <td className="p-3 font-mono text-slate-500">{formatDateBE(r.date)}</td>
                    <td className="p-3 font-bold text-slate-800 group-hover:text-amber-700 transition-colors">{r.fgCode}</td>
                    <td className="p-3 font-mono font-bold text-slate-600">{r.batch}</td>
                    <td className="p-3 text-right text-slate-500 font-mono">{r.standardWeightKg} kg</td>
                    <td className="p-3 font-bold text-slate-600">{r.containerType || 'กล่อง'}</td>
                    <td className="p-3 font-mono text-slate-500 max-w-xs truncate" title={r.samples.join(', ')}>
                      {r.samples.join(', ')}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        r.status === 'Pass' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : r.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {r.status === 'Pending' ? 'Pending (รอระบุ)' : r.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500 truncate max-w-xs">{r.note || '-'}</td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex space-x-1">
                        <button
                          onClick={() => startEdit(r)}
                          className="p-1 rounded bg-slate-50 text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition"
                          title="แก้ไขข้อมูลน้ำหนักสุ่ม"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            triggerConfirm('คุณแน่ใจว่าต้องการลบใบสุ่มชั่งน้ำหนัก FG ใบนี้ใช่ไหม?', () => {
                              deleteFGWeight(r.id);
                            });
                          }}
                          className="p-1 rounded bg-slate-50 text-red-600 hover:bg-red-50 hover:text-red-700 transition"
                          title="ลบข้อมูล"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 text-xs font-semibold">
                    ไม่มีประวัติตรวจน้ำหนักในรายการ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RMWeightCheck } from '../types';
import { Scale, Search, Plus, Trash2, Edit2, AlertCircle, Save, CheckCircle2, XCircle, Database } from 'lucide-react';
import { formatDateBE, sortNewestFirst, toISODate } from '../utils';

export function RMWeightCheckView() {
  const { 
    rmWeightRecords, 
    addRMWeight, 
    updateRMWeight, 
    deleteRMWeight, 
    masterData, 
    userRole,
    triggerSuccess,
    triggerConfirm
  } = useApp();

  const [search, setSearch] = useState('');
  const [showAddForm, setShowForm] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rmCode, setRmCode] = useState('');
  const [batch, setBatch] = useState('');
  const [quantityKg, setQuantityKg] = useState<number | ''>('');
  const [standardWeightKg, setStandardWeightKg] = useState<number>(25);
  const [inspector, setInspector] = useState(() => localStorage.getItem('last_inspector_rmw') || '');
  const [note, setNote] = useState('');
  const [containerType, setContainerType] = useState<string>('กล่อง');
  const [manualStatus, setManualStatus] = useState<'Pass' | 'Fail' | null>(null);
  const [isManualStandardWeight, setIsManualStandardWeight] = useState<boolean>(false);
  
  // Dynamic samples
  const [sampleInputs, setSampleInputs] = useState<string[]>(['', '', '', '']); // default 4 samples

  // Suggestions state
  const [showRMSuggest, setShowRmSuggest] = useState(false);

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<RMWeightCheck | null>(null);
  const [editSampleInputs, setEditSampleInputs] = useState<string[]>([]);

  // Calculations on typed inputs
  const currentSamples = sampleInputs.map(Number).filter(n => !isNaN(n) && n > 0);
  const currentAvg = currentSamples.length > 0 
    ? parseFloat((currentSamples.reduce((a, b) => a + b, 0) / currentSamples.length).toFixed(2)) 
    : 0;
  const currentVariance = standardWeightKg > 0 ? Math.abs(currentAvg - standardWeightKg) / standardWeightKg : 0;
  const currentPass = currentVariance <= 0.015; // 1.5% tolerance standard for raw materials

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmCode.trim() || !batch.trim() || currentSamples.length === 0) {
      alert('กรุณากรอกรหัสวัตถุดิบ แบทช์ และค่าน้ำหนักสุ่มอย่างน้อย 1 ขวด/ถุง');
      return;
    }

    if (inspector) {
      localStorage.setItem('last_inspector_rmw', inspector);
    }

    const finalStatus = manualStatus !== null ? manualStatus : (currentPass ? 'Pass' : 'Fail');

    addRMWeight({
      date,
      rmCode: rmCode.trim(),
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

    triggerSuccess('เพิ่มใบชั่งสุ่มตรวจน้ำหนักวัตถุดิบสำเร็จเรียบร้อย!');

    setRmCode('');
    setBatch('');
    setQuantityKg('');
    setNote('');
    setSampleInputs(['', '', '', '']);
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
    const calculatedPass = variance <= 0.015;
    const finalStatus = manualStatus !== null ? manualStatus : (calculatedPass ? 'Pass' : 'Fail');

    updateRMWeight({
      ...editingRecord,
      samples: parsedSamples,
      averageWeight: parseFloat(avg.toFixed(2)),
      containerType: containerType,
      status: finalStatus
    });
    
    triggerSuccess('บันทึกการแก้ไขน้ำหนักสุ่มวัตถุดิบสำเร็จเรียบร้อย!');
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

  const startEdit = (rec: RMWeightCheck) => {
    setEditingRecord({ ...rec, date: toISODate(rec.date) });
    setEditSampleInputs(rec.samples.map(String));
    setContainerType(rec.containerType || 'กล่อง');
    setManualStatus(rec.status === 'Pending' ? null : rec.status);
    setIsManualStandardWeight(![5, 10, 15, 20, 25, 50, 100, 200, 500, 650, 1000, 1050, 1100, 1200].includes(rec.standardWeightKg));
    setShowForm(false);
  };

  const filteredRecords = sortNewestFirst<RMWeightCheck>(
    rmWeightRecords.filter(r => 
      String(r.rmCode || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.batch || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center space-x-2 text-slate-800">
          <Scale className="w-5 h-5 text-teal-600" />
          <h2 className="font-extrabold text-lg">4. ระบบสุ่มชั่งน้ำหนัก Raw Materials (RM)</h2>
        </div>
        
        <button
          onClick={() => {
            setShowForm(!showAddForm);
            setEditingRecord(null);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'ปิดฟอร์ม' : 'บันทึกน้ำหนักสุ่มวัตถุดิบ'}</span>
        </button>
      </div>

      {/* Creation form */}
      {showAddForm && (
        <form onSubmit={handleCreateSubmit} className="bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-teal-600" />
              <span>บันทึกใบสุ่มชั่งน้ำหนัก Raw Materials (RM Weight Check)</span>
            </span>
            <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-black">1.5% tolerance standard</span>
          </div>

          <div className="p-5 space-y-4">
            {/* 1. Production Info Card */}
            <div className="bg-teal-50/30 border border-teal-100 rounded-xl p-4 space-y-3">
              <span className="text-xs font-extrabold text-teal-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-teal-700" />
                <span>ข้อมูลรายการวัตถุดิบ (Raw Material Info)</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">วันที่ (Date)</label>
                  <input 
                    type="date" 
                    required
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none" 
                  />
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">รหัสวัตถุดิบ (RM Code) *</label>
                  <input 
                    type="text" 
                    required
                    value={rmCode}
                    onFocus={() => setShowRmSuggest(true)}
                    onBlur={() => setTimeout(() => setShowRmSuggest(false), 200)}
                    onChange={(e) => setRmCode(e.target.value)}
                    placeholder="พิมพ์เพื่อค้นหา..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none" 
                  />
                  {showRMSuggest && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto font-sans">
                      {masterData.rmCodes
                        .filter(c => c.toLowerCase().includes(rmCode.toLowerCase()))
                        .map(code => (
                          <button
                            key={code}
                            type="button"
                            onMouseDown={() => setRmCode(code)}
                            className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            {code}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Batch ผู้ผลิต *</label>
                  <input 
                    type="text" 
                    required
                    value={batch} 
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="B-SCG-9031"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">จำนวนที่ตรวจทั้งหมด (Kg.)</label>
                  <input 
                    type="number"
                    value={quantityKg || ''}
                    onChange={(e) => setQuantityKg(Number(e.target.value))}
                    placeholder="5000"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Standard Weights Preset Buttons */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="block text-xs font-bold text-slate-700">น้ำหนักเป้าหมายมาตรฐาน Standard Weight (Kg.)</label>
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
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {preset} Kg
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIsManualStandardWeight(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isManualStandardWeight
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  ระบุเอง (Manual)
                </button>
              </div>

              {isManualStandardWeight && (
                <div className="mt-2 flex items-center gap-2 max-w-xs animate-fadeIn">
                  <input
                    type="number"
                    step="any"
                    value={standardWeightKg}
                    onChange={(e) => setStandardWeightKg(Number(e.target.value))}
                    placeholder="กรอกน้ำหนักเป้าหมายมาตรฐาน..."
                    className="w-full px-3 py-1.5 text-xs border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:outline-none font-bold"
                  />
                  <span className="text-xs font-extrabold text-slate-500">Kg.</span>
                </div>
              )}
            </div>

            {/* 3. Container Type and Sample Size Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">ประเภทภาชนะ (Container Type)</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['ถุง', 'กระสอบ', 'ถัง', 'กรง', 'กล่อง', 'เบ๊าท์'].map((type) => {
                    const isSelected = containerType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setContainerType(type)}
                        className={`py-2 px-1 text-xs font-black rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-teal-50 text-teal-800 border-teal-400 ring-2 ring-teal-100'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">จำนวนที่สุ่มตรวจ (Sample Size)</label>
                <div className="flex items-center gap-2">
                  <select
                    value={sampleInputs.length}
                    onChange={(e) => handleSampleCountChange(Number(e.target.value))}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none font-bold text-slate-800 min-w-[120px]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((num) => (
                      <option key={num} value={num}>
                        สุ่มชั่ง {num} ชิ้น
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 font-bold">แนะแนว: สุ่มชั่งตามใบสั่ง QC มาตรฐาน</span>
                </div>
              </div>
            </div>

            {/* 4. Input Weighing Grid */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <span className="text-xs font-extrabold text-slate-700 block">กรอกน้ำหนักสุ่มรายขวด / รายชิ้น (Kg.)</span>
              <div className="grid grid-cols-3 sm:grid-cols-8 gap-2 bg-slate-100/50 p-3 rounded-xl border border-slate-200">
                {sampleInputs.map((val, idx) => (
                  <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[9px] text-slate-400 font-extrabold block mb-1">ชิ้นที่ #{idx + 1}</span>
                    <input 
                      type="number" 
                      step="any"
                      required
                      value={val}
                      onChange={(e) => handleSampleChange(idx, e.target.value)}
                      placeholder={`${standardWeightKg}`}
                      className="w-full text-center font-mono font-extrabold text-xs text-blue-700 border-b border-slate-100 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Metrics Analysis Summary with manual Override */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 border-t border-slate-100 pt-3 items-stretch">
              <div className="md:col-span-8 bg-blue-50/20 border border-blue-100/70 p-4 rounded-xl grid grid-cols-3 gap-2 text-center">
                <div className="border-r border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">จำนวน (Samples)</span>
                  <span className="text-sm font-black text-slate-800">{currentSamples.length} ชิ้น</span>
                </div>
                <div className="border-r border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">น้ำหนักสุ่มเฉลี่ย (Average)</span>
                  <span className="text-sm font-black text-blue-700">{currentAvg.toFixed(2)} kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">ค่าคลาดเคลื่อน (Variance)</span>
                  <span className="text-sm font-black text-orange-600">{(currentVariance * 100).toFixed(2)}%</span>
                </div>
              </div>

              <div className="md:col-span-4 bg-teal-50/10 border border-teal-100/70 p-4 rounded-xl flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">ประเมินผลสถานะ (Status)</span>
                  <div className="flex gap-1">
                    {manualStatus === null ? (
                      <span className="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-1.5 py-0.5 rounded">Auto</span>
                    ) : (
                      <span className="text-[9px] bg-orange-100 text-orange-800 font-extrabold px-1.5 py-0.5 rounded">Manual</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setManualStatus('Pass')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                      (manualStatus === 'Pass' || (manualStatus === null && currentPass && currentSamples.length > 0))
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ผ่าน (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualStatus('Fail')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                      (manualStatus === 'Fail' || (manualStatus === null && !currentPass && currentSamples.length > 0))
                        ? 'bg-red-500 text-white border-red-500 shadow-sm'
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ไม่ผ่าน (Fail)
                  </button>
                  {manualStatus !== null && (
                    <button
                      type="button"
                      onClick={() => setManualStatus(null)}
                      className="px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg"
                      title="รีเซ็ตกลับเป็นแบบคำนวณอัตโนมัติ"
                    >
                      คืนค่า
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 6. Footer Info Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ตรวจสอบน้ำหนัก (Inspector)</label>
                <input 
                  type="text" 
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  placeholder="ชื่อ-นามสกุล ผู้ตรวจสอบ"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">บันทึกความเห็นเพิ่มเติม (Notes / Feedback)</label>
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="รายละเอียดสภาพถุงวัตถุดิบ หรือหมายเหตุความคลาดเคลื่อน..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกน้ำหนักสุ่ม</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Editing Form */}
      {editingRecord && (
        <form onSubmit={handleUpdateSubmit} className="bg-amber-50/20 border-2 border-amber-300 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
          <div className="bg-amber-100/50 px-5 py-3 border-b border-amber-200 flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-amber-700" />
              <span>โหมดแก้ไขข้อมูลใบสุ่มชั่งวัตถุดิบ (Editing Raw Material Record)</span>
            </span>
            <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full font-black">{editingRecord.rmCode}</span>
          </div>

          <div className="p-5 space-y-4">
            {/* 1. Production Info Card (Editing) */}
            <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-4 space-y-3">
              <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-700" />
                <span>ข้อมูลรายการวัตถุดิบ (Raw Material Info)</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">วันที่ (Date)</label>
                  <input 
                    type="date" 
                    required
                    value={toISODate(editingRecord.date)} 
                    onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">รหัสวัตถุดิบ (RM Code)</label>
                  <input 
                    type="text" 
                    required
                    value={editingRecord.rmCode}
                    onChange={(e) => setEditingRecord({ ...editingRecord, rmCode: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Batch ผู้ผลิต *</label>
                  <input 
                    type="text" 
                    required
                    value={editingRecord.batch} 
                    onChange={(e) => setEditingRecord({ ...editingRecord, batch: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">จำนวนที่ตรวจทั้งหมด (Kg.)</label>
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
              <label className="block text-xs font-bold text-slate-700">น้ำหนักเป้าหมายมาตรฐาน Standard Weight (Kg.)</label>
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
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {preset} Kg
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIsManualStandardWeight(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isManualStandardWeight
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  ระบุเอง (Manual)
                </button>
              </div>

              {isManualStandardWeight && (
                <div className="mt-2 flex items-center gap-2 max-w-xs animate-fadeIn">
                  <input
                    type="number"
                    step="any"
                    value={editingRecord.standardWeightKg}
                    onChange={(e) => setEditingRecord({ ...editingRecord, standardWeightKg: Number(e.target.value) })}
                    placeholder="กรอกน้ำหนักเป้าหมายมาตรฐาน..."
                    className="w-full px-3 py-1.5 text-xs border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:outline-none font-bold"
                  />
                  <span className="text-xs font-extrabold text-slate-500">Kg.</span>
                </div>
              )}
            </div>

            {/* 3. Container Type and Sample Size Pickers (Editing) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">ประเภทภาชนะ (Container Type)</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['ถุง', 'กระสอบ', 'ถัง', 'กรง', 'กล่อง', 'เบ๊าท์'].map((type) => {
                    const isSelected = containerType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setContainerType(type)}
                        className={`py-2 px-1 text-xs font-black rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-amber-100'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">จำนวนที่สุ่มตรวจ (Sample Size)</label>
                <div className="flex items-center gap-2">
                  <select
                    value={editSampleInputs.length}
                    onChange={(e) => handleEditSampleCountChange(Number(e.target.value))}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none font-bold text-slate-800 min-w-[120px]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((num) => (
                      <option key={num} value={num}>
                        สุ่มชั่ง {num} ชิ้น
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Input Weighing Grid (Editing) */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <span className="text-xs font-extrabold text-slate-700 block">แก้ไขน้ำหนักสุ่มรายขวด / รายชิ้น (Kg.)</span>
              <div className="grid grid-cols-3 sm:grid-cols-8 gap-2 bg-slate-100/50 p-3 rounded-xl border border-slate-200">
                {editSampleInputs.map((val, idx) => (
                  <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[9px] text-slate-400 font-extrabold block mb-1">ชิ้นที่ #{idx + 1}</span>
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
                      placeholder={`${editingRecord.standardWeightKg}`}
                      className="w-full text-center font-mono font-extrabold text-xs text-blue-700 border-b border-slate-100 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Metrics Analysis Summary (Editing) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 border-t border-slate-100 pt-3 items-stretch">
              {(() => {
                const parsedS = editSampleInputs.map(Number).filter(n => !isNaN(n) && n > 0);
                const avg = parsedS.length > 0 ? parsedS.reduce((a, b) => a + b, 0) / parsedS.length : 0;
                const variance = editingRecord.standardWeightKg > 0 ? Math.abs(avg - editingRecord.standardWeightKg) / editingRecord.standardWeightKg : 0;
                const calculatedPass = variance <= 0.015;

                return (
                  <>
                    <div className="md:col-span-8 bg-amber-50/10 border border-amber-100 p-4 rounded-xl grid grid-cols-3 gap-2 text-center">
                      <div className="border-r border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold block">จำนวน (Samples)</span>
                        <span className="text-sm font-black text-slate-800">{parsedS.length} ชิ้น</span>
                      </div>
                      <div className="border-r border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold block">น้ำหนักเฉลี่ยใหม่ (Average)</span>
                        <span className="text-sm font-black text-amber-700">{avg.toFixed(2)} kg</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">คลาดเคลื่อน (Variance)</span>
                        <span className="text-sm font-black text-orange-600">{(variance * 100).toFixed(2)}%</span>
                      </div>
                    </div>

                    <div className="md:col-span-4 bg-amber-50/20 border border-amber-200/50 p-4 rounded-xl flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">แก้ไขประเมินสถานะ</span>
                        <div className="flex gap-1">
                          {manualStatus === null ? (
                            <span className="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-1.5 py-0.5 rounded">Auto</span>
                          ) : (
                            <span className="text-[9px] bg-orange-100 text-orange-800 font-extrabold px-1.5 py-0.5 rounded">Manual</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setManualStatus('Pass')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                            (manualStatus === 'Pass' || (manualStatus === null && calculatedPass && parsedS.length > 0))
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          ผ่าน (Pass)
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualStatus('Fail')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                            (manualStatus === 'Fail' || (manualStatus === null && !calculatedPass && parsedS.length > 0))
                              ? 'bg-red-500 text-white border-red-500'
                              : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          ไม่ผ่าน (Fail)
                        </button>
                        {manualStatus !== null && (
                          <button
                            type="button"
                            onClick={() => setManualStatus(null)}
                            className="px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg"
                          >
                            คืนค่า
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 6. Footer Info Fields (Editing) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ตรวจสอบน้ำหนัก (Inspector)</label>
                <input 
                  type="text" 
                  value={editingRecord.inspector}
                  onChange={(e) => setEditingRecord({ ...editingRecord, inspector: e.target.value })}
                  placeholder="ชื่อ-นามสกุล ผู้ตรวจสอบ"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">บันทึกความเห็นเพิ่มเติม (Notes / Feedback)</label>
                <input 
                  type="text" 
                  value={editingRecord.note || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, note: e.target.value })}
                  placeholder="รายละเอียดสภาพถุงวัตถุดิบ หรือหมายเหตุความคลาดเคลื่อน..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Form actions (Editing) */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกแก้ไขข้อมูล</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* History table */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            placeholder="ค้นหาตามรหัสวัตถุดิบ หรือแบทช์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3">วันที่ชั่ง</th>
                <th className="p-3">รหัสวัตถุดิบ (RM)</th>
                <th className="p-3">Batch ผู้ผลิต</th>
                <th className="p-3 text-right">เป้าหมายมาตรฐาน (Std)</th>
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
                    key={`${r.id || 'rmw'}-${idx}`} 
                    onClick={() => startEdit(r)}
                    className="hover:bg-amber-50/30 cursor-pointer transition-colors group"
                    title="คลิกเพื่อแก้ไขข้อมูลแถวนี้"
                  >
                    <td className="p-3 font-mono text-slate-500">{formatDateBE(r.date)}</td>
                    <td className="p-3 font-bold text-slate-800 group-hover:text-amber-700 transition-colors">{r.rmCode}</td>
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
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {r.status === 'Pending' ? 'ยังไม่ได้สุ่มชั่ง' : r.status}
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
                            triggerConfirm('คุณแน่ใจว่าต้องการลบใบชั่งวัตถุดิบชิ้นนี้ใช่ไหม?', () => {
                              deleteRMWeight(r.id);
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
                    ไม่มีประวัติตรวจน้ำหนักวัตถุดิบในรายการ
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

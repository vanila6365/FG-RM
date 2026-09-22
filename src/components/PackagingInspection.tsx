import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PackagingInspection } from '../types';
import { Package, Search, Plus, Trash2, Edit2, AlertCircle, Save, CheckCircle } from 'lucide-react';
import { formatDateBE, sortNewestFirst } from '../utils';

export function PackagingInspectionView() {
  const { 
    packagingRecords, 
    addPackaging, 
    updatePackaging, 
    deletePackaging, 
    masterData, 
    userRole,
    triggerSuccess,
    triggerConfirm
  } = useApp();

  const [search, setSearch] = useState('');
  const [showAddForm, setShowForm] = useState(false);
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNo, setDocNo] = useState(() => 'PKG-' + Math.floor(1000 + Math.random() * 9000));
  const [fgCode, setFgCode] = useState('');
  const [batch, setBatch] = useState('');
  const [quantityKg, setQuantityKg] = useState<number | ''>('');
  const [customer, setCustomer] = useState('');
  const [status, setStatus] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [inspector, setInspector] = useState(() => localStorage.getItem('last_inspector_pkg') || '');

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<PackagingInspection | null>(null);

  // Suggestions state
  const [showCustSuggest, setShowCustSuggest] = useState(false);
  const [showFGSuggest, setShowFgSuggest] = useState(false);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fgCode.trim() || !batch.trim() || !quantityKg || !customer.trim()) {
      alert('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน');
      return;
    }

    if (inspector) {
      localStorage.setItem('last_inspector_pkg', inspector);
    }

    addPackaging({
      date,
      docNo,
      fgCode: fgCode.trim(),
      batch: batch.trim(),
      quantityKg: Number(quantityKg),
      customer: customer.trim(),
      inspector: inspector.trim() || 'QC Operator'
    });

    triggerSuccess('เพิ่มข้อมูลใบตรวจสอบแพ็คเกจ FG สำเร็จเรียบร้อย!');

    // Reset Form
    setDocNo('PKG-' + Math.floor(1000 + Math.random() * 9000));
    setFgCode('');
    setBatch('');
    setQuantityKg('');
    setCustomer('');
    setShowForm(false);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    updatePackaging(editingRecord);
    triggerSuccess('บันทึกการแก้ไขข้อมูลแพ็คเกจ FG สำเร็จเรียบร้อย!');
    setEditingRecord(null);
  };

  const filteredRecords = sortNewestFirst<PackagingInspection>(
    packagingRecords.filter(r => 
      String(r.docNo || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.fgCode || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.batch || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.customer || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center space-x-2 text-slate-800">
          <Package className="w-5 h-5 text-blue-600" />
          <h2 className="font-extrabold text-lg">1. ประวัติการตรวจสอบแพ็คเกจ Finished Goods (FG)</h2>
        </div>
        
        <button
          onClick={() => {
            setShowForm(!showAddForm);
            setEditingRecord(null);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'ปิดฟอร์ม' : 'บันทึกใบตรวจสอบใหม่'}</span>
        </button>
      </div>

      {/* Insertion Form */}
      {showAddForm && (
        <form onSubmit={handleCreateSubmit} className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
          <div className="md:col-span-3 border-b border-slate-200 pb-2 mb-1 flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-800">กรอกข้อมูลการตรวจสอบคุณภาพผลิตภัณฑ์</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">Auto-saves Master</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ (Date)</label>
            <input 
              type="date" 
              required
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่ใบตรวจสอบ (Doc No.)</label>
            <input 
              type="text" 
              required
              value={docNo} 
              onChange={(e) => setDocNo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono font-bold" 
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อกาว / ผลิตภัณฑ์ (FG Code)</label>
            <input 
              type="text" 
              required
              value={fgCode}
              onFocus={() => setShowFgSuggest(true)}
              onBlur={() => setTimeout(() => setShowFgSuggest(false), 200)}
              onChange={(e) => setFgCode(e.target.value)}
              placeholder="พิมพ์ค้นหาหรือกรอกใหม่..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" 
            />
            {showFGSuggest && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                {masterData.fgCodes
                  .filter(c => c.toLowerCase().includes(fgCode.toLowerCase()))
                  .map(code => (
                    <button
                      key={code}
                      type="button"
                      onMouseDown={() => setFgCode(code)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      {code}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot การผลิต</label>
            <input 
              type="text" 
              required
              value={batch} 
              onChange={(e) => setBatch(e.target.value)}
              placeholder="e.g. 260907A"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ปริมาณตรวจสอบ (Quantity Kg.)</label>
            <input 
              type="number" 
              required
              min={1}
              value={quantityKg} 
              onChange={(e) => setQuantityKg(e.target.value ? Number(e.target.value) : '')}
              placeholder="1500"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" 
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อลูกค้า (Customer)</label>
            <input 
              type="text" 
              required
              value={customer}
              onFocus={() => setShowCustSuggest(true)}
              onBlur={() => setTimeout(() => setShowCustSuggest(false), 200)}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="พิมพ์ค้นหาหรือกรอกใหม่..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" 
            />
            {showCustSuggest && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                {masterData.customers
                  .filter(c => c.toLowerCase().includes(customer.toLowerCase()))
                  .map(cust => (
                    <button
                      key={cust}
                      type="button"
                      onMouseDown={() => setCustomer(cust)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      {cust}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ตรวจสอบ (Inspector)</label>
            <input 
              type="text" 
              value={inspector} 
              onChange={(e) => setInspector(e.target.value)}
              placeholder="QC Name"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" 
            />
          </div>

          <div className="md:col-span-3 flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/10 transition"
            >
              บันทึกส่งข้อมูล
            </button>
          </div>
        </form>
      )}

      {/* Editing Form */}
      {editingRecord && (
        <form onSubmit={handleUpdateSubmit} className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
          <div className="md:col-span-3 border-b border-amber-200 pb-2 mb-1 flex items-center justify-between">
            <span className="text-sm font-extrabold text-amber-900">แก้ไขข้อมูลการตรวจสอบ ({editingRecord.docNo})</span>
            <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">Admin Privileges</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ (Date)</label>
            <input 
              type="date" 
              required
              value={editingRecord.date} 
              onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่ใบตรวจสอบ</label>
            <input 
              type="text" 
              required
              value={editingRecord.docNo} 
              onChange={(e) => setEditingRecord({ ...editingRecord, docNo: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 font-mono font-bold" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อกาว / ผลิตภัณฑ์ (FG Code)</label>
            <input 
              type="text" 
              required
              value={editingRecord.fgCode} 
              onChange={(e) => setEditingRecord({ ...editingRecord, fgCode: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot</label>
            <input 
              type="text" 
              required
              value={editingRecord.batch} 
              onChange={(e) => setEditingRecord({ ...editingRecord, batch: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 font-mono" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ปริมาณตรวจสอบ (Kg.)</label>
            <input 
              type="number" 
              required
              value={editingRecord.quantityKg} 
              onChange={(e) => setEditingRecord({ ...editingRecord, quantityKg: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อลูกค้า (Customer)</label>
            <input 
              type="text" 
              required
              value={editingRecord.customer} 
              onChange={(e) => setEditingRecord({ ...editingRecord, customer: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ตรวจสอบ (Inspector)</label>
            <input 
              type="text" 
              value={editingRecord.inspector} 
              onChange={(e) => setEditingRecord({ ...editingRecord, inspector: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-200" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">สถานะ (Status)</label>
            <select 
              value={editingRecord.status}
              onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="Pass">Pass (ผ่านเกณฑ์)</option>
              <option value="Fail">Fail (ตกเกณฑ์)</option>
              <option value="Pending">Pending (รอตรวจสอบซ้ำ)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex justify-end space-x-2 pt-2 border-t border-amber-200">
            <button
              type="button"
              onClick={() => setEditingRecord(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/10 transition"
            >
              บันทึกการแก้ไข
            </button>
          </div>
        </form>
      )}

      {/* Filter and Table */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            placeholder="ค้นหาตามชื่อกล่อง, ลูกค้า, หรือเลขที่บิล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3">Doc No</th>
                <th className="p-3">วันที่ (Date)</th>
                <th className="p-3">ชื่อผลิตภัณฑ์ (FG)</th>
                <th className="p-3">Batch</th>
                <th className="p-3 text-right">ปริมาณ (Kg.)</th>
                <th className="p-3">ลูกค้า (Customer)</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r, idx) => (
                  <tr 
                    key={`${r.id || 'pkg'}-${idx}`} 
                    onClick={() => {
                      setEditingRecord(r);
                      setShowForm(false);
                    }}
                    className="hover:bg-amber-50/30 cursor-pointer transition-colors group"
                    title="คลิกเพื่อแก้ไขข้อมูลแถวนี้"
                  >
                    <td className="p-3 font-mono font-bold text-blue-600 group-hover:text-amber-700 transition-colors">{r.docNo}</td>
                    <td className="p-3 text-slate-500 font-mono">{formatDateBE(r.date)}</td>
                    <td className="p-3 font-bold text-slate-800">{r.fgCode}</td>
                    <td className="p-3 font-mono">{r.batch}</td>
                    <td className="p-3 text-right font-bold">{r.quantityKg.toLocaleString()}</td>
                    <td className="p-3 text-slate-600">{r.customer}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        r.status === 'Pass' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : r.status === 'Fail' 
                          ? 'bg-red-50 text-red-700 border border-red-100' 
                          : 'bg-slate-50 text-slate-700 border border-slate-100'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingRecord(r);
                            setShowForm(false);
                          }}
                          className="p-1 rounded bg-slate-50 text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            triggerConfirm('คุณแน่ใจว่าต้องการลบใบตรวจสอบแพ็คเกจ FG ใบนี้ใช่ไหม?', () => {
                              deletePackaging(r.id);
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
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs font-semibold">
                    ไม่มีประวัติการตรวจสอบแพ็คเกจในรายการ
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

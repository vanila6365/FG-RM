import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RawMaterialReceiving } from '../types';
import { Truck, Search, Plus, Trash2, Edit2, AlertCircle, Save, CheckCircle } from 'lucide-react';
import { formatDateBE, sortNewestFirst, toISODate } from '../utils';

export function RawMaterialReceivingView() {
  const { 
    rmReceivingRecords, 
    addRMReceiving, 
    updateRMReceiving, 
    deleteRMReceiving, 
    masterData, 
    userRole,
    triggerSuccess,
    triggerConfirm
  } = useApp();

  const [search, setSearch] = useState('');
  const [showAddForm, setShowForm] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNo, setDocNo] = useState(() => 'RMR-' + Math.floor(1000 + Math.random() * 9000));
  const [rmCode, setRmCode] = useState('');
  const [batch, setBatch] = useState('');
  const [deliveryNo, setDeliveryNo] = useState('');
  const [poNo, setPoNo] = useState('');
  const [quantityKg, setQuantityKg] = useState<number | ''>('');
  const [supplier, setSupplier] = useState('');
  const [inspector, setInspector] = useState(() => localStorage.getItem('last_inspector_rmr') || '');

  // Suggestions state
  const [showRMSuggest, setShowRmSuggest] = useState(false);
  const [showSupSuggest, setShowSupSuggest] = useState(false);

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<RawMaterialReceiving | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmCode.trim() || !batch.trim() || !quantityKg || !supplier.trim()) {
      alert('กรุณากรอกข้อมูลวัตถุดิบ บล็อกเกอร์ ผู้ผลิต และจำนวนทั้งหมด');
      return;
    }

    if (inspector) {
      localStorage.setItem('last_inspector_rmr', inspector);
    }

    addRMReceiving({
      date,
      docNo,
      rmCode: rmCode.trim(),
      batch: batch.trim(),
      deliveryNo: deliveryNo.trim(),
      poNo: poNo.trim(),
      quantityKg: Number(quantityKg),
      supplier: supplier.trim(),
      inspector: inspector.trim() || 'QC Operator'
    });

    triggerSuccess('เพิ่มใบตรวจรับวัตถุดิบนำเข้าสำเร็จเรียบร้อย!');

    setDocNo('RMR-' + Math.floor(1000 + Math.random() * 9000));
    setRmCode('');
    setBatch('');
    setDeliveryNo('');
    setPoNo('');
    setQuantityKg('');
    setSupplier('');
    setShowForm(false);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    updateRMReceiving(editingRecord);
    triggerSuccess('บันทึกการแก้ไขใบตรวจรับวัตถุดิบสำเร็จเรียบร้อย!');
    setEditingRecord(null);
  };

  const filteredRecords = sortNewestFirst<RawMaterialReceiving>(
    rmReceivingRecords.filter(r => 
      String(r.docNo || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.rmCode || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.batch || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.supplier || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center space-x-2 text-slate-800">
          <Truck className="w-5 h-5 text-purple-600" />
          <h2 className="font-extrabold text-lg">3. ใบรับตรวจสอบวัตถุดิบนำเข้า (Raw Materials Receiving)</h2>
        </div>
        
        <button
          onClick={() => {
            setShowForm(!showAddForm);
            setEditingRecord(null);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'ปิดฟอร์ม' : 'บันทึกใบตรวจรับวัตถุดิบ'}</span>
        </button>
      </div>

      {/* Creation form */}
      {showAddForm && (
        <form onSubmit={handleCreateSubmit} className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
          <div className="md:col-span-3 border-b border-slate-200 pb-2 mb-1 flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-800">กรอกข้อมูลวัตถุดิบนำเข้าและตรวจสอบสภาพถุง</span>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">Auto-saves Master</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ตรวจรับ (Date)</label>
            <input 
              type="date" 
              required
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่ใบตรวจรับ (Doc No.)</label>
            <input 
              type="text" 
              required
              value={docNo} 
              onChange={(e) => setDocNo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100 font-mono font-bold" 
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1">รหัสวัตถุดิบ (RM Code)</label>
            <input 
              type="text" 
              required
              value={rmCode}
              onFocus={() => setShowRmSuggest(true)}
              onBlur={() => setTimeout(() => setShowRmSuggest(false), 200)}
              onChange={(e) => setRmCode(e.target.value)}
              placeholder="ค้นหารหัสวัตถุดิบ..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100" 
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
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      {code}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot ผู้ผลิต</label>
            <input 
              type="text" 
              required
              value={batch} 
              onChange={(e) => setBatch(e.target.value)}
              placeholder="B-SCG-9031"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100 font-mono" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่ใบขนส่ง (Delivery Note No)</label>
            <input 
              type="text" 
              value={deliveryNo} 
              onChange={(e) => setDeliveryNo(e.target.value)}
              placeholder="DN-xxxxx"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่ใบสั่งซื้อ (P/O No.)</label>
            <input 
              type="text" 
              value={poNo} 
              onChange={(e) => setPoNo(e.target.value)}
              placeholder="PO-xxxx"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">น้ำหนักรับเข้าทั้งหมด (Quantity Kg.)</label>
            <input 
              type="number" 
              required
              value={quantityKg} 
              onChange={(e) => setQuantityKg(e.target.value ? Number(e.target.value) : '')}
              placeholder="5000"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100" 
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1">ผู้จัดจำหน่าย / ผู้ขาย (Supplier)</label>
            <input 
              type="text" 
              required
              value={supplier}
              onFocus={() => setShowSupSuggest(true)}
              onBlur={() => setTimeout(() => setShowSupSuggest(false), 200)}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="พิมพ์ชื่อผู้จัดจำหน่าย..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100" 
            />
            {showSupSuggest && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                {masterData.suppliers
                  .filter(s => s.toLowerCase().includes(supplier.toLowerCase()))
                  .map(sup => (
                    <button
                      key={sup}
                      type="button"
                      onMouseDown={() => setSupplier(sup)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      {sup}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ผู้บันทึกตรวจรับ (Inspector)</label>
            <input 
              type="text" 
              value={inspector} 
              onChange={(e) => setInspector(e.target.value)}
              placeholder="QC Name"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-100" 
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
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/10 transition"
            >
              บันทึกตรวจรับวัตถุดิบ
            </button>
          </div>
        </form>
      )}

      {/* Editing Form */}
      {editingRecord && (
        <form onSubmit={handleUpdateSubmit} className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
          <div className="md:col-span-3 border-b border-amber-200 pb-2 mb-1 flex items-center justify-between">
            <span className="text-sm font-extrabold text-amber-900">แก้ไขใบตรวจรับวัตถุดิบ ({editingRecord.docNo})</span>
            <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">Admin Privileges</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ (Date)</label>
            <input 
              type="date" 
              required
              value={toISODate(editingRecord.date)} 
              onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่ใบตรวจสอบ</label>
            <input 
              type="text" 
              required
              value={editingRecord.docNo} 
              onChange={(e) => setEditingRecord({ ...editingRecord, docNo: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-mono" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">รหัสวัตถุดิบ (RM Code)</label>
            <input 
              type="text" 
              required
              value={editingRecord.rmCode} 
              onChange={(e) => setEditingRecord({ ...editingRecord, rmCode: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot ผู้ผลิต</label>
            <input 
              type="text" 
              required
              value={editingRecord.batch} 
              onChange={(e) => setEditingRecord({ ...editingRecord, batch: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-mono" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Delivery No</label>
            <input 
              type="text" 
              value={editingRecord.deliveryNo} 
              onChange={(e) => setEditingRecord({ ...editingRecord, deliveryNo: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">P/O No</label>
            <input 
              type="text" 
              value={editingRecord.poNo} 
              onChange={(e) => setEditingRecord({ ...editingRecord, poNo: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ปริมาณนำเข้า (Kg.)</label>
            <input 
              type="number" 
              required
              value={editingRecord.quantityKg} 
              onChange={(e) => setEditingRecord({ ...editingRecord, quantityKg: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ผู้จัดจำหน่าย (Supplier)</label>
            <input 
              type="text" 
              required
              value={editingRecord.supplier} 
              onChange={(e) => setEditingRecord({ ...editingRecord, supplier: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ผู้ตรวจสอบ</label>
            <input 
              type="text" 
              value={editingRecord.inspector} 
              onChange={(e) => setEditingRecord({ ...editingRecord, inspector: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">สถานะ (Status)</label>
            <select 
              value={editingRecord.status}
              onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value as any })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
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
            placeholder="ค้นหาตามชื่อวัตถุดิบ, ผู้ผลิต, หรือเลขที่ตรวจรับ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3">Doc No</th>
                <th className="p-3">วันที่ตรวจรับ</th>
                <th className="p-3">ชื่อวัตถุดิบ (RM)</th>
                <th className="p-3">Batch ผู้ผลิต</th>
                <th className="p-3">Delivery / PO No.</th>
                <th className="p-3 text-right">ปริมาณ (Kg.)</th>
                <th className="p-3">ผู้จัดจำหน่าย (Supplier)</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r, idx) => (
                  <tr 
                    key={`${r.id || 'rmr'}-${idx}`} 
                    onClick={() => {
                      setEditingRecord({ ...r, date: toISODate(r.date) });
                      setShowForm(false);
                    }}
                    className="hover:bg-amber-50/30 cursor-pointer transition-colors group"
                    title="คลิกเพื่อแก้ไขข้อมูลแถวนี้"
                  >
                    <td className="p-3 font-mono font-bold text-purple-600 group-hover:text-amber-700 transition-colors">{r.docNo}</td>
                    <td className="p-3 text-slate-500 font-mono">{formatDateBE(r.date)}</td>
                    <td className="p-3 font-bold text-slate-800">{r.rmCode}</td>
                    <td className="p-3 font-mono">{r.batch}</td>
                    <td className="p-3 font-mono text-xs text-slate-500">
                      {r.deliveryNo || '-'}{r.poNo ? ` / ${r.poNo}` : ''}
                    </td>
                    <td className="p-3 text-right font-bold">{r.quantityKg.toLocaleString()}</td>
                    <td className="p-3 text-slate-600">{r.supplier}</td>
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
                            setEditingRecord({ ...r, date: toISODate(r.date) });
                            setShowForm(false);
                          }}
                          className="p-1 rounded bg-slate-50 text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            triggerConfirm('คุณแน่ใจว่าต้องการลบใบตรวจรับวัตถุดิบชิ้นนี้ใช่ไหม?', () => {
                              deleteRMReceiving(r.id);
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
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs font-semibold">
                    ไม่มีใบรับตรวจวัตถุดิบนำเข้าในรายการ
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

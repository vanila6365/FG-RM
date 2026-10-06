import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ExpDateRecord } from '../types';
import { CalendarRange, Search, Plus, Trash2, Edit2, AlertCircle, Save, CheckCircle } from 'lucide-react';
import { formatDateBE, sortNewestFirst, toISODate } from '../utils';

export function ExpDateView() {
  const { 
    expDateRecords, 
    addExpDate, 
    updateExpDate, 
    deleteExpDate, 
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
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');
  const [note, setNote] = useState('');
  const [inspector, setInspector] = useState(() => localStorage.getItem('last_inspector_exp') || '');

  // Suggestions state
  const [showRMSuggest, setShowRmSuggest] = useState(false);

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<ExpDateRecord | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmCode.trim() || !batch.trim() || !mfgDate || !expDate) {
      alert('กรุณากรอกข้อมูลวันที่ผลิตและวันที่หมดอายุให้ครบถ้วน');
      return;
    }

    if (inspector) {
      localStorage.setItem('last_inspector_exp', inspector);
    }

    addExpDate({
      date,
      rmCode: rmCode.trim(),
      batch: batch.trim(),
      mfgDate,
      expDate,
      note: note.trim(),
      inspector: inspector.trim() || 'QC Operator'
    });

    triggerSuccess('เพิ่มใบควบคุมอายุสารเคมีสำเร็จเรียบร้อย!');

    setRmCode('');
    setBatch('');
    setMfgDate('');
    setExpDate('');
    setNote('');
    setShowForm(false);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    updateExpDate(editingRecord);
    triggerSuccess('บันทึกการแก้ไขอายุสารเคมีสำเร็จเรียบร้อย!');
    setEditingRecord(null);
  };

  const getDaysRemaining = (expDateStr: string): number => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expDateStr);
    exp.setHours(0,0,0,0);
    const diff = exp.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const filteredRecords = sortNewestFirst<ExpDateRecord>(
    expDateRecords.filter(r => 
      String(r.rmCode || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.batch || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center space-x-2 text-slate-800">
          <CalendarRange className="w-5 h-5 text-rose-600" />
          <h2 className="font-extrabold text-lg">5. ระบบตรวจสอบและควบคุมอายุสารเคมีวัตถุดิบ (Expiry Control)</h2>
        </div>
        
        <button
          onClick={() => {
            setShowForm(!showAddForm);
            setEditingRecord(null);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'ปิดฟอร์ม' : 'คีย์บันทึกหมดอายุสารเคมี'}</span>
        </button>
      </div>

      {/* Creation form */}
      {showAddForm && (
        <form onSubmit={handleCreateSubmit} className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
          <div className="md:col-span-3 border-b border-slate-200 pb-2 mb-1 flex items-center justify-between">
            <span className="text-sm font-extrabold text-slate-800">คีย์ประวัติสารเคมี (วัตถุดิบ) บันทึกอายุใช้งาน</span>
            <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">FEFO Control</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วันที่คีย์ (Record Date)</label>
            <input 
              type="date" 
              required
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-100" 
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1">รหัสสารเคมี (RM Code)</label>
            <input 
              type="text" 
              required
              value={rmCode}
              onFocus={() => setShowRmSuggest(true)}
              onBlur={() => setTimeout(() => setShowRmSuggest(false), 200)}
              onChange={(e) => setRmCode(e.target.value)}
              placeholder="รหัสวัตถุดิบเคมี..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-100" 
            />
            {showRMSuggest && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Lot / Batch ของผู้ผลิต</label>
            <input 
              type="text" 
              required
              value={batch} 
              onChange={(e) => setBatch(e.target.value)}
              placeholder="B-SCG-9031"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-100 font-mono" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ผลิต (MFG Date)</label>
            <input 
              type="date" 
              required
              value={mfgDate} 
              onChange={(e) => setMfgDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-100" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วันหมดอายุ (EXP Date)</label>
            <input 
              type="date" 
              required
              value={expDate} 
              onChange={(e) => setExpDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-100" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ผู้บันทึก (Inspector)</label>
            <input 
              type="text" 
              value={inspector} 
              onChange={(e) => setInspector(e.target.value)}
              placeholder="Operator Name"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-100" 
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">บันทึกเพิ่มเติม (Note)</label>
            <input 
              type="text" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. สภาพถุงเรียบร้อย ซีลหนาแน่น..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-100"
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
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/10 transition"
            >
              บันทึกคีย์ข้อมูล
            </button>
          </div>
        </form>
      )}

      {/* Editing Form */}
      {editingRecord && (
        <form onSubmit={handleUpdateSubmit} className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
          <div className="md:col-span-3 border-b border-amber-200 pb-2 mb-1 flex items-center justify-between">
            <span className="text-sm font-extrabold text-amber-900">แก้ไขวันหมดอายุวัตถุดิบ ({editingRecord.rmCode})</span>
            <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">Admin Privileges</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">รหัสวัตถุดิบ</label>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">วันที่ผลิต (MFG)</label>
            <input 
              type="date" 
              required
              value={toISODate(editingRecord.mfgDate)} 
              onChange={(e) => setEditingRecord({ ...editingRecord, mfgDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">วันหมดอายุ (EXP)</label>
            <input 
              type="date" 
              required
              value={toISODate(editingRecord.expDate)} 
              onChange={(e) => setEditingRecord({ ...editingRecord, expDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-bold text-red-600" 
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

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ (Note)</label>
            <input 
              type="text" 
              value={editingRecord.note || ''} 
              onChange={(e) => setEditingRecord({ ...editingRecord, note: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white" 
            />
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
            placeholder="ค้นหาตามชื่อวัตถุดิบ หรือแบทช์ผู้ผลิต..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3">วันที่คีย์</th>
                <th className="p-3">รหัสวัตถุดิบ (RM)</th>
                <th className="p-3">Batch ผู้ผลิต</th>
                <th className="p-3 font-mono">MFG Date</th>
                <th className="p-3 font-mono">EXP Date</th>
                <th className="p-3 text-right">วันคงเหลือ</th>
                <th className="p-3">สถานะอายุ</th>
                <th className="p-3">หมายเหตุ</th>
                <th className="p-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r, idx) => {
                  const days = r.expDate ? getDaysRemaining(r.expDate) : null;
                  return (
                    <tr 
                      key={`${r.id || 'exp'}-${idx}`} 
                      onClick={() => {
                        setEditingRecord({ 
                          ...r, 
                          date: toISODate(r.date),
                          mfgDate: toISODate(r.mfgDate),
                          expDate: toISODate(r.expDate)
                        });
                        setShowForm(false);
                      }}
                      className="hover:bg-amber-50/30 cursor-pointer transition-colors group"
                      title="คลิกเพื่อแก้ไขข้อมูลแถวนี้"
                    >
                      <td className="p-3 font-mono text-slate-500">{formatDateBE(r.date)}</td>
                      <td className="p-3 font-bold text-slate-800 group-hover:text-amber-700 transition-colors">{r.rmCode}</td>
                      <td className="p-3 font-mono text-slate-600">{r.batch}</td>
                      <td className="p-3 font-mono">{r.mfgDate ? formatDateBE(r.mfgDate) : <span className="text-slate-400 font-semibold text-xs">รอกรอกข้อมูล</span>}</td>
                      <td className="p-3 font-mono font-bold text-red-600">{r.expDate ? formatDateBE(r.expDate) : <span className="text-slate-400 font-semibold text-xs">รอกรอกข้อมูล</span>}</td>
                      <td className="p-3 text-right font-black">
                        {days !== null && !isNaN(days) ? (
                          days > 0 ? (
                            <span className={days <= 120 ? 'text-amber-600' : 'text-slate-800'}>
                              {days} วัน
                            </span>
                          ) : (
                            <span className="text-red-600 font-black">หมดอายุ</span>
                          )
                        ) : (
                          <span className="text-slate-400 font-semibold text-xs">รอกรอกข้อมูล</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          r.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : r.status === 'Near Expiry' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' 
                            : r.status === 'Pending'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {r.status === 'Pending' ? 'รอกรอกข้อมูล' : r.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-500 truncate max-w-xs">{r.note || '-'}</td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex space-x-1">
                          <button
                            onClick={() => {
                              setEditingRecord({ 
                                ...r, 
                                date: toISODate(r.date),
                                mfgDate: toISODate(r.mfgDate),
                                expDate: toISODate(r.expDate)
                              });
                              setShowForm(false);
                            }}
                            className="p-1 rounded bg-slate-50 text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              triggerConfirm('คุณแน่ใจว่าต้องการลบใบอายุสารเคมีชิ้นนี้ใช่ไหม?', () => {
                                deleteExpDate(r.id);
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs font-semibold">
                    ไม่มีสารเคมีลงทะเบียนวันหมดอายุในรายการ
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

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Database, Plus, Search, Building, Layers, Truck, FileText, Lock } from 'lucide-react';
import { MasterData } from '../types';

type MasterKey = keyof MasterData;

export function MasterDataView() {
  const { masterData, addMasterItem, userRole } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<MasterKey>('customers');
  const [search, setSearch] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    addMasterItem(activeSubTab, newValue.trim());
    setNewValue('');
  };

  const getSubTabName = (key: MasterKey): string => {
    switch (key) {
      case 'customers': return 'รายชื่อลูกค้า (Customers)';
      case 'fgCodes': return 'รหัสกาว / ผลิตภัณฑ์ (FG Codes)';
      case 'rmCodes': return 'รหัสวัตถุดิบ (RM Codes)';
      case 'suppliers': return 'ผู้จัดจำหน่าย (Suppliers)';
    }
  };

  const currentList = masterData[activeSubTab] || [];
  const filteredList = currentList.filter(item => 
    item.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-2 text-slate-800">
          <Database className="w-5 h-5 text-blue-600" />
          <h2 className="font-extrabold text-lg">ฐานข้อมูลระบบหลัก (Master Data Management)</h2>
        </div>
        <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
          สกัดอัตโนมัติจากข้อมูลธุรกรรมจริง
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['customers', 'fgCodes', 'rmCodes', 'suppliers'] as MasterKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveSubTab(tab);
              setSearch('');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === tab 
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-inner' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {getSubTabName(tab)}
          </button>
        ))}
      </div>

      {/* Manual Insert for Admins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-800">
            เพิ่มข้อมูลลงใน {getSubTabName(activeSubTab)} ล่วงหน้า
          </h3>
          
          {userRole === 'Admin' ? (
            <form onSubmit={handleAddNewItem} className="flex gap-2">
              <input 
                type="text" 
                required
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`กรอก ${getSubTabName(activeSubTab)} ใหม่...`}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
              >
                เพิ่มเข้าฐานข้อมูล
              </button>
            </form>
          ) : (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center space-x-2 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>ต้องการสิทธิ์ผู้ดูแลระบบ (Admin Mode) เพื่อเพิ่มข้อมูลหลักล่วงหน้าโดยตรง</span>
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder={`ค้นหารายการในแท็บนี้...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Master List Grid display */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-3">
          <h4 className="text-xs font-extrabold text-slate-700 flex items-center space-x-1.5 border-b border-slate-200 pb-2">
            <span>รายการ {getSubTabName(activeSubTab)} ทั้งหมด ({filteredList.length})</span>
          </h4>
          
          {filteredList.length > 0 ? (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-200/80 pr-1">
              {filteredList.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs text-slate-800">
                  <span className="font-bold">{item}</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/60">
                    Active
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">
              ไม่มีข้อมูลที่สอดคล้องกับการค้นหา
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

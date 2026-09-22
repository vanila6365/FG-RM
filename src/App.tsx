import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { PackagingInspectionView } from './components/PackagingInspection';
import { FGWeightCheckView } from './components/FGWeightCheck';
import { RawMaterialReceivingView } from './components/RawMaterialReceiving';
import { RMWeightCheckView } from './components/RMWeightCheck';
import { ExpDateView } from './components/ExpDate';
import { MasterDataView } from './components/MasterData';
import { AppsScriptSetup } from './components/AppsScriptSetup';
import { GlobalNotification } from './components/GlobalNotification';
import { 
  LayoutDashboard, 
  Package, 
  Scale, 
  Truck, 
  CalendarRange, 
  Database, 
  Settings, 
  CheckSquare,
  Network,
  AlertCircle
} from 'lucide-react';

function AppContent() {
  const { 
    activeTab,
    setActiveTab,
    packagingRecords, 
    fgWeightRecords, 
    rmReceivingRecords, 
    rmWeightRecords, 
    expDateRecords,
    isConnected,
    connectionError,
    setConnectionError
  } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onViewTab={(tab) => setActiveTab(tab)} />;
      case 'packaging':
        return <PackagingInspectionView />;
      case 'fg_weight':
        return <FGWeightCheckView />;
      case 'rm_receiving':
        return <RawMaterialReceivingView />;
      case 'rm_weight':
        return <RMWeightCheckView />;
      case 'exp_date':
        return <ExpDateView />;
      case 'master_data':
        return <MasterDataView />;
      case 'setup':
        return <AppsScriptSetup />;
      default:
        return <Dashboard onViewTab={(tab) => setActiveTab(tab)} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard, count: null },
    { id: 'packaging', label: '1. ตรวจสอบแพ็คเกจ FG', icon: Package, count: packagingRecords.length },
    { id: 'fg_weight', label: '2. สุ่มชั่ง นน. FG', icon: Scale, count: fgWeightRecords.length },
    { id: 'rm_receiving', label: '3. ตรวจรับวัตถุดิบ (RM)', icon: Truck, count: rmReceivingRecords.length },
    { id: 'rm_weight', label: '4. สุ่มชั่ง นน. RM', icon: Scale, count: rmWeightRecords.length },
    { id: 'exp_date', label: '5. คุมอายุเคมี (EXP)', icon: CalendarRange, count: expDateRecords.length },
    { id: 'master_data', label: 'ฐานข้อมูลหลัก (Master)', icon: Database, count: null },
    { id: 'setup', label: 'ตั้งค่า Google Sheets', icon: Settings, count: null },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-800">
      {/* Universal header with Admin PIN, synchronization, and brand titles */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* Dynamic connection error banner to gracefully handle Google Sheets 404 errors */}
        {connectionError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs animate-fadeIn">
            <div className="flex items-start space-x-3 text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-sm text-red-900">ตรวจพบปัญหากับการเชื่อมต่อ Google Sheets (HTTP Error หรือ API ขัดข้อง)</h4>
                <p className="text-xs text-red-700 mt-1 leading-relaxed font-medium">
                  สเปรดชีตตอบกลับด้วยข้อผิดพลาด: <span className="font-mono bg-red-100/80 px-1 py-0.5 rounded text-red-900 font-bold">{connectionError}</span> • เพื่อความปลอดภัย ระบบได้สลับไปรันในโหมดออฟไลน์ (Local) เพื่อไม่ให้ข้อมูลของคุณสูญหายชั่วคราวเรียบร้อยแล้วค่ะ
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                onClick={() => setActiveTab('setup')}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
              >
                แก้ไขการตั้งค่า API
              </button>
              <button
                onClick={() => setConnectionError(null)}
                className="w-full sm:w-auto px-3 py-2 border border-red-200 hover:bg-red-100 text-red-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ละเว้น
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="bg-white border border-slate-200 p-2 rounded-2xl shadow-xs flex flex-wrap gap-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.count !== null && (
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-blue-800/60 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Inner View */}
        <div className="animate-fadeIn">
          {renderActiveView()}
        </div>

      </main>

      {/* System Footer Status indicator */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-7xl w-full mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 font-medium gap-2">
          <div className="flex items-center space-x-1">
            <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
            <span>ระบบตรวจน้ำหนักและคุมคุณภาพเคมี FG & RM v2.1.0 • พัฒนาด้วย React และ Tailwind</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>สถานะระบบ: {isConnected ? 'เชื่อมต่อ Google Sheets ออนไลน์' : 'โหมดการคีย์แบบออฟไลน์ (เซฟข้อมูลในเบราว์เซอร์)'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <GlobalNotification />
    </AppProvider>
  );
}

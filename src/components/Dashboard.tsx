import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Package, 
  Scale, 
  Truck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  CalendarRange 
} from 'lucide-react';

export function Dashboard() {
  const { 
    packagingRecords, 
    fgWeightRecords, 
    rmReceivingRecords, 
    rmWeightRecords, 
    expDateRecords, 
    userRole, 
    isConnected,
    setActiveTab,
    setFgWeightFilterPendingOnly
  } = useApp();

  // 1. Packaging Inspection Summary
  const totalPkg = packagingRecords.length;
  const passedPkg = packagingRecords.filter(r => r.status === 'Pass').length;
  const failedPkg = packagingRecords.filter(r => r.status === 'Fail').length;
  const pendingPkg = packagingRecords.filter(r => r.status === 'Pending').length;
  const pkgPassRate = totalPkg > 0 ? Math.round((passedPkg / (totalPkg - pendingPkg || 1)) * 100) : 0;

  // 2. FG Weight Summary
  const totalFGW = fgWeightRecords.length;
  const passedFGW = fgWeightRecords.filter(r => r.status === 'Pass').length;
  const failedFGW = fgWeightRecords.filter(r => r.status === 'Fail').length;
  const pendingFGW = fgWeightRecords.filter(r => r.status === 'Pending').length;

  // 3. RM Receiving Summary
  const totalRM = rmReceivingRecords.length;
  const passedRM = rmReceivingRecords.filter(r => r.status === 'Pass').length;
  const failedRM = rmReceivingRecords.filter(r => r.status === 'Fail').length;
  const pendingRM = rmReceivingRecords.filter(r => r.status === 'Pending').length;

  // 4. RM Weight Summary
  const totalRMW = rmWeightRecords.length;
  const passedRMW = rmWeightRecords.filter(r => r.status === 'Pass').length;
  const failedRMW = rmWeightRecords.filter(r => r.status === 'Fail').length;
  const pendingRMW = rmWeightRecords.filter(r => r.status === 'Pending').length;

  // 5. Expiry Dates Alarm
  const totalExp = expDateRecords.length;
  const expiredCount = expDateRecords.filter(r => r.status === 'Expired').length;
  const nearExpiryCount = expDateRecords.filter(r => r.status === 'Near Expiry').length;
  const activeCount = expDateRecords.filter(r => r.status === 'Active').length;
  const pendingExp = expDateRecords.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Alert Bar for General Users */}
      {userRole === 'General' && (
        <div className="bg-blue-50 border border-blue-200/60 rounded-2xl p-4 flex items-start space-x-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sm text-blue-900">General User Mode (เข้าสู่ระบบทั่วไป)</h4>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
              คุณสามารถกรอกแบบฟอร์มบันทึกข้อมูลการตรวจสอบใหม่ได้ทุกหัวข้อ แต่<strong>จะไม่สามารถทำการแก้ไขหรือลบรายการประวัติย้อนหลังได้</strong> หากต้องการแก้ไขข้อผิดพลาด กรุณาติดต่อหัวหน้างานหรือเข้าสู่ระบบในฐานะ Admin (สัญลักษณ์ "Admin Login" มุมขวาบน พินเริ่มต้น: 1234)
            </p>
          </div>
        </div>
      )}

      {/* Grid counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: FG Packaging */}
        <div 
          onClick={() => setActiveTab('packaging')}
          className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs cursor-pointer hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. ตรวจสอบแพ็คเกจ FG</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalPkg}</span>
            <span className="text-xs font-medium text-slate-400">รายการ</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1 text-center border-t border-slate-100 pt-3">
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">ผ่าน</span>
              <span className="text-xs font-extrabold text-emerald-600">{passedPkg}</span>
            </div>
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">ตกเกณฑ์</span>
              <span className="text-xs font-extrabold text-red-600">{failedPkg}</span>
            </div>
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">รอดำเนินการ</span>
              <span className="text-xs font-extrabold text-slate-500">{pendingPkg}</span>
            </div>
          </div>
        </div>

        {/* Card 2: FG Weight */}
        <div 
          onClick={() => {
            setFgWeightFilterPendingOnly(false);
            setActiveTab('fg_weight');
          }}
          className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs cursor-pointer hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. ตรวจสอบน้ำหนัก FG</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalFGW}</span>
            <span className="text-xs font-medium text-slate-400">รายการ</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1 text-center border-t border-slate-100 pt-3">
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">ปกติ</span>
              <span className="text-xs font-extrabold text-emerald-600">{passedFGW}</span>
            </div>
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">ผิดปกติ</span>
              <span className="text-xs font-extrabold text-red-600">{failedFGW}</span>
            </div>
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setFgWeightFilterPendingOnly(true);
                setActiveTab('fg_weight');
              }}
              className="hover:bg-amber-50 rounded-lg p-0.5 border border-transparent hover:border-amber-100 transition"
              title="ดูเฉพาะรอชั่งสุ่ม"
            >
              <span className="block text-[10px] font-bold text-amber-500">ยังไม่ชั่ง</span>
              <span className="text-xs font-extrabold text-amber-600">{pendingFGW}</span>
            </div>
          </div>
        </div>

        {/* Card 3: RM Receiving */}
        <div 
          onClick={() => setActiveTab('rm_receiving')}
          className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs cursor-pointer hover:shadow-md hover:border-purple-300 hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">3. รับวัตถุดิบ (RM)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalRM}</span>
            <span className="text-xs font-medium text-slate-400">ชุดตรวจ</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1 text-center border-t border-slate-100 pt-3">
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">ปกติ</span>
              <span className="text-xs font-extrabold text-emerald-600">{passedRM}</span>
            </div>
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">ไม่ผ่าน</span>
              <span className="text-xs font-extrabold text-red-600">{failedRM}</span>
            </div>
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">ตรวจค้าง</span>
              <span className="text-xs font-extrabold text-slate-500">{pendingRM}</span>
            </div>
          </div>
        </div>

        {/* Card 4: RM Weight */}
        <div 
          onClick={() => setActiveTab('rm_weight')}
          className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs cursor-pointer hover:shadow-md hover:border-teal-300 hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">4. ตรวจน้ำหนัก RM</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalRMW}</span>
            <span className="text-xs font-medium text-slate-400">รายการ</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1 text-center border-t border-slate-100 pt-3">
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">ปกติ</span>
              <span className="text-xs font-extrabold text-emerald-600">{passedRMW}</span>
            </div>
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">ไม่ได้เกณฑ์</span>
              <span className="text-xs font-extrabold text-red-600">{failedRMW}</span>
            </div>
            <div className="hover:bg-slate-50 rounded-lg p-0.5 transition">
              <span className="block text-[10px] font-bold text-slate-400">ไม่ได้ชั่ง</span>
              <span className="text-xs font-extrabold text-amber-600">{pendingRMW}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analysis grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pass rate analysis */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs lg:col-span-2 space-y-5">
          <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3">
            วิเคราะห์คุณภาพและมาตรฐานของผลิตภัณฑ์ (QC passing rate)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left circular gauge placeholder */}
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-600 transition-all duration-500 ease-out"
                    strokeDasharray={`${pkgPassRate}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-black text-slate-800">{pkgPassRate}%</span>
                  <span className="block text-[9px] font-bold text-slate-400">PASS RATE</span>
                </div>
              </div>
              <p className="font-bold text-xs text-slate-800 mt-3">มาตรฐานคุณภาพแพ็คเกจ</p>
              <p className="text-[10px] text-slate-500 mt-1">อ้างอิงจากข้อมูลการอนุมัติผ่านเกณฑ์ทั้งหมด</p>
            </div>

            {/* Right progress bars */}
            <div className="space-y-4 justify-center flex flex-col">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>ตรวจสอบแพ็คเกจสร็จสิ้น (FG)</span>
                  <span>{totalPkg > 0 ? Math.round(((totalPkg - pendingPkg) / totalPkg) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-500" 
                    style={{ width: `${totalPkg > 0 ? ((totalPkg - pendingPkg) / totalPkg) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>ชั่งสุ่มน้ำหนักเสร็จสิ้น (FG)</span>
                  <span>{totalFGW > 0 ? Math.round(((totalFGW - pendingFGW) / totalFGW) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${totalFGW > 0 ? ((totalFGW - pendingFGW) / totalFGW) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>ชั่งสุ่มน้ำหนักเสร็จสิ้น (RM)</span>
                  <span>{totalRMW > 0 ? Math.round(((totalRMW - pendingRMW) / totalRMW) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-teal-500 h-full transition-all duration-500" 
                    style={{ width: `${totalRMW > 0 ? ((totalRMW - pendingRMW) / totalRMW) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expiry alerts card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>แจ้งเตือนสารเคมีหมดอายุ</span>
              <CalendarRange className="w-4 h-4 text-rose-500" />
            </h3>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200/50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-extrabold text-red-900">สารเคมีหมดอายุแล้ว</span>
                </div>
                <span className="text-sm font-black text-red-600">{expiredCount} รายการ</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200/50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-extrabold text-amber-900">ใกล้หมดอายุ (ภายใน 4 ด.)</span>
                </div>
                <span className="text-sm font-black text-amber-600">{nearExpiryCount} รายการ</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200/50 rounded-xl">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-extrabold text-emerald-900">สภาพใช้งานปกติ</span>
                </div>
                <span className="text-sm font-black text-emerald-600">{activeCount} รายการ</span>
              </div>

              {pendingExp > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-extrabold text-slate-600">รอกรอกวันหมดอายุ</span>
                  </div>
                  <span className="text-sm font-black text-slate-500">{pendingExp} รายการ</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-4 text-center">
            * คอยตรวจสอบสารเคมีใกล้หมดอายุเพื่อบริหารจัดลำดับก่อนหลัง
          </div>
        </div>
      </div>
    </div>
  );
}

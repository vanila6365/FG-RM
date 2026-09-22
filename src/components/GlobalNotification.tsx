import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function GlobalNotification() {
  const { notification, closeNotification } = useApp();

  if (!notification) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={notification.type === 'success' ? closeNotification : undefined}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4 overflow-hidden"
        >
          {notification.type === 'success' ? (
            <>
              {/* Animated Success Ring */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-75" />
                <div className="relative p-3 bg-emerald-100 text-emerald-600 rounded-full">
                  <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800">ดำเนินการสำเร็จ!</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {notification.message || 'บันทึกข้อมูลเรียบร้อยแล้ว'}
                </p>
              </div>

              <button
                onClick={closeNotification}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/10 transition-all cursor-pointer"
              >
                ตกลง
              </button>
            </>
          ) : (
            <>
              {/* Alert Confirm Ring */}
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                <AlertTriangle className="w-12 h-12 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800">ยืนยันการลบข้อมูล?</h3>
                <p className="text-sm text-slate-500 font-semibold leading-relaxed px-2">
                  {notification.message}
                </p>
                <p className="text-[10px] text-red-500 font-extrabold italic">
                  *ข้อมูลนี้จะถูกลบออกจากตารางและ Google Sheets โดยถาวร
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button
                  onClick={closeNotification}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    if (notification.onConfirm) {
                      notification.onConfirm();
                    }
                  }}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-red-600/10 transition-all cursor-pointer"
                >
                  ยืนยันลบ
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

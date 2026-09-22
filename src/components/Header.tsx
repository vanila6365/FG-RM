import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, ShieldCheck, Database, RefreshCw, LogOut, HardDriveDownload } from 'lucide-react';

export function Header() {
  const { 
    userRole, 
    isSyncing, 
    isConnected, 
    logoutAdmin, 
    loginAsAdmin, 
    refreshData 
  } = useApp();

  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAsAdmin(pin)) {
      setPin('');
      setError(false);
      setShowPinModal(false);
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-500/20">
              Q
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-base md:text-lg tracking-tight">
                FG & RM Quality & Weight System
              </h1>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xs text-slate-500 font-medium">โรงงานตรวจสอบคุณภาพ</span>
                {isConnected ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                    <Database className="w-2.5 h-2.5 mr-1" /> Google Sheet
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <HardDriveDownload className="w-2.5 h-2.5 mr-1" /> Local Database
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {/* Sync button */}
            <button 
              onClick={refreshData}
              disabled={isSyncing}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200/80 transition-colors focus:outline-none"
              title="Sync Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Role switch button */}
            {userRole === 'Admin' ? (
              <div className="flex items-center bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-700">Admin Mode</span>
                <button 
                  onClick={logoutAdmin}
                  className="p-1 rounded-md text-blue-500 hover:bg-blue-100 transition-colors focus:outline-none"
                  title="Logout Admin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPinModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-sm focus:outline-none"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Admin PIN Login Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 transform scale-100 transition-all">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-slate-800">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base">Admin Security Verification</h3>
              </div>
              <button 
                onClick={() => { setShowPinModal(false); setError(false); setPin(''); }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter the secret Admin PIN code to enable record editing, deletions, and spreadsheet configurations.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter 4-Digit Security PIN (Default: 1234)
                </label>
                <input 
                  type="password"
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => {
                    setError(false);
                    setPin(e.target.value);
                  }}
                  autoFocus
                  placeholder="••••"
                  className={`w-full text-center tracking-widest text-xl font-bold py-3 px-4 border rounded-xl focus:outline-none focus:ring-2 ${
                    error 
                      ? 'border-red-400 focus:ring-red-200' 
                      : 'border-slate-200 focus:ring-blue-100 focus:border-blue-500'
                  }`}
                />
                {error && (
                  <p className="text-xs text-red-500 font-bold mt-1 text-center animate-shake">
                    Incorrect PIN. Please try again.
                  </p>
                )}
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowPinModal(false); setError(false); setPin(''); }}
                  className="w-1/2 py-2.5 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 transition"
                >
                  Verify PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}

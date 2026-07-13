import React from "react";
import { Cpu, Wifi, WifiOff, RefreshCw, Trash2, Zap, Play, Pause } from "lucide-react";

interface DashboardHeaderProps {
  isOnline: boolean;
  lastSeen: string | null;
  onReset: () => void;
  isRefreshing: boolean;
  onManualRefresh: () => void;
}

export default function DashboardHeader({
  isOnline,
  lastSeen,
  onReset,
  isRefreshing,
  onManualRefresh,
}: DashboardHeaderProps) {
  const formattedLastSeen = lastSeen
    ? new Date(lastSeen).toLocaleTimeString("th-TH")
    : "-";

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Title Section */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display text-slate-900">
              ESP32 Wi-Fi Control & Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>ระบบตรวจสอบและควบคุมโมดูล ESP32 ผ่านเครือข่ายไร้สาย</span>
            </p>
          </div>
        </div>

        {/* Controls & Connection Status */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          
          {/* Connection Status Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isOnline ? "bg-emerald-500" : "bg-rose-500"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOnline ? "bg-emerald-600" : "bg-rose-600"
                }`}
              ></span>
            </span>
            <div className="flex items-center gap-1">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>เชื่อมต่ออยู่ (Online)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>ขาดการติดต่อ (Offline)</span>
                </>
              )}
            </div>
          </div>

          {/* Last Seen indicator */}
          <div className="hidden sm:block text-right text-xs text-slate-500">
            <div>อัปเดตล่าสุด:</div>
            <div className="font-mono font-semibold text-slate-700">{formattedLastSeen}</div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <button
              onClick={onManualRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              title="ดึงข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-500" : ""}`} />
            </button>
            <button
              onClick={onReset}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
              title="รีเซ็ตค่าประวัติการส่งข้อมูล"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}

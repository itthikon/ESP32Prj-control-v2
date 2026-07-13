import React from "react";
import { LogEntry } from "../types";
import { Terminal, ShieldAlert, CircleCheck, Info, Radio, Settings2, Trash2 } from "lucide-react";

interface LogsViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export default function LogsViewer({ logs, onClearLogs }: LogsViewerProps) {
  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />;
      case "warn":
        return <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />;
      case "error":
        return <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />;
      case "telemetry":
        return <Radio className="w-4 h-4 text-blue-500 shrink-0" />;
      case "control":
        return <Settings2 className="w-4 h-4 text-indigo-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const getLogBg = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return "bg-emerald-50/20 hover:bg-emerald-50/40 text-emerald-900 border-emerald-50";
      case "warn":
        return "bg-amber-50/20 hover:bg-amber-50/40 text-amber-900 border-amber-50";
      case "error":
        return "bg-rose-50/20 hover:bg-rose-50/40 text-rose-900 border-rose-50";
      case "telemetry":
        return "bg-blue-50/20 hover:bg-blue-50/40 text-blue-900 border-blue-50";
      case "control":
        return "bg-indigo-50/20 hover:bg-indigo-50/40 text-indigo-900 border-indigo-50";
      default:
        return "bg-slate-50/30 hover:bg-slate-50/50 text-slate-700 border-slate-50";
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col hover:shadow-md transition-all h-[420px]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-700" />
            <span>บันทึกสถานะและการรับส่งข้อมูล (System Logs)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">การรับข้อมูลเซ็นเซอร์และการส่งคำสั่งควบคุมสดจากบอร์ดแบบเรียลไทม์</p>
        </div>
        
        <button
          onClick={onClearLogs}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 transition-all font-medium py-1 px-2 rounded-lg hover:bg-slate-50 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>ล้างบันทึก</span>
        </button>
      </div>

      {/* Logs Scroll container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {logs && logs.length > 0 ? (
          logs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs border transition-all ${getLogBg(
                log.type
              )}`}
            >
              <span className="font-mono text-slate-400 select-none">{log.timestamp}</span>
              {getLogIcon(log.type)}
              <span className="font-mono flex-1 break-all select-all font-medium">
                {log.message}
              </span>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-100">
            <Terminal className="w-8 h-8 text-slate-300 mb-2" />
            <span className="text-xs">ไม่มีรายการบันทึกใหม่ในขณะนี้</span>
          </div>
        )}
      </div>

      {/* Log counts and footer indicator */}
      <div className="border-t border-slate-50 pt-3 mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
        <span>ข้อมูลสะสม: {logs.length} รายการ</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>เครื่องรับข้อมูลพร้อมออนไลน์</span>
        </span>
      </div>
    </div>
  );
}

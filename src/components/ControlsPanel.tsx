import React from "react";
import { ControlState } from "../types";
import { Lightbulb, ToggleLeft, ToggleRight, Zap, RefreshCw, AlertTriangle, Radio } from "lucide-react";

interface ControlsPanelProps {
  control: ControlState;
  onControlChange: (updated: Partial<ControlState>) => void;
  isSendingControl: boolean;
}

export default function ControlsPanel({
  control,
  onControlChange,
  isSendingControl,
}: ControlsPanelProps) {
  const { ledState, relayState, reportingInterval } = control;

  const handleLedToggle = () => {
    onControlChange({ ledState: !ledState });
  };

  const handleRelayToggle = () => {
    onControlChange({ relayState: !relayState });
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onControlChange({ reportingInterval: Number(e.target.value) });
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <span>คำสั่งควบคุมระยะไกล (Remote Control)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">ส่งคำสั่งย้อนกลับไปยังบอร์ด ESP32 ทันทีที่บอร์ดดึงข้อมูลครั้งต่อไป</p>
        </div>
        {isSendingControl && (
          <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>กำลังส่ง...</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* 1. LED Toggle Card */}
        <div 
          onClick={handleLedToggle}
          className={`group rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
            ledState 
              ? "bg-amber-50/50 border-amber-200 hover:bg-amber-100/50" 
              : "bg-slate-50/50 border-slate-100 hover:bg-slate-100/50 hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg transition-all ${
                ledState ? "bg-amber-100 text-amber-600 shadow-xs" : "bg-slate-100 text-slate-400"
              }`}>
                <Lightbulb className={`w-5 h-5 ${ledState ? "fill-amber-400 text-amber-600 animate-pulse" : ""}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700">ไฟ LED บนบอร์ด</div>
                <div className="text-xs text-slate-400">GPIO 2 (Built-in LED)</div>
              </div>
            </div>
            <div>
              {ledState ? (
                <ToggleRight className="w-9 h-9 text-amber-500" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-slate-300 group-hover:text-slate-400" />
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">สถานะคำสั่ง:</span>
            <span className={`font-semibold ${ledState ? "text-amber-600" : "text-slate-500"}`}>
              {ledState ? "เปิดไฟ (ON)" : "ปิดไฟ (OFF)"}
            </span>
          </div>
        </div>

        {/* 2. Relay Toggle Card */}
        <div 
          onClick={handleRelayToggle}
          className={`group rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
            relayState 
              ? "bg-blue-50/50 border-blue-200 hover:bg-blue-100/50" 
              : "bg-slate-50/50 border-slate-100 hover:bg-slate-100/50 hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg transition-all ${
                relayState ? "bg-blue-100 text-blue-600 shadow-xs" : "bg-slate-100 text-slate-400"
              }`}>
                <Zap className={`w-5 h-5 ${relayState ? "fill-blue-100 text-blue-600" : ""}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700">สวิตช์รีเลย์ (Relay Switch)</div>
                <div className="text-xs text-slate-400">GPIO 4 / ขาควบคุมหลัก</div>
              </div>
            </div>
            <div>
              {relayState ? (
                <ToggleRight className="w-9 h-9 text-blue-500" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-slate-300 group-hover:text-slate-400" />
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">สถานะรีเลย์:</span>
            <span className={`font-semibold ${relayState ? "text-blue-600" : "text-slate-500"}`}>
              {relayState ? "ทำงาน (ON / Connected)" : "หยุดทำงาน (OFF)"}
            </span>
          </div>
        </div>

        {/* 3. Reporting Interval Selector */}
        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <label htmlFor="interval-select" className="block text-sm font-semibold text-slate-700">
                รอบเวลาส่งข้อมูล (Interval)
              </label>
              <div className="text-xs text-slate-400 mt-0.5">ให้บอร์ดส่งข้อมูลเซ็นเซอร์ใหม่ทุกๆ</div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <select
              id="interval-select"
              value={reportingInterval}
              onChange={handleIntervalChange}
              className="flex-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg py-1.5 px-2.5 text-xs sm:text-sm text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="2">2 วินาที (เร็วที่สุด)</option>
              <option value="5">5 วินาที (มาตรฐาน)</option>
              <option value="10">10 วินาที (ประหยัดพลังงาน)</option>
              <option value="30">30 วินาที</option>
              <option value="60">1 นาที (โหมดประหยัดเครือข่าย)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Latency / Mechanism Tip */}
      <div className="mt-4 bg-blue-50/40 border border-blue-50 text-blue-800 rounded-xl px-4 py-2.5 text-xs flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p>
          <b>คำแนะนำการทำงาน:</b> ESP32 จะดึงสถานะใหม่ (LED, Relay) จากเว็บผ่านการตอบกลับของการส่งค่าเซ็นเซอร์ (HTTP Post-Polling) ดังนั้น ความล่าช้าของการควบคุมจะขึ้นอยู่กับรอบเวลาส่งข้อมูลที่คุณเลือกด้านบน
        </p>
      </div>
    </div>
  );
}

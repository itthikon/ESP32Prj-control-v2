import React from "react";
import { Telemetry } from "../types";
import {
  Thermometer,
  Droplets,
  Sprout,
  Sun,
  Wifi,
  Hourglass,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface SensorGridProps {
  telemetry: Telemetry;
  isOnline: boolean;
}

export default function SensorGrid({ telemetry, isOnline }: SensorGridProps) {
  const { temperature, humidity, soilMoisture, lightLevel, wifiRssi, uptime } = telemetry;

  // Formatting uptime
  const formatUptime = (sec: number) => {
    if (sec < 60) return `${sec} วินาที`;
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m} นาที ${sec % 60} วินาที`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ชม. ${m % 60} นาที`;
    const d = Math.floor(h / 24);
    return `${d} วัน ${h % 24} ชม.`;
  };

  // Get RSSI Signal Strength text and color
  const getRssiInfo = (rssi: number) => {
    if (rssi >= -50) return { label: "ดีเยี่ยม (Excellent)", color: "text-emerald-500", bg: "bg-emerald-50" };
    if (rssi >= -65) return { label: "ดี (Good)", color: "text-green-500", bg: "bg-green-50" };
    if (rssi >= -75) return { label: "ปานกลาง (Fair)", color: "text-amber-500", bg: "bg-amber-50" };
    if (rssi >= -85) return { label: "อ่อน (Weak)", color: "text-orange-500", bg: "bg-orange-50" };
    return { label: "แย่มาก (Poor)", color: "text-rose-500", bg: "bg-rose-50" };
  };

  const rssiInfo = getRssiInfo(wifiRssi);

  // Soil status mapping
  const getSoilStatus = (moisture: number) => {
    if (moisture < 25) return { label: "ดินแห้งมาก ควรให้น้ำ", color: "text-amber-600 bg-amber-50 border-amber-200" };
    if (moisture <= 75) return { label: "ดินมีความชื้นพอเหมาะ", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    return { label: "ดินแฉะเกินไป น้ำขัง", color: "text-blue-600 bg-blue-50 border-blue-200" };
  };

  // Light status mapping
  const getLightStatus = (light: number) => {
    if (light < 20) return { label: "มืด / มีแสงน้อย", color: "text-slate-600 bg-slate-50 border-slate-200" };
    if (light <= 70) return { label: "แสงสว่างพอเหมาะ", color: "text-amber-600 bg-amber-50 border-amber-200" };
    return { label: "แดดจัด / แสงเข้มข้นสูง", color: "text-orange-600 bg-orange-50 border-orange-200" };
  };

  const soilStatus = getSoilStatus(soilMoisture);
  const lightStatus = getLightStatus(lightLevel);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      
      {/* 1. Temperature Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">อุณหภูมิ (Temperature)</span>
          <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
            <Thermometer className="w-5 h-5" />
          </div>
        </div>
        <div className="my-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold font-display text-slate-800">{temperature.toFixed(1)}</span>
            <span className="text-lg font-medium text-slate-500">°C</span>
          </div>
          {/* Progress gauge bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3.5">
            <div
              className="bg-rose-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max((temperature / 50) * 100, 0), 100)}%` }}
            ></div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>ขอบเขตปกติ: 20°C - 40°C</span>
        </div>
      </div>

      {/* 2. Humidity Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">ความชื้นอากาศ (Humidity)</span>
          <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
            <Droplets className="w-5 h-5" />
          </div>
        </div>
        <div className="my-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold font-display text-slate-800">{humidity.toFixed(1)}</span>
            <span className="text-lg font-medium text-slate-500">%RH</span>
          </div>
          {/* Progress gauge bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${humidity}%` }}
            ></div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>ขอบเขตปกติ: 40% - 80%</span>
        </div>
      </div>

      {/* 3. Soil Moisture Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">ความชื้นในดิน (Soil Moisture)</span>
          <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
            <Sprout className="w-5 h-5" />
          </div>
        </div>
        <div className="my-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold font-display text-slate-800">{soilMoisture.toFixed(1)}</span>
            <span className="text-lg font-medium text-slate-500">%</span>
          </div>
          {/* Progress gauge bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${soilMoisture}%` }}
            ></div>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-lg text-xs font-medium border text-center ${soilStatus.color}`}>
          {soilStatus.label}
        </div>
      </div>

      {/* 4. Light Level Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">ความเข้มแสง (Light Level)</span>
          <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
            <Sun className="w-5 h-5" />
          </div>
        </div>
        <div className="my-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold font-display text-slate-800">{lightLevel.toFixed(1)}</span>
            <span className="text-lg font-medium text-slate-500">%</span>
          </div>
          {/* Progress gauge bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3.5">
            <div
              className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${lightLevel}%` }}
            ></div>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-lg text-xs font-medium border text-center ${lightStatus.color}`}>
          {lightStatus.label}
        </div>
      </div>

      {/* Network & Uptime Row (Full span helper) */}
      <div className="sm:col-span-2 bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${rssiInfo.bg} ${rssiInfo.color}`}>
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">สัญญาณ Wi-Fi (Signal Strength)</div>
            <div className="text-sm font-bold text-slate-700 mt-0.5">
              {wifiRssi} dBm <span className="text-xs font-medium text-slate-400">| {rssiInfo.label}</span>
            </div>
          </div>
        </div>
        {isOnline ? (
          <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            เสถียร (Stable)
          </div>
        ) : (
          <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
            ขาดสัญญาณ
          </div>
        )}
      </div>

      <div className="sm:col-span-2 bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">เวลาทำงานของบอร์ด (Device Uptime)</div>
            <div className="text-sm font-bold text-slate-700 mt-0.5 font-mono">
              {formatUptime(uptime)}
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          PID: {Math.floor(uptime / 1000) % 100}
        </div>
      </div>

    </div>
  );
}

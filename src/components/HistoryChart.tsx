import React, { useState } from "react";
import { Telemetry } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { Activity, Thermometer, Droplets, Sprout, Sun } from "lucide-react";

interface HistoryChartProps {
  history: Telemetry[];
}

export default function HistoryChart({ history }: HistoryChartProps) {
  const [activeMetrics, setActiveMetrics] = useState({
    temperature: true,
    humidity: false,
    soilMoisture: true,
    lightLevel: false,
  });

  const toggleMetric = (metric: keyof typeof activeMetrics) => {
    setActiveMetrics((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  const hasData = history && history.length > 0;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-xs flex flex-col hover:shadow-md transition-all h-[420px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <span>กราฟวิเคราะห์ค่าเซ็นเซอร์แบบเรียลไทม์ (Real-time Telemetry Graph)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">แสดงประวัติการรับค่าล่าสุดจากบอร์ด {history.length} รายการล่าสุด</p>
        </div>

        {/* Custom metric filter toggles */}
        <div className="flex flex-wrap gap-2">
          {/* Temperature Toggle */}
          <button
            onClick={() => toggleMetric("temperature")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              activeMetrics.temperature
                ? "bg-rose-50 border-rose-200 text-rose-700 font-bold"
                : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-rose-500" />
            <span>อุณหภูมิ (°C)</span>
          </button>

          {/* Humidity Toggle */}
          <button
            onClick={() => toggleMetric("humidity")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              activeMetrics.humidity
                ? "bg-blue-50 border-blue-200 text-blue-700 font-bold"
                : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-blue-500" />
            <span>ความชื้นอากาศ (%RH)</span>
          </button>

          {/* Soil Moisture Toggle */}
          <button
            onClick={() => toggleMetric("soilMoisture")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              activeMetrics.soilMoisture
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold"
                : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Sprout className="w-3.5 h-3.5 text-emerald-500" />
            <span>ดิน (%)</span>
          </button>

          {/* Light Toggle */}
          <button
            onClick={() => toggleMetric("lightLevel")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              activeMetrics.lightLevel
                ? "bg-amber-50 border-amber-200 text-amber-700 font-bold"
                : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>แสง (%)</span>
          </button>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="flex-1 w-full min-h-[220px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={history}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#94a3b8" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.95)", 
                  border: "1px solid #e2e8f0", 
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  fontSize: "12px"
                }}
                labelStyle={{ fontWeight: "bold", color: "#1e293b" }}
              />
              
              {activeMetrics.temperature && (
                <Line
                  type="monotone"
                  name="อุณหภูมิ (°C)"
                  dataKey="temperature"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {activeMetrics.humidity && (
                <Line
                  type="monotone"
                  name="ความชื้นอากาศ (%RH)"
                  dataKey="humidity"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {activeMetrics.soilMoisture && (
                <Line
                  type="monotone"
                  name="ความชื้นในดิน (%)"
                  dataKey="soilMoisture"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {activeMetrics.lightLevel && (
                <Line
                  type="monotone"
                  name="ความเข้มแสง (%)"
                  dataKey="lightLevel"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Activity className="w-8 h-8 text-slate-300 animate-pulse mb-2" />
            <span className="text-sm">รออุปกรณ์เชื่อมต่อและส่งสัญญาณข้อมูลเข้ามา...</span>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import { DeviceState, ControlState, LogEntry, DeviceInfo, SupabaseConfig, SensorConfig } from "./types";
import DashboardHeader from "./components/DashboardHeader";
import SensorGrid from "./components/SensorGrid";
import ControlsPanel from "./components/ControlsPanel";
import HistoryChart from "./components/HistoryChart";
import LogsViewer from "./components/LogsViewer";
import ArduinoCodeGenerator from "./components/ArduinoCodeGenerator";
import SupabaseSettingsPanel from "./components/SupabaseSettingsPanel";
import DeviceSelectorPanel from "./components/DeviceSelectorPanel";
import SensorConfigManager from "./components/SensorConfigManager";
import DesktopAppPanel from "./components/DesktopAppPanel";
import { Info, HelpCircle, ArrowUpRight, Cpu, BookOpen, Layers, Database, RefreshCw, AlertCircle, Laptop } from "lucide-react";

// Helper to generate default state for client-side fallback simulation
const createDefaultDeviceState = (): DeviceState => {
  const now = new Date();
  const timeStr = now.toTimeString().split(" ")[0];
  
  // Generate some mock history
  const history: any[] = [];
  for (let i = 20; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5000);
    const mockTimeStr = time.toTimeString().split(" ")[0];
    history.push({
      temperature: parseFloat((27.5 + Math.sin(i / 3) * 1.5).toFixed(1)),
      humidity: parseFloat((60.0 + Math.cos(i / 3) * 3.0).toFixed(1)),
      soilMoisture: parseFloat((45.0 + Math.sin(i / 5) * 2.0).toFixed(1)),
      lightLevel: parseFloat((70.0 + Math.cos(i / 5) * 5.0).toFixed(1)),
      wifiRssi: -60 - Math.floor(Math.random() * 8),
      uptime: 120 - i * 5,
      timestamp: mockTimeStr,
    });
  }

  return {
    telemetry: history[history.length - 1],
    control: {
      ledState: false,
      relayState: false,
      reportingInterval: 5,
    },
    lastSeen: null,
    isOnline: false,
    simulationEnabled: false,
    history,
    logs: [
      {
        id: "init",
        timestamp: timeStr,
        type: "info",
        message: "ระบบเชื่อมต่อเว็บหลังบ้านติดขัด - เปิดใช้งานระบบจำลองฝั่งไคลเอนต์ (Client-Side Simulator Mode) อัตโนมัติ",
      },
    ],
    supabaseConnected: false,
    supabaseError: null,
  };
};

export default function App() {
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [devicesList, setDevicesList] = useState<DeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("device_1");
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingControl, setIsSendingControl] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "arduino" | "supabase">("dashboard");
  const [error, setError] = useState<string | null>(null);
  const [isClientFallback, setIsClientFallback] = useState(false);

  // Keep track of consecutive connection failures before forcing fallback mode
  const consecutiveFailuresRef = useRef(0);

  // Fetch state from server API for a specific device ID
  const fetchDeviceState = useCallback(async (deviceId: string, showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const response = await fetch(`/api/device/state?id=${deviceId}`);
      if (!response.ok) {
        throw new Error(`เซิร์ฟเวอร์ตอบกลับด้วยรหัสสถานะ: ${response.status}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("เซิร์ฟเวอร์ตอบกลับเป็น HTML แทนที่จะเป็น JSON (เป็นไปได้ว่ากำลังรัน/เริ่มต้นใหม่ หรือติดปัญหา Routing)");
      }

      const data = (await response.json()) as DeviceState;
      setDeviceState(data);
      setError(null);
      setIsClientFallback(false);
      consecutiveFailuresRef.current = 0; // reset failures on successful fetch
    } catch (err: any) {
      console.warn("Failed to fetch ESP32 device state, retrying...", err.message || err);
      consecutiveFailuresRef.current += 1;
      
      // Fallback to client-side simulation only if connection repeatedly fails (e.g. 5 times)
      if (consecutiveFailuresRef.current >= 5) {
        setError(err.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์หลังบ้านได้");
        setIsClientFallback(true);
        setDeviceState((prev) => {
          if (prev) return prev;
          return createDefaultDeviceState();
        });
      } else {
        // Show temporary retry notice but don't drop to simulation yet
        setError(`กำลังพยายามเชื่อมต่อหลังบ้านใหม่... (ครั้งที่ ${consecutiveFailuresRef.current}/5)`);
      }
    } finally {
      if (showIndicator) setIsRefreshing(false);
    }
  }, []);

  // Fetch list of devices and global Supabase config
  const fetchDevicesAndConfig = useCallback(async () => {
    if (isClientFallback) return;
    try {
      const response = await fetch("/api/devices");
      if (response.ok) {
        const data = await response.json();
        setDevicesList(data.devices || []);
        setSupabaseConfig(data.supabaseConfig || null);
      }
    } catch (err) {
      console.error("Failed to fetch devices list:", err);
    }
  }, [isClientFallback]);

  // Initial load
  useEffect(() => {
    fetchDevicesAndConfig();
  }, [fetchDevicesAndConfig]);

  // Poll devices list every 5 seconds
  useEffect(() => {
    if (isClientFallback) return;
    const interval = setInterval(() => {
      fetchDevicesAndConfig();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchDevicesAndConfig, isClientFallback]);

  // Poll selected device state every 2 seconds
  useEffect(() => {
    if (isClientFallback) return;

    fetchDeviceState(selectedDeviceId);
    const interval = setInterval(() => {
      fetchDeviceState(selectedDeviceId);
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchDeviceState, selectedDeviceId, isClientFallback]);

  // Periodic Client-Side Simulator (runs only when in client-side fallback mode)
  useEffect(() => {
    if (!isClientFallback || !deviceState) return;

    const interval = setInterval(() => {
      setDeviceState((prev) => {
        if (!prev) return prev;
        if (!prev.simulationEnabled) return prev;

        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];

        // Simulate small fluctuation
        const tempDelta = (Math.random() - 0.5) * 0.4;
        const humDelta = (Math.random() - 0.5) * 1.0;
        const soilDelta = (Math.random() - 0.5) * 0.5;
        const lightDelta = (Math.random() - 0.5) * 2.0;

        const nextTelemetry = {
          temperature: parseFloat(Math.max(15, Math.min(45, prev.telemetry.temperature + tempDelta)).toFixed(1)),
          humidity: parseFloat(Math.max(10, Math.min(100, prev.telemetry.humidity + humDelta)).toFixed(1)),
          soilMoisture: parseFloat(Math.max(0, Math.min(100, prev.telemetry.soilMoisture + soilDelta)).toFixed(1)),
          lightLevel: parseFloat(Math.max(0, Math.min(100, prev.telemetry.lightLevel + lightDelta)).toFixed(1)),
          wifiRssi: Math.max(-90, Math.min(-30, prev.telemetry.wifiRssi + Math.round((Math.random() - 0.5) * 2))),
          uptime: prev.telemetry.uptime + prev.control.reportingInterval,
          timestamp: timeStr,
        };

        const newLog: LogEntry = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: timeStr,
          type: "telemetry",
          message: `[จำลองฝั่งไคลเอนต์] ค่าเซ็นเซอร์ใหม่: อุณหภูมิ ${nextTelemetry.temperature}°C | ความชื้น ${nextTelemetry.humidity}% | ดิน ${nextTelemetry.soilMoisture}% | แสง ${nextTelemetry.lightLevel}%`,
        };

        const nextHistory = [...prev.history, nextTelemetry].slice(-30);
        const nextLogs = [newLog, ...prev.logs].slice(0, 100);

        return {
          ...prev,
          telemetry: nextTelemetry,
          history: nextHistory,
          logs: nextLogs,
          lastSeen: now.toISOString(),
          isOnline: true,
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isClientFallback, deviceState?.simulationEnabled, deviceState?.control.reportingInterval]);

  // Add a new device/location
  const handleAddDevice = async (id: string, location: string) => {
    try {
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, location }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await fetchDevicesAndConfig();
        setSelectedDeviceId(id); // Switched to newly added device automatically
        await fetchDeviceState(id, true);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อลงทะเบียนบอร์ด" };
    }
  };

  // Edit an existing device/location
  const handleEditDevice = async (id: string, location: string) => {
    try {
      const response = await fetch(`/api/devices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await fetchDevicesAndConfig();
        if (selectedDeviceId === id) {
          await fetchDeviceState(id, false);
        }
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเพื่ออัปเดตข้อมูลสถานที่" };
    }
  };

  // Delete an existing device/location
  const handleDeleteDevice = async (id: string) => {
    try {
      const response = await fetch(`/api/devices/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const remaining = devicesList.filter((d) => d.id !== id);
        await fetchDevicesAndConfig();
        if (selectedDeviceId === id) {
          if (remaining.length > 0) {
            setSelectedDeviceId(remaining[0].id);
            await fetchDeviceState(remaining[0].id, true);
          } else {
            setSelectedDeviceId("");
            setDeviceState(null);
          }
        }
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message || "เกิดข้อผิดพลาดในการติดต่อระบบเพื่อลบข้อมูล" };
    }
  };

  // Add a new sensor to the selected device
  const handleAddSensor = async (type: SensorConfig["type"], name: string, pin: string, unit: string) => {
    try {
      const response = await fetch(`/api/devices/${selectedDeviceId}/sensors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name, pin, unit }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await fetchDeviceState(selectedDeviceId, false);
        await fetchDevicesAndConfig();
        return true;
      }
      alert(data.error || "เกิดข้อผิดพลาดในการเพิ่มเซ็นเซอร์");
      return false;
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      return false;
    }
  };

  // Edit an existing sensor on the selected device
  const handleEditSensor = async (sensorId: string, type: SensorConfig["type"], name: string, pin: string, unit: string) => {
    try {
      const response = await fetch(`/api/devices/${selectedDeviceId}/sensors/${sensorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name, pin, unit }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await fetchDeviceState(selectedDeviceId, false);
        await fetchDevicesAndConfig();
        return true;
      }
      alert(data.error || "เกิดข้อผิดพลาดในการแก้ไขเซ็นเซอร์");
      return false;
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      return false;
    }
  };

  // Delete a sensor from the selected device
  const handleDeleteSensor = async (sensorId: string) => {
    try {
      const response = await fetch(`/api/devices/${selectedDeviceId}/sensors/${sensorId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await fetchDeviceState(selectedDeviceId, false);
        await fetchDevicesAndConfig();
        return true;
      }
      alert(data.error || "เกิดข้อผิดพลาดในการลบเซ็นเซอร์");
      return false;
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      return false;
    }
  };

  // Handle control panel changes (LED, Relay, Reporting Interval) for the selected device
  const handleControlChange = async (updatedControl: Partial<ControlState>) => {
    if (isClientFallback) {
      setDeviceState((prev) => {
        if (!prev) return prev;
        const nextControl = { ...prev.control, ...updatedControl };
        
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];
        
        const changeMsgs: string[] = [];
        if (updatedControl.ledState !== undefined) {
          changeMsgs.push(`สลับสถานะ LED เป็น ${updatedControl.ledState ? "เปิด (ON)" : "ปิด (OFF)"}`);
        }
        if (updatedControl.relayState !== undefined) {
          changeMsgs.push(`สลับสถานะรีเลย์เป็น ${updatedControl.relayState ? "เปิด (ON)" : "ปิด (OFF)"}`);
        }
        if (updatedControl.reportingInterval !== undefined) {
          changeMsgs.push(`ตั้งรอบรายงานข้อมูลใหม่เป็น ${updatedControl.reportingInterval} วินาที`);
        }

        const newLogs: LogEntry[] = changeMsgs.map((msg) => ({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: timeStr,
          type: "control",
          message: `[จำลองฝั่งไคลเอนต์] ${msg}`,
        }));

        return {
          ...prev,
          control: nextControl,
          logs: [...newLogs, ...prev.logs].slice(0, 100),
        };
      });
      return;
    }

    setIsSendingControl(true);
    try {
      const response = await fetch("/api/device/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedDeviceId, ...updatedControl }),
      });
      if (response.ok) {
        // Instantly refresh state
        await fetchDeviceState(selectedDeviceId);
      }
    } catch (err) {
      console.error("Failed to send control command:", err);
    } finally {
      setIsSendingControl(false);
    }
  };

  // Toggle Simulation mode for the selected device
  const handleToggleSimulation = async () => {
    if (!deviceState) return;

    if (isClientFallback) {
      setDeviceState((prev) => {
        if (!prev) return prev;
        const nextEnabled = !prev.simulationEnabled;
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];
        const newLog: LogEntry = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: timeStr,
          type: "info",
          message: `[จำลองฝั่งไคลเอนต์] ${nextEnabled ? "เปิด" : "ปิด"}โหมดจำลองข้อมูลค่าเซ็นเซอร์`,
        };
        return {
          ...prev,
          simulationEnabled: nextEnabled,
          isOnline: nextEnabled ? true : prev.isOnline,
          logs: [newLog, ...prev.logs].slice(0, 100),
        };
      });
      return;
    }

    try {
      const response = await fetch("/api/device/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedDeviceId, enabled: !deviceState.simulationEnabled }),
      });
      if (response.ok) {
        await fetchDeviceState(selectedDeviceId);
      }
    } catch (err) {
      console.error("Failed to toggle simulation mode:", err);
    }
  };

  // Clear log logs and history for the selected device
  const handleReset = async () => {
    if (!window.confirm("คุณต้องการล้างข้อมูลประวัติกราฟ และ บันทึกการทำงานทั้งหมดใช่หรือไม่?")) {
      return;
    }

    if (isClientFallback) {
      setDeviceState((prev) => {
        if (!prev) return prev;
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];
        return {
          ...prev,
          history: [],
          logs: [
            {
              id: "clear",
              timestamp: timeStr,
              type: "info",
              message: "[จำลองฝั่งไคลเอนต์] ล้างข้อมูลประวัติและบันทึกเหตุการณ์เสร็จสิ้น",
            }
          ],
        };
      });
      return;
    }

    try {
      const response = await fetch("/api/device/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedDeviceId }),
      });
      if (response.ok) {
        await fetchDeviceState(selectedDeviceId);
      }
    } catch (err) {
      console.error("Failed to reset database state:", err);
    }
  };

  if (!deviceState) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-md max-w-md w-full text-center flex flex-col items-center">
          {error ? (
            <>
              <div className="p-4 bg-rose-50 text-rose-600 rounded-full mb-4 border border-rose-100">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold font-display text-slate-800">เกิดข้อผิดพลาดในการเชื่อมต่อ</h3>
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 mt-3 w-full font-mono text-left break-all">
                {error}
              </p>
              <p className="text-xs text-slate-400 mt-3">
                หากเซิร์ฟเวอร์กำลังรีสตาร์ท กรุณารอ 5-10 วินาทีแล้วลองใหม่อีกครั้ง
              </p>
              <button
                onClick={() => fetchDeviceState(selectedDeviceId, true)}
                className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังเชื่อมต่อใหม่...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>เชื่อมต่อใหม่อีกครั้ง</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="p-4 bg-blue-50 text-blue-600 rounded-full animate-bounce mb-4">
                <Cpu className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold font-display text-slate-800">กำลังเชื่อมต่อแดชบอร์ด</h3>
              <p className="text-sm text-slate-400 mt-2">โปรดรอสักครู่ ระบบกำลังดึงสถานะเริ่มต้น...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* 1. Navigation / Status Header */}
      <DashboardHeader
        isOnline={deviceState.isOnline}
        lastSeen={deviceState.lastSeen}
        onReset={handleReset}
        isRefreshing={isRefreshing}
        onManualRefresh={() => fetchDeviceState(selectedDeviceId, true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Connection Error Banner / Fallback Mode Banner */}
        {isClientFallback ? (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
            <div className="flex gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950">กำลังทำงานใน "โหมดจำลองบอร์ด ESP32 ฝั่งไคลเอนต์ (Client-Side Simulator)"</h4>
                <p className="text-xs text-amber-800/95 mt-1 leading-relaxed">
                  เนื่องจากแอปพลิเคชันกำลังทำงานบน Static Web Host (เช่น Firebase Hosting) โดยไม่ได้โฮสต์หรือเข้าถึง Express API หลังบ้าน เพื่อให้ระบบสามารถทดสอบฟังก์ชันการทำงานได้อย่างลื่นไหล ระบบจึงจำลองการทำงานทั้งหมด (กราฟ, บันทึก logs, สลับ LED/Relay) ให้คุณโดยตรงบนบราวเซอร์ หากต้องการเชื่อมต่อ ESP32 จริง กรุณารันระบบในเครื่องผ่านคำสั่ง <code>npm run dev</code> หรือตั้งค่าระบบตามคู่มือในไฟล์ <code>FIREBASE_DEPLOY.md</code>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsClientFallback(false);
                setError(null);
                fetchDeviceState(selectedDeviceId, true);
              }}
              className="text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>ลองเชื่อมต่อ API ใหม่</span>
            </button>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex gap-3 items-center">
              <div className="p-2 bg-rose-100 text-rose-800 rounded-xl shrink-0">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-900">การเชื่อมต่อหลังบ้านติดขัดชั่วคราว</h4>
                <p className="text-xs text-rose-700/90 mt-0.5">
                  ระบบกำลังพยายามเชื่อมต่อใหม่โดยอัตโนมัติ... ({error})
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchDeviceState(selectedDeviceId, true)}
              className="text-xs font-bold text-rose-950 bg-rose-100 hover:bg-rose-200 px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>ลองเชื่อมต่อใหม่</span>
            </button>
          </div>
        ) : null}

        {/* Navigation Tabs (Dashboard View vs Arduino Code View) */}
        <div className="flex border-b border-slate-200 gap-1.5 pb-px flex-wrap">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "dashboard"
                ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>แดชบอร์ดควบคุมเซ็นเซอร์</span>
          </button>
          <button
            onClick={() => setActiveTab("arduino")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "arduino"
                ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>ซอร์สโค้ด ESP32 (Arduino)</span>
          </button>
          <button
            onClick={() => setActiveTab("supabase")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "supabase"
                ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>เชื่อมต่อฐานข้อมูล Supabase</span>
          </button>
          <button
            onClick={() => setActiveTab("desktop")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "desktop"
                ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>แอปติดตั้งบนเครื่อง (Desktop App)</span>
          </button>
        </div>

        {/* Tab Content Rendering */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* Location & Multi-Device Selector */}
            <DeviceSelectorPanel
              devices={devicesList}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={(id) => {
                setSelectedDeviceId(id);
                fetchDeviceState(id, true);
              }}
              onAddDevice={handleAddDevice}
              onDeleteDevice={handleDeleteDevice}
              onEditDevice={handleEditDevice}
            />

            {/* Quick API Guideline Card for developer */}
            <div className="bg-slate-800 text-slate-100 rounded-2xl p-5 border border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold font-display text-white">ESP32 HTTP API Endpoint พร้อมใช้งาน!</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    บอร์ด ESP32 ของคุณสามารถส่งข้อมูลมาที่: <span className="font-mono bg-slate-900 text-amber-400 px-1.5 py-0.5 rounded-md select-all text-[11px] sm:text-xs">{(typeof window !== "undefined" ? window.location.origin : "") + "/api/device/telemetry"}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("arduino")}
                className="text-xs font-semibold bg-white hover:bg-slate-100 text-slate-900 px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 inline-flex items-center gap-1.5 self-stretch md:self-auto justify-center"
              >
                <span>ดูขั้นตอนสอนเชื่อมต่อ & โค้ด</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Primary Metrics Row */}
            <SensorGrid telemetry={deviceState.telemetry} isOnline={deviceState.isOnline} />

            {/* 3. Controls Panels */}
            <ControlsPanel
              control={deviceState.control}
              onControlChange={handleControlChange}
              isSendingControl={isSendingControl}
              supabaseConnected={deviceState.supabaseConnected}
              syncPending={deviceState.syncPending}
            />

            {/* 3.5 Sensor Hardware Configuration Manager */}
            <SensorConfigManager
              deviceId={selectedDeviceId}
              locationName={deviceState.location || selectedDeviceId}
              sensors={deviceState.sensors || []}
              onAddSensor={handleAddSensor}
              onEditSensor={handleEditSensor}
              onDeleteSensor={handleDeleteSensor}
            />

            {/* 4. Graphs & Logs Split Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HistoryChart history={deviceState.history} />
              <LogsViewer logs={deviceState.logs} onClearLogs={handleReset} />
            </div>

          </div>
        )}

        {activeTab === "arduino" && (
          <div className="space-y-6">
            {/* Guide Step Banner */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
              <h3 className="text-lg font-bold font-display text-slate-800 mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                <span>ขั้นตอนการเชื่อมต่อบอร์ด ESP32 กับ แดชบอร์ดนี้</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="p-4 bg-slate-50 rounded-xl relative">
                  <div className="absolute -top-3 -left-2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">1</div>
                  <h4 className="font-bold text-slate-800 mb-1.5">เตรียมอุปกรณ์ & วงจร</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ต่อบอร์ด ESP32 เข้ากับเซ็นเซอร์วัดดินความชื้น (ขา 34), เซ็นเซอร์แสง LDR (ขา 35), หลอด LED (Built-in ขา 2), หรือ Relay (ขา 4) ให้พร้อม
                  </p>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-xl relative">
                  <div className="absolute -top-3 -left-2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">2</div>
                  <h4 className="font-bold text-slate-800 mb-1.5">กรอกรหัส Wi-Fi และอัปโหลด</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ใส่ชื่อ Wi-Fi และรหัสผ่านที่ด้านล่าง ระบบจะอัปเดตโค้ดสำหรับนำไปวางในโปรแกรม Arduino IDE และอัปโหลดลงบอร์ดทันที
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl relative">
                  <div className="absolute -top-3 -left-2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">3</div>
                  <h4 className="font-bold text-slate-800 mb-1.5">เปิดดูแดชบอร์ดรับส่งข้อมูล</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ทันทีที่บอร์ดเริ่มทำงาน จะสามารถปิดโหมดจำลองเพื่อรับข้อมูลจากบอร์ดจริง โดยบอร์ดจะรับส่งข้อมูลและอัปเดตการควบคุมระยะไกลได้ทันที
                  </p>
                </div>
              </div>
            </div>

            {/* Arduino Code Generator with interactive input configurations */}
            <ArduinoCodeGenerator deviceId={selectedDeviceId} sensors={deviceState?.sensors || []} />
          </div>
        )}

        {activeTab === "supabase" && (
          <SupabaseSettingsPanel 
            deviceState={deviceState} 
            currentConfig={supabaseConfig}
            onConfigUpdated={fetchDevicesAndConfig}
          />
        )}

        {activeTab === "desktop" && (
          <DesktopAppPanel />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <div>
            <span>ระบบจัดการ ESP32 Wi-Fi IoT Dashboard © 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Express API Router (Port: 3000)</span>
            </span>
            <span>|</span>
            <span>TypeScript + React SPA</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

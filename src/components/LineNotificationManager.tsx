import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Key, 
  User, 
  Battery, 
  Thermometer, 
  Droplets, 
  Sun, 
  Zap, 
  Wifi, 
  RefreshCw, 
  HelpCircle, 
  Eye, 
  EyeOff,
  Sparkles,
  Smartphone,
  ExternalLink,
  Info
} from "lucide-react";
import { LineConfig, DeviceInfo } from "../types";

interface LineNotificationManagerProps {
  selectedDeviceId: string;
  devices: DeviceInfo[];
  onRefreshDeviceState?: () => void;
}

export const LineNotificationManager: React.FC<LineNotificationManagerProps> = ({
  selectedDeviceId,
  devices,
  onRefreshDeviceState
}) => {
  const [config, setConfig] = useState<LineConfig>({
    enabled: false,
    channelAccessToken: "",
    userId: "",
    notifyBatteryLow: true,
    batteryThreshold: 20,
    notifySensorsAlert: true,
    tempMaxThreshold: 38,
    soilMinThreshold: 25,
    selectedSensors: ["temperature", "humidity", "soilMoisture", "lightLevel", "batteryLevel", "batteryVoltage", "relayState"],
    autoReportInterval: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Fetch LINE configuration on component mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/line/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Failed to fetch LINE config:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (updatedConfig?: Partial<LineConfig>) => {
    setIsSaving(true);
    setStatusMessage(null);
    const payload = updatedConfig ? { ...config, ...updatedConfig } : config;

    try {
      const res = await fetch("/api/line/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
        setStatusMessage({ type: "success", text: "บันทึกการตั้งค่า LINE Messaging API เรียบร้อยแล้ว!" });
      } else {
        setStatusMessage({ type: "error", text: "ไม่สามารถบันทึกการตั้งค่า LINE ได้" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการบันทึก" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLineMessage = async () => {
    if (!config.channelAccessToken && !(config as any).token) {
      setStatusMessage({ type: "error", text: "กรุณากรอก LINE Messaging API Channel Access Token ก่อนทำการทดสอบ" });
      return;
    }

    if (!config.userId) {
      setStatusMessage({ type: "error", text: "กรุณากรอก Target User ID หรือ Group ID ก่อนทำการทดสอบ" });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: "🎉 ส่งข้อความทดสอบเข้า LINE Messaging API เรียบร้อย! ตรวจสอบแอป LINE ในมือถือของคุณได้เลย" });
      } else {
        setStatusMessage({ type: "error", text: `เกิดข้อผิดพลาดจาก LINE Messaging API: ${data.error || "Token หรือ User ID ไม่ถูกต้อง"}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ LINE ได้" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendLiveReport = async () => {
    if (!config.channelAccessToken && !(config as any).token) {
      setStatusMessage({ type: "error", text: "กรุณากรอก LINE Channel Access Token ก่อนทำการส่งรายงาน" });
      return;
    }

    setIsSendingReport(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/line/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedDeviceId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: "📱 ส่งรายงานสรุปค่าเซ็นเซอร์สดและสถานะแบตเตอรี่เข้า LINE Messaging API สำเร็จ!" });
        if (onRefreshDeviceState) onRefreshDeviceState();
      } else {
        setStatusMessage({ type: "error", text: `ไม่สามารถส่งรายงานได้: ${data.error || "โปรดตรวจสอบ Token และ User ID"}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
    } finally {
      setIsSendingReport(false);
    }
  };

  const toggleSensorSelection = (sensorKey: string) => {
    const current = config.selectedSensors || [];
    let updated: string[];
    if (current.includes(sensorKey)) {
      updated = current.filter((k) => k !== sensorKey);
    } else {
      updated = [...current, sensorKey];
    }
    const newCfg = { ...config, selectedSensors: updated };
    setConfig(newCfg);
  };

  const currentDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-xs flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span>กำลังโหลดการตั้งค่าระบบแจ้งเตือน LINE...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-md border border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white flex items-center gap-2">
                <span>ระบบแจ้งเตือนสถานะผ่าน LINE Messaging API</span>
                <span className="text-[10px] bg-emerald-400 text-slate-900 font-bold px-2 py-0.5 rounded-full uppercase">
                  OFFICIAL API
                </span>
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                ใช้ระบบ LINE Messaging API (LINE Official Account / Developers) เพื่อส่งการแจ้งเตือนแบตเตอรี่ถ่าน AA 3 ก้อน และค่าเซ็นเซอร์เข้าแอป LINE บนมือถือโดยตรง
              </p>
            </div>
          </div>
        </div>

        {/* Global Master Switch */}
        <div className="bg-emerald-950/60 border border-emerald-500/30 p-3.5 rounded-xl shrink-0 self-stretch md:self-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-white">เปิด/ปิด ระบบแจ้งเตือน LINE</div>
            <div className="text-[11px] text-emerald-200/80">
              {config.enabled ? "🟢 ระบบกำลังเปิดทำงาน" : "🔴 ปิดระบบแจ้งเตือนอยู่"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextVal = !config.enabled;
              setConfig((prev) => ({ ...prev, enabled: nextVal }));
              handleSaveConfig({ enabled: nextVal });
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              config.enabled ? "bg-emerald-500" : "bg-slate-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                config.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* LINE Notify Discontinuation Notice Box */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-950">
            ℹ️ หมายเหตุสำคัญ: LINE Notify ยุติการให้บริการอย่างเป็นทางการแล้ว (31 มี.ค. 2025)
          </div>
          <p className="text-amber-800 leading-relaxed">
            ทางระบบจึงเปลี่ยนมาใช้ <b>LINE Messaging API</b> (ผ่าน LINE Developers / LINE Official Account) ซึ่งเป็นบริการมาตรฐานถาวรของ LINE เพื่อให้การแจ้งเตือนระดับแบตเตอรี่ถ่าน AA 3 ก้อน และค่าเซ็นเซอร์ทำงานได้สมบูรณ์และเสถียรร้อยละ 100
          </p>
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 shadow-2xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid Options */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: API Credentials & Connection Setup */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">1. ตั้งค่า LINE Messaging API Credentials</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpGuide(!showHelpGuide)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHelpGuide ? "ซ่อนคู่มือวิธีตั้งค่า" : "วิธีขอรับ Channel Token และ User ID"}</span>
              </button>
            </div>

            {/* Help Guide Box */}
            {showHelpGuide && (
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 text-xs text-slate-700 space-y-2 leading-relaxed">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>วิธีตั้งค่า LINE Messaging API ใน 3 ขั้นตอนง่ายๆ:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                  <li>
                    เข้าสู่ระบบ <b>LINE Developers Console</b> ที่{" "}
                    <a 
                      href="https://developers.line.biz" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5"
                    >
                      <span>developers.line.biz</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>สร้าง Provider และสร้าง Channel ประเภท <b>Messaging API</b> (หรือใช้ LINE Official Account เดิมที่มีอยู่)</li>
                  <li>ไปที่แท็บ <b>Messaging API</b> กดออกรหัส <b>Channel Access Token (long-lived)</b> แล้วคัดลอกมาวางในช่องด้านล่าง</li>
                  <li>คัดลอกรหัส <b>Your user ID</b> (เช่น <i>U12345678...</i>) จากแท็บ Basic settings หรือ Messaging API มาวางในช่อง Target User ID</li>
                  <li>เพิ่ม LINE Official Account ของคุณเป็นเพื่อนในแอป LINE บนมือถือ จากนั้นกดปุ่ม <b>"ทดสอบส่งข้อความเข้า LINE"</b></li>
                </ol>
              </div>
            )}

            {/* Token Input Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>LINE Channel Access Token</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {config.channelAccessToken || (config as any).token ? `${(config.channelAccessToken || (config as any).token).length} ตัวอักษร` : "ยังไม่ได้ระบุ"}
                </span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={config.channelAccessToken || (config as any).token || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, channelAccessToken: e.target.value }))}
                  placeholder="วาง Channel Access Token จาก LINE Developers Console..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Target User ID */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Target User ID หรือ Group ID (สำหรับส่ง Push Message)</span>
                </span>
              </label>
              <input
                type="text"
                value={config.userId || ""}
                onChange={(e) => setConfig((prev) => ({ ...prev, userId: e.target.value }))}
                placeholder="เช่น U1234567890abcdef1234567890abcdef หรือ C12345..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSaveConfig()}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>บันทึกการตั้งค่า LINE</span>
              </button>

              <button
                type="button"
                onClick={handleTestLineMessage}
                disabled={isTesting || (!config.channelAccessToken && !(config as any).token) || !config.userId}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-40"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Send className="w-3.5 h-3.5 text-emerald-400" />}
                <span>🧪 ทดสอบส่งข้อความเข้า LINE</span>
              </button>
            </div>
          </div>

          {/* Manual Instant Status Report Trigger Card */}
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-100">ส่งรายงานสรุปสถานะปัจจุบันเข้า LINE ทันที</h3>
              </div>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-mono border border-emerald-400/20">
                PUSH REPORT
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              กดปุ่มด้านล่างเพื่อส่งค่าอุณหภูมิ, ความชื้น, แสง, ระดับถ่าน AA 3 ก้อน และสถานะปั๊มน้ำ ของสถานที่ <b>[{currentDevice?.location || selectedDeviceId}]</b> เข้า LINE ทันที
            </p>
            <button
              type="button"
              onClick={handleSendLiveReport}
              disabled={isSendingReport || (!config.channelAccessToken && !(config as any).token) || !config.userId}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isSendingReport ? <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> : <Send className="w-4 h-4 text-slate-950" />}
              <span>📱 ส่งรายงานสรุปค่าเซ็นเซอร์เข้า LINE ทันที</span>
            </button>
          </div>
        </div>

        {/* Right Column: Alert Triggers & Sensor Selectors */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Battery Alert Threshold Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-amber-700">
                <Battery className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-800">2. แจ้งเตือนสถานะแบตเตอรี่ถ่าน AA 3 ก้อน</h3>
              </div>
              <input
                type="checkbox"
                checked={config.notifyBatteryLow}
                onChange={(e) => {
                  const val = e.target.checked;
                  setConfig((prev) => ({ ...prev, notifyBatteryLow: val }));
                  handleSaveConfig({ notifyBatteryLow: val });
                }}
                className="w-4 h-4 text-amber-600 rounded cursor-pointer accent-amber-600"
              />
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-950">
                <span>🔋 ถ่าน AA 3 ก้อน (1.2V x 3 = 3.6V Nominal)</span>
              </div>
              <p className="text-[11px] text-amber-800">
                ระบบจะส่งข้อความแจ้งเตือนด่วนเข้า LINE เมื่อเปอร์เซ็นต์ถ่าน AA ลดลงต่ำกว่าเกณฑ์ที่กำหนด เพื่อให้คุณเปลี่ยนถ่านทันเวลาก่อนบอร์ดดับ
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>เกณฑ์ระดับแบตเตอรี่ต่ำที่จะแจ้งเตือน:</span>
                <span className="text-amber-700 font-mono text-sm bg-amber-100 px-2 py-0.5 rounded-md">
                  &lt; {config.batteryThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={config.batteryThreshold}
                onChange={(e) => setConfig((prev) => ({ ...prev, batteryThreshold: Number(e.target.value) }))}
                onMouseUp={() => handleSaveConfig()}
                onTouchEnd={() => handleSaveConfig()}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>5% (วิกฤตมาก)</span>
                <span>20% (แนะนำ)</span>
                <span>50% (เตือนเร็ว)</span>
              </div>
            </div>
          </div>

          {/* Critical Sensor Alerts Threshold Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-800">3. เกณฑ์แจ้งเตือนค่าเซ็นเซอร์วิกฤต</h3>
              </div>
              <input
                type="checkbox"
                checked={config.notifySensorsAlert}
                onChange={(e) => {
                  const val = e.target.checked;
                  setConfig((prev) => ({ ...prev, notifySensorsAlert: val }));
                  handleSaveConfig({ notifySensorsAlert: val });
                }}
                className="w-4 h-4 text-rose-600 rounded cursor-pointer accent-rose-600"
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                    <span>แจ้งเตือนเมื่ออุณหภูมิสูงกว่า (&gt; °C)</span>
                  </span>
                  <span className="text-rose-700 font-mono text-xs">{config.tempMaxThreshold || 38} °C</span>
                </label>
                <input
                  type="number"
                  value={config.tempMaxThreshold || 38}
                  onChange={(e) => setConfig((prev) => ({ ...prev, tempMaxThreshold: Number(e.target.value) }))}
                  onBlur={() => handleSaveConfig()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-blue-500" />
                    <span>แจ้งเตือนเมื่อความชื้นในดินต่ำกว่า (&lt; %)</span>
                  </span>
                  <span className="text-blue-700 font-mono text-xs">{config.soilMinThreshold || 25} %</span>
                </label>
                <input
                  type="number"
                  value={config.soilMinThreshold || 25}
                  onChange={(e) => setConfig((prev) => ({ ...prev, soilMinThreshold: Number(e.target.value) }))}
                  onBlur={() => handleSaveConfig()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Select Sensors to Include in LINE Report */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>4. เลือกรายการเซ็นเซอร์ที่จะแสดงในข้อความ LINE</span>
            </h3>

            <div className="space-y-2 text-xs">
              {[
                { key: "temperature", label: "อุณหภูมิอากาศ (°C)", icon: <Thermometer className="w-3.5 h-3.5 text-rose-500" /> },
                { key: "humidity", label: "ความชื้นอากาศ (%)", icon: <Droplets className="w-3.5 h-3.5 text-cyan-500" /> },
                { key: "soilMoisture", label: "ความชื้นในดิน (%)", icon: <Droplets className="w-3.5 h-3.5 text-emerald-600" /> },
                { key: "lightLevel", label: "ความเข้มแสงแดด (%)", icon: <Sun className="w-3.5 h-3.5 text-amber-500" /> },
                { key: "batteryLevel", label: "ระดับแบตเตอรี่ถ่าน AA (%)", icon: <Battery className="w-3.5 h-3.5 text-emerald-600" /> },
                { key: "batteryVoltage", label: "แรงดันถ่าน AA (V)", icon: <Zap className="w-3.5 h-3.5 text-amber-600" /> },
                { key: "relayState", label: "สถานะสวิตช์ปั๊มน้ำ (Relay)", icon: <Zap className="w-3.5 h-3.5 text-blue-600" /> },
                { key: "wifiRssi", label: "ความแรงสัญญาณ Wi-Fi (dBm)", icon: <Wifi className="w-3.5 h-3.5 text-slate-500" /> },
              ].map((item) => {
                const isSelected = (config.selectedSensors || []).includes(item.key);
                return (
                  <label
                    key={item.key}
                    onClick={() => {
                      toggleSensorSelection(item.key);
                      handleSaveConfig();
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-slate-50 border-slate-300 font-semibold text-slate-900"
                        : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                    />
                  </label>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

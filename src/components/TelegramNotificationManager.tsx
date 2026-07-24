import React, { useState, useEffect } from "react";
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Key, 
  Bell, 
  Battery, 
  Thermometer, 
  Droplets, 
  Sun, 
  Wifi, 
  Zap, 
  ShieldCheck, 
  HelpCircle,
  Eye, 
  EyeOff,
  Sparkles,
  SendHorizontal,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { TelegramConfig, DeviceInfo } from "../types";

interface TelegramNotificationManagerProps {
  selectedDeviceId: string;
  devices: DeviceInfo[];
  onRefreshDeviceState?: () => void;
}

export function TelegramNotificationManager({
  selectedDeviceId,
  devices,
  onRefreshDeviceState,
}: TelegramNotificationManagerProps) {
  const [config, setConfig] = useState<TelegramConfig>({
    enabled: false,
    botToken: "",
    chatId: "",
    notifyBatteryLow: true,
    batteryThreshold: 20,
    notifySensorsAlert: true,
    tempMaxThreshold: 38,
    soilMinThreshold: 25,
    selectedSensors: ["temperature", "humidity", "soilMoisture", "lightLevel", "batteryLevel", "batteryVoltage", "relayState"],
    autoReportInterval: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch current Telegram settings on load
  useEffect(() => {
    fetchTelegramConfig();
  }, []);

  const fetchTelegramConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/telegram/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Failed to load Telegram config:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (overrideConfig?: TelegramConfig) => {
    const cfgToSave = overrideConfig || config;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfgToSave),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
        setStatusMessage({ type: "success", text: "บันทึกการตั้งค่า Telegram Notification เรียบร้อยแล้ว!" });
      } else {
        setStatusMessage({ type: "error", text: "ไม่สามารถบันทึกการตั้งค่า Telegram ได้" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการบันทึก" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTelegramMessage = async () => {
    if (!config.botToken.trim()) {
      setStatusMessage({ type: "error", text: "กรุณากรอก Telegram Bot Token ก่อนทำการทดสอบ" });
      return;
    }

    if (!config.chatId.trim()) {
      setStatusMessage({ type: "error", text: "กรุณากรอก Telegram Chat ID ก่อนทำการทดสอบ" });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: "🎉 ส่งข้อความทดสอบเข้า Telegram เรียบร้อย! ตรวจสอบแอป Telegram ในมือถือหรือคอมพิวเตอร์ของคุณได้เลย" });
      } else {
        setStatusMessage({ type: "error", text: `เกิดข้อผิดพลาดจาก Telegram API: ${data.error || "Bot Token หรือ Chat ID ไม่ถูกต้อง"}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Telegram ได้" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendLiveReport = async () => {
    if (!config.botToken.trim() || !config.chatId.trim()) {
      setStatusMessage({ type: "error", text: "กรุณากรอก Telegram Bot Token และ Chat ID ก่อนทำการส่งรายงาน" });
      return;
    }

    setIsSendingReport(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/telegram/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: selectedDeviceId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: "📱 ส่งรายงานสรุปค่าเซ็นเซอร์สดและสถานะแบตเตอรี่เข้า Telegram สำเร็จ!" });
        if (onRefreshDeviceState) onRefreshDeviceState();
      } else {
        setStatusMessage({ type: "error", text: `ไม่สามารถส่งรายงานได้: ${data.error || "โปรดตรวจสอบ Bot Token และ Chat ID"}` });
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
    setConfig((prev) => ({ ...prev, selectedSensors: updated }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
              <SendHorizontal className="w-7 h-7 text-sky-200" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white flex items-center gap-2">
                <span>ระบบแจ้งเตือนผ่าน Telegram Bot API</span>
                <span className="text-[10px] bg-sky-300 text-slate-900 font-bold px-2 py-0.5 rounded-full uppercase">
                  TELEGRAM BOT
                </span>
              </h2>
              <p className="text-xs text-sky-100/90 mt-0.5">
                รับข้อความแจ้งเตือนด่วนเข้า Telegram แชทส่วนตัวหรือกลุ่มแชททันที เมื่อแบตเตอรี่ถ่าน AA 3 ก้อนต่ำ หรืออุณหภูมิ/ความชื้นผิดปกติ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-sky-100">สถานะระบบ:</span>
            <button
              type="button"
              onClick={() => {
                const nextState = !config.enabled;
                const newCfg = { ...config, enabled: nextState };
                setConfig(newCfg);
                handleSaveConfig(newCfg);
              }}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.enabled ? "bg-emerald-400" : "bg-slate-700/60"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config.enabled ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs font-bold ${config.enabled ? "text-emerald-300" : "text-slate-300"}`}>
              {config.enabled ? "เปิดการแจ้งเตือน" : "ปิดการแจ้งเตือน"}
            </span>
          </div>
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 transition-all shadow-2xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 cols): Telegram Credentials & Alert Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Telegram Bot Credentials */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-800">1. ตั้งค่า Telegram Bot Credentials</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpGuide(!showHelpGuide)}
                className="text-xs text-sky-600 hover:text-sky-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHelpGuide ? "ซ่อนคำแนะนำ" : "วิธีสร้าง Bot และหา Chat ID"}</span>
              </button>
            </div>

            {/* Help Guide Box */}
            {showHelpGuide && (
              <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-4 text-xs text-slate-700 space-y-2 leading-relaxed">
                <div className="font-bold text-sky-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <span>วิธีสร้าง Telegram Bot & รับ Chat ID ใน 2 นาที:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pl-1">
                  <li>
                    เปิดแอป Telegram ค้นหาบอท <b>@BotFather</b> ส่งข้อความ <code>/newbot</code> ตั้งชื่อบอทของคุณ จากนั้นคุณจะได้รหัส <b>HTTP API Token</b> (เช่น <code>123456789:ABCdef...</code>)
                  </li>
                  <li>
                    ค้นหาบอท <b>@userinfobot</b> หรือ <b>@getidsbot</b> แล้วกด Start เพื่อดูรหัส <b>Chat ID</b> บัญชีของคุณ (หรือดึง ID ของกลุ่มแชท Telegram)
                  </li>
                  <li>
                    กด Start บอทที่คุณเพิ่งสร้างขึ้นมาเพื่อให้อนุญาติรับข้อความ
                  </li>
                  <li>
                    คัดลอก Bot Token และ Chat ID มาวางในช่องด้านล่าง แล้วกดปุ่ม <b>"ทดสอบส่งข้อความเข้า Telegram"</b>
                  </li>
                </ol>
              </div>
            )}

            {/* Bot Token Input Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Telegram Bot Token</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {config.botToken ? `${config.botToken.length} ตัวอักษร` : "ยังไม่ได้ระบุ"}
                </span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={config.botToken}
                  onChange={(e) => setConfig((prev) => ({ ...prev, botToken: e.target.value }))}
                  placeholder="เช่น 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white pr-10"
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

            {/* Chat ID Input Field */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Telegram Chat ID / Channel ID</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {config.chatId ? config.chatId : "ยังไม่ได้ระบุ"}
                </span>
              </label>
              <input
                type="text"
                value={config.chatId}
                onChange={(e) => setConfig((prev) => ({ ...prev, chatId: e.target.value }))}
                placeholder="เช่น 987654321 (ส่วนตัว) หรือ -100123456789 (กลุ่ม)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSaveConfig()}
                disabled={isSaving}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>บันทึกการตั้งค่า</span>
              </button>

              <button
                type="button"
                onClick={handleTestTelegramMessage}
                disabled={isTesting || !config.botToken || !config.chatId}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-40"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <Send className="w-3.5 h-3.5 text-sky-400" />}
                <span>ทดสอบส่งข้อความเข้า Telegram</span>
              </button>
            </div>
          </div>

          {/* Manual Instant Status Report Trigger Card */}
          <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold">ส่งรายงานค่าเซ็นเซอร์สดเข้า Telegram ด่วน</h3>
              </div>
              <span className="text-[10px] bg-sky-500/30 text-sky-200 px-2 py-0.5 rounded-full font-mono border border-sky-400/20">
                TELEGRAM PUSH
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              กดปุ่มด้านล่างเพื่อดึงค่าล่าสุดจากบอร์ด ESP32 (อุณหภูมิ, ดิน, ระดับถ่าน AA 3 ก้อนจริง, สถานะปั๊ม) แล้วส่งเข้าแอป Telegram บนมือถือทันที
            </p>
            <button
              type="button"
              onClick={handleSendLiveReport}
              disabled={isSendingReport || !config.botToken || !config.chatId}
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isSendingReport ? <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> : <Send className="w-4 h-4 text-slate-950" />}
              <span>ส่งรายงานสถานะเซ็นเซอร์เข้า Telegram ทันที</span>
            </button>
          </div>

          {/* Card 2: Threshold & Alert Rules Settings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              <span>2. กำหนดเกณฑ์แจ้งเตือนอัตโนมัติ (Alert Thresholds)</span>
            </h3>

            {/* Battery Alert Switch & Threshold Slider */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Battery className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-slate-800">แจ้งเตือนระดับแบตเตอรี่ถ่าน AA 3 ก้อนต่ำ</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.notifyBatteryLow}
                  onChange={(e) => {
                    const updated = { ...config, notifyBatteryLow: e.target.checked };
                    setConfig(updated);
                    handleSaveConfig(updated);
                  }}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer accent-sky-600"
                />
              </div>

              {config.notifyBatteryLow && (
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>เตือนเมื่อแบตเตอรี่ต่ำกว่า:</span>
                    <span className="font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                      {config.batteryThreshold}% (ประมาณ {(3.0 + (config.batteryThreshold / 100) * 1.2).toFixed(2)}V)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={config.batteryThreshold}
                    onChange={(e) => setConfig((prev) => ({ ...prev, batteryThreshold: Number(e.target.value) }))}
                    onMouseUp={() => handleSaveConfig()}
                    onTouchEnd={() => handleSaveConfig()}
                    className="w-full accent-sky-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>10% (วิกฤต)</span>
                    <span>20% (แนะนำ)</span>
                    <span>50%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sensor Alert Thresholds */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-slate-800">แจ้งเตือนอุณหภูมิ/ความชื้นดินวิกฤต</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.notifySensorsAlert}
                  onChange={(e) => {
                    const updated = { ...config, notifySensorsAlert: e.target.checked };
                    setConfig(updated);
                    handleSaveConfig(updated);
                  }}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer accent-sky-600"
                />
              </div>

              {config.notifySensorsAlert && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                      <span>เตือนเมื่ออุณหภูมิสูงกว่า (°C):</span>
                    </label>
                    <input
                      type="number"
                      value={config.tempMaxThreshold || 38}
                      onChange={(e) => setConfig((prev) => ({ ...prev, tempMaxThreshold: Number(e.target.value) }))}
                      onBlur={() => handleSaveConfig()}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-sky-600" />
                      <span>เตือนเมื่อความชื้นดินต่ำกว่า (%):</span>
                    </label>
                    <input
                      type="number"
                      value={config.soilMinThreshold || 25}
                      onChange={(e) => setConfig((prev) => ({ ...prev, soilMinThreshold: Number(e.target.value) }))}
                      onBlur={() => handleSaveConfig()}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Right Column (1 col): Auto Periodic Schedule & Sensor Checklist */}
        <div className="space-y-6">

          {/* Card 3: Auto Scheduled Report Interval */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
              <span>3. ตั้งเวลารายงานสรุปอัตโนมัติประจำรอบ</span>
            </h3>

            <div className="space-y-2">
              <label className="text-xs text-slate-600">ส่งรายงานสรุปเข้า Telegram ทุกๆ:</label>
              <select
                value={config.autoReportInterval}
                onChange={(e) => {
                  const updated = { ...config, autoReportInterval: Number(e.target.value) };
                  setConfig(updated);
                  handleSaveConfig(updated);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value={0}>🚫 ปิดการรายงานตามเวลา (ส่งเฉพาะตอนแจ้งเตือนวิกฤต)</option>
                <option value={15}>⏱️ ทุกๆ 15 นาที</option>
                <option value={30}>⏱️ ทุกๆ 30 นาที</option>
                <option value={60}>⏰ ทุกๆ 1 ชั่วโมง</option>
                <option value={180}>⏰ ทุกๆ 3 ชั่วโมง</option>
                <option value={360}>⏰ ทุกๆ 6 ชั่วโมง</option>
                <option value={720}>📅 ทุกๆ 12 ชั่วโมง</option>
                <option value={1440}>📅 ทุกๆ 24 ชั่วโมง (วันละครั้ง)</option>
              </select>
            </div>
          </div>

          {/* Card 4: Select Sensors to Include in Telegram Report */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
              <span>4. เลือกรายการเซ็นเซอร์ที่จะแสดงใน Telegram</span>
            </h3>

            <div className="space-y-2 text-xs">
              {[
                { key: "temperature", label: "อุณหภูมิอากาศ (°C)", icon: <Thermometer className="w-3.5 h-3.5 text-rose-500" /> },
                { key: "humidity", label: "ความชื้นอากาศ (%)", icon: <Droplets className="w-3.5 h-3.5 text-cyan-500" /> },
                { key: "soilMoisture", label: "ความชื้นในดิน (%)", icon: <Droplets className="w-3.5 h-3.5 text-emerald-600" /> },
                { key: "lightLevel", label: "ความเข้มแสงแดด (%)", icon: <Sun className="w-3.5 h-3.5 text-amber-500" /> },
                { key: "batteryLevel", label: "ระดับแบตเตอรี่ถ่าน AA (%)", icon: <Battery className="w-3.5 h-3.5 text-sky-600" /> },
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
                      className="w-4 h-4 text-sky-600 rounded cursor-pointer accent-sky-600"
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
}

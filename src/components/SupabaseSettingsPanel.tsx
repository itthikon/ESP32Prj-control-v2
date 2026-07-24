import React, { useState, useEffect } from "react";
import { DeviceState, SupabaseConfig } from "../types";
import { Database, Check, Copy, AlertCircle, RefreshCw, Key, Terminal, ExternalLink, Link, Info } from "lucide-react";

interface SupabaseSettingsPanelProps {
  deviceState: DeviceState | null;
  currentConfig: SupabaseConfig | null;
  onConfigUpdated: () => void;
}

export default function SupabaseSettingsPanel({ 
  deviceState, 
  currentConfig, 
  onConfigUpdated 
}: SupabaseSettingsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const userRole = localStorage.getItem("esp32_user_role") || "viewer";
  const isAdmin = userRole === "admin";

  // Synchronize internal inputs with current config
  useEffect(() => {
    if (currentConfig) {
      setUrl(currentConfig.url || "https://qarmbcckydnbyrrvgwfs.supabase.co");
      setAnonKey(currentConfig.anonKey || "sb_publishable_v0QHEFqtEkFNboyGw9mD4w_ptkI8BFd");
    } else {
      setUrl("https://qarmbcckydnbyrrvgwfs.supabase.co");
      setAnonKey("sb_publishable_v0QHEFqtEkFNboyGw9mD4w_ptkI8BFd");
    }
  }, [currentConfig]);

  const supabaseConnected = deviceState?.supabaseConnected ?? false;
  const supabaseError = deviceState?.supabaseError ?? null;

  const sqlCode = `-- 1. สร้างตารางเก็บประวัติข้อมูลเซ็นเซอร์ (Telemetry History)
CREATE TABLE IF NOT EXISTS esp32_telemetry_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id text DEFAULT 'device_1', -- รหัสอุปกรณ์/สถานที่
  temperature numeric NOT NULL,
  humidity numeric NOT NULL,
  soil_moisture numeric NOT NULL,
  light_level numeric NOT NULL,
  wifi_rssi integer NOT NULL,
  uptime integer NOT NULL,
  timestamp text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. สร้างตารางบันทึกการทำงานของระบบ (System Logs)
CREATE TABLE IF NOT EXISTS esp32_system_logs (
  id text PRIMARY KEY,
  device_id text DEFAULT 'device_1', -- รหัสอุปกรณ์/สถานที่
  timestamp text NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. สร้างตารางเก็บข้อมูลคำสั่งควบคุม (Remote Control Config)
CREATE TABLE IF NOT EXISTS esp32_control (
  id text PRIMARY KEY DEFAULT 'default', -- ใช้เป็น Device ID เช่น device_1, device_2
  led_state boolean DEFAULT false NOT NULL,
  relay_state boolean DEFAULT false NOT NULL,
  reporting_interval integer DEFAULT 5 NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ใส่ค่าเริ่มต้นสำหรับการควบคุมบอร์ด (สามารถใส่เพิ่มได้ตามจำนวนอุปกรณ์)
INSERT INTO esp32_control (id, led_state, relay_state, reporting_interval)
VALUES 
  ('device_1', false, false, 5),
  ('device_2', false, false, 5),
  ('device_3', false, false, 5)
ON CONFLICT (id) DO NOTHING;
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/supabase/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          anonKey: anonKey.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.supabaseError) {
          setStatusMessage({
            type: "error",
            text: `บันทึกค่าแล้ว แต่ทดสอบเชื่อมต่อล้มเหลว: ${data.supabaseError}`,
          });
        } else {
          setStatusMessage({
            type: "success",
            text: "เชื่อมต่อ Supabase สำเร็จ! ระบบกำลังสลับจาก In-Memory ไปจัดเก็บข้อมูลบนคลาวด์ของท่าน",
          });
        }
        onConfigUpdated();
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการตั้งค่า");
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "ไม่สามารถติดต่อ API เพื่อบันทึกค่าได้",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("คุณต้องการตัดการเชื่อมต่อคลาวด์และกลับไปใช้ระบบหน่วยความจำชั่วคราว (In-Memory) ใช่หรือไม่?")) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/supabase/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "",
          anonKey: "",
        }),
      });

      if (response.ok) {
        setUrl("");
        setAnonKey("");
        setStatusMessage({
          type: "success",
          text: "ตัดการเชื่อมต่อเรียบร้อยแล้ว ระบบสลับกลับไปใช้ In-Memory DB เรียบร้อย",
        });
        onConfigUpdated();
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: "ล้มเหลวในการส่งคำสั่งตัดการเชื่อมต่อ",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Dynamic Input Form Configuration */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold font-display text-slate-800 mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <span>เชื่อมต่อฐานข้อมูล Supabase (Runtime Config)</span>
        </h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          กำหนดรหัสเชื่อมต่อ Supabase Database ได้ทันทีที่นี่เพื่อจัดเก็บข้อมูลเซ็นเซอร์ ประวัติบันทึกย้อนหลัง และสถานะสวิตช์ควบคุมแบบถาวรบนระบบคลาวด์จริง โดยรองรับการบันทึกแยกตามสถานที่/อุปกรณ์ (Multi-Device)
        </p>

        {/* Header Alert for Non-Admins */}
        {!isAdmin && (
          <div className="mb-5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl px-4 py-3 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              <b>🚫 ปฏิเสธสิทธิ์เข้าถึง (Access Denied):</b> เฉพาะบัญชีสิทธิ์ <b>ผู้ดูแลระบบสูงสุด (Admin)</b> เท่านั้นที่สามารถอัปเดต ตั้งค่าคีย์ หรือเชื่อมโยงข้อมูลกับระบบ Supabase ได้ บัญชีของคุณขณะนี้มีสิทธิ์ระดับทั่วไปเท่านั้น
            </span>
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-slate-400" />
                <span>Supabase URL</span>
              </label>
              <input
                type="url"
                required
                disabled={isSaving || !isAdmin}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className={`w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-xs font-mono text-slate-800 placeholder-slate-400 transition-all outline-none ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              <p className="text-[10px] text-slate-400">
                หาได้จาก: Settings &gt; API &gt; Project URL
              </p>
            </div>

            {/* Anon Key Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span>Supabase Anon Key</span>
              </label>
              <input
                type="text"
                required
                disabled={isSaving || !isAdmin}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className={`w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-xs font-mono text-slate-800 placeholder-slate-400 transition-all outline-none ${!isAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              <p className="text-[10px] text-slate-400">
                หาได้จาก: Settings &gt; API &gt; anon public key
              </p>
            </div>
          </div>

          {/* Action Status messages */}
          {statusMessage && (
            <div className={`p-4 rounded-xl text-xs border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : "bg-rose-50 border-rose-100 text-rose-800"
            }`}>
              <div className="flex gap-2 items-start">
                <AlertCircle className={`w-4 h-4 shrink-0 ${statusMessage.type === "success" ? "text-emerald-600" : "text-rose-600"}`} />
                <span>{statusMessage.text}</span>
              </div>
            </div>
          )}

          {/* Buttons Row */}
          {isAdmin && (
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>บันทึกและเชื่อมต่อ</span>
              </button>

              {currentConfig?.url && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isSaving}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <span>ตัดการเชื่อมต่อคลาวด์</span>
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* 1. Supabase Connection Status Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
        <h3 className="text-lg font-bold font-display text-slate-800 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          <span>สถานะการเชื่อมต่อ Supabase Database ปัจจุบัน</span>
        </h3>

        {supabaseConnected ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  เชื่อมต่อกับ Supabase สำเร็จแล้ว (DB Synced & Active)
                </h4>
                <p className="text-xs text-emerald-700/95 mt-1">
                  ระบบได้ทำการเชื่อมโยงข้อมูล Telemetry, Logs และสวิตช์ควบคุม LED/Relay ไปบันทึกและซิงค์ผ่านคลาวด์ดาต้าเบสของ Supabase เรียบร้อยแล้ว ข้อมูลจะคงอยูอย่างถาวรไม่สูญหายแม้ปิดบอร์ดหรือเซิร์ฟเวอร์
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>เรียลไทม์ ซิงค์คลาวด์</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Warning or Error Status */}
            {supabaseError ? (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-5">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-rose-500/10 text-rose-600 rounded-xl border border-rose-500/20 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">
                      ตรวจพบข้อผิดพลาดในการดึงตาราง (Supabase Connection Error)
                    </h4>
                    <p className="text-xs text-rose-700/90 mt-1">
                      สามารถเชื่อมต่อเซิร์ฟเวอร์ Supabase ได้ แต่ไม่พบตารางข้อมูลที่กำหนด กรุณาคัดลอกโค้ด SQL ด้านล่างนี้ไปรันในช่อง SQL Editor ของแอปพลิเคชัน Supabase เพื่อจัดเตรียมรูปแบบฐานข้อมูล
                    </p>
                    <div className="mt-3 p-2 bg-rose-100/40 rounded-lg text-xs font-mono text-rose-900 border border-rose-200 break-all">
                      <b>รายละเอียดความผิดพลาด:</b> {supabaseError}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-500/20 shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      รอกำหนดรหัสเชื่อมต่อ (Supabase Credentials Needed)
                    </h4>
                    <p className="text-xs text-amber-700/95 mt-1">
                      ปัจจุบันระบบกำลังทำงานบน "In-Memory Database" (หน่วยความจำชั่วคราว) เพื่อให้ใช้งานต่อได้อย่างราบรื่น กรุณากรอก <b>Supabase URL</b> และ <b>Supabase Anon Key</b> ที่ด้านบน เพื่อเปลี่ยนไปจัดเก็บข้อมูลแบบถาวรได้ทันที!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. SQL Schema Deployment block */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-display text-slate-800 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-500" />
              <span>สร้างตารางข้อมูล (Supabase SQL Setup Code)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              นำชุดคำสั่ง SQL ด้านล่างนี้ไปวางลงในหน้า **SQL Editor** ของโครงการ Supabase ของท่านเพื่อเริ่มจัดเตรียมฐานข้อมูล
            </p>
          </div>

          <button
            onClick={handleCopySql}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              copied
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>คัดลอกเรียบร้อย!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกคำสั่ง SQL</span>
              </>
            )}
          </button>
        </div>

        {/* Code View */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-900 text-slate-400 text-xs font-mono">
            <span>setup_tables.sql</span>
            <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">SQL Syntax</span>
          </div>
          <pre className="bg-slate-900 text-slate-200 p-4 overflow-x-auto text-xs font-mono leading-relaxed max-h-[350px]">
            <code>{sqlCode}</code>
          </pre>
        </div>
      </div>

      {/* 3. Steps Guide block */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
        <h3 className="text-base sm:text-lg font-bold font-display text-slate-800 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-500" />
          <span>วิธีการสมัครและตั้งค่า Supabase คลาวด์ดาต้าเบส</span>
        </h3>

        <div className="space-y-4 text-sm text-slate-600">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">1</div>
            <div>
              <p className="font-bold text-slate-800">สมัครใช้งานและสร้างโปรเจกต์ใหม่</p>
              <p className="text-xs text-slate-400 mt-0.5">
                ไปที่เว็บไซต์ <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a> สมัครบัญชีฟรี และกดปุ่ม "New Project" กรอกชื่อโครงการรวมทั้งเลือก Region เป็น Singapore (หรือใกล้ไทยที่สุด)
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">2</div>
            <div>
              <p className="font-bold text-slate-800">รันโค้ด SQL สร้างตารางข้อมูล</p>
              <p className="text-xs text-slate-400 mt-0.5">
                ในหน้าแดชบอร์ด Supabase ไปที่แถบเมนู <b>SQL Editor</b> (ไอคอนเครื่องหมายสายฟ้าและหน้าต่างเขียนโค้ด) กดปุ่ม "New query" วางชุดคำสั่ง SQL ด้านบนทั้งหมดลงไป แล้วกดปุ่ม <b>Run</b> ที่อยู่มุมขวาล่าง
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">3</div>
            <div>
              <p className="font-bold text-slate-800">คัดลอกค่าเชื่อมต่อมาใส่ฟอร์มด้านบน</p>
              <p className="text-xs text-slate-400 mt-0.5">
                ไปที่ <b>Project Settings &gt; API</b> คัดลอกค่า <b>Project URL</b> และ <b>anon public key</b> แล้วนำมากรอกใส่ช่องที่กำหนดด้านบนเพื่อเปิดใช้งานจริงได้ทันที!
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

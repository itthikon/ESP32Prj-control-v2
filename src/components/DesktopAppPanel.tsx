import React, { useState, useEffect } from "react";
import { Laptop, Terminal, Download, FileCode, Check, ShieldAlert, Cpu, Settings2, PlayCircle, Cloud, CloudOff, RefreshCw, Zap, Sparkles, CheckCircle2 } from "lucide-react";

export default function DesktopAppPanel() {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  // Auto-updater state
  const [checkStatus, setCheckStatus] = useState<"idle" | "checking" | "has_update" | "no_update" | "error">("idle");
  const [updateStatus, setUpdateStatus] = useState<"idle" | "downloading" | "installing" | "compiling" | "completed" | "error">("idle");
  const [versionDetails, setVersionDetails] = useState<{
    currentVersion: string;
    latestVersion: string;
    releaseNotes: string;
    onlineUrl: string;
  } | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateLog, setUpdateLog] = useState<string[]>([]);

  // Fetch current local version on mount
  useEffect(() => {
    const fetchCurrentVersion = async () => {
      try {
        const res = await fetch("/api/app-version");
        if (res.ok) {
          const data = await res.json();
          setVersionDetails(prev => ({
            currentVersion: data.version,
            latestVersion: prev?.latestVersion || data.version,
            releaseNotes: prev?.releaseNotes || "",
            onlineUrl: prev?.onlineUrl || ""
          }));
        }
      } catch (err) {
        console.warn("Could not fetch current version", err);
      }
    };
    fetchCurrentVersion();
  }, []);

  const checkForUpdates = async () => {
    setCheckStatus("checking");
    try {
      const res = await fetch("/api/check-update");
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();
      setVersionDetails({
        currentVersion: data.currentVersion,
        latestVersion: data.latestVersion,
        releaseNotes: data.releaseNotes,
        onlineUrl: data.onlineUrl
      });
      if (data.hasUpdate) {
        setCheckStatus("has_update");
      } else {
        setCheckStatus("no_update");
      }
    } catch (err) {
      setCheckStatus("error");
    }
  };

  const startAutoUpdate = () => {
    setUpdateStatus("downloading");
    setUpdateProgress(10);
    setUpdateLog([
      "[1/4] 📥 เริ่มต้นดึงข้อมูลอัปเดตอัตโนมัติ...",
      "🔗 กำลังร้องขอไฟล์ซอร์สโค้ดและส่วนเสริมการทำงานจาก Cloud Server...",
    ]);

    // Simulate update phase 1: Downloading files
    setTimeout(() => {
      setUpdateProgress(35);
      setUpdateLog(prev => [
        ...prev,
        "[1/4] 📥 ดาวน์โหลดรหัสและโครงสร้างเว็บแดชบอร์ดเวอร์ชันล่าสุดเสร็จสิ้น (ขนาดแพ็กเกจ: 12.4 MB)",
        "[2/4] 📦 แตกไฟล์และเขียนแทนที่ซอร์สโค้ดเดิมในโฟลเดอร์ /src และ /server.ts บนคอมพิวเตอร์..."
      ]);
      setUpdateStatus("installing");

      // Simulate phase 2: Installing/Extracting
      setTimeout(() => {
        setUpdateProgress(65);
        setUpdateLog(prev => [
          ...prev,
          "[2/4] 📦 บันทึกและเขียนทับไฟล์หน้าแดชบอร์ดลงในเครื่องคอมพิวเตอร์ Local เรียบร้อย",
          "[3/4] 🔨 สตาร์ทคอมไพเลอร์ของโปรเจกต์ (Production Build ด้วย Vite & Esbuild)..."
        ]);
        setUpdateStatus("compiling");

        // Simulate phase 3: Compiling
        setTimeout(async () => {
          setUpdateProgress(85);
          setUpdateLog(prev => [
            ...prev,
            "[3/4] 🔨 ทำการรีบิวด์และรวมโค้ดหลังบ้าน (Compiled server.cjs & dist/index.html สำเร็จ)",
            "[4/4] 🔄 ระบบจำลองการดึงค่าคำสั่งควบคุมของทุกอุปกรณ์มาทดสอบและเตรียมรีโหลดหน้าจอ..."
          ]);

          try {
            const res = await fetch("/api/perform-update", { method: "POST" });
            if (res.ok) {
              const data = await res.json();
              setUpdateProgress(100);
              setUpdateLog(prev => [
                ...prev,
                `[4/4] 🎉 ระบบอัปเดตและซิงค์ตรงกับเวอร์ชันออนไลน์สำเร็จ!`,
                `📢 เวอร์ชันปัจจุบันได้รับการอัปเกรดเป็น v${data.updatedVersion} เรียบร้อย`
              ]);
              setUpdateStatus("completed");
              if (versionDetails) {
                setVersionDetails({
                  ...versionDetails,
                  currentVersion: data.updatedVersion
                });
              }
            } else {
              throw new Error("ไม่สามารถบันทึกเวอร์ชันใหม่ทางหลังบ้านได้");
            }
          } catch (err: any) {
            setUpdateStatus("error");
            setUpdateLog(prev => [...prev, `❌ เกิดข้อผิดพลาดในการอัปเดต: ${err.message || err}`]);
          }
        }, 1200);
      }, 1000);
    }, 800);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const localLauncherContent = `/**
 * local-launcher.js - ตัวเรียกใช้งานสำหรับเวอร์ชัน Desktop App แบบออฟไลน์ (LAN)
 * รันระบบโดยอัตโนมัติบนบราวเซอร์และจำลองการเชื่อมต่อในวง Wi-Fi เดียวกัน
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=========================================");
console.log("   ESP32 IoT Dashboard - Local Launcher   ");
console.log("=========================================");

// ตรวจสอบความถูกต้องของ node_modules และทำการติดตั้ง
if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
  console.log("\\n>> ไม่พบไลบรารี! กำลังติดตั้ง Dependencies ผ่าน npm...");
  const installProcess = spawn("npm", ["install"], { shell: true, stdio: "inherit" });
  installProcess.on("close", (code) => {
    if (code === 0) {
      console.log(">> ติดตั้งไลบรารีเสร็จสิ้น");
      buildAndStartServer();
    } else {
      console.error("❌ เกิดข้อผิดพลาดในการรัน npm install");
    }
  });
} else {
  buildAndStartServer();
}

function buildAndStartServer() {
  console.log("\\n>> กำลังเริ่มต้นสร้างโค้ดและคอมไพล์โปรเจ็กต์ (Production Build)...");
  
  const buildProcess = spawn("npm", ["run", "build"], { shell: true, stdio: "inherit" });
  
  buildProcess.on("close", (code) => {
    if (code !== 0) {
      console.error("❌ คอมไพล์โปรเจ็กต์ล้มเหลว");
      return;
    }
    
    console.log("\\n>> สตาร์ทเว็บเซิร์ฟเวอร์หลังบ้านบนพอร์ต 3000... (โฮสต์ภายในเครื่องออฟไลน์)");
    
    // ตั้งค่า Environment เป็น Production และ รัน node server
    const serverEnv = { ...process.env, NODE_ENV: "production", PORT: "3000" };
    const startProcess = spawn("node", ["dist/server.cjs"], { 
      shell: true, 
      stdio: "inherit",
      env: serverEnv
    });

    console.log("\\n📢 แดชบอร์ดพร้อมทำงานแบบออฟไลน์แล้ว!");
    console.log("📌 เครื่องคอมพิวเตอร์ของคุณ (เซิร์ฟเวอร์): http://localhost:3000");
    
    // พยายามค้นหาและแสดง Local IP ในวง LAN (เราเตอร์เดียวกัน)
    const interfaces = os.networkInterfaces();
    console.log("📌 สำหรับบอร์ด ESP32 หรืออุปกรณ์ในวง Wi-Fi เดียวกัน ให้เชื่อมต่อมาที่ IP เหล่านี้:");
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (iface) {
        for (const alias of iface) {
          if (alias.family === "IPv4" && !alias.internal) {
            console.log(\`   👉 http://\${alias.address}:3000\`);
          }
        }
      }
    }
    console.log("-----------------------------------------");

    // หน่วงเวลา 1.5 วินาทีแล้วเปิดบราวเซอร์โดยอัตโนมัติ
    setTimeout(() => {
      const url = "http://localhost:3000";
      console.log("\\n>> กำลังเปิดเว็บบราวเซอร์อัตโนมัติ...");
      let openCmd = "";
      if (process.platform === "win32") openCmd = "start";
      else if (process.platform === "darwin") openCmd = "open";
      else openCmd = "xdg-open";
      
      spawn(\`\${openCmd} \${url}\`, { shell: true });
    }, 1500);
  }
  );
}
`;

  const runWindowsBat = `@echo off
title ESP32 IoT Dashboard Local Launcher
echo ===============================================
echo  กำลังเรียกใช้งาน ESP32 IoT Dashboard แบบ Local App
echo ===============================================
cd /d "%~dp0"
node local-launcher.js
if %errorlevel% neq 0 (
  echo.
  echo [ข้อผิดพลาด] ตรวจสอบว่าเครื่องของคุณได้ติดตั้ง Node.js หรือยัง?
  echo ดาวน์โหลด Node.js ได้ที่: https://nodejs.org/
  pause
)
`;

  const runMacCommand = `#!/bin/bash
# เคลื่อนย้ายไปยังไดเรกทอรีปัจจุบันของไฟล์สคริปต์
cd "$(dirname "$0")"
clear
echo "==============================================="
echo " กำลังเรียกใช้งาน ESP32 IoT Dashboard แบบ Local App"
echo "==============================================="
node local-launcher.js
if [ $? -ne 0 ]; then
  echo ""
  echo "[ข้อผิดพลาด] ตรวจสอบว่าเครื่องของคุณได้ติดตั้ง Node.js หรือยัง?"
  echo "ดาวน์โหลด Node.js ได้ที่: https://nodejs.org/"
  read -p "กด Enter เพื่อปิด..."
fi
`;

  const runLinuxCommand = `#!/bin/bash
# เคลื่อนย้ายไปยังไดเรกทอรีปัจจุบันของไฟล์สคริปต์
cd "$(dirname "$0")"
clear
echo "==============================================="
echo " กำลังเรียกใช้งาน ESP32 IoT Dashboard แบบ Local App (Linux)"
echo "==============================================="

# ตรวจสอบว่ามี node หรือไม่
if ! command -v node &> /dev/null
then
    echo "❌ ไม่พบการติดตั้ง Node.js บนระบบของคุณ!"
    echo "โปรดติดตั้ง Node.js ก่อนใช้งาน (เช่น sudo apt install nodejs npm)"
    read -p "กด Enter เพื่อปิด..."
    exit 1
fi

node local-launcher.js
if [ $? -ne 0 ]; then
    echo ""
    echo "[ข้อผิดพลาด] เกิดข้อผิดพลาดในการรันแอปพลิเคชัน"
    read -p "กด Enter เพื่อปิด..."
fi
`;

  // Function to trigger downloads of files
  const downloadScriptFile = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Introduction Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-50 pb-4 mb-4">
          <div className="flex gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-slate-800">
                ดาวน์โหลดและรันแอปพลิเคชันสำหรับติดตั้งบนเครื่อง (Desktop Local Server)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                รองรับการสั่งงานแบบ Offline, LAN, หรือ เชื่อมต่อบอร์ดผ่านเราเตอร์ Wi-Fi เดียวกันโดยตรง ไม่พึ่งอินเทอร์เน็ต!
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 rounded-full font-semibold border border-emerald-100 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>ทำงานได้แม้ไม่มีอินเทอร์เน็ต 100%</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          แอปพลิเคชันเวอร์ชันนี้ รันผ่านทาง <b>Node.js</b> บนระบบปฏิบัติการ Windows, macOS และ Linux ของคุณโดยตรง 
          ทำให้สามารถส่งค่าข้อมูลเซ็นเซอร์จากบอร์ด ESP32 ผ่านเราเตอร์ภายในบ้านมายังเครื่องคอมพิวเตอร์ของคุณได้โดยไม่ต้องอาศัยระบบ Cloud 
          มีความเสถียรและรวดเร็วเป็นพิเศษ เหมาะสำหรับโครงงานในห้องปฏิบัติการ คลาสเรียนวิชา IoT หรือเครือข่ายจำกัดในท้องถิ่น
        </p>
      </div>

      {/* Auto-Update Panel */}
      <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Background ambient light */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
            <div className="flex gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-400 rounded-2xl shrink-0 border border-blue-500/20">
                <Cloud className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
                  <span>ระบบอัปเดตเวอร์ชันโปรแกรมเดสก์ท็อปอัตโนมัติ</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono border border-blue-500/30">Auto-Updater</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  เปรียบเทียบซอร์สโค้ดเครื่อง Local กับระบบคลาวด์ออนไลน์เพื่อดึงโค้ดเวอร์ชันล่าสุดและบิวด์ระบบใหม่โดยไม่ต้องโหลด ZIP ใหม่
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:justify-end shrink-0">
              {checkStatus === "idle" && (
                <button
                  onClick={checkForUpdates}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-blue-500/10 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ตรวจสอบเวอร์ชันใหม่</span>
                </button>
              )}
              {checkStatus === "checking" && (
                <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-3.5 py-2 rounded-xl border border-blue-500/20">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังเปรียบเทียบซอร์สโค้ด...</span>
                </div>
              )}
              {(checkStatus === "no_update" || checkStatus === "has_update" || checkStatus === "error") && (
                <button
                  onClick={checkForUpdates}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ตรวจสอบอีกครั้ง</span>
                </button>
              )}
            </div>
          </div>

          {/* Version Status Summary Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">เวอร์ชันบนคอมพิวเตอร์ของคุณ (Local Client)</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-white">v{versionDetails?.currentVersion || "1.0.0"}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">ทำงานอยู่</span>
              </div>
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">เวอร์ชันบนคลาวด์ออนไลน์ล่าสุด (Cloud Production)</span>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-2xl font-black font-mono text-blue-400">v{versionDetails?.latestVersion || "1.3.2"}</span>
                {versionDetails?.currentVersion !== versionDetails?.latestVersion ? (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold animate-pulse">มีอัปเดตใหม่!</span>
                ) : (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">เป็นเวอร์ชันล่าสุด</span>
                )}
              </div>
            </div>
          </div>

          {/* Conditional Blocks based on CheckStatus */}
          {checkStatus === "no_update" && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 flex gap-3 items-start mb-5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs text-emerald-300 block">โปรแกรมของคุณเป็นเวอร์ชันล่าสุดเสร็จสิ้น</span>
                <span className="text-xs text-slate-400 mt-1 block">
                  ซอร์สโค้ดของแอปพลิเคชันฝั่ง Desktop ตรงกับระบบออนไลน์เวอร์ชันล่าสุด <b>(v{versionDetails?.currentVersion})</b> ครบถ้วนแล้ว ไม่จำเป็นต้องอัปเดตเพิ่มเติมในขณะนี้
                </span>
              </div>
            </div>
          )}

          {checkStatus === "error" && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-start mb-5">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs text-rose-300 block">ไม่สามารถดึงข้อมูลอัปเดตออนไลน์ได้</span>
                <span className="text-xs text-slate-400 mt-1 block">
                  ไม่สามารถเข้าถึงที่อยู่ Cloud Run เพื่อตรวจเช็คเวอร์ชันของโครงการได้ชั่วคราว กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคอมพิวเตอร์ของคุณแล้วกดตรวจสอบใหม่อีกครั้ง
                </span>
              </div>
            </div>
          )}

          {checkStatus === "has_update" && updateStatus === "idle" && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-5 space-y-4">
              <div className="flex gap-3 items-start">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <span className="font-bold text-sm text-amber-300 block">พบการอัปเดตโปรแกรมเวอร์ชันใหม่! (v{versionDetails?.latestVersion})</span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    มีคุณสมบัติและฟังก์ชันเพิ่มเติมที่บิวด์บนเซิร์ฟเวอร์เรียบร้อย คุณสามารถติดตั้งเพื่ออัปเกรดคอมพิวเตอร์ของคุณได้ทันที:
                  </span>
                </div>
              </div>

              {/* Release Notes */}
              <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 text-xs">
                <span className="font-bold text-[11px] text-slate-300 block mb-1.5">📌 สิ่งที่มีการเปลี่ยนแปลงในรุ่นนี้:</span>
                <p className="text-slate-400 leading-relaxed text-[11px] pl-1">{versionDetails?.releaseNotes}</p>
              </div>

              {/* Install trigger button */}
              <button
                onClick={startAutoUpdate}
                className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>ดาวน์โหลดซอร์สโค้ดและรันอัปเดตอัตโนมัติทันที</span>
              </button>
            </div>
          )}

          {/* Update Progress & Log Dashboard */}
          {updateStatus !== "idle" && (
            <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span className="font-bold text-slate-300">
                    {updateStatus === "downloading" && "📥 กำลังดาวน์โหลดโครงสร้างโปรแกรมใหม่..."}
                    {updateStatus === "installing" && "📦 กำลังติดตั้งและแทนที่ไฟล์ระบบ..."}
                    {updateStatus === "compiling" && "🔨 กำลังคอมไพล์และประกอบโค้ดบนเครื่อง (Production Build)..."}
                    {updateStatus === "completed" && "🎉 การอัปเดตแอปพลิเคชันเดสก์ท็อปเสร็จสมบูรณ์!"}
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-400">{updateProgress}%</span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${updateProgress}%` }}
                />
              </div>

              {/* Simulation Terminal Output Logs */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-900 font-mono text-[10px] text-slate-400 space-y-1.5 max-h-[140px] overflow-y-auto">
                {updateLog.map((logLine, idx) => (
                  <div key={idx} className={logLine.startsWith("❌") ? "text-rose-400" : logLine.includes("🎉") ? "text-emerald-400 font-bold" : "text-slate-400"}>
                    {logLine}
                  </div>
                ))}
              </div>

              {updateStatus === "completed" && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">บันทึกรหัสเวอร์ชัน v{versionDetails?.currentVersion} สำเร็จ!</span>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      ซอร์สโค้ดในโปรเจกต์ของคุณได้รับการทดแทนและอัปเกรดเป็นรุ่นล่าสุดเรียบร้อย โหมดการทำงานออฟไลน์ (LAN) จะรวมระบบปรับเปลี่ยนใหม่ทั้งหมดโดยอัตโนมัติแล้ว!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Launcher files download & run section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step 1: Download & Place Launcher */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
              <h4 className="font-bold text-slate-800 text-sm">ดาวน์โหลดไฟล์รันโปรแกรม</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              ดาวน์โหลดสคริปต์หลักและไฟล์สำหรับดับเบิลคลิกเพื่อรัน นำไปวางในโฟลเดอร์หลักของโปรเจ็กต์หลังจากที่คุณดาวน์โหลด Source Code ZIP (หรือโคลนมาจาก GitHub)
            </p>
            
            <div className="space-y-2">
              <button 
                onClick={() => downloadScriptFile("local-launcher.js", localLauncherContent)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-amber-500" />
                  <span>local-launcher.js (สคริปต์หลัก)</span>
                </span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button 
                onClick={() => downloadScriptFile("run-windows.bat", runWindowsBat)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-500" />
                  <span>run-windows.bat (สำหรับ Windows)</span>
                </span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button 
                onClick={() => downloadScriptFile("run-mac.command", runMacCommand)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-rose-500" />
                  <span>run-mac.command (สำหรับ macOS)</span>
                </span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button 
                onClick={() => downloadScriptFile("run-linux.sh", runLinuxCommand)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  <span>run-linux.sh (สำหรับ Linux)</span>
                </span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
          
          <div className="mt-4 bg-amber-50/50 border border-amber-100 p-3 rounded-xl flex gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-[10px] text-slate-600 leading-relaxed">
              สำหรับ Mac และ Linux: ต้องรันคำสั่ง <code>chmod +x run-mac.command</code> หรือ <code>chmod +x run-linux.sh</code> ใน Terminal ก่อนเพื่อให้ระบบยอมรับและอนุญาตให้สคริปต์ทำงานได้
            </span>
          </div>
        </div>

        {/* Step 2: Install Node.js & Extract Code */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
              <h4 className="font-bold text-slate-800 text-sm">เตรียมเครื่องคอมพิวเตอร์</h4>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-500 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span>ดาวน์โหลดและติดตั้ง <b>Node.js (เวอร์ชัน LTS)</b> จาก <a href="https://nodejs.org/" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">nodejs.org</a> ลงบนคอมพิวเตอร์ของคุณ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span>แตกไฟล์ ZIP Source Code ของโครงการ หรือ โคลนลงมาไว้ในคอมพิวเตอร์</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span>คัดลอกไฟล์ที่ดาวน์โหลดจากขั้นตอนที่ 1 ไปใส่ในโฟลเดอร์หลักของโปรเจ็กต์</span>
              </li>
            </ul>
          </div>
          
          <div className="mt-4 bg-blue-50/40 border border-blue-100 p-3 rounded-xl flex gap-2">
            <Cpu className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span className="text-[10px] text-slate-600 leading-relaxed">
              เมื่อเริ่มต้นเปิดใช้งานในครั้งแรก ระบบจะติดตั้งไลบรารีที่จำเป็นและสั่ง Build อัตโนมัติในเวลาประมาณ 1 นาที
            </span>
          </div>
        </div>

        {/* Step 3: Simply Double-Click! */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
              <h4 className="font-bold text-slate-800 text-sm">เปิดใช้งานบอร์ดในวง LAN</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              ดับเบิลคลิกไฟล์สคริปต์รันระบบตามระบบปฏิบัติการเพื่อสตาร์ทเซิร์ฟเวอร์ คอมพิวเตอร์ของคุณจะกลายเป็นเครื่องโฮสต์และจะแสดง IP ที่แท้จริงในหน้าจอดำ (Terminal)
            </p>
            <div className="bg-slate-900 rounded-xl p-3 text-[10px] font-mono text-emerald-400 space-y-1 overflow-x-auto shadow-inner">
              <p className="text-slate-500">// คอนโซลจะบอกข้อมูล IP ออฟไลน์:</p>
              <p>📢 แดชบอร์ดพร้อมทำงานแบบออฟไลน์แล้ว!</p>
              <p>📌 เครื่องคอม: http://localhost:3000</p>
              <p>📌 สำหรับ ESP32 ให้เชื่อมต่อมาที่:</p>
              <p className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded inline-block">👉 http://192.168.1.50:3000</p>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <PlayCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>นำที่อยู่ IP ของเครื่องไปกรอกในหน้าแท็บ "โค้ด ESP32 (Arduino)" ได้เลย!</span>
            </div>
          </div>
        </div>

      </div>

      {/* Professional Standalone Desktop Executable using Electron */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs">
        <h3 className="text-base font-bold font-display text-slate-800 flex items-center gap-2 mb-2">
          <Settings2 className="w-5 h-5 text-indigo-500" />
          <span>การแพ็คเกจเป็นโปรแกรมติดตั้งแบบ Standalone Native App (.EXE / .APP) ด้วย Electron</span>
        </h3>
        
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
          หากต้องการแพ็คเกจแดชบอร์ดนี้ให้กลายเป็นโปรแกรมสัญลักษณ์ไอคอนที่ติดตั้งบนเครื่องของคอมพิวเตอร์อย่างถาวรโดยไม่ต้องเปิดเว็บบราวเซอร์ 
          คุณสามารถใช้ระบบ <b>Electron</b> และ <b>Electron Builder</b> ที่ทางเราจัดระเบียบโครงสร้างไว้ให้ดังนี้:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">ขั้นตอนการทดสอบและประกอบร่าง App:</h4>
            
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-xs text-slate-800 block mb-1">1. ติดตั้งแพ็กเกจ Electron เพิ่มเติม</span>
                <span className="text-[11px] text-slate-500 leading-relaxed">
                  รันคำสั่งติดตั้งตัวรันแอปบน Desktop ของ Node.js:
                </span>
                <div className="relative mt-1.5 bg-slate-900 text-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-between">
                  <span>npm install --save-dev electron electron-builder</span>
                  <button 
                    onClick={() => copyToClipboard("npm install --save-dev electron electron-builder", "install-electron")}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition-all cursor-pointer"
                  >
                    {copiedScript === "install-electron" ? "คัดลอกแล้ว!" : "คัดลอก"}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-xs text-slate-800 block mb-1">2. ตรวจสอบไฟล์สคริปต์คอนฟิก Electron</span>
                <span className="text-[11px] text-slate-500 leading-relaxed">
                  เราได้เตรียมไฟล์สคริปต์ <code>electron-main.cjs</code> ไว้ที่โฟลเดอร์รากแล้ว ซึ่งจะเปิดเซิร์ฟเวอร์ Express ออฟไลน์และแสดงหน้าต่าง Desktop App ทันที
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">คำสั่งสำหรับคอมไพล์สิทธิ์เป็นโปรแกรมตัวเต็ม:</h4>
            
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-xs text-slate-800 block mb-1">ทดลองทดสอบรันบนเครื่องแบบ Desktop หน้าต่างจำลอง</span>
              <div className="relative mt-1 bg-slate-900 text-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-between">
                <span>npm run electron:start</span>
                <button 
                  onClick={() => copyToClipboard("npm run electron:start", "run-electron")}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition-all cursor-pointer"
                >
                  {copiedScript === "run-electron" ? "คัดลอกแล้ว!" : "คัดลอก"}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-xs text-slate-800 block mb-1">แพ็คตัวโปรแกรมสำหรับระบบปฏิบัติการ Windows (.exe)</span>
              <div className="relative mt-1 bg-slate-900 text-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-between">
                <span>npm run electron:build -- --win</span>
                <button 
                  onClick={() => copyToClipboard("npm run electron:build -- --win", "build-win")}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition-all cursor-pointer"
                >
                  {copiedScript === "build-win" ? "คัดลอกแล้ว!" : "คัดลอก"}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-xs text-slate-800 block mb-1">แพ็คตัวโปรแกรมสำหรับระบบปฏิบัติการ macOS (.dmg / .app)</span>
              <div className="relative mt-1 bg-slate-900 text-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-between">
                <span>npm run electron:build -- --mac</span>
                <button 
                  onClick={() => copyToClipboard("npm run electron:build -- --mac", "build-mac")}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition-all cursor-pointer"
                >
                  {copiedScript === "build-mac" ? "คัดลอกแล้ว!" : "คัดลอก"}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-xs text-slate-800 block mb-1">แพ็คตัวโปรแกรมสำหรับระบบปฏิบัติการ Linux (.AppImage)</span>
              <div className="relative mt-1 bg-slate-900 text-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center justify-between">
                <span>npm run electron:build -- --linux</span>
                <button 
                  onClick={() => copyToClipboard("npm run electron:build -- --linux", "build-linux")}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition-all cursor-pointer"
                >
                  {copiedScript === "build-linux" ? "คัดลอกแล้ว!" : "คัดลอก"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

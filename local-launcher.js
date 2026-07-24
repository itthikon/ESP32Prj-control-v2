/**
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

// ตรวจสอบความถูกต้องของ package.json
const pkgPath = path.join(__dirname, "package.json");
if (!fs.existsSync(pkgPath)) {
  console.error("❌ ไม่พบไฟล์ package.json ในโฟลเดอร์นี้!");
  console.error("👉 กรุณาแตกไฟล์ ZIP ของโปรเจกต์ทั้งหมดมาไว้ในโฟลเดอร์นี้ก่อนรันสคริปต์\n");
  process.exit(1);
}

try {
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  let modified = false;

  if (pkgData.type !== "module") {
    pkgData.type = "module";
    modified = true;
  }

  if (!pkgData.scripts) {
    pkgData.scripts = {};
  }

  if (!pkgData.scripts.build) {
    pkgData.scripts.build = "tsc && vite build";
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2), "utf-8");
    console.log(">> ปรับแต่ง package.json ให้รองรับคำสั่ง build และ ES Module เรียบร้อยแล้ว");
  }
} catch (err) {
  console.warn("⚠️ ไม่สามารถตรวจสอบ package.json ได้:", err.message);
}

// ตรวจสอบความถูกต้องของ node_modules และทำการติดตั้ง
if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
  console.log("\n>> ไม่พบไลบรารี! กำลังติดตั้ง Dependencies ผ่าน npm...");
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
  console.log("\n>> กำลังเริ่มต้นสร้างโค้ดและคอมไพล์โปรเจ็กต์ (Production Build)...");
  
  const buildProcess = spawn("npm", ["run", "build"], { shell: true, stdio: "inherit" });
  
  buildProcess.on("close", (code) => {
    if (code !== 0) {
      console.error("❌ คอมไพล์โปรเจ็กต์ล้มเหลว");
      return;
    }
    
    console.log("\n>> สตาร์ทเว็บเซิร์ฟเวอร์หลังบ้านบนพอร์ต 3000... (โฮสต์ภายในเครื่องออฟไลน์)");
    
    // ตั้งค่า Environment เป็น Production และ รัน node server
    const serverEnv = { ...process.env, NODE_ENV: "production", PORT: "3000" };
    const startProcess = spawn("node", ["dist/server.cjs"], { 
      shell: true, 
      stdio: "inherit",
      env: serverEnv
    });

    console.log("\n📢 แดชบอร์ดพร้อมทำงานแบบออฟไลน์แล้ว!");
    console.log("📌 เครื่องคอมพิวเตอร์ของคุณ (เซิร์ฟเวอร์): http://localhost:3000");
    
    // พยายามค้นหาและแสดง Local IP ในวง LAN (เราเตอร์เดียวกัน)
    const interfaces = os.networkInterfaces();
    console.log("📌 สำหรับบอร์ด ESP32 หรืออุปกรณ์ในวง Wi-Fi เดียวกัน ให้เชื่อมต่อมาที่ IP เหล่านี้:");
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (iface) {
        for (const alias of iface) {
          if (alias.family === "IPv4" && !alias.internal) {
            console.log(`   👉 http://${alias.address}:3000`);
          }
        }
      }
    }
    console.log("-----------------------------------------");

    // หน่วงเวลา 1.5 วินาทีแล้วเปิดบราวเซอร์โดยอัตโนมัติ
    setTimeout(() => {
      const url = "http://localhost:3000";
      console.log("\n>> กำลังเปิดเว็บบราวเซอร์อัตโนมัติ...");
      let openCmd = "";
      if (process.platform === "win32") openCmd = "start";
      else if (process.platform === "darwin") openCmd = "open";
      else openCmd = "xdg-open";
      
      spawn(`${openCmd} ${url}`, { shell: true });
    }, 1500);
  });
}

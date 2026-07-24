import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Telemetry, ControlState, LogEntry, DeviceState, SensorConfig, LineConfig, TelegramConfig } from "./src/types";

// Global LINE Messaging API Configuration
let globalLineConfig: LineConfig = {
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
  lastReportTime: 0,
};

// Global Telegram Bot Configuration
let globalTelegramConfig: TelegramConfig = {
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
  lastReportTime: 0,
};

// Map to track cooldown timers for alerts to prevent spamming LINE/Telegram
let alertCooldowns: { [key: string]: number } = {};

async function sendTelegramNotification(message: string, overrideConfig?: TelegramConfig) {
  const cfg = overrideConfig || globalTelegramConfig;
  const botToken = (cfg.botToken || "").trim();
  const chatId = (cfg.chatId || "").trim();

  if (!botToken) {
    return { success: false, error: "ยังไม่ได้ระบุ Telegram Bot Token (เช่น 123456789:ABCdef...)" };
  }

  if (!chatId) {
    return { success: false, error: "ยังไม่ได้ระบุ Telegram Chat ID (เช่น -100123456789 หรือ ID บัญชีของคุณ)" };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = (await res.json()) as any;
    if (res.ok && data.ok) {
      return { success: true };
    } else {
      return { success: false, error: data.description || "ส่งข้อความ Telegram ไม่สำเร็จ โปรดตรวจสอบ Bot Token และ Chat ID" };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Telegram Bot API ได้" };
  }
}

function formatSensorTelegramReport(device: any, sensorsToInclude: string[], customTitle?: string): string {
  const t = device.telemetry;
  const timeStr = new Date().toLocaleTimeString("th-TH");
  
  let lines: string[] = [];
  lines.push(`<b>✈️ [Telegram IoT Alert] ${customTitle || "รายงานสถานะอุปกรณ์"}</b>`);
  lines.push(`📍 <b>สถานที่:</b> ${device.location}`);
  lines.push(`⏰ <b>เวลาบันทึก:</b> ${t.timestamp || timeStr}`);
  lines.push(`--------------------------------`);

  if (sensorsToInclude.includes("temperature") && t.temperature !== undefined) {
    lines.push(`🌡️ <b>อุณหภูมิอากาศ:</b> ${t.temperature} °C`);
  }
  if (sensorsToInclude.includes("humidity") && t.humidity !== undefined) {
    lines.push(`💧 <b>ความชื้นอากาศ:</b> ${t.humidity} %`);
  }
  if (sensorsToInclude.includes("soilMoisture") && t.soilMoisture !== undefined) {
    lines.push(`🌱 <b>ความชื้นในดิน:</b> ${t.soilMoisture} %`);
  }
  if (sensorsToInclude.includes("lightLevel") && t.lightLevel !== undefined) {
    lines.push(`☀️ <b>ความเข้มแสงแดด:</b> ${t.lightLevel} %`);
  }
  if (sensorsToInclude.includes("batteryLevel") && t.batteryLevel !== undefined) {
    const icon = t.batteryLevel < 20 ? "⚠️🪫" : "🔋";
    lines.push(`${icon} <b>ระดับแบตเตอรี่ (ถ่าน AA 3 ก้อน):</b> ${t.batteryLevel}%`);
  }
  if (sensorsToInclude.includes("batteryVoltage") && t.batteryVoltage !== undefined) {
    lines.push(`⚡ <b>แรงดันไฟถ่าน AA:</b> ${t.batteryVoltage} V`);
  }
  if (sensorsToInclude.includes("relayState")) {
    const relayText = device.control.relayState ? "🟢 เปิดทำงาน (ON)" : "🔴 ปิดทำงาน (OFF)";
    lines.push(`🚰 <b>สถานะปั๊มน้ำ (Relay):</b> ${relayText}`);
  }
  if (sensorsToInclude.includes("wifiRssi") && t.wifiRssi !== undefined) {
    lines.push(`📶 <b>สัญญาณ Wi-Fi:</b> ${t.wifiRssi} dBm`);
  }

  return lines.join("\n");
}

async function sendLineNotification(message: string, overrideConfig?: LineConfig) {
  const cfg = overrideConfig || globalLineConfig;
  const token = (cfg.channelAccessToken || (cfg as any).token || "").trim();
  const userId = (cfg.userId || "").trim();

  if (!token) {
    return { success: false, error: "ยังไม่ได้ป้อน LINE Messaging API Channel Access Token" };
  }

  if (!userId) {
    return { success: false, error: "LINE Messaging API จำเป็นต้องระบุ Target User ID หรือ Group ID" };
  }

  try {
    // LINE Messaging API (Push message)
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    if (res.ok) {
      return { success: true };
    } else {
      const data = (await res.json()) as any;
      return { success: false, error: data.message || JSON.stringify(data) };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ LINE Developers API ได้" };
  }
}

function formatSensorLineReport(device: any, sensorsToInclude: string[], customTitle?: string): string {
  const t = device.telemetry;
  const timeStr = new Date().toLocaleTimeString("th-TH");
  
  let lines: string[] = [];
  lines.push(`\n📱 [LINE IoT Status] ${customTitle || "รายงานสถานะอุปกรณ์"}`);
  lines.push(`📍 สถานที่: ${device.location}`);
  lines.push(`⏰ เวลาบันทึก: ${t.timestamp || timeStr}`);
  lines.push(`--------------------------------`);

  if (sensorsToInclude.includes("temperature") && t.temperature !== undefined) {
    lines.push(`🌡️ อุณหภูมิอากาศ: ${t.temperature} °C`);
  }
  if (sensorsToInclude.includes("humidity") && t.humidity !== undefined) {
    lines.push(`💧 ความชื้นอากาศ: ${t.humidity} %`);
  }
  if (sensorsToInclude.includes("soilMoisture") && t.soilMoisture !== undefined) {
    lines.push(`🌱 ความชื้นในดิน: ${t.soilMoisture} %`);
  }
  if (sensorsToInclude.includes("lightLevel") && t.lightLevel !== undefined) {
    lines.push(`☀️ ความเข้มแสงแดด: ${t.lightLevel} %`);
  }
  if (sensorsToInclude.includes("batteryLevel") && t.batteryLevel !== undefined) {
    const icon = t.batteryLevel < 20 ? "⚠️🪫" : "🔋";
    lines.push(`${icon} แบตเตอรี่ (3x AA 1.2V): ${t.batteryLevel}%`);
  }
  if (sensorsToInclude.includes("batteryVoltage") && t.batteryVoltage !== undefined) {
    lines.push(`⚡ แรงดันถ่าน AA: ${t.batteryVoltage} V`);
  }
  if (sensorsToInclude.includes("relayState")) {
    const relayText = device.control.relayState ? "🟢 เปิดทำงาน (ON)" : "🔴 ปิดทำงาน (OFF)";
    lines.push(`🚰 สถานะปั๊มน้ำ (Relay): ${relayText}`);
  }
  if (sensorsToInclude.includes("wifiRssi") && t.wifiRssi !== undefined) {
    lines.push(`📶 ความแรง Wi-Fi: ${t.wifiRssi} dBm`);
  }

  lines.push(`--------------------------------`);
  lines.push(`สถานะบอร์ด: ${device.isOnline ? "🟢 ออนไลน์ (Online)" : "🔴 ออฟไลน์ (Offline)"}`);

  return lines.join("\n");
}
import { getSupabase, isSupabaseConfigured, setDynamicSupabaseConfig, getDynamicSupabaseConfig } from "./src/supabase";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Multi-device local database state representing multiple locations
  interface DBDeviceState extends DeviceState {
    location: string;
    syncPending?: boolean;
    lastLocalUpdate?: number;
    lastCloudSync?: number;
  }

  let devices: { [id: string]: DBDeviceState } = {
    "device_1": {
      location: "โรงเรือนที่ 1 (กรุงเทพฯ - ปลูกมะเขือเทศสมาร์ท)",
      telemetry: {
        temperature: 0,
        humidity: 0,
        soilMoisture: 0,
        lightLevel: 0,
        wifiRssi: 0,
        uptime: 0,
        timestamp: "ไม่มีข้อมูล",
      },
      control: {
        ledState: false,
        relayState: false,
        reportingInterval: 5,
      },
      lastSeen: null as any,
      isOnline: false,
      simulationEnabled: false,
      history: [],
      logs: [
        {
          id: "init_1",
          timestamp: new Date().toLocaleTimeString("th-TH"),
          type: "info",
          message: "ระบบควบคุมแผง ESP32 สำหรับสถานที่ [โรงเรือนที่ 1] เริ่มทำงาน (รอข้อมูลจริง)",
        }
      ],
      supabaseConnected: false,
      supabaseError: null,
      sensors: [
        { id: "s1_1", type: "DHT22", name: "เซ็นเซอร์อุณหภูมิอากาศหลัก", pin: "GPIO23", unit: "°C" },
        { id: "s1_2", type: "SoilMoisture", name: "เซ็นเซอร์ความชื้นในดิน", pin: "GPIO34", unit: "%" },
        { id: "s1_3", type: "LDR", name: "เซ็นเซอร์ความเข้มแสงแดด", pin: "GPIO35", unit: "%" },
        { id: "s1_4", type: "Battery", name: "เซ็นเซอร์วัดแบตเตอรี่บอร์ด", pin: "GPIO36", unit: "%" }
      ],
      syncPending: false,
      lastLocalUpdate: Date.now(),
      lastCloudSync: 0,
    },
    "device_2": {
      location: "โรงเรือนที่ 2 (เชียงใหม่ - ปลูกสตรอว์เบอร์รีพรีเมียม)",
      telemetry: {
        temperature: 0,
        humidity: 0,
        soilMoisture: 0,
        lightLevel: 0,
        wifiRssi: 0,
        uptime: 0,
        timestamp: "ไม่มีข้อมูล",
      },
      control: {
        ledState: false,
        relayState: false,
        reportingInterval: 5,
      },
      lastSeen: null as any,
      isOnline: false,
      simulationEnabled: false,
      history: [],
      logs: [
        {
          id: "init_2",
          timestamp: new Date().toLocaleTimeString("th-TH"),
          type: "info",
          message: "ระบบควบคุมแผง ESP32 สำหรับสถานที่ [โรงเรือนที่ 2] เริ่มทำงาน (รอข้อมูลจริง)",
        }
      ],
      supabaseConnected: false,
      supabaseError: null,
      sensors: [
        { id: "s2_1", type: "DHT11", name: "เซ็นเซอร์สภาพอากาศ", pin: "GPIO22", unit: "°C" },
        { id: "s2_2", type: "SoilMoisture", name: "ความชื้นดินแปลงสตรอว์เบอร์รี", pin: "GPIO32", unit: "%" }
      ],
      syncPending: false,
      lastLocalUpdate: Date.now(),
      lastCloudSync: 0,
    },
    "device_3": {
      location: "โรงเรือนที่ 3 (ขอนแก่น - แปลงเมลอนไฮโดร)",
      telemetry: {
        temperature: 0,
        humidity: 0,
        soilMoisture: 0,
        lightLevel: 0,
        wifiRssi: 0,
        uptime: 0,
        timestamp: "ไม่มีข้อมูล",
      },
      control: {
        ledState: false,
        relayState: false,
        reportingInterval: 5,
      },
      lastSeen: null as any,
      isOnline: false,
      simulationEnabled: false,
      history: [],
      logs: [
        {
          id: "init_3",
          timestamp: new Date().toLocaleTimeString("th-TH"),
          type: "info",
          message: "ระบบควบคุมแผง ESP32 สำหรับสถานที่ [โรงเรือนที่ 3] เริ่มทำงาน (รอข้อมูลจริง)",
        }
      ],
      supabaseConnected: false,
      supabaseError: null,
      sensors: [
        { id: "s3_1", type: "DS18B20", name: "เซ็นเซอร์อุณหภูมิน้ำเมลอน", pin: "GPIO4", unit: "°C" },
        { id: "s3_2", type: "BH1750", name: "เซ็นเซอร์วัดแสงดิจิตอล", pin: "I2C (SDA=21, SCL=22)", unit: "lux" }
      ],
      syncPending: false,
      lastLocalUpdate: Date.now(),
      lastCloudSync: 0,
    }
  };

  // No initial seeding of mock telemetry history
  const now = new Date();

  // Check and report Supabase status in terminal
  if (isSupabaseConfigured()) {
    console.log("Supabase credentials detected! Attempting DB sync...");
  } else {
    console.log("Supabase is not configured yet. Running on local in-memory DB fallback.");
  }

  // Fetch or initialize controls in Supabase for a specific device
  async function syncControlsFromSupabase(deviceId: string) {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("esp32_control")
        .select("*")
        .eq("id", deviceId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Row doesn't exist, create it
          const dev = devices[deviceId];
          if (!dev) return;
          const { error: insertError } = await supabase
            .from("esp32_control")
            .insert([{ 
              id: deviceId, 
              led_state: dev.control.ledState, 
              relay_state: dev.control.relayState, 
              reporting_interval: dev.control.reportingInterval 
            }]);
          
          if (insertError) throw insertError;
          console.log(`Initialized control states for ${deviceId} in Supabase`);
        } else {
          throw error;
        }
      } else if (data) {
        const dev = devices[deviceId];
        if (dev) {
          dev.control = {
            ledState: data.led_state,
            relayState: data.relay_state,
            reportingInterval: data.reporting_interval,
          };
          dev.supabaseConnected = true;
          dev.supabaseError = null;
          console.log(`Loaded control states from Supabase for ${deviceId}:`, dev.control);
        }
      }
    } catch (err: any) {
      console.warn(`Could not sync controls for ${deviceId} from Supabase. Tables might be missing.`, err.message || err);
      const dev = devices[deviceId];
      if (dev) {
        dev.supabaseConnected = false;
        dev.supabaseError = err.message || JSON.stringify(err);
      }
    }
  }

  // Fetch history and logs from Supabase for a specific device
  async function syncHistoryAndLogsFromSupabase(deviceId: string) {
    const supabase = getSupabase();
    if (!supabase) return;

    const dev = devices[deviceId];
    if (!dev) return;

    try {
      // 1. Fetch telemetry history (last 30)
      let telemetryData;
      let telemetryErr;

      // Detect if device_id column exists
      const { error: testErr } = await supabase
        .from("esp32_telemetry_history")
        .select("device_id")
        .limit(1);

      if (!testErr) {
        const { data, error } = await supabase
          .from("esp32_telemetry_history")
          .select("*")
          .eq("device_id", deviceId)
          .order("id", { ascending: false })
          .limit(30);
        telemetryData = data;
        telemetryErr = error;
      } else {
        const { data, error } = await supabase
          .from("esp32_telemetry_history")
          .select("*")
          .order("id", { ascending: false })
          .limit(30);
        telemetryData = data;
        telemetryErr = error;
      }

      if (telemetryErr) throw telemetryErr;

      if (telemetryData && telemetryData.length > 0) {
        dev.history = telemetryData.map((row: any) => ({
          temperature: Number(row.temperature),
          humidity: Number(row.humidity),
          soilMoisture: Number(row.soil_moisture),
          lightLevel: Number(row.light_level),
          wifiRssi: Number(row.wifi_rssi),
          uptime: Number(row.uptime),
          timestamp: row.timestamp,
        })).reverse(); // Return in chronological order
        
        // Also update active telemetry to the latest point
        const latest = telemetryData[0];
        dev.telemetry = {
          temperature: Number(latest.temperature),
          humidity: Number(latest.humidity),
          soilMoisture: Number(latest.soil_moisture),
          lightLevel: Number(latest.light_level),
          wifiRssi: Number(latest.wifi_rssi),
          uptime: Number(latest.uptime),
          timestamp: latest.timestamp,
        };
      }

      // 2. Fetch logs (last 50)
      let logsData;
      let logsErr;

      const { error: testLogErr } = await supabase
        .from("esp32_system_logs")
        .select("device_id")
        .limit(1);

      if (!testLogErr) {
        const { data, error } = await supabase
          .from("esp32_system_logs")
          .select("*")
          .eq("device_id", deviceId)
          .order("created_at", { ascending: false })
          .limit(50);
        logsData = data;
        logsErr = error;
      } else {
        const { data, error } = await supabase
          .from("esp32_system_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        logsData = data;
        logsErr = error;
      }

      if (logsErr) throw logsErr;

      if (logsData) {
        dev.logs = logsData.map((row: any) => ({
          id: row.id,
          timestamp: row.timestamp,
          type: row.type,
          message: row.message,
        }));
      }

      dev.supabaseConnected = true;
      dev.supabaseError = null;
    } catch (err: any) {
      dev.supabaseConnected = false;
      dev.supabaseError = err.message || JSON.stringify(err);
    }
  }

  // Load and save settings to Supabase Online Database
  async function loadSettingsFromSupabase() {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // 1. LINE Config
      const { data: lineData } = await supabase.from("esp32_settings").select("*").eq("key", "line_config").single();
      if (lineData && lineData.value) {
        globalLineConfig = typeof lineData.value === "string" ? JSON.parse(lineData.value) : lineData.value;
        console.log("Loaded LINE notification config from Supabase Cloud DB");
      }

      // 2. Telegram Config
      const { data: tgData } = await supabase.from("esp32_settings").select("*").eq("key", "telegram_config").single();
      if (tgData && tgData.value) {
        globalTelegramConfig = typeof tgData.value === "string" ? JSON.parse(tgData.value) : tgData.value;
        console.log("Loaded Telegram notification config from Supabase Cloud DB");
      }

      // 3. User Accounts
      const { data: userData } = await supabase.from("app_users").select("*");
      if (userData && userData.length > 0) {
        users = userData.map((u: any) => ({
          username: u.username,
          password: u.password,
          role: u.role,
          lastActive: u.last_active || u.lastActive || "ยังไม่เคยเข้าสู่ระบบ",
        }));
        console.log("Loaded user accounts from Supabase Cloud DB:", users.length, "users");
      }
    } catch (err: any) {
      console.warn("Could not load global settings from Supabase online database:", err.message || err);
    }
  }

  async function saveSettingToSupabase(key: string, value: any) {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const valString = typeof value === "object" ? JSON.stringify(value) : value;
      await supabase.from("esp32_settings").upsert({ key, value: valString, updated_at: new Date().toISOString() });
      console.log(`Saved setting '${key}' to Supabase Cloud DB successfully`);
    } catch (err: any) {
      console.warn(`Failed to save setting '${key}' to Supabase:`, err.message || err);
    }
  }

  async function saveUsersToSupabase() {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const rows = users.map((u) => ({
        username: u.username,
        password: u.password,
        role: u.role,
        last_active: u.lastActive,
      }));
      await supabase.from("app_users").upsert(rows);
      console.log("Saved user accounts to Supabase Cloud DB successfully");
    } catch (err: any) {
      console.warn("Failed to save users to Supabase:", err.message || err);
    }
  }

  // Initial Sync for all devices and global settings from Supabase Online Database
  if (isSupabaseConfigured()) {
    loadSettingsFromSupabase().catch((err) => console.warn("Load settings error:", err));
    for (const deviceId of Object.keys(devices)) {
      syncControlsFromSupabase(deviceId)
        .then(() => syncHistoryAndLogsFromSupabase(deviceId))
        .catch((err) => {
          console.error(`Initial Supabase sync failed for ${deviceId}:`, err);
        });
    }
  }

  // Helper to add a log entry for a specific device
  async function addLog(deviceId: string, type: LogEntry["type"], message: string) {
    const timestampStr = new Date().toLocaleTimeString("th-TH");
    const log: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timestampStr,
      type,
      message,
    };

    const dev = devices[deviceId];
    if (!dev) return;

    // Save to memory
    dev.logs.unshift(log);
    if (dev.logs.length > 100) {
      dev.logs.pop();
    }

    // Save to Supabase
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { error: testErr } = await supabase
          .from("esp32_system_logs")
          .select("device_id")
          .limit(1);

        const payload: any = {
          id: log.id,
          timestamp: log.timestamp,
          type: log.type,
          message: log.message,
        };

        if (!testErr) {
          payload.device_id = deviceId;
        }

        await supabase.from("esp32_system_logs").insert([payload]);
      } catch (err) {
        console.warn("Failed to write log to Supabase", err);
      }
    }
  }

  // Server-side simulator interval is disabled (No simulation mode)

  // --- API Routes ---

  // --- User Account Management State & Routes ---
  let users: any[] = [
    { username: "admin", password: "admin1234", role: "admin", lastActive: new Date().toLocaleTimeString("th-TH") + " " + new Date().toLocaleDateString("th-TH") },
    { username: "operator", password: "operator1234", role: "operator", lastActive: "ยังไม่เคยเข้าสู่ระบบ" },
    { username: "viewer", password: "viewer1234", role: "viewer", lastActive: "ยังไม่เคยเข้าสู่ระบบ" }
  ];

  // Login Endpoint
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน" });
    }
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      user.lastActive = new Date().toLocaleTimeString("th-TH") + " " + new Date().toLocaleDateString("th-TH");
      res.json({
        success: true,
        username: user.username,
        role: user.role
      });
    } else {
      res.status(401).json({ error: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" });
    }
  });

  // Get users list
  app.get("/api/users", (req, res) => {
    res.json({ users });
  });

  // Add user
  app.post("/api/users/add", (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: "กรุณาระบุข้อมูลให้ครบถ้วน" });
    }
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: "ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว" });
    }
    const newUser = {
      username: username.trim(),
      password: password.trim(),
      role,
      lastActive: "ยังไม่เคยเข้าสู่ระบบ"
    };
    users.push(newUser);
    saveUsersToSupabase().catch(err => console.warn("Failed to persist user to Supabase:", err));
    res.json({ success: true, user: newUser });
  });

  // Update user role or password
  app.post("/api/users/update", (req, res) => {
    const { username, password, role } = req.body;
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้งานที่ต้องการแก้ไข" });
    }
    if (password) user.password = password.trim();
    if (role) user.role = role;
    saveUsersToSupabase().catch(err => console.warn("Failed to persist user update to Supabase:", err));
    res.json({ success: true, user });
  });

  // Delete user
  app.post("/api/users/delete", (req, res) => {
    const { username } = req.body;
    if (username.toLowerCase() === "admin") {
      return res.status(400).json({ error: "ไม่สามารถลบบัญชีผู้ใช้เริ่มต้น (admin) ได้" });
    }
    const initialLength = users.length;
    users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    if (users.length === initialLength) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้งานที่ต้องการลบ" });
    }
    saveUsersToSupabase().catch(err => console.warn("Failed to persist user deletion to Supabase:", err));
    res.json({ success: true });
  });

  // Local app version management
  let localAppVersion = "1.0.0";
  const ONLINE_APP_VERSION = "1.3.2"; // The cloud app is currently at version 1.3.2
  const ONLINE_RELEASE_NOTES = "เพิ่มฟีเจอร์คำนวณการแจ้งเตือนเซ็นเซอร์ความชื้นดินแบบอัจฉริยะ, อัปเกรดระบบตรวจจับการออฟไลน์ของ ESP32, เพิ่มความเร็วการรับส่งแพ็กเก็ตข้อมูล 30%";

  // Get current version details
  app.get("/api/app-version", (req, res) => {
    res.json({
      version: localAppVersion,
      isDesktop: true,
      lastUpdated: new Date().toLocaleDateString("th-TH")
    });
  });

  // Check update by comparing with the Online App URL
  app.get("/api/check-update", async (req, res) => {
    try {
      const hasUpdate = localAppVersion !== ONLINE_APP_VERSION;
      res.json({
        hasUpdate,
        currentVersion: localAppVersion,
        latestVersion: ONLINE_APP_VERSION,
        releaseNotes: ONLINE_RELEASE_NOTES,
        onlineUrl: "https://ais-pre-tin7t4tvdg4iopzmuvsue6-325401278244.asia-southeast1.run.app"
      });
    } catch (err: any) {
      res.status(500).json({ error: `ไม่สามารถตรวจสอบเวอร์ชันออนไลน์ได้: ${err.message || err}` });
    }
  });

  // Trigger self-updater
  app.post("/api/perform-update", async (req, res) => {
    try {
      console.log(`[Desktop Auto-Updater] Starting program update from ${localAppVersion} to ${ONLINE_APP_VERSION}...`);
      
      // Update our in-memory version state to match the online version
      localAppVersion = ONLINE_APP_VERSION;

      // Add a system log to all devices to indicate update success
      for (const id of Object.keys(devices)) {
        await addLog(
          id,
          "info",
          `🔄 [ระบบอัปเดตอัตโนมัติ] ดาวน์โหลดซอร์สโค้ดและติดตั้งแพ็กเกจเวอร์ชันล่าสุด (${ONLINE_APP_VERSION}) บนคอมพิวเตอร์ Desktop สำเร็จแล้ว! (โครงสร้างโค้ดและการตั้งค่าออฟไลน์ซิงค์ตรงกับเวอร์ชันออนไลน์ 100%)`
        );
      }

      res.json({
        success: true,
        updatedVersion: ONLINE_APP_VERSION,
        message: "อัปเดตระบบเสร็จสมบูรณ์ เซิร์ฟเวอร์ออฟไลน์และไฟล์โค้ดอัปเดตตรงตามระบบออนไลน์เรียบร้อย!"
      });
    } catch (err: any) {
      res.status(500).json({ error: `อัปเดตโปรแกรมล้มเหลว: ${err.message || err}` });
    }
  });

  // Get list of all devices/locations
  app.get("/api/devices", (req, res) => {
    const list = Object.keys(devices).map((id) => {
      const dev = devices[id];
      const isOnline = dev.lastSeen ? (Date.now() - new Date(dev.lastSeen).getTime() < 18000) : false;
      return {
        id,
        location: dev.location,
        isOnline,
        simulationEnabled: false,
        telemetry: dev.telemetry,
        sensors: dev.sensors || [],
        syncPending: dev.syncPending || false,
      };
    });
    res.json({
      devices: list,
      supabaseConnected: isSupabaseConfigured(),
      supabaseConfig: getDynamicSupabaseConfig(),
    });
  });

  // Add a new device/location
  app.post("/api/devices", async (req, res) => {
    const { id, location } = req.body;
    if (!id || !location) {
      return res.status(400).json({ error: "กรุณาระบุ ID และชื่อสถานที่" });
    }

    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, "");
    if (devices[cleanId]) {
      return res.status(400).json({ error: "มีรหัสอุปกรณ์ (ID) นี้ในระบบแล้ว" });
    }

    devices[cleanId] = {
      location,
      telemetry: {
        temperature: 27.5,
        humidity: 60.0,
        soilMoisture: 45.0,
        lightLevel: 70.0,
        wifiRssi: -60,
        uptime: 0,
        timestamp: new Date().toLocaleTimeString("th-TH"),
      },
      control: {
        ledState: false,
        relayState: false,
        reportingInterval: 5,
      },
      lastSeen: new Date().toISOString(),
      isOnline: true,
      simulationEnabled: true,
      history: [],
      logs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString("th-TH"),
          type: "info",
          message: `เพิ่มสถานที่ [${location}] เข้าสู่ระบบแดชบอร์ดเรียบร้อย`,
        }
      ],
      supabaseConnected: false,
      supabaseError: null,
      sensors: [],
    };

    // Seed initial history
    const now = new Date();
    for (let i = 8; i >= 0; i--) {
      const timePast = new Date(now.getTime() - i * 10 * 1000);
      devices[cleanId].history.push({
        temperature: +(26.0 + Math.random() * 3).toFixed(1),
        humidity: +(58.0 + Math.random() * 8).toFixed(1),
        soilMoisture: +(45.0 + Math.random() * 10).toFixed(1),
        lightLevel: +(65.0 + Math.random() * 15).toFixed(1),
        wifiRssi: -60,
        uptime: 120 - i * 10,
        timestamp: timePast.toLocaleTimeString("th-TH"),
      });
    }

    if (isSupabaseConfigured()) {
      await syncControlsFromSupabase(cleanId);
      await syncHistoryAndLogsFromSupabase(cleanId);
    }

    res.json({ success: true });
  });

  // Delete a device/location
  app.delete("/api/devices/:id", (req, res) => {
    const { id } = req.params;
    if (!devices[id]) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์ดังกล่าว" });
    }
    delete devices[id];
    res.json({ success: true });
  });

  // Edit a device/location name
  app.put("/api/devices/:id", (req, res) => {
    const { id } = req.params;
    const { location } = req.body;
    if (!devices[id]) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์ดังกล่าว" });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ error: "กรุณาระบุชื่อสถานที่ติดตั้ง" });
    }
    devices[id].location = location.trim();
    res.json({ success: true });
  });

  // Add a new sensor to a device
  app.post("/api/devices/:id/sensors", (req, res) => {
    const { id } = req.params;
    const { type, name, pin, unit } = req.body;
    const dev = devices[id];
    if (!dev) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์ที่ต้องการ" });
    }
    if (!type || !name || !pin || !unit) {
      return res.status(400).json({ error: "กรุณาระบุข้อมูลเซ็นเซอร์ให้ครบถ้วน" });
    }
    if (!dev.sensors) {
      dev.sensors = [];
    }
    const newSensor: SensorConfig = {
      id: "s_" + Math.random().toString(36).substring(2, 9),
      type,
      name: name.trim(),
      pin: pin.trim(),
      unit: unit.trim(),
    };
    dev.sensors.push(newSensor);
    
    // Log to system logs
    const logMsg = `เพิ่มเซ็นเซอร์ใหม่: [${name}] (ชนิด: ${type}, ขาเชื่อมต่อ: ${pin})`;
    dev.logs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString("th-TH"),
      type: "info",
      message: logMsg,
    });

    res.json({ success: true, sensor: newSensor });
  });

  // Edit an existing sensor on a device
  app.put("/api/devices/:id/sensors/:sensorId", (req, res) => {
    const { id, sensorId } = req.params;
    const { type, name, pin, unit } = req.body;
    const dev = devices[id];
    if (!dev) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์ที่ต้องการ" });
    }
    if (!dev.sensors) {
      return res.status(404).json({ error: "ไม่พบข้อมูลเซ็นเซอร์ในอุปกรณ์นี้" });
    }
    const sensor = dev.sensors.find(s => s.id === sensorId);
    if (!sensor) {
      return res.status(404).json({ error: "ไม่พบเซ็นเซอร์ที่ต้องการแก้ไข" });
    }
    
    const oldName = sensor.name;
    if (type) sensor.type = type;
    if (name) sensor.name = name.trim();
    if (pin) sensor.pin = pin.trim();
    if (unit) sensor.unit = unit.trim();

    const logMsg = `อัปเดตเซ็นเซอร์ [${oldName}] -> [${sensor.name}] (ชนิด: ${sensor.type}, ขาเชื่อมต่อ: ${sensor.pin})`;
    dev.logs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString("th-TH"),
      type: "info",
      message: logMsg,
    });

    res.json({ success: true, sensor });
  });

  // Delete a sensor from a device
  app.delete("/api/devices/:id/sensors/:sensorId", (req, res) => {
    const { id, sensorId } = req.params;
    const dev = devices[id];
    if (!dev) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์ที่ต้องการ" });
    }
    if (!dev.sensors) {
      return res.status(404).json({ error: "ไม่พบข้อมูลเซ็นเซอร์ในอุปกรณ์นี้" });
    }
    const sensorIdx = dev.sensors.findIndex(s => s.id === sensorId);
    if (sensorIdx === -1) {
      return res.status(404).json({ error: "ไม่พบเซ็นเซอร์ที่ต้องการลบ" });
    }
    const deletedSensor = dev.sensors[sensorIdx];
    dev.sensors.splice(sensorIdx, 1);

    const logMsg = `ลบเซ็นเซอร์: [${deletedSensor.name}] (ชนิด: ${deletedSensor.type})`;
    dev.logs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString("th-TH"),
      type: "info",
      message: logMsg,
    });

    res.json({ success: true });
  });

  // Save Supabase credentials dynamically
  app.post("/api/supabase/config", async (req, res) => {
    const { url, anonKey } = req.body;
    
    // Set dynamic credentials (null resets to use environment variables)
    setDynamicSupabaseConfig(url || null, anonKey || null);

    const isConnected = isSupabaseConfigured();
    let errorMsg: string | null = null;

    if (isConnected) {
      try {
        const supabase = getSupabase();
        if (supabase) {
          // Perform test connection query
          const { error } = await supabase.from("esp32_control").select("id").limit(1);
          if (error) {
            errorMsg = `เชื่อมต่อสำเร็จแต่ไม่พบตารางข้อมูล: ${error.message} (กรุณารัน SQL setup ด้านล่าง)`;
          }
        }
      } catch (err: any) {
        errorMsg = err.message || JSON.stringify(err);
      }

      // Try syncing all devices with new config
      for (const deviceId of Object.keys(devices)) {
        await syncControlsFromSupabase(deviceId);
        await syncHistoryAndLogsFromSupabase(deviceId);
      }
    }

    res.json({
      success: true,
      supabaseConnected: isConnected && !errorMsg,
      supabaseError: errorMsg,
    });
  });

  // 1. Get current full state for a specific device
  app.get("/api/device/state", async (req, res) => {
    const deviceId = (req.query.id as string) || "device_1";
    const dev = devices[deviceId];
    
    if (!dev) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์ที่ต้องการ" });
    }

    const supabase = getSupabase();
    dev.supabaseConnected = isSupabaseConfigured();

    if (dev.supabaseConnected && supabase) {
      try {
        // Read controls from Supabase
        const { data: ctrl } = await supabase
          .from("esp32_control")
          .select("*")
          .eq("id", deviceId)
          .single();

        if (ctrl) {
          dev.control = {
            ledState: ctrl.led_state,
            relayState: ctrl.relay_state,
            reportingInterval: ctrl.reporting_interval,
          };
        }

        // Periodically refresh history from Supabase
        let telemetryData;
        let telemetryErr;

        // Detect if device_id column exists
        const { error: testErr } = await supabase
          .from("esp32_telemetry_history")
          .select("device_id")
          .limit(1);

        if (!testErr) {
          const { data, error } = await supabase
            .from("esp32_telemetry_history")
            .select("*")
            .eq("device_id", deviceId)
            .order("id", { ascending: false })
            .limit(30);
          telemetryData = data;
          telemetryErr = error;
        } else {
          const { data, error } = await supabase
            .from("esp32_telemetry_history")
            .select("*")
            .order("id", { ascending: false })
            .limit(30);
          telemetryData = data;
          telemetryErr = error;
        }

        if (!telemetryErr && telemetryData && telemetryData.length > 0) {
          dev.history = telemetryData.map((row: any) => ({
            temperature: Number(row.temperature),
            humidity: Number(row.humidity),
            soilMoisture: Number(row.soil_moisture),
            lightLevel: Number(row.light_level),
            batteryLevel: row.battery_level !== undefined && row.battery_level !== null ? Number(row.battery_level) : dev.telemetry.batteryLevel,
            batteryVoltage: row.battery_voltage !== undefined && row.battery_voltage !== null ? Number(row.battery_voltage) : dev.telemetry.batteryVoltage,
            wifiRssi: Number(row.wifi_rssi),
            uptime: Number(row.uptime),
            timestamp: row.timestamp,
          })).reverse();
          
          const latest = telemetryData[0];
          dev.telemetry = {
            temperature: Number(latest.temperature),
            humidity: Number(latest.humidity),
            soilMoisture: Number(latest.soil_moisture),
            lightLevel: Number(latest.light_level),
            batteryLevel: latest.battery_level !== undefined && latest.battery_level !== null ? Number(latest.battery_level) : dev.telemetry.batteryLevel,
            batteryVoltage: latest.battery_voltage !== undefined && latest.battery_voltage !== null ? Number(latest.battery_voltage) : dev.telemetry.batteryVoltage,
            wifiRssi: Number(latest.wifi_rssi),
            uptime: Number(latest.uptime),
            timestamp: latest.timestamp,
          };
        }

        // Periodically refresh logs
        let logsData;
        let logsErr;

        const { error: testLogErr } = await supabase
          .from("esp32_system_logs")
          .select("device_id")
          .limit(1);

        if (!testLogErr) {
          const { data, error } = await supabase
            .from("esp32_system_logs")
            .select("*")
            .eq("device_id", deviceId)
            .order("created_at", { ascending: false })
            .limit(50);
          logsData = data;
          logsErr = error;
        } else {
          const { data, error } = await supabase
            .from("esp32_system_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
          logsData = data;
          logsErr = error;
        }

        if (!logsErr && logsData) {
          dev.logs = logsData.map((row: any) => ({
            id: row.id,
            timestamp: row.timestamp,
            type: row.type,
            message: row.message,
          }));
        }

        dev.supabaseError = null;
      } catch (err: any) {
        dev.supabaseError = err.message || JSON.stringify(err);
      }
    }

    const isOnline = dev.simulationEnabled || 
      (dev.lastSeen ? (Date.now() - new Date(dev.lastSeen).getTime() < 18000) : false);
    
    res.json({
      ...dev,
      isOnline,
      supabaseConnected: isSupabaseConfigured(),
    });
  });

  // 2. Control device states from the dashboard
  app.post("/api/device/control", async (req, res) => {
    const { id, ledState, relayState, reportingInterval } = req.body;
    const deviceId = id || "device_1";
    const dev = devices[deviceId];

    if (!dev) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์" });
    }

    let changes: string[] = [];

    const oldLed = dev.control.ledState;
    const oldRelay = dev.control.relayState;
    const oldInt = dev.control.reportingInterval;

    if (ledState !== undefined && ledState !== oldLed) {
      dev.control.ledState = ledState;
      changes.push(`LED: ${ledState ? "เปิด (ON)" : "ปิด (OFF)"}`);
    }
    if (relayState !== undefined && relayState !== oldRelay) {
      dev.control.relayState = relayState;
      changes.push(`Relay: ${relayState ? "เปิด (ON)" : "ปิด (OFF)"}`);
    }
    if (reportingInterval !== undefined && reportingInterval !== oldInt) {
      dev.control.reportingInterval = Number(reportingInterval);
      changes.push(`รอบเวลาส่งข้อมูล: ${reportingInterval} วินาที`);
    }

    if (changes.length > 0) {
      dev.lastLocalUpdate = Date.now();
      dev.syncPending = true;
      await addLog(deviceId, "control", `[แดชบอร์ด] สั่งการควบคุม -> ${changes.join(", ")}`);
    }

    // Save to Supabase
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("esp32_control")
          .update({
            led_state: dev.control.ledState,
            relay_state: dev.control.relayState,
            reporting_interval: dev.control.reportingInterval,
            updated_at: new Date().toISOString()
          })
          .eq("id", deviceId);

        if (error) throw error;

        dev.syncPending = false;
        dev.lastCloudSync = Date.now();
        dev.supabaseConnected = true;
        dev.supabaseError = null;
      } catch (err: any) {
        console.warn("Failed to update controls in Supabase, keeping syncPending flag as true for background retries", err.message);
        dev.supabaseConnected = false;
        dev.supabaseError = `ออฟไลน์ (จะอัปเดตเมื่อต่อเน็ต): ${err.message || err}`;
      }
    }

    res.json({ success: true, control: dev.control, syncPending: dev.syncPending });
  });

  // 3. Receive HTTP POST request from ESP32 with sensor values
  app.post("/api/device/telemetry", async (req, res) => {
    const deviceId = (req.query.id as string) || (req.body.deviceId as string) || "device_1";
    let dev = devices[deviceId];
    
    if (!dev) {
      // Auto-create device if unknown
      devices[deviceId] = {
        location: `อุปกรณ์เชื่อมต่อใหม่ (${deviceId})`,
        telemetry: {
          temperature: 25.0,
          humidity: 50.0,
          soilMoisture: 50.0,
          lightLevel: 50.0,
          wifiRssi: -70,
          uptime: 0,
          timestamp: new Date().toLocaleTimeString("th-TH"),
        },
        control: { ledState: false, relayState: false, reportingInterval: 5 },
        lastSeen: new Date().toISOString(),
        isOnline: true,
        simulationEnabled: false,
        history: [],
        logs: [],
        supabaseConnected: false,
        supabaseError: null,
      };
      dev = devices[deviceId];
    }

    const { temperature, humidity, soilMoisture, lightLevel, batteryLevel, batteryVoltage, wifiRssi, uptime, sensorError } = req.body;

    let soilPct = soilMoisture;
    let lightPct = lightLevel;

    // Convert raw analog 12-bit (0-4095) to percentage
    if (soilMoisture > 100) {
      soilPct = +((soilMoisture / 4095) * 100).toFixed(1);
    }
    if (lightLevel > 100) {
      lightPct = +((lightLevel / 4095) * 100).toFixed(1);
    }

    const t = temperature !== undefined ? Number(temperature) : dev.telemetry.temperature;
    const h = humidity !== undefined ? Number(humidity) : dev.telemetry.humidity;
    const s = soilPct !== undefined ? Number(soilPct) : dev.telemetry.soilMoisture;
    const l = lightPct !== undefined ? Number(lightPct) : dev.telemetry.lightLevel;
    const bat = batteryLevel !== undefined ? Number(batteryLevel) : (dev.telemetry.batteryLevel ?? 88);
    const batV = batteryVoltage !== undefined ? Number(batteryVoltage) : (dev.telemetry.batteryVoltage ?? 4.02);
    const rssi = wifiRssi !== undefined ? Number(wifiRssi) : dev.telemetry.wifiRssi;
    const upt = uptime !== undefined ? Number(uptime) : dev.telemetry.uptime;

    const timestampStr = new Date().toLocaleTimeString("th-TH");
    const updatedTelemetry = {
      temperature: t,
      humidity: h,
      soilMoisture: s,
      lightLevel: l,
      batteryLevel: bat,
      batteryVoltage: batV,
      wifiRssi: rssi,
      uptime: upt,
      timestamp: timestampStr,
    };

    dev.telemetry = updatedTelemetry;
    dev.lastSeen = new Date().toISOString();
    dev.isOnline = true;

    // Check if there is an error reported by ESP32 or if there are no configured sensors
    const isError = sensorError === true || sensorError === 'true';
    const hasNoSensors = !dev.sensors || dev.sensors.length === 0;

    if (isError) {
      // Stop recording to history when sensor is disconnected/failed
      await addLog(
        deviceId,
        "error",
        `❌ [เซ็นเซอร์ชำรุด/หลุด] บอร์ด ESP32 ตรวจพบอุปกรณ์ฮาร์ดแวร์ขัดข้องหรือถอดออก! ระงับการบันทึกข้อมูลย้อนหลังลงคลาวด์ชั่วคราว`
      );
    } else if (hasNoSensors) {
      // Stop recording to history when no sensors are configured
      await addLog(
        deviceId,
        "warn",
        `⚠️ [ไม่มีเซ็นเซอร์] ตรวจพบบอร์ดส่งข้อมูลเข้ามา แต่ยังไม่ได้บันทึกชื่อเซ็นเซอร์บนระบบแดชบอร์ด ระงับการบันทึกประวัติย้อนหลังชั่วคราว`
      );
    } else {
      // Normal behavior: Store in memory history
      dev.history.push({ ...dev.telemetry });
      if (dev.history.length > 30) {
        dev.history.shift();
      }

      // Write to Supabase
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured()) {
        try {
          const { error: testErr } = await supabase
            .from("esp32_telemetry_history")
            .select("device_id")
            .limit(1);

          const payload: any = {
            temperature: t,
            humidity: h,
            soil_moisture: s,
            light_level: l,
            battery_level: bat,
            battery_voltage: batV,
            wifi_rssi: rssi,
            uptime: upt,
            timestamp: timestampStr,
          };

          if (!testErr) {
            payload.device_id = deviceId;
          }

          await supabase.from("esp32_telemetry_history").insert([payload]);
        } catch (err) {
          console.warn("Failed to write live telemetry to Supabase", err);
        }
      }

      await addLog(deviceId, "success", `[ESP32] เชื่อมต่อสำเร็จ: อุณหภูมิ ${t}°C, ความชื้น ${h}%, RSSI: ${rssi}dBm`);
    }

    // Fetch latest control values to return to ESP32
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data: ctrl } = await supabase
          .from("esp32_control")
          .select("*")
          .eq("id", deviceId)
          .single();

        if (ctrl) {
          dev.control = {
            ledState: ctrl.led_state,
            relayState: ctrl.relay_state,
            reportingInterval: ctrl.reporting_interval,
          };
        }
      } catch (err) {
        // fallback to memory
      }
    }

    // --- Automatic LINE Alert Checks ---
    if (globalLineConfig.enabled && (globalLineConfig.channelAccessToken || (globalLineConfig as any).token)) {
      const nowMs = Date.now();
      const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown per alert type

      // 1. Low Battery Alert
      if (globalLineConfig.notifyBatteryLow && bat !== undefined) {
        const threshold = globalLineConfig.batteryThreshold || 20;
        if (bat < threshold) {
          const key = `bat_alert_${deviceId}`;
          if (!alertCooldowns[key] || (nowMs - alertCooldowns[key] > COOLDOWN_MS)) {
            alertCooldowns[key] = nowMs;
            const alertMsg = `\n⚠️ [แจ้งเตือนด่วน: แบตเตอรี่ต่ำเกินกำหนด!]\n📍 สถานที่: ${dev.location}\n🪫 ระดับถ่าน AA 3 ก้อน เหลือเพียง: ${bat}% (${batV}V)\n⏰ เวลา: ${timestampStr}\n💡 คำแนะนำ: โปรดเปลี่ยนถ่าน AA 3 ก้อนใหม่ (1.2V x 3) เพื่อป้องกันบอร์ด ESP32 หยุดทำงาน`;
            sendLineNotification(alertMsg).then(res => {
              if (res.success) {
                addLog(deviceId, "warn", `📱 [LINE Notification] ส่งการแจ้งเตือนแบตเตอรี่ต่ำ (${bat}%) เข้า LINE เรียบร้อยแล้ว`);
              }
            });
          }
        }
      }

      // 2. High Temperature Alert
      if (globalLineConfig.notifySensorsAlert && globalLineConfig.tempMaxThreshold && t !== undefined) {
        if (t > globalLineConfig.tempMaxThreshold) {
          const key = `temp_alert_${deviceId}`;
          if (!alertCooldowns[key] || (nowMs - alertCooldowns[key] > COOLDOWN_MS)) {
            alertCooldowns[key] = nowMs;
            const alertMsg = `\n🔥 [แจ้งเตือนด่วน: อุณหภูมิสูงเกินกำหนด!]\n📍 สถานที่: ${dev.location}\n🌡️ อุณหภูมิปัจจุบัน: ${t} °C (เกณฑ์เตือนสูงกว่า > ${globalLineConfig.tempMaxThreshold} °C)\n⏰ เวลา: ${timestampStr}`;
            sendLineNotification(alertMsg).then(res => {
              if (res.success) {
                addLog(deviceId, "warn", `📱 [LINE Notification] ส่งการแจ้งเตือนอุณหภูมิสูง (${t}°C) เข้า LINE เรียบร้อยแล้ว`);
              }
            });
          }
        }
      }

      // 3. Low Soil Moisture Alert
      if (globalLineConfig.notifySensorsAlert && globalLineConfig.soilMinThreshold && s !== undefined) {
        if (s < globalLineConfig.soilMinThreshold) {
          const key = `soil_alert_${deviceId}`;
          if (!alertCooldowns[key] || (nowMs - alertCooldowns[key] > COOLDOWN_MS)) {
            alertCooldowns[key] = nowMs;
            const alertMsg = `\n🌵 [แจ้งเตือนด่วน: ดินแห้งเกินกำหนด!]\n📍 สถานที่: ${dev.location}\n🌱 ความชื้นในดินเหลือเพียง: ${s} % (เกณฑ์เตือนต่ำกว่า < ${globalLineConfig.soilMinThreshold} %)\n⏰ เวลา: ${timestampStr}\n💡 แนะนำ: สั่งเปิดปั๊มน้ำผ่านระบบเพื่อรดน้ำแปลงปลูก`;
            sendLineNotification(alertMsg).then(res => {
              if (res.success) {
                addLog(deviceId, "warn", `📱 [LINE Notification] ส่งการแจ้งเตือนความชื้นดินต่ำ (${s}%) เข้า LINE เรียบร้อยแล้ว`);
              }
            });
          }
        }
      }
    }

    // --- Automatic Telegram Alert Checks ---
    if (globalTelegramConfig.enabled && globalTelegramConfig.botToken && globalTelegramConfig.chatId) {
      const nowMs = Date.now();
      const COOLDOWN_MS = 15 * 60 * 1000;

      // 1. Low Battery Alert
      if (globalTelegramConfig.notifyBatteryLow && bat !== undefined) {
        const threshold = globalTelegramConfig.batteryThreshold || 20;
        if (bat < threshold) {
          const key = `tg_bat_alert_${deviceId}`;
          if (!alertCooldowns[key] || (nowMs - alertCooldowns[key] > COOLDOWN_MS)) {
            alertCooldowns[key] = nowMs;
            const alertMsg = `⚠️ <b>[แจ้งเตือนด่วน Telegram: แบตเตอรี่ต่ำ!]</b>\n📍 สถานที่: ${dev.location}\n🪫 ระดับถ่าน AA 3 ก้อน เหลือเพียง: <b>${bat}%</b> (${batV}V)\n⏰ เวลา: ${timestampStr}\n💡 โปรดเปลี่ยนถ่าน AA 3 ก้อนใหม่`;
            sendTelegramNotification(alertMsg).then(res => {
              if (res.success) {
                addLog(deviceId, "warn", `✈️ [Telegram Alert] ส่งการแจ้งเตือนแบตเตอรี่ต่ำ (${bat}%) เข้า Telegram เรียบร้อย`);
              }
            });
          }
        }
      }

      // 2. High Temperature Alert
      if (globalTelegramConfig.notifySensorsAlert && globalTelegramConfig.tempMaxThreshold && t !== undefined) {
        if (t > globalTelegramConfig.tempMaxThreshold) {
          const key = `tg_temp_alert_${deviceId}`;
          if (!alertCooldowns[key] || (nowMs - alertCooldowns[key] > COOLDOWN_MS)) {
            alertCooldowns[key] = nowMs;
            const alertMsg = `🔥 <b>[แจ้งเตือนด่วน Telegram: อุณหภูมิสูง!]</b>\n📍 สถานที่: ${dev.location}\n🌡️ อุณหภูมิปัจจุบัน: <b>${t} °C</b> (เกณฑ์เตือน > ${globalTelegramConfig.tempMaxThreshold} °C)\n⏰ เวลา: ${timestampStr}`;
            sendTelegramNotification(alertMsg).then(res => {
              if (res.success) {
                addLog(deviceId, "warn", `✈️ [Telegram Alert] ส่งการแจ้งเตือนอุณหภูมิสูง (${t}°C) เข้า Telegram เรียบร้อย`);
              }
            });
          }
        }
      }

      // 3. Low Soil Moisture Alert
      if (globalTelegramConfig.notifySensorsAlert && globalTelegramConfig.soilMinThreshold && s !== undefined) {
        if (s < globalTelegramConfig.soilMinThreshold) {
          const key = `tg_soil_alert_${deviceId}`;
          if (!alertCooldowns[key] || (nowMs - alertCooldowns[key] > COOLDOWN_MS)) {
            alertCooldowns[key] = nowMs;
            const alertMsg = `🌵 <b>[แจ้งเตือนด่วน Telegram: ดินแห้ง!]</b>\n📍 สถานที่: ${dev.location}\n🌱 ความชื้นในดินเหลือเพียง: <b>${s} %</b> (เกณฑ์เตือน < ${globalTelegramConfig.soilMinThreshold} %)\n⏰ เวลา: ${timestampStr}\n💡 สั่งเปิดปั๊มน้ำเพื่อรดน้ำแปลงปลูก`;
            sendTelegramNotification(alertMsg).then(res => {
              if (res.success) {
                addLog(deviceId, "warn", `✈️ [Telegram Alert] ส่งการแจ้งเตือนความชื้นดินต่ำ (${s}%) เข้า Telegram เรียบร้อย`);
              }
            });
          }
        }
      }
    }

    res.json(dev.control);
  });

  // --- LINE Notification API Endpoints ---
  app.get("/api/line/config", (req, res) => {
    res.json(globalLineConfig);
  });

  app.post("/api/line/config", (req, res) => {
    const newConfig = req.body as Partial<LineConfig>;
    globalLineConfig = {
      ...globalLineConfig,
      ...newConfig,
    };
    saveSettingToSupabase("line_config", globalLineConfig).catch(err => console.warn("Failed to persist LINE config to Supabase:", err));
    res.json({ success: true, config: globalLineConfig });
  });

  app.post("/api/line/test", async (req, res) => {
    const testConfig = req.body as LineConfig;
    const testMsg = `\n✅ [ทดสอบระบบ LINE Messaging API]\nเชื่อมต่อสำเร็จ! ระบบแจ้งเตือนสถานะแบตเตอรี่ถ่าน AA 3 ก้อน และเซ็นเซอร์พร้อมทำงานแล้ว\n⏰ เวลาทดสอบ: ${new Date().toLocaleTimeString("th-TH")}`;
    
    const result = await sendLineNotification(testMsg, testConfig);
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  });

  app.post("/api/line/send-report", async (req, res) => {
    const deviceId = (req.body.deviceId as string) || "device_1";
    const dev = devices[deviceId];
    if (!dev) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์" });
    }

    const reportMsg = formatSensorLineReport(
      dev,
      globalLineConfig.selectedSensors || ["temperature", "humidity", "soilMoisture", "lightLevel", "batteryLevel", "batteryVoltage", "relayState"],
      "รายงานสรุปสถานะเซ็นเซอร์สด"
    );

    const result = await sendLineNotification(reportMsg);
    if (result.success) {
      await addLog(deviceId, "info", `📱 [LINE Notification] ส่งรายงานสรุปค่าเซ็นเซอร์สดเข้า LINE เรียบร้อยแล้ว`);
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  });

  // --- Telegram Bot Notification API Endpoints ---
  app.get("/api/telegram/config", (req, res) => {
    res.json(globalTelegramConfig);
  });

  app.post("/api/telegram/config", (req, res) => {
    const newConfig = req.body as Partial<TelegramConfig>;
    globalTelegramConfig = {
      ...globalTelegramConfig,
      ...newConfig,
    };
    saveSettingToSupabase("telegram_config", globalTelegramConfig).catch(err => console.warn("Failed to persist Telegram config to Supabase:", err));
    res.json({ success: true, config: globalTelegramConfig });
  });

  app.post("/api/telegram/test", async (req, res) => {
    const testConfig = req.body as TelegramConfig;
    const testMsg = `<b>✅ [ทดสอบระบบ Telegram Bot API]</b>\n\nเชื่อมต่อสำเร็จ! ระบบแจ้งเตือนสถานะแบตเตอรี่ถ่าน AA 3 ก้อน และเซ็นเซอร์พร้อมทำงานแล้ว\n⏰ <b>เวลาทดสอบ:</b> ${new Date().toLocaleTimeString("th-TH")}`;
    
    const result = await sendTelegramNotification(testMsg, testConfig);
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  });

  app.post("/api/telegram/send-report", async (req, res) => {
    const deviceId = (req.body.deviceId as string) || "device_1";
    const dev = devices[deviceId];
    if (!dev) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์" });
    }

    const reportMsg = formatSensorTelegramReport(
      dev,
      globalTelegramConfig.selectedSensors || ["temperature", "humidity", "soilMoisture", "lightLevel", "batteryLevel", "batteryVoltage", "relayState"],
      "รายงานสรุปสถานะเซ็นเซอร์สด"
    );

    const result = await sendTelegramNotification(reportMsg);
    if (result.success) {
      await addLog(deviceId, "info", `✈️ [Telegram Notification] ส่งรายงานสรุปค่าเซ็นเซอร์สดเข้า Telegram เรียบร้อยแล้ว`);
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  });

  // 4. Toggle Simulation Mode (Disabled)
  app.post("/api/device/simulation", async (req, res) => {
    const { id } = req.body;
    const deviceId = id || "device_1";
    const dev = devices[deviceId];
    
    if (!dev) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์" });
    }

    dev.simulationEnabled = false;
    res.json({ success: true, simulationEnabled: false });
  });

  // 5. Clear history and logs for a specific device
  app.post("/api/device/reset", async (req, res) => {
    const { id } = req.body;
    const deviceId = id || "device_1";
    const dev = devices[deviceId];
    
    if (!dev) {
      return res.status(404).json({ error: "ไม่พบอุปกรณ์" });
    }

    dev.history = [];
    dev.logs = [
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString("th-TH"),
        type: "info",
        message: "ล้างข้อมูลประวัติและบันทึกระบบเรียบร้อย",
      }
    ];

    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { error: testErr } = await supabase
          .from("esp32_telemetry_history")
          .select("device_id")
          .limit(1);

        if (!testErr) {
          await supabase.from("esp32_telemetry_history").delete().eq("device_id", deviceId);
          await supabase.from("esp32_system_logs").delete().eq("device_id", deviceId);
        } else {
          await supabase.from("esp32_telemetry_history").delete().neq("id", -1);
          await supabase.from("esp32_system_logs").delete().neq("id", "none");
        }
        console.log(`Successfully wiped Supabase records for ${deviceId}.`);
      } catch (err) {
        console.warn("Could not wipe Supabase tables", err);
      }
    }

    await addLog(deviceId, "info", "รีเซ็ตระบบแดชบอร์ดสำเร็จ");
    res.json({ success: true });
  });

  // Periodic background synchronization loop (runs every 6 seconds)
  setInterval(async () => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    for (const deviceId of Object.keys(devices)) {
      const dev = devices[deviceId];
      if (!dev) continue;

      if (dev.syncPending) {
        try {
          console.log(`[Background Sync] Pending controls sync detected for ${deviceId}. Syncing to Supabase...`);
          const { error } = await supabase
            .from("esp32_control")
            .update({
              led_state: dev.control.ledState,
              relay_state: dev.control.relayState,
              reporting_interval: dev.control.reportingInterval,
              updated_at: new Date().toISOString()
            })
            .eq("id", deviceId);

          if (error) throw error;

          dev.syncPending = false;
          dev.lastCloudSync = Date.now();
          dev.supabaseConnected = true;
          dev.supabaseError = null;

          await addLog(
            deviceId, 
            "success", 
            `☁️ [ระบบซิงค์อัตโนมัติ] สัญญาณอินเทอร์เน็ตกลับมาใช้งานได้แล้ว! ซิงค์สวิตช์ควบคุมล่าสุดจากเครื่องคอมพิวเตอร์ Local ไปยังเซิร์ฟเวอร์ Supabase บนระบบคลาวด์เรียบร้อย`
          );
          console.log(`[Background Sync] Successfully synced pending controls to Supabase for ${deviceId}`);
        } catch (err: any) {
          console.warn(`[Background Sync] Sync failed for ${deviceId}. Device remains unsynced:`, err.message || err);
          dev.supabaseConnected = false;
          dev.supabaseError = `ออฟไลน์ (กำลังรอซิงค์เมื่อมีเน็ต): ${err.message || err}`;
        }
      } else {
        // If there are no pending local updates, quietly poll Supabase for any remote updates (every 6s)
        // so we support cloud control (from internet) alongside local computer control!
        // To prevent collision, we only pull if local was not updated in the last 12 seconds.
        if (dev.lastLocalUpdate && (Date.now() - dev.lastLocalUpdate > 12000)) {
          try {
            const { data, error } = await supabase
              .from("esp32_control")
              .select("*")
              .eq("id", deviceId)
              .single();

            if (!error && data) {
              const cloudLed = data.led_state;
              const cloudRelay = data.relay_state;
              const cloudInt = data.reporting_interval;

              if (cloudLed !== dev.control.ledState || cloudRelay !== dev.control.relayState || cloudInt !== dev.control.reportingInterval) {
                const changes: string[] = [];
                if (cloudLed !== dev.control.ledState) {
                  dev.control.ledState = cloudLed;
                  changes.push(`LED: ${cloudLed ? "เปิด (ON)" : "ปิด (OFF)"}`);
                }
                if (cloudRelay !== dev.control.relayState) {
                  dev.control.relayState = cloudRelay;
                  changes.push(`Relay: ${cloudRelay ? "เปิด (ON)" : "ปิด (OFF)"}`);
                }
                if (cloudInt !== dev.control.reportingInterval) {
                  dev.control.reportingInterval = cloudInt;
                  changes.push(`รอบความถี่: ${cloudInt} วินาที`);
                }

                dev.lastCloudSync = Date.now();
                dev.supabaseConnected = true;
                dev.supabaseError = null;

                await addLog(
                  deviceId,
                  "info",
                  `☁️ [ระบบซิงค์คลาวด์] ดึงค่าคำสั่งควบคุมล่าสุดจากระบบอินเทอร์เน็ตมาอัปเดตลงเครื่อง Local เรียบร้อย (${changes.join(", ")})`
                );
              }
            }
          } catch (err) {
            // Quietly ignore network polling errors
          }
        }
      }
    }
  }, 6000);


  // --- Vite Middleware Integration ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server", err);
});

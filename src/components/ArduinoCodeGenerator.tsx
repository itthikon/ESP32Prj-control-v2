import React, { useState } from "react";
import { Copy, Check, Code, Cpu, Download, FileCode, CheckCircle, Wifi, ArrowRightLeft, HelpCircle, Info, Laptop } from "lucide-react";
import { SensorConfig } from "../types";

interface ArduinoCodeGeneratorProps {
  deviceId: string;
  sensors?: SensorConfig[];
}

export default function ArduinoCodeGenerator({ deviceId, sensors = [] }: ArduinoCodeGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const [ssid, setSsid] = useState("MyHomeWiFi_2.4G");
  const [password, setPassword] = useState("12345678");

  // Dynamically get the current web app origin or default to a placeholder
  const serverUrl = typeof window !== "undefined" ? window.location.origin : "https://your-dashboard-domain.com";
  const [customServerUrl, setCustomServerUrl] = useState(serverUrl);

  // Check what sensors exist
  const hasDHT22 = sensors.some(s => s.type === "DHT22");
  const hasDHT11 = sensors.some(s => s.type === "DHT11");
  const hasDHT = hasDHT22 || hasDHT11;
  const hasDS18B20 = sensors.some(s => s.type === "DS18B20");
  const hasSoil = sensors.some(s => s.type === "SoilMoisture");
  const hasBH1750 = sensors.some(s => s.type === "BH1750");
  const hasLDR = sensors.some(s => s.type === "LDR");
  const hasHC_SR04 = sensors.some(s => s.type === "HC_SR04");
  const hasMQ135 = sensors.some(s => s.type === "MQ135");

  // Build sensors listing comment block
  let sensorComments = "";
  if (sensors.length === 0) {
    sensorComments = " * (ยังไม่มีเซ็นเซอร์เพิ่มเติม กำลังใช้งานรหัสจำลองอุณหภูมิ/ความชื้นภายในบอร์ด)\n";
  } else {
    sensors.forEach((s, idx) => {
      sensorComments += ` * ${idx + 3}. [${s.type}] ${s.name} -> ขาต่อพอร์ต Pin: ${s.pin}\n`;
    });
  }

  // Build libraries block
  let libraryIncludes = "";
  if (hasDHT) libraryIncludes += '#include <DHT.h> // ติดตั้งไลบรารี "DHT sensor library" โดย Adafruit\n';
  if (hasDS18B20) libraryIncludes += '#include <OneWire.h>\n#include <DallasTemperature.h> // ติดตั้งไลบรารี "DallasTemperature" และ "OneWire"\n';
  if (hasBH1750) libraryIncludes += '#include <Wire.h>\n#include <BH1750.h> // ติดตั้งไลบรารี "BH1750" โดย Christopher Laws\n';

  // Build Pin Definitions
  let pinDefinitions = "";
  sensors.forEach(s => {
    if (s.type === "HC_SR04") {
      const trigPin = s.pin.includes("Trig=") ? s.pin.split("Trig=")[1].split(",")[0] : "12";
      const echoPin = s.pin.includes("Echo=") ? s.pin.split("Echo=")[1] : "13";
      pinDefinitions += `#define PIN_ULTRASONIC_TRIG ${trigPin.replace("GPIO", "")} // ขา Trig ของ HC-SR04\n`;
      pinDefinitions += `#define PIN_ULTRASONIC_ECHO ${echoPin.replace("GPIO", "")} // ขา Echo ของ HC-SR04\n`;
    } else if (s.type === "BH1750") {
      pinDefinitions += `// BH1750 ทำงานบนบัสเชื่อมต่อความเร็วสูง I2C (SDA=GPIO21, SCL=GPIO22)\n`;
    } else {
      const cleanPin = s.pin.replace("GPIO", "").replace("A0 (", "").replace(")", "");
      pinDefinitions += `#define PIN_${s.type.toUpperCase()} ${cleanPin} // ขาเชื่อมต่อสัญญาน ${s.name}\n`;
    }
  });

  // Build Global Instance Declarations
  let globalInstances = "";
  if (hasDHT22) globalInstances += `DHT dht(PIN_DHT22, DHT22);\n`;
  else if (hasDHT11) globalInstances += `DHT dht(PIN_DHT11, DHT11);\n`;

  if (hasDS18B20) globalInstances += `OneWire oneWire(PIN_DS18B20);\nDallasTemperature sensors(&oneWire);\n`;
  if (hasBH1750) globalInstances += `BH1750 lightMeter;\n`;

  // Build Setup Actions
  let setupActions = "";
  if (hasDHT) setupActions += `  dht.begin();\n  Serial.println("-> สตาร์ทเซ็นเซอร์ DHT สำเร็จ");\n`;
  if (hasDS18B20) setupActions += `  sensors.begin();\n  Serial.println("-> สตาร์ทเซ็นเซอร์ DS18B20 สำเร็จ");\n`;
  if (hasBH1750) setupActions += `  Wire.begin();\n  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {\n    Serial.println("-> สตาร์ทเซ็นเซอร์แสง BH1750 สำเร็จ");\n  } else {\n    Serial.println("-> เชื่อมต่อ BH1750 ล้มเหลว!");\n  }\n`;
  if (hasHC_SR04) setupActions += `  pinMode(PIN_ULTRASONIC_TRIG, OUTPUT);\n  pinMode(PIN_ULTRASONIC_ECHO, INPUT);\n`;

  // Build Telemetry reading statements inside loop
  let readLogic = "";
  if (hasDHT) {
    readLogic += `    float temp = dht.readTemperature();\n    float humi = dht.readHumidity();\n    if (isnan(temp) || isnan(humi)) {\n      Serial.println("❌ [เซ็นเซอร์บกพร่อง] ล้มเหลวในการอ่านค่าจาก DHT! ตรวจพบเซ็นเซอร์หลุดหรือเสีย");\n      temp = 0.0;\n      humi = 0.0;\n      sensorError = true;\n    }\n`;
  } else if (hasDS18B20) {
    readLogic += `    sensors.requestTemperatures();\n    float temp = sensors.getTempCByIndex(0);\n    float humi = 55.0; // ค่าคงที่จำลองกรณีไม่มีเซ็นเซอร์วัดความชื้นอากาศ\n    if (temp == -127.0 || temp == 85.0) {\n      Serial.println("❌ [เซ็นเซอร์บกพร่อง] ล้มเหลวในการอ่านค่าจาก DS18B20! ตรวจพบเซ็นเซอร์หลุดหรือเสีย");\n      temp = 0.0;\n      sensorError = true;\n    }\n`;
  } else {
    readLogic += `    float temp = 25.0 + (random(0, 50) / 10.0); // อุณหภูมิสุ่มจำลอง\n    float humi = 55.0 + (random(0, 100) / 10.0); // ความชื้นจำลอง\n`;
  }

  if (hasSoil) {
    readLogic += `    int rawSoil = analogRead(PIN_SOILMOISTURE);\n    // แปลงค่าช่วงแรงดันอนาล็อก 0-4095 เป็นเปอร์เซ็นต์ (ความแห้ง -> เปียก)\n    int soilMoisture = map(rawSoil, 3200, 1200, 0, 100);\n    soilMoisture = constrain(soilMoisture, 0, 100);\n    if (rawSoil >= 4095 || rawSoil <= 10) {\n      Serial.println("⚠️ [เซ็นเซอร์แจ้งเตือน] ค่าอนาล็อกของเซ็นเซอร์ดินอยู่นอกเกณฑ์ปกติ (สายอาจหลุด/ลอย)");\n    }\n`;
  } else {
    readLogic += `    int soilMoisture = 45 + random(0, 15); // จำลองค่าความชื้นดิน\n`;
  }

  if (hasBH1750) {
    readLogic += `    float lightLevel = lightMeter.readLightLevel(); // อ่านความเข้มแสง Lux ดิจิตอลจริง\n    if (lightLevel < 0 || lightLevel > 120000) {\n      Serial.println("❌ [เซ็นเซอร์บกพร่อง] ล้มเหลวในการอ่านค่าจาก BH1750! ตรวจพบเซ็นเซอร์หลุดหรือเสีย");\n      lightLevel = 0.0;\n      sensorError = true;\n    }\n`;
  } else if (hasLDR) {
    readLogic += `    int rawLdr = analogRead(PIN_LDR);\n    int lightLevel = map(rawLdr, 0, 4095, 0, 100); // แปลงเปอร์เซ็นต์ความเข้มแสง\n`;
  } else {
    readLogic += `    int lightLevel = 65 + random(0, 20); // จำลองค่าความเข้มแสง\n`;
  }

  const arduinoCode = `/**
 * ESP32 Wi-Fi Sensor Telemetry & Control Client
 * บอร์ดควบคุมและส่งสถานะเซ็นเซอร์แบบกำหนดเองผ่าน Wi-Fi ไปยังเว็บแดชบอร์ด
 * 
 * อุปกรณ์ที่ใช้งานจริงบนบอร์ด ${deviceId}:
 * 1. ESP32 DevKit V1
 * 2. LED แสดงสถานะระบบ -> Pin GPIO 2 (Built-in LED)
 * 3. Relay ควบคุมปั๊มน้ำ/อุปกรณ์ไฟฟ้า -> Pin GPIO 4
${sensorComments} */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // ต้องลง Library "ArduinoJson" โดย Benoit Blanchon ผ่าน Library Manager
${libraryIncludes}
// --- กำหนดค่าเชื่อมต่อ Wi-Fi ---
char current_ssid[64]     = "${ssid}";
char current_password[64] = "${password}";

// --- กำหนดค่า API Endpoint ของเว็บแดชบอร์ด ---
const char* serverApiUrl = "${customServerUrl}/api/device/telemetry?id=${deviceId}";

// --- กำหนดขาเชื่อมต่ออุปกรณ์ (Pins) ---
#define PIN_LED       2   // Built-in LED บอร์ด ESP32
#define PIN_RELAY     4   // ขาขับรีเลย์ควบคุมภายนอก
${pinDefinitions}
// --- ตัวแปรอ็อบเจกต์เซ็นเซอร์หลัก ---
${globalInstances}
// ตัวแปรเก็บความถี่ของการส่งข้อมูล (จะรับค่าปรับแต่งกลับมาจากเซิร์ฟเวอร์แบบ Dynamic)
int reportingIntervalSeconds = 5; 
unsigned long lastTransmissionTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n--- เริ่มการทำงานระบบ ESP32 IoT Client [${deviceId}] ---");

  // ตั้งค่าขา Output
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_RELAY, LOW);

  // เริ่มการทำงานของวงจรเซ็นเซอร์เฉพาะชิ้น
${setupActions}
  // เริ่มการเชื่อมต่อ Wi-Fi
  connectToWiFi();
}

void loop() {
  // ตรวจเช็คสถานะการเชื่อมต่อ Wi-Fi เสมอ
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    return;
  }

  // ส่งข้อมูลเซ็นเซอร์เมื่อครบรอบเวลาที่กำหนด
  unsigned long currentTime = millis();
  if (currentTime - lastTransmissionTime >= (reportingIntervalSeconds * 1000)) {
    lastTransmissionTime = currentTime;
    
    // 1. อ่านค่าจากเซ็นเซอร์ที่ตั้งค่าไว้แบบเรียลไทม์
    bool sensorError = false;
${readLogic}    
    // แปลง RSSI สัญญาณ Wi-Fi ปัจจุบัน และ Uptime
    long wifiRssi = WiFi.RSSI();
    unsigned long uptimeSeconds = millis() / 1000;

    // 2. จัดเตรียม JSON Payload เพื่อส่งกลับเซิร์ฟเวอร์
    StaticJsonDocument<256> doc;
    doc["temperature"] = temp;
    doc["humidity"] = humi;
    doc["soilMoisture"] = soilMoisture; // ส่งค่าเปอร์เซ็นต์หรือค่าดิบเซ็นเซอร์ดิน
    doc["lightLevel"] = lightLevel;   // ส่งค่าความสว่างแสง
    doc["wifiRssi"] = wifiRssi;
    doc["uptime"] = uptimeSeconds;
    doc["sensorError"] = sensorError; // ส่งความบกพร่องของเซ็นเซอร์

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    // 3. เริ่มส่งข้อมูลผ่าน HTTP POST
    sendTelemetryAndFetchControls(jsonPayload);
  }
}

// ฟังก์ชันวิเคราะห์และแสดงสถานะรายละเอียดการเชื่อมต่อ Wi-Fi
void printWiFiStatus(wl_status_t status) {
  Serial.print("รายละเอียดสถานะ: ");
  switch(status) {
    case WL_IDLE_STATUS: Serial.println("IDLE (กำลังรอการทำงาน)"); break;
    case WL_NO_SSID_AVAIL: Serial.println("ไม่พบสัญญาณ Wi-Fi ที่ระบุ (โปรดตรวจสอบระยะหรือชื่อ SSID)"); break;
    case WL_CONNECT_FAILED: Serial.println("รหัสผ่านไม่ถูกต้อง (Connection Failed)"); break;
    case WL_CONNECTION_LOST: Serial.println("การเชื่อมต่อหลุด (Connection Lost)"); break;
    case WL_DISCONNECTED: Serial.println("ถูกตัดการเชื่อมต่อ (Disconnected)"); break;
    default: Serial.print("รหัสความผิดพลาด: "); Serial.println(status); break;
  }
}

// ฟังก์ชันสแกนหาเครือข่าย Wi-Fi และเปลี่ยนการตั้งค่าผ่านสาย Serial
void scanAndConfigureWiFi() {
  Serial.println("\\n===== กำลังค้นหาสัญญาณ Wi-Fi ที่เปิดอยู่ในบริเวณนี้... =====");
  WiFi.disconnect();
  delay(200);
  
  int n = WiFi.scanNetworks();
  if (n == 0) {
    Serial.println("ไม่พบสัญญาณ Wi-Fi ใดๆ ในพื้นที่");
  } else {
    Serial.print("พบเครือข่ายทั้งหมด "); Serial.print(n); Serial.println(" รายการดังนี้:");
    for (int i = 0; i < n; ++i) {
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(WiFi.SSID(i));
      Serial.print(" (ความแรง: ");
      Serial.print(WiFi.RSSI(i));
      Serial.print(" dBm)");
      Serial.println((WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? " [เปิดสาธารณะ]" : " [ต้องใช้รหัสผ่าน]");
      delay(10);
    }
  }

  Serial.println("\\n>>> หากต้องการเชื่อมต่อกับ Wi-Fi ใหม่โปรดพิมพ์เลขลำดับ หรือ พิมพ์ชื่อ SSID ใหม่ แล้วกด Enter/Send");
  Serial.println("(ระบบจะรอข้อมูลเป็นเวลา 20 วินาที... หากไม่มีการพิมพ์ จะเชื่อมต่อ Wi-Fi หลักต่อ)");

  unsigned long startWait = millis();
  String selectedSSID = "";
  String newPassword = "";

  // ล้างอินพุตที่ค้างอยู่ใน Serial Buffer
  while (Serial.available() > 0) { Serial.read(); }

  while (millis() - startWait < 20000) {
    if (Serial.available() > 0) {
      String input = Serial.readStringUntil('\\n');
      input.trim();
      if (input.length() > 0) {
        int choice = input.toInt();
        if (choice > 0 && choice <= n) {
          selectedSSID = WiFi.SSID(choice - 1);
        } else {
          selectedSSID = input;
        }
        break;
      }
    }
    // กะพริบไฟ LED ถี่ๆ บอกให้รู้ว่ารอกรอบอินพุต
    digitalWrite(PIN_LED, HIGH); delay(100);
    digitalWrite(PIN_LED, LOW); delay(100);
  }

  if (selectedSSID.length() > 0) {
    Serial.print(">> เลือกเครือข่ายเรียบร้อย: "); Serial.println(selectedSSID);
    Serial.println(">>> โปรดพิมพ์รหัสผ่านใหม่ (Password) แล้วกด Enter/Send (หากไม่มีให้กด Enter ผ่านได้เลย):");
    
    while (Serial.available() > 0) { Serial.read(); }
    
    startWait = millis();
    while (millis() - startWait < 20000) {
      if (Serial.available() > 0) {
        newPassword = Serial.readStringUntil('\\n');
        newPassword.trim();
        break;
      }
      digitalWrite(PIN_LED, HIGH); delay(100);
      digitalWrite(PIN_LED, LOW); delay(100);
    }

    // บันทึกการเปลี่ยนแปลงกลับเข้าตัวแปรหลักเพื่อเชื่อมต่อถัดไป
    selectedSSID.toCharArray(current_ssid, 64);
    newPassword.toCharArray(current_password, 64);

    Serial.println("\\n>> กำลังบันทึกการปรับปรุงระบบและลองทดสอบเข้าสู่ไวไฟ...");
    Serial.print("SSID ใหม่: "); Serial.println(current_ssid);
    
    WiFi.begin(current_ssid, current_password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      digitalWrite(PIN_LED, HIGH); delay(250);
      digitalWrite(PIN_LED, LOW); delay(250);
      Serial.print(".");
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\\nเชื่อมต่อสำเร็จเรียบร้อย!");
      Serial.print("IP Address: "); Serial.println(WiFi.localIP());
      digitalWrite(PIN_LED, HIGH);
    } else {
      Serial.print("\\nเชื่อมต่อไม่สำเร็จ! ");
      printWiFiStatus(WiFi.status());
    }
  } else {
    Serial.println("ไม่มีอินพุตเข้ามาภายในเวลาที่กำหนด ดำเนินการต่อตามวงรอบด้วยข้อมูลเดิม...");
  }
}

// ฟังก์ชันเชื่อมต่อ Wi-Fi
void connectToWiFi() {
  Serial.print("กำลังเชื่อมต่อกับ Wi-Fi: ");
  Serial.println(current_ssid);
  
  WiFi.begin(current_ssid, current_password);
  
  int attempts = 0;
  // กะพริบไฟ LED สีน้ำเงิน/ฟ้า ขณะกำลังเชื่อมต่อ Wi-Fi
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    digitalWrite(PIN_LED, HIGH);
    delay(250);
    digitalWrite(PIN_LED, LOW);
    delay(250);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("เชื่อมต่อ Wi-Fi สำเร็จ!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    // เปิดไฟสีน้ำเงิน/ฟ้าค้างไว้เมื่อเชื่อมต่อสำเร็จ
    digitalWrite(PIN_LED, HIGH);
  } else {
    Serial.println("\\nไม่สามารถเชื่อมต่อ Wi-Fi ได้!");
    printWiFiStatus(WiFi.status());
    digitalWrite(PIN_LED, LOW); // ดับไฟหากเชื่อมต่อล้มเหลว
    
    // เรียกสแกนเครือข่ายเพื่ออำนวยความสะดวกในการแก้ไขปัญหาและเลือกเชื่อมต่อใหม่
    scanAndConfigureWiFi();
  }
}

// ฟังก์ชันส่งค่าเซ็นเซอร์และรับคำสั่งสั่งการกลับมาแบบทันที (Response Polling)
void sendTelemetryAndFetchControls(String jsonString) {
  HTTPClient http;
  
  Serial.println("\\n--- ส่งข้อมูลเซ็นเซอร์ไปที่คลาวด์ ---");
  Serial.print("Endpoint: "); Serial.println(serverApiUrl);
  Serial.print("Payload: "); Serial.println(jsonString);

  // เริ่มการเชื่อมต่อ HTTP
  http.begin(serverApiUrl);
  http.addHeader("Content-Type", "application/json");

  // ส่งข้อมูลแบบ POST
  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode > 0) {
    Serial.print("การส่งเรียบร้อย HTTP Response Code: ");
    Serial.println(httpResponseCode);

    // รับข้อมูลตอบกลับที่เซิร์ฟเวอร์ส่งกลับมาควบคุมสวิตช์ต่างๆ
    if (httpResponseCode == 200) {
      String responseBody = http.getString();
      Serial.print("คำสั่งควบคุมจากแดชบอร์ด: ");
      Serial.println(responseBody);

      // ถอดรหัสคำสั่ง JSON ควบคุมบอร์ด
      StaticJsonDocument<256> responseDoc;
      DeserializationError error = deserializeJson(responseDoc, responseBody);

      if (!error) {
        // 1. ควบคุม LED ขา 2
        bool ledCmd = responseDoc["ledState"];
        digitalWrite(PIN_LED, ledCmd ? HIGH : LOW);
        Serial.print("-> ควบคุม LED: "); Serial.println(ledCmd ? "เปิด (HIGH)" : "ปิด (LOW)");

        // 2. ควบคุมรีเลย์ ขา 4
        bool relayCmd = responseDoc["relayState"];
        digitalWrite(PIN_RELAY, relayCmd ? HIGH : LOW);
        Serial.print("-> ควบคุม Relay: "); Serial.println(relayCmd ? "เปิด (HIGH)" : "ปิด (LOW)");

        // 3. ปรับเปลี่ยนความถี่ในการส่งข้อมูล (Dynamic Update Interval)
        int serverInterval = responseDoc["reportingInterval"];
        if (serverInterval >= 2 && serverInterval <= 300) {
          reportingIntervalSeconds = serverInterval;
          Serial.print("-> ตั้งค่าคาบส่งข้อมูลใหม่: "); Serial.print(reportingIntervalSeconds); Serial.println(" วินาที");
        }
      } else {
        Serial.print("ไม่สามารถแปลรหัส JSON สั่งการได้: ");
        Serial.println(error.f_str());
      }
    }
  } else {
    Serial.print("เกิดข้อผิดพลาดในการส่งข้อมูลโค้ดผิดพลาด: ");
    Serial.println(httpResponseCode);
  }

  // ปิดการเชื่อมต่อ HTTP ทันทีเพื่อคืนหน่วยความจำให้ไมโครคอนโทรลเลอร์
  http.end();
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const element = document.createElement("a");
    const file = new Blob([arduinoCode], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${deviceId}_ESP32_WiFi_Controller.ino`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-800 flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-500" />
            <span>โค้ด ESP32 (Arduino Code Generator)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            รหัสโปรแกรมจะสร้างขา Pin และไลบรารีเชื่อมต่อเซ็นเซอร์ของบอร์ดนี้ให้แบบไดนามิกโดยอัตโนมัติ!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              copied
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>คัดลอกแล้ว!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกโค้ด</span>
              </>
            )}
          </button>
          <button
            onClick={downloadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด .ino</span>
          </button>
        </div>
      </div>

      {/* Local LAN Connection & Control Loop Guide */}
      <div className="mb-5 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-slate-50/50 border border-blue-100 p-4 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
            <Wifi className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-3 w-full">
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
                <span>แผนผังเชื่อมต่อและควบคุมระบบผ่านวง Wi-Fi เดียวกัน (Local LAN Control Loop)</span>
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed mt-1">
                คุณสามารถเชื่อมต่อบอร์ด Arduino/ESP32 และคอมพิวเตอร์ที่เปิดใช้งานโปรแกรม Desktop App เข้าหากันได้โดยตรงโดยผ่านตัวกลางคือ <b>เราเตอร์ Wi-Fi (Router) เครื่องเดียวกัน</b> โดยไม่ต้องพึ่งพาระบบอินเทอร์เน็ตภายนอก (Offline 100%)
              </p>
            </div>

            {/* Visual Topology Diagram */}
            <div className="bg-white/80 border border-slate-100 rounded-lg p-3 text-center flex flex-col sm:flex-row items-center justify-center gap-3 shadow-2xs">
              <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg border border-slate-100 w-32 shrink-0">
                <Cpu className="w-5 h-5 text-amber-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-700">บอร์ด ESP32</span>
                <span className="text-[9px] text-slate-400">ตัวส่งเซ็นเซอร์ & รับคำสั่ง</span>
              </div>
              <div className="flex items-center gap-1 text-blue-500 font-bold text-[10px] sm:my-0 my-1">
                <span className="hidden sm:inline">────</span>
                <Wifi className="w-3.5 h-3.5 mx-1" />
                <ArrowRightLeft className="w-3.5 h-3.5 mx-1" />
                <span className="hidden sm:inline">────</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-blue-50/60 rounded-lg border border-blue-100 w-44 shrink-0">
                <Wifi className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-700">เราเตอร์ Wi-Fi (Router)</span>
                <span className="text-[9px] text-slate-400">เชื่อมต่อวง LAN (วงเดียวกัน)</span>
              </div>
              <div className="flex items-center gap-1 text-blue-500 font-bold text-[10px] sm:my-0 my-1">
                <span className="hidden sm:inline">────</span>
                <ArrowRightLeft className="w-3.5 h-3.5 mx-1" />
                <span className="hidden sm:inline">────</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg border border-slate-100 w-32 shrink-0">
                <Laptop className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-700">เครื่องคอมพิวเตอร์</span>
                <span className="text-[9px] text-slate-400">แอปติดตั้ง (Desktop App)</span>
              </div>
            </div>

            {/* Explanations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-white/50 rounded-lg border border-slate-100/70">
                <span className="font-bold text-[11px] text-slate-700 block mb-1">🔌 การส่งข้อมูลและสั่งการทำงาน (C-R Loop)</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  เมื่อบอร์ด ESP32 เชื่อมต่อ Wi-Fi เดียวกัน บอร์ดจะยิงส่งข้อมูลเซ็นเซอร์มาที่แอปพลิเคชันบนคอมพิวเตอร์ และในทางกลับกัน ตัวเซิร์ฟเวอร์จะ<b>ส่งคำสั่งควบคุม LED และรีเลย์ปั๊มน้ำที่คุณกดจากหน้าจอแดชบอร์ดกลับไปให้บอร์ดทันที</b>ผ่านทาง HTTP Response
                </p>
              </div>
              <div className="p-2.5 bg-white/50 rounded-lg border border-slate-100/70">
                <span className="font-bold text-[11px] text-slate-700 block mb-1">⚠️ วิธีตรวจสอบที่อยู่ IP ของเครื่องโฮสต์</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  รันโปรแกรมผ่านสคริปต์ <code>run-windows.bat</code>, <code>run-mac.command</code> หรือ <code>run-linux.sh</code> แล้วตรวจสอบบรรทัด <code className="bg-amber-100 text-amber-800 px-1 rounded">👉 http://192.168.1.XX:3000</code> จากหน้าจอสีดำ จากนั้นนำมาใส่ในช่อง Server IP ด้านล่าง โค้ดด้านล่างจะอัปเดตให้อัตโนมัติ!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Inputs to customize the code inline! */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Wi-Fi SSID (ชื่อไวไฟบ้านคุณ)
          </label>
          <input
            type="text"
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            placeholder="เช่น Home_WiFi"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Wi-Fi Password (รหัสผ่านไวไฟ)
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            placeholder="รหัสผ่านเชื่อมต่อไวไฟ"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Server IP/URL (ที่อยู่เซิร์ฟเวอร์หลังบ้าน)
          </label>
          <input
            type="text"
            value={customServerUrl}
            onChange={(e) => setCustomServerUrl(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            placeholder="เช่น http://192.168.1.50:3000"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            ใช้ IP ของเราเตอร์/คอมในวง LAN เดียวกันเพื่อสั่งการแบบออฟไลน์โดยไม่ต้องใช้อินเทอร์เน็ตได้
          </span>
        </div>
      </div>

      {/* Code Editor Preview Window */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200">
        {/* Header Ribbon */}
        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-900 text-slate-400 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>{deviceId}_ESP32_WiFi_Controller.ino</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>ปรับโครงสร้างขาตามเซ็นเซอร์ปัจจุบันแล้ว</span>
          </div>
        </div>

        {/* Actual code display area */}
        <pre className="bg-slate-900 text-slate-100 p-4 overflow-x-auto text-[11px] sm:text-xs font-mono max-h-[350px] leading-relaxed">
          <code>{arduinoCode}</code>
        </pre>
      </div>

      {/* Library info instruction block */}
      <div className="mt-4 flex gap-2.5 bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-4 text-xs text-slate-600">
        <Cpu className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-indigo-900 block mb-0.5">สิ่งสำคัญที่ต้องรู้ก่อนอัปโหลดโปรแกรม:</span>
          <ul className="list-disc list-inside space-y-1">
            <li>ต้องติดตั้งไลบรารี <b>ArduinoJson</b> (แนะนำเวอร์ชัน 6.x ขึ้นไป) จาก Library Manager ในโปรแกรม Arduino IDE</li>
            {hasDHT && <li>ต้องติดตั้งไลบรารี <b>DHT sensor library</b> และ <b>Adafruit Unified Sensor</b> ของ Adafruit</li>}
            {hasDS18B20 && <li>ต้องติดตั้งไลบรารี <b>DallasTemperature</b> และ <b>OneWire</b></li>}
            {hasBH1750 && <li>ต้องติดตั้งไลบรารี <b>BH1750</b> โดย Christopher Laws</li>}
            <li>สามารถปรับแต่งชื่อและรหัสไวไฟจากกล่องสีเทาด้านบนเพื่อฝังรหัสลงในโค้ดโดยอัตโนมัติ</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

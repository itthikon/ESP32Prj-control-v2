import React, { useState } from "react";
import { SensorConfig } from "../types";
import { 
  Cpu, Plus, Trash2, Edit2, Check, AlertCircle, 
  BookOpen, Wrench, Settings, RefreshCw, LayoutGrid, Info 
} from "lucide-react";

interface SensorConfigManagerProps {
  deviceId: string;
  locationName: string;
  sensors: SensorConfig[];
  onAddSensor: (type: SensorConfig["type"], name: string, pin: string, unit: string) => Promise<boolean>;
  onEditSensor: (sensorId: string, type: SensorConfig["type"], name: string, pin: string, unit: string) => Promise<boolean>;
  onDeleteSensor: (sensorId: string) => Promise<boolean>;
}

// Supported standard sensor profiles
const SENSOR_PROFILES = [
  { type: "DHT22", label: "DHT22 (Temperature & Humidity Digital)", defaultPin: "GPIO23", defaultUnit: "°C / %", desc: "เซ็นเซอร์วัดอุณหภูมิและความชื้นความแม่นยำสูงแบบดิจิทัล" },
  { type: "DHT11", label: "DHT11 (Temperature & Humidity Digital Basic)", defaultPin: "GPIO22", defaultUnit: "°C / %", desc: "เซ็นเซอร์สภาพอากาศรุ่นมาตรฐานประหยัด" },
  { type: "DS18B20", label: "DS18B20 (Water Temperature Waterproof)", defaultPin: "GPIO4", defaultUnit: "°C", desc: "เซ็นเซอร์วัดอุณหภูมิของเหลวแบบกันน้ำสายยาว 1-Wire" },
  { type: "SoilMoisture", label: "Capacitive Soil Moisture Sensor v1.2", defaultPin: "GPIO34", defaultUnit: "%", desc: "เซ็นเซอร์วัดความชื้นในดินแบบเก็บประจุต้านทานการกัดกร่อน" },
  { type: "BH1750", label: "BH1750 (Digital Light Intensity I2C)", defaultPin: "I2C (SDA=21, SCL=22)", defaultUnit: "lux", desc: "เซ็นเซอร์แสงดิจิตอลที่มีความไวแสงสูง คุยผ่านบัส I2C" },
  { type: "LDR", label: "Analog LDR Photoresistor", defaultPin: "GPIO35", defaultUnit: "%", desc: "เซ็นเซอร์ตัวต้านทานปรับค่าตามแสงสำหรับการวัดความเข้มแสงแบบอนาล็อก" },
  { type: "HC_SR04", label: "HC-SR04 (Ultrasonic Distance Sensor)", defaultPin: "Trig=GPIO12, Echo=GPIO13", defaultUnit: "cm", desc: "เซ็นเซอร์วัดระยะทางและระดับวัตถุด้วยคลื่นอัลตราโซนิก" },
  { type: "MQ135", label: "MQ-135 (Air Quality & Gas Sensor)", defaultPin: "GPIO32", defaultUnit: "ppm", desc: "เซ็นเซอร์วัดคุณภาพอากาศ ฝุ่นควัน และก๊าซพิษแอมโมเนีย คาร์บอน" }
] as const;

export default function SensorConfigManager({
  deviceId,
  locationName,
  sensors = [],
  onAddSensor,
  onEditSensor,
  onDeleteSensor,
}: SensorConfigManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0);
  const [customName, setCustomName] = useState("");
  const [customPin, setCustomPin] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeGuideSensor, setActiveGuideSensor] = useState<SensorConfig | null>(null);

  // Editing state for existing sensors
  const [editingSensorId, setEditingSensorId] = useState<string | null>(null);
  const [editType, setEditType] = useState<SensorConfig["type"]>("DHT22");
  const [editName, setEditName] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editUnit, setEditUnit] = useState("");

  // Select first sensor as default active guide if any, otherwise null
  React.useEffect(() => {
    if (sensors.length > 0 && !activeGuideSensor) {
      setActiveGuideSensor(sensors[0]);
    } else if (sensors.length === 0) {
      setActiveGuideSensor(null);
    }
  }, [sensors, activeGuideSensor]);

  const handleProfileChange = (index: number) => {
    setSelectedProfileIndex(index);
    const profile = SENSOR_PROFILES[index];
    setCustomName(profile.label.split(" (")[0]);
    setCustomPin(profile.defaultPin);
    setCustomUnit(profile.defaultUnit);
  };

  const handleOpenAddForm = () => {
    setShowAddForm(true);
    handleProfileChange(0);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customPin.trim() || !customUnit.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await onAddSensor(
        SENSOR_PROFILES[selectedProfileIndex].type as SensorConfig["type"],
        customName.trim(),
        customPin.trim(),
        customUnit.trim()
      );
      if (success) {
        setShowAddForm(false);
        setCustomName("");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเพิ่มเซ็นเซอร์");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (sensor: SensorConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSensorId(sensor.id);
    setEditType(sensor.type);
    setEditName(sensor.name);
    setEditPin(sensor.pin);
    setEditUnit(sensor.unit);
  };

  const handleSaveEdit = async (sensorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editName.trim() || !editPin.trim() || !editUnit.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await onEditSensor(sensorId, editType, editName.trim(), editPin.trim(), editUnit.trim());
      if (success) {
        setEditingSensorId(null);
        // Refresh guide if it is the edited sensor
        if (activeGuideSensor?.id === sensorId) {
          setActiveGuideSensor({ id: sensorId, type: editType, name: editName.trim(), pin: editPin.trim(), unit: editUnit.trim() });
        }
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการแก้ไขเซ็นเซอร์");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sensorId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบเซ็นเซอร์ [${name}] ออกจากแผงวงจรนี้?`)) {
      return;
    }
    try {
      const success = await onDeleteSensor(sensorId);
      if (success && activeGuideSensor?.id === sensorId) {
        setActiveGuideSensor(null);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการลบเซ็นเซอร์");
    }
  };

  // Connection guides database
  const getConnectionGuide = (sensor: SensorConfig) => {
    const p = sensor.pin;
    switch (sensor.type) {
      case "DHT22":
      case "DHT11":
        return {
          resistor: "ตัวต้านทาน 4.7k ถึง 10k Ohm (ดึงขึ้น Pull-up) ระหว่างขาสัญญาณหลักกับแรงดันไฟเลี้ยง 3.3V",
          wiring: [
            { sensorPin: "Pin 1 (VDD/VCC)", espPin: "3.3V (หรือ 3V3)", desc: "ไฟเลี้ยงวงจรหลักเซ็นเซอร์" },
            { sensorPin: "Pin 2 (DATA/SDA)", espPin: p, desc: "ส่งข้อมูลสัญญานดิจิทัลวัดค่าอุณหภูมิและความชื้น" },
            { sensorPin: "Pin 3 (NC)", espPin: "ไม่ต้องต่อ", desc: "ขาลอยเว้นว่างไว้" },
            { sensorPin: "Pin 4 (GND)", espPin: "GND", desc: "ขั้วกราวด์ลบร่วมกัน" }
          ],
          schematic: `
   +-----------------------+              +-------------------+
   |     เซ็นเซอร์ DHT22     |              |     บอร์ด ESP32   |
   |                       |              |                   |
   |   [VCC]  [SDA] [NC] [GND]            |                   |
   |     |      |         |               |                   |
   +-----+------+---------+               |                   |
         |      |         |               |                   |
        3V3     |        GND  <---------> |  GND              |
         |      +-----------------------> |  ${p}              |
         |      |                         |                   |
         +--[4.7k Resistor]--+            +-------------------+
          (ดึงขึ้น Pull-up)
          `,
          arduinoSteps: [
            "ดาวน์โหลด Library 'DHT sensor library' โดย Adafruit ผ่าน Arduino Library Manager",
            "เพิ่มคำสั่ง `#include \"DHT.h\"` ที่หัวโค้ด",
            `กำหนดคาบพินด้วย \`#define DHTPIN ${p}\` และชนิดด้วย \`#define DHTTYPE DHT22\``,
            "เรียกใช้งานอ็อบเจกต์ `DHT dht(DHTPIN, DHTTYPE);` และสั่งเริ่มต้นใน setup ด้วย `dht.begin();`"
          ]
        };
      case "DS18B20":
        return {
          resistor: "ตัวต้านทาน 4.7k Ohm ดึงสัญญาณ Pull-up ระหว่างสายสัญญาณ (สีเหลือง) กับสายไฟเลี้ยงหลัก (สีแดง)",
          wiring: [
            { sensorPin: "สายสีแดง (VDD/VCC)", espPin: "3.3V (หรือ 3V3)", desc: "แรงดันไฟบวกป้อนเซ็นเซอร์" },
            { sensorPin: "สายสีเหลือง/ขาว (DATA)", espPin: p, desc: "ส่งสัญญานข้อมูลแบบบัสเดี่ยว 1-Wire" },
            { sensorPin: "สายสีดำ (GND)", espPin: "GND", desc: "กราวด์ลบร่วมวงจร" }
          ],
          schematic: `
     +-------------------------+          +-------------------+
     | สายเซ็นเซอร์ DS18B20      |          |     บอร์ด ESP32   |
     | [แดง/VCC] [เหลือง/DATA] [ดำ/GND]     |                   |
     |     |          |         |         |                   |
     +-----+----------+---------+         |                   |
           |          |         |         |                   |
          3V3         |        GND <----> |  GND              |
           |          +-----------------> |  ${p}              |
           |          |                   |                   |
           +---[4.7k Resistor]----+       +-------------------+
            (ดึงขึ้น Pull-up)
          `,
          arduinoSteps: [
            "ดาวน์โหลด Library 'OneWire' และ 'DallasTemperature' จาก Library Manager ในโปรแกรม Arduino IDE",
            "เขียนคำสั่ง `#include <OneWire.h>` และ `#include <DallasTemperature.h>` ในส่วนบนของโค้ด",
            `เริ่มใช้โดยสร้างตัวแปร \`OneWire oneWire(${p}); DallasTemperature sensors(&oneWire);\``,
            "ใน setup เรียก `sensors.begin();` และอ่านด้วย `sensors.requestTemperatures();` ตามด้วย `sensors.getTempCByIndex(0);`"
          ]
        };
      case "SoilMoisture":
        return {
          resistor: "ไม่ต้องใช้ตัวต้านทานภายนอก (อ่านค่าอนาล็อกตรงจากแผงวงจร)",
          wiring: [
            { sensorPin: "Pin VCC", espPin: "3.3V", desc: "แนะนำป้อนไฟ 3.3V เพื่อความปลอดภัยของขาอนาล็อก ESP32" },
            { sensorPin: "Pin GND", espPin: "GND", desc: "กราวด์สายร่วมกัน" },
            { sensorPin: "Pin AOUT (Analog Out)", espPin: p, desc: "แรงดันไฟสัญญาณอนาล็อก (0-3.3V) สัมพันธ์กับความชื้น" }
          ],
          schematic: `
   +-----------------------+              +-------------------+
   | เซ็นเซอร์ความชื้นดินอนาล็อก |              |     บอร์ด ESP32   |
   |                       |              |                   |
   |   [VCC]  [GND]  [AOUT] |              |  (เลือกขา ADC      |
   |     |      |      |   |              |   เช่น GPIO 32-39)|
   +-----+------+------+---+              |                   |
         |      |      |                  |                   |
        3V3    GND     +----------------> |  ${p} (ADC)         |
                                          |  GND              |
                                          +-------------------+
          `,
          arduinoSteps: [
            `อ่านค่าอนาล็อกดิบโดยใช้คำสั่ง \`int rawSoil = analogRead(${p});\` ค่าที่อ่านได้จะอยู่ในช่วง 0 (เปียกที่สุด) ถึง 4095 (แห้งที่สุด)`,
            "แนะนำให้ทดลองวัดค่าแห้งกลางอากาศ (ค่า AirValue ~3000+) และเปียกแช่ในแก้วน้ำ (ค่า WaterValue ~1000+) เพื่อทำ Calibration",
            `จากนั้นใช้ฟังก์ชัน map: \`int percent = map(rawSoil, AirValue, WaterValue, 0, 100);\` เพื่อแปลงเป็น % ความชื้น`
          ]
        };
      case "BH1750":
        return {
          resistor: "ไม่ต้องใช้ตัวต้านทานภายนอก (เนื่องจากมีวงจรดึงขึ้นในบอร์ดเซ็นเซอร์เรียบร้อยแล้ว)",
          wiring: [
            { sensorPin: "Pin VCC", espPin: "3.3V", desc: "ไฟเลี้ยงบอร์ดเซ็นเซอร์" },
            { sensorPin: "Pin GND", espPin: "GND", desc: "กราวด์ระบบไฟร่วม" },
            { sensorPin: "Pin SDA", espPin: "GPIO 21 (SDA)", desc: "สายส่งข้อมูลอนุกรม I2C Data" },
            { sensorPin: "Pin SCL", espPin: "GPIO 22 (SCL)", desc: "สายจังหวะสัญญาณนาฬิกาอนุกรม I2C Clock" },
            { sensorPin: "Pin ADD/ADDR", espPin: "ปล่อยว่าง (หรือ GND)", desc: "ตั้งแอดเดรสบัสด่วน (GND=0x23, VCC=0x5C)" }
          ],
          schematic: `
   +-----------------------+              +-------------------+
   | เซ็นเซอร์วัดแสงดิจิตอล    |              |     บอร์ด ESP32   |
   |     BH1750 (I2C)      |              |                   |
   | [VCC] [GND] [SCL] [SDA]|              |   ขา I2C มาตรฐาน   |
   |   |     |     |     | |              |   SDA=21, SCL=22  |
   +---+-----+-----+-----+--              |                   |
       |     |     |     |                |                   |
      3V3   GND    |     +--------------> |  GPIO 21 (SDA)    |
                   +--------------------> |  GPIO 22 (SCL)    |
                                          +-------------------+
          `,
          arduinoSteps: [
            "ดาวน์โหลด Library 'BH1750' พัฒนาโดย Christopher Laws จาก Library Manager ใน Arduino IDE",
            "ติดตั้งไลบรารีและเพิ่ม `#include <Wire.h>` และ `#include <BH1750.h>` บนสุดของสเก็ตช์",
            "สร้างอ็อบเจกต์ `BH1750 lightMeter;` และใช้คำสั่ง `Wire.begin();` กับ `lightMeter.begin();` ในส่วนฟังก์ชัน setup",
            "อ่านค่าแสงหรูหราเป็นระดับความสว่างในหน่วย lux ทันทีด้วย `float lux = lightMeter.readLightLevel();`"
          ]
        };
      case "LDR":
        return {
          resistor: "ตัวต้านทาน 10k Ohm อนุกรมร่วม เพื่อสร้างวงจรแบ่งแรงดัน (Voltage Divider Node)",
          wiring: [
            { sensorPin: "ขาที่ 1 ของ LDR", espPin: "3.3V", desc: "รับแรงดันไฟเลี้ยงบวก" },
            { sensorPin: "ขาที่ 2 ของ LDR", espPin: `${p} (ขา ADC) และต่อหัวตัวต้านทาน 10k`, desc: "สัญญาณจุดวัดแรงดันตกคร่อม" },
            { sensorPin: "ปลายอีกข้างของตัวต้านทาน 10k", espPin: "GND", desc: "กราวด์อ้างอิงแรงดันตก" }
          ],
          schematic: `
                  +3.3V
                    |
                 [ LDR ]
                    |
     ${p} <---------+------ (จุดสัญญาณออกอ่านค่าด้วยอนาล็อก)
                    |
                [10k Ohm]
                    |
                   GND
          `,
          arduinoSteps: [
            `ใช้คำสั่ง \`int rawLdr = analogRead(${p});\` เพื่ออ่านค่าแรงดันตกคร่อมแบ่งสัญญาณ`,
            "เมื่อแสงสว่างส่องสว่างขึ้น ความต้านทาน LDR จะลดลง ทำให้ค่าแรงดันที่ขาอนาล็อกมีระดับสูงขึ้น",
            "คำนวณสัดส่วนค่าความเข้มแสงเป็นเปอร์เซ็นต์อย่างง่าย: `int pct = map(rawLdr, 0, 4095, 0, 100);`"
          ]
        };
      case "HC_SR04":
        return {
          resistor: "แนะนำให้ทำ Voltage Divider ที่ขา Echo (ใช้ตัวต้านทาน 10k และ 20k Ohm) เพื่อแปลงแรงดัน 5V จากเซ็นเซอร์ลดเหลือ 3.3V เข้าพินพอร์ตรับข้อมูล ESP32",
          wiring: [
            { sensorPin: "Pin VCC", espPin: "5V (หรือ VIN)", desc: "ป้อนกำลังไฟหลัก 5 โวลต์" },
            { sensorPin: "Pin Trig (Trigger)", espPin: p.includes("Trig=") ? p.split("Trig=")[1].split(",")[0] : "GPIO12", desc: "ขาส่งสัญญาณคลื่นพัลส์เริ่มยิงคลื่นเสียง" },
            { sensorPin: "Pin Echo", espPin: p.includes("Echo=") ? p.split("Echo=")[1] : "GPIO13", desc: "ขารับข้อมูลกลับวัดระยะเวลาสะท้อนของคลื่น" },
            { sensorPin: "Pin GND", espPin: "GND", desc: "กราวด์ร่วมแผงควบคุม" }
          ],
          schematic: `
   +-----------------------+              +-------------------+
   | เซ็นเซอร์วัดระยะอุลตร้า     |              |     บอร์ด ESP32   |
   |        HC-SR04        |              |                   |
   | [VCC] [Trig] [Echo][GND]             |                   |
   |   |     |      |     |               |                   |
   +---+-----+------+-----+               |                   |
       |     |      |     |               |                   |
      5V     |      |    GND <----------> |  GND              |
             |      |                     |                   |
             +------+-------------------> |  GPIO 12 (Trig)   |
                    |                     |                   |
                    +--[10k]--+--> ${p.includes("Echo=") ? p.split("Echo=")[1] : "13"}  |  GPIO 13 (Echo)   |
                              |           |                   |
                            [20k]         +-------------------+
                              |
                             GND
          `,
          arduinoSteps: [
            "ตั้งค่าพินใน setup: `pinMode(PIN_TRIG, OUTPUT); pinMode(PIN_ECHO, INPUT);`",
            "ยิงพัลส์เสียงด้วยคำสั่ง: `digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2); digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10); digitalWrite(PIN_TRIG, LOW);`",
            "จับเวลาเดินทางสะท้อน: `long duration = pulseIn(PIN_ECHO, HIGH);`",
            "คำนวณหาระยะทางเป็นหน่วยเซนติเมตร: `float distanceCm = duration * 0.0343 / 2;`"
          ]
        };
      case "MQ135":
        return {
          resistor: "ไม่ต้องเชื่อมต่อตัวต้านทานเพิ่มภายนอก (มีโมดูลวงจรปรับแรงดันเสร็จสิ้นบนแผ่น PCB)",
          wiring: [
            { sensorPin: "Pin VCC", espPin: "5V (หรือ VIN)", desc: "ต้องการกำลังไฟ 5V ป้อนขดลวดความร้อนภายในหัววัด" },
            { sensorPin: "Pin GND", espPin: "GND", desc: "กราวด์สายร่วมกันในระบบ" },
            { sensorPin: "Pin AOUT (Analog Out)", espPin: p, desc: "ส่งแรงดันตกความเข้มข้นสารปนเปื้อนในอากาศเป็นอนาล็อก" },
            { sensorPin: "Pin DOUT (Digital Out)", espPin: "ปล่อยว่างไว้", desc: "ขาเปรียบเทียบสวิทช์ปรับค่าทริกเกอร์สูงต่ำ (มักไม่ใช้)" }
          ],
          schematic: `
   +-----------------------+              +-------------------+
   | เซ็นเซอร์วัดคุณภาพก๊าซ   |              |     บอร์ด ESP32   |
   |      MQ-135 Gas       |              |                   |
   | [VCC] [GND] [DOUT] [AOUT]            |                   |
   |   |     |            |               |                   |
   +---+-----+------------+               |                   |
       |     |            |               |                   |
      5V    GND           +-------------> |  ${p} (ADC)         |
                                          |  GND              |
                                          +-------------------+
          `,
          arduinoSteps: [
            "ปล่อยให้ระบบอุ่นฮีตเตอร์ก๊าซเซ็นเซอร์ทำความร้อนล่วงหน้าประมาณ 24-48 ชั่วโมงสำหรับการทำฐานข้อมูลที่แม่นยำ (เสถียรที่สุด)",
            `เขียนชุดสเก็ตช์รันค่าดิบ: \`int gasValue = analogRead(${p});\``,
            "สามารถดาวน์โหลด Library 'MQUnifiedsensor' สำหรับแปลงค่าสัมบูรณ์เป็นความเข้มข้นหน่วยเป็นมิลลิกรัมต่อลิตรหรือ ppm เจาะจงคาร์บอน (CO2) หรือแอมโมเนีย"
          ]
        };
      default:
        return {
          resistor: "ไม่ต้องเชื่อมต่อตัวต้านทานภายนอกเพิ่มเติม",
          wiring: [
            { sensorPin: "VCC", espPin: "3.3V หรือ 5V", desc: "จุดจ่ายกำลังพลังงานไฟ" },
            { sensorPin: "GND", espPin: "GND", desc: "กราวด์ลบส่วนร่วมระบบไฟฟ้า" },
            { sensorPin: "SIGNAL / DATA", espPin: p, desc: "ขารับส่งสถานะเซ็นเซอร์วัดค่า" }
          ],
          schematic: `
    +-------------------+                 +-------------------+
    |   เซ็นเซอร์ทั่วไป   |                 |     บอร์ด ESP32   |
    |   [VCC] [SIG] [GND] |                 |                   |
    |     |     |     |   |                 |                   |
    +-----+-----+-----+---+                 |                   |
          |     |     |                     |                   |
         3V3    |    GND <--------------->  |  GND              |
                +------------------------>  |  ${p}              |
                                            +-------------------+
          `,
          arduinoSteps: [
            "ตรวจสอบคู่มือผู้พัฒนาเฉพาะรายชิ้นของรุ่นอุปกรณ์นั้นๆ",
            `เริ่มพินการเชื่อมต่อแบบนำเข้ามาตรฐานในโปรแกรม และระบุพินที่ตำแหน่ง GPIO ${p}`
          ]
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all overflow-hidden">
      {/* Head Banner */}
      <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-800">
              จัดการรายการเซ็นเซอร์ของบอร์ด
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              กำหนดประเภทพิน GPIO สำหรับอุปกรณ์แต่ละตัว และดูแนวทางการเชื่อมต่อ
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAddForm}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm cursor-pointer transition-all self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มเซ็นเซอร์ชิ้นใหม่</span>
        </button>
      </div>

      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Sensors List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>รายการเซ็นเซอร์ติดตั้ง ({sensors.length})</span>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
              {locationName}
            </span>
          </div>

          {/* List of Sensors */}
          {sensors.length === 0 ? (
            <div className="border-2 border-dashed border-slate-100 rounded-2xl py-8 px-4 text-center">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">ยังไม่มีเซ็นเซอร์ต่ออยู่กับบอร์ดนี้</p>
              <p className="text-[10px] text-slate-400 mt-1">กดปุ่ม "เพิ่มเซ็นเซอร์ชิ้นใหม่" เพื่อเริ่มต้นกำหนดระบบจำลอง/บอร์ดจริง</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {sensors.map((sensor) => {
                const isGuideActive = activeGuideSensor?.id === sensor.id;
                const isEditing = editingSensorId === sensor.id;

                return (
                  <div
                    key={sensor.id}
                    onClick={() => !isEditing && setActiveGuideSensor(sensor)}
                    className={`group relative border rounded-xl p-3.5 transition-all cursor-pointer ${
                      isGuideActive 
                        ? "bg-blue-50/50 border-blue-200/80 shadow-2xs" 
                        : "bg-white border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">ชนิดเซ็นเซอร์</label>
                            <select
                              value={editType}
                              onChange={(e) => {
                                const type = e.target.value as SensorConfig["type"];
                                setEditType(type);
                                const profile = SENSOR_PROFILES.find(sp => sp.type === type);
                                if (profile) {
                                  setEditUnit(profile.defaultUnit);
                                }
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold"
                            >
                              {SENSOR_PROFILES.map((sp) => (
                                <option key={sp.type} value={sp.type}>{sp.type}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">ชื่อเซ็นเซอร์</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">ขา GPIO บอร์ด</label>
                            <input
                              type="text"
                              value={editPin}
                              onChange={(e) => setEditPin(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">หน่วยวัด (Unit)</label>
                            <input
                              type="text"
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold"
                            />
                          </div>
                        </div>

                        <div className="flex gap-1.5 justify-end pt-1">
                          <button
                            onClick={(e) => handleSaveEdit(sensor.id, e)}
                            disabled={isSubmitting}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>บันทึก</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSensorId(null);
                            }}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            <span>ยกเลิก</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">
                              {sensor.name}
                            </span>
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-md font-bold">
                              {sensor.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3 text-slate-400" />
                              <span>ขา: <b className="text-slate-600">{sensor.pin}</b></span>
                            </span>
                            <span>หน่วย: <b className="text-slate-600">{sensor.unit}</b></span>
                          </div>
                        </div>

                        {/* Interactive Edit / Trash controls visible on hover */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => handleStartEdit(sensor, e)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="แก้ไขข้อมูลเซ็นเซอร์"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(sensor.id, sensor.name, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="ลบเซ็นเซอร์ออก"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Sensor Inline Form Block */}
          {showAddForm && (
            <form onSubmit={handleAddSubmit} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 mt-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                <span className="text-xs font-bold text-slate-700">เพิ่มเซ็นเซอร์ใหม่เข้าระบบ</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ปิดฟอร์ม
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  เลือกประเภทเซ็นเซอร์ต้นแบบ
                </label>
                <select
                  value={selectedProfileIndex}
                  onChange={(e) => handleProfileChange(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:border-blue-500 outline-hidden"
                >
                  {SENSOR_PROFILES.map((profile, idx) => (
                    <option key={profile.type} value={idx}>
                      {profile.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  {SENSOR_PROFILES[selectedProfileIndex].desc}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    ชื่อเรียกอุปกรณ์ที่ต้องการให้แสดง
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 outline-hidden font-semibold"
                    placeholder="เช่น อุณหภูมิโรงเรือนหลัก"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    ขาพอร์ตเชื่อมต่อ (GPIO PIN)
                  </label>
                  <input
                    type="text"
                    value={customPin}
                    onChange={(e) => setCustomPin(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 outline-hidden font-mono font-bold"
                    placeholder="เช่น GPIO23"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    หน่วยวัด (Unit)
                  </label>
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 outline-hidden font-semibold"
                    placeholder="เช่น °C หรือ %"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>ตกลงยืนยันการเพิ่ม</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Right Side: Step-by-Step Connection Instructions */}
        <div className="lg:col-span-7 bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          {activeGuideSensor ? (
            (() => {
              const guide = getConnectionGuide(activeGuideSensor);
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        ขั้นตอนและคู่มือแนะนำการต่อ: <b>{activeGuideSensor.name} ({activeGuideSensor.type})</b>
                      </span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full">
                      ESP32 GUIDE
                    </span>
                  </div>

                  {/* 1. Wire connections */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-slate-500" />
                      <span>1. ตารางการโยงขาสัญญาณเซ็นเซอร์ (Pinout wiring list)</span>
                    </h3>
                    <div className="overflow-x-auto border border-slate-200/60 rounded-xl bg-white">
                      <table className="w-full text-[11px] text-left text-slate-600">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200/60">
                          <tr>
                            <th className="px-3 py-2">ฝั่งเซ็นเซอร์ (Sensor Pin)</th>
                            <th className="px-3 py-2 text-blue-600">ฝั่งบอร์ด ESP32 (Microcontroller Pin)</th>
                            <th className="px-3 py-2">คำอธิบายหน้าทีการทำงาน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {guide.wiring.map((w, index) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-bold font-mono text-slate-700">{w.sensorPin}</td>
                              <td className="px-3 py-2 font-mono text-blue-600 font-bold bg-blue-50/20">{w.espPin}</td>
                              <td className="px-3 py-2 text-slate-500">{w.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2. Resistor requirement notice if any */}
                  {guide.resistor && (
                    <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 flex gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-bold text-amber-900 block">ข้อมูลตัวต้านทานที่จำเป็นต้องใช้:</span>
                        <span className="text-[10px] text-amber-800/95 leading-normal block mt-0.5">{guide.resistor}</span>
                      </div>
                    </div>
                  )}

                  {/* 3. Text Schematic Diagram */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-slate-700">
                      2. ไดอะแกรมวงจรการเชื่อมต่อ (Circuit Visual Blueprint)
                    </h3>
                    <pre className="bg-slate-900 text-emerald-400 font-mono text-[9px] sm:text-[10px] p-3 rounded-xl overflow-x-auto leading-tight shadow-inner">
                      <code>{guide.schematic}</code>
                    </pre>
                  </div>

                  {/* 4. Quick Arduino Code steps */}
                  <div className="space-y-1.5 pt-1">
                    <h3 className="text-xs font-bold text-slate-700">
                      3. สรุปวิธีเรียกใช้งานในโปรแกรม Arduino IDE
                    </h3>
                    <ul className="list-decimal list-inside text-[11px] text-slate-500 space-y-1 pl-1">
                      {guide.arduinoSteps.map((step, index) => (
                        <li key={index} className="leading-normal">
                          <span className="text-slate-600">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <BookOpen className="w-12 h-12 text-slate-200 mb-3" />
              <h3 className="text-sm font-bold text-slate-600">ยินดีต้อนรับเข้าสู่ระบบคู่มือแนะนำการต่อวงจร</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                คลิกเลือกเซ็นเซอร์รายการซ้ายมือที่คุณต้องการดูขั้นตอนแนะนำ หรือคลิก "เพิ่มเซ็นเซอร์ชิ้นใหม่" เพื่อต่อขยายบอร์ดสมาร์ท
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

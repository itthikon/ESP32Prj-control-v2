export interface SensorConfig {
  id: string;
  type: 'DHT22' | 'DHT11' | 'DS18B20' | 'SoilMoisture' | 'BH1750' | 'LDR' | 'HC_SR04' | 'MQ135' | 'Battery';
  name: string;
  pin: string; // e.g. "GPIO23", "GPIO34" etc.
  unit: string;
}

export interface Telemetry {
  temperature: number;
  humidity: number;
  soilMoisture: number; // 0 - 100% (or analog 0-4095)
  lightLevel: number;   // 0 - 100% (or analog 0-4095)
  batteryLevel?: number; // 0 - 100%
  batteryVoltage?: number; // e.g. 3.0V - 4.2V
  wifiRssi: number;     // dBm (e.g., -30 to -90)
  uptime: number;       // seconds
  timestamp: string;    // HH:MM:SS format
}

export interface ControlState {
  ledState: boolean;
  relayState: boolean;
  reportingInterval: number; // seconds
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'telemetry' | 'control';
  message: string;
}

export interface DeviceState {
  location?: string;
  telemetry: Telemetry;
  control: ControlState;
  lastSeen: string | null;
  isOnline: boolean;
  simulationEnabled: boolean;
  history: Telemetry[];
  logs: LogEntry[];
  supabaseConnected?: boolean;
  supabaseError?: string | null;
  sensors?: SensorConfig[];
}

export interface DeviceInfo {
  id: string;
  location: string;
  isOnline: boolean;
  simulationEnabled: boolean;
  telemetry: Telemetry;
  sensors?: SensorConfig[];
  syncPending?: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface LineConfig {
  enabled: boolean;
  channelAccessToken: string; // LINE Messaging API Channel Access Token
  userId: string; // Target User ID or Group ID for Push Messages
  notifyBatteryLow: boolean;
  batteryThreshold: number; // e.g. 20%
  notifySensorsAlert: boolean;
  tempMaxThreshold?: number; // e.g. 38 °C
  soilMinThreshold?: number; // e.g. 25 %
  selectedSensors: string[]; // e.g. ['temperature', 'humidity', 'soilMoisture', 'lightLevel', 'batteryLevel', 'batteryVoltage', 'relayState']
  autoReportInterval: number; // minutes
  lastReportTime?: number;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string; // e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
  chatId: string; // e.g. -100123456789 or 987654321
  notifyBatteryLow: boolean;
  batteryThreshold: number; // e.g. 20%
  notifySensorsAlert: boolean;
  tempMaxThreshold?: number; // e.g. 38 °C
  soilMinThreshold?: number; // e.g. 25 %
  selectedSensors: string[]; // e.g. ['temperature', 'humidity', 'soilMoisture', 'lightLevel', 'batteryLevel', 'batteryVoltage', 'relayState']
  autoReportInterval: number; // minutes
  lastReportTime?: number;
}

export interface UserAccount {
  username: string;
  password?: string;
  role: 'admin' | 'operator' | 'viewer';
  lastActive?: string;
}


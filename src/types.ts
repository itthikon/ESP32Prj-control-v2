export interface SensorConfig {
  id: string;
  type: 'DHT22' | 'DHT11' | 'DS18B20' | 'SoilMoisture' | 'BH1750' | 'LDR' | 'HC_SR04' | 'MQ135';
  name: string;
  pin: string; // e.g. "GPIO23", "GPIO34" etc.
  unit: string;
}

export interface Telemetry {
  temperature: number;
  humidity: number;
  soilMoisture: number; // 0 - 100% (or analog 0-4095)
  lightLevel: number;   // 0 - 100% (or analog 0-4095)
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
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

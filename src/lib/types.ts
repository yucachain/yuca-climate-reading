export type ChamberUnitType = 'transport' | 'stationary';

export interface ColdChainUnit {
  id: string; // e.g. 'vault-1', 'vault-2', 'hub-1'
  name: string; // e.g. 'YucaVault #1 (Transit)'
  code: string; // e.g. 'TR-01'
  type: ChamberUnitType;
  locationDescription: string;
  esp32Ip: string;
}

export interface SensorData {
  id: string;
  location: 'TOP' | 'BOTTOM';
  pin: number;
  valid: boolean;
  temperature: number;
  humidity: number;
}

export interface ChamberStatus {
  system: string;
  unitId: string;
  unitName: string;
  unitType: ChamberUnitType;
  uptime: number;
  validSensors: number;
  minValidSensors: number;
  totalSensors: number;
  safetyMode: boolean;
  averageTemperature: number;
  averageHumidity: number;
  fanState: boolean;
  pumpState: boolean;
  fanReason: string;
  pumpReason: string;
  sensors: SensorData[];
  timestamp?: number;
}

export interface ChartPoint {
  time: string;
  timestamp: number;
  avgTemp: number;
  avgHumidity: number;
  fanActive: number;
  pumpActive: number;
}

export interface ActivityLog {
  id: string;
  unitId: string;
  timestamp: string;
  type: 'fan' | 'pump' | 'sensor' | 'safety' | 'system';
  message: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
}

export interface ChamberSettings {
  isSimulation: boolean;
  pollInterval: number; // in ms, default 3000
}

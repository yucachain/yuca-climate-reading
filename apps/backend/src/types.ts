export type ChamberUnitType = 'transport' | 'stationary';

export interface ColdChainUnit {
  id: string; // e.g. 'vault-1', 'vault-2', 'hub-1'
  name: string; // e.g. 'YucaVault #1'
  code: string; // e.g. 'TR-01'
  type: ChamberUnitType;
  locationDescription: string;
  esp32Ip: string;
  isActive?: boolean;
}

export type SensorLocation = 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM';
export type SensorPosition = 'TOP' | 'MIDDLE' | 'BOTTOM';

export interface SensorData {
  id: string;
  location: SensorLocation;
  position?: SensorPosition;
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
  connected?: boolean;
}

export interface ChartPoint {
  time: string;
  timestamp: number;
  avgTemp: number;
  avgHumidity: number;
  fanActive: number;
  pumpActive: number;
  sensors?: {
    id: string;
    location?: SensorLocation;
    position?: SensorPosition;
    pin?: number;
    valid: boolean;
    temperature: number;
    humidity: number;
  }[];
}

export interface ActivityLogItem {
  id: string;
  unitId?: string | null;
  timestamp: string;
  type: 'fan' | 'pump' | 'sensor' | 'safety' | 'system';
  message: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
  createdAt?: string;
}

export interface SystemSettings {
  pollInterval: number; // in ms, default 3000
  pollingEnabled: boolean;
}

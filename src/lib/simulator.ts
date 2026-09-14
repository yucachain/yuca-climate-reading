import { ChamberStatus, SensorData, ColdChainUnit } from './types';

export const INITIAL_UNITS: ColdChainUnit[] = [
  {
    id: 'vault-1',
    name: 'YucaVault #1',
    code: 'TR-01',
    type: 'transport',
    locationDescription: 'Mobile Transit Cold Chain (Truck #1)',
    esp32Ip: '192.168.1.151',
  },
  {
    id: 'vault-2',
    name: 'YucaVault #2',
    code: 'TR-02',
    type: 'transport',
    locationDescription: 'Mobile Transit Cold Chain (Truck #2)',
    esp32Ip: '192.168.1.152',
  },
  {
    id: 'hub-1',
    name: 'YucaHub Station',
    code: 'ST-01',
    type: 'stationary',
    locationDescription: 'Stationary Central Cassava Storage Facility',
    esp32Ip: '192.168.1.150',
  },
];

export interface SimSensorConfig {
  id: string;
  location: 'TOP' | 'BOTTOM';
  pin: number;
  baseTemp: number;
  baseHumidity: number;
  enabled: boolean;
}

const DEFAULT_SENSORS: SimSensorConfig[] = [
  { id: 'A1', location: 'TOP', pin: 13, baseTemp: 25.2, baseHumidity: 87.1, enabled: true },
  { id: 'A2', location: 'TOP', pin: 14, baseTemp: 25.4, baseHumidity: 87.6, enabled: true },
  { id: 'A3', location: 'TOP', pin: 16, baseTemp: 25.8, baseHumidity: 88.0, enabled: true },
  { id: 'B1', location: 'BOTTOM', pin: 17, baseTemp: 24.8, baseHumidity: 86.4, enabled: true },
  { id: 'B2', location: 'BOTTOM', pin: 19, baseTemp: 25.0, baseHumidity: 86.9, enabled: true },
  { id: 'B3', location: 'BOTTOM', pin: 21, baseTemp: 25.3, baseHumidity: 87.4, enabled: true },
];

class UnitInstance {
  public unit: ColdChainUnit;
  public sensors: SimSensorConfig[];
  public fanState: boolean = true;
  public pumpState: boolean = false;
  public uptime: number = 12000;
  public tempOffset: number = 0;
  public humidityOffset: number = 0;

  // Thresholds identical to C++ firmware
  private readonly TEMP_MIN = 20.0;
  private readonly TEMP_MAX = 30.0;
  private readonly HUMIDITY_LOW = 85.0;
  private readonly HUMIDITY_HIGH = 90.0;
  private readonly FAN_TEMP_ON = 27.0;
  private readonly FAN_TEMP_OFF = 24.0;
  private readonly FAN_HUMIDITY_ON = 90.0;
  private readonly FAN_HUMIDITY_OFF = 85.0;
  private readonly MIN_VALID_SENSORS = 4;

  constructor(unit: ColdChainUnit, initialTempOffset: number = 0, initialHumidityOffset: number = 0) {
    this.unit = unit;
    this.tempOffset = initialTempOffset;
    this.humidityOffset = initialHumidityOffset;
    this.sensors = JSON.parse(JSON.stringify(DEFAULT_SENSORS));
  }

  public setSensorEnabled(id: string, enabled: boolean) {
    const s = this.sensors.find((item) => item.id === id);
    if (s) s.enabled = enabled;
  }

  public setEnvironmentPreset(preset: 'optimal' | 'hot' | 'cold' | 'dry' | 'humid' | 'safety') {
    if (preset === 'optimal') {
      this.tempOffset = 0;
      this.humidityOffset = 0;
      this.sensors.forEach((s) => (s.enabled = true));
    } else if (preset === 'hot') {
      this.tempOffset = 3.5;
      this.humidityOffset = 0;
      this.sensors.forEach((s) => (s.enabled = true));
    } else if (preset === 'cold') {
      this.tempOffset = -6.0;
      this.humidityOffset = 0;
      this.sensors.forEach((s) => (s.enabled = true));
    } else if (preset === 'dry') {
      this.tempOffset = 0;
      this.humidityOffset = -6.0;
      this.sensors.forEach((s) => (s.enabled = true));
    } else if (preset === 'humid') {
      this.tempOffset = 0;
      this.humidityOffset = 5.0;
      this.sensors.forEach((s) => (s.enabled = true));
    } else if (preset === 'safety') {
      this.sensors[0].enabled = true;
      this.sensors[1].enabled = true;
      this.sensors[2].enabled = true;
      this.sensors[3].enabled = false;
      this.sensors[4].enabled = false;
      this.sensors[5].enabled = false;
    }
  }

  public step(): ChamberStatus {
    this.uptime += 3000;

    const sensorReadings: SensorData[] = this.sensors.map((s) => {
      const jitterT = (Math.random() - 0.5) * 0.15;
      const jitterH = (Math.random() - 0.5) * 0.3;

      const t = parseFloat((s.baseTemp + this.tempOffset + jitterT).toFixed(1));
      const h = parseFloat((s.baseHumidity + this.humidityOffset + jitterH).toFixed(1));

      return {
        id: s.id,
        location: s.location,
        pin: s.pin,
        valid: s.enabled,
        temperature: s.enabled ? t : 0.0,
        humidity: s.enabled ? h : 0.0,
      };
    });

    const validSensors = sensorReadings.filter((s) => s.valid);
    const validCount = validSensors.length;

    // SENSOR SAFETY MODE (< 4 valid sensors)
    if (validCount < this.MIN_VALID_SENSORS) {
      this.pumpState = false;
      this.fanState = true;

      return {
        system: `YucaChain - ${this.unit.name}`,
        unitId: this.unit.id,
        unitName: this.unit.name,
        unitType: this.unit.type,
        uptime: this.uptime,
        validSensors: validCount,
        minValidSensors: this.MIN_VALID_SENSORS,
        totalSensors: this.sensors.length,
        safetyMode: true,
        averageTemperature: 0.0,
        averageHumidity: 0.0,
        fanState: this.fanState,
        pumpState: this.pumpState,
        fanReason: 'Safety Mode Override: Fewer than 4 valid sensors available',
        pumpReason: 'Safety Mode Override: Pump forced OFF for safety',
        sensors: sensorReadings,
        timestamp: Date.now(),
      };
    }

    const totalTemp = validSensors.reduce((sum, s) => sum + s.temperature, 0);
    const totalHumidity = validSensors.reduce((sum, s) => sum + s.humidity, 0);

    const avgTemp = parseFloat((totalTemp / validCount).toFixed(2));
    const avgHumidity = parseFloat((totalHumidity / validCount).toFixed(2));

    // FAN CONTROL (Hysteresis)
    let fanReason = '';
    if (avgTemp >= this.FAN_TEMP_ON || avgHumidity >= this.FAN_HUMIDITY_ON) {
      this.fanState = true;
      if (avgTemp >= this.FAN_TEMP_ON && avgHumidity >= this.FAN_HUMIDITY_ON) {
        fanReason = 'High Temp (>=27°C) & High RH (>=90%)';
      } else if (avgTemp >= this.FAN_TEMP_ON) {
        fanReason = 'High Temp Trigger (>=27.0°C)';
      } else {
        fanReason = 'High Humidity Trigger (>=90.0%)';
      }
    } else if (avgTemp <= this.FAN_TEMP_OFF && avgHumidity <= this.FAN_HUMIDITY_OFF) {
      this.fanState = false;
      fanReason = 'Temp <= 24°C AND RH <= 85% (Ventilation satisfied)';
    } else {
      fanReason = 'Conditions inside deadband (24-27°C / 85-90% RH) - Maintaining previous state';
    }

    // PUMP CONTROL
    let pumpReason = '';
    if (avgTemp <= this.TEMP_MIN) {
      this.pumpState = false;
      pumpReason = 'Chamber too cold (<= 20°C). Pump OFF.';
    } else if (avgTemp >= this.TEMP_MAX) {
      this.pumpState = true;
      pumpReason = 'Chamber too hot (>= 30°C). Pump ON for evaporative cooling.';
    } else {
      if (avgHumidity < this.HUMIDITY_LOW) {
        this.pumpState = true;
        pumpReason = 'Low Humidity (< 85%). Humidifying chamber.';
      } else if (avgHumidity >= this.HUMIDITY_LOW && avgHumidity < this.HUMIDITY_HIGH) {
        pumpReason = 'Preferred RH Zone (85% - 90%). Maintaining state.';
      } else {
        this.pumpState = false;
        pumpReason = 'Target Humidity Reached (>= 90%). Pump OFF.';
      }
    }

    return {
      system: `YucaChain - ${this.unit.name}`,
      unitId: this.unit.id,
      unitName: this.unit.name,
      unitType: this.unit.type,
      uptime: this.uptime,
      validSensors: validCount,
      minValidSensors: this.MIN_VALID_SENSORS,
      totalSensors: this.sensors.length,
      safetyMode: false,
      averageTemperature: avgTemp,
      averageHumidity: avgHumidity,
      fanState: this.fanState,
      pumpState: this.pumpState,
      fanReason,
      pumpReason,
      sensors: sensorReadings,
      timestamp: Date.now(),
    };
  }
}

class MultiUnitSimulator {
  private instances: Map<string, UnitInstance> = new Map();

  constructor() {
    // Initialize 2 Transport Vaults and 1 Stationary Hub with slight natural variance
    this.instances.set('vault-1', new UnitInstance(INITIAL_UNITS[0], -0.2, 0.4));
    this.instances.set('vault-2', new UnitInstance(INITIAL_UNITS[1], 0.3, -0.2));
    this.instances.set('hub-1', new UnitInstance(INITIAL_UNITS[2], 0.0, 0.6));
  }

  public getUnitInstance(unitId: string, unitMeta?: ColdChainUnit): UnitInstance {
    let inst = this.instances.get(unitId);
    if (!inst) {
      const fallbackUnit: ColdChainUnit = unitMeta || {
        id: unitId,
        name: unitId.includes('hub') ? 'YucaHub Station' : 'YucaVault',
        code: unitId.substring(0, 5).toUpperCase(),
        type: unitId.includes('hub') ? 'stationary' : 'transport',
        locationDescription: 'Cassava Storage Unit',
        esp32Ip: '192.168.1.160',
      };
      inst = new UnitInstance(fallbackUnit);
      this.instances.set(unitId, inst);
    } else if (unitMeta) {
      inst.unit = unitMeta;
    }
    return inst;
  }

  public step(unitId: string, unitMeta?: ColdChainUnit): ChamberStatus {
    return this.getUnitInstance(unitId, unitMeta).step();
  }

  public stepAll(): Record<string, ChamberStatus> {
    const result: Record<string, ChamberStatus> = {};
    for (const [id, inst] of this.instances.entries()) {
      result[id] = inst.step();
    }
    return result;
  }

  public setSensorEnabled(unitId: string, sensorId: string, enabled: boolean) {
    this.getUnitInstance(unitId).setSensorEnabled(sensorId, enabled);
  }

  public setEnvironmentPreset(unitId: string, preset: 'optimal' | 'hot' | 'cold' | 'dry' | 'humid' | 'safety') {
    this.getUnitInstance(unitId).setEnvironmentPreset(preset);
  }
}

export const simulator = new MultiUnitSimulator();

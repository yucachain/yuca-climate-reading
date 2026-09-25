import { db } from '../db/db.js';
import { ChamberStatus, ColdChainUnit } from '../types.js';

interface UnitPreviousState {
  fan: boolean;
  pump: boolean;
  safety: boolean;
  connected: boolean;
}

export class IoTGateway {
  private timer: NodeJS.Timeout | null = null;
  private prevStates: Map<string, UnitPreviousState> = new Map();
  private isPolling = false;

  public async start() {
    this.stop();
    const settings = await db.getSettings();
    if (!settings.pollingEnabled) {
      console.log('ℹ️ IoT Gateway Polling is currently disabled.');
      return;
    }

    console.log(`🚀 IoT Gateway started. Polling ESP32 devices every ${settings.pollInterval}ms`);
    // Run initial poll
    this.pollAllUnits();

    this.timer = setInterval(() => {
      this.pollAllUnits();
    }, settings.pollInterval);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async updateInterval(newIntervalMs: number, enabled: boolean) {
    await db.updateSettings({ pollInterval: newIntervalMs, pollingEnabled: enabled });
    this.start();
  }

  public async pingEsp32(targetIp: string): Promise<{ success: boolean; latencyMs: number; data?: any; error?: string }> {
    const sanitized = targetIp.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);

      const res = await fetch(`http://${sanitized}/api/status`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return { success: false, latencyMs, error: `ESP32 returned HTTP ${res.status}` };
      }

      const json = await res.json();
      return { success: true, latencyMs, data: json };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return { success: false, latencyMs, error: err.message || 'Connection timed out' };
    }
  }

  public async handleTelemetryIngest(payload: any, clientIp?: string): Promise<{ success: boolean; message: string; status?: ChamberStatus }> {
    const units = await db.getUnits();
    // Match unit by unitId or IP
    let unit: ColdChainUnit | undefined;
    if (payload.unitId) {
      unit = units.find((u) => u.id === payload.unitId);
    }
    if (!unit && payload.code) {
      unit = units.find((u) => u.code.toLowerCase() === payload.code.toLowerCase());
    }
    if (!unit && clientIp) {
      const sanitizedClientIp = clientIp.replace(/^.*:/, '');
      unit = units.find((u) => u.esp32Ip.includes(sanitizedClientIp));
    }
    if (!unit && units.length > 0) {
      unit = units[0]; // Fallback to first unit
    }

    if (!unit) {
      return { success: false, message: 'No matching unit found for incoming telemetry' };
    }

    const status: ChamberStatus = {
      system: payload.system || `YucaChain - ${unit.name}`,
      unitId: unit.id,
      unitName: unit.name,
      unitType: unit.type,
      uptime: Number(payload.uptime || 0),
      validSensors: Number(payload.validSensors ?? (payload.sensors ? payload.sensors.filter((s: any) => s.valid).length : 0)),
      minValidSensors: Number(payload.minValidSensors ?? 4),
      totalSensors: Number(payload.totalSensors ?? (payload.sensors ? payload.sensors.length : 6)),
      safetyMode: Boolean(payload.safetyMode),
      averageTemperature: Number(payload.averageTemperature ?? 0),
      averageHumidity: Number(payload.averageHumidity ?? 0),
      fanState: Boolean(payload.fanState),
      pumpState: Boolean(payload.pumpState),
      fanReason: String(payload.fanReason || ''),
      pumpReason: String(payload.pumpReason || ''),
      timestamp: Date.now(),
      connected: true,
      sensors: (payload.sensors || []).map((s: any) => ({
        id: String(s.id),
        location: s.location || 'LEFT',
        position: s.position,
        pin: Number(s.pin || 0),
        valid: Boolean(s.valid),
        temperature: Number(s.temperature || 0),
        humidity: Number(s.humidity || 0),
      })),
    };

    await this.processTelemetryUpdate(unit, status);
    return { success: true, message: 'Telemetry ingested successfully', status };
  }

  private async pollAllUnits() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const units = await db.getUnits();
      await Promise.allSettled(
        units.map((unit) => this.pollSingleUnit(unit))
      );
    } catch (err) {
      console.error('Error during IoT Gateway polling cycle:', err);
    } finally {
      this.isPolling = false;
    }
  }

  private async pollSingleUnit(unit: ColdChainUnit) {
    const sanitizedIp = unit.esp32Ip.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!sanitizedIp || sanitizedIp.includes('0.0.0.0')) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(`http://${sanitizedIp}/api/status`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json: any = await response.json();
      const status: ChamberStatus = {
        system: json.system || `YucaChain - ${unit.name}`,
        unitId: unit.id,
        unitName: unit.name,
        unitType: unit.type,
        uptime: Number(json.uptime || 0),
        validSensors: Number(json.validSensors ?? (json.sensors ? json.sensors.filter((s: any) => s.valid).length : 0)),
        minValidSensors: Number(json.minValidSensors ?? 4),
        totalSensors: Number(json.totalSensors ?? (json.sensors ? json.sensors.length : 6)),
        safetyMode: Boolean(json.safetyMode),
        averageTemperature: Number(json.averageTemperature ?? 0),
        averageHumidity: Number(json.averageHumidity ?? 0),
        fanState: Boolean(json.fanState),
        pumpState: Boolean(json.pumpState),
        fanReason: String(json.fanReason || ''),
        pumpReason: String(json.pumpReason || ''),
        timestamp: Date.now(),
        connected: true,
        sensors: (json.sensors || []).map((s: any) => ({
          id: String(s.id),
          location: s.location || 'LEFT',
          position: s.position,
          pin: Number(s.pin || 0),
          valid: Boolean(s.valid),
          temperature: Number(s.temperature || 0),
          humidity: Number(s.humidity || 0),
        })),
      };

      await this.processTelemetryUpdate(unit, status);
    } catch (err: any) {
      // Mark as offline if it was previously connected
      const prev = this.prevStates.get(unit.id);
      if (prev && prev.connected) {
        this.prevStates.set(unit.id, { ...prev, connected: false });
        await db.addLog(
          unit.id,
          'system',
          `[${unit.code}] ESP32 at ${unit.esp32Ip} unreachable: ${err.message}`,
          'warning'
        );
      }
    }
  }

  private async processTelemetryUpdate(unit: ColdChainUnit, status: ChamberStatus) {
    const prevState = this.prevStates.get(unit.id);

    // Save telemetry to DB
    await db.saveTelemetry(status);

    if (prevState) {
      // Safety Mode transition check
      if (prevState.safety !== status.safetyMode) {
        if (status.safetyMode) {
          await db.addLog(
            unit.id,
            'safety',
            `[${unit.code}] Sensor Safety Alert: Only ${status.validSensors}/${status.totalSensors} sensors active. Pump stopped, Fan forced ON.`,
            'danger'
          );
        } else {
          await db.addLog(
            unit.id,
            'safety',
            `[${unit.code}] Sensor health restored. ${status.validSensors}/${status.totalSensors} sensors reporting.`,
            'success'
          );
        }
      }

      // Fan state transition check
      if (prevState.fan !== status.fanState) {
        await db.addLog(
          unit.id,
          'fan',
          `[${unit.code}] Airflow Fan turned ${status.fanState ? 'ON' : 'OFF'}: ${status.fanReason}`,
          status.fanState ? 'warning' : 'info'
        );
      }

      // Pump state transition check
      if (prevState.pump !== status.pumpState) {
        await db.addLog(
          unit.id,
          'pump',
          `[${unit.code}] Mist Pump turned ${status.pumpState ? 'ON' : 'OFF'}: ${status.pumpReason}`,
          status.pumpState ? 'success' : 'info'
        );
      }

      // Connection restored check
      if (!prevState.connected) {
        await db.addLog(
          unit.id,
          'system',
          `[${unit.code}] Reconnected to ESP32 at ${unit.esp32Ip}`,
          'success'
        );
      }
    } else {
      // First telemetry reception
      await db.addLog(
        unit.id,
        'system',
        `[${unit.code}] Telemetry online from ${unit.name} (${unit.esp32Ip})`,
        'success'
      );
    }

    this.prevStates.set(unit.id, {
      fan: status.fanState,
      pump: status.pumpState,
      safety: status.safetyMode,
      connected: true,
    });
  }
}

export const iotGateway = new IoTGateway();

import { PrismaClient } from '@prisma/client';
import { ColdChainUnit, ChamberStatus, ActivityLogItem, SystemSettings } from '../types.js';

export const prisma = new PrismaClient();

export let isPostgresConnected = false;

// In-memory fallback cache when PostgreSQL is starting or not connected
class InMemoryStore {
  public units: Map<string, ColdChainUnit> = new Map([
    [
      'vault-1',
      {
        id: 'vault-1',
        name: 'YucaVault #1',
        code: 'TR-01',
        type: 'transport',
        locationDescription: 'Mobile Transit Cold Chain (Truck #1)',
        esp32Ip: '192.168.1.151',
        isActive: true,
      },
    ],
    [
      'vault-2',
      {
        id: 'vault-2',
        name: 'YucaVault #2',
        code: 'TR-02',
        type: 'transport',
        locationDescription: 'Mobile Transit Cold Chain (Truck #2)',
        esp32Ip: '192.168.1.152',
        isActive: true,
      },
    ],
    [
      'hub-1',
      {
        id: 'hub-1',
        name: 'YucaHub Station',
        code: 'ST-01',
        type: 'stationary',
        locationDescription: 'Stationary Central Cassava Storage Facility',
        esp32Ip: '192.168.1.150',
        isActive: true,
      },
    ],
  ]);

  public latestStatus: Map<string, ChamberStatus> = new Map();
  public history: Map<string, ChamberStatus[]> = new Map();
  public logs: ActivityLogItem[] = [];
  public settings: SystemSettings = {
    pollInterval: 3000,
    pollingEnabled: true,
  };
}

export const inMemoryStore = new InMemoryStore();

export async function initDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    isPostgresConnected = true;
    console.log('✅ PostgreSQL connected successfully via Prisma.');
    await seedInitialData();
    return true;
  } catch (error: any) {
    isPostgresConnected = false;
    console.warn('\n⚠️ [Database Warning] Could not connect to PostgreSQL:');
    console.warn(`   ${error?.message || error}`);
    console.warn('   Running in local resilient store mode so API & dashboard work seamlessly.');
    console.warn('   To enable PostgreSQL, ensure PostgreSQL is running with the DATABASE_URL in .env.\n');
    return false;
  }
}

export async function seedInitialData() {
  if (!isPostgresConnected) return;

  const initialUnits: ColdChainUnit[] = [
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

  for (const u of initialUnits) {
    await prisma.unit.upsert({
      where: { id: u.id },
      update: {
        name: u.name,
        code: u.code,
        type: u.type,
        locationDescription: u.locationDescription,
        esp32Ip: u.esp32Ip,
      },
      create: {
        id: u.id,
        name: u.name,
        code: u.code,
        type: u.type,
        locationDescription: u.locationDescription,
        esp32Ip: u.esp32Ip,
      },
    });
  }

  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      pollInterval: 3000,
      pollingEnabled: true,
    },
  });

  console.log('✅ Seed completed: 3 units (2 Vaults, 1 Hub) initialized in PostgreSQL.');
}

// Data Access Helpers that gracefully bridge PostgreSQL and resilience store
export const db = {
  async getUnits(): Promise<ColdChainUnit[]> {
    if (isPostgresConnected) {
      try {
        const rows = await prisma.unit.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        });
        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          type: r.type as 'transport' | 'stationary',
          locationDescription: r.locationDescription,
          esp32Ip: r.esp32Ip,
          isActive: r.isActive,
        }));
      } catch (err) {
        console.error('Error fetching units from PostgreSQL, falling back to memory:', err);
      }
    }
    return Array.from(inMemoryStore.units.values());
  },

  async getUnitById(id: string): Promise<ColdChainUnit | null> {
    if (isPostgresConnected) {
      try {
        const r = await prisma.unit.findUnique({ where: { id } });
        if (!r) return null;
        return {
          id: r.id,
          name: r.name,
          code: r.code,
          type: r.type as 'transport' | 'stationary',
          locationDescription: r.locationDescription,
          esp32Ip: r.esp32Ip,
          isActive: r.isActive,
        };
      } catch (err) {
        console.error('Error fetching unit from PostgreSQL:', err);
      }
    }
    return inMemoryStore.units.get(id) || null;
  },

  async saveUnit(unit: ColdChainUnit): Promise<ColdChainUnit> {
    inMemoryStore.units.set(unit.id, unit);
    if (isPostgresConnected) {
      try {
        await prisma.unit.upsert({
          where: { id: unit.id },
          update: {
            name: unit.name,
            code: unit.code,
            type: unit.type,
            locationDescription: unit.locationDescription,
            esp32Ip: unit.esp32Ip,
            isActive: unit.isActive !== undefined ? unit.isActive : true,
          },
          create: {
            id: unit.id,
            name: unit.name,
            code: unit.code,
            type: unit.type,
            locationDescription: unit.locationDescription,
            esp32Ip: unit.esp32Ip,
            isActive: unit.isActive !== undefined ? unit.isActive : true,
          },
        });
      } catch (err) {
        console.error('Error saving unit to PostgreSQL:', err);
      }
    }
    return unit;
  },

  async deleteUnit(id: string): Promise<boolean> {
    inMemoryStore.units.delete(id);
    if (isPostgresConnected) {
      try {
        await prisma.unit.update({
          where: { id },
          data: { isActive: false },
        });
        return true;
      } catch (err) {
        console.error('Error deleting unit from PostgreSQL:', err);
      }
    }
    return true;
  },

  async saveTelemetry(reading: ChamberStatus): Promise<void> {
    // Cache latest status
    inMemoryStore.latestStatus.set(reading.unitId, reading);

    // Append to memory history (cap at 60)
    const list = inMemoryStore.history.get(reading.unitId) || [];
    list.push(reading);
    if (list.length > 60) list.shift();
    inMemoryStore.history.set(reading.unitId, list);

    if (isPostgresConnected) {
      try {
        await prisma.telemetryReading.create({
          data: {
            unitId: reading.unitId,
            uptime: BigInt(reading.uptime || 0),
            validSensors: reading.validSensors,
            minValidSensors: reading.minValidSensors || 4,
            totalSensors: reading.totalSensors || 6,
            safetyMode: reading.safetyMode,
            averageTemperature: reading.averageTemperature,
            averageHumidity: reading.averageHumidity,
            fanState: reading.fanState,
            pumpState: reading.pumpState,
            fanReason: reading.fanReason || '',
            pumpReason: reading.pumpReason || '',
            sensors: {
              create: (reading.sensors || []).map((s) => ({
                sensorCode: s.id,
                location: s.location,
                position: s.position || null,
                pin: s.pin,
                valid: s.valid,
                temperature: s.temperature,
                humidity: s.humidity,
              })),
            },
          },
        });
      } catch (err) {
        console.error('Error writing telemetry to PostgreSQL:', err);
      }
    }
  },

  async getLatestStatus(unitId: string): Promise<ChamberStatus | null> {
    const cached = inMemoryStore.latestStatus.get(unitId);
    if (cached) return cached;

    if (isPostgresConnected) {
      try {
        const row = await prisma.telemetryReading.findFirst({
          where: { unitId },
          orderBy: { createdAt: 'desc' },
          include: { sensors: true, unit: true },
        });

        if (row) {
          const status: ChamberStatus = {
            system: `YucaChain - ${row.unit.name}`,
            unitId: row.unitId,
            unitName: row.unit.name,
            unitType: row.unit.type as 'transport' | 'stationary',
            uptime: Number(row.uptime),
            validSensors: row.validSensors,
            minValidSensors: row.minValidSensors,
            totalSensors: row.totalSensors,
            safetyMode: row.safetyMode,
            averageTemperature: row.averageTemperature,
            averageHumidity: row.averageHumidity,
            fanState: row.fanState,
            pumpState: row.pumpState,
            fanReason: row.fanReason,
            pumpReason: row.pumpReason,
            timestamp: row.createdAt.getTime(),
            sensors: row.sensors.map((s) => ({
              id: s.sensorCode,
              location: s.location as any,
              position: s.position as any,
              pin: s.pin,
              valid: s.valid,
              temperature: s.temperature,
              humidity: s.humidity,
            })),
          };
          inMemoryStore.latestStatus.set(unitId, status);
          return status;
        }
      } catch (err) {
        console.error('Error fetching latest status from PostgreSQL:', err);
      }
    }

    return null;
  },

  async getTelemetryHistory(unitId: string, limit: number = 30): Promise<ChamberStatus[]> {
    if (isPostgresConnected) {
      try {
        const rows = await prisma.telemetryReading.findMany({
          where: { unitId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: { sensors: true, unit: true },
        });

        if (rows.length > 0) {
          return rows.reverse().map((row) => ({
            system: `YucaChain - ${row.unit.name}`,
            unitId: row.unitId,
            unitName: row.unit.name,
            unitType: row.unit.type as 'transport' | 'stationary',
            uptime: Number(row.uptime),
            validSensors: row.validSensors,
            minValidSensors: row.minValidSensors,
            totalSensors: row.totalSensors,
            safetyMode: row.safetyMode,
            averageTemperature: row.averageTemperature,
            averageHumidity: row.averageHumidity,
            fanState: row.fanState,
            pumpState: row.pumpState,
            fanReason: row.fanReason,
            pumpReason: row.pumpReason,
            timestamp: row.createdAt.getTime(),
            sensors: row.sensors.map((s) => ({
              id: s.sensorCode,
              location: s.location as any,
              position: s.position as any,
              pin: s.pin,
              valid: s.valid,
              temperature: s.temperature,
              humidity: s.humidity,
            })),
          }));
        }
      } catch (err) {
        console.error('Error fetching telemetry history from PostgreSQL:', err);
      }
    }

    const memList = inMemoryStore.history.get(unitId) || [];
    return memList.slice(-limit);
  },

  async addLog(
    unitId: string | null,
    type: ActivityLogItem['type'],
    message: string,
    severity: ActivityLogItem['severity'] = 'info'
  ): Promise<ActivityLogItem> {
    const item: ActivityLogItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      unitId,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      severity,
      createdAt: new Date().toISOString(),
    };

    inMemoryStore.logs.unshift(item);
    if (inMemoryStore.logs.length > 100) inMemoryStore.logs.pop();

    if (isPostgresConnected) {
      try {
        await prisma.activityLog.create({
          data: {
            unitId: unitId && unitId !== 'global' ? unitId : null,
            type,
            message,
            severity,
          },
        });
      } catch (err) {
        console.error('Error writing activity log to PostgreSQL:', err);
      }
    }

    return item;
  },

  async getLogs(unitId?: string, limit: number = 50): Promise<ActivityLogItem[]> {
    if (isPostgresConnected) {
      try {
        const rows = await prisma.activityLog.findMany({
          where: unitId && unitId !== 'global' ? { unitId } : {},
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            unitId: r.unitId,
            timestamp: r.createdAt.toLocaleTimeString(),
            type: r.type as any,
            message: r.message,
            severity: r.severity as any,
            createdAt: r.createdAt.toISOString(),
          }));
        }
      } catch (err) {
        console.error('Error reading activity logs from PostgreSQL:', err);
      }
    }

    if (unitId && unitId !== 'global') {
      return inMemoryStore.logs.filter((l) => l.unitId === unitId).slice(0, limit);
    }
    return inMemoryStore.logs.slice(0, limit);
  },

  async clearLogs(): Promise<void> {
    inMemoryStore.logs = [];
    if (isPostgresConnected) {
      try {
        await prisma.activityLog.deleteMany({});
      } catch (err) {
        console.error('Error clearing logs in PostgreSQL:', err);
      }
    }
  },

  async getSettings(): Promise<SystemSettings> {
    if (isPostgresConnected) {
      try {
        const row = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
        if (row) {
          return {
            pollInterval: row.pollInterval,
            pollingEnabled: row.pollingEnabled,
          };
        }
      } catch (err) {
        console.error('Error getting settings from PostgreSQL:', err);
      }
    }
    return inMemoryStore.settings;
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    inMemoryStore.settings = { ...inMemoryStore.settings, ...settings };
    if (isPostgresConnected) {
      try {
        await prisma.systemSetting.upsert({
          where: { id: 'default' },
          update: {
            pollInterval: inMemoryStore.settings.pollInterval,
            pollingEnabled: inMemoryStore.settings.pollingEnabled,
          },
          create: {
            id: 'default',
            pollInterval: inMemoryStore.settings.pollInterval,
            pollingEnabled: inMemoryStore.settings.pollingEnabled,
          },
        });
      } catch (err) {
        console.error('Error updating settings in PostgreSQL:', err);
      }
    }
    return inMemoryStore.settings;
  },
};

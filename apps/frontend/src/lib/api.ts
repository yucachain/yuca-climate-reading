import {
  ColdChainUnit,
  ChamberStatus,
  ChartPoint,
  ActivityLog,
  ChamberSettings,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // Unit Management
  async getUnits(): Promise<ColdChainUnit[]> {
    return fetchJson<ColdChainUnit[]>('/api/units');
  },

  async getUnit(id: string): Promise<ColdChainUnit> {
    return fetchJson<ColdChainUnit>(`/api/units/${id}`);
  },

  async createUnit(unit: Omit<ColdChainUnit, 'id'> & { id?: string }): Promise<ColdChainUnit> {
    return fetchJson<ColdChainUnit>('/api/units', {
      method: 'POST',
      body: JSON.stringify(unit),
    });
  },

  async updateUnit(id: string, unit: Partial<ColdChainUnit>): Promise<ColdChainUnit> {
    return fetchJson<ColdChainUnit>(`/api/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(unit),
    });
  },

  async deleteUnit(id: string): Promise<{ success: boolean; message: string }> {
    return fetchJson<{ success: boolean; message: string }>(`/api/units/${id}`, {
      method: 'DELETE',
    });
  },

  // Live Telemetry
  async getUnitStatus(unitId: string): Promise<ChamberStatus> {
    return fetchJson<ChamberStatus>(`/api/units/${unitId}/status`);
  },

  async getAllTelemetryStatus(): Promise<Record<string, ChamberStatus>> {
    return fetchJson<Record<string, ChamberStatus>>('/api/telemetry/status');
  },

  // Historical Charts
  async getUnitHistory(unitId: string, limit: number = 30): Promise<ChartPoint[]> {
    return fetchJson<ChartPoint[]>(`/api/units/${unitId}/history?limit=${limit}`);
  },

  // ESP32 Direct Ingestion & Ping
  async pingEsp32(targetIp: string): Promise<{ success: boolean; latencyMs: number; error?: string; data?: any }> {
    return fetchJson<{ success: boolean; latencyMs: number; error?: string; data?: any }>(
      '/api/telemetry/proxy?ip=' + encodeURIComponent(targetIp)
    );
  },

  async pingUnit(unitId: string, ip?: string): Promise<{ success: boolean; latencyMs: number; error?: string; data?: any }> {
    return fetchJson<{ success: boolean; latencyMs: number; error?: string; data?: any }>(
      `/api/units/${unitId}/ping`,
      {
        method: 'POST',
        body: JSON.stringify({ ip }),
      }
    );
  },

  // Activity Logs
  async getLogs(unitId?: string, limit: number = 50): Promise<ActivityLog[]> {
    const query = unitId && unitId !== 'global' ? `?unitId=${encodeURIComponent(unitId)}&limit=${limit}` : `?limit=${limit}`;
    return fetchJson<ActivityLog[]>(`/api/logs${query}`);
  },

  async clearLogs(): Promise<void> {
    await fetchJson('/api/logs', { method: 'DELETE' });
  },

  async addLog(log: { unitId?: string; type: string; message: string; severity?: string }): Promise<ActivityLog> {
    return fetchJson<ActivityLog>('/api/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  },

  // System Settings
  async getSettings(): Promise<ChamberSettings> {
    const res = await fetchJson<{ pollInterval: number; pollingEnabled: boolean }>('/api/settings');
    return {
      pollInterval: res.pollInterval,
      isSimulation: false, // Demo data removed; always connected to backend
      pollingEnabled: res.pollingEnabled,
    };
  },

  async updateSettings(settings: Partial<ChamberSettings>): Promise<ChamberSettings> {
    const res = await fetchJson<{ pollInterval: number; pollingEnabled: boolean }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        pollInterval: settings.pollInterval,
        pollingEnabled: settings.pollingEnabled,
      }),
    });
    return {
      pollInterval: res.pollInterval,
      isSimulation: false,
      pollingEnabled: res.pollingEnabled,
    };
  },

  // Backend Health
  async getHealth(): Promise<any> {
    return fetchJson('/api/health');
  },
};

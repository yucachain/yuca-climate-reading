'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { UnitSelector } from '@/components/UnitSelector';
import { SafetyAlert } from '@/components/SafetyAlert';
import { OverallStatus } from '@/components/OverallStatus';
import { ActuatorControls } from '@/components/ActuatorControls';
import { ChamberSensors } from '@/components/ChamberSensors';
import { ClimateChart } from '@/components/ClimateChart';
import { DiagnosticsLog } from '@/components/DiagnosticsLog';
import { SettingsModal } from '@/components/SettingsModal';
import { Esp32CodeModal } from '@/components/Esp32CodeModal';
import { AddUnitModal } from '@/components/AddUnitModal';
import {
  ChamberStatus,
  ChartPoint,
  ActivityLog,
  ChamberSettings,
  ColdChainUnit,
} from '@/lib/types';
import { api } from '@/lib/api';

export default function YucaChainDashboard() {
  const [units, setUnits] = useState<ColdChainUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('vault-1');

  // Settings
  const [settings, setSettings] = useState<ChamberSettings>({
    isSimulation: false,
    pollInterval: 3000,
    pollingEnabled: true,
  });

  // Telemetry status across all units (from Express backend)
  const [unitsStatus, setUnitsStatus] = useState<Record<string, ChamberStatus>>({});
  // Historical chart data per unit (from PostgreSQL via Express)
  const [chartHistories, setChartHistories] = useState<Record<string, ChartPoint[]>>({});
  // Event & Audit logs
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  // Load initial units and settings from Express backend
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedUnits, fetchedSettings, initialLogs] = await Promise.all([
        api.getUnits().catch(() => []),
        api.getSettings().catch(() => ({ pollInterval: 3000, isSimulation: false, pollingEnabled: true })),
        api.getLogs(undefined, 50).catch(() => []),
      ]);

      if (fetchedUnits.length > 0) {
        setUnits(fetchedUnits);
        setSelectedUnitId((prev) => (fetchedUnits.some((u) => u.id === prev) ? prev : fetchedUnits[0].id));
      }
      setSettings(fetchedSettings);
      setLogs(initialLogs);
      setIsConnected(true);
      setBackendError(null);
    } catch (err: any) {
      console.error('Failed to load initial data from backend:', err);
      setIsConnected(false);
      setBackendError(err.message || 'Cannot connect to YucaVault Express Backend');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Main telemetry & history polling from Express Backend
  const updateTelemetry = useCallback(async () => {
    try {
      // 1. Fetch live telemetry status for all units
      const statusMap = await api.getAllTelemetryStatus();
      setUnitsStatus(statusMap);

      // 2. Fetch history for the active selected unit
      if (selectedUnitId) {
        const history = await api.getUnitHistory(selectedUnitId, 30);
        setChartHistories((prev) => ({
          ...prev,
          [selectedUnitId]: history,
        }));
      }

      // 3. Fetch latest activity logs
      const latestLogs = await api.getLogs(undefined, 50);
      setLogs(latestLogs);

      setLastUpdated(new Date());
      setIsConnected(true);
      setBackendError(null);
    } catch (err: any) {
      console.warn('Telemetry update failed:', err);
      setIsConnected(false);
      setBackendError(err.message || 'Connection to backend lost');
    }
  }, [selectedUnitId]);

  // Periodic polling timer
  useEffect(() => {
    if (!settings.pollingEnabled) return;

    const interval = setInterval(() => {
      updateTelemetry();
    }, settings.pollInterval);

    return () => clearInterval(interval);
  }, [updateTelemetry, settings.pollInterval, settings.pollingEnabled]);

  // Handlers
  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    api.getUnitHistory(unitId, 30).then((history) => {
      setChartHistories((prev) => ({ ...prev, [unitId]: history }));
    }).catch(console.error);
  };

  const handleSaveSettings = async (
    newSettings: ChamberSettings,
    updatedUnits: ColdChainUnit[]
  ) => {
    try {
      setIsLoading(true);
      await api.updateSettings(newSettings);
      setSettings(newSettings);

      // Update unit IPs in database
      await Promise.all(
        updatedUnits.map((u) =>
          api.updateUnit(u.id, {
            name: u.name,
            code: u.code,
            esp32Ip: u.esp32Ip,
            locationDescription: u.locationDescription,
          })
        )
      );

      const refreshedUnits = await api.getUnits();
      setUnits(refreshedUnits);
      await updateTelemetry();
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewUnit = async (newUnit: ColdChainUnit) => {
    try {
      setIsLoading(true);
      const created = await api.createUnit(newUnit);
      const refreshedUnits = await api.getUnits();
      setUnits(refreshedUnits);
      setSelectedUnitId(created.id);
      await updateTelemetry();
    } catch (err: any) {
      alert(`Failed to add unit: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await api.clearLogs();
      setLogs([]);
    } catch (err: any) {
      console.error('Failed to clear logs:', err);
    }
  };

  const currentUnit = units.find((u) => u.id === selectedUnitId) || units[0] || {
    id: 'vault-1',
    name: 'YucaVault #1',
    code: 'TR-01',
    type: 'transport',
    locationDescription: 'Mobile Transit Cold Chain (Truck #1)',
    esp32Ip: '192.168.1.151',
  };

  const currentStatus = unitsStatus[selectedUnitId] || null;
  const currentChartData = chartHistories[selectedUnitId] || [];

  return (
    <div className="min-h-screen flex flex-col selection:bg-emerald-100 selection:text-emerald-950 bg-[#fbfdfc] text-slate-900">
      {/* Brand Header */}
      <Header
        currentUnit={currentUnit}
        status={currentStatus}
        settings={settings}
        isConnected={isConnected}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        onRefresh={updateTelemetry}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCode={() => setIsCodeOpen(true)}
        onToggleMode={() => {}}
      />

      {/* Backend connection warning banner if server is unreachable */}
      {backendError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs sm:text-sm font-semibold text-amber-900">
          ⚠️ Backend Connection: {backendError}. Ensure Express server is running on port 5000 (npm run dev:backend).
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-7">
        {/* Scalable Unit Selector (Vaults & Hubs) */}
        <UnitSelector
          units={units}
          selectedUnitId={selectedUnitId}
          onSelectUnit={handleSelectUnit}
          unitsStatus={unitsStatus}
          onAddNewUnit={() => setIsAddUnitOpen(true)}
        />

        {/* Sensor Safety Alert banner when < 4 valid sensors on this unit */}
        <SafetyAlert status={currentStatus} />

        {/* Top Summary & Environmental Health Gauges */}
        <OverallStatus status={currentStatus} />

        {/* Fan and Mist Pump Actuators */}
        <ActuatorControls status={currentStatus} />

        {/* Spatial 6-Sensor Matrix (Top Tier A1-A3 vs Bottom Tier B1-B3) */}
        <ChamberSensors
          status={currentStatus}
          isSimulation={false}
          onToggleSensor={() => {}}
        />

        {/* Real-time Trend Chart with CSV Download */}
        <ClimateChart
          data={currentChartData}
          unitName={currentUnit.name}
          allUnits={units}
          selectedUnitId={selectedUnitId}
          chartHistories={chartHistories}
        />

        {/* Activity & Alert Log from Database */}
        <DiagnosticsLog logs={logs} onClearLogs={handleClearLogs} />
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-900/10 py-6 px-4 text-center text-sm text-slate-600 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-xs" />
            <span className="font-extrabold text-emerald-950">YucaChain Cassava Cold Chain</span>
            <span>&bull; PostgreSQL &amp; Express IoT Gateway</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Live telemetry ingestion and control for 2 YucaVaults &amp; 1 YucaHub ESP32 nodes
          </p>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        units={units}
        selectedUnitId={selectedUnitId}
        onSaveSettings={handleSaveSettings}
      />

      {/* ESP32 Arduino C++ Code Modal */}
      <Esp32CodeModal isOpen={isCodeOpen} onClose={() => setIsCodeOpen(false)} />

      {/* Add Unit Modal */}
      <AddUnitModal
        isOpen={isAddUnitOpen}
        onClose={() => setIsAddUnitOpen(false)}
        onAddUnit={handleAddNewUnit}
        existingCount={units.length}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { simulator, INITIAL_UNITS } from '@/lib/simulator';

export default function YucaChainDashboard() {
  // Storage Units (starts with 2 Transport Vaults & 1 Stationary Hub, expandable to any number)
  const [units, setUnits] = useState<ColdChainUnit[]>(INITIAL_UNITS);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('vault-1');

  // Settings
  const [settings, setSettings] = useState<ChamberSettings>({
    isSimulation: true,
    pollInterval: 3000,
  });

  // Telemetry status across all units
  const [unitsStatus, setUnitsStatus] = useState<Record<string, ChamberStatus>>({});
  // Historical chart data per unit
  const [chartHistories, setChartHistories] = useState<Record<string, ChartPoint[]>>({});
  // Event logs
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  // Track actuator transitions per unit to write audit log
  const prevStates = useRef<Record<string, { fan: boolean; pump: boolean; safety: boolean }>>({});

  const currentUnit = units.find((u) => u.id === selectedUnitId) || units[0];
  const currentStatus = unitsStatus[selectedUnitId] || null;
  const currentChartData = chartHistories[selectedUnitId] || [];

  const addLog = useCallback(
    (
      unitId: string,
      type: ActivityLog['type'],
      message: string,
      severity: ActivityLog['severity'] = 'info'
    ) => {
      const newLog: ActivityLog = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        unitId,
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
        severity,
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 50)]);
    },
    []
  );

  // Track units status in ref to avoid infinite re-render loops
  const unitsStatusRef = useRef<Record<string, ChamberStatus>>({});
  unitsStatusRef.current = unitsStatus;

  // Telemetry update function
  const updateTelemetry = useCallback(async () => {
    setIsLoading(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    try {
      const updatedStatusMap: Record<string, ChamberStatus> = {};

      if (settings.isSimulation) {
        // Step physics for all units
        units.forEach((u) => {
          const st = simulator.step(u.id, u);
          updatedStatusMap[u.id] = st;
        });
        setIsConnected(true);
      } else {
        // Query live ESP32 for the active unit (and preserve others)
        for (const u of units) {
          if (u.id === selectedUnitId) {
            const sanitizedIp = u.esp32Ip.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            const res = await fetch(`/api/esp32?ip=${sanitizedIp}`, { cache: 'no-store' });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `HTTP ${res.status}`);
            }
            const data: ChamberStatus = await res.json();
            data.unitId = u.id;
            data.unitName = u.name;
            data.unitType = u.type;
            updatedStatusMap[u.id] = data;
          } else {
            // Keep previous status for inactive units if exists
            if (unitsStatusRef.current[u.id]) {
              updatedStatusMap[u.id] = unitsStatusRef.current[u.id];
            }
          }
        }
        setIsConnected(true);
      }

      setUnitsStatus(updatedStatusMap);
      setLastUpdated(now);

      // Audit logs & Chart points for each updated unit
      setChartHistories((prevHistories) => {
        const nextHistories = { ...prevHistories };

        Object.entries(updatedStatusMap).forEach(([uId, st]) => {
          const prevState = prevStates.current[uId];
          const unitMeta = units.find((u) => u.id === uId);
          const unitTag = unitMeta ? unitMeta.code : uId;

          // Check Safety Mode transitions
          if (prevState && prevState.safety !== st.safetyMode) {
            if (st.safetyMode) {
              addLog(
                uId,
                'safety',
                `[${unitTag}] Sensor Safety Alert: Only ${st.validSensors}/6 sensors working. Pump stopped, Fan kept ON.`,
                'danger'
              );
            } else {
              addLog(
                uId,
                'safety',
                `[${unitTag}] Sensor health restored. ${st.validSensors}/6 sensors active.`,
                'success'
              );
            }
          }

          // Check Fan transitions
          if (prevState && prevState.fan !== st.fanState) {
            addLog(
              uId,
              'fan',
              `[${unitTag}] Airflow Fan turned ${st.fanState ? 'ON' : 'OFF'}: ${st.fanReason}`,
              st.fanState ? 'warning' : 'info'
            );
          }

          // Check Pump transitions
          if (prevState && prevState.pump !== st.pumpState) {
            addLog(
              uId,
              'pump',
              `[${unitTag}] Mist Pump turned ${st.pumpState ? 'ON' : 'OFF'}: ${st.pumpReason}`,
              st.pumpState ? 'success' : 'info'
            );
          }

          prevStates.current[uId] = {
            fan: st.fanState,
            pump: st.pumpState,
            safety: st.safetyMode,
          };

          // Chart point
          if (!st.safetyMode && st.averageTemperature > 0) {
            const point: ChartPoint = {
              time: timeStr,
              timestamp: Date.now(),
              avgTemp: st.averageTemperature,
              avgHumidity: st.averageHumidity,
              fanActive: st.fanState ? 1 : 0,
              pumpActive: st.pumpState ? 1 : 0,
            };

            const existing = nextHistories[uId] || [];
            const updated = [...existing, point];
            nextHistories[uId] = updated.length > 30 ? updated.slice(updated.length - 30) : updated;
          }
        });

        return nextHistories;
      });
    } catch (err: unknown) {
      setIsConnected(false);
      const msg = err instanceof Error ? err.message : 'Read error';
      const activeUnitName = units.find((u) => u.id === selectedUnitId)?.name || 'Storage Unit';
      addLog(selectedUnitId, 'system', `Connection issue on ${activeUnitName}: ${msg}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [settings.isSimulation, units, selectedUnitId, addLog]);

  // Polling loop
  useEffect(() => {
    updateTelemetry();

    const interval = setInterval(() => {
      updateTelemetry();
    }, settings.pollInterval);

    return () => clearInterval(interval);
  }, [updateTelemetry, settings.pollInterval]);

  // Initial welcome log
  useEffect(() => {
    addLog('global', 'system', 'YucaChain Climate Control Dashboard Ready.', 'info');
    addLog('global', 'system', 'Monitoring YucaVault #1, YucaVault #2, and YucaHub Station.', 'success');
  }, [addLog]);

  // Sensor toggle in simulator for currently active unit
  const handleToggleSensor = (sensorId: string, enabled: boolean) => {
    if (settings.isSimulation) {
      simulator.setSensorEnabled(selectedUnitId, sensorId, enabled);
      addLog(
        selectedUnitId,
        'sensor',
        `Simulator: [${currentUnit.code}] Sensor ${sensorId} ${enabled ? 'reconnected' : 'disconnected'}.`,
        enabled ? 'info' : 'warning'
      );
      updateTelemetry();
    }
  };

  // Preset triggers for currently active unit
  const handleTriggerPreset = (preset: 'optimal' | 'hot' | 'cold' | 'dry' | 'humid' | 'safety') => {
    if (settings.isSimulation) {
      simulator.setEnvironmentPreset(selectedUnitId, preset);
      addLog(
        selectedUnitId,
        'system',
        `Simulator: [${currentUnit.code}] Switched conditions to: "${preset.toUpperCase()}".`,
        'info'
      );
      updateTelemetry();
    }
  };

  const handleFixSimulation = () => {
    simulator.setEnvironmentPreset(selectedUnitId, 'optimal');
    addLog(selectedUnitId, 'safety', `All 6 sensors reconnected on ${currentUnit.name}.`, 'success');
    updateTelemetry();
  };

  const handleSaveSettings = (newSettings: ChamberSettings, updatedUnits: ColdChainUnit[]) => {
    setSettings(newSettings);
    setUnits(updatedUnits);
    addLog('global', 'system', 'Updated storage unit network settings.', 'info');
  };

  const handleAddNewUnit = (newUnit: ColdChainUnit) => {
    setUnits((prev) => [...prev, newUnit]);
    setSelectedUnitId(newUnit.id);
    addLog('global', 'system', `Added new storage unit: ${newUnit.name} (${newUnit.code}).`, 'success');
  };

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
        onToggleMode={() =>
          setSettings((prev) => ({ ...prev, isSimulation: !prev.isSimulation }))
        }
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-7">
        {/* Scalable Unit Selector (Vaults & Hubs) */}
        <UnitSelector
          units={units}
          selectedUnitId={selectedUnitId}
          onSelectUnit={setSelectedUnitId}
          unitsStatus={unitsStatus}
          onAddNewUnit={() => setIsAddUnitOpen(true)}
        />

        {/* Sensor Safety Alert banner when < 4 valid sensors on this unit */}
        <SafetyAlert
          status={currentStatus}
          onFixSimulation={settings.isSimulation ? handleFixSimulation : undefined}
        />

        {/* Top Summary & Environmental Health Gauges */}
        <OverallStatus status={currentStatus} />

        {/* Fan and Mist Pump Actuators */}
        <ActuatorControls status={currentStatus} />

        {/* Spatial 6-Sensor Matrix (Top Tier A1-A3 vs Bottom Tier B1-B3) */}
        <ChamberSensors
          status={currentStatus}
          isSimulation={settings.isSimulation}
          onToggleSensor={handleToggleSensor}
        />

        {/* Real-time Trend Chart with CSV Download */}
        <ClimateChart
          data={currentChartData}
          unitName={currentUnit.name}
          allUnits={units}
          selectedUnitId={selectedUnitId}
          chartHistories={chartHistories}
        />

        {/* Activity & Alert Log */}
        <DiagnosticsLog logs={logs} onClearLogs={() => setLogs([])} />
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-900/10 py-6 px-4 text-center text-sm text-slate-600 bg-white shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-xs" />
            <span className="font-extrabold text-emerald-950">YucaChain Cassava Cold Chain</span>
            <span>&bull; Fresh Root Preservation</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Automated environmental control for transport YucaVaults and stationary YucaHubs
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
        onTriggerPreset={handleTriggerPreset}
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

'use client';

import React, { useState } from 'react';
import { X, Wifi, Sliders, CheckCircle2, AlertCircle, RefreshCw, Truck, Warehouse } from 'lucide-react';
import { ChamberSettings, ColdChainUnit } from '@/lib/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChamberSettings;
  units: ColdChainUnit[];
  selectedUnitId: string;
  onSaveSettings: (newSettings: ChamberSettings, updatedUnits: ColdChainUnit[]) => void;
  onTriggerPreset?: (preset: 'optimal' | 'hot' | 'cold' | 'dry' | 'humid' | 'safety') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  units,
  selectedUnitId,
  onSaveSettings,
  onTriggerPreset,
}) => {
  const [pollInterval, setPollInterval] = useState(settings.pollInterval);
  const [isSim, setIsSim] = useState(settings.isSimulation);
  const [unitIps, setUnitIps] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    units.forEach((u) => {
      map[u.id] = u.esp32Ip;
    });
    return map;
  });

  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const currentUnit = units.find((u) => u.id === selectedUnitId) || units[0];

  const handleSave = () => {
    const updatedUnits = units.map((u) => ({
      ...u,
      esp32Ip: (unitIps[u.id] || u.esp32Ip).trim(),
    }));

    onSaveSettings(
      {
        isSimulation: isSim,
        pollInterval: Number(pollInterval),
      },
      updatedUnits
    );
    onClose();
  };

  const handleTestConnection = async (targetIp: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const sanitized = targetIp.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const res = await fetch(`/api/esp32?ip=${sanitized}`);
      const json = await res.json();
      if (res.ok && json.system) {
        setTestResult({
          success: true,
          msg: `Connected to ${json.system}! (${json.validSensors}/6 Sensors, Temp: ${json.averageTemperature}°C)`,
        });
      } else {
        setTestResult({
          success: false,
          msg: json.error || 'Connection failed. Verify ESP32 is powered on the local WiFi.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setTestResult({
        success: false,
        msg: `Failed to connect: ${msg}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl border border-emerald-900/15 p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-emerald-950">YucaChain Network & Unit Settings</h3>
              <p className="text-xs text-slate-500 font-medium">
                Configure telemetry source and ESP32 IP endpoints for your fleet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="space-y-3">
          <label className="text-xs font-black text-emerald-950 uppercase tracking-wider">
            Operational Telemetry Source
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsSim(true)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSim
                  ? 'bg-emerald-50/80 border-2 border-emerald-600 text-emerald-950 shadow-xs ring-2 ring-emerald-500/10'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className="font-extrabold text-sm text-emerald-950 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Virtual Simulator
              </div>
              <p className="text-[11px] text-slate-500 leading-snug font-medium">
                Simulate chamber physics and test safety & hysteresis rules without physical hardware.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsSim(false)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                !isSim
                  ? 'bg-emerald-50/80 border-2 border-emerald-600 text-emerald-950 shadow-xs ring-2 ring-emerald-500/10'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className="font-extrabold text-sm text-emerald-950 mb-1 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-emerald-700" />
                Live ESP32 (WiFi)
              </div>
              <p className="text-[11px] text-slate-500 leading-snug font-medium">
                Connect directly to your ESP32 microcontrollers over local Wi-Fi.
              </p>
            </button>
          </div>
        </div>

        {/* ESP32 IP Configuration for All 3 Units */}
        {!isSim && (
          <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                Fleet Unit WiFi IP Addresses
              </label>
              <span className="text-[11px] font-mono text-emerald-800 font-semibold">Port 80 (/api/status)</span>
            </div>

            <div className="space-y-3">
              {units.map((unit) => {
                const isSelected = unit.id === selectedUnitId;
                const ipVal = unitIps[unit.id] ?? unit.esp32Ip;

                return (
                  <div
                    key={unit.id}
                    className={`p-3.5 rounded-xl border transition-all bg-white ${
                      isSelected
                        ? 'border-emerald-500 shadow-xs ring-2 ring-emerald-500/10'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {unit.type === 'transport' ? (
                          <Truck className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Warehouse className="w-4 h-4 text-emerald-700" />
                        )}
                        <span className="text-xs font-extrabold text-emerald-950">{unit.name}</span>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">({unit.code})</span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                          Active Unit
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ipVal}
                        onChange={(e) =>
                          setUnitIps((prev) => ({ ...prev, [unit.id]: e.target.value }))
                        }
                        placeholder="e.g. 192.168.1.150"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestConnection(ipVal)}
                        disabled={isTesting || !ipVal}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-emerald-900 border border-slate-200 hover:border-emerald-300 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all"
                      >
                        <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                        Ping
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{testResult.msg}</span>
              </div>
            )}
          </div>
        )}

        {/* Simulation Fast Presets */}
        {isSim && onTriggerPreset && (
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider">
              Quick Physics Presets for {currentUnit.name}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onTriggerPreset('optimal')}
                className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-bold text-center transition-all shadow-2xs"
              >
                Optimal (25°C, 87%)
              </button>
              <button
                type="button"
                onClick={() => onTriggerPreset('hot')}
                className="px-3 py-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-xs text-amber-900 font-bold text-center transition-all shadow-2xs"
              >
                Heat Spike (&ge;27°C Fan)
              </button>
              <button
                type="button"
                onClick={() => onTriggerPreset('dry')}
                className="px-3 py-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-xs text-amber-900 font-bold text-center transition-all shadow-2xs"
              >
                Dry Air (&lt;85% Pump)
              </button>
              <button
                type="button"
                onClick={() => onTriggerPreset('humid')}
                className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-bold text-center transition-all shadow-2xs"
              >
                Saturated (&ge;90% Fan)
              </button>
              <button
                type="button"
                onClick={() => onTriggerPreset('cold')}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs text-slate-800 font-bold text-center transition-all shadow-2xs"
              >
                Cold (&le;20°C Halt)
              </button>
              <button
                type="button"
                onClick={() => onTriggerPreset('safety')}
                className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-xs text-rose-800 font-bold text-center transition-all shadow-2xs"
              >
                Safety Mode (&lt;4 Sens)
              </button>
            </div>
          </div>
        )}

        {/* Polling Interval */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-emerald-950">Telemetry Polling Interval</span>
            <span className="font-mono text-emerald-700 font-black">{pollInterval / 1000}s</span>
          </div>
          <input
            type="range"
            min="1000"
            max="10000"
            step="1000"
            value={pollInterval}
            onChange={(e) => setPollInterval(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>1s (Fast)</span>
            <span>3s (Firmware Default)</span>
            <span>10s (Eco)</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 shadow-md shadow-emerald-700/20 transition-all"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

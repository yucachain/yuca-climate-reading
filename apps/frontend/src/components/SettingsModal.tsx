'use client';

import React, { useState } from 'react';
import { X, Wifi, Sliders, CheckCircle2, AlertCircle, RefreshCw, Truck, Warehouse, Server } from 'lucide-react';
import { ChamberSettings, ColdChainUnit } from '@/lib/types';
import { api } from '@/lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChamberSettings;
  units: ColdChainUnit[];
  selectedUnitId: string;
  onSaveSettings: (newSettings: ChamberSettings, updatedUnits: ColdChainUnit[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  units,
  selectedUnitId,
  onSaveSettings,
}) => {
  const [pollInterval, setPollInterval] = useState(settings.pollInterval);
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

  const handleSave = () => {
    const updatedUnits = units.map((u) => ({
      ...u,
      esp32Ip: (unitIps[u.id] || u.esp32Ip).trim(),
    }));

    onSaveSettings(
      {
        pollInterval: Number(pollInterval),
        pollingEnabled: true,
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
      const res = await api.pingEsp32(sanitized);
      if (res.success && res.data) {
        setTestResult({
          success: true,
          msg: `Connected to ${res.data.system || 'ESP32'} (${res.latencyMs}ms)! Valid sensors: ${res.data.validSensors}/6, Temp: ${res.data.averageTemperature}°C`,
        });
      } else {
        setTestResult({
          success: false,
          msg: res.error || 'Connection failed. Verify ESP32 is powered on and connected to the local WiFi.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setTestResult({
        success: false,
        msg: `Failed to ping ESP32 via backend: ${msg}`,
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
              <h3 className="text-base font-extrabold text-emerald-950">YucaChain Network &amp; Fleet Settings</h3>
              <p className="text-xs text-slate-500 font-medium">
                Configure ESP32 endpoints and telemetry polling for your cold chain
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

        {/* Backend & Gateway Status */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
              <Server className="w-4 h-4 text-emerald-700" />
              <span>Express API &amp; PostgreSQL IoT Gateway</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-900 font-bold">
              Port 5000 Active
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            The Express backend polls the 3 ESP32 nodes periodically and stores sensor telemetry into PostgreSQL. ESP32 devices can also push telemetry directly to{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-[11px] text-emerald-900">
              /api/telemetry/ingest
            </code>.
          </p>
        </div>

        {/* ESP32 IP Configuration for All Units */}
        <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-emerald-950 uppercase tracking-wider">
              Fleet Unit WiFi IP Endpoints
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

        {/* Polling Interval */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-emerald-950">Gateway Polling Interval</span>
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
            <span>1s (High Frequency)</span>
            <span>3s (Firmware Recommended)</span>
            <span>10s (Eco Mode)</span>
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
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

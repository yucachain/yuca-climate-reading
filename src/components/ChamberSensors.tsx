'use client';

import React from 'react';
import { Layers, Thermometer, Droplets, Power } from 'lucide-react';
import { ChamberStatus, SensorData } from '@/lib/types';

interface ChamberSensorsProps {
  status: ChamberStatus | null;
  isSimulation: boolean;
  onToggleSensor?: (sensorId: string, enabled: boolean) => void;
}

export const ChamberSensors: React.FC<ChamberSensorsProps> = ({
  status,
  isSimulation,
  onToggleSensor,
}) => {
  if (!status) return null;

  // Separate sensors into Left Side (A1, A2, A3) and Right Side (B1, B2, B3)
  const leftSensors = status.sensors.filter(
    (s) =>
      s.location === 'LEFT' ||
      s.id.toUpperCase().startsWith('A') ||
      s.id === '1' ||
      s.id === '2' ||
      s.id === '3'
  );

  const rightSensors = status.sensors.filter(
    (s) =>
      s.location === 'RIGHT' ||
      s.id.toUpperCase().startsWith('B') ||
      s.id === '4' ||
      s.id === '5' ||
      s.id === '6'
  );

  const finalLeftSensors =
    leftSensors.length > 0 ? leftSensors : status.sensors.slice(0, 3);
  const finalRightSensors =
    rightSensors.length > 0 ? rightSensors : status.sensors.slice(3, 6);

  const getDiagonalPositionInfo = (
    sensor: SensorData,
    index: number,
    side: 'Left' | 'Right'
  ) => {
    const pos =
      sensor.position ||
      (index === 0 ? 'TOP' : index === 1 ? 'MIDDLE' : 'BOTTOM');

    if (pos === 'TOP') {
      return {
        side,
        position: 'Top Diagonal',
        level: 'Ceiling Level',
      };
    }
    if (pos === 'MIDDLE') {
      return {
        side,
        position: 'Mid Diagonal',
        level: 'Core Level',
      };
    }
    return {
      side,
      position: 'Bottom Diagonal',
      level: 'Floor Level',
    };
  };

  const renderSensorCard = (
    sensor: SensorData,
    index: number,
    side: 'Left' | 'Right'
  ) => {
    const isOnline = sensor.valid;
    const diagInfo = getDiagonalPositionInfo(sensor, index, side);

    const tempDev =
      isOnline && status.validSensors > 0
        ? (sensor.temperature - status.averageTemperature).toFixed(1)
        : null;
    const humDev =
      isOnline && status.validSensors > 0
        ? (sensor.humidity - status.averageHumidity).toFixed(1)
        : null;

    return (
      <div
        key={sensor.id}
        className={`rounded-2xl p-5 border transition-all duration-200 bg-white flex flex-col justify-between ${
          isOnline
            ? 'border-slate-200/80 hover:border-emerald-500/50 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-md'
            : 'border-rose-200 bg-rose-50/30'
        }`}
      >
        <div>
          {/* Top Row: Sensor Title & Status Badge */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-8 h-8 shrink-0 rounded-lg font-mono font-bold text-xs flex items-center justify-center border shadow-2xs ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                }`}
              >
                {sensor.id}
              </span>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-slate-900 tracking-tight leading-none truncate">
                  Sensor {sensor.id}
                </h4>
                <span className="text-[11px] font-medium text-slate-400 mt-1 block">
                  GPIO {sensor.pin}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                {isOnline ? 'Working' : 'Offline'}
              </span>

              {/* In Simulator: Toggle Switch to test disconnection failsafe */}
              {isSimulation && onToggleSensor && (
                <button
                  onClick={() => onToggleSensor(sensor.id, !sensor.valid)}
                  className={`w-7 h-7 rounded-lg border text-xs transition-all flex items-center justify-center ${
                    isOnline
                      ? 'bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-700 border-slate-200 hover:border-rose-300'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
                  }`}
                  title={
                    isOnline
                      ? `Click to simulate disconnecting Sensor ${sensor.id}`
                      : `Click to reconnect Sensor ${sensor.id}`
                  }
                  aria-label={`Toggle Sensor ${sensor.id}`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Location & Placement Metadata Bar */}
          <div className="my-3.5 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100/90 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
              <span className="truncate">
                {diagInfo.side} Wall &bull; {diagInfo.position}
              </span>
            </span>
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-600 font-mono">
              {diagInfo.level}
            </span>
          </div>
        </div>

        {/* Temperature and Humidity Metrics */}
        {isOnline ? (
          <div className="grid grid-cols-2 gap-3 pt-0.5">
            {/* Temperature Tile */}
            <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100/90 hover:bg-amber-50/70 transition-colors">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                  Temp
                </span>
                {tempDev !== null && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      Number(tempDev) > 0
                        ? 'bg-amber-100/90 text-amber-900'
                        : Number(tempDev) < 0
                        ? 'bg-emerald-100/90 text-emerald-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {Number(tempDev) > 0 ? `+${tempDev}` : tempDev}°
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {sensor.temperature.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-slate-500">°C</span>
              </div>
            </div>

            {/* Humidity Tile */}
            <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/90 hover:bg-emerald-50/70 transition-colors">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <Droplets className="w-3.5 h-3.5 text-emerald-600" />
                  Humidity
                </span>
                {humDev !== null && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      Number(humDev) > 0
                        ? 'bg-emerald-100/90 text-emerald-900'
                        : Number(humDev) < 0
                        ? 'bg-amber-100/90 text-amber-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {Number(humDev) > 0 ? `+${humDev}` : humDev}%
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {sensor.humidity.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 px-4 text-center bg-rose-50/40 rounded-2xl border border-rose-100">
            <span className="text-xs font-bold text-rose-800 block">
              Sensor Disconnected &bull; Offline
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block font-medium">
              Excluded from chamber averages
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-emerald-950 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700" />
            {status.unitName} &bull; Left &amp; Right Vault Wall Sensors
          </h2>
          <p className="text-sm text-slate-600 font-medium mt-0.5">
            6 DHT22 sensors mounted on two opposite walls in a 3-point diagonal slant (Top, Middle, Bottom)
          </p>
        </div>

        {isSimulation && (
          <span className="text-xs sm:text-sm text-emerald-900 bg-emerald-50 border border-emerald-300 px-3.5 py-1.5 rounded-full font-bold self-start sm:self-auto shadow-2xs">
            Tip: Click the power icon on any sensor to test what happens if it fails
          </span>
        )}
      </div>

      {/* LEFT SIDE SENSORS SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-900/15 border-l-6 border-l-emerald-600 shadow-xs">
        <div className="flex items-center justify-between mb-4.5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600" />
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-emerald-950">
              Left Side of Vault &bull; Sensors A1, A2, A3
            </h3>
          </div>
          <span className="text-xs sm:text-sm text-slate-600 font-medium">
            Port wall &bull; Arranged diagonally: Top, Middle, Bottom
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {finalLeftSensors.map((s, idx) => renderSensorCard(s, idx, 'Left'))}
        </div>
      </div>

      {/* RIGHT SIDE SENSORS SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-amber-500/25 border-l-6 border-l-amber-500 shadow-xs">
        <div className="flex items-center justify-between mb-4.5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-emerald-950">
              Right Side of Vault &bull; Sensors B1, B2, B3
            </h3>
          </div>
          <span className="text-xs sm:text-sm text-slate-600 font-medium">
            Starboard wall &bull; Arranged diagonally: Top, Middle, Bottom
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {finalRightSensors.map((s, idx) => renderSensorCard(s, idx, 'Right'))}
        </div>
      </div>
    </div>
  );
};

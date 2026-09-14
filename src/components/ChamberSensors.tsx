'use client';

import React from 'react';
import { Layers, Thermometer, Droplets, CheckCircle, XCircle, Power } from 'lucide-react';
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

  const topSensors = status.sensors.filter((s) => s.location === 'TOP');
  const bottomSensors = status.sensors.filter((s) => s.location === 'BOTTOM');

  const renderSensorCard = (sensor: SensorData) => {
    const isOnline = sensor.valid;
    const tempDev = isOnline && status.validSensors > 0
      ? (sensor.temperature - status.averageTemperature).toFixed(1)
      : null;
    const humDev = isOnline && status.validSensors > 0
      ? (sensor.humidity - status.averageHumidity).toFixed(1)
      : null;

    return (
      <div
        key={sensor.id}
        className={`rounded-2xl p-5 border transition-all duration-200 relative overflow-hidden bg-white ${
          isOnline
            ? 'border-emerald-900/15 hover:border-emerald-600/50 shadow-xs hover:shadow-md'
            : 'border-rose-200 bg-rose-50/40'
        }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {sensor.id}
            </div>
            <div>
              <span className="text-sm font-black text-emerald-950 block">
                Sensor {sensor.id}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Pin GPIO {sensor.pin}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {isOnline ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Working
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Disconnected
                </>
              )}
            </span>

            {/* In Simulator: Toggle Switch to test disconnection failsafe */}
            {isSimulation && onToggleSensor && (
              <button
                onClick={() => onToggleSensor(sensor.id, !sensor.valid)}
                className={`p-2 rounded-xl border text-xs transition-all ${
                  isOnline
                    ? 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 border-slate-200 hover:border-rose-300'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
                }`}
                title={isOnline ? `Click to simulate disconnecting Sensor ${sensor.id}` : `Click to reconnect Sensor ${sensor.id}`}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Temperature and Humidity Data Values */}
        {isOnline ? (
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            {/* Temp Tile */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <div className="flex items-center justify-between text-slate-600 text-xs">
                <span className="flex items-center gap-1 font-bold text-emerald-950">
                  <Thermometer className="w-4 h-4 text-emerald-700" />
                  Temp
                </span>
                {tempDev !== null && (
                  <span className={`font-mono text-xs font-bold ${Number(tempDev) > 0 ? 'text-amber-800' : Number(tempDev) < 0 ? 'text-emerald-800' : 'text-slate-500'}`}>
                    {Number(tempDev) > 0 ? `+${tempDev}` : tempDev}°
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
                  {sensor.temperature.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-emerald-700">°C</span>
              </div>
            </div>

            {/* Humidity Tile */}
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
              <div className="flex items-center justify-between text-slate-600 text-xs">
                <span className="flex items-center gap-1 font-bold text-amber-950">
                  <Droplets className="w-4 h-4 text-amber-700" />
                  Humidity
                </span>
                {humDev !== null && (
                  <span className={`font-mono text-xs font-bold ${Number(humDev) > 0 ? 'text-emerald-800' : Number(humDev) < 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                    {Number(humDev) > 0 ? `+${humDev}` : humDev}%
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
                  {sensor.humidity.toFixed(1)}
                </span>
                <span className="text-sm font-bold text-amber-700">%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-5 text-center bg-rose-50/50 rounded-2xl border border-rose-100">
            <span className="text-sm text-rose-800 font-extrabold block">
              No signal from sensor
            </span>
            <span className="text-xs text-slate-600 mt-0.5 block font-medium">
              Not counted in the average
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-emerald-950 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700" />
            {status.unitName} &bull; Top &amp; Bottom Sensors
          </h2>
          <p className="text-sm text-slate-600 font-medium mt-0.5">
            6 DHT22 sensors checking climate at the top and bottom of the cassava stacks
          </p>
        </div>

        {isSimulation && (
          <span className="text-xs sm:text-sm text-emerald-900 bg-emerald-50 border border-emerald-300 px-3.5 py-1.5 rounded-full font-bold self-start sm:self-auto shadow-2xs">
            Tip: Click the power icon on any sensor to test what happens if it fails
          </span>
        )}
      </div>

      {/* TOP SENSORS SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-900/15 border-l-6 border-l-emerald-600 shadow-xs">
        <div className="flex items-center justify-between mb-4.5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600" />
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-emerald-950">
              Top Level &bull; Sensors A1, A2, A3
            </h3>
          </div>
          <span className="text-xs sm:text-sm text-slate-600 font-medium">
            Near the ceiling &amp; fan outlet
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {topSensors.map(renderSensorCard)}
        </div>
      </div>

      {/* BOTTOM SENSORS SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-amber-500/25 border-l-6 border-l-amber-500 shadow-xs">
        <div className="flex items-center justify-between mb-4.5">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-emerald-950">
              Bottom Level &bull; Sensors B1, B2, B3
            </h3>
          </div>
          <span className="text-xs sm:text-sm text-slate-600 font-medium">
            Near pallet base &amp; mist sprayer
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {bottomSensors.map(renderSensorCard)}
        </div>
      </div>
    </div>
  );
};

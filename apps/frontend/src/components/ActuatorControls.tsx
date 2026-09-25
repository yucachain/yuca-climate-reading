'use client';

import React from 'react';
import { Fan, Droplets, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ChamberStatus } from '@/lib/types';

interface ActuatorControlsProps {
  status: ChamberStatus | null;
}

export const ActuatorControls: React.FC<ActuatorControlsProps> = ({ status }) => {
  if (!status) return null;

  const { fanState, pumpState, fanReason, pumpReason, safetyMode, unitName } = status;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-emerald-950 flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-700" />
            {unitName} &bull; Fan &amp; Mist Pump Controls
          </h2>
          <p className="text-sm text-slate-600 font-medium mt-0.5">
            Automatically controlled by the ESP32 to maintain the ideal climate for fresh cassava
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* VENTILATION FAN CARD */}
        <div
          className={`rounded-3xl p-6 lg:p-7 transition-all duration-200 border bg-white shadow-sm ${
            fanState
              ? 'border-2 border-emerald-600 ring-4 ring-emerald-500/10 shadow-md'
              : 'border border-emerald-900/15'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                  fanState
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <Fan className={`w-8 h-8 ${fanState ? 'animate-fan-fast text-emerald-600' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg sm:text-xl font-black text-emerald-950">Airflow Fan</h3>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    GPIO 18
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-slate-600 font-medium block mt-0.5">
                  Circulates air and vents out heat or excess moisture
                </span>
              </div>
            </div>

            {/* State Pill */}
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide border uppercase ${
                  fanState
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    fanState ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                {fanState ? 'RUNNING' : 'STANDBY'}
              </span>
            </div>
          </div>

          {/* Current Decision Rationale */}
          <div className="mt-6 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <div className="flex items-start gap-3">
              {safetyMode ? (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : fanState ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 mt-1.5 ml-1" />
              )}
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                  Why the fan is {fanState ? 'ON' : 'OFF'}:
                </span>
                <p className="text-sm sm:text-base font-bold text-emerald-950 mt-1">{fanReason}</p>
              </div>
            </div>
          </div>

          {/* Rules in Plain English */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-xs sm:text-sm text-slate-600 space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span className="text-emerald-900 font-bold">Turns ON when:</span>
              <span className="font-bold text-emerald-950">Temp &ge; 27°C OR Humidity &ge; 90%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Turns OFF when:</span>
              <span className="font-semibold text-slate-800">Temp &le; 24°C AND Humidity &le; 85%</span>
            </div>
            <div className="flex justify-between text-slate-500 text-xs">
              <span>Between 24–27°C and 85–90%:</span>
              <span>Keeps previous state to avoid rapid clicking</span>
            </div>
          </div>
        </div>

        {/* WATER MIST PUMP CARD */}
        <div
          className={`rounded-3xl p-6 lg:p-7 transition-all duration-200 border bg-white shadow-sm ${
            pumpState
              ? 'border-2 border-amber-500 ring-4 ring-amber-500/10 shadow-md'
              : 'border border-emerald-900/15'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
                  pumpState
                    ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs animate-water-pulse'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <Droplets className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg sm:text-xl font-black text-emerald-950">Water Mist Pump</h3>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    GPIO 4
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-slate-600 font-medium block mt-0.5">
                  Sprays fine water mist to keep roots humid and cool
                </span>
              </div>
            </div>

            {/* State Pill */}
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black tracking-wide border uppercase ${
                  pumpState
                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    pumpState ? 'bg-amber-600 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                {pumpState ? 'PUMPING' : 'IDLE'}
              </span>
            </div>
          </div>

          {/* Current Decision Rationale */}
          <div className="mt-6 p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
            <div className="flex items-start gap-3">
              {safetyMode ? (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : pumpState ? (
                <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 mt-1.5 ml-1" />
              )}
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                  Why the pump is {pumpState ? 'ON' : 'OFF'}:
                </span>
                <p className="text-sm sm:text-base font-bold text-emerald-950 mt-1">{pumpReason}</p>
              </div>
            </div>
          </div>

          {/* Rules in Plain English */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-xs sm:text-sm text-slate-600 space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span className="text-amber-900 font-bold">Too Hot (&ge; 30°C):</span>
              <span className="font-bold text-emerald-950">Pump runs for cooling</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Too Cold (&le; 20°C):</span>
              <span className="font-semibold text-slate-800">Pump stops to prevent chilling</span>
            </div>
            <div className="flex justify-between text-slate-500 text-xs">
              <span>Between 20°C and 30°C:</span>
              <span>Turns ON if Humidity &lt; 85%, OFF if &ge; 90%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

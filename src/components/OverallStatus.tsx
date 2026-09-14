'use client';

import React from 'react';
import { Thermometer, Droplets, Sparkles, Wind, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ChamberStatus } from '@/lib/types';

interface OverallStatusProps {
  status: ChamberStatus | null;
}

export const OverallStatus: React.FC<OverallStatusProps> = ({ status }) => {
  if (!status) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-3xl p-6 h-48 animate-pulse border border-emerald-100 shadow-xs" />
        ))}
      </div>
    );
  }

  const {
    unitName,
    averageTemperature,
    averageHumidity,
    validSensors,
    totalSensors,
    safetyMode,
    fanState,
    pumpState,
  } = status;

  // Simple, practical human explanations based on YucaChain goals
  let storageCondition = {
    title: 'Ideal Storage Conditions',
    desc: 'Temperature and humidity are right in the safe target zone (20–30°C and 85–90%). Fresh cassava roots stay healthy, firm, and will not spoil or rot.',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    icon: Sparkles,
  };

  if (safetyMode) {
    storageCondition = {
      title: 'Safety Warning: Sensor Issue',
      desc: 'Fewer than 4 sensors are working. For safety, the water pump has stopped and the fan is kept running to prevent moisture damage.',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
      icon: AlertTriangle,
    };
  } else if (averageTemperature >= 30) {
    storageCondition = {
      title: 'Chamber Too Hot (Over 30°C)',
      desc: 'The temperature is higher than 30°C. Water misting and airflow fan are turned ON to cool the storage chamber down.',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: AlertTriangle,
    };
  } else if (averageTemperature <= 20) {
    storageCondition = {
      title: 'Chamber Too Cold (Under 20°C)',
      desc: 'The temperature is at or below 20°C. The water pump is turned OFF to protect the cassava roots from cold chilling damage.',
      badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
      icon: AlertTriangle,
    };
  } else if (pumpState) {
    storageCondition = {
      title: 'Adding Moisture (Below 85%)',
      desc: 'Humidity dropped below 85%. The mist pump is spraying to keep the air moist and stop the cassava from drying out.',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      icon: Droplets,
    };
  } else if (fanState) {
    storageCondition = {
      title: 'Airflow Fan Running',
      desc: 'The fan is ventilating air to keep temperature and humidity balanced throughout the chamber.',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      icon: Wind,
    };
  }

  // Percentage calculations for meters
  const tempPercent = Math.min(Math.max(((averageTemperature - 15) / 20) * 100, 0), 100);
  const humPercent = Math.min(Math.max(((averageHumidity - 60) / 40) * 100, 0), 100);

  const isTempOptimal = averageTemperature >= 20 && averageTemperature <= 30;
  const isHumOptimal = averageHumidity >= 85 && averageHumidity <= 90;

  return (
    <div className="mb-8 space-y-5">
      {/* Overview Status Banner */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-900/15 border-l-6 border-l-emerald-700 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`p-3.5 rounded-2xl border shrink-0 ${storageCondition.badgeClass}`}>
              <storageCondition.icon className="w-6 h-6 text-emerald-800" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs sm:text-sm uppercase tracking-wider text-emerald-950 font-black">
                  {unitName} Condition
                </span>
                <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold border ${storageCondition.badgeClass}`}>
                  {storageCondition.title}
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-700 mt-1.5 max-w-2xl font-medium leading-relaxed">
                {storageCondition.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 self-start sm:self-center shrink-0 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200">
            <div className="text-right">
              <span className="text-xs text-slate-500 block font-bold uppercase">Working Sensors</span>
              <span className="text-base sm:text-lg font-black text-emerald-950">
                {validSensors} of {totalSensors} <span className="text-xs font-semibold text-slate-500">(Min: 4)</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-emerald-600 flex items-center justify-center font-black text-sm text-emerald-800 shadow-xs">
              {Math.round((validSensors / totalSensors) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Main Environmental Cards (Temperature, Humidity, Working Sensors) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Average Temperature Card */}
        <div className="bg-white rounded-3xl p-6 lg:p-7 border border-emerald-900/15 shadow-sm transition-all hover:border-emerald-600/50 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Thermometer className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-emerald-950">Average Temperature</h3>
                <span className="text-xs sm:text-sm text-slate-600 font-semibold">Safe Target: 20°C – 30°C</span>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                safetyMode
                  ? 'bg-slate-100 text-slate-600 border-slate-300'
                  : isTempOptimal
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {safetyMode ? 'Sensor Error' : isTempOptimal ? 'Good' : 'Needs Action'}
            </span>
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-emerald-950 font-mono">
              {safetyMode ? '--.-' : averageTemperature.toFixed(1)}
            </span>
            <span className="text-2xl font-black text-emerald-700">°C</span>
            <span className="text-xs sm:text-sm text-slate-500 ml-auto font-medium">
              Fan starts at 27°C / stops at 24°C
            </span>
          </div>

          {/* Visual Range Indicator Bar */}
          <div className="mt-6 space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
              <div className="absolute left-[25%] right-[25%] top-0 bottom-0 bg-emerald-200 border-x-2 border-emerald-600" />
              {!safetyMode && (
                <div
                  className="absolute top-0 bottom-0 w-3.5 bg-emerald-700 rounded-full shadow-md ring-2 ring-white -ml-1.5 transition-all duration-500"
                  style={{ left: `${tempPercent}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-slate-600 font-semibold">
              <span>15°C</span>
              <span className="text-emerald-800 font-bold">20°C (Min)</span>
              <span className="text-emerald-800 font-bold">30°C (Max)</span>
              <span>35°C</span>
            </div>
          </div>
        </div>

        {/* Average Humidity Card */}
        <div className="bg-white rounded-3xl p-6 lg:p-7 border border-amber-500/25 shadow-sm transition-all hover:border-amber-500/50 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200">
                <Droplets className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-emerald-950">Average Humidity</h3>
                <span className="text-xs sm:text-sm text-slate-600 font-semibold">Safe Target: 85% – 90%</span>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                safetyMode
                  ? 'bg-slate-100 text-slate-600 border-slate-300'
                  : isHumOptimal
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {safetyMode ? 'Sensor Error' : isHumOptimal ? 'Good' : averageHumidity < 85 ? 'Too Dry' : 'Too High'}
            </span>
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-emerald-950 font-mono">
              {safetyMode ? '--.-' : averageHumidity.toFixed(1)}
            </span>
            <span className="text-2xl font-black text-amber-600">%</span>
            <span className="text-xs sm:text-sm text-slate-500 ml-auto font-medium">
              Pump starts &lt; 85% / stops &ge; 90%
            </span>
          </div>

          {/* Visual Range Indicator Bar */}
          <div className="mt-6 space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
              <div className="absolute left-[62.5%] right-[25%] top-0 bottom-0 bg-amber-200 border-x-2 border-amber-600" />
              {!safetyMode && (
                <div
                  className="absolute top-0 bottom-0 w-3.5 bg-amber-600 rounded-full shadow-md ring-2 ring-white -ml-1.5 transition-all duration-500"
                  style={{ left: `${humPercent}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-slate-600 font-semibold">
              <span>60%</span>
              <span>75%</span>
              <span className="text-amber-800 font-bold">85% (Target)</span>
              <span className="text-amber-800 font-bold">90%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Working Sensors Card */}
        <div className="bg-white rounded-3xl p-6 lg:p-7 border border-emerald-900/15 shadow-sm transition-all hover:border-emerald-600/50 hover:shadow-md md:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-emerald-950">Sensor Health</h3>
                <span className="text-xs sm:text-sm text-slate-600 font-semibold">6 Sensors (3 Top, 3 Bottom)</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              {validSensors >= 4 ? 'Good Quorum' : 'Warning'}
            </span>
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-emerald-950 font-mono">
              {validSensors}
            </span>
            <span className="text-2xl font-black text-emerald-700">/ {totalSensors}</span>
            <span className="text-xs sm:text-sm text-slate-600 ml-auto font-semibold">
              Needs at least <strong className="text-emerald-950 font-black">4 working</strong>
            </span>
          </div>

          <div className="mt-6 space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1.5 p-0.5 border border-slate-200">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isActive = idx < validSensors;
                return (
                  <div
                    key={idx}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      isActive ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-slate-600 font-semibold">
              <span>0</span>
              <span className="text-amber-800 font-bold">Minimum: 4</span>
              <span className="text-emerald-800 font-bold">All 6 Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

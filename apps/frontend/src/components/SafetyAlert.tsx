'use client';

import React from 'react';
import { AlertTriangle, Fan, Droplets, ArrowRight } from 'lucide-react';
import { ChamberStatus } from '@/lib/types';

interface SafetyAlertProps {
  status: ChamberStatus | null;
  onFixSimulation?: () => void;
}

export const SafetyAlert: React.FC<SafetyAlertProps> = ({ status, onFixSimulation }) => {
  if (!status || !status.safetyMode) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border-2 border-rose-300 bg-rose-50/70 p-5 shadow-sm transition-all animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-300 shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-rose-950">
                CRITICAL ALERT: {status.unitName} Safety Mode Active
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-200/80 text-rose-900 border border-rose-300 uppercase tracking-wide">
                Failsafe Enforced
              </span>
            </div>
            <p className="text-sm text-rose-900/90 mt-1 max-w-3xl leading-relaxed">
              Only <strong className="text-rose-950 font-bold">{status.validSensors} of {status.totalSensors}</strong> DHT22 sensors are reporting valid telemetry on this unit (minimum required: <strong className="text-rose-950 font-bold">{status.minValidSensors}</strong>).
              To prevent moisture decay or thermal injury in the cassava roots, standard automation is halted.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-rose-950">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-rose-200 font-semibold shadow-2xs">
                <Fan className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                Ventilation Fan: <span className="text-emerald-800 font-bold ml-1">FORCED ON</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-rose-200 font-semibold shadow-2xs">
                <Droplets className="w-3.5 h-3.5 text-slate-400" />
                Mist Pump: <span className="text-rose-700 font-bold ml-1">FORCED OFF</span>
              </div>
            </div>
          </div>
        </div>

        {onFixSimulation && (
          <button
            onClick={onFixSimulation}
            className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Restore Sensors in Simulator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

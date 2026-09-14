'use client';

import React, { useState } from 'react';
import { Truck, Warehouse, AlertTriangle, ShieldCheck, Plus, Filter } from 'lucide-react';
import { ColdChainUnit, ChamberStatus } from '@/lib/types';

interface UnitSelectorProps {
  units: ColdChainUnit[];
  selectedUnitId: string;
  onSelectUnit: (unitId: string) => void;
  unitsStatus: Record<string, ChamberStatus>;
  onAddNewUnit?: () => void;
}

export const UnitSelector: React.FC<UnitSelectorProps> = ({
  units,
  selectedUnitId,
  onSelectUnit,
  unitsStatus,
  onAddNewUnit,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'transport' | 'stationary'>('all');

  const filteredUnits = units.filter((u) => {
    if (filterType === 'all') return true;
    return u.type === filterType;
  });

  const transportCount = units.filter((u) => u.type === 'transport').length;
  const hubCount = units.filter((u) => u.type === 'stationary').length;

  return (
    <div className="mb-8">
      {/* Top Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-emerald-950 flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            Our Vaults &amp; Storage Hubs
          </h2>
          <p className="text-sm text-slate-600 font-medium mt-0.5">
            Choose a storage unit below to see its temperature, humidity, and fan/pump status
          </p>
        </div>

        {/* Filter Tabs & Add Unit Button */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Filter Pills */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-950'
              }`}
            >
              All ({units.length})
            </button>
            <button
              onClick={() => setFilterType('transport')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'transport'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-950'
              }`}
            >
              Transport Vaults ({transportCount})
            </button>
            <button
              onClick={() => setFilterType('stationary')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'stationary'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-950'
              }`}
            >
              Storage Hubs ({hubCount})
            </button>
          </div>

          {/* Add Storage Unit Button */}
          {onAddNewUnit && (
            <button
              onClick={onAddNewUnit}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Add a new YucaVault or YucaHub unit"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>Add Unit</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Scalable Grid of Storage Units */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
        {filteredUnits.map((unit) => {
          const isSelected = unit.id === selectedUnitId;
          const status = unitsStatus[unit.id];
          const isTransport = unit.type === 'transport';

          return (
            <button
              key={unit.id}
              onClick={() => onSelectUnit(unit.id)}
              className={`p-5 rounded-2xl text-left transition-all duration-200 relative overflow-hidden bg-white ${
                isSelected
                  ? 'border-2 border-emerald-600 shadow-md shadow-emerald-900/10 ring-4 ring-emerald-500/10'
                  : 'border border-emerald-900/15 hover:border-emerald-600/50 hover:shadow-md shadow-xs text-slate-700'
              }`}
            >
              {/* Selected Top Accent Line */}
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500" />
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-emerald-700 text-white font-bold border-emerald-800 shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isTransport ? (
                      <Truck className="w-6 h-6" />
                    ) : (
                      <Warehouse className="w-6 h-6" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-emerald-950 tracking-tight">
                        {unit.name}
                      </h3>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300">
                        {unit.code}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm text-slate-600 font-medium block mt-0.5">
                      {isTransport ? 'Truck / Mobile Transit' : 'Stationary Warehouse Cold Room'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border ${
                    isSelected
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isSelected ? 'ACTIVE' : 'READY'}
                </span>
              </div>

              {/* Status Preview Bar */}
              {status && (
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-slate-500 text-xs font-bold uppercase">Temp:</span>
                      <span className={`font-black text-base ${status.safetyMode ? 'text-rose-600' : 'text-emerald-950'}`}>
                        {status.safetyMode ? 'ERROR' : `${status.averageTemperature.toFixed(1)}°C`}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-slate-500 text-xs font-bold uppercase">Humidity:</span>
                      <span className={`font-black text-base ${status.safetyMode ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {status.safetyMode ? 'ERROR' : `${status.averageHumidity.toFixed(1)}%`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {status.safetyMode ? (
                      <span className="text-rose-700 flex items-center gap-1 font-extrabold">
                        <AlertTriangle className="w-4 h-4 text-rose-600" /> Sensor Issue
                      </span>
                    ) : (
                      <span className="text-emerald-800 flex items-center gap-1 font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        {status.fanState ? 'Fan Running' : status.pumpState ? 'Misting' : 'Normal'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

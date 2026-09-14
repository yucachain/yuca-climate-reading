'use client';

import React, { useState } from 'react';
import { X, Plus, Truck, Warehouse } from 'lucide-react';
import { ColdChainUnit } from '@/lib/types';

interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUnit: (newUnit: ColdChainUnit) => void;
  existingCount: number;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({
  isOpen,
  onClose,
  onAddUnit,
  existingCount,
}) => {
  const [name, setName] = useState(`YucaVault #${existingCount + 1}`);
  const [code, setCode] = useState(`TR-0${existingCount + 1}`);
  const [type, setType] = useState<'transport' | 'stationary'>('transport');
  const [ip, setIp] = useState(`192.168.1.${150 + existingCount}`);
  const [desc, setDesc] = useState('Mobile Transit Storage');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const newUnit: ColdChainUnit = {
      id: `unit-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type,
      locationDescription: desc.trim() || (type === 'transport' ? 'Mobile Transit Storage' : 'Stationary Hub'),
      esp32Ip: ip.trim() || '192.168.1.150',
    };

    onAddUnit(newUnit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/25 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-emerald-900/15 p-6 sm:p-7 shadow-2xl space-y-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-emerald-950">Add New Storage Unit</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Add a new YucaVault (Transit) or YucaHub (Stationary) to your dashboard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Unit Type Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-emerald-950">
              Unit Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('transport');
                  if (desc === 'Stationary Hub Cold Room') setDesc('Mobile Transit Storage');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  type === 'transport'
                    ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <Truck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <span className="font-extrabold text-sm block">Transport Vault</span>
                  <span className="text-xs text-slate-500">Truck / Container</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('stationary');
                  if (desc === 'Mobile Transit Storage') setDesc('Stationary Hub Cold Room');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  type === 'stationary'
                    ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <Warehouse className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <span className="font-extrabold text-sm block">Storage Hub</span>
                  <span className="text-xs text-slate-500">Warehouse Facility</span>
                </div>
              </button>
            </div>
          </div>

          {/* Unit Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-emerald-950">
              Unit Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. YucaVault #3 or Hub Ibadan"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Unit Code & IP */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-emerald-950">
                Unit Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. TR-03"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono uppercase focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-emerald-950">
                ESP32 IP Address
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="e.g. 192.168.1.155"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-emerald-950">
              Description / Location
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Transit Truck #3 or Central Warehouse Room A"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Dashboard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

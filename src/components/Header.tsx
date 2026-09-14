'use client';

import React from 'react';
import Image from 'next/image';
import { Wifi, WifiOff, Settings, Code2, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ChamberSettings, ChamberStatus, ColdChainUnit } from '@/lib/types';

interface HeaderProps {
  currentUnit: ColdChainUnit;
  status: ChamberStatus | null;
  settings: ChamberSettings;
  isConnected: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenCode: () => void;
  onToggleMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUnit,
  status,
  settings,
  isConnected,
  isLoading,
  onRefresh,
  onOpenSettings,
  onOpenCode,
  onToggleMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-900/10 shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center">
              <Image
                src="/Yucachain_Logo.png"
                alt="YucaChain Logo"
                width={300}
                height={129}
                priority
                className="h-12 sm:h-14 md:h-16 w-auto object-contain"
                style={{ width: 'auto' }}
              />
            </div>

            <div className="hidden sm:block border-l border-emerald-900/15 pl-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                  Climate Dashboard
                </span>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Live
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Fresh Cassava Storage &amp; Transit Control
              </p>
            </div>
          </div>

          {/* Mode Switch for Mobile */}
          <div className="md:hidden">
            <button
              onClick={onToggleMode}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${settings.isSimulation
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                }`}
            >
              {settings.isSimulation ? 'SIMULATOR' : 'LIVE ESP32'}
            </button>
          </div>
        </div>

        {/* Status Indicators & Action Controls */}
        <div className="flex items-center flex-wrap gap-3 w-full md:w-auto justify-end">
          {/* Active Unit Connection Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
            {settings.isSimulation ? (
              <span className="flex items-center gap-2 text-amber-900 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                Virtual Mode: <strong className="text-emerald-950 font-black">{currentUnit.code}</strong>
              </span>
            ) : isConnected ? (
              <span className="flex items-center gap-2 text-emerald-900 font-bold">
                <Wifi className="w-4 h-4 text-emerald-700" />
                <span>
                  {currentUnit.code}: <strong className="text-emerald-950 font-mono">{currentUnit.esp32Ip}</strong>
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-rose-700 font-bold">
                <WifiOff className="w-4 h-4" />
                {currentUnit.code} Offline
              </span>
            )}
          </div>

          {/* Safety mode status pill */}
          {status && (
            <div
              className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${status.safetyMode
                  ? 'bg-rose-50 text-rose-900 border-rose-300 animate-pulse'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}
            >
              {status.safetyMode ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Sensor Warning ({status.validSensors}/6 active)
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Sensors OK ({status.validSensors}/6)
                </>
              )}
            </div>
          )}

          {/* Mode Switch Button (Desktop) */}
          <button
            onClick={onToggleMode}
            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all hover:shadow-sm ${settings.isSimulation
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
              }`}
            title="Switch between Test Simulator and Live ESP32 connection"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${settings.isSimulation ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
            />
            {settings.isSimulation ? 'Simulator Active' : 'Live ESP32 Connected'}
          </button>

          {/* ESP32 Arduino Code Button */}
          <button
            onClick={onOpenCode}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-200 shadow-2xs transition-all hover:border-emerald-400"
            title="View ESP32 C++ Arduino code and pinout"
          >
            <Code2 className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">ESP32 Code</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl text-emerald-950 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 shadow-2xs transition-all"
            title="Configure Unit IP addresses and polling"
            aria-label="Settings"
          >
            <Settings className="w-4.5 h-4.5 text-emerald-800" />
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 rounded-xl text-emerald-950 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-400 shadow-2xs transition-all disabled:opacity-50"
            title="Refresh readings now"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4.5 h-4.5 text-emerald-800 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};

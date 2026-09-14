'use client';

import React from 'react';
import { Terminal, Trash2, Clock } from 'lucide-react';
import { ActivityLog } from '@/lib/types';

interface DiagnosticsLogProps {
  logs: ActivityLog[];
  onClearLogs: () => void;
}

export const DiagnosticsLog: React.FC<DiagnosticsLogProps> = ({ logs, onClearLogs }) => {
  return (
    <div className="bg-white rounded-3xl p-6 lg:p-7 mb-8 border border-emerald-900/15 shadow-sm">
      <div className="flex items-center justify-between mb-4.5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-emerald-950">
              Activity &amp; Alert Log
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Live history of fan and pump triggers, temperature changes, and sensor safety alerts
            </p>
          </div>
        </div>

        <button
          onClick={onClearLogs}
          className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-emerald-950 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all flex items-center gap-1.5 shadow-2xs"
          title="Clear the activity log"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Log</span>
        </button>
      </div>

      <div className="rounded-2xl bg-[#f8faf9] border border-emerald-900/10 p-4 h-52 overflow-y-auto font-mono text-xs sm:text-sm space-y-2.5">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 font-sans text-sm">
            No events recorded yet.
          </div>
        ) : (
          logs.map((log) => {
            let badgeStyle = 'text-slate-700';
            if (log.severity === 'danger') badgeStyle = 'text-rose-700 font-bold';
            else if (log.severity === 'warning') badgeStyle = 'text-amber-850 font-bold';
            else if (log.severity === 'success') badgeStyle = 'text-emerald-800 font-semibold';
            else if (log.severity === 'info') badgeStyle = 'text-emerald-950 font-medium';

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 py-1.5 px-2.5 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-slate-100"
              >
                <span className="text-xs text-slate-400 shrink-0 flex items-center gap-1 mt-0.5 font-sans">
                  <Clock className="w-3.5 h-3.5" />
                  {log.timestamp}
                </span>
                <span className="text-xs uppercase font-black px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 shrink-0 font-sans">
                  {log.unitId.toUpperCase()}
                </span>
                <span className={`break-words text-xs sm:text-sm leading-relaxed ${badgeStyle}`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

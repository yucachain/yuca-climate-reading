'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { LineChart as ChartIcon, Download, Eye, EyeOff, FileSpreadsheet } from 'lucide-react';
import { ChartPoint, ColdChainUnit } from '@/lib/types';

interface ClimateChartProps {
  data: ChartPoint[];
  unitName: string;
  allUnits: ColdChainUnit[];
  selectedUnitId: string;
  chartHistories: Record<string, ChartPoint[]>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-sm shadow-xl space-y-2 font-mono">
        <p className="text-emerald-950 font-bold border-b border-slate-100 pb-1.5 text-xs font-sans">
          Time: {label}
        </p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-6">
            <span style={{ color: entry.color }} className="font-bold text-xs">
              {entry.name}:
            </span>
            <span className="font-extrabold text-slate-900 text-sm">
              {entry.value !== undefined ? entry.value.toFixed(1) : '--'}
              {entry.name.includes('Temp') ? '°C' : '%'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ClimateChart: React.FC<ClimateChartProps> = ({
  data,
  unitName,
  allUnits,
  selectedUnitId,
  chartHistories,
}) => {
  const [showTargets, setShowTargets] = useState(true);
  const [downloadMode, setDownloadMode] = useState<'current' | 'all'>('current');

  // Export CSV Function
  const handleDownloadCsv = (mode: 'current' | 'all') => {
    let rows: Array<string[]> = [];
    // CSV Header
    rows.push([
      'Timestamp',
      'Time',
      'Unit Name',
      'Unit Code',
      'Unit Type',
      'Temperature (C)',
      'Humidity (%)',
      'Fan Status',
      'Pump Status',
    ]);

    if (mode === 'current') {
      const activeUnit = allUnits.find((u) => u.id === selectedUnitId);
      const points = data;
      points.forEach((pt) => {
        rows.push([
          new Date(pt.timestamp).toISOString(),
          pt.time,
          activeUnit?.name || unitName,
          activeUnit?.code || '',
          activeUnit?.type === 'transport' ? 'Transport Vault' : 'Stationary Hub',
          pt.avgTemp.toFixed(1),
          pt.avgHumidity.toFixed(1),
          pt.fanActive ? 'ON' : 'OFF',
          pt.pumpActive ? 'ON' : 'OFF',
        ]);
      });
    } else {
      // Export all units
      allUnits.forEach((u) => {
        const points = chartHistories[u.id] || [];
        points.forEach((pt) => {
          rows.push([
            new Date(pt.timestamp).toISOString(),
            pt.time,
            u.name,
            u.code,
            u.type === 'transport' ? 'Transport Vault' : 'Stationary Hub',
            pt.avgTemp.toFixed(1),
            pt.avgHumidity.toFixed(1),
            pt.fanActive ? 'ON' : 'OFF',
            pt.pumpActive ? 'ON' : 'OFF',
          ]);
        });
      });
    }

    if (rows.length <= 1) {
      alert('No readings recorded yet to download. Please wait a few seconds for data to gather.');
      return;
    }

    // Convert rows to CSV string
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName =
      mode === 'current'
        ? `${unitName.replace(/\s+/g, '_')}_Climate_Readings_${dateStr}.csv`
        : `YucaChain_All_Vaults_And_Hubs_Readings_${dateStr}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl p-6 lg:p-7 mb-8 border border-emerald-900/15 shadow-sm">
      {/* Chart Top Header & Download Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ChartIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg lg:text-xl font-extrabold text-emerald-950 tracking-tight">
              {unitName} &bull; Temperature &amp; Humidity History
            </h2>
            <p className="text-sm text-slate-600 font-medium mt-0.5">
              Updates every 3 seconds &bull; Shows if conditions stay in safe storage limits
            </p>
          </div>
        </div>

        {/* Action Controls & Download CSV Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Target Zone Visibility Toggle */}
          <button
            onClick={() => setShowTargets(!showTargets)}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-2 transition-all shadow-xs ${
              showTargets
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {showTargets ? <Eye className="w-4 h-4 text-emerald-700" /> : <EyeOff className="w-4 h-4" />}
            <span>{showTargets ? 'Safe Limits Shown' : 'Hide Safe Limits'}</span>
          </button>

          {/* Download CSV for Current Unit */}
          <button
            onClick={() => handleDownloadCsv('current')}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-2 transition-all hover:shadow-md active:scale-95"
            title={`Download readings for ${unitName} as CSV spreadsheet`}
          >
            <Download className="w-4 h-4" />
            <span>Download {unitName} CSV</span>
          </button>

          {/* Download CSV for All Units */}
          <button
            onClick={() => handleDownloadCsv('all')}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-xs flex items-center gap-1.5 transition-all"
            title="Download readings for all Vaults and Hubs combined"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-700" />
            <span>Download All Units</span>
          </button>
        </div>
      </div>

      {/* Chart Visualizer */}
      <div className="w-full h-80 sm:h-96">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
            Waiting for readings to come in...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f3" opacity={0.9} />

              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                tickLine={false}
              />

              {/* Left Y Axis: Temperature in Warm Gold */}
              <YAxis
                yAxisId="temp"
                domain={[16, 34]}
                stroke="#d97706"
                tick={{ fontSize: 12, fill: '#b45309', fontWeight: 600 }}
                tickLine={false}
                unit="°"
              />

              {/* Right Y Axis: Humidity in Emerald Green */}
              <YAxis
                yAxisId="humidity"
                orientation="right"
                domain={[70, 100]}
                stroke="#15803d"
                tick={{ fontSize: 12, fill: '#15803d', fontWeight: 600 }}
                tickLine={false}
                unit="%"
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontWeight: 600 }}
                iconType="circle"
              />

              {/* Safe Targets Guide */}
              {showTargets && (
                <>
                  {/* Safe Humidity Zone: 85% to 90% */}
                  <ReferenceArea
                    yAxisId="humidity"
                    y1={85}
                    y2={90}
                    fill="#15803d"
                    fillOpacity={0.08}
                    stroke="#15803d"
                    strokeOpacity={0.3}
                    strokeDasharray="2 2"
                  />
                  {/* Safe Temperature Boundaries: 20°C to 30°C */}
                  <ReferenceLine
                    yAxisId="temp"
                    y={20}
                    stroke="#15803d"
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                  <ReferenceLine
                    yAxisId="temp"
                    y={30}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                  {/* Fan trigger line at 27°C */}
                  <ReferenceLine
                    yAxisId="temp"
                    y={27}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    opacity={0.6}
                  />
                </>
              )}

              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="avgTemp"
                name="Average Temp (°C)"
                stroke="#d97706"
                strokeWidth={3}
                dot={{ r: 3.5, fill: '#ffffff', stroke: '#d97706', strokeWidth: 2 }}
                activeDot={{ r: 7, stroke: '#d97706', strokeWidth: 3 }}
                isAnimationActive={false}
              />
              <Line
                yAxisId="humidity"
                type="monotone"
                dataKey="avgHumidity"
                name="Average Humidity (RH %)"
                stroke="#15803d"
                strokeWidth={3}
                dot={{ r: 3.5, fill: '#ffffff', stroke: '#15803d', strokeWidth: 2 }}
                activeDot={{ r: 7, stroke: '#15803d', strokeWidth: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Guide note */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-600 font-medium">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-600 ring-2 ring-amber-100" />
            <strong className="text-slate-800">Temperature Target:</strong> 20°C to 30°C
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-700 ring-2 ring-emerald-100" />
            <strong className="text-slate-800">Humidity Target:</strong> 85% to 90%
          </span>
        </div>
        <span className="text-slate-500 font-semibold">
          Showing last {data.length} reading cycles
        </span>
      </div>
    </div>
  );
};

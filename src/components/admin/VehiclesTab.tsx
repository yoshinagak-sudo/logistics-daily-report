'use client';

import { useMemo } from 'react';
import { Icon } from '../Icon';
import type { DemoData } from '@/lib/demo-store';
import {
  getDateRange, getReportsInRange, computeVehicleStats, type Period,
} from '@/lib/admin-data';

interface Props {
  data: DemoData;
  period: Period;
}

export function VehiclesTab({ data, period }: Props) {
  const range = getDateRange(period);
  const reports = getReportsInRange(data, range.from, range.to);
  const vehicleStats = useMemo(() => computeVehicleStats(data, reports, range.days), [data, reports, range.days]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {vehicleStats.map(v => {
          const utilizationPct = Math.round(v.utilizationRate * 100);
          const driverNames = v.driverIds
            .map(id => data.profiles.find(p => p.id === id)?.full_name)
            .filter(Boolean)
            .join(' · ');
          return (
            <div key={v.vehicleId} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Icon.Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{v.numberPlate}</div>
                    <div className="text-xs text-slate-500">{v.vehicleType}</div>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  utilizationPct > 80 ? 'bg-emerald-100 text-emerald-700' :
                  utilizationPct > 50 ? 'bg-blue-100 text-blue-700' :
                  utilizationPct > 0 ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  稼働率 {utilizationPct}%
                </span>
              </div>

              {/* 稼働率バー */}
              <div className="mb-4">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      utilizationPct > 80 ? 'bg-emerald-500' :
                      utilizationPct > 50 ? 'bg-blue-500' :
                      utilizationPct > 0 ? 'bg-amber-500' :
                      'bg-slate-300'
                    }`}
                    style={{ width: `${utilizationPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{v.totalUses} / {range.days} 日</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg py-2">
                  <div className="text-[10px] text-slate-500 tracking-wider uppercase">運行回数</div>
                  <div className="text-lg font-semibold text-slate-900 tabular-nums">{v.totalUses}<span className="text-xs font-normal text-slate-400 ml-0.5">回</span></div>
                </div>
                <div className="bg-slate-50 rounded-lg py-2">
                  <div className="text-[10px] text-slate-500 tracking-wider uppercase">走行距離</div>
                  <div className="text-lg font-semibold text-slate-900 tabular-nums">{v.totalDistance.toLocaleString()}<span className="text-xs font-normal text-slate-400 ml-0.5">km</span></div>
                </div>
              </div>

              {driverNames && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-[10px] text-slate-500 tracking-wider uppercase mb-1">使用ドライバー</div>
                  <div className="text-xs text-slate-700">{driverNames}</div>
                </div>
              )}

              {v.lastUsedDate && (
                <div className="mt-2 text-[10px] text-slate-400">
                  最終使用: {v.lastUsedDate}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

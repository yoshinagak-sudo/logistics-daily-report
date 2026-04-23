'use client';

import { useMemo, useState } from 'react';
import { Icon } from '../Icon';
import { TrendLineChart } from './Charts';
import type { DemoData } from '@/lib/demo-store';
import {
  getDateRange, getReportsInRange, computeDriverStats, computeDailyTrend,
  type Period,
} from '@/lib/admin-data';

interface Props {
  data: DemoData;
  period: Period;
  onSelectReport?: (reportId: string) => void;
}

export function DriversTab({ data, period, onSelectReport }: Props) {
  const range = getDateRange(period);
  const reports = getReportsInRange(data, range.from, range.to);
  const driverStats = useMemo(() => computeDriverStats(data, reports), [data, reports]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const selectedDriver = selectedDriverId ? data.profiles.find(p => p.id === selectedDriverId) : null;
  const selectedDriverReports = selectedDriverId ? reports.filter(r => r.driver_id === selectedDriverId).sort((a, b) => b.report_date.localeCompare(a.report_date)) : [];

  // 選択ドライバーの日次トレンド
  const driverTrend = useMemo(() => {
    if (!selectedDriverId) return [];
    const trend = computeDailyTrend(data, range.from, range.to);
    return trend.map(t => {
      const dayReports = data.reports.filter(r => r.report_date === t.fullDate && r.driver_id === selectedDriverId);
      return {
        ...t,
        deliveries: dayReports.reduce((s, r) => s + (r.delivery_count || 0), 0),
        distance: dayReports.reduce((s, r) => s + (r.total_distance_km || 0), 0),
      };
    });
  }, [data, range.from, range.to, selectedDriverId]);

  return (
    <div className="space-y-5">
      {/* ドライバーカードグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {driverStats.map(s => {
          const isSelected = selectedDriverId === s.driverId;
          return (
            <button
              key={s.driverId}
              onClick={() => setSelectedDriverId(isSelected ? null : s.driverId)}
              className={`text-left bg-white rounded-xl border p-4 transition-all ${
                isSelected ? 'border-slate-900 shadow-md' : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={s.driverName} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{s.driverName}</div>
                  <div className="text-xs text-slate-500">{s.workDays} 日 出勤</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniStat label="配送" value={s.totalDeliveries} unit="件" />
                <MiniStat label="走行" value={s.totalDistance.toLocaleString()} unit="km" />
                <MiniStat label="拘束" value={s.avgDutyHours.toFixed(1)} unit="h" />
              </div>
              {(s.complianceIssues > 0 || s.alcoholIssues > 0 || s.totalAnomalies > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {s.complianceIssues > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded font-medium border border-red-200">
                      労務 {s.complianceIssues}
                    </span>
                  )}
                  {s.alcoholIssues > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded font-medium border border-red-200">
                      酒気 {s.alcoholIssues}
                    </span>
                  )}
                  {s.totalAnomalies > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-medium border border-amber-200">
                      異常 {s.totalAnomalies}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ドライバー詳細 */}
      {selectedDriver && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={selectedDriver.full_name} size="lg" />
              <div>
                <h3 className="font-semibold text-slate-900 tracking-tight">{selectedDriver.full_name} の運行履歴</h3>
                <p className="text-xs text-slate-500">{range.label} · {selectedDriverReports.length} 件</p>
              </div>
            </div>
            <button onClick={() => setSelectedDriverId(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100">
              <Icon.X className="w-4 h-4" />
            </button>
          </div>

          {/* 個人別チャート */}
          <div className="border-t border-slate-100 pt-4">
            <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">日次推移</div>
            <TrendLineChart
              data={driverTrend}
              lines={[
                { key: 'deliveries', label: '配送件数', color: '#2563eb' },
                { key: 'distance', label: '走行 (km)', color: '#059669' },
              ]}
              height={180}
            />
          </div>

          {/* 日報リスト */}
          <div className="border-t border-slate-100 pt-4">
            <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">日報一覧</div>
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {selectedDriverReports.map(r => (
                <li key={r.id}>
                  <button
                    onClick={() => onSelectReport?.(r.id)}
                    className="w-full text-left py-2.5 px-1 hover:bg-slate-50 rounded transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 tabular-nums w-16">{r.report_date.slice(5).replace('-', '/')}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                        r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {r.status === 'submitted' ? '提出' : r.status === 'approved' ? '承認' : '下書'}
                      </span>
                      {r.has_anomaly && <Icon.Alert className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    <div className="text-xs text-slate-600 tabular-nums">
                      配送 {r.delivery_count} · {r.total_distance_km ?? '—'} km
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="bg-slate-50 rounded-lg py-1.5">
      <div className="text-[9px] text-slate-500 tracking-wider uppercase">{label}</div>
      <div className="text-sm font-semibold text-slate-900 tabular-nums">
        {value}<span className="text-[10px] font-normal text-slate-400 ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const initial = name.slice(0, 1);
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-pink-500', 'bg-cyan-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizeCls = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs';
  return (
    <div className={`${sizeCls} rounded-full ${color} text-white font-medium flex items-center justify-center shrink-0`}>
      {initial}
    </div>
  );
}

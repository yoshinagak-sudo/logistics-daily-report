'use client';

import { useMemo } from 'react';
import { Icon } from '../Icon';
import { StatCard, AlertItem } from './StatCard';
import { TrendLineChart, AreaTrendChart, DonutChart } from './Charts';
import type { DemoData } from '@/lib/demo-store';
import {
  getDateRange, getReportsInRange, computeOverviewStats, computeDailyTrend,
  computeAlerts, computeDriverStats, type Period,
} from '@/lib/admin-data';

interface Props {
  data: DemoData;
  period: Period;
  onSelectAlert?: (reportId: string) => void;
}

export function OverviewTab({ data, period, onSelectAlert }: Props) {
  const range = getDateRange(period);
  const reports = getReportsInRange(data, range.from, range.to);
  const driverCount = data.profiles.filter(p => p.role === 'driver').length;
  const stats = computeOverviewStats(data, reports, driverCount);
  const trend = computeDailyTrend(data, range.from, range.to);
  const alerts = computeAlerts(data, reports);
  const driverStats = useMemo(() => computeDriverStats(data, reports), [data, reports]);

  // 異常カテゴリ別ドーナツ
  const reportIds = new Set(reports.map(r => r.id));
  const anomalyByCategory = data.anomalies
    .filter(a => reportIds.has(a.daily_report_id))
    .reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  const categoryColors: Record<string, string> = {
    vehicle: '#dc2626', delay: '#d97706', accident: '#b91c1c',
    damage: '#a16207', near_miss: '#7c3aed', other: '#475569',
  };
  const categoryNames: Record<string, string> = {
    vehicle: '車両異常', delay: '遅延', accident: '事故',
    damage: '荷物破損', near_miss: 'ヒヤリハット', other: 'その他',
  };
  const donutData = Object.entries(anomalyByCategory).map(([k, v]) => ({
    name: categoryNames[k] || k,
    value: v,
    color: categoryColors[k] || '#475569',
  }));

  // ランキング
  const topByDeliveries = [...driverStats].sort((a, b) => b.totalDeliveries - a.totalDeliveries).slice(0, 3);
  const topByDistance = [...driverStats].sort((a, b) => b.totalDistance - a.totalDistance).slice(0, 3);

  return (
    <div className="space-y-5">
      {/* KPIカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="提出率"
          value={`${stats.submissionRate}%`}
          sub={`${stats.submittedReports} / ${stats.totalReports}件`}
          highlight={stats.submissionRate < 100 ? 'warn' : 'ok'}
          IconComp={Icon.Check}
        />
        <StatCard
          label="配送件数"
          value={stats.totalDeliveries.toLocaleString()}
          unit="件"
          sub={`平均 ${stats.totalReports > 0 ? (stats.totalDeliveries / stats.totalReports).toFixed(1) : 0} 件/日`}
          IconComp={Icon.Truck}
        />
        <StatCard
          label="走行距離"
          value={stats.totalDistance.toLocaleString()}
          unit="km"
          sub={`平均 ${stats.totalReports > 0 ? Math.round(stats.totalDistance / stats.totalReports) : 0} km/日`}
          IconComp={Icon.Truck}
        />
        <StatCard
          label="要対応"
          value={stats.complianceIssues + stats.alcoholIssues + stats.highSeverityAnomalies}
          unit="件"
          sub={`労務${stats.complianceIssues} · 酒気${stats.alcoholIssues} · 重大異常${stats.highSeverityAnomalies}`}
          highlight={stats.complianceIssues + stats.alcoholIssues + stats.highSeverityAnomalies > 0 ? 'alert' : 'ok'}
          IconComp={Icon.Alert}
        />
      </div>

      {/* チャート: トレンド */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="配送件数の推移" sub={range.label} className="lg:col-span-2">
          <TrendLineChart
            data={trend}
            lines={[
              { key: 'deliveries', label: '配送件数', color: '#2563eb' },
              { key: 'anomalies', label: '異常件数', color: '#dc2626' },
            ]}
          />
        </ChartCard>

        <ChartCard title="異常カテゴリ別" sub={`${stats.totalAnomalies} 件`}>
          {donutData.length > 0 ? (
            <>
              <DonutChart data={donutData} />
              <div className="mt-2 space-y-1">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-600 flex-1">{d.name}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-xs text-slate-400 py-12">異常報告なし</p>
          )}
        </ChartCard>
      </div>

      {/* 走行距離トレンド */}
      <ChartCard title="走行距離の推移" sub={`総 ${stats.totalDistance.toLocaleString()} km`}>
        <AreaTrendChart data={trend} dataKey="distance" label="走行距離 (km)" />
      </ChartCard>

      {/* アラート + ランキング */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="アラート" sub={`${alerts.length} 件`} className="lg:col-span-2">
          {alerts.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">対応事項はありません</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {alerts.slice(0, 8).map((a, i) => (
                <AlertItem
                  key={i}
                  severity={a.severity}
                  title={a.title}
                  description={a.description}
                  date={a.date}
                  onClick={a.reportId && onSelectAlert ? () => onSelectAlert(a.reportId!) : undefined}
                />
              ))}
              {alerts.length > 8 && (
                <p className="text-center text-xs text-slate-400 pt-2">他 {alerts.length - 8} 件</p>
              )}
            </div>
          )}
        </ChartCard>

        <ChartCard title="ランキング" sub={range.label}>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase mb-1.5">配送件数 Top3</div>
              <ul className="space-y-1.5">
                {topByDeliveries.map((d, i) => (
                  <li key={d.driverId} className="flex items-center gap-2 text-sm">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-700'
                    }`}>{i + 1}</span>
                    <span className="flex-1 truncate">{d.driverName}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{d.totalDeliveries}<span className="text-xs text-slate-400 ml-0.5">件</span></span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase mb-1.5">走行距離 Top3</div>
              <ul className="space-y-1.5">
                {topByDistance.map((d, i) => (
                  <li key={d.driverId} className="flex items-center gap-2 text-sm">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-700'
                    }`}>{i + 1}</span>
                    <span className="flex-1 truncate">{d.driverName}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{d.totalDistance.toLocaleString()}<span className="text-xs text-slate-400 ml-0.5">km</span></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className || ''}`}>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-semibold text-slate-900 tracking-tight">{title}</h3>
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

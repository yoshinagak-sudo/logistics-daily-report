'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Sidebar, MobileTabBar, type AdminTab } from '@/components/admin/Sidebar';
import { OverviewTab } from '@/components/admin/OverviewTab';
import { DriversTab } from '@/components/admin/DriversTab';
import { VehiclesTab } from '@/components/admin/VehiclesTab';
import { AnomaliesTab } from '@/components/admin/AnomaliesTab';
import { AISummaryTab } from '@/components/admin/AISummaryTab';
import { loadDemo, checkCompliance, type DemoData } from '@/lib/demo-store';
import {
  getDateRange, getReportsInRange, computeAlerts, getAnomaliesWithContext,
  fmtHM, fmtDateLong, categoryJa, severityJa, type Period,
} from '@/lib/admin-data';
import type { DailyReport } from '@/lib/types';

export function AdminDashboard() {
  const [data, setData] = useState<DemoData | null>(null);
  const [period, setPeriod] = useState<Period>('all14');
  const [tab, setTab] = useState<AdminTab>('overview');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => { setData(loadDemo()); }, []);
  function reload() { setData(loadDemo()); }

  // バッジ計算
  const badges = useMemo(() => {
    if (!data) return {};
    const range = getDateRange(period);
    const reports = getReportsInRange(data, range.from, range.to);
    const alerts = computeAlerts(data, reports);
    const anomalies = getAnomaliesWithContext(data, reports);
    return {
      overview: alerts.filter(a => a.severity === 'high').length,
      anomalies: anomalies.filter(a => a.anomaly.severity === 'high' && !a.anomaly.resolved).length,
    };
  }, [data, period]);

  async function downloadCSV() {
    if (!data) return;
    const range = getDateRange(period);
    const reports = getReportsInRange(data, range.from, range.to);
    const sorted = [...reports].sort((a, b) =>
      a.report_date.localeCompare(b.report_date) || a.driver_id.localeCompare(b.driver_id)
    );
    const rows = sorted.map(r => {
      const driver = data.profiles.find(p => p.id === r.driver_id);
      const vehicle = r.vehicle_id ? data.vehicles.find(v => v.id === r.vehicle_id) : null;
      const reportAnomalies = data.anomalies.filter(a => a.daily_report_id === r.id);
      const reportBreaks = data.breaks.filter(b => b.daily_report_id === r.id);
      const distance = r.total_distance_km ?? (r.odometer_start && r.odometer_end ? r.odometer_end - r.odometer_start : null);
      let workHours = '';
      if (r.clock_in_at && r.clock_out_at) {
        workHours = ((new Date(r.clock_out_at).getTime() - new Date(r.clock_in_at).getTime()) / 3600000).toFixed(1);
      }
      const order = { low: 1, medium: 2, high: 3 } as const;
      const maxSev = reportAnomalies.reduce((m, a) => (order[a.severity] > order[m as keyof typeof order] ? a.severity : m), '' as string);
      const rcs = data.roll_calls.filter(rc => rc.daily_report_id === r.id);
      const preTrip = rcs.find(rc => rc.type === 'pre_trip');
      const postTrip = rcs.find(rc => rc.type === 'post_trip');
      const compliance = checkCompliance(r, reportBreaks);
      return {
        '日付': r.report_date,
        'ドライバー': driver?.full_name || '',
        '車両': vehicle?.number_plate || '',
        '出勤': r.clock_in_at ? fmtHM(r.clock_in_at) : '',
        '出庫': r.depart_at ? fmtHM(r.depart_at) : '',
        '帰庫': r.return_at ? fmtHM(r.return_at) : '',
        '退勤': r.clock_out_at ? fmtHM(r.clock_out_at) : '',
        '拘束時間(h)': workHours,
        '連続運転(分)': compliance.max_consecutive_drive_min ?? '',
        '出庫前アルコール(mg/L)': preTrip?.alcohol_value_mg ?? '',
        '出庫前判定': preTrip ? (preTrip.alcohol_result_ok ? '適正' : '要対応') : '未実施',
        '退勤前アルコール(mg/L)': postTrip?.alcohol_value_mg ?? '',
        '退勤前判定': postTrip ? (postTrip.alcohol_result_ok ? '適正' : '要対応') : '未実施',
        '出庫メーター': r.odometer_start || '',
        '帰庫メーター': r.odometer_end || '',
        '走行距離(km)': distance ?? '',
        '配送件数': r.delivery_count || 0,
        '休憩回数': reportBreaks.length,
        '休憩合計(分)': compliance.total_break_min ?? '',
        '給油': r.refueled ? 'あり' : '',
        '高速利用': r.used_highway ? 'あり' : '',
        '異常件数': reportAnomalies.length,
        '異常重要度': maxSev,
        '労務違反': (compliance.duty_warning === 'violation' || compliance.consecutive_drive_warning === 'violation' || compliance.rest_warning === 'violation') ? 'あり' : '',
        '備考': r.notes || '',
        '提出ステータス': r.status === 'submitted' ? '提出済' : r.status === 'approved' ? '承認済' : '下書き',
      };
    });
    const res = await fetch('/api/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, date: `${getDateRange(period).from}_${getDateRange(period).to}` }),
    });
    if (!res.ok) { alert('CSV生成に失敗しました'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_report_${getDateRange(period).from}_${getDateRange(period).to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">読み込み中</div>;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar active={tab} onChange={setTab} badges={badges} />

      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* トップバー */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="px-4 md:px-8 h-14 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-semibold text-slate-900 tracking-tight truncate">{tabTitle(tab)}</h1>
              <p className="text-[10px] text-slate-500 hidden md:block">{fmtDateLong(getDateRange(period).to)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="today">今日</option>
                <option value="week">過去7日</option>
                <option value="all14">過去14日</option>
                <option value="month">過去30日</option>
              </select>
              <button
                onClick={reload}
                className="text-slate-500 hover:text-slate-900 p-2 rounded-md hover:bg-slate-100 transition-all"
                aria-label="更新"
              >
                <Icon.Refresh className="w-4 h-4" />
              </button>
              <button
                onClick={downloadCSV}
                className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 transition-all"
              >
                <Icon.Download className="w-4 h-4" />
                <span className="hidden md:inline">CSV出力</span>
              </button>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl w-full mx-auto">
          {tab === 'overview' && (
            <OverviewTab data={data} period={period} onSelectAlert={setSelectedReportId} />
          )}
          {tab === 'drivers' && (
            <DriversTab data={data} period={period} onSelectReport={setSelectedReportId} />
          )}
          {tab === 'vehicles' && (
            <VehiclesTab data={data} period={period} />
          )}
          {tab === 'anomalies' && (
            <AnomaliesTab data={data} period={period} onSelectReport={setSelectedReportId} />
          )}
          {tab === 'ai' && (
            <AISummaryTab data={data} period={period} />
          )}
        </main>
      </div>

      {/* モバイルタブバー */}
      <MobileTabBar active={tab} onChange={setTab} badges={badges} />

      {/* 詳細モーダル */}
      {selectedReportId && (
        <ReportDetailModal
          report={data.reports.find(r => r.id === selectedReportId)!}
          data={data}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </div>
  );
}

function tabTitle(t: AdminTab): string {
  return ({ overview: 'ダッシュボード', drivers: 'ドライバー', vehicles: '車両', anomalies: '異常報告', ai: 'AI要約' } as Record<AdminTab, string>)[t];
}

// 詳細モーダル
function ReportDetailModal({
  report, data, onClose,
}: {
  report: DailyReport;
  data: DemoData;
  onClose: () => void;
}) {
  const driver = data.profiles.find(p => p.id === report.driver_id);
  const vehicle = data.vehicles.find(v => v.id === report.vehicle_id);
  const deliveries = data.deliveries.filter(d => d.daily_report_id === report.id);
  const breaks = data.breaks.filter(b => b.daily_report_id === report.id);
  const anomalies = data.anomalies.filter(a => a.daily_report_id === report.id);
  const rollCalls = data.roll_calls.filter(rc => rc.daily_report_id === report.id);
  const preTrip = rollCalls.find(rc => rc.type === 'pre_trip');
  const postTrip = rollCalls.find(rc => rc.type === 'post_trip');
  const compliance = checkCompliance(report, breaks);

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-end md:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 tracking-tight">{driver?.full_name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{report.report_date} · {vehicle?.number_plate || '車両未設定'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-all" aria-label="閉じる">
            <Icon.X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <Cell k="出勤" v={report.clock_in_at ? fmtHM(report.clock_in_at) : '—'} />
            <Cell k="出庫" v={report.depart_at ? fmtHM(report.depart_at) : '—'} />
            <Cell k="帰庫" v={report.return_at ? fmtHM(report.return_at) : '—'} />
            <Cell k="退勤" v={report.clock_out_at ? fmtHM(report.clock_out_at) : '—'} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Cell k="走行距離" v={report.total_distance_km ? `${report.total_distance_km} km` : '—'} large />
            <Cell k="配送件数" v={`${report.delivery_count} 件`} large />
            <Cell k="休憩" v={`${breaks.length} 回`} large />
          </div>

          {(compliance.duty_warning || compliance.consecutive_drive_warning || compliance.rest_warning) && (
            <DetailSection title="労務遵守（改善基準告示）">
              <div className="grid grid-cols-3 gap-3">
                <ComplianceCell label="拘束時間" value={compliance.duty_hours !== null ? `${compliance.duty_hours.toFixed(1)} h` : '—'} status={compliance.duty_warning} />
                <ComplianceCell label="連続運転" value={compliance.max_consecutive_drive_min !== null ? `${compliance.max_consecutive_drive_min} 分` : '—'} status={compliance.consecutive_drive_warning} />
                <ComplianceCell label="休息期間" value={compliance.rest_hours !== null ? `${compliance.rest_hours.toFixed(1)} h` : '—'} status={compliance.rest_warning} />
              </div>
            </DetailSection>
          )}

          {(preTrip || postTrip) && (
            <DetailSection title="点呼記録">
              <div className="space-y-2">
                {preTrip && <RollCallRow label="出庫前" rc={preTrip} />}
                {postTrip && <RollCallRow label="退勤前" rc={postTrip} />}
              </div>
            </DetailSection>
          )}

          {deliveries.length > 0 && (
            <DetailSection title={`配送実績 · ${deliveries.length} 件`}>
              <ul className="divide-y divide-slate-100">
                {deliveries.map(d => (
                  <li key={d.id} className="py-2.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">{d.destination}</span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {d.arrived_at && fmtHM(d.arrived_at)}
                      {d.completed_at && ` — ${fmtHM(d.completed_at)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {anomalies.length > 0 && (
            <DetailSection title={`異常報告 · ${anomalies.length} 件`}>
              <ul className="space-y-2">
                {anomalies.map(a => (
                  <li key={a.id} className={`rounded-lg p-3 border ${
                    a.severity === 'high' ? 'bg-red-50 border-red-200' :
                    a.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                    'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                      <Icon.Alert className={`w-3.5 h-3.5 ${a.severity === 'high' ? 'text-red-600' : a.severity === 'medium' ? 'text-amber-600' : 'text-slate-500'}`} />
                      <span>{categoryJa(a.category)} · {severityJa(a.severity)}</span>
                    </div>
                    <p className="text-sm text-slate-700">{a.description}</p>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Cell({ k, v, large }: { k: string; v: string; large?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
      <div className="text-[10px] font-medium text-slate-500 tracking-wider uppercase">{k}</div>
      <div className={`mt-0.5 font-semibold text-slate-900 tabular-nums tracking-tight ${large ? 'text-lg' : 'text-sm'}`}>{v}</div>
    </div>
  );
}

function ComplianceCell({
  label, value, status,
}: {
  label: string;
  value: string;
  status: 'ok' | 'caution' | 'violation' | null;
}) {
  const cls = status === 'violation' ? 'bg-red-50 border-red-200 text-red-700'
    : status === 'caution' ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return (
    <div className={`rounded-lg border ${cls} p-3`}>
      <div className="text-[10px] font-medium tracking-wider uppercase opacity-80">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}

function RollCallRow({ label, rc }: { label: string; rc: import('@/lib/types').RollCall }) {
  return (
    <div className={`rounded-lg border p-3 ${rc.alcohol_result_ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span className="text-xs text-slate-500 tabular-nums">{fmtHM(rc.performed_at)}</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-sm">
        <span className="text-2xl font-semibold tabular-nums text-slate-900">
          {rc.alcohol_value_mg?.toFixed(2)}
          <span className="text-xs font-normal text-slate-500 ml-1">mg/L</span>
        </span>
        {rc.alcohol_result_ok ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Icon.Check className="w-3.5 h-3.5" />適正
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
            <Icon.Alert className="w-3.5 h-3.5" />要対応
          </span>
        )}
      </div>
    </div>
  );
}

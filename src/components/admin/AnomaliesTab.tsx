'use client';

import { useMemo, useState } from 'react';
import { Icon } from '../Icon';
import { DonutChart } from './Charts';
import type { DemoData } from '@/lib/demo-store';
import {
  getDateRange, getReportsInRange, getAnomaliesWithContext,
  categoryJa, severityJa, type Period,
} from '@/lib/admin-data';

interface Props {
  data: DemoData;
  period: Period;
  onSelectReport?: (reportId: string) => void;
}

export function AnomaliesTab({ data, period, onSelectReport }: Props) {
  const range = getDateRange(period);
  const reports = getReportsInRange(data, range.from, range.to);
  const allAnomalies = useMemo(() => getAnomaliesWithContext(data, reports), [data, reports]);

  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filtered = allAnomalies.filter(a =>
    (filterSeverity === 'all' || a.anomaly.severity === filterSeverity) &&
    (filterCategory === 'all' || a.anomaly.category === filterCategory)
  );

  // カテゴリ別集計
  const byCategory = allAnomalies.reduce((acc, a) => {
    acc[a.anomaly.category] = (acc[a.anomaly.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryColors: Record<string, string> = {
    vehicle: '#dc2626', delay: '#d97706', accident: '#b91c1c',
    damage: '#a16207', near_miss: '#7c3aed', other: '#475569',
  };

  const donutData = Object.entries(byCategory).map(([k, v]) => ({
    name: categoryJa(k), value: v, color: categoryColors[k] || '#475569',
  }));

  // 重要度別カウント
  const sevCounts = {
    high: allAnomalies.filter(a => a.anomaly.severity === 'high').length,
    medium: allAnomalies.filter(a => a.anomaly.severity === 'medium').length,
    low: allAnomalies.filter(a => a.anomaly.severity === 'low').length,
  };

  return (
    <div className="space-y-5">
      {/* サマリー + ドーナツ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-3 gap-3">
          <SummaryBox label="重大" value={sevCounts.high} color="red" />
          <SummaryBox label="中程度" value={sevCounts.medium} color="amber" />
          <SummaryBox label="軽微" value={sevCounts.low} color="slate" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">カテゴリ別</div>
          {donutData.length > 0 ? (
            <DonutChart data={donutData} height={140} />
          ) : (
            <p className="text-center text-xs text-slate-400 py-12">異常報告なし</p>
          )}
        </div>
      </div>

      {/* フィルタ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-slate-500 mr-2">フィルタ:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">すべての重要度</option>
            <option value="high">重大のみ</option>
            <option value="medium">中程度のみ</option>
            <option value="low">軽微のみ</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">すべての種別</option>
            <option value="vehicle">車両異常</option>
            <option value="delay">遅延</option>
            <option value="accident">事故</option>
            <option value="damage">荷物破損</option>
            <option value="near_miss">ヒヤリハット</option>
            <option value="other">その他</option>
          </select>
          <span className="text-xs text-slate-500 ml-auto">{filtered.length} 件</span>
        </div>
      </div>

      {/* タイムライン */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 tracking-tight">異常報告タイムライン</h3>
        </div>
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-12">条件に該当する異常報告はありません</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map(a => (
              <li key={a.anomaly.id}>
                <button
                  onClick={() => onSelectReport?.(a.anomaly.daily_report_id)}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3"
                >
                  <span className={`shrink-0 w-1 self-stretch rounded-full ${
                    a.anomaly.severity === 'high' ? 'bg-red-500' :
                    a.anomaly.severity === 'medium' ? 'bg-amber-500' :
                    'bg-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        a.anomaly.severity === 'high' ? 'bg-red-100 text-red-700' :
                        a.anomaly.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{severityJa(a.anomaly.severity)}</span>
                      <span className="text-xs font-semibold text-slate-700">{categoryJa(a.anomaly.category)}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-600">{a.driverName}</span>
                      {a.vehicleName && (
                        <>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500">{a.vehicleName}</span>
                        </>
                      )}
                      <span className="text-xs text-slate-400 ml-auto tabular-nums">{a.reportDate}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{a.anomaly.description}</p>
                  </div>
                  <Icon.ArrowRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: number; color: 'red' | 'amber' | 'slate' }) {
  const colorMap = {
    red: 'border-l-red-500',
    amber: 'border-l-amber-500',
    slate: 'border-l-slate-400',
  };
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${colorMap[color]} p-4`}>
      <div className="text-xs font-medium text-slate-500 tracking-wider uppercase">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-900 tabular-nums tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 mt-1">件</div>
    </div>
  );
}

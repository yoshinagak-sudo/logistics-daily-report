'use client';

import { useState } from 'react';
import { Icon } from '../Icon';
import type { DemoData } from '@/lib/demo-store';
import { getDateRange, getReportsInRange, type Period } from '@/lib/admin-data';

interface Props {
  data: DemoData;
  period: Period;
}

export function AISummaryTab({ data, period }: Props) {
  const range = getDateRange(period);
  const reports = getReportsInRange(data, range.from, range.to);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setSummary(null);
    try {
      const reportData = reports.map(r => {
        const driver = data.profiles.find(p => p.id === r.driver_id);
        const reportAnomalies = data.anomalies.filter(a => a.daily_report_id === r.id);
        return {
          driver_name: driver?.full_name || 'unknown',
          notes: r.notes,
          anomalies: reportAnomalies.map(a => `${a.category}/${a.severity}: ${a.description}`),
        };
      });
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: reportData }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.demo) setSummary('AI要約は無効です。GOOGLE_GENERATIVE_AI_API_KEY を設定してください。');
        else setSummary(`エラー: ${json.error}`);
      } else {
        setSummary(json.summary);
      }
    } catch (err) {
      setSummary('エラー: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl border border-violet-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-violet-600 text-white flex items-center justify-center">
            <Icon.Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 tracking-tight">AI要約 — {range.label}</h3>
            <p className="text-xs text-slate-500">対象 {reports.length} 件の日報から重要事項を抽出</p>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || reports.length === 0}
          className="mt-4 w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium transition-all"
        >
          {loading ? (
            <>
              <Icon.Sparkles className="w-4 h-4 animate-pulse" />
              AIが解析しています...
            </>
          ) : (
            <>
              <Icon.Sparkles className="w-4 h-4" />
              AI要約を生成
            </>
          )}
        </button>
      </div>

      {summary && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-3">要約結果</div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      {/* 統計プレビュー */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-3">対象データ</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="期間" value={range.label} />
          <Stat label="日報" value={`${reports.length} 件`} />
          <Stat label="提出済み" value={`${reports.filter(r => r.status !== 'draft').length} 件`} />
          <Stat label="異常報告" value={`${data.anomalies.filter(a => reports.some(r => r.id === a.daily_report_id)).length} 件`} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-[10px] text-slate-500 tracking-wider uppercase">{label}</div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

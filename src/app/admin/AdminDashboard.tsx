'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { loadDemo, todayStr, type DemoData } from '@/lib/demo-store';
import type { DailyReport } from '@/lib/types';

export function AdminDashboard() {
  const [data, setData] = useState<DemoData | null>(null);
  const [date, setDate] = useState<string>(todayStr());
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => { setData(loadDemo()); }, []);
  function reload() { setData(loadDemo()); }

  const drivers = useMemo(() => data?.profiles.filter(p => p.role === 'driver') || [], [data]);
  const reportsForDate = useMemo(
    () => data?.reports.filter(r => r.report_date === date) || [],
    [data, date]
  );
  const stats = useMemo(() => {
    if (!data) return { total: 0, submitted: 0, anomalies: 0, totalDeliveries: 0, totalDistance: 0, avgWorkH: 0 };
    const submitted = reportsForDate.filter(r => r.status !== 'draft').length;
    const anomalies = data.anomalies.filter(a => reportsForDate.some(r => r.id === a.daily_report_id)).length;
    const totalDeliveries = reportsForDate.reduce((s, r) => s + (r.delivery_count || 0), 0);
    const totalDistance = reportsForDate.reduce((s, r) => s + (r.total_distance_km || 0), 0);
    const workHs = reportsForDate
      .filter(r => r.clock_in_at && r.clock_out_at)
      .map(r => (new Date(r.clock_out_at!).getTime() - new Date(r.clock_in_at!).getTime()) / 3600000);
    const avgWorkH = workHs.length > 0 ? workHs.reduce((a, b) => a + b, 0) / workHs.length : 0;
    return { total: drivers.length, submitted, anomalies, totalDeliveries, totalDistance, avgWorkH };
  }, [data, reportsForDate, drivers]);

  async function generateSummary() {
    if (!data) return;
    setSummarizing(true);
    setAiSummary(null);
    try {
      const reports = reportsForDate.map(r => {
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
        body: JSON.stringify({ reports }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.demo) setAiSummary('AI要約は無効です。GOOGLE_GENERATIVE_AI_API_KEY を設定してください。');
        else setAiSummary(`エラー: ${json.error}`);
      } else {
        setAiSummary(json.summary);
      }
    } catch (err) {
      setAiSummary('エラー: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setSummarizing(false);
    }
  }

  async function downloadCSV() {
    if (!data) return;
    const rows = drivers.map(driver => {
      const r = reportsForDate.find(x => x.driver_id === driver.id);
      const vehicle = r?.vehicle_id ? data.vehicles.find(v => v.id === r.vehicle_id) : null;
      const reportAnomalies = r ? data.anomalies.filter(a => a.daily_report_id === r.id) : [];
      const reportBreaks = r ? data.breaks.filter(b => b.daily_report_id === r.id) : [];
      const distance = r?.total_distance_km ?? (r?.odometer_start && r?.odometer_end ? r.odometer_end - r.odometer_start : null);
      let workHours = '';
      if (r?.clock_in_at && r?.clock_out_at) {
        workHours = ((new Date(r.clock_out_at).getTime() - new Date(r.clock_in_at).getTime()) / 3600000).toFixed(1);
      }
      const order = { low: 1, medium: 2, high: 3 } as const;
      const maxSev = reportAnomalies.reduce((m, a) => (order[a.severity] > order[m as keyof typeof order] ? a.severity : m), '' as string);
      return {
        '日付': date,
        'ドライバー': driver.full_name,
        '車両': vehicle?.number_plate || '',
        '出勤': r?.clock_in_at ? fmtHM(r.clock_in_at) : '',
        '出庫': r?.depart_at ? fmtHM(r.depart_at) : '',
        '帰庫': r?.return_at ? fmtHM(r.return_at) : '',
        '退勤': r?.clock_out_at ? fmtHM(r.clock_out_at) : '',
        '拘束時間(h)': workHours,
        '出庫メーター': r?.odometer_start || '',
        '帰庫メーター': r?.odometer_end || '',
        '走行距離(km)': distance ?? '',
        '配送件数': r?.delivery_count || 0,
        '休憩回数': reportBreaks.length,
        '給油': r?.refueled ? 'あり' : '',
        '高速利用': r?.used_highway ? 'あり' : '',
        '異常件数': reportAnomalies.length,
        '異常重要度': maxSev,
        '備考': r?.notes || '',
        '提出ステータス': r?.status === 'submitted' ? '提出済' : r?.status === 'approved' ? '承認済' : r ? '下書き' : '未着手',
      };
    });
    const res = await fetch('/api/csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, date }),
    });
    if (!res.ok) { alert('CSV生成に失敗しました'); return; }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `daily_report_${date}.csv`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">読み込み中</div>;

  const submissionRate = stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
              <Icon.ArrowLeft className="w-4 h-4" />戻る
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <h1 className="font-semibold text-slate-900 tracking-tight">管理ダッシュボード</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              onClick={reload}
              className="text-slate-500 hover:text-slate-900 p-2 rounded-md hover:bg-slate-100 transition-all"
              aria-label="更新"
            >
              <Icon.Refresh className="w-4 h-4" />
            </button>
            <button
              onClick={downloadCSV}
              className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-sm font-medium inline-flex items-center gap-1.5 transition-all"
            >
              <Icon.Download className="w-4 h-4" />CSV
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* タイトル */}
        <div>
          <p className="text-xs font-medium text-slate-500 tracking-wider uppercase mb-1">{formatDateLong(date)}</p>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">本日の運行状況</h2>
        </div>

        {/* サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="提出率" value={`${submissionRate}%`} sub={`${stats.submitted} / ${stats.total} 名`} highlight={submissionRate < 100 ? 'warn' : 'ok'} />
          <SummaryCard label="配送件数" value={stats.totalDeliveries} sub="本日合計" />
          <SummaryCard label="走行距離" value={stats.totalDistance.toLocaleString()} sub="km · 全体" />
          <SummaryCard label="異常報告" value={stats.anomalies} sub="件" highlight={stats.anomalies > 0 ? 'alert' : 'ok'} />
        </div>

        {/* AI要約 */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Icon.Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900">AI要約</h3>
              <span className="text-xs text-slate-400">本日の重要事項を200文字以内で整理</span>
            </div>
            <button
              onClick={generateSummary}
              disabled={summarizing || reportsForDate.length === 0}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3 py-1.5 text-sm font-medium transition-all"
            >
              {summarizing ? '生成中...' : '要約を生成'}
            </button>
          </div>
          <div className="px-5 py-4">
            {aiSummary ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
            ) : (
              <p className="text-sm text-slate-400">「要約を生成」を押すと、AIが本日の異常・遅延・特記事項を整理します。</p>
            )}
          </div>
        </div>

        {/* テーブル */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">ドライバー別 運行</h3>
            <span className="text-xs text-slate-500">{drivers.length} 名</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] font-medium text-slate-500 tracking-wider uppercase border-b border-slate-100">
                  <th className="px-5 py-3">ドライバー</th>
                  <th className="px-3 py-3">車両</th>
                  <th className="px-3 py-3 text-right">出庫</th>
                  <th className="px-3 py-3 text-right">帰庫</th>
                  <th className="px-3 py-3 text-right">配送</th>
                  <th className="px-3 py-3 text-right">走行</th>
                  <th className="px-3 py-3 text-center">提出</th>
                  <th className="px-3 py-3 text-center">異常</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {drivers.map(driver => {
                  const r = reportsForDate.find(x => x.driver_id === driver.id);
                  const vehicle = r?.vehicle_id ? data.vehicles.find(v => v.id === r.vehicle_id) : null;
                  const anomalies = r ? data.anomalies.filter(a => a.daily_report_id === r.id) : [];
                  const distance = r?.total_distance_km ?? (r?.odometer_start && r?.odometer_end ? r.odometer_end - r.odometer_start : null);
                  const hasHigh = anomalies.some(a => a.severity === 'high');
                  return (
                    <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={driver.full_name} />
                          <span className="font-medium text-slate-900 text-sm">{driver.full_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-sm text-slate-600">{vehicle?.number_plate || <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-3.5 text-sm tabular-nums text-right text-slate-700">{r?.depart_at ? fmtHM(r.depart_at) : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-3.5 text-sm tabular-nums text-right text-slate-700">{r?.return_at ? fmtHM(r.return_at) : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-3.5 text-sm tabular-nums text-right text-slate-700">{r?.delivery_count ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-3.5 text-sm tabular-nums text-right text-slate-700">{distance !== null ? `${distance} km` : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-3.5 text-center">
                        {!r && <Pill tone="muted">未着手</Pill>}
                        {r?.status === 'draft' && <Pill tone="warn">未提出</Pill>}
                        {r?.status === 'submitted' && <Pill tone="info">提出済</Pill>}
                        {r?.status === 'approved' && <Pill tone="success">承認済</Pill>}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        {anomalies.length > 0 ? (
                          <Pill tone={hasHigh ? 'alert' : 'warn'}>{anomalies.length} 件</Pill>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r ? (
                          <button
                            onClick={() => setSelectedReport(r)}
                            className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 group"
                          >
                            詳細
                            <Icon.ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedReport && (
        <ReportDetailModal report={selectedReport} data={data} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
}

// ====== Subcomponents ======

function SummaryCard({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: 'ok' | 'warn' | 'alert' }) {
  const accentMap = {
    ok: 'border-l-slate-900',
    warn: 'border-l-amber-500',
    alert: 'border-l-red-600',
  };
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${accentMap[highlight || 'ok']} p-4`}>
      <div className="text-[11px] font-medium text-slate-500 tracking-wider uppercase">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-900 tabular-nums tracking-tight">{value}</span>
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}

function Pill({ tone, children }: { tone: 'muted' | 'warn' | 'info' | 'success' | 'alert'; children: React.ReactNode }) {
  const map = {
    muted: 'bg-slate-100 text-slate-600',
    warn: 'bg-amber-50 text-amber-700 border border-amber-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    alert: 'bg-red-50 text-red-700 border border-red-200',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[tone]}`}>{children}</span>;
}

function Avatar({ name }: { name: string }) {
  const initial = name.slice(0, 1);
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-pink-500', 'bg-cyan-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-7 h-7 rounded-full ${color} text-white text-xs font-medium flex items-center justify-center`}>
      {initial}
    </div>
  );
}

function fmtHM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateLong(date: string): string {
  const d = new Date(date);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}曜日`;
}

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

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-end md:items-center justify-center backdrop-blur-sm" onClick={onClose}>
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

          <div className="grid grid-cols-2 gap-3">
            <Cell k="出庫メーター" v={report.odometer_start ? `${report.odometer_start.toLocaleString()} km` : '—'} />
            <Cell k="帰庫メーター" v={report.odometer_end ? `${report.odometer_end.toLocaleString()} km` : '—'} />
            <Cell k="給油" v={report.refueled ? 'あり' : 'なし'} />
            <Cell k="高速" v={report.used_highway ? '利用' : '未利用'} />
          </div>

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

          {breaks.length > 0 && (
            <DetailSection title={`休憩 · ${breaks.length} 回`}>
              <ul className="space-y-1 text-sm text-slate-600 tabular-nums">
                {breaks.map(b => (
                  <li key={b.id}>{fmtHM(b.start_at)} — {b.end_at ? fmtHM(b.end_at) : '進行中'}</li>
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
                      <span>{categoryLabel(a.category)}</span>
                      <span className="text-slate-300">·</span>
                      <span className={a.severity === 'high' ? 'text-red-600' : a.severity === 'medium' ? 'text-amber-600' : 'text-slate-500'}>{sevLabel(a.severity)}</span>
                    </div>
                    <p className="text-sm text-slate-700">{a.description}</p>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {report.raw_voice_text && (
            <DetailSection title="音声入力（AI文字起こし）">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-3">
                {report.raw_voice_text}
              </p>
            </DetailSection>
          )}

          {report.notes && (
            <DetailSection title="備考">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{report.notes}</p>
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

function categoryLabel(c: string): string {
  return ({ vehicle: '車両異常', delay: '遅延', accident: '事故', damage: '荷物破損', near_miss: 'ヒヤリハット', other: 'その他' } as Record<string, string>)[c] || c;
}
function sevLabel(s: string): string {
  return ({ low: '軽微', medium: '中程度', high: '重大' } as Record<string, string>)[s] || s;
}

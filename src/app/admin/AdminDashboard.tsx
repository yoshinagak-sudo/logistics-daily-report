'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { loadDemo, todayStr, type DemoData } from '@/lib/demo-store';
import type { DailyReport, Anomaly, Delivery, Break, Profile } from '@/lib/types';

export function AdminDashboard() {
  const [data, setData] = useState<DemoData | null>(null);
  const [date, setDate] = useState<string>(todayStr());
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    setData(loadDemo());
  }, []);

  function reload() {
    setData(loadDemo());
  }

  const drivers = useMemo(() => data?.profiles.filter(p => p.role === 'driver') || [], [data]);

  const reportsForDate = useMemo(() => {
    if (!data) return [];
    return data.reports.filter(r => r.report_date === date);
  }, [data, date]);

  const summaryStats = useMemo(() => {
    if (!data) return { total: 0, submitted: 0, anomalies: 0, totalDeliveries: 0, totalDistance: 0 };
    const submitted = reportsForDate.filter(r => r.status !== 'draft').length;
    const anomalies = data.anomalies.filter(a => reportsForDate.some(r => r.id === a.daily_report_id)).length;
    const totalDeliveries = reportsForDate.reduce((s, r) => s + (r.delivery_count || 0), 0);
    const totalDistance = reportsForDate.reduce((s, r) => s + (r.total_distance_km || 0), 0);
    return { total: drivers.length, submitted, anomalies, totalDeliveries, totalDistance };
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
        if (json.demo) {
          setAiSummary('（デモ環境ではAI要約は無効です。GOOGLE_GENERATIVE_AI_API_KEY を設定してください）');
        } else {
          setAiSummary(`エラー: ${json.error}`);
        }
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
      const distance = r?.total_distance_km ?? (
        r?.odometer_start && r?.odometer_end ? r.odometer_end - r.odometer_start : null
      );
      let workHours = '';
      if (r?.clock_in_at && r?.clock_out_at) {
        const h = (new Date(r.clock_out_at).getTime() - new Date(r.clock_in_at).getTime()) / 1000 / 60 / 60;
        workHours = h.toFixed(1);
      }
      const maxSev = reportAnomalies.reduce((m, a) => {
        const order = { low: 1, medium: 2, high: 3 };
        return order[a.severity] > order[m as keyof typeof order] ? a.severity : m;
      }, '' as string);
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
    if (!res.ok) {
      alert('CSV生成に失敗しました');
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `daily_report_${date}.csv`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  if (!data) return <div className="p-8 text-center text-slate-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-slate-500">← 戻る</Link>
            <h1 className="font-bold text-slate-900">📊 管理者ダッシュボード</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button onClick={reload} className="text-sm text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded hover:bg-slate-100">
              🔄 更新
            </button>
            <button onClick={downloadCSV} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-sm font-medium">
              📤 CSV出力
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="ドライバー数" value={summaryStats.total} />
          <SummaryCard label="提出済" value={`${summaryStats.submitted}/${summaryStats.total}`} highlight={summaryStats.submitted < summaryStats.total ? 'warn' : 'ok'} />
          <SummaryCard label="配送件数" value={summaryStats.totalDeliveries} />
          <SummaryCard label="走行距離" value={`${summaryStats.totalDistance}km`} />
          <SummaryCard label="異常報告" value={summaryStats.anomalies} highlight={summaryStats.anomalies > 0 ? 'alert' : 'ok'} />
        </div>

        {/* AI要約 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">📝 AI要約（{date}）</h2>
            <button
              onClick={generateSummary}
              disabled={summarizing || reportsForDate.length === 0}
              className="rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-1.5 text-sm font-medium"
            >
              {summarizing ? '生成中...' : 'AI要約を生成'}
            </button>
          </div>
          {aiSummary ? (
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">{aiSummary}</div>
          ) : (
            <p className="text-sm text-slate-500">「AI要約を生成」ボタンを押すと、本日の重要事項を200文字以内で整理します。</p>
          )}
        </div>

        {/* ドライバー一覧テーブル */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-900">本日の運行状況</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">ドライバー</th>
                  <th className="px-4 py-3 text-left">車両</th>
                  <th className="px-4 py-3 text-left">出庫</th>
                  <th className="px-4 py-3 text-left">帰庫</th>
                  <th className="px-4 py-3 text-right">配送</th>
                  <th className="px-4 py-3 text-right">走行</th>
                  <th className="px-4 py-3 text-center">提出</th>
                  <th className="px-4 py-3 text-center">異常</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => {
                  const r = reportsForDate.find(x => x.driver_id === driver.id);
                  const vehicle = r?.vehicle_id ? data.vehicles.find(v => v.id === r.vehicle_id) : null;
                  const anomalies = r ? data.anomalies.filter(a => a.daily_report_id === r.id) : [];
                  const distance = r?.total_distance_km ?? (
                    r?.odometer_start && r?.odometer_end ? r.odometer_end - r.odometer_start : null
                  );
                  return (
                    <tr key={driver.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{driver.full_name}</td>
                      <td className="px-4 py-3 text-slate-600">{vehicle?.number_plate || '-'}</td>
                      <td className="px-4 py-3 tabular-nums">{r?.depart_at ? fmtHM(r.depart_at) : '-'}</td>
                      <td className="px-4 py-3 tabular-nums">{r?.return_at ? fmtHM(r.return_at) : '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r?.delivery_count || 0}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{distance !== null ? `${distance}km` : '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {!r && <Tag color="slate">未着手</Tag>}
                        {r?.status === 'draft' && <Tag color="amber">未提出</Tag>}
                        {r?.status === 'submitted' && <Tag color="blue">提出済</Tag>}
                        {r?.status === 'approved' && <Tag color="emerald">承認済</Tag>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {anomalies.length > 0 ? (
                          <Tag color={anomalies.some(a => a.severity === 'high') ? 'rose' : 'amber'}>
                            {anomalies.length}件
                          </Tag>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r && (
                          <button
                            onClick={() => setSelectedReport(r)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            詳細 →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          data={data}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}

function fmtHM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function SummaryCard({ label, value, highlight }: { label: string; value: string | number; highlight?: 'ok' | 'warn' | 'alert' }) {
  const colorMap = {
    ok: 'border-slate-200',
    warn: 'border-amber-300 bg-amber-50',
    alert: 'border-rose-300 bg-rose-50',
  };
  return (
    <div className={`rounded-xl bg-white border-2 ${colorMap[highlight || 'ok']} p-4`}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

function Tag({ color, children }: { color: 'slate' | 'amber' | 'blue' | 'emerald' | 'rose'; children: React.ReactNode }) {
  const map = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${map[color]}`}>{children}</span>;
}

function ReportDetailModal({
  report,
  data,
  onClose,
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">{driver?.full_name} の日報</h3>
            <p className="text-xs text-slate-500">{report.report_date} / {vehicle?.number_plate || '車両未設定'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Cell k="出勤" v={report.clock_in_at ? fmtHM(report.clock_in_at) : '-'} />
            <Cell k="出庫" v={report.depart_at ? fmtHM(report.depart_at) : '-'} />
            <Cell k="帰庫" v={report.return_at ? fmtHM(report.return_at) : '-'} />
            <Cell k="退勤" v={report.clock_out_at ? fmtHM(report.clock_out_at) : '-'} />
            <Cell k="出庫メーター" v={report.odometer_start ? `${report.odometer_start.toLocaleString()}km` : '-'} />
            <Cell k="帰庫メーター" v={report.odometer_end ? `${report.odometer_end.toLocaleString()}km` : '-'} />
            <Cell k="走行距離" v={report.total_distance_km ? `${report.total_distance_km}km` : '-'} />
            <Cell k="配送件数" v={`${report.delivery_count}件`} />
            <Cell k="給油" v={report.refueled ? 'あり' : 'なし'} />
            <Cell k="高速" v={report.used_highway ? '利用' : '未利用'} />
          </div>

          {deliveries.length > 0 && (
            <Section title={`配送実績 (${deliveries.length}件)`}>
              <div className="space-y-1.5">
                {deliveries.map(d => (
                  <div key={d.id} className="text-sm flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-medium">{d.destination}</span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {d.arrived_at && fmtHM(d.arrived_at)}
                      {d.completed_at && ` 〜 ${fmtHM(d.completed_at)}`}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {breaks.length > 0 && (
            <Section title={`休憩 (${breaks.length}回)`}>
              <div className="space-y-1 text-sm text-slate-600">
                {breaks.map(b => (
                  <div key={b.id} className="tabular-nums">
                    {fmtHM(b.start_at)} 〜 {b.end_at ? fmtHM(b.end_at) : '進行中'}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {anomalies.length > 0 && (
            <Section title={`⚠️ 異常報告 (${anomalies.length}件)`}>
              <div className="space-y-2">
                {anomalies.map(a => (
                  <div key={a.id} className={`rounded-lg p-3 border ${
                    a.severity === 'high' ? 'bg-rose-50 border-rose-300' :
                    a.severity === 'medium' ? 'bg-amber-50 border-amber-300' :
                    'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="text-xs font-bold mb-1">
                      {categoryLabel(a.category)} / 重要度: {sevLabel(a.severity)}
                    </div>
                    <div className="text-sm text-slate-700">{a.description}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {report.raw_voice_text && (
            <Section title="🎤 音声入力（文字起こし）">
              <p className="text-sm text-slate-600 whitespace-pre-wrap bg-violet-50 rounded-lg p-3">{report.raw_voice_text}</p>
            </Section>
          )}

          {report.notes && (
            <Section title="備考">
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{report.notes}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-slate-900 mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <div className="text-[10px] text-slate-500 uppercase">{k}</div>
      <div className="font-medium text-slate-900 tabular-nums">{v}</div>
    </div>
  );
}

function categoryLabel(c: string): string {
  return ({ vehicle: '車両異常', delay: '遅延', accident: '事故', damage: '荷物破損', near_miss: 'ヒヤリハット', other: 'その他' } as Record<string, string>)[c] || c;
}
function sevLabel(s: string): string {
  return ({ low: '軽', medium: '中', high: '重大' } as Record<string, string>)[s] || s;
}

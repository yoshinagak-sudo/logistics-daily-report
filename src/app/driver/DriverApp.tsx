'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TimeButton } from '@/components/TimeButton';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { OdometerCapture } from '@/components/OdometerCapture';
import { Icon } from '@/components/Icon';
import {
  loadDemo,
  saveDemo,
  getOrCreateTodayReport,
  updateReport,
  uid,
  todayStr,
  type DemoData,
} from '@/lib/demo-store';
import type {
  DailyReport, Delivery, Break, Anomaly,
  ExtractedReportFields, AnomalyCategory, AnomalySeverity,
} from '@/lib/types';

export function DriverApp() {
  const [data, setData] = useState<DemoData | null>(null);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [showAnomaly, setShowAnomaly] = useState(false);

  useEffect(() => {
    const d = loadDemo();
    setData(d);
    if (d.currentDriverId) setReport(getOrCreateTodayReport(d, d.currentDriverId));
  }, []);

  if (!data || !report) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">読み込み中</div>;
  }

  const driver = data.profiles.find(p => p.id === data.currentDriverId);
  const drivers = data.profiles.filter(p => p.role === 'driver');
  const deliveries = data.deliveries.filter(d => d.daily_report_id === report.id);
  const breaks = data.breaks.filter(b => b.daily_report_id === report.id);
  const anomalies = data.anomalies.filter(a => a.daily_report_id === report.id);
  const openBreak = breaks.find(b => b.end_at === null);

  function refresh() {
    const d = loadDemo();
    setData(d);
    setReport(d.reports.find(r => r.id === report!.id) || null);
  }

  function patch(p: Partial<DailyReport>) {
    updateReport(data!, report!.id, p);
    refresh();
  }

  function switchDriver(id: string) {
    const d = { ...data!, currentDriverId: id };
    saveDemo(d);
    setData(d);
    setReport(getOrCreateTodayReport(d, id));
  }

  function stamp(field: 'clock_in_at' | 'depart_at' | 'return_at' | 'clock_out_at') {
    patch({ [field]: new Date().toISOString() });
  }

  function startBreak() {
    data!.breaks.push({
      id: uid('break'),
      daily_report_id: report!.id,
      start_at: new Date().toISOString(),
      end_at: null,
    });
    saveDemo(data!);
    refresh();
  }

  function endBreak() {
    const open = data!.breaks.find(b => b.daily_report_id === report!.id && b.end_at === null);
    if (open) {
      open.end_at = new Date().toISOString();
      saveDemo(data!);
      refresh();
    }
  }

  function addDelivery(destination: string) {
    if (!destination.trim()) return;
    data!.deliveries.push({
      id: uid('delivery'),
      daily_report_id: report!.id,
      destination: destination.trim(),
      arrived_at: new Date().toISOString(),
      completed_at: null,
      notes: null,
      receipt_image_url: null,
    });
    saveDemo(data!);
    patch({ delivery_count: deliveries.length + 1 });
  }

  function completeDelivery(id: string) {
    const d = data!.deliveries.find(x => x.id === id);
    if (d) { d.completed_at = new Date().toISOString(); saveDemo(data!); refresh(); }
  }

  function deleteDelivery(id: string) {
    data!.deliveries = data!.deliveries.filter(x => x.id !== id);
    saveDemo(data!);
    patch({ delivery_count: data!.deliveries.filter(d => d.daily_report_id === report!.id).length });
  }

  function addAnomaly(category: AnomalyCategory, severity: AnomalySeverity, description: string) {
    data!.anomalies.push({
      id: uid('anomaly'),
      daily_report_id: report!.id,
      category, severity, description,
      image_url: null, resolved: false,
    });
    saveDemo(data!);
    patch({ has_anomaly: true });
    setShowAnomaly(false);
  }

  function applyAIFields(fields: ExtractedReportFields) {
    const today = todayStr();
    const toIso = (hhmm?: string): string | undefined => {
      if (!hhmm) return undefined;
      const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
      if (!m) return undefined;
      return new Date(`${today}T${m[1].padStart(2, '0')}:${m[2]}:00`).toISOString();
    };

    const p: Partial<DailyReport> = {
      raw_voice_text: fields.raw_text || null,
      notes: fields.notes || report!.notes,
    };
    if (typeof fields.refueled === 'boolean') p.refueled = fields.refueled;
    if (typeof fields.used_highway === 'boolean') p.used_highway = fields.used_highway;
    if (fields.odometer_start) p.odometer_start = fields.odometer_start;
    if (fields.odometer_end) p.odometer_end = fields.odometer_end;
    if (fields.total_distance_km) p.total_distance_km = fields.total_distance_km;
    if (fields.delivery_count) p.delivery_count = fields.delivery_count;
    const ci = toIso(fields.clock_in_time); if (ci) p.clock_in_at = ci;
    const dp = toIso(fields.depart_time); if (dp) p.depart_at = dp;
    const rt = toIso(fields.return_time); if (rt) p.return_at = rt;
    const co = toIso(fields.clock_out_time); if (co) p.clock_out_at = co;
    updateReport(data!, report!.id, p);

    if (fields.deliveries) {
      for (const d of fields.deliveries) {
        data!.deliveries.push({
          id: uid('delivery'),
          daily_report_id: report!.id,
          destination: d.destination,
          arrived_at: toIso(d.arrived_time) || null,
          completed_at: toIso(d.completed_time) || null,
          notes: d.notes || null,
          receipt_image_url: null,
        });
      }
      const newCount = data!.deliveries.filter(x => x.daily_report_id === report!.id).length;
      updateReport(data!, report!.id, { delivery_count: newCount });
    }
    if (fields.breaks) {
      for (const b of fields.breaks) {
        const start = toIso(b.start_time);
        if (!start) continue;
        data!.breaks.push({
          id: uid('break'),
          daily_report_id: report!.id,
          start_at: start,
          end_at: toIso(b.end_time) || null,
        });
      }
    }
    if (fields.anomalies) {
      for (const a of fields.anomalies) {
        data!.anomalies.push({
          id: uid('anomaly'),
          daily_report_id: report!.id,
          category: a.category, severity: a.severity, description: a.description,
          image_url: null, resolved: false,
        });
      }
      if (fields.anomalies.length > 0) updateReport(data!, report!.id, { has_anomaly: true });
    }
    saveDemo(data!);
    refresh();
  }

  function submit() {
    if (!report!.clock_in_at) {
      alert('出勤時刻が未入力です');
      return;
    }
    patch({ status: 'submitted', submitted_at: new Date().toISOString() });
    alert('日報を提出しました');
  }

  const distance = report.total_distance_km ?? (
    report.odometer_start && report.odometer_end ? report.odometer_end - report.odometer_start : null
  );
  const workHours = report.clock_in_at
    ? ((report.clock_out_at ? new Date(report.clock_out_at).getTime() : Date.now()) - new Date(report.clock_in_at).getTime()) / 3600000
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-44">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
            <Icon.ArrowLeft className="w-4 h-4" />戻る
          </Link>
          <select
            value={data.currentDriverId || ''}
            onChange={(e) => switchDriver(e.target.value)}
            className="text-sm font-medium text-slate-900 bg-transparent rounded-md px-1.5 py-1 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {/* サマリーカード */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-xs font-medium text-slate-500 tracking-wide">{formatDateLabel(report.report_date)}</div>
              <div className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">{driver?.full_name}</div>
            </div>
            <StatusBadge status={report.status} />
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <Stat label="配送" value={`${report.delivery_count}`} unit="件" />
            <Stat label="走行" value={distance !== null ? distance.toLocaleString() : '—'} unit="km" />
            <Stat label="拘束" value={workHours !== null ? workHours.toFixed(1) : '—'} unit="h" />
          </div>
        </section>

        {/* 車両 */}
        <Section title="車両">
          <select
            value={report.vehicle_id || ''}
            onChange={(e) => patch({ vehicle_id: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">車両を選択</option>
            {data.vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.number_plate}（{v.nickname}）</option>
            ))}
          </select>
        </Section>

        {/* 出退勤 */}
        <Section title="タイムスタンプ">
          <div className="grid grid-cols-2 gap-2">
            <TimeButton label="出勤" value={report.clock_in_at} onClick={() => stamp('clock_in_at')} />
            <TimeButton label="出庫" value={report.depart_at} onClick={() => stamp('depart_at')} />
            <TimeButton label="帰庫" value={report.return_at} onClick={() => stamp('return_at')} />
            <TimeButton label="退勤" value={report.clock_out_at} onClick={() => stamp('clock_out_at')} />
          </div>
        </Section>

        {/* 休憩 */}
        <Section
          title="休憩"
          right={<span className="text-xs text-slate-500">{breaks.length === 0 ? '未記録' : `計 ${breaks.length} 回`}</span>}
        >
          {openBreak ? (
            <button
              onClick={endBreak}
              className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white py-3 text-sm font-medium inline-flex items-center justify-center gap-2 transition-all"
            >
              <Icon.Stop className="w-4 h-4" />休憩を終了
            </button>
          ) : (
            <button
              onClick={startBreak}
              className="w-full rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 py-3 text-sm font-medium inline-flex items-center justify-center gap-2 transition-all"
            >
              <Icon.Coffee className="w-4 h-4" />休憩を開始
            </button>
          )}
          {breaks.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              {breaks.map(b => (
                <li key={b.id} className="tabular-nums flex items-center gap-2">
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  {fmtHM(b.start_at)} <span className="text-slate-300">—</span> {b.end_at ? fmtHM(b.end_at) : <span className="text-amber-600">進行中</span>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 配送 */}
        <DeliveriesSection
          deliveries={deliveries}
          onAdd={addDelivery}
          onComplete={completeDelivery}
          onDelete={deleteDelivery}
        />

        {/* メーター */}
        <Section title="走行距離メーター">
          <div className="space-y-2">
            <OdometerCapture
              label="出庫時"
              current={report.odometer_start}
              onConfirm={(v) => patch({ odometer_start: v, total_distance_km: report.odometer_end ? report.odometer_end - v : null })}
            />
            <OdometerCapture
              label="帰庫時"
              current={report.odometer_end}
              onConfirm={(v) => patch({ odometer_end: v, total_distance_km: report.odometer_start ? v - report.odometer_start : null })}
            />
            {distance !== null && distance > 0 && (
              <div className="rounded-lg bg-slate-900 text-white p-3 flex items-center justify-between">
                <span className="text-xs text-slate-300">本日の走行距離</span>
                <span className="text-xl font-semibold tabular-nums tracking-tight">{distance.toLocaleString()} <span className="text-xs text-slate-300 font-normal">km</span></span>
              </div>
            )}
          </div>
        </Section>

        {/* 給油・高速 */}
        <Section title="その他">
          <div className="grid grid-cols-2 gap-2">
            <Toggle label="給油あり" value={report.refueled} onChange={(v) => patch({ refueled: v })} />
            <Toggle label="高速利用" value={report.used_highway} onChange={(v) => patch({ used_highway: v })} />
          </div>
        </Section>

        {/* 異常報告 */}
        <Section
          title="異常報告"
          right={anomalies.length > 0 ? <span className="text-xs font-medium text-red-600">{anomalies.length} 件</span> : null}
        >
          {anomalies.length > 0 && (
            <ul className="space-y-2 mb-3">
              {anomalies.map(a => (
                <li key={a.id} className={`rounded-lg p-3 border ${
                  a.severity === 'high' ? 'bg-red-50 border-red-200' :
                  a.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 text-xs font-semibold mb-0.5">
                    <Icon.Alert className={`w-3.5 h-3.5 ${a.severity === 'high' ? 'text-red-600' : a.severity === 'medium' ? 'text-amber-600' : 'text-slate-500'}`} />
                    <span>{categoryLabel(a.category)}</span>
                    <span className="text-slate-400">·</span>
                    <span className={a.severity === 'high' ? 'text-red-600' : a.severity === 'medium' ? 'text-amber-600' : 'text-slate-500'}>{sevLabel(a.severity)}</span>
                  </div>
                  <p className="text-sm text-slate-700">{a.description}</p>
                </li>
              ))}
            </ul>
          )}
          {showAnomaly ? (
            <AnomalyForm onSubmit={addAnomaly} onCancel={() => setShowAnomaly(false)} />
          ) : (
            <button
              onClick={() => setShowAnomaly(true)}
              className="w-full rounded-lg border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 py-3 text-sm font-medium inline-flex items-center justify-center gap-2 transition-all"
            >
              <Icon.Plus className="w-4 h-4" />異常を報告
            </button>
          )}
        </Section>

        {/* 音声入力（文字起こし） */}
        {report.raw_voice_text && (
          <Section title="音声入力（AI文字起こし）">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-3">
              {report.raw_voice_text}
            </p>
          </Section>
        )}
      </div>

      {/* ボトムバー: 音声入力 + 提出 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3 space-y-2">
          <VoiceRecorder onResult={applyAIFields} />
          <button
            onClick={submit}
            disabled={report.status !== 'draft'}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:bg-slate-200 disabled:text-slate-400 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
          >
            {report.status === 'draft' ? (
              <>
                <Icon.Check className="w-4 h-4" />日報を提出
              </>
            ) : (
              <><Icon.Check className="w-4 h-4" />提出済み</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ====== Subcomponents ======

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase">{title}</h3>
        {right}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-medium text-slate-500 tracking-wider uppercase">{label}</div>
      <div className="mt-1">
        <span className="text-2xl font-semibold text-slate-900 tabular-nums tracking-tight">{value}</span>
        <span className="text-xs text-slate-400 ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DailyReport['status'] }) {
  const map = {
    draft: { c: 'bg-slate-100 text-slate-600 border-slate-200', t: '下書き' },
    submitted: { c: 'bg-blue-50 text-blue-700 border-blue-200', t: '提出済' },
    approved: { c: 'bg-emerald-50 text-emerald-700 border-emerald-200', t: '承認済' },
  };
  const m = map[status];
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${m.c}`}>{m.t}</span>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
        value
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
      }`}
    >
      {value && '✓ '}{label}
    </button>
  );
}

function fmtHM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateLabel(date: string): string {
  const d = new Date(date);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

function categoryLabel(c: AnomalyCategory): string {
  return { vehicle: '車両異常', delay: '遅延', accident: '事故', damage: '荷物破損', near_miss: 'ヒヤリハット', other: 'その他' }[c];
}
function sevLabel(s: AnomalySeverity): string {
  return { low: '軽微', medium: '中程度', high: '重大' }[s];
}

function DeliveriesSection({
  deliveries, onAdd, onComplete, onDelete,
}: {
  deliveries: Delivery[];
  onAdd: (s: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [input, setInput] = useState('');
  return (
    <Section
      title="配送実績"
      right={<span className="text-xs text-slate-500">{deliveries.length} 件</span>}
    >
      <div className="flex gap-1.5 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) { onAdd(input); setInput(''); } }}
          placeholder="配送先を入力"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <button
          onClick={() => { onAdd(input); setInput(''); }}
          disabled={!input.trim()}
          className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 text-sm font-medium disabled:bg-slate-200 disabled:text-slate-400 inline-flex items-center transition-all"
        >
          <Icon.Plus className="w-4 h-4" />
        </button>
      </div>
      {deliveries.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-4">配送記録はまだありません</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {deliveries.map(d => (
            <li key={d.id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{d.destination}</div>
                <div className="text-xs text-slate-500 tabular-nums mt-0.5">
                  {d.arrived_at && `着 ${fmtHM(d.arrived_at)}`}
                  {d.completed_at && ` · 完了 ${fmtHM(d.completed_at)}`}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!d.completed_at && (
                  <button
                    onClick={() => onComplete(d.id)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-all"
                  >完了</button>
                )}
                <button
                  onClick={() => onDelete(d.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                  aria-label="削除"
                >
                  <Icon.X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function AnomalyForm({
  onSubmit, onCancel,
}: {
  onSubmit: (cat: AnomalyCategory, sev: AnomalySeverity, desc: string) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<AnomalyCategory>('vehicle');
  const [severity, setSeverity] = useState<AnomalySeverity>('low');
  const [desc, setDesc] = useState('');

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">種類</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as AnomalyCategory)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="vehicle">車両異常</option>
          <option value="delay">遅延</option>
          <option value="accident">事故</option>
          <option value="damage">荷物破損</option>
          <option value="near_miss">ヒヤリハット</option>
          <option value="other">その他</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">重要度</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['low', 'medium', 'high'] as AnomalySeverity[]).map(s => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                severity === s
                  ? s === 'high' ? 'bg-red-600 text-white border-red-600' :
                    s === 'medium' ? 'bg-amber-500 text-white border-amber-500' :
                    'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >{sevLabel(s)}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">状況</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="状況を入力"
          rows={3}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => desc.trim() && onSubmit(category, severity, desc.trim())}
          disabled={!desc.trim()}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:bg-slate-200 disabled:text-slate-400 transition-all"
        >報告する</button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm transition-all"
        >キャンセル</button>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TimeButton } from '@/components/TimeButton';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { OdometerCapture } from '@/components/OdometerCapture';
import {
  loadDemo,
  saveDemo,
  getOrCreateTodayReport,
  updateReport,
  uid,
  todayStr,
  type DemoData,
} from '@/lib/demo-store';
import type { DailyReport, Delivery, Break, Anomaly, ExtractedReportFields, AnomalyCategory, AnomalySeverity } from '@/lib/types';

export function DriverApp() {
  const [data, setData] = useState<DemoData | null>(null);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [tab, setTab] = useState<'main' | 'deliveries' | 'inspection' | 'review'>('main');

  useEffect(() => {
    const d = loadDemo();
    setData(d);
    if (d.currentDriverId) {
      setReport(getOrCreateTodayReport(d, d.currentDriverId));
    }
  }, []);

  if (!data || !report) {
    return <div className="p-8 text-center text-slate-500">読み込み中...</div>;
  }

  const driver = data.profiles.find(p => p.id === data.currentDriverId);
  const drivers = data.profiles.filter(p => p.role === 'driver');
  const todayDeliveries = data.deliveries.filter(d => d.daily_report_id === report.id);
  const todayBreaks = data.breaks.filter(b => b.daily_report_id === report.id);
  const todayAnomalies = data.anomalies.filter(a => a.daily_report_id === report.id);

  function refreshAll() {
    const d = loadDemo();
    setData(d);
    setReport(d.reports.find(r => r.id === report!.id) || null);
  }

  function patchReport(patch: Partial<DailyReport>) {
    updateReport(data!, report!.id, patch);
    refreshAll();
  }

  function switchDriver(id: string) {
    const d = { ...data!, currentDriverId: id };
    saveDemo(d);
    setData(d);
    setReport(getOrCreateTodayReport(d, id));
  }

  function setVehicle(vehicleId: string) {
    patchReport({ vehicle_id: vehicleId });
  }

  function stamp(field: 'clock_in_at' | 'depart_at' | 'return_at' | 'clock_out_at') {
    patchReport({ [field]: new Date().toISOString() });
  }

  function startBreak() {
    const newBreak: Break = {
      id: uid('break'),
      daily_report_id: report!.id,
      start_at: new Date().toISOString(),
      end_at: null,
    };
    data!.breaks.push(newBreak);
    saveDemo(data!);
    refreshAll();
  }

  function endBreak() {
    const open = data!.breaks.find(b => b.daily_report_id === report!.id && b.end_at === null);
    if (!open) return;
    open.end_at = new Date().toISOString();
    saveDemo(data!);
    refreshAll();
  }

  const openBreak = todayBreaks.find(b => b.end_at === null);

  function addDelivery(destination: string) {
    if (!destination.trim()) return;
    const delivery: Delivery = {
      id: uid('delivery'),
      daily_report_id: report!.id,
      destination: destination.trim(),
      arrived_at: new Date().toISOString(),
      completed_at: null,
      notes: null,
      receipt_image_url: null,
    };
    data!.deliveries.push(delivery);
    saveDemo(data!);
    patchReport({ delivery_count: todayDeliveries.length + 1 });
  }

  function completeDelivery(id: string) {
    const d = data!.deliveries.find(x => x.id === id);
    if (!d) return;
    d.completed_at = new Date().toISOString();
    saveDemo(data!);
    refreshAll();
  }

  function deleteDelivery(id: string) {
    data!.deliveries = data!.deliveries.filter(x => x.id !== id);
    saveDemo(data!);
    patchReport({ delivery_count: data!.deliveries.filter(d => d.daily_report_id === report!.id).length });
  }

  function addAnomaly(category: AnomalyCategory, severity: AnomalySeverity, description: string) {
    const a: Anomaly = {
      id: uid('anomaly'),
      daily_report_id: report!.id,
      category,
      severity,
      description,
      image_url: null,
      resolved: false,
    };
    data!.anomalies.push(a);
    saveDemo(data!);
    patchReport({ has_anomaly: true });
  }

  function applyAIFields(fields: ExtractedReportFields) {
    const patch: Partial<DailyReport> = {
      raw_voice_text: fields.raw_text || null,
      notes: fields.notes || report!.notes,
    };
    if (typeof fields.refueled === 'boolean') patch.refueled = fields.refueled;
    if (typeof fields.used_highway === 'boolean') patch.used_highway = fields.used_highway;
    if (fields.odometer_start) patch.odometer_start = fields.odometer_start;
    if (fields.odometer_end) patch.odometer_end = fields.odometer_end;
    if (fields.total_distance_km) patch.total_distance_km = fields.total_distance_km;
    if (fields.delivery_count) patch.delivery_count = fields.delivery_count;

    const today = todayStr();
    function toIso(hhmm?: string): string | undefined {
      if (!hhmm) return undefined;
      const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
      if (!m) return undefined;
      const d = new Date(`${today}T${m[1].padStart(2, '0')}:${m[2]}:00`);
      return d.toISOString();
    }
    const ci = toIso(fields.clock_in_time); if (ci) patch.clock_in_at = ci;
    const dp = toIso(fields.depart_time); if (dp) patch.depart_at = dp;
    const rt = toIso(fields.return_time); if (rt) patch.return_at = rt;
    const co = toIso(fields.clock_out_time); if (co) patch.clock_out_at = co;
    updateReport(data!, report!.id, patch);

    // 配送先
    if (fields.deliveries) {
      for (const d of fields.deliveries) {
        const delivery: Delivery = {
          id: uid('delivery'),
          daily_report_id: report!.id,
          destination: d.destination,
          arrived_at: toIso(d.arrived_time) || null,
          completed_at: toIso(d.completed_time) || null,
          notes: d.notes || null,
          receipt_image_url: null,
        };
        data!.deliveries.push(delivery);
      }
      const newCount = data!.deliveries.filter(x => x.daily_report_id === report!.id).length;
      updateReport(data!, report!.id, { delivery_count: newCount });
    }

    // 休憩
    if (fields.breaks) {
      for (const b of fields.breaks) {
        const start = toIso(b.start_time);
        if (!start) continue;
        const br: Break = {
          id: uid('break'),
          daily_report_id: report!.id,
          start_at: start,
          end_at: toIso(b.end_time) || null,
        };
        data!.breaks.push(br);
      }
    }

    // 異常
    if (fields.anomalies) {
      for (const a of fields.anomalies) {
        const an: Anomaly = {
          id: uid('anomaly'),
          daily_report_id: report!.id,
          category: a.category,
          severity: a.severity,
          description: a.description,
          image_url: null,
          resolved: false,
        };
        data!.anomalies.push(an);
      }
      if (fields.anomalies.length > 0) updateReport(data!, report!.id, { has_anomaly: true });
    }

    saveDemo(data!);
    refreshAll();
  }

  function submit() {
    if (!report!.clock_in_at) {
      alert('出勤時刻が未入力です');
      return;
    }
    patchReport({ status: 'submitted', submitted_at: new Date().toISOString() });
    alert('日報を提出しました');
  }

  const distance = report.total_distance_km ?? (
    report.odometer_start && report.odometer_end
      ? report.odometer_end - report.odometer_start
      : null
  );

  const stats = computeStats(report);

  return (
    <div className="min-h-screen bg-slate-100 pb-32">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-500">← 戻る</Link>
          <div className="flex items-center gap-2">
            <select
              value={data.currentDriverId || ''}
              onChange={(e) => switchDriver(e.target.value)}
              className="text-sm bg-slate-100 rounded-lg px-2 py-1.5 font-medium"
            >
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* 状態カード */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-slate-500">{todayStr()}</div>
              <div className="font-bold text-slate-900">{driver?.full_name} さんの日報</div>
            </div>
            <StatusBadge status={report.status} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="配送" value={`${report.delivery_count}件`} />
            <Stat label="走行" value={distance ? `${distance}km` : '--'} />
            <Stat label="拘束" value={stats.workHours} />
          </div>
        </div>

        {/* タブ */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200">
          {[
            ['main', '出退勤'],
            ['deliveries', `配送(${todayDeliveries.length})`],
            ['inspection', 'メーター'],
            ['review', '確認'],
          ].map(([k, v]) => (
            <button
              key={k}
              onClick={() => setTab(k as typeof tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === k ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* メインタブ：出退勤 */}
        {tab === 'main' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">車両</h3>
              <select
                value={report.vehicle_id || ''}
                onChange={(e) => setVehicle(e.target.value)}
                className="w-full rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-medium"
              >
                <option value="">車両を選択</option>
                {data.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.number_plate}（{v.nickname}）</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm mb-3">タイムスタンプ</h3>
              <div className="grid grid-cols-2 gap-2">
                <TimeButton label="出勤" value={report.clock_in_at} onClick={() => stamp('clock_in_at')} color="emerald" />
                <TimeButton label="出庫" value={report.depart_at} onClick={() => stamp('depart_at')} color="blue" />
                <TimeButton label="帰庫" value={report.return_at} onClick={() => stamp('return_at')} color="blue" />
                <TimeButton label="退勤" value={report.clock_out_at} onClick={() => stamp('clock_out_at')} color="amber" />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm mb-3">休憩</h3>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  {todayBreaks.length === 0 && '未記録'}
                  {todayBreaks.length > 0 && (
                    <span>計 {todayBreaks.length}回 / {stats.breakMinutes}分</span>
                  )}
                </div>
                {openBreak ? (
                  <button onClick={endBreak} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold">
                    休憩終了
                  </button>
                ) : (
                  <button onClick={startBreak} className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold">
                    休憩開始
                  </button>
                )}
              </div>
              {todayBreaks.length > 0 && (
                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  {todayBreaks.map(b => (
                    <div key={b.id}>
                      {fmtHM(b.start_at)} 〜 {b.end_at ? fmtHM(b.end_at) : '進行中'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">🎤 AI音声入力</h3>
              <VoiceRecorder onResult={applyAIFields} />
              <p className="text-xs text-slate-500">
                話した内容をAIが日報項目に振り分けます。出退勤・配送先・休憩・異常などをまとめて話してください。
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">給油・高速</h3>
              <div className="flex gap-2">
                <Toggle label="給油あり" value={report.refueled} onChange={(v) => patchReport({ refueled: v })} />
                <Toggle label="高速利用" value={report.used_highway} onChange={(v) => patchReport({ used_highway: v })} />
              </div>
            </div>
          </div>
        )}

        {/* 配送タブ */}
        {tab === 'deliveries' && (
          <DeliveriesTab
            deliveries={todayDeliveries}
            onAdd={addDelivery}
            onComplete={completeDelivery}
            onDelete={deleteDelivery}
          />
        )}

        {/* メータータブ */}
        {tab === 'inspection' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">📷 メーター撮影（OCR）</h3>
              <OdometerCapture
                label="出庫時メーター"
                current={report.odometer_start}
                onConfirm={(v) => patchReport({ odometer_start: v, total_distance_km: report.odometer_end ? report.odometer_end - v : null })}
              />
              <OdometerCapture
                label="帰庫時メーター"
                current={report.odometer_end}
                onConfirm={(v) => patchReport({ odometer_end: v, total_distance_km: report.odometer_start ? v - report.odometer_start : null })}
              />
              {distance !== null && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <div className="text-xs text-emerald-700">本日の走行距離</div>
                  <div className="text-2xl font-bold text-emerald-900">{distance.toLocaleString()} km</div>
                </div>
              )}
            </div>

            <AnomalySection anomalies={todayAnomalies} onAdd={addAnomaly} />
          </div>
        )}

        {/* 確認タブ */}
        {tab === 'review' && (
          <ReviewTab
            report={report}
            deliveries={todayDeliveries}
            breaks={todayBreaks}
            anomalies={todayAnomalies}
            stats={stats}
            distance={distance}
            vehicleName={data.vehicles.find(v => v.id === report.vehicle_id)?.number_plate}
            onSubmit={submit}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DailyReport['status'] }) {
  const map = {
    draft: { c: 'bg-slate-100 text-slate-700', t: '下書き' },
    submitted: { c: 'bg-blue-100 text-blue-700', t: '提出済' },
    approved: { c: 'bg-emerald-100 text-emerald-700', t: '承認済' },
  };
  const m = map[status];
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${m.c}`}>{m.t}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="font-bold text-slate-900 text-sm tabular-nums">{value}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
        value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
      }`}
    >
      {value ? '✓ ' : ''}{label}
    </button>
  );
}

function fmtHM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function computeStats(report: DailyReport) {
  if (!report.clock_in_at) {
    return { workHours: '--', breakMinutes: 0 };
  }
  const start = new Date(report.clock_in_at).getTime();
  const end = report.clock_out_at ? new Date(report.clock_out_at).getTime() : Date.now();
  const workHours = (end - start) / 1000 / 60 / 60;
  return {
    workHours: `${workHours.toFixed(1)}h`,
    breakMinutes: 0,
  };
}

function DeliveriesTab({
  deliveries,
  onAdd,
  onComplete,
  onDelete,
}: {
  deliveries: Delivery[];
  onAdd: (s: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [input, setInput] = useState('');
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <h3 className="font-bold text-slate-900 text-sm mb-3">配送先を追加</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例：仙台中央市場"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => { onAdd(input); setInput(''); }}
            disabled={!input.trim()}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">本日の配送</h3>
          <span className="text-xs text-slate-500">{deliveries.length}件</span>
        </div>
        {deliveries.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">配送記録なし</div>
        )}
        {deliveries.map(d => (
          <div key={d.id} className="border-b border-slate-100 last:border-0 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 text-sm">{d.destination}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {d.arrived_at && `着 ${fmtHM(d.arrived_at)}`}
                  {d.completed_at && ` / 完了 ${fmtHM(d.completed_at)}`}
                </div>
              </div>
              <div className="flex gap-1">
                {!d.completed_at && (
                  <button
                    onClick={() => onComplete(d.id)}
                    className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium"
                  >
                    完了
                  </button>
                )}
                <button
                  onClick={() => onDelete(d.id)}
                  className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-xs"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnomalySection({
  anomalies,
  onAdd,
}: {
  anomalies: Anomaly[];
  onAdd: (cat: AnomalyCategory, sev: AnomalySeverity, desc: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<AnomalyCategory>('vehicle');
  const [severity, setSeverity] = useState<AnomalySeverity>('low');
  const [desc, setDesc] = useState('');

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-900 text-sm">⚠️ 異常・トラブル報告</h3>
        <span className="text-xs text-slate-500">{anomalies.length}件</span>
      </div>

      {anomalies.length > 0 && (
        <div className="space-y-2 mb-3">
          {anomalies.map(a => (
            <div key={a.id} className={`rounded-lg p-2 text-xs border ${
              a.severity === 'high' ? 'bg-rose-50 border-rose-200' :
              a.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
              'bg-slate-50 border-slate-200'
            }`}>
              <div className="font-bold">{categoryLabel(a.category)} ({severityLabel(a.severity)})</div>
              <div className="text-slate-600 mt-0.5">{a.description}</div>
            </div>
          ))}
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full py-2.5 rounded-lg bg-rose-50 text-rose-700 text-sm font-bold border-2 border-rose-200"
        >
          + 異常を報告する
        </button>
      )}

      {open && (
        <div className="space-y-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as AnomalyCategory)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="vehicle">車両異常</option>
            <option value="delay">遅延</option>
            <option value="accident">事故</option>
            <option value="damage">荷物破損</option>
            <option value="near_miss">ヒヤリハット</option>
            <option value="other">その他</option>
          </select>
          <div className="grid grid-cols-3 gap-1">
            {(['low', 'medium', 'high'] as AnomalySeverity[]).map(s => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`py-2 rounded-lg text-xs font-bold border-2 ${
                  severity === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {severityLabel(s)}
              </button>
            ))}
          </div>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="状況を記入"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (desc.trim()) {
                  onAdd(category, severity, desc.trim());
                  setDesc('');
                  setOpen(false);
                }
              }}
              className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold"
            >
              報告
            </button>
            <button
              onClick={() => { setOpen(false); setDesc(''); }}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function categoryLabel(c: AnomalyCategory): string {
  return { vehicle: '車両異常', delay: '遅延', accident: '事故', damage: '荷物破損', near_miss: 'ヒヤリハット', other: 'その他' }[c];
}
function severityLabel(s: AnomalySeverity): string {
  return { low: '軽', medium: '中', high: '重大' }[s];
}

function ReviewTab({
  report,
  deliveries,
  breaks,
  anomalies,
  stats,
  distance,
  vehicleName,
  onSubmit,
}: {
  report: DailyReport;
  deliveries: Delivery[];
  breaks: Break[];
  anomalies: Anomaly[];
  stats: { workHours: string; breakMinutes: number };
  distance: number | null;
  vehicleName?: string;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">日報内容の確認</h3>
        <Row k="日付" v={report.report_date} />
        <Row k="車両" v={vehicleName || '未選択'} />
        <Row k="出勤" v={report.clock_in_at ? fmtHM(report.clock_in_at) : '--'} />
        <Row k="出庫" v={report.depart_at ? fmtHM(report.depart_at) : '--'} />
        <Row k="帰庫" v={report.return_at ? fmtHM(report.return_at) : '--'} />
        <Row k="退勤" v={report.clock_out_at ? fmtHM(report.clock_out_at) : '--'} />
        <Row k="拘束時間" v={stats.workHours} />
        <Row k="走行距離" v={distance !== null ? `${distance} km` : '--'} />
        <Row k="配送件数" v={`${deliveries.length}件`} />
        <Row k="休憩" v={`${breaks.length}回`} />
        <Row k="異常" v={anomalies.length === 0 ? 'なし' : `${anomalies.length}件 ⚠️`} />
        <Row k="給油" v={report.refueled ? 'あり' : 'なし'} />
        <Row k="高速" v={report.used_highway ? '利用' : '未利用'} />
      </div>

      {report.raw_voice_text && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm mb-2">🎤 音声入力（文字起こし）</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{report.raw_voice_text}</p>
        </div>
      )}

      {report.notes && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm mb-2">備考</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{report.notes}</p>
        </div>
      )}

      <div className="sticky bottom-4 px-1">
        <button
          onClick={onSubmit}
          disabled={report.status !== 'draft'}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold shadow-lg disabled:opacity-50 disabled:bg-slate-400"
        >
          {report.status === 'draft' ? '日報を提出する' : '提出済み'}
        </button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-slate-100 pb-1.5 last:border-0">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-slate-900 tabular-nums">{v}</span>
    </div>
  );
}

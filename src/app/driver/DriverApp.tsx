'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TimeButton } from '@/components/TimeButton';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { OdometerCapture } from '@/components/OdometerCapture';
import { RollCallSection } from '@/components/RollCallSection';
import { PhaseStepper, type Phase } from '@/components/PhaseStepper';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import {
  loadDemo, saveDemo, getOrCreateTodayReport, updateReport, uid, todayStr,
  checkCompliance, PRESET_DESTINATIONS, type DemoData,
} from '@/lib/demo-store';
import type {
  DailyReport, Delivery, ExtractedReportFields,
  AnomalyCategory, AnomalySeverity, RollCall,
} from '@/lib/types';

export function DriverApp() {
  const [data, setData] = useState<DemoData | null>(null);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [phase, setPhase] = useState<Phase>('pre');
  const [phaseInitialized, setPhaseInitialized] = useState(false);

  useEffect(() => {
    const d = loadDemo();
    setData(d);
    if (d.currentDriverId) {
      const r = getOrCreateTodayReport(d, d.currentDriverId);
      setReport(r);
    }
  }, []);

  // 現在の自然なフェーズを自動判定（初回のみ）
  useEffect(() => {
    if (!report || phaseInitialized) return;
    if (report.return_at) setPhase('post');
    else if (report.depart_at) setPhase('mid');
    else setPhase('pre');
    setPhaseInitialized(true);
  }, [report, phaseInitialized]);

  if (!data || !report) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">読み込み中</div>;
  }

  const driver = data.profiles.find(p => p.id === data.currentDriverId);
  const drivers = data.profiles.filter(p => p.role === 'driver');
  const deliveries = data.deliveries.filter(d => d.daily_report_id === report.id);
  const breaks = data.breaks.filter(b => b.daily_report_id === report.id);
  const anomalies = data.anomalies.filter(a => a.daily_report_id === report.id);
  const rollCalls = data.roll_calls.filter(r => r.daily_report_id === report.id);
  const preTrip = rollCalls.find(r => r.type === 'pre_trip') || null;
  const postTrip = rollCalls.find(r => r.type === 'post_trip') || null;
  const openBreak = breaks.find(b => b.end_at === null);

  const prevReport = data.reports
    .filter(r => r.driver_id === report.driver_id && r.report_date < report.report_date && r.clock_out_at)
    .sort((a, b) => b.report_date.localeCompare(a.report_date))[0];
  const compliance = checkCompliance(report, breaks, prevReport);

  // フェーズごとの完了状態と進捗
  const preProgress = [
    !!report.vehicle_id,
    !!preTrip,
    !!report.depart_at,
  ];
  const midProgress = [
    deliveries.length > 0,
    !!report.return_at,
  ];
  const postProgress = [
    !!report.clock_out_at,
    !!report.odometer_end,
    !!postTrip,
  ];
  const preDone = preProgress.every(Boolean);
  const midDone = !!report.return_at;
  const postDone = report.status !== 'draft';

  const distance = report.total_distance_km ?? (
    report.odometer_start && report.odometer_end ? report.odometer_end - report.odometer_start : null
  );

  // === actions ===
  function refresh() {
    const d = loadDemo();
    setData(d);
    setReport(d.reports.find(r => r.id === report!.id) || null);
  }
  function patch(p: Partial<DailyReport>) { updateReport(data!, report!.id, p); refresh(); }
  function switchDriver(id: string) {
    const d = { ...data!, currentDriverId: id };
    saveDemo(d); setData(d);
    const r = getOrCreateTodayReport(d, id);
    setReport(r);
    setPhaseInitialized(false);
  }
  function stamp(field: 'clock_in_at' | 'depart_at' | 'return_at' | 'clock_out_at') {
    patch({ [field]: new Date().toISOString() });
  }
  function startBreak() {
    data!.breaks.push({ id: uid('break'), daily_report_id: report!.id, start_at: new Date().toISOString(), end_at: null });
    saveDemo(data!); refresh();
  }
  function endBreak() {
    const open = data!.breaks.find(b => b.daily_report_id === report!.id && b.end_at === null);
    if (open) { open.end_at = new Date().toISOString(); saveDemo(data!); refresh(); }
  }
  function addDelivery(destination: string, cargo?: string) {
    if (!destination.trim()) return;
    data!.deliveries.push({
      id: uid('delivery'), daily_report_id: report!.id,
      destination: destination.trim(),
      arrived_at: new Date().toISOString(), completed_at: null,
      cargo_item: cargo || null, cargo_quantity: null, cargo_weight_kg: null,
      notes: null, receipt_image_url: null,
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
      id: uid('anomaly'), daily_report_id: report!.id,
      category, severity, description, image_url: null, resolved: false,
    });
    saveDemo(data!);
    patch({ has_anomaly: true });
  }
  function saveRollCall(type: 'pre_trip' | 'post_trip', body: Omit<RollCall, 'id' | 'daily_report_id'>) {
    data!.roll_calls = data!.roll_calls.filter(r => !(r.daily_report_id === report!.id && r.type === type));
    data!.roll_calls.push({ id: uid('rc'), daily_report_id: report!.id, ...body });
    saveDemo(data!); refresh();
  }
  function applyAIFields(fields: ExtractedReportFields) {
    const today = todayStr();
    const toIso = (hhmm?: string): string | undefined => {
      if (!hhmm) return undefined;
      const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
      if (!m) return undefined;
      return new Date(`${today}T${m[1].padStart(2, '0')}:${m[2]}:00`).toISOString();
    };
    const p: Partial<DailyReport> = { raw_voice_text: fields.raw_text || null, notes: fields.notes || report!.notes };
    if (typeof fields.refueled === 'boolean') p.refueled = fields.refueled;
    if (typeof fields.refuel_liters === 'number') p.refuel_liters = fields.refuel_liters;
    if (typeof fields.refuel_amount_yen === 'number') p.refuel_amount_yen = fields.refuel_amount_yen;
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
          id: uid('delivery'), daily_report_id: report!.id,
          destination: d.destination,
          arrived_at: toIso(d.arrived_time) || null,
          completed_at: toIso(d.completed_time) || null,
          cargo_item: d.cargo_item || null, cargo_quantity: d.cargo_quantity || null, cargo_weight_kg: null,
          notes: d.notes || null, receipt_image_url: null,
        });
      }
      const newCount = data!.deliveries.filter(x => x.daily_report_id === report!.id).length;
      updateReport(data!, report!.id, { delivery_count: newCount });
    }
    if (fields.breaks) {
      for (const b of fields.breaks) {
        const start = toIso(b.start_time);
        if (!start) continue;
        data!.breaks.push({ id: uid('break'), daily_report_id: report!.id, start_at: start, end_at: toIso(b.end_time) || null });
      }
    }
    if (fields.anomalies) {
      for (const a of fields.anomalies) {
        data!.anomalies.push({
          id: uid('anomaly'), daily_report_id: report!.id,
          category: a.category, severity: a.severity, description: a.description,
          image_url: null, resolved: false,
        });
      }
      if (fields.anomalies.length > 0) updateReport(data!, report!.id, { has_anomaly: true });
    }
    saveDemo(data!); refresh();
  }
  function submit() {
    const issues: string[] = [];
    if (!report!.clock_in_at) issues.push('出勤時刻');
    if (!preTrip) issues.push('出庫前 アルコールチェック');
    if (issues.length > 0) {
      if (!confirm(`未入力の項目があります:\n・${issues.join('\n・')}\n\nこのまま提出しますか？`)) return;
    }
    patch({ status: 'submitted', submitted_at: new Date().toISOString() });
    alert('日報を提出しました');
  }

  // 警告バッジ
  const warnings: Array<{ label: string; level: 'caution' | 'violation' }> = [];
  if (compliance.duty_warning === 'violation') warnings.push({ label: `拘束 ${compliance.duty_hours?.toFixed(1)}h`, level: 'violation' });
  else if (compliance.duty_warning === 'caution') warnings.push({ label: `拘束 ${compliance.duty_hours?.toFixed(1)}h`, level: 'caution' });
  if (compliance.consecutive_drive_warning === 'violation') warnings.push({ label: `連続運転 ${compliance.max_consecutive_drive_min}分`, level: 'violation' });
  else if (compliance.consecutive_drive_warning === 'caution') warnings.push({ label: `連続運転 ${compliance.max_consecutive_drive_min}分`, level: 'caution' });

  const nextPhase = phase === 'pre' ? 'mid' : phase === 'mid' ? 'post' : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-slate-200">
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

        {/* ミニサマリー */}
        <div className="max-w-md mx-auto px-4 pt-2 pb-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-slate-900">{driver?.full_name}</span>
              <span className="text-xs text-slate-500">{formatDateLabel(report.report_date)}</span>
            </div>
            <StatusBadge status={report.status} />
          </div>
          <div className="mt-1.5 flex items-baseline gap-3 text-xs text-slate-500">
            <span>配送 <span className="text-sm font-semibold text-slate-900 tabular-nums">{report.delivery_count}</span></span>
            <span>·</span>
            <span>走行 <span className="text-sm font-semibold text-slate-900 tabular-nums">{distance ?? '—'}</span><span className="text-slate-400 ml-0.5">km</span></span>
            <span>·</span>
            <span>拘束 <span className="text-sm font-semibold text-slate-900 tabular-nums">{compliance.duty_hours?.toFixed(1) ?? '—'}</span><span className="text-slate-400 ml-0.5">h</span></span>
          </div>
          {warnings.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {warnings.map((w, i) => (
                <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  w.level === 'violation' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Icon.Alert className="w-2.5 h-2.5" />{w.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* フェーズステッパー */}
        <div className="max-w-md mx-auto px-4 pb-3">
          <PhaseStepper
            current={phase}
            completed={{ pre: preDone, mid: midDone, post: postDone }}
            progress={{
              pre: preProgress.filter(Boolean).length / preProgress.length,
              mid: midProgress.filter(Boolean).length / midProgress.length,
              post: postProgress.filter(Boolean).length / postProgress.length,
            }}
            onSelect={setPhase}
          />
        </div>
      </header>

      {/* フェーズ別コンテンツ */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {phase === 'pre' && (
          <>
            {/* 車両 */}
            <Card title="車両" status={report.vehicle_id ? 'done' : 'pending'} required>
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
            </Card>

            {/* 出庫前 アルコールチェック */}
            <Card
              title="アルコールチェック"
              status={preTrip ? (preTrip.alcohol_result_ok ? 'done' : 'warning') : 'pending'}
              required
            >
              <RollCallSection type="pre_trip" rollCall={preTrip} onSave={(rc) => saveRollCall('pre_trip', rc)} />
            </Card>

            {/* 出勤・出庫 */}
            <Card title="出勤・出庫" status={report.depart_at ? 'done' : 'pending'}>
              <div className="grid grid-cols-2 gap-2">
                <TimeButton label="出勤" value={report.clock_in_at} onClick={() => stamp('clock_in_at')} />
                <TimeButton label="出庫" value={report.depart_at} onClick={() => stamp('depart_at')} />
              </div>
            </Card>

            {/* 出庫時メーター */}
            <Card title="出庫時メーター" status={report.odometer_start ? 'done' : 'pending'} collapsible defaultOpen={!report.odometer_start}>
              <OdometerCapture
                label="出庫時"
                current={report.odometer_start}
                onConfirm={(v) => patch({ odometer_start: v, total_distance_km: report.odometer_end ? report.odometer_end - v : null })}
              />
            </Card>
          </>
        )}

        {phase === 'mid' && (
          <>
            {/* 配送実績 */}
            <DeliveriesCard
              deliveries={deliveries}
              onAdd={addDelivery}
              onComplete={completeDelivery}
              onDelete={deleteDelivery}
            />

            {/* 休憩 */}
            <Card
              title="休憩"
              status={breaks.length > 0 ? 'done' : 'pending'}
              right={<span className="text-xs text-slate-500">{breaks.length === 0 ? '未記録' : `${breaks.length} 回 / ${compliance.total_break_min}分`}</span>}
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
            </Card>

            {/* 異常報告 */}
            <AnomalyCard anomalies={anomalies} onAdd={addAnomaly} />
          </>
        )}

        {phase === 'post' && (
          <>
            {/* 帰庫・退勤 */}
            <Card title="帰庫・退勤" status={report.clock_out_at ? 'done' : 'pending'} required>
              <div className="grid grid-cols-2 gap-2">
                <TimeButton label="帰庫" value={report.return_at} onClick={() => stamp('return_at')} />
                <TimeButton label="退勤" value={report.clock_out_at} onClick={() => stamp('clock_out_at')} />
              </div>
            </Card>

            {/* 帰庫時メーター + 走行距離表示 */}
            <Card title="帰庫時メーター" status={report.odometer_end ? 'done' : 'pending'}>
              <OdometerCapture
                label="帰庫時"
                current={report.odometer_end}
                onConfirm={(v) => patch({ odometer_end: v, total_distance_km: report.odometer_start ? v - report.odometer_start : null })}
              />
              {distance !== null && distance > 0 && (
                <div className="mt-3 rounded-lg bg-slate-900 text-white p-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">本日の走行距離</span>
                  <span className="text-xl font-semibold tabular-nums tracking-tight">
                    {distance.toLocaleString()}<span className="text-xs text-slate-300 font-normal ml-1">km</span>
                  </span>
                </div>
              )}
            </Card>

            {/* 経費 */}
            <ExpenseCard report={report} onPatch={patch} />

            {/* 退勤前 アルコールチェック */}
            <Card title="退勤前 アルコールチェック" status={postTrip ? 'done' : 'pending'}>
              <RollCallSection type="post_trip" rollCall={postTrip} onSave={(rc) => saveRollCall('post_trip', rc)} />
            </Card>
          </>
        )}
      </main>

      {/* ボトムバー */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3 space-y-2">
          <VoiceRecorder onResult={applyAIFields} />
          {phase !== 'post' ? (
            <button
              onClick={() => nextPhase && setPhase(nextPhase)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
            >
              次のフェーズへ
              <Icon.ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={report.status !== 'draft'}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:bg-slate-200 disabled:text-slate-400 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
            >
              <Icon.Check className="w-4 h-4" />
              {report.status === 'draft' ? '日報を提出' : '提出済み'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== Subcomponents ======

function StatusBadge({ status }: { status: DailyReport['status'] }) {
  const map = {
    draft: { c: 'bg-slate-100 text-slate-600 border-slate-200', t: '下書き' },
    submitted: { c: 'bg-blue-50 text-blue-700 border-blue-200', t: '提出済' },
    approved: { c: 'bg-emerald-50 text-emerald-700 border-emerald-200', t: '承認済' },
  };
  const m = map[status];
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${m.c}`}>{m.t}</span>;
}

function ExpenseCard({ report, onPatch }: { report: DailyReport; onPatch: (p: Partial<DailyReport>) => void }) {
  return (
    <Card title="給油・高速">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onPatch({ refueled: !report.refueled })}
          className={`py-3 rounded-lg text-sm font-medium border transition-all ${
            report.refueled ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
          }`}
        >
          {report.refueled && '✓ '}給油あり
        </button>
        <button
          type="button"
          onClick={() => onPatch({ used_highway: !report.used_highway })}
          className={`py-3 rounded-lg text-sm font-medium border transition-all ${
            report.used_highway ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
          }`}
        >
          {report.used_highway && '✓ '}高速利用
        </button>
      </div>
    </Card>
  );
}

function DeliveriesCard({
  deliveries, onAdd, onComplete, onDelete,
}: {
  deliveries: Delivery[];
  onAdd: (s: string, cargo?: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [destination, setDestination] = useState('');
  const [showAll, setShowAll] = useState(false);

  function submit(name?: string) {
    const target = (name ?? destination).trim();
    if (!target) return;
    onAdd(target);
    setDestination('');
  }

  // 既に追加済みの配送先名
  const usedNames = new Set(deliveries.map(d => d.destination));
  const visibleCount = showAll ? PRESET_DESTINATIONS.length : 6;
  const visiblePresets = PRESET_DESTINATIONS.slice(0, visibleCount);

  // 入力中のフィルタリング候補（自由入力時のサジェスト）
  const suggestions = destination.trim()
    ? PRESET_DESTINATIONS.filter(p => p.includes(destination.trim()) && !usedNames.has(p)).slice(0, 4)
    : [];

  return (
    <Card
      title="配送実績"
      status={deliveries.length > 0 ? 'done' : 'pending'}
      right={<span className="text-xs text-slate-500 tabular-nums">{deliveries.length} 件</span>}
    >
      {/* クイック選択チップ */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">配送先を選ぶ</span>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] text-slate-500 hover:text-slate-900"
          >
            {showAll ? '閉じる' : `他 ${PRESET_DESTINATIONS.length - 6} 件 ▾`}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {visiblePresets.map(name => {
            const used = usedNames.has(name);
            return (
              <button
                key={name}
                onClick={() => !used && submit(name)}
                disabled={used}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  used
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white active:scale-95'
                }`}
              >
                {used && '✓ '}{name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 自由入力（新規配送先） */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex gap-1.5 relative">
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && destination.trim()) submit(); }}
            placeholder="その他の配送先を入力"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <button
            onClick={() => submit()}
            disabled={!destination.trim()}
            className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 text-sm font-medium disabled:bg-slate-200 disabled:text-slate-400 inline-flex items-center transition-all"
          >
            <Icon.Plus className="w-4 h-4" />
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 配送リスト */}
      {deliveries.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-4 mt-3">配送先を選んで追加してください</p>
      ) : (
        <ul className="divide-y divide-slate-100 mt-3 border-t border-slate-100 pt-2">
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
    </Card>
  );
}

function AnomalyCard({
  anomalies, onAdd,
}: {
  anomalies: import('@/lib/types').Anomaly[];
  onAdd: (cat: AnomalyCategory, sev: AnomalySeverity, desc: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState('');

  function add() {
    if (!desc.trim()) return;
    onAdd('other', 'medium', desc.trim());
    setDesc(''); setOpen(false);
  }

  return (
    <Card
      title="異常・トラブル"
      status={anomalies.length > 0 ? 'warning' : 'pending'}
      right={anomalies.length > 0 ? <span className="text-xs font-medium text-red-600">{anomalies.length} 件</span> : null}
    >
      {anomalies.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {anomalies.map(a => (
            <li key={a.id} className="rounded-lg p-2.5 border bg-red-50 border-red-200">
              <div className="flex items-center gap-1.5 text-xs">
                <Icon.Alert className="w-3.5 h-3.5 text-red-600" />
                <p className="text-slate-700">{a.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 py-3 text-sm font-medium inline-flex items-center justify-center gap-2 transition-all"
        >
          <Icon.Plus className="w-4 h-4" />異常を報告
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="例：仙台便で30分遅延、車両右後方ランプ不調"
            rows={3}
            autoFocus
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={add} disabled={!desc.trim()} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:bg-slate-200 disabled:text-slate-400 transition-all">報告</button>
            <button onClick={() => { setOpen(false); setDesc(''); }} className="px-4 py-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm transition-all">取消</button>
          </div>
        </div>
      )}
    </Card>
  );
}

function fmtHM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function formatDateLabel(date: string): string {
  const d = new Date(date);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`;
}

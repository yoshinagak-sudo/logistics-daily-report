'use client';

import { useState } from 'react';
import { Icon } from './Icon';
import type { RollCall, RollCallType, AlcoholCheckMethod, HealthStatus } from '@/lib/types';

interface Props {
  type: RollCallType;
  rollCall: RollCall | null;
  onSave: (rc: Omit<RollCall, 'id' | 'daily_report_id'>) => void;
}

export function RollCallSection({ type, rollCall, onSave }: Props) {
  const [editing, setEditing] = useState(rollCall === null);
  const [method, setMethod] = useState<AlcoholCheckMethod>(rollCall?.alcohol_check_method || 'face_to_face');
  const [detector, setDetector] = useState<boolean>(rollCall?.alcohol_detector_used ?? true);
  const [value, setValue] = useState<string>(rollCall?.alcohol_value_mg !== null && rollCall?.alcohol_value_mg !== undefined ? String(rollCall.alcohol_value_mg) : '0.00');
  const [resultOk, setResultOk] = useState<boolean>(rollCall?.alcohol_result_ok ?? true);
  const [health, setHealth] = useState<HealthStatus>(rollCall?.health_status || 'good');
  const [sleepH, setSleepH] = useState<string>(rollCall?.sleep_hours !== null && rollCall?.sleep_hours !== undefined ? String(rollCall.sleep_hours) : '');
  const [fatigue, setFatigue] = useState<'none' | 'mild' | 'severe'>(rollCall?.fatigue_level || 'none');
  const [notes, setNotes] = useState(rollCall?.notes || '');

  function save() {
    const numValue = parseFloat(value) || 0;
    onSave({
      type,
      performed_at: new Date().toISOString(),
      alcohol_check_method: method,
      alcohol_detector_used: detector,
      alcohol_value_mg: numValue,
      alcohol_result_ok: resultOk && numValue < 0.15,  // 0.15mg/L未満で適正
      health_status: type === 'pre_trip' ? health : null,
      sleep_hours: type === 'pre_trip' && sleepH ? parseFloat(sleepH) : null,
      fatigue_level: type === 'pre_trip' ? fatigue : null,
      confirmed_by_name: null,
      notes: notes || null,
    });
    setEditing(false);
  }

  if (!editing && rollCall) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {rollCall.alcohol_result_ok ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                <Icon.Check className="w-3.5 h-3.5" />酒気帯びなし
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-medium">
                <Icon.Alert className="w-3.5 h-3.5" />要確認
              </span>
            )}
            <span className="text-xs text-slate-500 tabular-nums">{rollCall.alcohol_value_mg?.toFixed(2)} mg/L</span>
          </div>
          <button onClick={() => setEditing(true)} className="text-xs text-slate-500 hover:text-slate-900">
            修正
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Item label="確認方法" value={methodLabel(rollCall.alcohol_check_method)} />
          <Item label="検知器" value={rollCall.alcohol_detector_used ? '使用' : '未使用'} />
          {type === 'pre_trip' && (
            <>
              <Item label="健康状態" value={healthLabel(rollCall.health_status)} />
              <Item label="疲労" value={fatigueLabel(rollCall.fatigue_level)} />
              {rollCall.sleep_hours !== null && (
                <Item label="睡眠" value={`${rollCall.sleep_hours} 時間`} />
              )}
            </>
          )}
        </div>
        {rollCall.notes && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded p-2">{rollCall.notes}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">確認方法</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['face_to_face', 'remote', 'self'] as AlcoholCheckMethod[]).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                method === m ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >{methodLabel(m)}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1.5">
          アルコール検知器（必須）
          <button onClick={() => setDetector(!detector)} className="text-slate-700">
            {detector ? '使用' : '未使用'}
          </button>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">数値（mg/L）</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full text-2xl font-semibold tabular-nums tracking-tight rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">判定</label>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setResultOk(true)}
                className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                  resultOk ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >適正</button>
              <button
                onClick={() => setResultOk(false)}
                className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                  !resultOk ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >要対応</button>
            </div>
          </div>
        </div>
      </div>

      {type === 'pre_trip' && (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">健康状態</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['good', 'normal', 'poor'] as HealthStatus[]).map(h => (
                <button
                  key={h}
                  onClick={() => setHealth(h)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                    health === h ?
                      h === 'poor' ? 'bg-red-600 text-white border-red-600' :
                      h === 'normal' ? 'bg-amber-500 text-white border-amber-500' :
                      'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >{healthLabel(h)}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">疲労度</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['none', 'mild', 'severe'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFatigue(f)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                    fatigue === f ?
                      f === 'severe' ? 'bg-red-600 text-white border-red-600' :
                      f === 'mild' ? 'bg-amber-500 text-white border-amber-500' :
                      'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >{fatigueLabel(f)}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">睡眠時間（時間）</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={sleepH}
              onChange={(e) => setSleepH(e.target.value)}
              placeholder="例: 7"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </>
      )}

      <button
        onClick={save}
        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all"
      >
        記録する
      </button>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded px-2 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function methodLabel(m: AlcoholCheckMethod): string {
  return { face_to_face: '対面', remote: '遠隔', self: '自己確認' }[m];
}
function healthLabel(h: HealthStatus | null): string {
  return h ? { good: '良好', normal: '普通', poor: '不良' }[h] : '—';
}
function fatigueLabel(f: 'none' | 'mild' | 'severe' | null): string {
  return f ? { none: 'なし', mild: '軽度', severe: '重度' }[f] : '—';
}

'use client';

import { useState } from 'react';
import { Icon } from './Icon';
import type { RollCall, RollCallType } from '@/lib/types';

interface Props {
  type: RollCallType;
  rollCall: RollCall | null;
  onSave: (rc: Omit<RollCall, 'id' | 'daily_report_id'>) => void;
}

// デモ用: アルコールチェックのみ簡素化
export function RollCallSection({ type, rollCall, onSave }: Props) {
  const [editing, setEditing] = useState(rollCall === null);
  const [value, setValue] = useState<string>(
    rollCall?.alcohol_value_mg !== null && rollCall?.alcohol_value_mg !== undefined
      ? rollCall.alcohol_value_mg.toFixed(2)
      : '0.00'
  );

  function save() {
    const numValue = parseFloat(value) || 0;
    onSave({
      type,
      performed_at: new Date().toISOString(),
      alcohol_check_method: 'face_to_face',
      alcohol_detector_used: true,
      alcohol_value_mg: numValue,
      alcohol_result_ok: numValue < 0.15,
      health_status: null,
      sleep_hours: null,
      fatigue_level: null,
      confirmed_by_name: null,
      notes: null,
    });
    setEditing(false);
  }

  if (!editing && rollCall) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {rollCall.alcohol_result_ok ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
              <Icon.Check className="w-3.5 h-3.5" />適正
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-medium">
              <Icon.Alert className="w-3.5 h-3.5" />要対応
            </span>
          )}
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
            {rollCall.alcohol_value_mg?.toFixed(2)}
            <span className="text-xs font-normal text-slate-400 ml-1">mg/L</span>
          </span>
        </div>
        <button onClick={() => setEditing(true)} className="text-xs text-slate-500 hover:text-slate-900">
          修正
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">アルコール検知器の数値（mg/L）</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full text-3xl font-semibold tabular-nums tracking-tight rounded-lg border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 text-center"
        />
        <p className="text-[11px] text-slate-400 mt-1.5 text-center">0.15 mg/L 以上は乗務不可</p>
      </div>

      <button
        onClick={save}
        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all"
      >
        記録する
      </button>
    </div>
  );
}

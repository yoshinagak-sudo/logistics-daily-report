'use client';

import { useState } from 'react';
import { Icon } from './Icon';
import type { VehicleInspection } from '@/lib/types';

const ITEMS: Array<{ key: keyof VehicleInspection; label: string; refrigeration?: boolean }> = [
  { key: 'brake_ok', label: 'ブレーキ' },
  { key: 'tire_pressure_ok', label: 'タイヤ空気圧' },
  { key: 'tire_damage_ok', label: 'タイヤ損傷・摩耗' },
  { key: 'lights_ok', label: 'ライト類' },
  { key: 'engine_oil_ok', label: 'エンジンオイル' },
  { key: 'coolant_ok', label: '冷却水' },
  { key: 'battery_ok', label: 'バッテリー' },
  { key: 'washer_fluid_ok', label: 'ウィンドウォッシャー液' },
  { key: 'wipers_ok', label: 'ワイパー' },
  { key: 'body_damage_ok', label: '車体・荷台' },
];

interface Props {
  inspection: VehicleInspection | null;
  isRefrigerated?: boolean;
  onSave: (i: Omit<VehicleInspection, 'id' | 'daily_report_id' | 'inspection_type'>) => void;
}

export function InspectionSection({ inspection, isRefrigerated, onSave }: Props) {
  const [editing, setEditing] = useState(inspection === null);
  const initial: Record<string, boolean | null> = {};
  ITEMS.forEach(i => { initial[i.key] = (inspection?.[i.key] as boolean | null) ?? null; });
  const [checks, setChecks] = useState<Record<string, boolean | null>>(initial);
  const [obdWarning, setObdWarning] = useState<boolean | null>(inspection?.obd_warning ?? false);
  const [refrigerationTemp, setRefrigerationTemp] = useState<string>(
    inspection?.refrigeration_temp_c !== null && inspection?.refrigeration_temp_c !== undefined ? String(inspection.refrigeration_temp_c) : ''
  );
  const [notes, setNotes] = useState(inspection?.notes || '');

  function setItem(key: string, ok: boolean) {
    setChecks(prev => ({ ...prev, [key]: ok }));
  }

  function checkAll() {
    const all: Record<string, boolean | null> = {};
    ITEMS.forEach(i => { all[i.key] = true; });
    setChecks(all);
    setObdWarning(false);
  }

  function save() {
    const data: Omit<VehicleInspection, 'id' | 'daily_report_id' | 'inspection_type'> = {
      brake_ok: checks.brake_ok ?? null,
      tire_pressure_ok: checks.tire_pressure_ok ?? null,
      tire_damage_ok: checks.tire_damage_ok ?? null,
      battery_ok: checks.battery_ok ?? null,
      engine_oil_ok: checks.engine_oil_ok ?? null,
      coolant_ok: checks.coolant_ok ?? null,
      washer_fluid_ok: checks.washer_fluid_ok ?? null,
      lights_ok: checks.lights_ok ?? null,
      wipers_ok: checks.wipers_ok ?? null,
      obd_warning: obdWarning,
      body_damage_ok: checks.body_damage_ok ?? null,
      refrigeration_temp_c: refrigerationTemp ? parseFloat(refrigerationTemp) : null,
      notes: notes || null,
      image_url: null,
      created_at: new Date().toISOString(),
    };
    onSave(data);
    setEditing(false);
  }

  if (!editing && inspection) {
    const allOk = ITEMS.every(i => inspection[i.key] === true) && !inspection.obd_warning;
    const ngItems = ITEMS.filter(i => inspection[i.key] === false).map(i => i.label);
    if (inspection.obd_warning) ngItems.push('OBD警告灯');
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {allOk ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
              <Icon.Check className="w-3.5 h-3.5" />全項目 異常なし
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-medium">
              <Icon.Alert className="w-3.5 h-3.5" />{ngItems.length} 項目に異常
            </span>
          )}
          <button onClick={() => setEditing(true)} className="text-xs text-slate-500 hover:text-slate-900">修正</button>
        </div>
        {ngItems.length > 0 && (
          <p className="text-xs text-slate-700 bg-red-50 rounded p-2">
            異常: {ngItems.join('、')}
          </p>
        )}
        {inspection.refrigeration_temp_c !== null && (
          <p className="text-xs text-slate-600">
            冷凍温度: <span className="font-medium tabular-nums">{inspection.refrigeration_temp_c}℃</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={checkAll}
        className="w-full py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium hover:bg-emerald-100 transition-all"
      >
        ✓ 全項目「異常なし」を一括チェック
      </button>

      <div className="space-y-1.5">
        {ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-slate-700">{item.label}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setItem(item.key, true)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  checks[item.key] === true ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'
                }`}
              >正常</button>
              <button
                onClick={() => setItem(item.key, false)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  checks[item.key] === false ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-500 border-slate-200'
                }`}
              >異常</button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between py-1.5 pt-2 border-t border-slate-100">
          <span className="text-sm text-slate-700">OBD警告灯</span>
          <div className="flex gap-1">
            <button
              onClick={() => setObdWarning(false)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                obdWarning === false ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'
              }`}
            >消灯</button>
            <button
              onClick={() => setObdWarning(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                obdWarning === true ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-500 border-slate-200'
              }`}
            >点灯</button>
          </div>
        </div>
      </div>

      {isRefrigerated && (
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">冷凍温度（℃）</label>
          <input
            type="number"
            step="0.1"
            value={refrigerationTemp}
            onChange={(e) => setRefrigerationTemp(e.target.value)}
            placeholder="例: -18"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">備考</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="異常があった場合の詳細"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
        />
      </div>

      <button
        onClick={save}
        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all"
      >
        点検を記録
      </button>
    </div>
  );
}

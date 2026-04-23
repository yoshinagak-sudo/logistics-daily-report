'use client';

import { Icon } from './Icon';

export type Phase = 'pre' | 'mid' | 'post';

interface Props {
  current: Phase;
  completed: { pre: boolean; mid: boolean; post: boolean };
  progress: { pre: number; mid: number; post: number };  // 0..1
  onSelect: (p: Phase) => void;
}

const STEPS: Array<{ key: Phase; label: string; sub: string }> = [
  { key: 'pre', label: '出庫前', sub: '点呼・点検' },
  { key: 'mid', label: '運行中', sub: '配送・休憩' },
  { key: 'post', label: '帰庫後', sub: '経費・提出' },
];

export function PhaseStepper({ current, completed, progress, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {STEPS.map((s, idx) => {
        const isCurrent = current === s.key;
        const isCompleted = completed[s.key];
        const pct = Math.round(progress[s.key] * 100);
        return (
          <button
            key={s.key}
            onClick={() => onSelect(s.key)}
            className={`group rounded-xl border p-2.5 text-left transition-all ${
              isCurrent
                ? 'bg-slate-900 border-slate-900 text-white'
                : isCompleted
                  ? 'bg-white border-emerald-300 hover:border-emerald-400'
                  : 'bg-white border-slate-200 hover:border-slate-400'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold ${
                isCurrent
                  ? 'bg-white text-slate-900'
                  : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500'
              }`}>
                {isCompleted ? <Icon.Check className="w-3 h-3" strokeWidth={3} /> : idx + 1}
              </span>
              <span className={`text-xs font-semibold tracking-wide ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                {s.label}
              </span>
            </div>
            <div className={`text-[10px] mb-1.5 ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>{s.sub}</div>
            <div className={`h-1 rounded-full overflow-hidden ${isCurrent ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div
                className={`h-full transition-all ${
                  isCurrent ? 'bg-blue-400' : isCompleted ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

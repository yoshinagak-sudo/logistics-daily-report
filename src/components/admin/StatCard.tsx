'use client';

import { Icon } from '../Icon';

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  trend?: { value: number; label: string };  // % 変化
  highlight?: 'ok' | 'warn' | 'alert';
  IconComp?: React.ComponentType<{ className?: string }>;
}

export function StatCard({ label, value, unit, sub, trend, highlight, IconComp }: Props) {
  const accent = highlight === 'alert' ? 'border-l-red-500'
    : highlight === 'warn' ? 'border-l-amber-500'
    : 'border-l-blue-500';
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${accent} p-4`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-medium text-slate-500 tracking-wider uppercase">{label}</span>
        {IconComp && (
          <span className="text-slate-300">
            <IconComp className="w-4 h-4" />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-slate-900 tabular-nums tracking-tight">{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
            trend.value > 0 ? 'text-emerald-600' : trend.value < 0 ? 'text-red-600' : 'text-slate-500'
          }`}>
            {trend.value > 0 ? '↑' : trend.value < 0 ? '↓' : '·'} {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
    </div>
  );
}

export function AlertItem({
  severity, title, description, date, onClick,
}: {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  date?: string;
  onClick?: () => void;
}) {
  const sevColor = severity === 'high' ? 'bg-red-500' : severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400';
  const sevLabel = severity === 'high' ? '重大' : severity === 'medium' ? '中' : '軽';
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <span className={`shrink-0 w-1 self-stretch rounded-full ${sevColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            severity === 'high' ? 'bg-red-100 text-red-700' :
            severity === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>{sevLabel}</span>
          <span className="text-sm font-semibold text-slate-900 truncate">{title}</span>
        </div>
        <div className="text-xs text-slate-600 line-clamp-2">{description}</div>
        {date && <div className="text-[10px] text-slate-400 mt-1 tabular-nums">{date}</div>}
      </div>
      <Icon.ArrowRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
    </button>
  );
}

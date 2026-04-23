'use client';

import Link from 'next/link';
import { Icon } from '../Icon';

export type AdminTab = 'overview' | 'drivers' | 'vehicles' | 'anomalies' | 'ai';

interface Props {
  active: AdminTab;
  onChange: (t: AdminTab) => void;
  badges?: Partial<Record<AdminTab, number>>;
}

const NAV: Array<{
  key: AdminTab;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  { key: 'overview', label: '概要', Icon: Icon.Chart },
  { key: 'drivers', label: 'ドライバー', Icon: Icon.Truck },
  { key: 'vehicles', label: '車両', Icon: Icon.Truck },
  { key: 'anomalies', label: '異常報告', Icon: Icon.Alert },
  { key: 'ai', label: 'AI要約', Icon: Icon.Sparkles },
];

export function Sidebar({ active, onChange, badges }: Props) {
  return (
    <aside className="hidden md:flex flex-col w-56 bg-slate-950 text-slate-300 border-r border-slate-800 shrink-0">
      <Link href="/" className="flex items-center gap-2 h-14 px-5 border-b border-slate-800 hover:bg-slate-900 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
          <Icon.Truck className="w-4 h-4" />
        </div>
        <div>
          <div className="text-white text-sm font-semibold tracking-tight">物流AI日報</div>
          <div className="text-[10px] text-slate-500">管理ダッシュボード</div>
        </div>
      </Link>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ key, label, Icon: I }) => {
          const isActive = active === key;
          const badge = badges?.[key];
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <I className="w-4 h-4" />
              <span className="flex-1 text-left">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <Link
          href="/driver"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
        >
          <Icon.ArrowLeft className="w-4 h-4" />
          ドライバー画面
        </Link>
      </div>
    </aside>
  );
}

export function MobileTabBar({ active, onChange, badges }: Props) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 grid grid-cols-5">
      {NAV.map(({ key, label, Icon: I }) => {
        const isActive = active === key;
        const badge = badges?.[key];
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex flex-col items-center justify-center py-2 text-[10px] font-medium relative ${
              isActive ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <I className="w-5 h-5 mb-0.5" />
            <span>{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="absolute top-1 right-1/4 px-1 py-0 bg-red-500 text-white rounded-full text-[8px] font-bold min-w-[14px] text-center">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

'use client';

import { useState } from 'react';
import { Icon } from './Icon';

interface CardProps {
  title: string;
  status?: 'done' | 'pending' | 'warning';
  required?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}

export function Card({ title, status, required, collapsible, defaultOpen = true, right, children }: CardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 ${collapsible ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'} transition-colors`}
      >
        <div className="flex items-center gap-2">
          {status === 'done' && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white">
              <Icon.Check className="w-3 h-3" strokeWidth={3} />
            </span>
          )}
          {status === 'warning' && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white">
              <Icon.Alert className="w-3 h-3" strokeWidth={2.5} />
            </span>
          )}
          {status === 'pending' && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-slate-300" />
          )}
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
          {required && <span className="text-[10px] font-medium text-red-500 px-1.5 py-0.5 bg-red-50 rounded">必須</span>}
        </div>
        <div className="flex items-center gap-2">
          {right}
          {collapsible && (
            <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">{children}</div>
      )}
    </section>
  );
}

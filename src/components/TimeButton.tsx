'use client';

interface Props {
  label: string;
  value: string | null;
  onClick: () => void;
}

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TimeButton({ label, value, onClick }: Props) {
  const filled = value !== null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-xl border p-4 text-left transition-all active:scale-[0.98] ${
        filled
          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:shadow-sm'
      }`}
    >
      <div className={`text-xs font-medium tracking-wide ${filled ? 'text-slate-300' : 'text-slate-500'}`}>
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums mt-1 tracking-tight">
        {formatTime(value)}
      </div>
    </button>
  );
}

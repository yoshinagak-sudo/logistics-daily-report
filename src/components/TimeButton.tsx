'use client';

interface Props {
  label: string;
  value: string | null;
  onClick: () => void;
  color?: 'blue' | 'emerald' | 'amber' | 'rose';
}

const colorMap = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
  amber: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
  rose: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
};

const filledMap = {
  blue: 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700',
  emerald: 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700',
  amber: 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700',
  rose: 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700',
};

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function TimeButton({ label, value, onClick, color = 'blue' }: Props) {
  const filled = value !== null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border-2 p-3 transition-all active:scale-95 ${
        filled ? filledMap[color] : colorMap[color]
      }`}
    >
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-0.5">{formatTime(value)}</div>
    </button>
  );
}

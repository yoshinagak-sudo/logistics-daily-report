// 軽量アイコンセット（SVG）
// Lucide風のシンプルなライン

interface Props {
  className?: string;
  strokeWidth?: number;
}

const base = (children: React.ReactNode, className = 'w-5 h-5', sw = 1.75) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const Icon = {
  Truck: ({ className, strokeWidth }: Props) => base(
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </>,
    className, strokeWidth
  ),
  Chart: ({ className, strokeWidth }: Props) => base(
    <>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" rx="1" />
      <rect x="13" y="8" width="3" height="10" rx="1" />
      <rect x="19" y="5" width="0" height="13" rx="0" />
    </>,
    className, strokeWidth
  ),
  Mic: ({ className, strokeWidth }: Props) => base(
    <>
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v4" />
    </>,
    className, strokeWidth
  ),
  Camera: ({ className, strokeWidth }: Props) => base(
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>,
    className, strokeWidth
  ),
  Stop: ({ className, strokeWidth }: Props) => base(
    <rect x="6" y="6" width="12" height="12" rx="1" />,
    className, strokeWidth
  ),
  Plus: ({ className, strokeWidth }: Props) => base(
    <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    className, strokeWidth
  ),
  Check: ({ className, strokeWidth }: Props) => base(
    <path d="M20 6 9 17l-5-5" />,
    className, strokeWidth
  ),
  X: ({ className, strokeWidth }: Props) => base(
    <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    className, strokeWidth
  ),
  Alert: ({ className, strokeWidth }: Props) => base(
    <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
    className, strokeWidth
  ),
  Coffee: ({ className, strokeWidth }: Props) => base(
    <><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" /><path d="M6 2v3" /><path d="M10 2v3" /><path d="M14 2v3" /></>,
    className, strokeWidth
  ),
  Download: ({ className, strokeWidth }: Props) => base(
    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    className, strokeWidth
  ),
  Refresh: ({ className, strokeWidth }: Props) => base(
    <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>,
    className, strokeWidth
  ),
  ArrowLeft: ({ className, strokeWidth }: Props) => base(
    <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
    className, strokeWidth
  ),
  ArrowRight: ({ className, strokeWidth }: Props) => base(
    <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    className, strokeWidth
  ),
  Sparkles: ({ className, strokeWidth }: Props) => base(
    <><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" /></>,
    className, strokeWidth
  ),
  Edit: ({ className, strokeWidth }: Props) => base(
    <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    className, strokeWidth
  ),
};

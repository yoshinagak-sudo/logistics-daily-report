'use client';

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = {
  blue: '#2563eb',
  emerald: '#059669',
  amber: '#d97706',
  red: '#dc2626',
  violet: '#7c3aed',
  slate: '#475569',
};

const CHART_COLORS = [COLORS.blue, COLORS.emerald, COLORS.amber, COLORS.red, COLORS.violet];

const tickStyle = { fontSize: 11, fill: '#64748b' };
const gridStyle = { stroke: '#e2e8f0', strokeDasharray: '3 3' };

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="font-semibold text-slate-900 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}</span>
          <span className="font-semibold text-slate-900 tabular-nums ml-auto">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// recharts v3 系の dataKey 型と日本語キーが衝突するため as never でキャスト
// rechartsへ渡す配列。具体的な型のオブジェクト配列を受けるため緩める
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Array<Record<string, any>>;

export function TrendLineChart({ data, lines, height = 220 }: {
  data: AnyData;
  lines: Array<{ key: string; label: string; color?: string }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey={'date' as never} tick={tickStyle} axisLine={false} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key as never}
            name={l.label}
            stroke={l.color || CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StackedBarChart({ data, bars, height = 220 }: {
  data: AnyData;
  bars: Array<{ key: string; label: string; color?: string }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey={'date' as never} tick={tickStyle} axisLine={false} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key as never}
            name={b.label}
            fill={b.color || CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
            stackId="a"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaTrendChart({ data, dataKey, label, color = COLORS.blue, height = 180 }: {
  data: AnyData;
  dataKey: string;
  label: string;
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey={'date' as never} tick={tickStyle} axisLine={false} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey as never}
          name={label}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${dataKey})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 180 }: {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={2}
          dataKey={'value' as never}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color || CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;
            const p = payload[0];
            const pct = total > 0 ? Math.round((p.value as number) / total * 100) : 0;
            return (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                <div className="font-semibold text-slate-900">{p.name}</div>
                <div className="tabular-nums">{p.value} 件 · {pct}%</div>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

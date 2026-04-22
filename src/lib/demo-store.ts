// デモモード用ストア（localStorage）
// Supabase未設定でもフル機能を体験できる

import type {
  DailyReport, Delivery, Break, Anomaly, Profile, Vehicle,
  RollCall, VehicleInspection, ComplianceCheck,
} from './types';

const KEY = 'logistics-demo-data';
const STORAGE_VERSION = 2;  // スキーマ変更時にインクリメント

export interface DemoData {
  version: number;
  profiles: Profile[];
  vehicles: Vehicle[];
  reports: DailyReport[];
  deliveries: Delivery[];
  breaks: Break[];
  anomalies: Anomaly[];
  roll_calls: RollCall[];
  inspections: VehicleInspection[];
  currentDriverId: string | null;
}

const COMPANY_ID = 'demo-company';

const SEED: DemoData = {
  version: STORAGE_VERSION,
  profiles: [
    { id: 'driver-sato', company_id: COMPANY_ID, full_name: '佐藤 健一', role: 'driver', phone: null },
    { id: 'driver-suzuki', company_id: COMPANY_ID, full_name: '鈴木 一郎', role: 'driver', phone: null },
    { id: 'driver-takahashi', company_id: COMPANY_ID, full_name: '高橋 大輔', role: 'driver', phone: null },
    { id: 'admin-yamada', company_id: COMPANY_ID, full_name: '山田 管理者', role: 'admin', phone: null },
  ],
  vehicles: [
    { id: 'v-101', company_id: COMPANY_ID, number_plate: '101号車', nickname: '2tトラック', vehicle_type: '2tトラック', is_active: true },
    { id: 'v-102', company_id: COMPANY_ID, number_plate: '102号車', nickname: '4tトラック', vehicle_type: '4tトラック', is_active: true },
    { id: 'v-103', company_id: COMPANY_ID, number_plate: '103号車', nickname: '冷凍車', vehicle_type: '冷凍車', is_active: true },
  ],
  reports: [],
  deliveries: [],
  breaks: [],
  anomalies: [],
  roll_calls: [],
  inspections: [],
  currentDriverId: 'driver-sato',
};

export function loadDemo(): DemoData {
  if (typeof window === 'undefined') return SEED;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      window.localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    const parsed = JSON.parse(raw);
    // バージョン違いはリセット
    if (parsed.version !== STORAGE_VERSION) {
      window.localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return { ...SEED, ...parsed };
  } catch {
    return SEED;
  }
}

export function saveDemo(data: DemoData): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export function resetDemo(): DemoData {
  if (typeof window === 'undefined') return SEED;
  window.localStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
}

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getOrCreateTodayReport(data: DemoData, driverId: string): DailyReport {
  const date = todayStr();
  const existing = data.reports.find(r => r.driver_id === driverId && r.report_date === date);
  if (existing) return existing;
  const report: DailyReport = {
    id: uid('report'),
    company_id: COMPANY_ID,
    driver_id: driverId,
    vehicle_id: null,
    report_date: date,
    clock_in_at: null,
    depart_at: null,
    return_at: null,
    clock_out_at: null,
    odometer_start: null,
    odometer_end: null,
    total_distance_km: null,
    delivery_count: 0,
    refueled: false,
    refuel_liters: null,
    refuel_amount_yen: null,
    refuel_station: null,
    used_highway: false,
    highway_fee_yen: null,
    has_anomaly: false,
    notes: null,
    ai_summary: null,
    raw_voice_text: null,
    status: 'draft',
    submitted_at: null,
    approved_at: null,
    approved_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  data.reports.push(report);
  saveDemo(data);
  return report;
}

export function updateReport(data: DemoData, reportId: string, patch: Partial<DailyReport>): DailyReport {
  const idx = data.reports.findIndex(r => r.id === reportId);
  if (idx < 0) throw new Error('Report not found');
  data.reports[idx] = { ...data.reports[idx], ...patch, updated_at: new Date().toISOString() };
  saveDemo(data);
  return data.reports[idx];
}

// 改善基準告示のチェック
export function checkCompliance(
  report: DailyReport,
  breaks: Break[],
  prevReport?: DailyReport,
): ComplianceCheck {
  const result: ComplianceCheck = {
    duty_hours: null,
    duty_warning: null,
    max_consecutive_drive_min: null,
    consecutive_drive_warning: null,
    total_break_min: 0,
    rest_hours: null,
    rest_warning: null,
  };

  // 拘束時間
  if (report.clock_in_at) {
    const startMs = new Date(report.clock_in_at).getTime();
    const endMs = report.clock_out_at ? new Date(report.clock_out_at).getTime() : Date.now();
    const dutyH = (endMs - startMs) / 3600000;
    result.duty_hours = dutyH;
    if (dutyH > 15) result.duty_warning = 'violation';
    else if (dutyH > 13) result.duty_warning = 'caution';
    else result.duty_warning = 'ok';
  }

  // 休憩合計
  let totalBreakMs = 0;
  for (const b of breaks) {
    if (b.end_at) totalBreakMs += new Date(b.end_at).getTime() - new Date(b.start_at).getTime();
  }
  result.total_break_min = Math.round(totalBreakMs / 60000);

  // 連続運転時間（出庫〜帰庫の間で、休憩を挟まずに連続した最大時間）
  if (report.depart_at) {
    const departMs = new Date(report.depart_at).getTime();
    const returnMs = report.return_at ? new Date(report.return_at).getTime() : Date.now();
    // 休憩で区切る
    const segments: Array<{ start: number; end: number }> = [];
    const sortedBreaks = [...breaks]
      .filter(b => new Date(b.start_at).getTime() >= departMs && new Date(b.start_at).getTime() <= returnMs)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    let cursor = departMs;
    for (const br of sortedBreaks) {
      const brStart = new Date(br.start_at).getTime();
      if (brStart > cursor) segments.push({ start: cursor, end: brStart });
      if (br.end_at) cursor = new Date(br.end_at).getTime();
    }
    if (returnMs > cursor) segments.push({ start: cursor, end: returnMs });
    const maxMin = segments.reduce((max, s) => Math.max(max, (s.end - s.start) / 60000), 0);
    result.max_consecutive_drive_min = Math.round(maxMin);
    if (maxMin > 240) result.consecutive_drive_warning = 'violation';
    else if (maxMin > 210) result.consecutive_drive_warning = 'caution';
    else result.consecutive_drive_warning = 'ok';
  }

  // 直前の休息期間
  if (prevReport?.clock_out_at && report.clock_in_at) {
    const restH = (new Date(report.clock_in_at).getTime() - new Date(prevReport.clock_out_at).getTime()) / 3600000;
    result.rest_hours = restH;
    if (restH < 9) result.rest_warning = 'violation';
    else if (restH < 11) result.rest_warning = 'caution';
    else result.rest_warning = 'ok';
  }

  return result;
}

// デモモード用ストア（localStorage）
// Supabase未設定でもフル機能を体験できる

import type { DailyReport, Delivery, Break, Anomaly, Profile, Vehicle } from './types';

const KEY = 'logistics-demo-data';

export interface DemoData {
  profiles: Profile[];
  vehicles: Vehicle[];
  reports: DailyReport[];
  deliveries: Delivery[];
  breaks: Break[];
  anomalies: Anomaly[];
  currentDriverId: string | null;
}

const COMPANY_ID = 'demo-company';

const SEED: DemoData = {
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

// 今日の日報を取得 or 新規作成
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
    used_highway: false,
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

// デモモード用ストア（localStorage）
// Supabase未設定でもフル機能を体験できる

import type {
  DailyReport, Delivery, Break, Anomaly, Profile, Vehicle,
  RollCall, VehicleInspection, ComplianceCheck,
} from './types';

const KEY = 'logistics-demo-data';
const STORAGE_VERSION = 3;  // スキーマ変更時にインクリメント

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

// よく使う配送先（デモ用プリセット）
export const PRESET_DESTINATIONS = [
  '仙台中央市場',
  '名取センター',
  '高倉町（仙台店）',
  'ワイズマート 本店',
  '服部 物流DC',
  '山形営業所',
  '福島デポ',
  '郡山倉庫',
  'イオン泉中央',
  'イトーヨーカドー仙台店',
  'ヨークベニマル長町',
  'マルチョウ大和田',
];

const PROFILES: Profile[] = [
  { id: 'driver-sato', company_id: COMPANY_ID, full_name: '佐藤 健一', role: 'driver', phone: null },
  { id: 'driver-suzuki', company_id: COMPANY_ID, full_name: '鈴木 一郎', role: 'driver', phone: null },
  { id: 'driver-takahashi', company_id: COMPANY_ID, full_name: '高橋 大輔', role: 'driver', phone: null },
  { id: 'admin-yamada', company_id: COMPANY_ID, full_name: '山田 管理者', role: 'admin', phone: null },
];

const VEHICLES: Vehicle[] = [
  { id: 'v-101', company_id: COMPANY_ID, number_plate: '101号車', nickname: '2tトラック', vehicle_type: '2tトラック', is_active: true },
  { id: 'v-102', company_id: COMPANY_ID, number_plate: '102号車', nickname: '4tトラック', vehicle_type: '4tトラック', is_active: true },
  { id: 'v-103', company_id: COMPANY_ID, number_plate: '103号車', nickname: '冷凍車', vehicle_type: '冷凍車', is_active: true },
];

// === サンプル日報生成 ===
// 過去5日分 × 3ドライバー = 15件のサンプル
function buildSeedReports(): {
  reports: DailyReport[];
  deliveries: Delivery[];
  breaks: Break[];
  anomalies: Anomaly[];
  roll_calls: RollCall[];
} {
  const reports: DailyReport[] = [];
  const deliveries: Delivery[] = [];
  const breaks: Break[] = [];
  const anomalies: Anomaly[] = [];
  const roll_calls: RollCall[] = [];

  const drivers = [
    { id: 'driver-sato', vehicleId: 'v-101', odoBase: 124000 },
    { id: 'driver-suzuki', vehicleId: 'v-102', odoBase: 89500 },
    { id: 'driver-takahashi', vehicleId: 'v-103', odoBase: 156200 },
  ];

  function dateAt(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function isoAt(daysAgo: number, hh: number, mm: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  }

  // 過去4日分は全員提出済みの通常パターン
  for (let dayAgo = 4; dayAgo >= 1; dayAgo--) {
    drivers.forEach((dv, dIdx) => {
      const reportId = `seed-r-${dayAgo}-${dv.id}`;
      const odoStart = dv.odoBase + (4 - dayAgo) * 150 + dIdx * 30;
      const distance = 130 + Math.floor(Math.random() * 50);
      const odoEnd = odoStart + distance;
      const departHour = 8;
      const departMin = [0, 15, 30][dIdx];
      const returnHour = 17;
      const returnMin = [10, 25, 40][dIdx];
      const isBigDay = dayAgo === 2 && dIdx === 1;  // 拘束時間長い日

      reports.push({
        id: reportId, company_id: COMPANY_ID, driver_id: dv.id, vehicle_id: dv.vehicleId,
        report_date: dateAt(dayAgo),
        clock_in_at: isoAt(dayAgo, 7, 30),
        depart_at: isoAt(dayAgo, departHour, departMin),
        return_at: isoAt(dayAgo, isBigDay ? 19 : returnHour, isBigDay ? 50 : returnMin),
        clock_out_at: isoAt(dayAgo, isBigDay ? 20 : 17, isBigDay ? 30 : 50),
        odometer_start: odoStart, odometer_end: odoEnd, total_distance_km: distance,
        delivery_count: 0,  // 後で更新
        refueled: dayAgo === 3 && dIdx === 0, refuel_liters: null, refuel_amount_yen: null, refuel_station: null,
        used_highway: dIdx === 1, highway_fee_yen: null,
        has_anomaly: false,
        notes: null, ai_summary: null, raw_voice_text: null,
        status: 'submitted',
        submitted_at: isoAt(dayAgo, 18, 0),
        approved_at: null, approved_by: null,
        created_at: isoAt(dayAgo, 7, 30), updated_at: isoAt(dayAgo, 18, 0),
      });

      // 配送3-5件
      const destPool = ['仙台中央市場', '名取センター', '高倉町（仙台店）', 'ワイズマート 本店', '服部 物流DC', 'イオン泉中央', 'ヨークベニマル長町'];
      const numDeliveries = 3 + ((dayAgo + dIdx) % 3);
      for (let i = 0; i < numDeliveries; i++) {
        const arrHour = 9 + i * 2;
        deliveries.push({
          id: `seed-d-${reportId}-${i}`, daily_report_id: reportId,
          destination: destPool[(dayAgo * 2 + dIdx + i) % destPool.length],
          arrived_at: isoAt(dayAgo, arrHour, 15),
          completed_at: isoAt(dayAgo, arrHour, 35),
          cargo_item: null, cargo_quantity: null, cargo_weight_kg: null,
          notes: null, receipt_image_url: null,
        });
      }
      reports[reports.length - 1].delivery_count = numDeliveries;

      // 休憩
      breaks.push({
        id: `seed-b-${reportId}`, daily_report_id: reportId,
        start_at: isoAt(dayAgo, 12, 0), end_at: isoAt(dayAgo, 13, 0),
      });

      // 点呼（出庫前 + 退勤前）
      roll_calls.push({
        id: `seed-rc-pre-${reportId}`, daily_report_id: reportId,
        type: 'pre_trip', performed_at: isoAt(dayAgo, 7, 35),
        alcohol_check_method: 'face_to_face', alcohol_detector_used: true,
        alcohol_value_mg: 0, alcohol_result_ok: true,
        health_status: null, sleep_hours: null, fatigue_level: null,
        confirmed_by_name: null, notes: null,
      });
      roll_calls.push({
        id: `seed-rc-post-${reportId}`, daily_report_id: reportId,
        type: 'post_trip', performed_at: isoAt(dayAgo, isBigDay ? 20 : 17, isBigDay ? 25 : 45),
        alcohol_check_method: 'face_to_face', alcohol_detector_used: true,
        alcohol_value_mg: 0, alcohol_result_ok: true,
        health_status: null, sleep_hours: null, fatigue_level: null,
        confirmed_by_name: null, notes: null,
      });

      // 異常: 3日前の鈴木に1件、2日前の佐藤に1件
      if ((dayAgo === 3 && dIdx === 1) || (dayAgo === 2 && dIdx === 0)) {
        anomalies.push({
          id: `seed-a-${reportId}`, daily_report_id: reportId,
          category: 'delay', severity: dayAgo === 2 ? 'medium' : 'low',
          description: dayAgo === 3
            ? '名取センターで荷待ち30分、次便に20分遅延'
            : '高倉町仙台店で受領担当者不在のため15分待機',
          image_url: null, resolved: false,
        });
        reports[reports.length - 1].has_anomaly = true;
      }
    });
  }

  // 今日: 佐藤=提出済み、鈴木=運行中（出庫済み・帰庫前）、高橋=未着手
  // 1: 佐藤 (提出済み)
  {
    const dv = drivers[0];
    const reportId = `seed-r-0-${dv.id}`;
    const odoStart = dv.odoBase + 4 * 150;
    const distance = 142;
    reports.push({
      id: reportId, company_id: COMPANY_ID, driver_id: dv.id, vehicle_id: dv.vehicleId,
      report_date: dateAt(0),
      clock_in_at: isoAt(0, 7, 30),
      depart_at: isoAt(0, 8, 0),
      return_at: isoAt(0, 17, 5),
      clock_out_at: isoAt(0, 17, 25),
      odometer_start: odoStart, odometer_end: odoStart + distance, total_distance_km: distance,
      delivery_count: 4,
      refueled: false, refuel_liters: null, refuel_amount_yen: null, refuel_station: null,
      used_highway: false, highway_fee_yen: null,
      has_anomaly: false, notes: null, ai_summary: null, raw_voice_text: null,
      status: 'submitted', submitted_at: isoAt(0, 17, 30),
      approved_at: null, approved_by: null,
      created_at: isoAt(0, 7, 30), updated_at: isoAt(0, 17, 30),
    });
    ['仙台中央市場', '名取センター', '高倉町（仙台店）', 'ワイズマート 本店'].forEach((dest, i) => {
      const h = 9 + i * 2;
      deliveries.push({
        id: `seed-d-${reportId}-${i}`, daily_report_id: reportId,
        destination: dest,
        arrived_at: isoAt(0, h, 10), completed_at: isoAt(0, h, 30),
        cargo_item: null, cargo_quantity: null, cargo_weight_kg: null,
        notes: null, receipt_image_url: null,
      });
    });
    breaks.push({
      id: `seed-b-${reportId}`, daily_report_id: reportId,
      start_at: isoAt(0, 12, 0), end_at: isoAt(0, 13, 0),
    });
    roll_calls.push({
      id: `seed-rc-pre-${reportId}`, daily_report_id: reportId,
      type: 'pre_trip', performed_at: isoAt(0, 7, 35),
      alcohol_check_method: 'face_to_face', alcohol_detector_used: true,
      alcohol_value_mg: 0, alcohol_result_ok: true,
      health_status: null, sleep_hours: null, fatigue_level: null,
      confirmed_by_name: null, notes: null,
    });
    roll_calls.push({
      id: `seed-rc-post-${reportId}`, daily_report_id: reportId,
      type: 'post_trip', performed_at: isoAt(0, 17, 20),
      alcohol_check_method: 'face_to_face', alcohol_detector_used: true,
      alcohol_value_mg: 0, alcohol_result_ok: true,
      health_status: null, sleep_hours: null, fatigue_level: null,
      confirmed_by_name: null, notes: null,
    });
  }

  // 2: 鈴木 (運行中)
  {
    const dv = drivers[1];
    const reportId = `seed-r-0-${dv.id}`;
    const odoStart = dv.odoBase + 4 * 150;
    reports.push({
      id: reportId, company_id: COMPANY_ID, driver_id: dv.id, vehicle_id: dv.vehicleId,
      report_date: dateAt(0),
      clock_in_at: isoAt(0, 7, 45),
      depart_at: isoAt(0, 8, 15),
      return_at: null, clock_out_at: null,
      odometer_start: odoStart, odometer_end: null, total_distance_km: null,
      delivery_count: 2,
      refueled: false, refuel_liters: null, refuel_amount_yen: null, refuel_station: null,
      used_highway: true, highway_fee_yen: null,
      has_anomaly: true, notes: null, ai_summary: null, raw_voice_text: null,
      status: 'draft', submitted_at: null,
      approved_at: null, approved_by: null,
      created_at: isoAt(0, 7, 45), updated_at: isoAt(0, 13, 0),
    });
    ['福島デポ', '郡山倉庫'].forEach((dest, i) => {
      const h = 10 + i * 2;
      deliveries.push({
        id: `seed-d-${reportId}-${i}`, daily_report_id: reportId,
        destination: dest,
        arrived_at: isoAt(0, h, 30),
        completed_at: i === 0 ? isoAt(0, h, 55) : null,
        cargo_item: null, cargo_quantity: null, cargo_weight_kg: null,
        notes: null, receipt_image_url: null,
      });
    });
    breaks.push({
      id: `seed-b-${reportId}`, daily_report_id: reportId,
      start_at: isoAt(0, 12, 30), end_at: isoAt(0, 13, 0),
    });
    roll_calls.push({
      id: `seed-rc-pre-${reportId}`, daily_report_id: reportId,
      type: 'pre_trip', performed_at: isoAt(0, 7, 50),
      alcohol_check_method: 'face_to_face', alcohol_detector_used: true,
      alcohol_value_mg: 0, alcohol_result_ok: true,
      health_status: null, sleep_hours: null, fatigue_level: null,
      confirmed_by_name: null, notes: null,
    });
    anomalies.push({
      id: `seed-a-today-suzuki`, daily_report_id: reportId,
      category: 'vehicle', severity: 'high',
      description: '102号車で右後方ランプの不点灯を確認。帰庫後に整備工場へ連絡予定',
      image_url: null, resolved: false,
    });
  }

  // 3: 高橋 (今日 未着手 = レポート未作成。何も追加しない)

  return { reports, deliveries, breaks, anomalies, roll_calls };
}

function buildSeed(): DemoData {
  const dyn = buildSeedReports();
  return {
    version: STORAGE_VERSION,
    profiles: PROFILES,
    vehicles: VEHICLES,
    reports: dyn.reports,
    deliveries: dyn.deliveries,
    breaks: dyn.breaks,
    anomalies: dyn.anomalies,
    roll_calls: dyn.roll_calls,
    inspections: [],
    currentDriverId: 'driver-sato',
  };
}

// 互換性用（型導出のための空プレースホルダー）
const SEED: DemoData = {
  version: STORAGE_VERSION,
  profiles: PROFILES,
  vehicles: VEHICLES,
  reports: [], deliveries: [], breaks: [], anomalies: [], roll_calls: [], inspections: [],
  currentDriverId: 'driver-sato',
};

export function loadDemo(): DemoData {
  if (typeof window === 'undefined') return SEED;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const seed = buildSeed();
      window.localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    // バージョン違いはリセット
    if (parsed.version !== STORAGE_VERSION) {
      const seed = buildSeed();
      window.localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    return { ...SEED, ...parsed };
  } catch {
    return buildSeed();
  }
}

export function saveDemo(data: DemoData): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export function resetDemo(): DemoData {
  const seed = buildSeed();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(KEY, JSON.stringify(seed));
  }
  return seed;
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

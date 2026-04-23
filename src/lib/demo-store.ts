// デモモード用ストア（localStorage）
// Supabase未設定でもフル機能を体験できる

import type {
  DailyReport, Delivery, Break, Anomaly, Profile, Vehicle,
  RollCall, VehicleInspection, ComplianceCheck,
  AnomalyCategory, AnomalySeverity,
} from './types';

const KEY = 'logistics-demo-data';
const STORAGE_VERSION = 4;  // スキーマ変更時にインクリメント

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
// 過去14日分 × 3ドライバーで、休日・異常・労務警戒など多様なバリエーション
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

  // 配送先プール（地域別）
  const localDests = ['仙台中央市場', '名取センター', '高倉町（仙台店）', 'ワイズマート 本店', '服部 物流DC', 'イオン泉中央', 'ヨークベニマル長町', 'マルチョウ大和田', 'イトーヨーカドー仙台店'];
  const farDests = ['福島デポ', '郡山倉庫', '山形営業所'];

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

  // 各ドライバー独自の odometer 累積を管理
  const odoMap: Record<string, number> = {};
  drivers.forEach(dv => { odoMap[dv.id] = dv.odoBase; });

  // バリエーション定義: dayAgo → driverIdx → pattern
  // pattern: { skip?, pattern, anomaly?, alcoholOver?, longDay? }
  const variations: Record<string, {
    skip?: boolean;
    longDuty?: boolean;        // 拘束時間長い（労務警戒）
    veryLongDuty?: boolean;    // 拘束時間超過（労務違反）
    alcoholOver?: number;       // アルコール検知（mg/L）
    anomaly?: { category: AnomalyCategory; severity: AnomalySeverity; desc: string };
    refuel?: boolean;
    highway?: boolean;
    farTrip?: boolean;          // 遠方ルート（走行距離増）
  }> = {
    // 13日前: 通常
    // 12日前: 高橋休み
    '12-2': { skip: true },
    // 11日前: 鈴木が事故ヒヤリハット
    '11-1': { anomaly: { category: 'near_miss', severity: 'medium', desc: '国道4号で前方車両の急ブレーキ。車間距離不足を反省' } },
    // 10日前: 佐藤が長時間運行（労務警戒）
    '10-0': { longDuty: true, anomaly: { category: 'delay', severity: 'low', desc: '荷主側受け入れ遅延で帰庫が遅くなった' } },
    // 9日前: 高橋が遠方便、給油+高速
    '9-2': { farTrip: true, refuel: true, highway: true },
    // 8日前: 鈴木が車両異常
    '8-1': { anomaly: { category: 'vehicle', severity: 'medium', desc: '右側サイドミラー固定部にガタつき。整備依頼済み' } },
    // 7日前: 佐藤休み、鈴木が事故（重大）
    '7-0': { skip: true },
    '7-1': { anomaly: { category: 'damage', severity: 'high', desc: '荷台で青果ケース1箱が落下、外箱破損。荷主と協議し賠償手続き中' } },
    // 6日前: 通常
    // 5日前: 高橋が拘束時間超過（労務違反）
    '5-2': { veryLongDuty: true, anomaly: { category: 'delay', severity: 'medium', desc: '東北道事故渋滞で帰庫が大幅遅延' }, highway: true },
    // 4日前: 佐藤がアルコール検知（要対応）
    '4-0': { alcoholOver: 0.18, anomaly: { category: 'other', severity: 'high', desc: '出庫前点呼でアルコール検知、乗務交代' } },
    // 3日前: 鈴木 遅延
    '3-1': { anomaly: { category: 'delay', severity: 'low', desc: '名取センターで荷待ち30分、次便に20分遅延' } },
    // 2日前: 佐藤 遅延、鈴木 拘束長い
    '2-0': { anomaly: { category: 'delay', severity: 'medium', desc: '高倉町仙台店で受領担当者不在のため45分待機' } },
    '2-1': { longDuty: true },
    // 1日前: 佐藤 給油、鈴木 高速
    '1-0': { refuel: true },
    '1-1': { highway: true },
    // 1日前: 高橋 ヒヤリハット
    '1-2': { anomaly: { category: 'near_miss', severity: 'low', desc: '交差点右折時に自転車の飛び出しを目視で回避' } },
  };

  // 過去14日分のループ
  for (let dayAgo = 14; dayAgo >= 1; dayAgo--) {
    drivers.forEach((dv, dIdx) => {
      const key = `${dayAgo}-${dIdx}`;
      const v = variations[key] || {};
      if (v.skip) return;

      const reportId = `seed-r-${dayAgo}-${dv.id}`;
      const distance = v.farTrip ? 280 + Math.floor((dayAgo * 7 + dIdx * 13) % 60)
        : 110 + Math.floor((dayAgo * 11 + dIdx * 17) % 80);
      const odoStart = odoMap[dv.id];
      const odoEnd = odoStart + distance;
      odoMap[dv.id] = odoEnd;

      // 時刻計算
      const departHour = 8;
      const departMin = [0, 15, 30][dIdx];
      let returnHour = 17;
      let returnMin = [10, 25, 40][dIdx];
      let clockOutHour = 17;
      let clockOutMin = [25, 40, 55][dIdx];
      if (v.longDuty) { returnHour = 19; returnMin = 50; clockOutHour = 20; clockOutMin = 30; }
      if (v.veryLongDuty) { returnHour = 22; returnMin = 30; clockOutHour = 23; clockOutMin = 0; }
      if (v.farTrip) { returnHour = 18; returnMin = 30; clockOutHour = 19; clockOutMin = 0; }

      reports.push({
        id: reportId, company_id: COMPANY_ID, driver_id: dv.id, vehicle_id: dv.vehicleId,
        report_date: dateAt(dayAgo),
        clock_in_at: isoAt(dayAgo, 7, 30),
        depart_at: isoAt(dayAgo, departHour, departMin),
        return_at: isoAt(dayAgo, returnHour, returnMin),
        clock_out_at: isoAt(dayAgo, clockOutHour, clockOutMin),
        odometer_start: odoStart, odometer_end: odoEnd, total_distance_km: distance,
        delivery_count: 0,
        refueled: !!v.refuel, refuel_liters: null, refuel_amount_yen: null, refuel_station: null,
        used_highway: !!v.highway, highway_fee_yen: null,
        has_anomaly: !!v.anomaly,
        notes: null, ai_summary: null, raw_voice_text: null,
        status: 'submitted',
        submitted_at: isoAt(dayAgo, clockOutHour, clockOutMin + 5),
        approved_at: null, approved_by: null,
        created_at: isoAt(dayAgo, 7, 30), updated_at: isoAt(dayAgo, clockOutHour, clockOutMin + 5),
      });

      // 配送3-7件
      const numDeliveries = v.farTrip ? 2 : (v.veryLongDuty ? 7 : 3 + ((dayAgo + dIdx) % 4));
      const pool = v.farTrip ? farDests : localDests;
      for (let i = 0; i < numDeliveries; i++) {
        const arrHour = 9 + Math.floor(i * (returnHour - 9) / Math.max(numDeliveries, 1));
        const arrMin = (dIdx * 7 + i * 11) % 50;
        deliveries.push({
          id: `seed-d-${reportId}-${i}`, daily_report_id: reportId,
          destination: pool[(dayAgo * 2 + dIdx + i) % pool.length],
          arrived_at: isoAt(dayAgo, arrHour, arrMin),
          completed_at: isoAt(dayAgo, arrHour, arrMin + 20),
          cargo_item: null, cargo_quantity: null, cargo_weight_kg: null,
          notes: null, receipt_image_url: null,
        });
      }
      reports[reports.length - 1].delivery_count = numDeliveries;

      // 休憩（長時間勤務日は2回）
      breaks.push({
        id: `seed-b-${reportId}-1`, daily_report_id: reportId,
        start_at: isoAt(dayAgo, 12, 0), end_at: isoAt(dayAgo, 13, 0),
      });
      if (v.longDuty || v.veryLongDuty || v.farTrip) {
        breaks.push({
          id: `seed-b-${reportId}-2`, daily_report_id: reportId,
          start_at: isoAt(dayAgo, 15, 30), end_at: isoAt(dayAgo, 15, 50),
        });
      }

      // 点呼（出庫前 + 退勤前）
      const alcoholValue = v.alcoholOver || 0;
      const alcoholOk = alcoholValue < 0.15;
      roll_calls.push({
        id: `seed-rc-pre-${reportId}`, daily_report_id: reportId,
        type: 'pre_trip', performed_at: isoAt(dayAgo, 7, 35),
        alcohol_check_method: 'face_to_face', alcohol_detector_used: true,
        alcohol_value_mg: alcoholValue, alcohol_result_ok: alcoholOk,
        health_status: null, sleep_hours: null, fatigue_level: null,
        confirmed_by_name: null, notes: null,
      });
      if (alcoholOk) {
        roll_calls.push({
          id: `seed-rc-post-${reportId}`, daily_report_id: reportId,
          type: 'post_trip', performed_at: isoAt(dayAgo, clockOutHour, clockOutMin - 5),
          alcohol_check_method: 'face_to_face', alcohol_detector_used: true,
          alcohol_value_mg: 0, alcohol_result_ok: true,
          health_status: null, sleep_hours: null, fatigue_level: null,
          confirmed_by_name: null, notes: null,
        });
      }

      // 異常
      if (v.anomaly) {
        anomalies.push({
          id: `seed-a-${reportId}`, daily_report_id: reportId,
          category: v.anomaly.category, severity: v.anomaly.severity,
          description: v.anomaly.desc,
          image_url: null, resolved: false,
        });
      }
    });
  }

  // 今日: 佐藤=提出済み、鈴木=運行中、高橋=未着手
  // 1: 佐藤 (提出済み)
  {
    const dv = drivers[0];
    const reportId = `seed-r-0-${dv.id}`;
    const odoStart = odoMap[dv.id];
    const distance = 142;
    odoMap[dv.id] += distance;
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
    const odoStart = odoMap[dv.id];
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

  // 3: 高橋 (今日 未着手 = レポート未作成)

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

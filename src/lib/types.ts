// 物流AI日報 ドメイン型定義

export type UserRole = 'driver' | 'admin' | 'dispatcher';
export type ReportStatus = 'draft' | 'submitted' | 'approved';
export type AnomalyCategory = 'vehicle' | 'delay' | 'accident' | 'damage' | 'near_miss' | 'other';
export type AnomalySeverity = 'low' | 'medium' | 'high';
export type InspectionType = 'pre_departure' | 'post_return';
export type OdometerCaptureType = 'start' | 'end';
export type RollCallType = 'pre_trip' | 'post_trip';
export type AlcoholCheckMethod = 'face_to_face' | 'remote' | 'self';
export type HealthStatus = 'good' | 'normal' | 'poor';

export interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
}

export interface Vehicle {
  id: string;
  company_id: string;
  number_plate: string;
  nickname: string | null;
  vehicle_type: string | null;
  is_active: boolean;
}

export interface DailyReport {
  id: string;
  company_id: string;
  driver_id: string;
  vehicle_id: string | null;
  report_date: string;

  // タイムスタンプ
  clock_in_at: string | null;
  depart_at: string | null;
  return_at: string | null;
  clock_out_at: string | null;

  // メーター
  odometer_start: number | null;
  odometer_end: number | null;
  total_distance_km: number | null;

  // 件数・サマリー
  delivery_count: number;

  // 給油詳細
  refueled: boolean;
  refuel_liters: number | null;
  refuel_amount_yen: number | null;
  refuel_station: string | null;

  // 高速・経費
  used_highway: boolean;
  highway_fee_yen: number | null;

  // 異常
  has_anomaly: boolean;

  // 備考・AI
  notes: string | null;
  ai_summary: string | null;
  raw_voice_text: string | null;

  // ステータス
  status: ReportStatus;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;

  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  daily_report_id: string;
  destination: string;
  arrived_at: string | null;
  completed_at: string | null;
  cargo_item: string | null;
  cargo_quantity: string | null;
  cargo_weight_kg: number | null;
  notes: string | null;
  receipt_image_url: string | null;
}

export interface Break {
  id: string;
  daily_report_id: string;
  start_at: string;
  end_at: string | null;
}

export interface Anomaly {
  id: string;
  daily_report_id: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  description: string;
  image_url: string | null;
  resolved: boolean;
}

// 点呼記録（出庫前 / 帰庫後）
export interface RollCall {
  id: string;
  daily_report_id: string;
  type: RollCallType;
  performed_at: string;
  // アルコールチェック
  alcohol_check_method: AlcoholCheckMethod;
  alcohol_detector_used: boolean;
  alcohol_value_mg: number | null;  // mg/L（呼気1Lあたり）
  alcohol_result_ok: boolean;
  // 健康状態
  health_status: HealthStatus | null;
  sleep_hours: number | null;
  fatigue_level: 'none' | 'mild' | 'severe' | null;
  // 確認者
  confirmed_by_name: string | null;
  notes: string | null;
}

// 始業前点検（日常点検）
export interface VehicleInspection {
  id: string;
  daily_report_id: string;
  inspection_type: InspectionType;
  // 法定15項目（運行前）
  brake_ok: boolean | null;
  tire_pressure_ok: boolean | null;
  tire_damage_ok: boolean | null;
  battery_ok: boolean | null;
  engine_oil_ok: boolean | null;
  coolant_ok: boolean | null;
  washer_fluid_ok: boolean | null;
  lights_ok: boolean | null;
  wipers_ok: boolean | null;
  obd_warning: boolean | null;  // OBD警告灯（点灯=異常）
  // 冷凍車のみ
  refrigeration_temp_c: number | null;
  // 全体
  body_damage_ok: boolean | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
}

export interface OdometerCapture {
  id: string;
  daily_report_id: string;
  capture_type: OdometerCaptureType;
  image_url: string;
  ocr_value: number | null;
  ocr_confidence: number;
  confirmed_value: number | null;
  created_at: string;
}

// 音声入力 → AIで抽出する構造化データ
export interface ExtractedReportFields {
  clock_in_time?: string;
  depart_time?: string;
  return_time?: string;
  clock_out_time?: string;
  odometer_start?: number;
  odometer_end?: number;
  total_distance_km?: number;
  delivery_count?: number;
  deliveries?: Array<{
    destination: string;
    arrived_time?: string;
    completed_time?: string;
    cargo_item?: string;
    cargo_quantity?: string;
    notes?: string;
  }>;
  breaks?: Array<{
    start_time: string;
    end_time?: string;
  }>;
  anomalies?: Array<{
    category: AnomalyCategory;
    severity: AnomalySeverity;
    description: string;
  }>;
  refueled?: boolean;
  refuel_liters?: number;
  refuel_amount_yen?: number;
  used_highway?: boolean;
  notes?: string;
  raw_text: string;
}

export interface OdometerOCRResult {
  value: number | null;
  confidence: number;
  raw_text: string;
  notes?: string;
}

// 改善基準告示の判定結果
export interface ComplianceCheck {
  // 拘束時間（出勤〜退勤）
  duty_hours: number | null;
  duty_warning: 'ok' | 'caution' | 'violation' | null;  // 13h超 caution / 15h超 violation
  // 連続運転時間（休憩を挟まずに連続した運転）
  max_consecutive_drive_min: number | null;
  consecutive_drive_warning: 'ok' | 'caution' | 'violation' | null;  // 4h警戒 / 4h超違反
  // 休憩合計
  total_break_min: number;
  // 直前の休息期間（前日退勤〜本日出勤）
  rest_hours: number | null;
  rest_warning: 'ok' | 'caution' | 'violation' | null;  // 11h未満 caution / 9h未満 violation
}

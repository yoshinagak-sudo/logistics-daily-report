// 物流AI日報 ドメイン型定義

export type UserRole = 'driver' | 'admin' | 'dispatcher';
export type ReportStatus = 'draft' | 'submitted' | 'approved';
export type AnomalyCategory = 'vehicle' | 'delay' | 'accident' | 'damage' | 'near_miss' | 'other';
export type AnomalySeverity = 'low' | 'medium' | 'high';
export type InspectionType = 'pre_departure' | 'post_return';
export type OdometerCaptureType = 'start' | 'end';

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
  clock_in_at: string | null;
  depart_at: string | null;
  return_at: string | null;
  clock_out_at: string | null;
  odometer_start: number | null;
  odometer_end: number | null;
  total_distance_km: number | null;
  delivery_count: number;
  refueled: boolean;
  used_highway: boolean;
  has_anomaly: boolean;
  notes: string | null;
  ai_summary: string | null;
  raw_voice_text: string | null;
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
  used_highway?: boolean;
  notes?: string;
  raw_text: string;
}

// メーターOCR結果
export interface OdometerOCRResult {
  value: number | null;
  confidence: number;
  raw_text: string;
  notes?: string;
}

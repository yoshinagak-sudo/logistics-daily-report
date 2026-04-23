// 管理画面用のデータ集計ユーティリティ

import { checkCompliance, type DemoData } from './demo-store';
import type { DailyReport, Anomaly, RollCall } from './types';

export type Period = 'today' | 'week' | 'month' | 'all14';

export function getDateRange(period: Period): { from: string; to: string; label: string; days: number } {
  const now = new Date();
  const today = toDateStr(now);
  const fromDate = new Date(now);
  let label = '今日';
  let days = 1;
  switch (period) {
    case 'today': days = 1; label = '今日'; break;
    case 'week': fromDate.setDate(fromDate.getDate() - 6); days = 7; label = '過去7日'; break;
    case 'month': fromDate.setDate(fromDate.getDate() - 29); days = 30; label = '過去30日'; break;
    case 'all14': fromDate.setDate(fromDate.getDate() - 13); days = 14; label = '過去14日'; break;
  }
  return { from: toDateStr(fromDate), to: today, label, days };
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getReportsInRange(data: DemoData, from: string, to: string): DailyReport[] {
  return data.reports.filter(r => r.report_date >= from && r.report_date <= to);
}

export interface OverviewStats {
  totalReports: number;
  submittedReports: number;
  submissionRate: number;
  totalDeliveries: number;
  totalDistance: number;
  totalAnomalies: number;
  highSeverityAnomalies: number;
  complianceIssues: number;
  alcoholIssues: number;
  avgDutyHours: number;
  totalRefuels: number;
  totalHighwayUses: number;
}

export function computeOverviewStats(data: DemoData, reports: DailyReport[], driverCount: number): OverviewStats {
  const submittedReports = reports.filter(r => r.status !== 'draft').length;
  const totalReports = reports.length;
  const submissionRate = totalReports > 0 ? Math.round((submittedReports / totalReports) * 100) : 0;
  const totalDeliveries = reports.reduce((s, r) => s + (r.delivery_count || 0), 0);
  const totalDistance = reports.reduce((s, r) => s + (r.total_distance_km || 0), 0);
  const reportIds = new Set(reports.map(r => r.id));
  const reportAnomalies = data.anomalies.filter(a => reportIds.has(a.daily_report_id));
  const totalAnomalies = reportAnomalies.length;
  const highSeverityAnomalies = reportAnomalies.filter(a => a.severity === 'high').length;
  let complianceIssues = 0;
  let alcoholIssues = 0;
  const dutyHs: number[] = [];
  for (const r of reports) {
    const rBreaks = data.breaks.filter(b => b.daily_report_id === r.id);
    const c = checkCompliance(r, rBreaks);
    if (c.duty_hours !== null) dutyHs.push(c.duty_hours);
    if (c.duty_warning === 'violation' || c.consecutive_drive_warning === 'violation' || c.rest_warning === 'violation') {
      complianceIssues++;
    }
    const rcs = data.roll_calls.filter(rc => rc.daily_report_id === r.id);
    if (rcs.some(rc => !rc.alcohol_result_ok)) alcoholIssues++;
  }
  const avgDutyHours = dutyHs.length > 0 ? dutyHs.reduce((a, b) => a + b, 0) / dutyHs.length : 0;
  const totalRefuels = reports.filter(r => r.refueled).length;
  const totalHighwayUses = reports.filter(r => r.used_highway).length;
  return {
    totalReports, submittedReports, submissionRate,
    totalDeliveries, totalDistance,
    totalAnomalies, highSeverityAnomalies,
    complianceIssues, alcoholIssues,
    avgDutyHours, totalRefuels, totalHighwayUses,
  };
}

export interface DailyTrend {
  date: string;          // 表示用 (例: "4/22")
  fullDate: string;      // 完全 (例: "2026-04-22")
  deliveries: number;
  distance: number;
  reports: number;
  anomalies: number;
}

export function computeDailyTrend(data: DemoData, from: string, to: string): DailyTrend[] {
  const trend: DailyTrend[] = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const fullDate = toDateStr(d);
    const dayReports = data.reports.filter(r => r.report_date === fullDate);
    const reportIds = new Set(dayReports.map(r => r.id));
    const dayAnomalies = data.anomalies.filter(a => reportIds.has(a.daily_report_id));
    trend.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      fullDate,
      deliveries: dayReports.reduce((s, r) => s + (r.delivery_count || 0), 0),
      distance: dayReports.reduce((s, r) => s + (r.total_distance_km || 0), 0),
      reports: dayReports.length,
      anomalies: dayAnomalies.length,
    });
  }
  return trend;
}

export interface DriverStat {
  driverId: string;
  driverName: string;
  workDays: number;          // 出勤日数
  totalReports: number;
  totalDeliveries: number;
  totalDistance: number;
  totalAnomalies: number;
  avgDutyHours: number;
  complianceIssues: number;
  alcoholIssues: number;
  refuelCount: number;
  highwayCount: number;
}

export function computeDriverStats(data: DemoData, reports: DailyReport[]): DriverStat[] {
  const driversList = data.profiles.filter(p => p.role === 'driver');
  return driversList.map(driver => {
    const driverReports = reports.filter(r => r.driver_id === driver.id);
    const reportIds = new Set(driverReports.map(r => r.id));
    const driverAnomalies = data.anomalies.filter(a => reportIds.has(a.daily_report_id));
    const dutyHs: number[] = [];
    let complianceIssues = 0;
    let alcoholIssues = 0;
    for (const r of driverReports) {
      const rBreaks = data.breaks.filter(b => b.daily_report_id === r.id);
      const c = checkCompliance(r, rBreaks);
      if (c.duty_hours !== null) dutyHs.push(c.duty_hours);
      if (c.duty_warning === 'violation' || c.consecutive_drive_warning === 'violation') complianceIssues++;
      const rcs = data.roll_calls.filter(rc => rc.daily_report_id === r.id);
      if (rcs.some(rc => !rc.alcohol_result_ok)) alcoholIssues++;
    }
    return {
      driverId: driver.id,
      driverName: driver.full_name,
      workDays: driverReports.length,
      totalReports: driverReports.length,
      totalDeliveries: driverReports.reduce((s, r) => s + (r.delivery_count || 0), 0),
      totalDistance: driverReports.reduce((s, r) => s + (r.total_distance_km || 0), 0),
      totalAnomalies: driverAnomalies.length,
      avgDutyHours: dutyHs.length > 0 ? dutyHs.reduce((a, b) => a + b, 0) / dutyHs.length : 0,
      complianceIssues,
      alcoholIssues,
      refuelCount: driverReports.filter(r => r.refueled).length,
      highwayCount: driverReports.filter(r => r.used_highway).length,
    };
  });
}

export interface VehicleStat {
  vehicleId: string;
  numberPlate: string;
  nickname: string | null;
  vehicleType: string | null;
  totalUses: number;
  totalDistance: number;
  utilizationRate: number;  // 期間中の使用日数 / 期間日数
  lastUsedDate: string | null;
  driverIds: string[];
}

export function computeVehicleStats(
  data: DemoData,
  reports: DailyReport[],
  totalDays: number,
): VehicleStat[] {
  return data.vehicles.map(v => {
    const vReports = reports.filter(r => r.vehicle_id === v.id);
    const driverIds = Array.from(new Set(vReports.map(r => r.driver_id)));
    const dates = vReports.map(r => r.report_date).sort();
    return {
      vehicleId: v.id,
      numberPlate: v.number_plate,
      nickname: v.nickname,
      vehicleType: v.vehicle_type,
      totalUses: vReports.length,
      totalDistance: vReports.reduce((s, r) => s + (r.total_distance_km || 0), 0),
      utilizationRate: totalDays > 0 ? (vReports.length / totalDays) : 0,
      lastUsedDate: dates.length > 0 ? dates[dates.length - 1] : null,
      driverIds,
    };
  });
}

export interface AnomalyWithContext {
  anomaly: Anomaly;
  driverName: string;
  reportDate: string;
  vehicleName: string | null;
}

export function getAnomaliesWithContext(data: DemoData, reports: DailyReport[]): AnomalyWithContext[] {
  const reportMap = new Map(reports.map(r => [r.id, r]));
  return data.anomalies
    .filter(a => reportMap.has(a.daily_report_id))
    .map(a => {
      const r = reportMap.get(a.daily_report_id)!;
      const driver = data.profiles.find(p => p.id === r.driver_id);
      const vehicle = r.vehicle_id ? data.vehicles.find(v => v.id === r.vehicle_id) : null;
      return {
        anomaly: a,
        driverName: driver?.full_name || 'unknown',
        reportDate: r.report_date,
        vehicleName: vehicle?.number_plate || null,
      };
    })
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
}

export interface Alert {
  type: 'compliance' | 'alcohol' | 'unsubmitted' | 'high_anomaly' | 'unused_vehicle';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  driverId?: string;
  reportId?: string;
  date?: string;
}

export function computeAlerts(data: DemoData, reports: DailyReport[]): Alert[] {
  const alerts: Alert[] = [];
  const today = toDateStr(new Date());

  // 今日の未着手ドライバー
  const todayReports = data.reports.filter(r => r.report_date === today);
  const driversToday = data.profiles.filter(p => p.role === 'driver');
  for (const d of driversToday) {
    if (!todayReports.find(r => r.driver_id === d.id)) {
      alerts.push({
        type: 'unsubmitted', severity: 'low',
        title: `${d.full_name}: 本日 未着手`,
        description: '出勤・出庫が記録されていません',
        driverId: d.id, date: today,
      });
    } else {
      const r = todayReports.find(r => r.driver_id === d.id)!;
      if (r.status === 'draft' && r.return_at) {
        alerts.push({
          type: 'unsubmitted', severity: 'medium',
          title: `${d.full_name}: 日報未提出`,
          description: '帰庫済みですが日報が未提出です',
          driverId: d.id, reportId: r.id, date: today,
        });
      }
    }
  }

  // 労務違反
  for (const r of reports) {
    const rBreaks = data.breaks.filter(b => b.daily_report_id === r.id);
    const c = checkCompliance(r, rBreaks);
    const driver = data.profiles.find(p => p.id === r.driver_id);
    if (c.duty_warning === 'violation') {
      alerts.push({
        type: 'compliance', severity: 'high',
        title: `${driver?.full_name}: 拘束時間違反`,
        description: `${r.report_date} の拘束時間 ${c.duty_hours?.toFixed(1)}h（15h超過）`,
        driverId: r.driver_id, reportId: r.id, date: r.report_date,
      });
    }
    if (c.consecutive_drive_warning === 'violation') {
      alerts.push({
        type: 'compliance', severity: 'high',
        title: `${driver?.full_name}: 連続運転違反`,
        description: `${r.report_date} の連続運転 ${c.max_consecutive_drive_min}分（4h超過）`,
        driverId: r.driver_id, reportId: r.id, date: r.report_date,
      });
    }
  }

  // アルコール検知
  const reportIds = new Set(reports.map(r => r.id));
  for (const rc of data.roll_calls) {
    if (!reportIds.has(rc.daily_report_id)) continue;
    if (!rc.alcohol_result_ok) {
      const r = reports.find(r => r.id === rc.daily_report_id)!;
      const driver = data.profiles.find(p => p.id === r.driver_id);
      alerts.push({
        type: 'alcohol', severity: 'high',
        title: `${driver?.full_name}: アルコール検知`,
        description: `${r.report_date} ${rc.type === 'pre_trip' ? '出庫前' : '退勤前'} ${rc.alcohol_value_mg?.toFixed(2)} mg/L`,
        driverId: r.driver_id, reportId: r.id, date: r.report_date,
      });
    }
  }

  // 重大異常（未解決）
  for (const a of data.anomalies) {
    if (!reportIds.has(a.daily_report_id)) continue;
    if (a.severity === 'high' && !a.resolved) {
      const r = reports.find(r => r.id === a.daily_report_id)!;
      const driver = data.profiles.find(p => p.id === r.driver_id);
      alerts.push({
        type: 'high_anomaly', severity: 'high',
        title: `${driver?.full_name}: ${categoryJa(a.category)}（重大）`,
        description: a.description,
        driverId: r.driver_id, reportId: r.id, date: r.report_date,
      });
    }
  }

  // 重要度順
  return alerts.sort((a, b) => {
    const sevOrder = { high: 0, medium: 1, low: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity];
  });
}

export function categoryJa(c: string): string {
  return ({ vehicle: '車両異常', delay: '遅延', accident: '事故', damage: '荷物破損', near_miss: 'ヒヤリハット', other: 'その他' } as Record<string, string>)[c] || c;
}
export function severityJa(s: string): string {
  return ({ low: '軽微', medium: '中程度', high: '重大' } as Record<string, string>)[s] || s;
}

export function fmtHM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDateLong(date: string): string {
  const d = new Date(date);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}曜日`;
}

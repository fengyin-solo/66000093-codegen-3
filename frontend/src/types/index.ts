export interface Device {
  id: string; name: string; lat: number; lng: number;
  status: 'online' | 'offline' | 'alert'; lastSeen: string;
  battery: number; temperature: number;
  groupId?: string;
  thresholds?: DeviceThresholds;
}

export interface DeviceThresholds {
  lowBattery: number;
  highTemperature: number;
  offlineTimeout: number;
}

export interface DeviceGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface DeviceRegistrationForm {
  name: string;
  lat: number;
  lng: number;
  battery: number;
  temperature: number;
  groupId?: string;
  thresholds: DeviceThresholds;
}

export interface Geofence {
  id: string; name: string;
  center: { lat: number; lng: number };
  radius: number; type: 'circle' | 'polygon';
  paths?: Array<{ lat: number; lng: number }>;
  alertOnEnter: boolean; alertOnExit: boolean; color: string;
}

export type AlertType = 'enter' | 'exit' | 'low_battery' | 'offline';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  deviceId: string;
  fenceId?: string;
  type: AlertType;
  severity: AlertSeverity;
  timestamp: string;
  message: string;
  acknowledged: boolean;
}

export interface MqttMessage {
  topic: string; payload: string; timestamp: string;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed?: number;
  battery?: number;
  temperature?: number;
  isAbnormal?: boolean;
  abnormalType?: 'fence_breach' | 'low_battery' | 'offline' | 'speed';
  abnormalMessage?: string;
}

export interface StayPoint {
  lat: number;
  lng: number;
  startTime: string;
  endTime: string;
  duration: number;
  name?: string;
}

export interface TrackSegment {
  points: TrackPoint[];
  isNormal: boolean;
  abnormalType?: string;
  startTime: string;
  endTime: string;
}

export interface TrackData {
  deviceId: string;
  deviceName: string;
  startTime: string;
  endTime: string;
  points: TrackPoint[];
  segments: TrackSegment[];
  stayPoints: StayPoint[];
  breachEvents: TrackPoint[];
  totalDistance: number;
  totalDuration: number;
}

export interface HealthDataPoint {
  timestamp: string;
  battery: number;
  temperature: number;
  isOnline: boolean;
}

export interface DeviceHealth {
  deviceId: string;
  deviceName: string;
  healthScore: number;
  batteryLevel: number;
  temperatureLevel: number;
  onlineHours: number;
  offlineHours: number;
  alertCount: number;
  healthTrend: 'improving' | 'stable' | 'declining';
  lastAbnormalTime?: string;
  lastAbnormalType?: AlertType;
  priorityRank: number;
  recommendations: string[];
  historyData: HealthDataPoint[];
}

export interface HealthSummary {
  avgHealthScore: number;
  totalAlertCount: number;
  avgOnlineRate: number;
  avgBatteryLevel: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
}

export type StatsPeriod = 'day' | 'week' | 'month';

export interface DevicePeriodStat {
  deviceId: string;
  deviceName: string;
  groupId?: string;
  healthScore: number;
  prevHealthScore: number;
  scoreDelta: number;
  healthTrend: 'improving' | 'stable' | 'declining';
  onlineRate: number;
  prevOnlineRate: number;
  abnormalCount: number;
  prevAbnormalCount: number;
  isAbnormal: boolean;
  inspectionMinutes: number;
  prevInspectionMinutes: number;
  avgBattery: number;
  avgTemperature: number;
  scoreSeries: number[];
  lastAlertTime?: string;
}

export interface GroupStatistic {
  groupId: string | null;
  groupName: string;
  groupColor: string;
  deviceCount: number;
  avgHealthScore: number;
  prevAvgHealthScore: number;
  healthDelta: number;
  abnormalDeviceCount: number;
  onlineRate: number;
  prevOnlineRate: number;
  onlineRateDelta: number;
  totalInspectionMinutes: number;
  prevInspectionMinutes: number;
  totalAlerts: number;
  improvingCount: number;
  stableCount: number;
  decliningCount: number;
  deviceStats: DevicePeriodStat[];
}

export interface StatsOverview {
  deviceCount: number;
  abnormalDeviceCount: number;
  avgHealthScore: number;
  prevAvgHealthScore: number;
  avgOnlineRate: number;
  prevAvgOnlineRate: number;
  totalInspectionMinutes: number;
  prevTotalInspectionMinutes: number;
  totalAlerts: number;
  prevTotalAlerts: number;
}

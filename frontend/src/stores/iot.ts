import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Device, Geofence, Alert, AlertType, AlertSeverity, DeviceGroup, DeviceThresholds, TrackData, TrackPoint, StayPoint, TrackSegment, HealthDataPoint, DeviceHealth, HealthSummary, StatsPeriod, DevicePeriodStat, GroupStatistic, StatsOverview } from '../types';

function generateId(prefix: string) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 6);
}

const GROUP_FILTER_ALL = '__all__';
const UNGROUPED_FILTER = '__none__';

export const statsGroupFilters = {
  ALL: GROUP_FILTER_ALL,
  UNGROUPED: UNGROUPED_FILTER,
};

export const useIotStore = defineStore('iot', () => {
  const devices = ref<Device[]>([
    { id: 'd1', name: '传感器-A01', lat: 39.9042, lng: 116.4074, status: 'online', lastSeen: new Date().toISOString(), battery: 85, temperature: 24.5, groupId: 'g3' },
    { id: 'd2', name: '传感器-B02', lat: 39.9142, lng: 116.3974, status: 'alert', lastSeen: new Date().toISOString(), battery: 12, temperature: 38.2, groupId: 'g1' },
    { id: 'd3', name: '追踪器-C03', lat: 39.8942, lng: 116.4174, status: 'offline', lastSeen: new Date(Date.now() - 3600000).toISOString(), battery: 0, temperature: 0, groupId: 'g4' },
    { id: 'd4', name: '传感器-D04', lat: 39.9082, lng: 116.4024, status: 'online', lastSeen: new Date().toISOString(), battery: 45, temperature: 26.1, groupId: 'g1' },
    { id: 'd5', name: '追踪器-E05', lat: 39.8992, lng: 116.4104, status: 'online', lastSeen: new Date().toISOString(), battery: 92, temperature: 23.8, groupId: 'g2' },
  ]);
  const fences = ref<Geofence[]>([
    { id: 'f1', name: '办公区域', center: { lat: 39.9042, lng: 116.4074 }, radius: 500, type: 'circle', alertOnEnter: false, alertOnExit: true, color: '#4caf50' },
    { id: 'f2', name: '危险区域', center: { lat: 39.9142, lng: 116.3974 }, radius: 200, type: 'circle', alertOnEnter: true, alertOnExit: false, color: '#e53935' },
    { id: 'f3', name: '仓库区域', center: { lat: 39.8992, lng: 116.4124 }, radius: 0, type: 'polygon',
      paths: [
        { lat: 39.9012, lng: 116.4094 },
        { lat: 39.9012, lng: 116.4154 },
        { lat: 39.8972, lng: 116.4154 },
        { lat: 39.8972, lng: 116.4094 },
      ], alertOnEnter: true, alertOnExit: true, color: '#1976d2' },
  ]);
  const alerts = ref<Alert[]>([
    {
      id: generateId('a'),
      deviceId: 'd2',
      type: 'low_battery',
      severity: 'warning',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      message: '设备电量过低，请及时充电',
      acknowledged: false
    },
    {
      id: generateId('a'),
      deviceId: 'd3',
      type: 'offline',
      severity: 'critical',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      message: '设备离线超过1小时',
      acknowledged: false
    },
    {
      id: generateId('a'),
      deviceId: 'd2',
      fenceId: 'f2',
      type: 'enter',
      severity: 'critical',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      message: '设备进入危险区域',
      acknowledged: false
    }
  ]);
  const selectedFenceId = ref<string | null>(null);
  const editMode = ref<'none' | 'draw-circle' | 'draw-polygon' | 'edit'>('none');
  const highlightedDeviceId = ref<string | null>(null);
  const isRegisteringDevice = ref(false);
  const registrationLocation = ref<{ lat: number; lng: number } | null>(null);

  const trackPlaybackEnabled = ref(false);
  const trackData = ref<TrackData | null>(null);
  const playbackDeviceId = ref<string | null>(null);
  const playbackStartTime = ref<string>('');
  const playbackEndTime = ref<string>('');
  const playbackCurrentIndex = ref(0);
  const isPlaying = ref(false);
  const playbackSpeed = ref(1);
  const showTrack = ref(true);
  const showStayPoints = ref(true);
  const showBreachEvents = ref(true);
  const playbackInterval = ref<number | null>(null);

  const groups = ref<DeviceGroup[]>([
    { id: 'g1', name: '生产车间', color: '#1976d2', description: '生产线设备' },
    { id: 'g2', name: '仓储区域', color: '#388e3c', description: '仓库监控设备' },
    { id: 'g3', name: '办公区域', color: '#f57c00', description: '办公环境监测' },
    { id: 'g4', name: '室外设施', color: '#7b1fa2', description: '户外设备' },
  ]);

  const onlineCount = computed(() => devices.value.filter(d => d.status === 'online').length);
  const offlineCount = computed(() => devices.value.filter(d => d.status === 'offline').length);
  const alertDeviceCount = computed(() => devices.value.filter(d => d.status === 'alert').length);
  const deviceCount = computed(() => devices.value.length);
  const fenceCount = computed(() => fences.value.length);
  const alertCount = computed(() => alerts.value.filter(a => !a.acknowledged).length);
  const selectedFence = computed(() => fences.value.find(f => f.id === selectedFenceId.value) || null);

  const avgBattery = computed(() => {
    const onlineDevices = devices.value.filter(d => d.status !== 'offline');
    if (onlineDevices.length === 0) return 0;
    return Math.round(onlineDevices.reduce((sum, d) => sum + d.battery, 0) / onlineDevices.length);
  });

  const avgTemperature = computed(() => {
    const onlineDevices = devices.value.filter(d => d.status !== 'offline');
    if (onlineDevices.length === 0) return 0;
    return Number((onlineDevices.reduce((sum, d) => sum + d.temperature, 0) / onlineDevices.length).toFixed(1));
  });

  const lowBatteryCount = computed(() => devices.value.filter(d => d.battery < 20 && d.status !== 'offline').length);

  const devicesRanked = computed(() => {
    return [...devices.value].sort((a, b) => {
      const statusOrder = { alert: 0, offline: 1, online: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return b.battery - a.battery;
    });
  });

  const recentAlerts = computed(() => {
    return [...alerts.value]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  });

  const unacknowledgedAlerts = computed(() => alerts.value.filter(a => !a.acknowledged));

  const criticalAlerts = computed(() => unacknowledgedAlerts.value.filter(a => a.severity === 'critical'));
  const warningAlerts = computed(() => unacknowledgedAlerts.value.filter(a => a.severity === 'warning'));
  const infoAlerts = computed(() => unacknowledgedAlerts.value.filter(a => a.severity === 'info'));

  const criticalCount = computed(() => criticalAlerts.value.length);
  const warningCount = computed(() => warningAlerts.value.length);
  const infoCount = computed(() => infoAlerts.value.length);

  const playbackCurrentPoint = computed(() => {
    if (!trackData.value || playbackCurrentIndex.value < 0 || playbackCurrentIndex.value >= trackData.value.points.length) {
      return null;
    }
    return trackData.value.points[playbackCurrentIndex.value];
  });

  const playbackProgress = computed(() => {
    if (!trackData.value || trackData.value.points.length === 0) return 0;
    return (playbackCurrentIndex.value / (trackData.value.points.length - 1)) * 100;
  });

  const playbackCurrentTime = computed(() => {
    return playbackCurrentPoint.value?.timestamp || '';
  });

  function getDeviceById(id: string) {
    return devices.value.find(d => d.id === id);
  }

  function getFenceById(id: string) {
    return fences.value.find(f => f.id === id);
  }

  function acknowledgeAlert(id: string) {
    const a = alerts.value.find(a => a.id === id);
    if (a) a.acknowledged = true;
  }

  function batchAcknowledgeAlerts(ids: string[]) {
    ids.forEach(id => {
      const a = alerts.value.find(a => a.id === id);
      if (a) a.acknowledged = true;
    });
  }

  function acknowledgeAllAlerts() {
    alerts.value.forEach(a => {
      a.acknowledged = true;
    });
  }

  function setHighlightedDevice(id: string | null) {
    highlightedDeviceId.value = id;
  }

  function addAlert(alert: Omit<Alert, 'id' | 'acknowledged'>) {
    const newAlert: Alert = {
      ...alert,
      id: generateId('a'),
      acknowledged: false
    };
    alerts.value.unshift(newAlert);
    if (alerts.value.length > 200) {
      alerts.value = alerts.value.slice(0, 200);
    }
    return newAlert.id;
  }

  function generateMockAlert() {
    const alertTypes: Array<{ type: AlertType; severity: AlertSeverity; weight: number }> = [
      { type: 'enter', severity: 'critical', weight: 2 },
      { type: 'exit', severity: 'warning', weight: 2 },
      { type: 'low_battery', severity: 'warning', weight: 3 },
      { type: 'offline', severity: 'critical', weight: 1 },
    ];

    const totalWeight = alertTypes.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedType = alertTypes[0];
    for (const t of alertTypes) {
      random -= t.weight;
      if (random <= 0) {
        selectedType = t;
        break;
      }
    }

    const randomDevice = devices.value[Math.floor(Math.random() * devices.value.length)];
    const randomFence = fences.value[Math.floor(Math.random() * fences.value.length)];

    let message = '';
    let fenceId: string | undefined = undefined;

    switch (selectedType.type) {
      case 'enter':
        fenceId = randomFence.id;
        message = `${randomDevice.name} 进入 ${randomFence.name}`;
        break;
      case 'exit':
        fenceId = randomFence.id;
        message = `${randomDevice.name} 离开 ${randomFence.name}`;
        break;
      case 'low_battery':
        message = `${randomDevice.name} 电量过低 (${Math.floor(Math.random() * 15)}%)`;
        break;
      case 'offline':
        message = `${randomDevice.name} 设备离线`;
        break;
    }

    addAlert({
      deviceId: randomDevice.id,
      fenceId,
      type: selectedType.type,
      severity: selectedType.severity,
      timestamp: new Date().toISOString(),
      message
    });
  }

  let mockAlertInterval: number | null = null;

  function startMockAlertStream() {
    if (mockAlertInterval) return;
    mockAlertInterval = window.setInterval(() => {
      if (Math.random() < 0.3) {
        generateMockAlert();
      }
    }, 5000);
  }

  function stopMockAlertStream() {
    if (mockAlertInterval) {
      clearInterval(mockAlertInterval);
      mockAlertInterval = null;
    }
  }

  function addFence(fence: Omit<Geofence, 'id'>) {
    const id = 'f' + Date.now();
    fences.value.push({ ...fence, id });
    return id;
  }

  function addDevice(device: Omit<Device, 'id' | 'status' | 'lastSeen'>) {
    const id = generateId('d');
    const newDevice: Device = {
      ...device,
      id,
      status: 'online',
      lastSeen: new Date().toISOString()
    };
    devices.value.push(newDevice);
    return id;
  }

  function getGroupById(id: string) {
    return groups.value.find(g => g.id === id);
  }

  function startDeviceRegistration() {
    isRegisteringDevice.value = true;
    registrationLocation.value = null;
  }

  function cancelDeviceRegistration() {
    isRegisteringDevice.value = false;
    registrationLocation.value = null;
  }

  function setRegistrationLocation(lat: number, lng: number) {
    registrationLocation.value = { lat, lng };
  }

  function updateFence(id: string, updates: Partial<Geofence>) {
    const idx = fences.value.findIndex(f => f.id === id);
    if (idx !== -1) {
      fences.value[idx] = { ...fences.value[idx], ...updates };
    }
  }

  function deleteFence(id: string) {
    const idx = fences.value.findIndex(f => f.id === id);
    if (idx !== -1) {
      fences.value.splice(idx, 1);
      if (selectedFenceId.value === id) {
        selectedFenceId.value = null;
        editMode.value = 'none';
      }
    }
  }

  function selectFence(id: string | null) {
    selectedFenceId.value = id;
    if (id) {
      editMode.value = 'edit';
    }
  }

  function setEditMode(mode: 'none' | 'draw-circle' | 'draw-polygon' | 'edit') {
    editMode.value = mode;
    if (mode === 'none') {
      selectedFenceId.value = null;
    }
  }

  function generateMockTrackData(deviceId: string, startTime: string, endTime: string): TrackData {
    const device = getDeviceById(deviceId);
    if (!device) {
      return {
        deviceId,
        deviceName: '未知设备',
        startTime,
        endTime,
        points: [],
        segments: [],
        stayPoints: [],
        breachEvents: [],
        totalDistance: 0,
        totalDuration: 0
      };
    }

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const interval = 30000;
    const points: TrackPoint[] = [];

    let currentLat = device.lat;
    let currentLng = device.lng;

    const routePatterns = [
      { lat: 39.9042, lng: 116.4074 },
      { lat: 39.9082, lng: 116.4024 },
      { lat: 39.9142, lng: 116.3974 },
      { lat: 39.9102, lng: 116.4104 },
      { lat: 39.8992, lng: 116.4124 },
      { lat: 39.8942, lng: 116.4174 },
      { lat: 39.9012, lng: 116.4094 },
    ];

    let patternIndex = 0;
    let stayCounter = 0;
    let breachCounter = 0;

    for (let time = start; time <= end; time += interval) {
      const target = routePatterns[patternIndex % routePatterns.length];
      const latDiff = target.lat - currentLat;
      const lngDiff = target.lng - currentLng;
      const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      if (dist < 0.001) {
        patternIndex++;
        stayCounter = 6;
      }

      let isAbnormal = false;
      let abnormalType: TrackPoint['abnormalType'] = undefined;
      let abnormalMessage = '';

      if (stayCounter > 0) {
        stayCounter--;
      } else {
        currentLat += latDiff * 0.1 + (Math.random() - 0.5) * 0.0005;
        currentLng += lngDiff * 0.1 + (Math.random() - 0.5) * 0.0005;
      }

      breachCounter++;
      if (breachCounter > 40 && Math.random() < 0.15) {
        isAbnormal = true;
        abnormalType = 'fence_breach';
        abnormalMessage = '越界告警：进入危险区域';
        breachCounter = 0;
      }

      const battery = Math.max(5, device.battery - Math.floor((time - start) / 3600000) * 5);
      const temperature = device.temperature + (Math.random() - 0.5) * 3;
      const speed = stayCounter > 0 ? 0 : Math.random() * 20 + 5;

      points.push({
        lat: currentLat,
        lng: currentLng,
        timestamp: new Date(time).toISOString(),
        speed,
        battery,
        temperature,
        isAbnormal,
        abnormalType,
        abnormalMessage
      });
    }

    const segments: TrackSegment[] = [];
    let currentSegment: TrackPoint[] = [];
    let currentIsNormal = true;

    points.forEach((point, idx) => {
      const isNormal = !point.isAbnormal;
      if (idx === 0) {
        currentSegment = [point];
        currentIsNormal = isNormal;
      } else if (isNormal !== currentIsNormal) {
        segments.push({
          points: currentSegment,
          isNormal: currentIsNormal,
          abnormalType: currentSegment[0].abnormalType,
          startTime: currentSegment[0].timestamp,
          endTime: currentSegment[currentSegment.length - 1].timestamp
        });
        currentSegment = [point];
        currentIsNormal = isNormal;
      } else {
        currentSegment.push(point);
      }
    });

    if (currentSegment.length > 0) {
      segments.push({
        points: currentSegment,
        isNormal: currentIsNormal,
        abnormalType: currentSegment[0].abnormalType,
        startTime: currentSegment[0].timestamp,
        endTime: currentSegment[currentSegment.length - 1].timestamp
      });
    }

    const stayPoints: StayPoint[] = [];
    let stayStart: TrackPoint | null = null;
    let stayDuration = 0;

    points.forEach((point, idx) => {
      if (point.speed !== undefined && point.speed < 1) {
        if (!stayStart) {
          stayStart = point;
          stayDuration = 0;
        } else {
          stayDuration += 30;
        }
      } else {
        if (stayStart && stayDuration >= 120) {
          stayPoints.push({
            lat: stayStart.lat,
            lng: stayStart.lng,
            startTime: stayStart.timestamp,
            endTime: point.timestamp,
            duration: stayDuration,
            name: `停留点 ${stayPoints.length + 1}`
          });
        }
        stayStart = null;
        stayDuration = 0;
      }
    });

    const breachEvents = points.filter(p => p.isAbnormal && p.abnormalType === 'fence_breach');

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const R = 6371000;
      const rad = Math.PI / 180;
      const dLat = (points[i].lat - points[i - 1].lat) * rad;
      const dLng = (points[i].lng - points[i - 1].lng) * rad;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(points[i - 1].lat * rad) * Math.cos(points[i].lat * rad) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      totalDistance += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    return {
      deviceId,
      deviceName: device.name,
      startTime,
      endTime,
      points,
      segments,
      stayPoints,
      breachEvents,
      totalDistance: Math.round(totalDistance),
      totalDuration: Math.floor((end - start) / 1000)
    };
  }

  function loadTrackData(deviceId: string, startTime: string, endTime: string) {
    playbackDeviceId.value = deviceId;
    playbackStartTime.value = startTime;
    playbackEndTime.value = endTime;
    trackData.value = generateMockTrackData(deviceId, startTime, endTime);
    playbackCurrentIndex.value = 0;
    stopPlayback();
  }

  function startPlayback() {
    if (!trackData.value || trackData.value.points.length === 0) return;

    if (playbackCurrentIndex.value >= trackData.value.points.length - 1) {
      playbackCurrentIndex.value = 0;
    }

    isPlaying.value = true;
    const baseInterval = 200;

    if (playbackInterval.value) {
      clearInterval(playbackInterval.value);
    }

    playbackInterval.value = window.setInterval(() => {
      if (playbackCurrentIndex.value < trackData.value!.points.length - 1) {
        playbackCurrentIndex.value += playbackSpeed.value;
        if (playbackCurrentIndex.value >= trackData.value!.points.length - 1) {
          playbackCurrentIndex.value = trackData.value!.points.length - 1;
          stopPlayback();
        }
      } else {
        stopPlayback();
      }
    }, baseInterval);
  }

  function pausePlayback() {
    isPlaying.value = false;
    if (playbackInterval.value) {
      clearInterval(playbackInterval.value);
      playbackInterval.value = null;
    }
  }

  function stopPlayback() {
    isPlaying.value = false;
    if (playbackInterval.value) {
      clearInterval(playbackInterval.value);
      playbackInterval.value = null;
    }
  }

  function seekToIndex(index: number) {
    if (!trackData.value) return;
    playbackCurrentIndex.value = Math.max(0, Math.min(index, trackData.value.points.length - 1));
  }

  function seekToProgress(progress: number) {
    if (!trackData.value || trackData.value.points.length === 0) return;
    const index = Math.floor(progress * (trackData.value.points.length - 1) / 100);
    seekToIndex(index);
  }

  function setPlaybackSpeed(speed: number) {
    playbackSpeed.value = speed;
    if (isPlaying.value) {
      pausePlayback();
      startPlayback();
    }
  }

  function jumpToStayPoint(stayPoint: StayPoint) {
    if (!trackData.value) return;
    const idx = trackData.value.points.findIndex(p => p.timestamp >= stayPoint.startTime);
    if (idx !== -1) {
      seekToIndex(idx);
    }
  }

  function jumpToBreachEvent(breachPoint: TrackPoint) {
    if (!trackData.value) return;
    const idx = trackData.value.points.findIndex(p => p.timestamp === breachPoint.timestamp);
    if (idx !== -1) {
      seekToIndex(idx);
    }
  }

  function enableTrackPlayback() {
    trackPlaybackEnabled.value = true;
  }

  function disableTrackPlayback() {
    trackPlaybackEnabled.value = false;
    stopPlayback();
    trackData.value = null;
    playbackDeviceId.value = null;
    playbackCurrentIndex.value = 0;
  }

  function toggleTrackVisibility() {
    showTrack.value = !showTrack.value;
  }

  function toggleStayPointsVisibility() {
    showStayPoints.value = !showStayPoints.value;
  }

  function toggleBreachEventsVisibility() {
    showBreachEvents.value = !showBreachEvents.value;
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}小时${minutes}分${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
  }

  function formatDistance(meters: number): string {
    if (meters >= 1000) {
      return (meters / 1000).toFixed(2) + ' 公里';
    }
    return meters + ' 米';
  }

  function generateHealthHistory(device: Device, hours: number = 24): HealthDataPoint[] {
    const points: HealthDataPoint[] = [];
    const now = new Date();
    const interval = 30 * 60 * 1000;

    let currentBattery = device.battery;
    let currentTemp = device.temperature;

    for (let i = hours * 2; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * interval);

      currentBattery = Math.max(0, Math.min(100, currentBattery + (Math.random() - 0.6) * 2));
      currentTemp = Math.max(0, Math.min(60, currentTemp + (Math.random() - 0.5) * 3));

      const isOnline = device.status !== 'offline' || Math.random() > 0.1;

      points.push({
        timestamp: timestamp.toISOString(),
        battery: Math.round(currentBattery * 10) / 10,
        temperature: Math.round(currentTemp * 10) / 10,
        isOnline
      });
    }

    return points;
  }

  function calculateHealthScore(device: Device): number {
    let score = 100;

    if (device.status === 'offline') {
      score -= 50;
    } else if (device.status === 'alert') {
      score -= 25;
    }

    if (device.battery < 10) {
      score -= 30;
    } else if (device.battery < 20) {
      score -= 20;
    } else if (device.battery < 30) {
      score -= 10;
    } else if (device.battery < 50) {
      score -= 5;
    }

    if (device.temperature > 45) {
      score -= 25;
    } else if (device.temperature > 38) {
      score -= 15;
    } else if (device.temperature > 35) {
      score -= 5;
    }

    const deviceAlerts = alerts.value.filter(a => a.deviceId === device.id && !a.acknowledged);
    if (deviceAlerts.length > 0) {
      const criticalCount = deviceAlerts.filter(a => a.severity === 'critical').length;
      const warningCount = deviceAlerts.filter(a => a.severity === 'warning').length;
      score -= criticalCount * 15 + warningCount * 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  function calculateHealthTrend(history: HealthDataPoint[]): 'improving' | 'stable' | 'declining' {
    const recentData = history.slice(-8);
    const olderData = history.slice(-16, -8);

    if (recentData.length < 4 || olderData.length < 4) return 'stable';

    const recentAvg = recentData.reduce((sum, p) => sum + p.battery, 0) / recentData.length;
    const olderAvg = olderData.reduce((sum, p) => sum + p.battery, 0) / olderData.length;

    const diff = recentAvg - olderAvg;

    if (diff > 2) return 'improving';
    if (diff < -2) return 'declining';
    return 'stable';
  }

  function generateRecommendations(device: Device, healthScore: number): string[] {
    const recommendations: string[] = [];

    if (device.status === 'offline') {
      recommendations.push('设备离线，需立即检查连接状态');
    }

    if (device.battery < 10) {
      recommendations.push('电量严重不足，请立即充电或更换电池');
    } else if (device.battery < 20) {
      recommendations.push('电量偏低，建议尽快充电');
    }

    if (device.temperature > 45) {
      recommendations.push('温度过高，存在过热风险，请检查设备散热');
    } else if (device.temperature > 38) {
      recommendations.push('温度偏高，建议检查设备运行环境');
    }

    if (healthScore < 40) {
      recommendations.push('设备健康状态差，建议优先巡检');
    } else if (healthScore < 60) {
      recommendations.push('设备健康状态一般，建议近期安排巡检');
    }

    if (recommendations.length === 0) {
      recommendations.push('设备运行正常，继续保持观察');
    }

    return recommendations;
  }

  function getDeviceAlertsCount(deviceId: string): number {
    return alerts.value.filter(a => a.deviceId === deviceId && !a.acknowledged).length;
  }

  function getLastAbnormal(deviceId: string): { time: string; type: AlertType } | null {
    const deviceAlerts = alerts.value
      .filter(a => a.deviceId === deviceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (deviceAlerts.length > 0) {
      return { time: deviceAlerts[0].timestamp, type: deviceAlerts[0].type };
    }
    return null;
  }

  function calculateOnlineHours(history: HealthDataPoint[]): { online: number; offline: number } {
    const onlinePoints = history.filter(p => p.isOnline).length;
    const totalPoints = history.length;
    const totalHours = totalPoints * 0.5;
    return {
      online: Math.round((onlinePoints / totalPoints) * totalHours * 10) / 10,
      offline: Math.round(((totalPoints - onlinePoints) / totalPoints) * totalHours * 10) / 10
    };
  }

  const deviceHealthList = computed<DeviceHealth[]>(() => {
    const healthData = devices.value.map((device) => {
      const historyData = generateHealthHistory(device);
      const healthScore = calculateHealthScore(device);
      const healthTrend = calculateHealthTrend(historyData);
      const recommendations = generateRecommendations(device, healthScore);
      const alertCount = getDeviceAlertsCount(device.id);
      const lastAbnormal = getLastAbnormal(device.id);
      const { online, offline } = calculateOnlineHours(historyData);

      return {
        deviceId: device.id,
        deviceName: device.name,
        healthScore,
        batteryLevel: device.battery,
        temperatureLevel: device.temperature,
        onlineHours: online,
        offlineHours: offline,
        alertCount,
        healthTrend,
        lastAbnormalTime: lastAbnormal?.time,
        lastAbnormalType: lastAbnormal?.type,
        priorityRank: 0,
        recommendations,
        historyData
      };
    });

    healthData.sort((a, b) => {
      if (a.healthScore !== b.healthScore) {
        return a.healthScore - b.healthScore;
      }
      if (a.alertCount !== b.alertCount) {
        return b.alertCount - a.alertCount;
      }
      return a.batteryLevel - b.batteryLevel;
    });

    return healthData.map((h, idx) => ({ ...h, priorityRank: idx + 1 }));
  });

  const priorityInspectionList = computed(() => {
    return deviceHealthList.value.filter(h => h.healthScore < 60);
  });

  const healthSummary = computed<HealthSummary>(() => {
    const list = deviceHealthList.value;
    if (list.length === 0) {
      return {
        avgHealthScore: 0,
        totalAlertCount: 0,
        avgOnlineRate: 0,
        avgBatteryLevel: 0,
        highPriorityCount: 0,
        mediumPriorityCount: 0,
        lowPriorityCount: 0
      };
    }

    const avgHealthScore = Math.round(list.reduce((sum, h) => sum + h.healthScore, 0) / list.length);
    const totalAlertCount = list.reduce((sum, h) => sum + h.alertCount, 0);
    const avgOnlineRate = Math.round((list.reduce((sum, h) => sum + (h.onlineHours / (h.onlineHours + h.offlineHours)), 0) / list.length) * 100);
    const avgBatteryLevel = Math.round(list.reduce((sum, h) => sum + h.batteryLevel, 0) / list.length);

    const highPriorityCount = list.filter(h => h.healthScore < 40).length;
    const mediumPriorityCount = list.filter(h => h.healthScore >= 40 && h.healthScore < 70).length;
    const lowPriorityCount = list.filter(h => h.healthScore >= 70).length;

    return {
      avgHealthScore,
      totalAlertCount,
      avgOnlineRate,
      avgBatteryLevel,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount
    };
  });

  const recentAbnormalRecords = computed(() => {
    return [...alerts.value]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  });

  function getDeviceHealth(deviceId: string): DeviceHealth | undefined {
    return deviceHealthList.value.find(h => h.deviceId === deviceId);
  }

  // ===== 班组统计引擎：班组视图与设备详情下钻共用同一口径 =====

  const statsPeriod = ref<StatsPeriod>('day');
  const statsGroupFilter = ref<string>(GROUP_FILTER_ALL);
  const statsLoading = ref(false);
  const statsError = ref<string | null>(null);
  const statsUpdatedAt = ref<string>('');
  const devicePeriodStats = ref<DevicePeriodStat[]>([]);
  let statsLoadToken = 0;

  const PERIOD_MS: Record<StatsPeriod, number> = {
    day: 24 * 3600 * 1000,
    week: 7 * 24 * 3600 * 1000,
    month: 30 * 24 * 3600 * 1000,
  };

  function hashSeed(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  interface PeriodSample {
    time: number;
    online: boolean;
    score: number;
    battery: number;
    temperature: number;
  }

  function periodRange(period: StatsPeriod, end: number) {
    const span = PERIOD_MS[period];
    return { start: end - span, end, span };
  }

  // 与 calculateHealthScore 完全一致的扣分口径（作用于单个采样点）
  function scoreAtSample(device: Device, battery: number, temperature: number, time: number): number {
    let score = 100;

    if (device.status === 'offline') {
      score -= 50;
    } else if (device.status === 'alert') {
      score -= 25;
    }

    if (battery < 10) {
      score -= 30;
    } else if (battery < 20) {
      score -= 20;
    } else if (battery < 30) {
      score -= 10;
    } else if (battery < 50) {
      score -= 5;
    }

    if (temperature > 45) {
      score -= 25;
    } else if (temperature > 38) {
      score -= 15;
    } else if (temperature > 35) {
      score -= 5;
    }

    const periodAlerts = alerts.value.filter(a => a.deviceId === device.id && !a.acknowledged && new Date(a.timestamp).getTime() <= time);
    if (periodAlerts.length > 0) {
      const crit = periodAlerts.filter(a => a.severity === 'critical').length;
      const warn = periodAlerts.filter(a => a.severity === 'warning').length;
      score -= crit * 15 + warn * 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  function buildPeriodSamples(device: Device, period: StatsPeriod, windowEnd: number): PeriodSample[] {
    const { start, end } = periodRange(period, windowEnd);
    const span = end - start;
    // 日：30 分钟；周：约 1 小时；月：约 4 小时
    const step = Math.max(30 * 60 * 1000, Math.round(span / 48 / (30 * 60 * 1000)) * 30 * 60 * 1000);
    const rng = mulberry32(hashSeed(device.id + ':' + period + ':' + Math.floor(windowEnd / span)));

    const lastSeenMs = new Date(device.lastSeen).getTime();
    let battery = Math.max(0, Math.min(100, device.battery));
    let temperature = device.temperature > 0 ? device.temperature : 25;
    const samples: PeriodSample[] = [];

    for (let time = start; time <= end; time += step) {
      battery = Math.max(0, Math.min(100, battery + (rng() - 0.6) * 2));
      temperature = Math.max(0, Math.min(60, temperature + (rng() - 0.5) * 3));

      let online = true;
      if (device.status === 'offline') {
        online = time < lastSeenMs;
      } else {
        online = rng() > 0.05;
      }

      if (!online) {
        samples.push({ time, online: false, score: Math.max(0, scoreAtSample(device, battery, temperature, time) - 30), battery: 0, temperature: 0 });
      } else {
        samples.push({ time, online: true, score: scoreAtSample(device, battery, temperature, time), battery, temperature });
      }
    }

    return samples;
  }

  function trendFromDelta(delta: number): DevicePeriodStat['healthTrend'] {
    if (delta > 2) return 'improving';
    if (delta < -2) return 'declining';
    return 'stable';
  }

  function downsample(values: number[], target: number): number[] {
    if (values.length <= target) return values;
    const out: number[] = [];
    for (let i = 0; i < target; i++) {
      const idx = Math.round((i / (target - 1)) * (values.length - 1));
      out.push(values[idx]);
    }
    return out;
  }

  function buildDevicePeriodStat(device: Device, period: StatsPeriod, now: number): DevicePeriodStat {
    const span = PERIOD_MS[period];
    const currentSamples = buildPeriodSamples(device, period, now);
    const prevSamples = buildPeriodSamples(device, period, now - span);

    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
    const round1 = (v: number) => Math.round(v * 10) / 10;

    const onlineSamples = currentSamples.filter(s => s.online);
    const prevOnlineSamples = prevSamples.filter(s => s.online);
    const healthScore = Math.round(avg(currentSamples.map(s => s.score)));
    const prevHealthScore = Math.round(avg(prevSamples.map(s => s.score)));

    const onlineRate = Math.round((onlineSamples.length / Math.max(1, currentSamples.length)) * 100);
    const prevOnlineRate = Math.round((prevOnlineSamples.length / Math.max(1, prevSamples.length)) * 100);

    const { start, end } = periodRange(period, now);
    const prevRange = periodRange(period, now - span);
    const inWindow = (a: Alert, s: number, e: number) => {
      const t = new Date(a.timestamp).getTime();
      return t >= s && t < e;
    };
    const deviceAlerts = alerts.value.filter(a => a.deviceId === device.id);
    const periodAlerts = deviceAlerts.filter(a => inWindow(a, start, end));
    const prevPeriodAlerts = deviceAlerts.filter(a => inWindow(a, prevRange.start, prevRange.end));

    const lowSamples = onlineSamples.filter(s => s.battery < 20).length;
    const hotSamples = onlineSamples.filter(s => s.temperature > 38).length;
    const prevLowSamples = prevOnlineSamples.filter(s => s.battery < 20).length;
    const prevHotSamples = prevOnlineSamples.filter(s => s.temperature > 38).length;

    // 巡检耗时口径：严重 20 分钟/条、警告 8 分钟/条，低电量或高温采样点各 3 分钟，封顶 600 分钟
    const inspectionMinutes = Math.min(600,
      periodAlerts.filter(a => a.severity === 'critical').length * 20 +
      periodAlerts.filter(a => a.severity !== 'critical').length * 8 +
      (lowSamples + hotSamples) * 3);
    const prevInspectionMinutes = Math.min(600,
      prevPeriodAlerts.filter(a => a.severity === 'critical').length * 20 +
      prevPeriodAlerts.filter(a => a.severity !== 'critical').length * 8 +
      (prevLowSamples + prevHotSamples) * 3);

    const latestAlert = deviceAlerts
      .filter(a => inWindow(a, start, end))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    return {
      deviceId: device.id,
      deviceName: device.name,
      groupId: device.groupId,
      healthScore,
      prevHealthScore,
      scoreDelta: healthScore - prevHealthScore,
      healthTrend: trendFromDelta(healthScore - prevHealthScore),
      onlineRate,
      prevOnlineRate,
      abnormalCount: periodAlerts.length,
      prevAbnormalCount: prevPeriodAlerts.length,
      isAbnormal: device.status === 'alert' || device.status === 'offline' || periodAlerts.length > 0,
      inspectionMinutes,
      prevInspectionMinutes,
      avgBattery: Math.round(avg(onlineSamples.map(s => s.battery))),
      avgTemperature: round1(avg(onlineSamples.map(s => s.temperature))),
      scoreSeries: downsample(currentSamples.map(s => s.score), 24),
      lastAlertTime: latestAlert?.timestamp,
    };
  }

  const filteredDeviceStats = computed<DevicePeriodStat[]>(() => {
    if (statsGroupFilter.value === GROUP_FILTER_ALL) return devicePeriodStats.value;
    return devicePeriodStats.value.filter(s =>
      statsGroupFilter.value === UNGROUPED_FILTER ? !s.groupId : s.groupId === statsGroupFilter.value
    );
  });

  const groupStatistics = computed<GroupStatistic[]>(() => {
    const buckets = new Map<string | null, DevicePeriodStat[]>();
    filteredDeviceStats.value.forEach(s => {
      const key = s.groupId ?? null;
      const list = buckets.get(key) || [];
      list.push(s);
      buckets.set(key, list);
    });

    const stats: GroupStatistic[] = [];
    groups.value.forEach(g => {
      if (statsGroupFilter.value !== GROUP_FILTER_ALL && statsGroupFilter.value !== g.id) return;
      const list = buckets.get(g.id) || [];
      stats.push(aggregateGroup(g.id, g.name, g.color, list));
    });
    if (statsGroupFilter.value === GROUP_FILTER_ALL || statsGroupFilter.value === UNGROUPED_FILTER) {
      const list = buckets.get(null) || [];
      if (list.length > 0) {
        stats.push(aggregateGroup(null, '未分组设备', '#757575', list));
      }
    }
    return stats.sort((a, b) => a.avgHealthScore - b.avgHealthScore || b.abnormalDeviceCount - a.abnormalDeviceCount);
  });

  function aggregateGroup(groupId: string | null, groupName: string, groupColor: string, list: DevicePeriodStat[]): GroupStatistic {
    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
    const deviceCount = list.length;
    const avgHealthScore = Math.round(avg(list.map(d => d.healthScore)));
    const prevAvgHealthScore = Math.round(avg(list.map(d => d.prevHealthScore)));
    const onlineRate = Math.round(avg(list.map(d => d.onlineRate)));
    const prevOnlineRate = Math.round(avg(list.map(d => d.prevOnlineRate)));
    return {
      groupId,
      groupName,
      groupColor,
      deviceCount,
      avgHealthScore,
      prevAvgHealthScore,
      healthDelta: deviceCount ? avgHealthScore - prevAvgHealthScore : 0,
      abnormalDeviceCount: list.filter(d => d.isAbnormal).length,
      onlineRate,
      prevOnlineRate,
      onlineRateDelta: deviceCount ? onlineRate - prevOnlineRate : 0,
      totalInspectionMinutes: list.reduce((s, d) => s + d.inspectionMinutes, 0),
      prevInspectionMinutes: list.reduce((s, d) => s + d.prevInspectionMinutes, 0),
      totalAlerts: list.reduce((s, d) => s + d.abnormalCount, 0),
      improvingCount: list.filter(d => d.healthTrend === 'improving').length,
      stableCount: list.filter(d => d.healthTrend === 'stable').length,
      decliningCount: list.filter(d => d.healthTrend === 'declining').length,
      deviceStats: [...list].sort((a, b) => a.healthScore - b.healthScore),
    };
  }

  const statsOverview = computed<StatsOverview>(() => {
    const list = filteredDeviceStats.value;
    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
    return {
      deviceCount: list.length,
      abnormalDeviceCount: list.filter(d => d.isAbnormal).length,
      avgHealthScore: Math.round(avg(list.map(d => d.healthScore))),
      prevAvgHealthScore: Math.round(avg(list.map(d => d.prevHealthScore))),
      avgOnlineRate: Math.round(avg(list.map(d => d.onlineRate))),
      prevAvgOnlineRate: Math.round(avg(list.map(d => d.prevOnlineRate))),
      totalInspectionMinutes: list.reduce((s, d) => s + d.inspectionMinutes, 0),
      prevTotalInspectionMinutes: list.reduce((s, d) => s + d.prevInspectionMinutes, 0),
      totalAlerts: list.reduce((s, d) => s + d.abnormalCount, 0),
      prevTotalAlerts: list.reduce((s, d) => s + d.prevAbnormalCount, 0),
    };
  });

  async function refreshStatistics(period: StatsPeriod = statsPeriod.value) {
    const token = ++statsLoadToken;
    statsLoading.value = true;
    statsError.value = null;

    await new Promise(resolve => setTimeout(resolve, 250));

    try {
      if (devices.value.length === 0) {
        throw new Error('暂无设备数据');
      }
      const now = Date.now();
      const result = devices.value.map(d => {
        // 单台计算失败不应拖垮整页，但需显式抛出以便外层统一兜底
        if (!d || !d.id) throw new Error('设备数据不完整');
        return buildDevicePeriodStat(d, period, now);
      });
      if (token !== statsLoadToken) return;
      devicePeriodStats.value = result;
      statsUpdatedAt.value = new Date(now).toISOString();
      statsError.value = null;
    } catch (err) {
      if (token !== statsLoadToken) return;
      devicePeriodStats.value = [];
      statsError.value = err instanceof Error ? err.message : '统计计算失败，请重试';
    } finally {
      if (token === statsLoadToken) {
        statsLoading.value = false;
      }
    }
  }

  function setStatsPeriod(period: StatsPeriod) {
    statsPeriod.value = period;
    refreshStatistics(period);
  }

  function setStatsGroupFilter(filter: string) {
    statsGroupFilter.value = filter;
  }

  function getDevicePeriodStat(deviceId: string): DevicePeriodStat | undefined {
    return devicePeriodStats.value.find(s => s.deviceId === deviceId);
  }

  return {
    devices, fences, alerts, selectedFenceId, editMode, highlightedDeviceId,
    isRegisteringDevice, registrationLocation, groups,
    onlineCount, offlineCount, alertDeviceCount, deviceCount, fenceCount, alertCount, selectedFence,
    avgBattery, avgTemperature, lowBatteryCount, devicesRanked, recentAlerts,
    unacknowledgedAlerts, criticalAlerts, warningAlerts, infoAlerts,
    criticalCount, warningCount, infoCount,
    trackPlaybackEnabled, trackData, playbackDeviceId,
    playbackStartTime, playbackEndTime, playbackCurrentIndex,
    isPlaying, playbackSpeed, showTrack, showStayPoints, showBreachEvents,
    playbackCurrentPoint, playbackProgress, playbackCurrentTime,
    deviceHealthList, priorityInspectionList, healthSummary, recentAbnormalRecords,
    statsPeriod, statsGroupFilter, statsLoading, statsError, statsUpdatedAt,
    devicePeriodStats, filteredDeviceStats, groupStatistics, statsOverview,
    refreshStatistics, setStatsPeriod, setStatsGroupFilter, getDevicePeriodStat,
    getDeviceById, getFenceById, getGroupById, getDeviceHealth,
    acknowledgeAlert, batchAcknowledgeAlerts, acknowledgeAllAlerts,
    setHighlightedDevice, addAlert, generateMockAlert,
    startMockAlertStream, stopMockAlertStream,
    addFence, updateFence, deleteFence, selectFence, setEditMode,
    addDevice, startDeviceRegistration, cancelDeviceRegistration, setRegistrationLocation,
    loadTrackData, startPlayback, pausePlayback, stopPlayback,
    seekToIndex, seekToProgress, setPlaybackSpeed,
    jumpToStayPoint, jumpToBreachEvent,
    enableTrackPlayback, disableTrackPlayback,
    toggleTrackVisibility, toggleStayPointsVisibility, toggleBreachEventsVisibility,
    formatDuration, formatDistance
  };
});

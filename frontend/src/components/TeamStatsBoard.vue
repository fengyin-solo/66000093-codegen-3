<template>
  <div style="width:420px;padding:16px;overflow:auto;border-left:1px solid #e0e0e0;display:flex;flex-direction:column;height:100vh;box-sizing:border-box;background:#f5f5f5">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-shrink:0">
      <h3 style="margin:0;display:flex;align-items:center;gap:8px;font-size:16px;color:#1b5e20">
        <span style="font-size:20px">👥</span>
        班组统计
      </h3>
      <div style="display:flex;align-items:center;gap:8px">
        <span v-if="result.status === 'ok'"
          :style="{ padding:'4px 10px', borderRadius:'12px', fontSize:'12px', fontWeight:600,
            background: getHealthScoreBgColor(result.overview.avgHealthScore),
            color: getHealthScoreTextColor(result.overview.avgHealthScore) }">
          综合评分 {{ result.overview.avgHealthScore }}
        </span>
        <button @click="handleRetry" title="重新计算"
          style="width:28px;height:28px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">
          🔄
        </button>
      </div>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:12px;flex-shrink:0">
      <button v-for="p in PERIODS" :key="p.key" @click="handlePeriodChange(p.key)"
        :style="{ flex:1, padding:'8px', borderRadius:'6px', border:'1px solid ' + (store.statsPeriod === p.key ? '#1976d2' : '#ddd'),
          background: store.statsPeriod === p.key ? '#e3f2fd' : '#fff', color: store.statsPeriod === p.key ? '#1976d2' : '#666',
          cursor:'pointer', fontSize:'12px', fontWeight:500 }">
        {{ p.label }}
      </button>
    </div>

    <div v-if="result.status === 'error'"
      style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;border-radius:8px;border:1px solid #ffcdd2;padding:32px 20px;text-align:center">
      <div style="font-size:36px;margin-bottom:12px">⚠️</div>
      <div style="font-size:14px;font-weight:600;color:#c62828;margin-bottom:6px">统计计算失败</div>
      <div style="font-size:12px;color:#888;margin-bottom:16px;line-height:1.6">
        {{ result.message || '统计数据计算过程中出现异常，请重试。' }}
      </div>
      <button @click="handleRetry"
        style="padding:8px 24px;border-radius:6px;border:none;background:#1976d2;color:#fff;cursor:pointer;font-size:13px;font-weight:500">
        🔄 重新计算
      </button>
    </div>

    <div v-else-if="result.status === 'empty'"
      style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;border-radius:8px;border:1px solid #e0e0e0;padding:32px 20px;text-align:center">
      <div style="font-size:36px;margin-bottom:12px">📭</div>
      <div style="font-size:14px;font-weight:600;color:#666;margin-bottom:6px">暂无统计数据</div>
      <div style="font-size:12px;color:#888;margin-bottom:16px;line-height:1.6">
        {{ result.message || '当前筛选条件下没有可统计的数据。' }}
      </div>
      <button @click="handleRetry"
        style="padding:8px 24px;border-radius:6px;border:1px solid #1976d2;background:#fff;color:#1976d2;cursor:pointer;font-size:13px;font-weight:500">
        🔄 重试
      </button>
    </div>

    <template v-else>
      <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e0e0e0;margin-bottom:12px;flex-shrink:0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <h4 style="margin:0;font-size:13px;color:#333;display:flex;align-items:center;gap:6px">📊 概览看板</h4>
          <span style="font-size:11px;color:#888">{{ currentPeriodLabel }}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div style="padding:10px 8px;background:#f5f5f5;border-radius:6px;text-align:center">
            <div style="font-size:18px;font-weight:700;color:#1565c0">{{ result.overview.deviceCount }}</div>
            <div style="font-size:10px;color:#888;margin-top:2px">设备总数</div>
          </div>
          <div style="padding:10px 8px;background:#f5f5f5;border-radius:6px;text-align:center">
            <div style="font-size:18px;font-weight:700;color:#7b1fa2">{{ result.overview.groupCount }}</div>
            <div style="font-size:10px;color:#888;margin-top:2px">班组数</div>
          </div>
          <div style="padding:10px 8px;background:#f5f5f5;border-radius:6px;text-align:center">
            <div :style="{ fontSize:'18px', fontWeight:700, color: result.overview.abnormalCount > 0 ? '#c62828' : '#2e7d32' }">
              {{ result.overview.abnormalCount }}
            </div>
            <div style="font-size:10px;color:#888;margin-top:2px">异常台数</div>
          </div>
          <div style="padding:10px 8px;background:#f5f5f5;border-radius:6px;text-align:center">
            <div :style="{ fontSize:'18px', fontWeight:700, color: getHealthScoreTextColor(result.overview.avgHealthScore) }">
              {{ result.overview.avgHealthScore }}
            </div>
            <div style="font-size:10px;color:#888;margin-top:2px">
              平均评分
              <span :style="{ color: getScoreChangeColor(result.overview.avgScoreChange), fontWeight:600 }">
                {{ formatScoreChange(result.overview.avgScoreChange) }}
              </span>
            </div>
          </div>
          <div style="padding:10px 8px;background:#f5f5f5;border-radius:6px;text-align:center">
            <div :style="{ fontSize:'18px', fontWeight:700, color: result.overview.avgOnlineRate >= 90 ? '#2e7d32' : '#e65100' }">
              {{ result.overview.avgOnlineRate }}%
            </div>
            <div style="font-size:10px;color:#888;margin-top:2px">平均在线率</div>
          </div>
          <div style="padding:10px 8px;background:#f5f5f5;border-radius:6px;text-align:center">
            <div style="font-size:18px;font-weight:700;color:#e65100">{{ formatMinutes(result.overview.inspectionMinutes) }}</div>
            <div style="font-size:10px;color:#888;margin-top:2px">预计巡检耗时</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:10px;padding-top:8px;border-top:1px dashed #eee;font-size:11px;color:#888;justify-content:center">
          <span>📈 好转 {{ result.overview.improvingCount }}</span>
          <span>➡️ 稳定 {{ result.overview.stableCount }}</span>
          <span>📉 恶化 {{ result.overview.decliningCount }}</span>
        </div>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;flex-shrink:0">
        <button @click="handleGroupFilter(null)"
          :style="{ padding:'4px 12px', borderRadius:'14px', border:'1px solid ' + (selectedGroupId === null ? '#1976d2' : '#ddd'),
            background: selectedGroupId === null ? '#e3f2fd' : '#fff', color: selectedGroupId === null ? '#1976d2' : '#666',
            cursor:'pointer', fontSize:'11px', fontWeight:500 }">
          全部班组
        </button>
        <button v-for="g in result.groups" :key="g.groupId" @click="handleGroupFilter(g.groupId)"
          :style="{ padding:'4px 12px', borderRadius:'14px', border:'1px solid ' + (selectedGroupId === g.groupId ? g.color : '#ddd'),
            background: selectedGroupId === g.groupId ? g.color + '20' : '#fff', color: selectedGroupId === g.groupId ? g.color : '#666',
            cursor:'pointer', fontSize:'11px', fontWeight:500 }">
          {{ g.groupName }} ({{ g.deviceCount }})
        </button>
      </div>

      <div v-if="visibleGroups.length === 0"
        style="text-align:center;padding:32px 20px;background:#fff;border-radius:8px;border:1px solid #e0e0e0;color:#999;font-size:12px">
        <div style="font-size:28px;margin-bottom:8px">🔍</div>
        <div style="margin-bottom:12px">所选班组在当前周期内没有设备数据</div>
        <button @click="handleGroupFilter(null)"
          style="padding:6px 16px;border-radius:6px;border:1px solid #1976d2;background:#fff;color:#1976d2;cursor:pointer;font-size:12px">
          查看全部班组
        </button>
      </div>

      <div style="flex:1;overflow:auto;display:flex;flex-direction:column;gap:8px">
        <div v-for="group in visibleGroups" :key="group.groupId"
          style="background:#fff;border-radius:8px;border:1px solid #e0e0e0;overflow:hidden;flex-shrink:0">
          <div @click="toggleGroupExpand(group.groupId)"
            :style="{ display:'flex', alignItems:'center', gap:'10px', padding:'12px', cursor:'pointer',
              background: expandedGroupId === group.groupId ? group.color + '10' : '#fff' }">
            <span :style="{ width:'10px', height:'10px', borderRadius:'50%', background: group.color, flexShrink:0 }"></span>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-weight:600;font-size:13px;color:#333">{{ group.groupName }}</span>
                <span style="font-size:10px;color:#999">{{ group.deviceCount }} 台</span>
              </div>
            </div>
            <span :style="{ fontSize:'12px', padding:'2px 8px', borderRadius:'10px', fontWeight:600,
              background: getHealthScoreBgColor(group.avgHealthScore),
              color: getHealthScoreTextColor(group.avgHealthScore) }">
              {{ group.avgHealthScore }}分
            </span>
            <span :style="{ fontSize:'12px', color:'#999', transition:'transform 0.2s', transform: expandedGroupId === group.groupId ? 'rotate(90deg)' : 'none' }">▶</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;padding:0 12px 12px">
            <div style="text-align:center;padding:6px 4px;background:#fafafa;border-radius:6px">
              <div :style="{ fontSize:'14px', fontWeight:700, color: group.abnormalCount > 0 ? '#c62828' : '#2e7d32' }">
                {{ group.abnormalCount }}
              </div>
              <div style="font-size:10px;color:#888">异常台数</div>
            </div>
            <div style="text-align:center;padding:6px 4px;background:#fafafa;border-radius:6px">
              <div :style="{ fontSize:'14px', fontWeight:700, color: group.avgOnlineRate >= 90 ? '#2e7d32' : '#e65100' }">
                {{ group.avgOnlineRate }}%
              </div>
              <div style="font-size:10px;color:#888">在线率</div>
            </div>
            <div style="text-align:center;padding:6px 4px;background:#fafafa;border-radius:6px">
              <div style="font-size:14px;font-weight:700;color:#e65100">{{ formatMinutes(group.inspectionMinutes) }}</div>
              <div style="font-size:10px;color:#888">巡检耗时</div>
            </div>
            <div style="text-align:center;padding:6px 4px;background:#fafafa;border-radius:6px">
              <div :style="{ fontSize:'14px', fontWeight:700, color: getScoreChangeColor(group.avgScoreChange) }">
                {{ formatScoreChange(group.avgScoreChange) }}
              </div>
              <div style="font-size:10px;color:#888">趋势对照</div>
            </div>
          </div>

          <div style="padding:0 12px 12px">
            <div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden">
              <div :style="{ height:'100%', width: group.avgOnlineRate + '%', background: group.color, transition:'width 0.5s' }"></div>
            </div>
            <div style="display:flex;gap:10px;margin-top:6px;font-size:10px;color:#999">
              <span>📈 {{ group.improvingCount }}</span>
              <span>➡️ {{ group.stableCount }}</span>
              <span>📉 {{ group.decliningCount }}</span>
            </div>
          </div>

          <div v-if="expandedGroupId === group.groupId" style="border-top:1px solid #f0f0f0;padding:8px 12px;display:flex;flex-direction:column;gap:6px">
            <div style="font-size:11px;color:#888;display:flex;justify-content:space-between">
              <span>设备明细（与班组统计同一口径）</span>
              <span>低分优先</span>
            </div>
            <div v-for="device in group.devices" :key="device.deviceId"
              @click="handleDeviceClick(device.deviceId)"
              @mouseenter="handleHover(device.deviceId)"
              @mouseleave="handleHover(null)"
              :style="{ display:'flex', alignItems:'center', gap:'8px', padding:'8px', borderRadius:'6px',
                border:'1px solid ' + (store.highlightedDeviceId === device.deviceId ? '#1976d2' : '#eee'),
                background: store.highlightedDeviceId === device.deviceId ? '#e3f2fd' : '#fafafa',
                cursor:'pointer', transition:'all 0.2s ease' }">
              <span :style="{ width:'8px', height:'8px', borderRadius:'50%', flexShrink:0,
                background: device.status === 'online' ? '#4caf50' : device.status === 'alert' ? '#ff9800' : '#9e9e9e' }"></span>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                  <span style="font-size:12px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    {{ device.deviceName }}
                  </span>
                  <span v-if="device.isAbnormal" style="font-size:9px;padding:1px 5px;border-radius:6px;background:#ffebee;color:#c62828;font-weight:600">异常</span>
                </div>
                <div style="font-size:10px;color:#888;display:flex;gap:8px">
                  <span>⏱️ {{ device.onlineRate }}%</span>
                  <span>⚠️ {{ device.alertCount }}</span>
                  <span>🔧 {{ formatMinutes(device.inspectionMinutes) }}</span>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <span :style="{ fontSize:'11px', padding:'1px 6px', borderRadius:'8px', fontWeight:600,
                  background: getHealthScoreBgColor(device.healthScore),
                  color: getHealthScoreTextColor(device.healthScore) }">
                  {{ device.healthScore }}分
                </span>
                <div :style="{ fontSize:'10px', marginTop:'2px', fontWeight:600, color: getScoreChangeColor(device.scoreChange) }">
                  {{ getTrendIcon(device.healthTrend) }} {{ formatScoreChange(device.scoreChange) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e0e0e0;flex-shrink:0">
        <div style="font-size:10px;color:#999;line-height:1.8;text-align:center">
          口径：评分/在线率/趋势与健康诊断一致 · 异常 = 评分&lt;70 或有未处理告警<br/>
          巡检耗时估算：≥70分 10分钟 · 40-69分 25分钟 · &lt;40分 45分钟 · 离线 +10分钟
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useIotStore } from '../stores/iot';
import type { StatsPeriod } from '../types';

const store = useIotStore();

const PERIODS: Array<{ key: StatsPeriod; label: string; rangeLabel: string }> = [
  { key: 'day', label: '日 · 24小时', rangeLabel: '最近24小时' },
  { key: 'week', label: '周 · 7天', rangeLabel: '最近7天' },
  { key: 'month', label: '月 · 30天', rangeLabel: '最近30天' }
];

const selectedGroupId = ref<string | null>(null);
const expandedGroupId = ref<string | null>(null);

const result = computed(() => store.teamStatsResult);

const currentPeriodLabel = computed(() => {
  return PERIODS.find(p => p.key === store.statsPeriod)?.rangeLabel || '';
});

// 班组筛选与下钻共用同一份统计结果，筛选变化后上下层同步
const visibleGroups = computed(() => {
  if (selectedGroupId.value === null) {
    return result.value.groups;
  }
  return result.value.groups.filter(g => g.groupId === selectedGroupId.value);
});

function handlePeriodChange(period: StatsPeriod) {
  store.setStatsPeriod(period);
}

function handleGroupFilter(groupId: string | null) {
  selectedGroupId.value = groupId;
  expandedGroupId.value = groupId;
}

function toggleGroupExpand(groupId: string) {
  expandedGroupId.value = expandedGroupId.value === groupId ? null : groupId;
}

function handleRetry() {
  store.refreshTeamStats();
}

function handleDeviceClick(deviceId: string) {
  store.setHighlightedDevice(deviceId);
}

function handleHover(deviceId: string | null) {
  if (!store.highlightedDeviceId) {
    store.setHighlightedDevice(deviceId);
  }
}

function getHealthScoreBgColor(score: number): string {
  if (score >= 70) return '#e8f5e9';
  if (score >= 40) return '#fff3e0';
  return '#ffebee';
}

function getHealthScoreTextColor(score: number): string {
  if (score >= 70) return '#2e7d32';
  if (score >= 40) return '#e65100';
  return '#c62828';
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'improving': return '📈';
    case 'declining': return '📉';
    default: return '➡️';
  }
}

function getScoreChangeColor(change: number): string {
  if (change > 0) return '#2e7d32';
  if (change < 0) return '#c62828';
  return '#666';
}

function formatScoreChange(change: number): string {
  if (change > 0) return `+${change}`;
  return `${change}`;
}

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h${rest}m` : `${hours}h`;
  }
  return `${minutes}分钟`;
}
</script>

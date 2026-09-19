<template>
  <div style="width:440px;padding:16px;overflow:auto;border-left:1px solid #e0e0e0;display:flex;flex-direction:column;height:100vh;box-sizing:border-box;background:#f5f5f5">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-shrink:0">
      <h3 style="margin:0;display:flex;align-items:center;gap:8px;font-size:16px;color:#1b5e20">
        <span style="font-size:20px">👥</span>
        班组统计
      </h3>
      <button @click="handleRefresh" :disabled="store.statsLoading"
        :style="{ padding:'5px 10px', borderRadius:'6px', border:'1px solid #c8e6c9', background:'#fff',
          color:'#2e7d32', cursor: store.statsLoading ? 'wait' : 'pointer', fontSize:'12px', fontWeight:500 }">
        {{ store.statsLoading ? '⏳ 计算中' : '🔄 刷新' }}
      </button>
    </div>

    <!-- 时间口径切换：日 / 周 / 月 -->
    <div style="display:flex;gap:6px;margin-bottom:10px;flex-shrink:0">
      <button v-for="p in periodOptions" :key="p.value" @click="store.setStatsPeriod(p.value)"
        :style="{ flex:1, padding:'8px', borderRadius:'6px', border:'1px solid ' + (store.statsPeriod === p.value ? '#1b5e20' : '#ddd'),
          background: store.statsPeriod === p.value ? '#e8f5e9' : '#fff', color: store.statsPeriod === p.value ? '#1b5e20' : '#666',
          cursor:'pointer', fontSize:'12px', fontWeight:600 }">
        {{ p.label }}
      </button>
    </div>

    <!-- 班组筛选：变化后班组看板与设备下钻同步生效 -->
    <div style="display:flex;gap:6px;margin-bottom:12px;flex-shrink:0;flex-wrap:wrap">
      <button @click="store.setStatsGroupFilter(statsGroupFilters.ALL)"
        :style="filterBtnStyle(store.statsGroupFilter === statsGroupFilters.ALL)">
        全部
      </button>
      <button v-for="g in store.groups" :key="g.id" @click="store.setStatsGroupFilter(g.id)"
        :style="filterBtnStyle(store.statsGroupFilter === g.id, g.color)">
        <span :style="{ display:'inline-block', width:'7px', height:'7px', borderRadius:'50%', background:g.color, marginRight:'4px' }"></span>
        {{ g.name }}
      </button>
      <button @click="store.setStatsGroupFilter(statsGroupFilters.UNGROUPED)"
        :style="filterBtnStyle(store.statsGroupFilter === statsGroupFilters.UNGROUPED, '#757575')">
        未分组
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="store.statsLoading" style="flex:1;display:flex;flex-direction:column;gap:10px">
      <div v-for="i in 3" :key="i" style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:14px">
        <div style="height:14px;width:40%;background:#eee;border-radius:4px;margin-bottom:12px" class="ts-skeleton"></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          <div v-for="j in 4" :key="j" style="height:34px;background:#f5f5f5;border-radius:6px" class="ts-skeleton"></div>
        </div>
      </div>
    </div>

    <!-- 计算失败：可重试说明 -->
    <div v-else-if="store.statsError"
      style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;background:#fff;border-radius:8px;border:1px solid #ffcdd2">
      <div style="font-size:36px;margin-bottom:10px">⚠️</div>
      <div style="font-size:14px;font-weight:600;color:#c62828;margin-bottom:6px">统计数据暂时不可用</div>
      <div style="font-size:12px;color:#888;margin-bottom:16px;line-height:1.6">
        {{ store.statsError }}<br/>
        健康记录或告警数据读取异常，点击下方按钮可重新计算。
      </div>
      <button @click="handleRefresh"
        style="padding:8px 20px;border-radius:6px;border:none;background:#c62828;color:#fff;cursor:pointer;font-size:13px;font-weight:600">
        🔄 重新加载
      </button>
    </div>

    <!-- 筛选无数据 -->
    <div v-else-if="store.statsOverview.deviceCount === 0"
      style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;background:#fff;border-radius:8px;border:1px solid #e0e0e0">
      <div style="font-size:36px;margin-bottom:10px">📭</div>
      <div style="font-size:14px;font-weight:600;color:#555;margin-bottom:6px">当前筛选下暂无设备数据</div>
      <div style="font-size:12px;color:#999;margin-bottom:16px;line-height:1.6">
        该班组在{{ periodLabel }}时间范围内没有可统计的设备，<br/>请切换班组或时间口径后重试。
      </div>
      <button @click="handleResetFilter"
        style="padding:8px 20px;border-radius:6px;border:1px solid #bbb;background:#fff;color:#555;cursor:pointer;font-size:13px">
        查看全部班组
      </button>
    </div>

    <template v-else>
      <!-- 概览看板 -->
      <div style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e0e0e0;margin-bottom:12px;flex-shrink:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:12px;font-weight:600;color:#333">📈 {{ periodLabel }}概览</span>
          <span style="font-size:10px;color:#999">更新于 {{ formatClock(store.statsUpdatedAt) }}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="padding:10px;background:#f1f8e9;border-radius:6px">
            <div style="font-size:10px;color:#777;margin-bottom:3px">平均健康评分</div>
            <div style="display:flex;align-items:baseline;gap:6px">
              <span :style="{ fontSize:'22px', fontWeight:700, color: scoreColor(store.statsOverview.avgHealthScore) }">
                {{ store.statsOverview.avgHealthScore }}
              </span>
              <DeltaBadge :value="store.statsOverview.avgHealthScore - store.statsOverview.prevAvgHealthScore" suffix="分" />
            </div>
          </div>
          <div style="padding:10px;background:#ffebee;border-radius:6px">
            <div style="font-size:10px;color:#777;margin-bottom:3px">异常台数</div>
            <div style="display:flex;align-items:baseline;gap:6px">
              <span :style="{ fontSize:'22px', fontWeight:700, color: store.statsOverview.abnormalDeviceCount > 0 ? '#c62828' : '#2e7d32' }">
                {{ store.statsOverview.abnormalDeviceCount }}
              </span>
              <span style="font-size:11px;color:#999">/ {{ store.statsOverview.deviceCount }}台</span>
            </div>
          </div>
          <div style="padding:10px;background:#e3f2fd;border-radius:6px">
            <div style="font-size:10px;color:#777;margin-bottom:3px">在线率</div>
            <div style="display:flex;align-items:baseline;gap:6px">
              <span style="font-size:22px;font-weight:700;color:#1565c0">{{ store.statsOverview.avgOnlineRate }}%</span>
              <DeltaBadge :value="store.statsOverview.avgOnlineRate - store.statsOverview.prevAvgOnlineRate" suffix="%" />
            </div>
          </div>
          <div style="padding:10px;background:#fff8e1;border-radius:6px">
            <div style="font-size:10px;color:#777;margin-bottom:3px">巡检耗时</div>
            <div style="display:flex;align-items:baseline;gap:6px">
              <span style="font-size:22px;font-weight:700;color:#e65100">
                {{ formatMinutes(store.statsOverview.totalInspectionMinutes) }}
              </span>
              <DeltaBadge :value="store.statsOverview.totalInspectionMinutes - store.statsOverview.prevTotalInspectionMinutes" invert :unit="'minute'" />
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px dashed #eee;font-size:11px;color:#888">
          <span>告警 <b :style="{ color: store.statsOverview.totalAlerts > 0 ? '#c62828' : '#2e7d32' }">{{ store.statsOverview.totalAlerts }}</b> 条</span>
          <span>较上期
            <b :style="{ color: alarmDeltaColor }">{{ alarmDeltaText }}</b>
          </span>
        </div>
      </div>

      <!-- 设备详情下钻：与班组卡片使用同一份 DevicePeriodStat 口径 -->
      <div v-if="selectedStat" style="background:#fff;padding:12px;border-radius:8px;border:2px solid #1b5e20;margin-bottom:12px;flex-shrink:0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;min-width:0">
            <span style="font-size:15px">📱</span>
            <span style="font-weight:700;font-size:13px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              {{ selectedStat.deviceName }}
            </span>
            <span :style="{ fontSize:'10px', padding:'1px 6px', borderRadius:'8px', flexShrink:0,
              background: scoreBg(selectedStat.healthScore), color: scoreColor(selectedStat.healthScore) }">
              {{ selectedStat.healthScore }}分
            </span>
          </div>
          <button @click="closeDetail" style="background:none;border:none;cursor:pointer;color:#999;font-size:16px;flex-shrink:0">×</button>
        </div>

        <div ref="sparklineRef" style="width:100%;height:56px;margin-bottom:8px"></div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
          <div style="text-align:center;padding:6px;background:#f1f8e9;border-radius:6px">
            <div style="font-size:15px;font-weight:700" :style="{ color: scoreColor(selectedStat.healthScore) }">{{ selectedStat.healthScore }}</div>
            <div style="font-size:10px;color:#888">评分（{{ selectedStat.prevHealthScore }}）</div>
          </div>
          <div style="text-align:center;padding:6px;background:#e3f2fd;border-radius:6px">
            <div style="font-size:15px;font-weight:700;color:#1565c0">{{ selectedStat.onlineRate }}%</div>
            <div style="font-size:10px;color:#888">在线率（{{ selectedStat.prevOnlineRate }}%）</div>
          </div>
          <div style="text-align:center;padding:6px;background:#fff8e1;border-radius:6px">
            <div style="font-size:15px;font-weight:700;color:#e65100">{{ formatMinutes(selectedStat.inspectionMinutes) }}</div>
            <div style="font-size:10px;color:#888">巡检（上期{{ formatMinutes(selectedStat.prevInspectionMinutes) }}）</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:11px;color:#666;margin-bottom:8px">
          <span>异常 <b :style="{ color: selectedStat.abnormalCount > 0 ? '#c62828' : '#2e7d32' }">{{ selectedStat.abnormalCount }}</b> 次
            <span style="color:#aaa">（上期 {{ selectedStat.prevAbnormalCount }}）</span>
          </span>
          <span :style="{ color: trendColor(selectedStat.healthTrend), fontWeight:600 }">
            {{ trendIcon(selectedStat.healthTrend) }} {{ trendText(selectedStat.healthTrend) }}
          </span>
        </div>

        <div style="display:flex;gap:6px">
          <button @click="locateOnMap"
            style="flex:1;padding:6px;border-radius:6px;border:1px solid #1b5e20;background:#fff;color:#1b5e20;cursor:pointer;font-size:12px;font-weight:500">
            🗺️ 地图定位
          </button>
          <button @click="openHealthDiagnosis"
            style="flex:1;padding:6px;border-radius:6px;border:1px solid #1b5e20;background:#1b5e20;color:#fff;cursor:pointer;font-size:12px;font-weight:500">
            🏥 健康诊断
          </button>
        </div>
      </div>

      <!-- 班组分组列表 -->
      <div style="flex:1;display:flex;flex-direction:column;gap:10px;min-height:0">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#666;flex-shrink:0">
          <span>按班组聚合（{{ store.groupStatistics.length }} 个班组）</span>
          <span style="font-size:11px;color:#999">括号内为上{{ periodNoun }}对比</span>
        </div>

        <div v-for="g in store.groupStatistics" :key="g.groupId ?? 'none'"
          style="background:#fff;border-radius:8px;border:1px solid #e0e0e0;overflow:hidden;flex-shrink:0">
          <div @click="toggleGroup(g.groupId)"
            style="display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;user-select:none"
            :style="{ background: expandedGroups.has(g.groupId ?? 'none') ? '#fafafa' : '#fff' }">
            <span :style="{ width:'10px', height:'10px', borderRadius:'3px', background: g.groupColor, flexShrink:0 }"></span>
            <span style="font-weight:600;font-size:13px;color:#333;flex:1">{{ g.groupName }}</span>
            <span style="font-size:11px;color:#999">{{ g.deviceCount }}台</span>
            <span v-if="g.abnormalDeviceCount > 0"
              style="font-size:10px;padding:2px 7px;border-radius:9px;background:#ffebee;color:#c62828;font-weight:600">
              异常 {{ g.abnormalDeviceCount }}
            </span>
            <span style="font-size:11px;color:#bbb">{{ expandedGroups.has(g.groupId ?? 'none') ? '▲' : '▼' }}</span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:0 12px 10px">
            <div style="text-align:center;padding:7px 4px;background:#f1f8e9;border-radius:6px">
              <div style="font-size:11px;color:#888;margin-bottom:2px">平均评分</div>
              <div style="font-size:16px;font-weight:700" :style="{ color: scoreColor(g.avgHealthScore) }">{{ g.avgHealthScore }}</div>
              <MiniDelta :value="g.healthDelta" suffix="分" />
            </div>
            <div style="text-align:center;padding:7px 4px;background:#ffebee;border-radius:6px">
              <div style="font-size:11px;color:#888;margin-bottom:2px">异常台数</div>
              <div style="font-size:16px;font-weight:700" :style="{ color: g.abnormalDeviceCount > 0 ? '#c62828' : '#2e7d32' }">
                {{ g.abnormalDeviceCount }}
              </div>
              <div style="font-size:9px;color:#aaa">告警{{ g.totalAlerts }}条</div>
            </div>
            <div style="text-align:center;padding:7px 4px;background:#e3f2fd;border-radius:6px">
              <div style="font-size:11px;color:#888;margin-bottom:2px">在线率</div>
              <div style="font-size:16px;font-weight:700;color:#1565c0">{{ g.onlineRate }}%</div>
              <MiniDelta :value="g.onlineRateDelta" suffix="%" />
            </div>
            <div style="text-align:center;padding:7px 4px;background:#fff8e1;border-radius:6px">
              <div style="font-size:11px;color:#888;margin-bottom:2px">巡检耗时</div>
              <div style="font-size:16px;font-weight:700;color:#e65100">{{ formatMinutes(g.totalInspectionMinutes) }}</div>
              <MiniDelta :value="g.totalInspectionMinutes - g.prevInspectionMinutes" invert unit="minute" />
            </div>
          </div>

          <!-- 趋势对照 -->
          <div style="display:flex;gap:6px;padding:0 12px 10px;align-items:center;font-size:11px">
            <span style="color:#888;flex-shrink:0">趋势对照</span>
            <span :style="trendPillStyle(g.improvingCount, '#2e7d32')">📈 好转 {{ g.improvingCount }}</span>
            <span :style="trendPillStyle(g.stableCount, '#757575')">➡️ 稳定 {{ g.stableCount }}</span>
            <span :style="trendPillStyle(g.decliningCount, '#c62828')">📉 恶化 {{ g.decliningCount }}</span>
          </div>

          <div v-if="g.deviceCount === 0" style="padding:0 12px 12px;font-size:11px;color:#aaa">
            该班组在当前时间范围内暂无设备
          </div>

          <!-- 下钻设备明细：展开班组即按同一口径呈现 -->
          <div v-if="expandedGroups.has(g.groupId ?? 'none') && g.deviceCount > 0"
            style="border-top:1px solid #f0f0f0;display:flex;flex-direction:column">
            <div v-for="d in g.deviceStats" :key="d.deviceId"
              @click="selectDevice(d.deviceId)"
              @mouseenter="store.setHighlightedDevice(d.deviceId)"
              :style="{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 12px', cursor:'pointer',
                background: selectedStat?.deviceId === d.deviceId ? '#e8f5e9' : (store.highlightedDeviceId === d.deviceId ? '#f5f5f5' : '#fff'),
                borderBottom:'1px solid #f7f7f7' }">
              <span :style="{ width:'8px', height:'8px', borderRadius:'50%', flexShrink:0,
                background: d.isAbnormal ? '#e53935' : '#4caf50' }"></span>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:12px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    {{ d.deviceName }}
                  </span>
                  <span :style="{ fontSize: '11px', color: trendColor(d.healthTrend) }">{{ trendIcon(d.healthTrend) }}</span>
                </div>
                <div style="font-size:10px;color:#999;margin-top:2px">
                  🔋{{ d.avgBattery }}% · 🌡{{ d.avgTemperature }}°C · 异常{{ d.abnormalCount }} · {{ formatMinutes(d.inspectionMinutes) }}
                </div>
              </div>
              <span :style="{ fontSize:'12px', fontWeight:700, color: scoreColor(d.healthScore) }">{{ d.healthScore }}</span>
              <span style="font-size:10px;color:#bbb">{{ d.onlineRate }}%</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e0e0e0;flex-shrink:0">
      <div style="font-size:10px;color:#aaa;text-align:center;line-height:1.6">
        统计口径与设备健康诊断一致 · 数据来源：健康记录 + 告警数据
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, h } from 'vue';
import { useIotStore, statsGroupFilters } from '../stores/iot';
import type { DevicePeriodStat, StatsPeriod } from '../types';

const emit = defineEmits<{
  (e: 'open-health', deviceId: string): void;
}>();

const store = useIotStore();

const periodOptions: Array<{ value: StatsPeriod; label: string }> = [
  { value: 'day', label: '📅 日概览' },
  { value: 'week', label: '📆 周概览' },
  { value: 'month', label: '🗓️ 月概览' },
];

const periodLabel = computed(() => {
  const map: Record<StatsPeriod, string> = { day: '今日', week: '本周', month: '本月' };
  return map[store.statsPeriod];
});

const periodNoun = computed(() => {
  const map: Record<StatsPeriod, string> = { day: '日', week: '周', month: '月' };
  return map[store.statsPeriod];
});

const expandedGroups = ref<Set<string>>(new Set(['none']));
const selectedDeviceId = ref<string | null>(null);
const sparklineRef = ref<HTMLElement | null>(null);

const selectedStat = computed<DevicePeriodStat | null>(() => {
  if (!selectedDeviceId.value) return null;
  // 与班组看板共用筛选后的同一份快照，筛选变化后下钻结果同步收窄
  return store.filteredDeviceStats.find(s => s.deviceId === selectedDeviceId.value) || null;
});

// 筛选变化后：保留已展开班组，新出现的班组默认展开
watch(() => store.groupStatistics, (list) => {
  const visible = new Set(list.map(g => g.groupId ?? 'none'));
  const next = new Set([...expandedGroups.value].filter(id => visible.has(id)));
  list.forEach(g => {
    const key = g.groupId ?? 'none';
    if (g.deviceCount > 0 && !expandedGroups.value.has(key)) {
      next.add(key);
    }
  });
  expandedGroups.value = next;
}, { immediate: true });

function toggleGroup(groupId: string | null) {
  const key = groupId ?? 'none';
  const next = new Set(expandedGroups.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expandedGroups.value = next;
}

function selectDevice(deviceId: string) {
  selectedDeviceId.value = deviceId;
  store.setHighlightedDevice(deviceId);
  nextTick(() => renderSparkline());
}

function closeDetail() {
  selectedDeviceId.value = null;
  store.setHighlightedDevice(null);
}

function locateOnMap() {
  if (selectedStat.value) {
    store.setHighlightedDevice(selectedStat.value.deviceId);
  }
}

function openHealthDiagnosis() {
  if (selectedStat.value) {
    emit('open-health', selectedStat.value.deviceId);
  }
}

function handleRefresh() {
  store.refreshStatistics();
}

function handleResetFilter() {
  store.setStatsGroupFilter(statsGroupFilters.ALL);
}

// 口径切换后重新计算；下钻结果随快照一起更新
watch(() => store.statsPeriod, () => {
  nextTick(() => renderSparkline());
});
watch(() => store.devicePeriodStats, () => {
  nextTick(() => renderSparkline());
});

// 设备数据变化（注册新设备等）后同步重算
watch(() => store.devices.length, () => {
  store.refreshStatistics();
});

function filterBtnStyle(active: boolean, color?: string) {
  return {
    padding: '5px 11px',
    borderRadius: '14px',
    border: '1px solid ' + (active ? (color || '#1b5e20') : '#ddd'),
    background: active ? (color ? color + '20' : '#e8f5e9') : '#fff',
    color: active ? (color || '#1b5e20') : '#666',
    cursor: 'pointer' as const,
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
  };
}

function scoreColor(score: number): string {
  if (score >= 70) return '#2e7d32';
  if (score >= 40) return '#e65100';
  return '#c62828';
}

function scoreBg(score: number): string {
  if (score >= 70) return '#e8f5e9';
  if (score >= 40) return '#fff3e0';
  return '#ffebee';
}

function trendColor(trend: string): string {
  if (trend === 'improving') return '#2e7d32';
  if (trend === 'declining') return '#c62828';
  return '#757575';
}

function trendIcon(trend: string): string {
  if (trend === 'improving') return '📈';
  if (trend === 'declining') return '📉';
  return '➡️';
}

function trendText(trend: string): string {
  if (trend === 'improving') return '好转';
  if (trend === 'declining') return '恶化';
  return '稳定';
}

function trendPillStyle(count: number, color: string) {
  return {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: count > 0 ? 600 : 400,
    background: count > 0 ? color + '18' : '#fafafa',
    color: count > 0 ? color : '#bbb',
  };
}

function formatMinutes(min: number): string {
  const rounded = Math.round(min);
  if (rounded <= 0) return '0分';
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h > 0) return `${h}小时${m > 0 ? m + '分' : ''}`;
  return `${m}分`;
}

function formatClock(iso: string): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

const alarmDeltaText = computed(() => {
  const d = store.statsOverview.totalAlerts - store.statsOverview.prevTotalAlerts;
  if (d > 0) return `多 ${d} 条 ▲`;
  if (d < 0) return `少 ${-d} 条 ▼`;
  return '持平';
});

const alarmDeltaColor = computed(() => {
  const d = store.statsOverview.totalAlerts - store.statsOverview.prevTotalAlerts;
  if (d > 0) return '#c62828';
  if (d < 0) return '#2e7d32';
  return '#999';
});

function renderSparkline() {
  const el = sparklineRef.value;
  if (!el || !selectedStat.value) return;
  const data = selectedStat.value.scoreSeries;
  if (!data.length) {
    el.innerHTML = '<div style="text-align:center;color:#bbb;font-size:11px;line-height:56px">暂无趋势数据</div>';
    return;
  }
  const width = el.clientWidth || 360;
  const height = 56;
  const pad = 4;
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: pad + (height - pad * 2) - ((v - minV) / range) * (height - pad * 2),
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L ${pts[pts.length - 1].x.toFixed(1)} ${height - pad} L ${pts[0].x.toFixed(1)} ${height - pad} Z`;
  el.innerHTML = `
    <svg width="${width}" height="${height}" style="display:block">
      <defs><linearGradient id="ts-spark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2e7d32" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#2e7d32" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#ts-spark)"/>
      <path d="${path}" fill="none" stroke="#2e7d32" stroke-width="1.8"/>
      <circle cx="${pts[pts.length - 1].x}" cy="${pts[pts.length - 1].y}" r="3" fill="#2e7d32"/>
    </svg>`;
}

function handleResize() {
  renderSparkline();
}

onMounted(() => {
  // 首次进入若快照为空则拉取；切换日/周/月由 store 统一刷新
  if (!store.statsUpdatedAt || store.devicePeriodStats.length === 0) {
    store.refreshStatistics();
  }
  nextTick(() => renderSparkline());
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// 极简趋势徽标（评分/在线率：升为好；耗时：降为好）
const DeltaBadge = (props: { value: number; suffix?: string; invert?: boolean; unit?: string }) => {
  const v = Math.round(props.value);
  if (v === 0) return h('span', { style: 'font-size:10px;color:#999' }, '持平');
  const good = props.invert ? v < 0 : v > 0;
  const text = props.unit === 'minute'
    ? (v > 0 ? `+${formatMinutes(v)}` : `-${formatMinutes(-v)}`)
    : `${v > 0 ? '+' : ''}${v}${props.suffix || ''}`;
  return h('span', {
    style: `font-size:10px;font-weight:600;color:${good ? '#2e7d32' : '#c62828'}`,
  }, `${v > 0 ? '▲' : '▼'} ${text}`);
};
DeltaBadge.props = ['value', 'suffix', 'invert', 'unit'];

const MiniDelta = DeltaBadge;
</script>

<style scoped>
.ts-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: ts-shimmer 1.3s infinite;
}
@keyframes ts-shimmer {
  0% { background-position: 200% 0; }
 100% { background-position: -200% 0; }
}
</style>

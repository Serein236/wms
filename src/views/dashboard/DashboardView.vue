<template>
  <div class="dashboard-page">
    <!-- 标题区 -->
    <div class="dashboard-banner">
      <div>
        <h2><i class="bi bi-bar-chart-line me-2"></i>数据看板</h2>
        <p>实时查看仓库运营数据概览</p>
      </div>
      <button class="btn btn-light btn-sm" @click="refresh" :disabled="loading">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    </div>

    <!-- KPI 卡片 -->
    <div class="row g-3 mb-3">
      <div class="col-6 col-xl-3">
        <div class="kpi-card border-start-primary">
          <div class="kpi-label">商品总数</div>
          <div class="kpi-value">{{ kpi?.totalProducts ?? '-' }}</div>
          <i class="bi bi-box-seam kpi-icon"></i>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="kpi-card border-start-success">
          <div class="kpi-label">库存总量</div>
          <div class="kpi-value">{{ kpi?.totalStock ?? '-' }}</div>
          <i class="bi bi-archive kpi-icon text-success"></i>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="kpi-card border-start-info">
          <div class="kpi-label">库存总值</div>
          <div class="kpi-value">¥{{ formatNumber(kpi?.totalValue) }}</div>
          <i class="bi bi-currency-yen kpi-icon text-info"></i>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="kpi-card border-start-warning">
          <div class="kpi-label">出入库记录</div>
          <div class="kpi-value">{{ totalRecords }}</div>
          <i class="bi bi-arrow-left-right kpi-icon text-warning"></i>
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="row g-3 mb-3">
      <div class="col-xl-8">
        <div class="card h-100">
          <div class="card-header"><i class="bi bi-graph-up me-2"></i>月度出入库趋势</div>
          <div class="card-body">
            <div class="chart-container">
              <canvas ref="trendChartRef"></canvas>
              <div v-if="loading" class="chart-loading">
                <div class="spinner-border text-primary"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-xl-4">
        <div class="card h-100">
          <div class="card-header"><i class="bi bi-pie-chart me-2"></i>库存状态分布</div>
          <div class="card-body">
            <div class="chart-container">
              <canvas ref="statusChartRef"></canvas>
              <div v-if="loading" class="chart-loading">
                <div class="spinner-border text-primary"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 热销商品 -->
    <div class="card">
      <div class="card-header"><i class="bi bi-trophy me-2"></i>热销商品 Top 10</div>
      <div class="card-body">
        <div class="table-responsive" v-if="topProducts.length">
          <table class="table table-hover mb-0">
            <thead>
              <tr>
                <th width="50">排名</th>
                <th>商品名称</th>
                <th width="100">当前库存</th>
                <th width="100">入库总量</th>
                <th width="100">出库总量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, idx) in topProducts" :key="idx">
                <td>
                  <span class="rank-badge" :class="rankClass(idx)">{{ idx + 1 }}</span>
                </td>
                <td class="fw-semibold">{{ p.name || p.product_name }}</td>
                <td>{{ p.current_stock ?? p.stock ?? '-' }}</td>
                <td>{{ p.total_in_quantity ?? p.in_quantity ?? '-' }}</td>
                <td>{{ p.total_out_quantity ?? p.out_quantity ?? '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else icon="bi-trophy" title="暂无数据" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import { useToast } from '@/composables/useToast'
import { formatNumber } from '@/utils/formatters'
import EmptyState from '@/components/common/EmptyState.vue'

const toast = useToast()

const loading = ref(false)
const kpi = ref(null)
const topProducts = ref([])
const trendChartRef = ref(null)
const statusChartRef = ref(null)
let trendChart = null
let statusChart = null

// KPI 出入库记录合计（API 返回 totalInRecords + totalOutRecords）
const totalRecords = computed(() => {
  if (!kpi.value) return '-'
  const inN = Number(kpi.value.totalInRecords) || 0
  const outN = Number(kpi.value.totalOutRecords) || 0
  return inN + outN
})

async function refresh() {
  loading.value = true
  try {
    // 并行加载 KPI + 趋势 + 热销商品 + 库存状态
    const [kpiRes, trendRes, topRes, statusRes] = await Promise.allSettled([
      dashboardApi.getKpi(),
      dashboardApi.getTrend({ months: 6 }),
      dashboardApi.getTopProducts({ limit: 10 }),
      dashboardApi.getStockStatus()
    ])

    if (kpiRes.status === 'fulfilled') {
      kpi.value = kpiRes.value?.data || kpiRes.value
    }

    if (topRes.status === 'fulfilled') {
      topProducts.value = Array.isArray(topRes.value) ? topRes.value : (topRes.value?.data || [])
    }

    // 懒加载 Chart.js
    if (trendRes.status === 'fulfilled' || statusRes.status === 'fulfilled') {
      await nextTick()
      const Chart = (await import('chart.js/auto')).default

      if (trendRes.status === 'fulfilled') {
        renderTrendChart(Chart, trendRes.value)
      }
      if (statusRes.status === 'fulfilled') {
        renderStatusChart(Chart, statusRes.value)
      }
    }
  } catch (e) {
    toast.error('加载看板数据失败')
  } finally {
    loading.value = false
  }
}

function renderTrendChart(Chart, raw) {
  if (trendChart) trendChart.destroy()
  if (!trendChartRef.value) return

  // API 返回 {data: {inbound: [{month, total_quantity, total_amount}], outbound: [...]}}
  const payload = raw?.data || raw || {}
  const inbound = Array.isArray(payload.inbound) ? payload.inbound : []
  const outbound = Array.isArray(payload.outbound) ? payload.outbound : []

  // 合并两个数组的月份作为 labels（保持时间顺序）
  const monthSet = new Set()
  inbound.forEach(t => monthSet.add(t.month))
  outbound.forEach(t => monthSet.add(t.month))
  const labels = [...monthSet].sort()

  const inData = labels.map(m => {
    const r = inbound.find(t => t.month === m)
    return r ? Number(r.total_quantity) || 0 : 0
  })
  const outData = labels.map(m => {
    const r = outbound.find(t => t.month === m)
    return r ? Number(r.total_quantity) || 0 : 0
  })

  trendChart = new Chart(trendChartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: '入库', data: inData, backgroundColor: 'rgba(13, 148, 136, 0.7)', borderRadius: 4 },
        { label: '出库', data: outData, backgroundColor: 'rgba(245, 158, 11, 0.7)', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } }
    }
  })
}

function renderStatusChart(Chart, raw) {
  if (statusChart) statusChart.destroy()
  if (!statusChartRef.value) return

  // API 返回 {data: [{stock_status: "normal", count: 17}, ...]}
  const arr = raw?.data || raw || []
  const statusMap = {}
  if (Array.isArray(arr)) {
    arr.forEach(item => {
      statusMap[item.stock_status] = Number(item.count) || 0
    })
  }

  const labels = ['正常', '预警', '危险', '缺货']
  const values = [
    statusMap.normal || 0,
    statusMap.warning || 0,
    statusMap.danger || 0,
    statusMap.out_of_stock || 0
  ]
  const colors = ['#10b981', '#f59e0b', '#ef4444', '#6b7280']

  statusChart = new Chart(statusChartRef.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  })
}

function rankClass(idx) {
  if (idx === 0) return 'gold'
  if (idx === 1) return 'silver'
  if (idx === 2) return 'bronze'
  return ''
}

onMounted(refresh)

onBeforeUnmount(() => {
  if (trendChart) trendChart.destroy()
  if (statusChart) statusChart.destroy()
})
</script>

<style scoped>
.dashboard-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  background: linear-gradient(135deg, var(--brand-500, #0d9488), var(--accent-500, #0e7490));
  border-radius: 12px;
  color: #fff;
  margin-bottom: 16px;
}

.dashboard-banner h2 { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
.dashboard-banner p { font-size: 14px; opacity: 0.9; margin: 0; }

.kpi-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid var(--border-light, #f0f0f0);
  border-left: 4px solid;
  position: relative;
  overflow: hidden;
}

.border-start-primary { border-left-color: var(--brand-500, #0d9488); }
.border-start-success { border-left-color: #10b981; }
.border-start-info { border-left-color: #0e7490; }
.border-start-warning { border-left-color: #f59e0b; }

.kpi-label { font-size: 13px; color: var(--text-secondary, #6b7280); }
.kpi-value { font-size: 28px; font-weight: 700; margin-top: 4px; }

.kpi-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 36px;
  opacity: 0.12;
}

.chart-container { position: relative; height: 300px; }
.chart-container canvas { display: block; width: 100%; height: 100%; }
.chart-loading { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.8); }

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 14px;
  background: var(--border-light, #f0f0f0);
  color: var(--text-secondary, #6b7280);
}

.rank-badge.gold { background: #fef3c7; color: #d97706; }
.rank-badge.silver { background: #e5e7eb; color: #6b7280; }
.rank-badge.bronze { background: #fed7aa; color: #c2410c; }
</style>

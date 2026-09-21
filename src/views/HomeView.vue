<template>
  <div class="home-page">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="welcome-text">
        <h2><i class="bi bi-warehouse me-2"></i>{{ config.companyName }}</h2>
        <p>欢迎使用仓库进销存管理系统</p>
      </div>
      <div class="welcome-date">
        <i class="bi bi-calendar3 me-1"></i>{{ today }}
      </div>
    </div>

    <!-- 快捷入口卡片 -->
    <div class="row g-3 mt-1">
      <div v-for="card in visibleCards" :key="card.label" class="col-6 col-md-3">
        <router-link :to="card.to" class="quick-card">
          <div class="quick-icon" :style="{ background: card.bg, color: card.color }">
            <i class="bi" :class="card.icon"></i>
          </div>
          <div class="quick-info">
            <h5>{{ card.label }}</h5>
            <p>{{ card.desc }}</p>
          </div>
        </router-link>
      </div>
    </div>

    <!-- KPI 概览（如果有数据） -->
    <div class="row g-3 mt-1" v-if="kpi">
      <div class="col-6 col-md-3">
        <div class="kpi-card">
          <div class="kpi-label">商品总数</div>
          <div class="kpi-value">{{ kpi.totalProducts ?? 0 }}</div>
          <i class="bi bi-box-seam kpi-icon"></i>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="kpi-card">
          <div class="kpi-label">今日入库</div>
          <div class="kpi-value">{{ kpi.todayIn ?? 0 }}</div>
          <i class="bi bi-arrow-down-circle kpi-icon text-success"></i>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="kpi-card">
          <div class="kpi-label">今日出库</div>
          <div class="kpi-value">{{ kpi.todayOut ?? 0 }}</div>
          <i class="bi bi-arrow-up-circle kpi-icon text-warning"></i>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="kpi-card">
          <div class="kpi-label">库存预警</div>
          <div class="kpi-value" :class="{ 'text-danger': kpi.lowStock > 0 }">{{ kpi.lowStock ?? 0 }}</div>
          <i class="bi bi-exclamation-triangle kpi-icon text-danger"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { config } from '@/utils/config'
import { dashboardApi } from '@/api/dashboard'
import { formatDate } from '@/utils/formatters'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const today = formatDate(new Date(), true)
const kpi = ref(null)

const quickCards = [
  { icon: 'bi-box-seam', label: '商品管理', desc: '管理商品信息', to: '/products', bg: '#e0f2fe', color: '#0284c7' },
  { icon: 'bi-arrow-down-circle', label: '入库管理', desc: '办理商品入库', to: '/stock/in', bg: '#dcfce7', color: '#16a34a' },
  { icon: 'bi-arrow-up-circle', label: '出库管理', desc: '办理商品出库', to: '/stock/out', bg: '#fef3c7', color: '#d97706' },
  { icon: 'bi-clipboard-data', label: '库存查看', desc: '查看库存情况', to: '/stock', bg: '#e0e7ff', color: '#4f46e5' },
  { icon: 'bi-truck', label: '供应商', desc: '管理供应商', to: '/suppliers', bg: '#f3e8ff', color: '#9333ea', adminOnly: true },
  { icon: 'bi-people', label: '客户管理', desc: '管理客户信息', to: '/customers', bg: '#fce7f3', color: '#db2777', adminOnly: true },
  { icon: 'bi-bar-chart-line', label: '数据看板', desc: '查看数据报表', to: '/dashboard', bg: '#fee2e2', color: '#dc2626' },
  { icon: 'bi-clipboard-check', label: '库存盘点', desc: '盘点库存', to: '/stocktaking', bg: '#ccfbf1', color: '#0d9488', adminOnly: true }
]

const visibleCards = computed(() => {
  const isAdmin = authStore.role === 'admin'
  return quickCards.filter(c => !c.adminOnly || isAdmin)
})

onMounted(async () => {
  try {
    const data = await dashboardApi.getKpi()
    kpi.value = data?.data || data || null
  } catch (e) {
    // KPI 加载失败不影响页面展示
  }
})
</script>

<style scoped>
.welcome-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  background: linear-gradient(135deg, var(--brand-500, #0d9488), var(--brand-600, #0f766e));
  border-radius: 12px;
  color: #fff;
  margin-bottom: 4px;
}

.welcome-banner h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
}

.welcome-banner p {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.welcome-date {
  font-size: 14px;
  opacity: 0.85;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--border-light, #f0f0f0);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  height: 100%;
}

.quick-card:hover {
  border-color: var(--brand-300, #5eead4);
  box-shadow: 0 2px 12px rgba(13, 148, 136, 0.1);
  transform: translateY(-1px);
}

.quick-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.quick-info h5 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 2px;
}

.quick-info p {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  margin: 0;
}

.kpi-card {
  position: relative;
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  border: 1px solid var(--border-light, #f0f0f0);
  overflow: hidden;
}

.kpi-label {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary, #1a1a1a);
  margin-top: 4px;
}

.kpi-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 32px;
  opacity: 0.15;
}
</style>

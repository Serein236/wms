<template>
  <div class="stock-query-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-search me-2"></i>库存查询</h4>
        <p>按条件查询库存信息</p>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-3">
            <label class="form-label">商品名称</label>
            <input v-model="query.name" type="text" class="form-control" placeholder="模糊搜索">
          </div>
          <div class="col-md-2">
            <label class="form-label">库存状态</label>
            <select v-model="query.status" class="form-select">
              <option value="">全部</option>
              <option value="normal">正常</option>
              <option value="warning">预警</option>
              <option value="danger">危险</option>
              <option value="out_of_stock">缺货</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label">最低库存</label>
            <input v-model.number="query.minStock" type="number" class="form-control" min="0">
          </div>
          <div class="col-md-2">
            <label class="form-label">最高库存</label>
            <input v-model.number="query.maxStock" type="number" class="form-control" min="0">
          </div>
          <div class="col-md-3 d-flex gap-2">
            <button class="btn btn-primary" @click="doQuery">
              <i class="bi bi-search me-1"></i>查询
            </button>
            <button class="btn btn-outline-secondary" @click="resetQuery">重置</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="table-responsive" v-if="results.length">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>商品名称</th>
                <th>规格</th>
                <th>单位</th>
                <th>当前库存</th>
                <th>预警线</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in results" :key="item.id">
                <td class="fw-semibold">{{ item.name }}</td>
                <td>{{ item.spec || '-' }}</td>
                <td>{{ item.unit || '-' }}</td>
                <td><span class="badge" :class="stockBadgeClass(item)">{{ item.stock || 0 }}</span></td>
                <td>{{ item.warning_quantity ?? 10 }}</td>
                <td><span class="badge" :class="statusBadgeClass(item)">{{ statusLabel(item) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <EmptyState v-if="!results.length && !loading" icon="bi-search" title="请输入查询条件" desc="设置筛选条件后点击查询按钮" />
        <div v-if="loading" class="text-center py-4">
          <div class="spinner-border text-primary"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { inventoryApi } from '@/api/inventory'
import { useToast } from '@/composables/useToast'
import EmptyState from '@/components/common/EmptyState.vue'

const toast = useToast()
const loading = ref(false)
const allStock = ref([])
const results = ref([])

const query = ref({
  name: '',
  status: '',
  minStock: null,
  maxStock: null
})

function getStockStatus(item) {
  const stock = item.stock || 0
  const warning = item.warning_quantity ?? 10
  const danger = item.danger_quantity ?? 5
  if (stock <= 0) return 'out_of_stock'
  if (stock <= danger) return 'danger'
  if (stock <= warning) return 'warning'
  return 'normal'
}

function stockBadgeClass(item) {
  const status = getStockStatus(item)
  return {
    'bg-danger-subtle text-danger': status === 'out_of_stock' || status === 'danger',
    'bg-warning-subtle text-warning': status === 'warning',
    'bg-success-subtle text-success': status === 'normal'
  }
}

function statusBadgeClass(item) {
  const status = getStockStatus(item)
  return { 'bg-danger': status === 'out_of_stock' || status === 'danger', 'bg-warning': status === 'warning', 'bg-success': status === 'normal' }
}

function statusLabel(item) {
  const status = getStockStatus(item)
  return { normal: '正常', warning: '预警', danger: '危险', out_of_stock: '缺货' }[status]
}

async function loadAll() {
  loading.value = true
  try {
    const res = await inventoryApi.getStock({ pageSize: 500 })
    allStock.value = Array.isArray(res) ? res : (res?.data || [])
  } catch (e) {
    toast.error('加载库存失败')
  } finally {
    loading.value = false
  }
}

function doQuery() {
  let result = [...allStock.value]

  if (query.value.name.trim()) {
    const q = query.value.name.toLowerCase()
    result = result.filter(s => (s.name || '').toLowerCase().includes(q))
  }

  if (query.value.status) {
    result = result.filter(s => getStockStatus(s) === query.value.status)
  }

  if (query.value.minStock !== null && query.value.minStock !== '') {
    result = result.filter(s => (s.stock || 0) >= query.value.minStock)
  }

  if (query.value.maxStock !== null && query.value.maxStock !== '') {
    result = result.filter(s => (s.stock || 0) <= query.value.maxStock)
  }

  results.value = result
}

function resetQuery() {
  query.value = { name: '', status: '', minStock: null, maxStock: null }
  results.value = []
}

onMounted(loadAll)
</script>

<style scoped>
.page-toolbar { margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.form-label { font-weight: 600; font-size: 14px; }
.table td { font-size: 14px; vertical-align: middle; }
</style>

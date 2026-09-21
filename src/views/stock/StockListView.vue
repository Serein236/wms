<template>
  <div class="stock-list-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-clipboard-data me-2"></i>库存查看</h4>
        <p>查看所有商品的库存情况，实时掌握库存动态</p>
      </div>
      <router-link to="/stock/query" class="btn btn-outline-secondary btn-sm">
        <i class="bi bi-search me-1"></i>库存查询
      </router-link>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-clipboard-data"></i>
          <span>库存报表</span>
        </div>
        <div class="d-flex gap-2">
          <select v-model="statusFilter" class="form-select form-select-sm" style="width: 130px;">
            <option value="">全部状态</option>
            <option value="normal">正常</option>
            <option value="warning">预警</option>
            <option value="danger">危险</option>
            <option value="out_of_stock">缺货</option>
          </select>
          <div class="search-box">
            <i class="bi bi-search"></i>
            <input v-model="searchQuery" type="text" class="form-control form-control-sm" placeholder="搜索商品名称...">
          </div>
        </div>
      </div>

      <div class="table-responsive" v-if="!loading && filteredStock.length">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th width="50">ID</th>
              <th>商品名称</th>
              <th>规格</th>
              <th width="60">单位</th>
              <th>批号</th>
              <th width="90">本批入库</th>
              <th width="90">本批出库</th>
              <th width="80">当前库存</th>
              <th width="90">入库价</th>
              <th width="100">库存价值</th>
              <th width="70">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredStock" :key="item.product_id + '-' + item.batch_number">
              <td class="text-muted">{{ item.product_id }}</td>
              <td class="fw-semibold">{{ item.product_name }}</td>
              <td>{{ item.product_spec || '-' }}</td>
              <td>{{ item.product_unit || '-' }}</td>
              <td>{{ item.batch_number || '-' }}</td>
              <td class="text-success">{{ item.batch_in_quantity ?? 0 }}</td>
              <td class="text-warning">{{ item.batch_out_quantity ?? 0 }}</td>
              <td>
                <span class="badge" :class="stockBadgeClass(item)">{{ item.current_stock ?? 0 }}</span>
              </td>
              <td>¥{{ formatMoney(item.in_price) }}</td>
              <td>¥{{ formatMoney((item.current_stock || 0) * (item.in_price || 0)) }}</td>
              <td>
                <span class="badge" :class="statusBadgeClass(item)">{{ statusLabel(item) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-2 text-muted">加载中...</p>
      </div>

      <EmptyState v-if="!loading && !filteredStock.length" icon="bi-inbox" title="暂无库存数据" />

      <div class="card-footer" v-if="total > pageSize">
        <PaginationBar
          :page="page"
          :page-size="pageSize"
          :total="total"
          :page-sizes="[50, 100, 500, 1000]"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { inventoryApi } from '@/api/inventory'
import { useToast } from '@/composables/useToast'
import { formatMoney, debounce } from '@/utils/formatters'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'

const toast = useToast()

const stockList = ref([])
const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(500)
const total = ref(0)

const filteredStock = computed(() => {
  let result = stockList.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s => (s.product_name || '').toLowerCase().includes(q))
  }

  if (statusFilter.value) {
    result = result.filter(s => getStockStatus(s) === statusFilter.value)
  }

  return result
})

function getStockStatus(item) {
  // 批次过期优先判定
  if (item.batch_status === 'expired') return 'danger'
  const stock = item.current_stock || 0
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
  return {
    'bg-danger': status === 'out_of_stock' || status === 'danger',
    'bg-warning': status === 'warning',
    'bg-success': status === 'normal'
  }
}

function statusLabel(item) {
  const status = getStockStatus(item)
  return { normal: '正常', warning: '预警', danger: '危险', out_of_stock: '缺货' }[status]
}

async function loadStock() {
  loading.value = true
  try {
    const res = await inventoryApi.getStock({ page: page.value, pageSize: pageSize.value })
    if (Array.isArray(res)) {
      stockList.value = res
      total.value = res.length
    } else if (res?.data) {
      stockList.value = res.data
      total.value = res.pagination?.total ?? res.data.length
    } else {
      stockList.value = res || []
      total.value = stockList.value.length
    }
  } catch (e) {
    toast.error('加载库存失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function handlePageChange(p) {
  page.value = p
  loadStock()
}

function handlePageSizeChange(size) {
  pageSize.value = size
  page.value = 1
  loadStock()
}

onMounted(loadStock)
</script>

<style scoped>
.page-toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.search-box { position: relative; width: 200px; }
.search-box i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary, #9ca3af); font-size: 14px; }
.search-box input { padding-left: 30px; }
.table td { font-size: 13px; vertical-align: middle; }
</style>

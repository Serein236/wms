<template>
  <div class="stock-query-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-search me-2"></i>库存查询</h4>
        <p>按条件查询库存信息，并可查看商品的出入库历史</p>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-3">
            <label class="form-label">商品名称</label>
            <input
              v-model="query.name"
              type="text"
              class="form-control"
              placeholder="模糊搜索"
              @keyup.enter="doQuery"
            >
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
                <th width="50">ID</th>
                <th>商品名称</th>
                <th>规格</th>
                <th width="60">单位</th>
                <th>批号</th>
                <th width="90">当前库存</th>
                <th width="80">预警线</th>
                <th width="80">状态</th>
                <th width="110">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in results" :key="item.product_id + '-' + item.batch_number">
                <td class="text-muted">{{ item.product_id }}</td>
                <td class="fw-semibold">{{ item.product_name }}</td>
                <td>{{ item.product_spec || '-' }}</td>
                <td>{{ item.product_unit || '-' }}</td>
                <td>{{ item.batch_number || '-' }}</td>
                <td><span class="badge" :class="stockBadgeClass(item)">{{ item.current_stock || 0 }}</span></td>
                <td>{{ item.warning_quantity ?? 10 }}</td>
                <td><span class="badge" :class="statusBadgeClass(item)">{{ statusLabel(item) }}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" @click="viewDetail(item)">
                    <i class="bi bi-clock-history me-1"></i>历史
                  </button>
                </td>
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

    <!-- 出入库历史明细弹窗 -->
    <div v-if="detailVisible" class="detail-modal-mask" @click.self="closeDetail">
      <div class="detail-modal">
        <div class="detail-modal-header">
          <h5 class="mb-0">
            <i class="bi bi-clock-history me-2"></i>出入库历史 - {{ detail?.product?.name }}
          </h5>
          <button class="btn-close" @click="closeDetail"></button>
        </div>
        <div class="detail-modal-body" v-if="!detailLoading">
          <ul class="nav nav-tabs mb-3">
            <li class="nav-item">
              <button class="nav-link" :class="{ active: detailTab === 'batch' }" @click="detailTab = 'batch'">批次库存</button>
            </li>
            <li class="nav-item">
              <button class="nav-link" :class="{ active: detailTab === 'in' }" @click="detailTab = 'in'">入库记录</button>
            </li>
            <li class="nav-item">
              <button class="nav-link" :class="{ active: detailTab === 'out' }" @click="detailTab = 'out'">出库记录</button>
            </li>
          </ul>

          <div v-if="detailTab === 'batch'" class="table-responsive">
            <table class="table table-sm table-bordered align-middle">
              <thead class="table-light">
                <tr><th>批号</th><th>生产日期</th><th>过期日期</th><th>当前库存</th></tr>
              </thead>
              <tbody>
                <tr v-for="b in detail?.batchStock || []" :key="b.batch_number">
                  <td>{{ b.batch_number }}</td>
                  <td>{{ formatDate(b.production_date) }}</td>
                  <td>{{ formatDate(b.expiration_date) }}</td>
                  <td>{{ b.current_stock }}</td>
                </tr>
                <tr v-if="!(detail?.batchStock || []).length">
                  <td colspan="4" class="text-center text-muted">暂无批次数据</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="detailTab === 'in'" class="table-responsive">
            <table class="table table-sm table-bordered align-middle">
              <thead class="table-light">
                <tr><th>日期</th><th>方式</th><th>批号</th><th>数量</th><th>单价</th><th>供应商</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in (detail?.inRecords || []).slice(0, 100)" :key="r.id">
                  <td>{{ r.recorded_date }}</td>
                  <td>{{ r.stock_method_name }}</td>
                  <td>{{ r.batch_number }}</td>
                  <td class="text-success">+{{ r.quantity }}</td>
                  <td>¥{{ formatMoney(r.unit_price) }}</td>
                  <td>{{ r.source || '-' }}</td>
                </tr>
                <tr v-if="!(detail?.inRecords || []).length">
                  <td colspan="6" class="text-center text-muted">暂无入库记录</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="detailTab === 'out'" class="table-responsive">
            <table class="table table-sm table-bordered align-middle">
              <thead class="table-light">
                <tr><th>日期</th><th>方式</th><th>批号</th><th>数量</th><th>单价</th><th>客户</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in (detail?.outRecords || []).slice(0, 100)" :key="r.id">
                  <td>{{ r.recorded_date }}</td>
                  <td>{{ r.stock_method_name }}</td>
                  <td>{{ r.batch_number }}</td>
                  <td class="text-warning">-{{ r.quantity }}</td>
                  <td>¥{{ formatMoney(r.unit_price) }}</td>
                  <td>{{ r.destination || '-' }}</td>
                </tr>
                <tr v-if="!(detail?.outRecords || []).length">
                  <td colspan="6" class="text-center text-muted">暂无出库记录</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="detail-modal-body text-center py-4" v-else>
          <div class="spinner-border text-primary"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { inventoryApi } from '@/api/inventory'
import { useToast } from '@/composables/useToast'
import { formatMoney, formatDate } from '@/utils/formatters'
import EmptyState from '@/components/common/EmptyState.vue'

const toast = useToast()
const loading = ref(false)
const allStock = ref([])
const results = ref([])
const queried = ref(false)

const query = ref({
  name: '',
  status: '',
  minStock: null,
  maxStock: null
})

// 明细弹窗状态
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const detailTab = ref('batch')

function getStockStatus(item) {
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
  return { 'bg-danger': status === 'out_of_stock' || status === 'danger', 'bg-warning': status === 'warning', 'bg-success': status === 'normal' }
}

function statusLabel(item) {
  const status = getStockStatus(item)
  return { normal: '正常', warning: '预警', danger: '危险', out_of_stock: '缺货' }[status]
}

async function loadAll() {
  loading.value = true
  try {
    const res = await inventoryApi.getStock({ page: 1, pageSize: 1000 })
    allStock.value = Array.isArray(res) ? res : (res?.data || [])
  } catch (e) {
    toast.error('加载库存失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function doQuery() {
  let result = [...allStock.value]

  if (query.value.name.trim()) {
    const q = query.value.name.toLowerCase()
    result = result.filter(s => (s.product_name || '').toLowerCase().includes(q))
  }

  if (query.value.status) {
    result = result.filter(s => getStockStatus(s) === query.value.status)
  }

  if (query.value.minStock !== null && query.value.minStock !== '') {
    result = result.filter(s => (s.current_stock || 0) >= Number(query.value.minStock))
  }

  if (query.value.maxStock !== null && query.value.maxStock !== '') {
    result = result.filter(s => (s.current_stock || 0) <= Number(query.value.maxStock))
  }

  results.value = result
  queried.value = true
}

function resetQuery() {
  query.value = { name: '', status: '', minStock: null, maxStock: null }
  results.value = []
  queried.value = false
}

async function viewDetail(item) {
  detailVisible.value = true
  detailLoading.value = true
  detailTab.value = 'batch'
  detail.value = null
  try {
    const data = await inventoryApi.getStockByProduct(item.product_id)
    detail.value = data
  } catch (e) {
    toast.error('加载出入库历史失败: ' + e.message)
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailVisible.value = false
  detail.value = null
}

loadAll()
</script>

<style scoped>
.page-toolbar { margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.form-label { font-weight: 600; font-size: 14px; }
.table td { font-size: 14px; vertical-align: middle; }

.detail-modal-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1080;
}
.detail-modal {
  background: #fff; border-radius: 10px; width: 860px; max-width: 94vw;
  max-height: 86vh; display: flex; flex-direction: column; overflow: hidden;
}
.detail-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #eee;
}
.detail-modal-body { padding: 16px 18px; overflow-y: auto; }
</style>

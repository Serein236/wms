<template>
  <div class="records-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-list-ul me-2"></i>出库记录</h4>
        <p>查看所有出库记录，支持搜索和筛选</p>
      </div>
      <router-link to="/stock/out" class="btn btn-primary btn-sm">
        <i class="bi bi-plus-circle me-1"></i>新增出库
      </router-link>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-list-check"></i>
          <span>出库记录列表</span>
          <span v-if="total" class="badge bg-light text-muted">{{ total }}</span>
        </div>
        <div class="d-flex gap-2">
          <select v-model="monthFilter" class="form-select form-select-sm" style="width: 130px;">
            <option value="">全部月份</option>
            <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <div class="search-box">
            <i class="bi bi-search"></i>
            <input v-model="searchQuery" type="text" class="form-control form-control-sm" placeholder="搜索商品/批号/客户...">
          </div>
        </div>
      </div>

      <div class="table-responsive" v-if="!loading && records.length">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th width="50">ID</th>
              <th>商品名称</th>
              <th>出库方式</th>
              <th>批号</th>
              <th width="60">数量</th>
              <th width="80">单价</th>
              <th width="90">总金额</th>
              <th>客户</th>
              <th>出库日期</th>
              <th>备注</th>
              <th width="100">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id">
              <td class="text-muted">{{ r.id }}</td>
              <td class="fw-semibold">{{ r.product_name }}</td>
              <td>{{ r.stock_method_name || '-' }}</td>
              <td>{{ r.batch_number || '-' }}</td>
              <td>{{ r.quantity }}</td>
              <td>¥{{ formatMoney(r.unit_price) }}</td>
              <td>¥{{ formatMoney(r.total_amount) }}</td>
              <td>{{ r.destination || '-' }}</td>
              <td>{{ formatDate(r.display_date || r.recorded_date) || '-' }}</td>
              <td>{{ r.remark || '-' }}</td>
              <td>
                <button class="btn btn-sm btn-outline-warning" @click="openEdit(r)" title="修改">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" @click="confirmCancel(r)" title="撤销">
                  <i class="bi bi-x-circle"></i>
                </button>
                <button class="btn btn-sm btn-outline-success ms-1" @click="openExport(r)" title="导出出库单">
                  <i class="bi bi-file-earmark-excel"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-2 text-muted">加载中...</p>
      </div>

      <EmptyState v-if="!loading && !records.length" icon="bi-clipboard-minus" title="暂无出库记录" />

      <div class="card-footer" v-if="total > 0">
        <PaginationBar :page="page" :page-size="pageSize" :total="total" @page-change="handlePageChange" @page-size-change="handlePageSizeChange" />
      </div>
    </div>

    <BaseModal v-model="showEdit" title="修改出库记录" size="lg">
      <div v-if="editingRecord" class="row g-3">
        <div class="col-md-6">
          <label class="form-label">出库数量</label>
          <input v-model.number="editingRecord.quantity" type="number" class="form-control" min="1">
        </div>
        <div class="col-md-6">
          <label class="form-label">出库单价</label>
          <input v-model.number="editingRecord.unit_price" type="number" class="form-control" step="0.01">
        </div>
        <div class="col-md-6">
          <label class="form-label">客户</label>
          <input v-model="editingRecord.destination" type="text" class="form-control">
        </div>
        <div class="col-md-6">
          <label class="form-label">出库日期</label>
          <input v-model="editingRecord.recorded_date" type="date" class="form-control">
        </div>
        <div class="col-12">
          <label class="form-label">备注</label>
          <textarea v-model="editingRecord.remark" class="form-control" rows="2"></textarea>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-outline-secondary" @click="showEdit = false">取消</button>
        <button class="btn btn-primary" @click="handleSaveEdit" :disabled="saving">保存</button>
      </template>
    </BaseModal>

    <BaseModal v-model="showExport" title="导出销售出库单" size="lg">
      <div class="row g-3">
        <div class="col-12 text-muted small">
          <i class="bi bi-info-circle me-1"></i>将生成带格式的 Excel 销售出库单，可填写收货信息一并导出。
        </div>
        <div class="col-md-4">
          <label class="form-label">收货人</label>
          <input v-model="consignee.name" type="text" class="form-control" placeholder="收货人姓名">
        </div>
        <div class="col-md-4">
          <label class="form-label">收货地址</label>
          <input v-model="consignee.address" type="text" class="form-control" placeholder="收货地址">
        </div>
        <div class="col-md-4">
          <label class="form-label">收货联系电话</label>
          <input v-model="consignee.phone" type="text" class="form-control" placeholder="联系电话">
        </div>
      </div>
      <template #footer>
        <button class="btn btn-outline-secondary" @click="showExport = false">取消</button>
        <button class="btn btn-success" @click="handleExport" :disabled="exporting">
          <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-download me-1"></i>
          {{ exporting ? '生成中...' : '导出 Excel' }}
        </button>
      </template>
    </BaseModal>

    <ConfirmDialog ref="cancelConfirm" title="撤销出库记录" type="danger" confirm-text="确认撤销" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { inventoryApi } from '@/api/inventory'
import { useToast } from '@/composables/useToast'
import { formatDate, formatMoney, debounce, generateMonthOptions } from '@/utils/formatters'
import { exportOutOrderExcel } from '@/utils/exportOrder'
import { useSettingsStore } from '@/stores/settings'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'

const toast = useToast()
const settingsStore = useSettingsStore()

const records = ref([])
const loading = ref(false)
const searchQuery = ref('')
const monthFilter = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const monthOptions = generateMonthOptions(12)

const showEdit = ref(false)
const editingRecord = ref(null)
const saving = ref(false)
const cancelConfirm = ref(null)

const showExport = ref(false)
const exporting = ref(false)
const exportRecordId = ref(null)
const consignee = ref({ name: '', address: '', phone: '' })

const debouncedSearch = debounce(() => {
  page.value = 1
  loadRecords()
}, 300)

watch(searchQuery, debouncedSearch)
watch(monthFilter, () => {
  page.value = 1
  loadRecords()
})

async function loadRecords() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (searchQuery.value.trim()) params.query = searchQuery.value.trim()
    if (monthFilter.value) params.month = monthFilter.value

    const res = await inventoryApi.getOutRecords(params)

    if (Array.isArray(res)) {
      records.value = res
      total.value = res.length
    } else if (res?.success && res.data) {
      records.value = res.data
      total.value = res.pagination?.total ?? res.data.length
    } else if (res?.data) {
      records.value = res.data
      total.value = res.pagination?.total ?? res.data.length
    } else {
      records.value = res || []
      total.value = records.value.length
    }
  } catch (e) {
    toast.error('加载出库记录失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function handlePageChange(p) {
  page.value = p
  loadRecords()
}

function handlePageSizeChange(size) {
  pageSize.value = size
  page.value = 1
  loadRecords()
}

function openEdit(r) {
  editingRecord.value = { ...r }
  showEdit.value = true
}

async function handleSaveEdit() {
  if (!editingRecord.value) return
  saving.value = true
  try {
    await inventoryApi.updateOutRecord(editingRecord.value.id, {
      quantity: editingRecord.value.quantity,
      unit_price: editingRecord.value.unit_price,
      destination: editingRecord.value.destination,
      recorded_date: editingRecord.value.recorded_date,
      remark: editingRecord.value.remark
    })
    toast.success('修改成功')
    showEdit.value = false
    loadRecords()
  } catch (e) {
    toast.error('修改失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function confirmCancel(r) {
  const ok = await cancelConfirm.value.open()
  if (!ok) return
  try {
    await inventoryApi.cancelOutRecord(r.id)
    toast.success('已撤销')
    loadRecords()
  } catch (e) {
    toast.error('撤销失败: ' + e.message)
  }
}

function openExport(r) {
  exportRecordId.value = r.id
  consignee.value = { name: '', address: '', phone: '' }
  showExport.value = true
}

async function handleExport() {
  if (!exportRecordId.value) return
  exporting.value = true
  try {
    const res = await inventoryApi.getOutRecordById(exportRecordId.value)
    const record = res?.data ?? res
    if (!record || !record.id) {
      toast.error('获取出库记录详情失败')
      return
    }
    await exportOutOrderExcel(record, consignee.value, settingsStore.companyName)
    toast.success('出库单已导出')
    showExport.value = false
  } catch (e) {
    toast.error('导出失败: ' + e.message)
  } finally {
    exporting.value = false
  }
}

onMounted(loadRecords)
</script>

<style scoped>
.page-toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.search-box { position: relative; width: 240px; }
.search-box i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary, #9ca3af); font-size: 14px; }
.search-box input { padding-left: 30px; }
.table td { font-size: 13px; vertical-align: middle; }
.btn-sm { padding: 4px 8px; }
</style>

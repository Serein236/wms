<template>
  <div class="stocktaking-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-clipboard-check me-2"></i>库存盘点</h4>
        <p>创建盘点单，核对系统库存与实际库存</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="showCreate = true">
        <i class="bi bi-plus-circle me-1"></i>创建盘点单
      </button>
    </div>

    <!-- 盘点单列表 -->
    <div class="card" v-if="!currentStocktaking">
      <div class="card-header"><i class="bi bi-list-ul me-2"></i>盘点单列表</div>
      <div class="card-body">
        <div class="table-responsive" v-if="!loading && list.length">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th width="50">ID</th>
                <th>名称</th>
                <th width="80">状态</th>
                <th>创建时间</th>
                <th>完成时间</th>
                <th width="160">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in list" :key="s.id">
                <td class="text-muted">{{ s.id }}</td>
                <td class="fw-semibold">{{ s.name }}</td>
                <td>
                  <span class="badge" :class="statusClass(s.status)">{{ statusLabel(s.status) }}</span>
                </td>
                <td>{{ formatDate(s.created_at) }}</td>
                <td>{{ s.completed_at ? formatDate(s.completed_at) : '-' }}</td>
                <td>
                  <button v-if="s.status === 'draft'" class="btn btn-sm btn-outline-success" @click="startStocktaking(s)">
                    <i class="bi bi-play-circle me-1"></i>开始
                  </button>
                  <button v-if="s.status === 'in_progress'" class="btn btn-sm btn-outline-primary" @click="viewDetail(s)">
                    <i class="bi bi-eye me-1"></i>盘点
                  </button>
                  <button v-if="s.status !== 'completed' && s.status !== 'cancelled'" class="btn btn-sm btn-outline-danger ms-1" @click="confirmCancel(s)">
                    <i class="bi bi-x-circle"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="loading" class="text-center py-4">
          <div class="spinner-border text-primary"></div>
        </div>
        <EmptyState v-if="!loading && !list.length" icon="bi-clipboard-check" title="暂无盘点单" desc="点击右上角创建盘点单" />
      </div>
    </div>

    <!-- 盘点详情 -->
    <div v-if="currentStocktaking">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 class="mb-1">{{ currentStocktaking.name }}</h5>
          <span class="badge" :class="statusClass(currentStocktaking.status)">{{ statusLabel(currentStocktaking.status) }}</span>
        </div>
        <div class="d-flex gap-2">
          <button v-if="currentStocktaking.status === 'in_progress'" class="btn btn-success btn-sm" @click="completeStocktaking">
            <i class="bi bi-check-circle me-1"></i>完成盘点
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="currentStocktaking = null">返回列表</button>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="table-responsive" v-if="detailItems.length">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>商品名称</th>
                  <th width="100">系统库存</th>
                  <th width="100">实际库存</th>
                  <th width="100">差异</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in detailItems" :key="item.id">
                  <td class="fw-semibold">{{ item.product_name }}</td>
                  <td>{{ item.system_stock }}</td>
                  <td>
                    <input v-model.number="item.actual_stock" type="number" min="0" class="form-control form-control-sm" style="width: 80px;" @change="updateItem(item)">
                  </td>
                  <td>
                    <span :class="diffClass(item)">{{ diffValue(item) }}</span>
                  </td>
                  <td>{{ item.remark || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建盘点单弹窗 -->
    <BaseModal v-model="showCreate" title="创建盘点单" size="md">
      <div class="mb-3">
        <label class="form-label">盘点单名称 <span class="text-danger">*</span></label>
        <input v-model="createForm.name" type="text" class="form-control" placeholder="如：2026年8月盘点">
      </div>
      <div class="mb-3">
        <label class="form-label">备注</label>
        <textarea v-model="createForm.remark" class="form-control" rows="2"></textarea>
      </div>
      <template #footer>
        <button class="btn btn-outline-secondary" @click="showCreate = false">取消</button>
        <button class="btn btn-primary" @click="handleCreate" :disabled="creating">
          {{ creating ? '创建中...' : '创建' }}
        </button>
      </template>
    </BaseModal>

    <ConfirmDialog ref="cancelConfirm" title="取消盘点单" type="danger" confirm-text="确认取消" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { stocktakingApi } from '@/api/stocktaking'
import { useToast } from '@/composables/useToast'
import { formatDate } from '@/utils/formatters'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const toast = useToast()

const list = ref([])
const loading = ref(false)
const currentStocktaking = ref(null)
const detailItems = ref([])

const showCreate = ref(false)
const creating = ref(false)
const createForm = ref({ name: '', remark: '' })
const cancelConfirm = ref(null)

function statusClass(status) {
  return {
    draft: 'bg-secondary-subtle text-secondary',
    in_progress: 'bg-primary-subtle text-primary',
    completed: 'bg-success-subtle text-success',
    cancelled: 'bg-danger-subtle text-danger'
  }[status] || 'bg-secondary'
}

function statusLabel(status) {
  return { draft: '待开始', in_progress: '进行中', completed: '已完成', cancelled: '已取消' }[status] || status
}

function diffClass(item) {
  const diff = (item.actual_stock ?? 0) - (item.system_stock ?? 0)
  if (diff > 0) return 'text-success fw-bold'
  if (diff < 0) return 'text-danger fw-bold'
  return 'text-muted'
}

function diffValue(item) {
  return ((item.actual_stock ?? 0) - (item.system_stock ?? 0))
}

async function loadList() {
  loading.value = true
  try {
    const res = await stocktakingApi.list()
    list.value = Array.isArray(res) ? res : (res?.data || [])
  } catch (e) {
    toast.error('加载盘点列表失败')
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!createForm.value.name) {
    toast.warning('请填写盘点单名称')
    return
  }
  creating.value = true
  try {
    await stocktakingApi.create(createForm.value)
    toast.success('创建成功')
    showCreate.value = false
    createForm.value = { name: '', remark: '' }
    loadList()
  } catch (e) {
    toast.error('创建失败: ' + e.message)
  } finally {
    creating.value = false
  }
}

async function startStocktaking(s) {
  try {
    await stocktakingApi.start(s.id)
    toast.success('盘点已开始')
    viewDetail(s)
  } catch (e) {
    toast.error('操作失败: ' + e.message)
  }
}

async function viewDetail(s) {
  try {
    const res = await stocktakingApi.getById(s.id)
    const data = res?.data || res
    currentStocktaking.value = data
    detailItems.value = data.items || []
  } catch (e) {
    toast.error('加载详情失败')
  }
}

async function updateItem(item) {
  const n = Number(item.actual_stock)
  if (item.actual_stock === '' || item.actual_stock === null || item.actual_stock === undefined || !Number.isInteger(n) || n < 0) {
    toast.warning('实盘数量必须是不小于 0 的整数')
    return
  }
  try {
    await stocktakingApi.updateItem(currentStocktaking.value.id, item.id, {
      actual_stock: n,
      remark: item.remark
    })
    toast.success('已保存')
  } catch (e) {
    toast.error('更新失败: ' + e.message)
  }
}

async function completeStocktaking() {
  try {
    await stocktakingApi.complete(currentStocktaking.value.id)
    toast.success('盘点完成')
    currentStocktaking.value = null
    loadList()
  } catch (e) {
    toast.error('操作失败: ' + e.message)
  }
}

async function confirmCancel(s) {
  const ok = await cancelConfirm.value.open()
  if (!ok) return
  try {
    await stocktakingApi.cancel(s.id)
    toast.success('已取消')
    loadList()
  } catch (e) {
    toast.error('取消失败')
  }
}

onMounted(loadList)
</script>

<style scoped>
.page-toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.table td { font-size: 14px; vertical-align: middle; }
</style>

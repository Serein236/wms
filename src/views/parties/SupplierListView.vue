<template>
  <div class="party-list-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-truck me-2"></i>供应商管理</h4>
        <p>查看、编辑、删除供应商信息</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openCreate">
        <i class="bi bi-plus-circle me-1"></i>新增供应商
      </button>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-list-check"></i>
          <span>供应商列表</span>
          <span v-if="total" class="badge bg-light text-muted">{{ total }}</span>
        </div>
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input v-model="searchQuery" type="text" class="form-control form-control-sm" placeholder="搜索供应商名称...">
        </div>
      </div>

      <div class="table-responsive" v-if="!loading && items.length">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th width="50">序号</th>
              <th>供应商名称</th>
              <th>联系人</th>
              <th>联系电话</th>
              <th>邮箱</th>
              <th>地址</th>
              <th width="70">状态</th>
              <th width="120">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in items" :key="item.id">
              <td class="text-muted">{{ (page - 1) * pageSize + idx + 1 }}</td>
              <td class="fw-semibold">{{ item.name }}</td>
              <td>{{ item.contact_person || '-' }}</td>
              <td>{{ item.phone || '-' }}</td>
              <td>{{ item.email || '-' }}</td>
              <td>{{ item.address || '-' }}</td>
              <td>
                <span class="badge" :class="item.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'">
                  {{ item.is_active ? '启用' : '禁用' }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-primary" @click="openEdit(item)" title="编辑">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1" @click="confirmDelete(item)" title="删除">
                  <i class="bi bi-trash"></i>
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

      <EmptyState v-if="!loading && !items.length" icon="bi-truck" title="暂无供应商" desc="点击右上角「新增供应商」添加" />

      <div class="card-footer" v-if="total > 0">
        <PaginationBar :page="page" :page-size="pageSize" :total="total" @page-change="handlePageChange" />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <BaseModal v-model="showForm" :title="editing ? '编辑供应商' : '新增供应商'" size="lg">
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">供应商名称 <span class="text-danger">*</span></label>
          <input v-model="form.name" type="text" class="form-control" required placeholder="供应商名称">
        </div>
        <div class="col-md-6">
          <label class="form-label">联系人</label>
          <input v-model="form.contact_person" type="text" class="form-control" placeholder="联系人">
        </div>
        <div class="col-md-6">
          <label class="form-label">联系电话</label>
          <input v-model="form.phone" type="text" class="form-control" placeholder="联系电话">
        </div>
        <div class="col-md-6">
          <label class="form-label">邮箱</label>
          <input v-model="form.email" type="email" class="form-control" placeholder="邮箱">
        </div>
        <div class="col-12">
          <label class="form-label">地址</label>
          <input v-model="form.address" type="text" class="form-control" placeholder="地址">
        </div>
        <div class="col-12" v-if="editing">
          <div class="form-check">
            <input v-model="form.is_active" class="form-check-input" type="checkbox" id="activeCheck">
            <label class="form-check-label" for="activeCheck">启用</label>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-outline-secondary" @click="showForm = false">取消</button>
        <button class="btn btn-primary" @click="handleSave" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          {{ editing ? '保存' : '添加' }}
        </button>
      </template>
    </BaseModal>

    <ConfirmDialog ref="deleteConfirm" title="删除供应商" type="danger" confirm-text="删除" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { suppliersApi } from '@/api/suppliers'
import { useToast } from '@/composables/useToast'
import { debounce } from '@/utils/formatters'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'

const route = useRoute()
const toast = useToast()

const items = ref([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const deleteConfirm = ref(null)

const form = ref({
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  is_active: true
})

const debouncedSearch = debounce(() => {
  page.value = 1
  loadData()
}, 300)

watch(searchQuery, debouncedSearch)

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (searchQuery.value.trim()) params.query = searchQuery.value.trim()

    const res = await suppliersApi.list(params)

    if (Array.isArray(res)) {
      items.value = res
      total.value = res.length
    } else if (res?.success && res.data) {
      items.value = res.data
      total.value = res.pagination?.total ?? res.data.length
    } else if (res?.data) {
      items.value = res.data
      total.value = res.pagination?.total ?? res.data.length
    } else {
      items.value = res || []
      total.value = items.value.length
    }
  } catch (e) {
    toast.error('加载失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function handlePageChange(p) {
  page.value = p
  loadData()
}

function openCreate() {
  editing.value = null
  form.value = { name: '', contact_person: '', phone: '', email: '', address: '', is_active: true }
  showForm.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = { ...item }
  showForm.value = true
}

async function handleSave() {
  if (!form.value.name) {
    toast.warning('请填写供应商名称')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await suppliersApi.update(editing.value.id, form.value)
      toast.success('修改成功')
    } else {
      await suppliersApi.create(form.value)
      toast.success('添加成功')
    }
    showForm.value = false
    loadData()
  } catch (e) {
    toast.error('操作失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function confirmDelete(item) {
  const ok = await deleteConfirm.value.open()
  if (!ok) return
  try {
    await suppliersApi.delete(item.id)
    toast.success('删除成功')
    loadData()
  } catch (e) {
    toast.error('删除失败: ' + e.message)
  }
}

onMounted(() => {
  loadData()
  if (route.meta?.openCreate) openCreate()
})
</script>

<style scoped>
.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.search-box { position: relative; width: 240px; }
.search-box i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary, #9ca3af); font-size: 14px; }
.search-box input { padding-left: 30px; }
.table td { font-size: 14px; vertical-align: middle; }
.btn-sm { padding: 4px 8px; }
</style>

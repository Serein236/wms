<template>
  <div class="settings-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-gear me-2"></i>系统设置</h4>
        <p>配置系统参数和个性化选项</p>
      </div>
    </div>

    <!-- Tab 导航 -->
    <ul class="nav nav-pills mb-3">
      <li class="nav-item" v-for="tab in tabs" :key="tab.id">
        <button
          class="nav-link"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <i class="bi me-1" :class="tab.icon"></i>{{ tab.label }}
        </button>
      </li>
    </ul>

    <!-- 公司信息 -->
    <div v-if="activeTab === 'company'" class="card">
      <div class="card-header"><i class="bi bi-building me-2"></i>公司信息</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">公司名称</label>
            <input v-model="form.companyName" type="text" class="form-control">
          </div>
          <div class="col-md-6">
            <label class="form-label">联系电话</label>
            <input v-model="form.phone" type="text" class="form-control">
          </div>
          <div class="col-md-6">
            <label class="form-label">公司地址</label>
            <input v-model="form.address" type="text" class="form-control">
          </div>
          <div class="col-md-6">
            <label class="form-label">备案号</label>
            <input v-model="form.icp" type="text" class="form-control">
          </div>
        </div>
        <button class="btn btn-primary mt-3" @click="saveCompany">保存</button>
      </div>
    </div>

    <!-- 安全设置 -->
    <div v-if="activeTab === 'security'" class="card">
      <div class="card-header"><i class="bi bi-shield-lock me-2"></i>修改密码</div>
      <div class="card-body">
        <div class="row g-3" style="max-width: 500px;">
          <div class="col-12">
            <label class="form-label">当前密码 <span class="text-danger">*</span></label>
            <input v-model="pwdForm.oldPassword" type="password" class="form-control" required>
          </div>
          <div class="col-12">
            <label class="form-label">新密码 <span class="text-danger">*</span></label>
            <input v-model="pwdForm.newPassword" type="password" class="form-control" required>
          </div>
          <div class="col-12">
            <label class="form-label">确认新密码 <span class="text-danger">*</span></label>
            <input v-model="pwdForm.confirmPassword" type="password" class="form-control" required>
          </div>
        </div>
        <button class="btn btn-primary mt-3" @click="changePassword" :disabled="changingPwd">
          {{ changingPwd ? '修改中...' : '修改密码' }}
        </button>
      </div>
    </div>

    <!-- 数据管理 -->
    <div v-if="activeTab === 'data'" class="card">
      <div class="card-header"><i class="bi bi-database me-2"></i>数据备份</div>
      <div class="card-body">
        <div class="d-flex gap-2 mb-3">
          <button class="btn btn-primary" @click="createBackup" :disabled="backupLoading">
            <i class="bi bi-database-add me-1"></i>创建备份
          </button>
          <button class="btn btn-outline-secondary" @click="loadBackups">
            <i class="bi bi-arrow-clockwise me-1"></i>刷新
          </button>
        </div>

        <div class="table-responsive" v-if="backups.length">
          <table class="table table-hover align-middle">
            <thead>
              <tr>
                <th>文件名</th>
                <th width="100">大小</th>
                <th>创建时间</th>
                <th width="200">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in backups" :key="b.id">
                <td><i class="bi bi-file-earmark-zip me-1"></i>{{ b.file_name }}</td>
                <td>{{ formatBackupSize(b.file_size) }}</td>
                <td>{{ formatDate(b.created_at, true) }}</td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" @click="downloadBackup(b)">
                    <i class="bi bi-download me-1"></i>下载
                  </button>
                  <button class="btn btn-sm btn-outline-warning ms-1" @click="restoreBackup(b)">
                    <i class="bi bi-arrow-counterclockwise"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger ms-1" @click="deleteBackup(b)">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else icon="bi-database" title="暂无备份" />
      </div>
    </div>

    <!-- 出入库方式管理 -->
    <div v-if="activeTab === 'stockMethods'" class="card">
      <div class="card-header">
        <i class="bi bi-list-check me-2"></i>出入库方式管理
        <button class="btn btn-primary btn-sm float-end" @click="showMethodModal = true">
          <i class="bi bi-plus-circle me-1"></i>新增方式
        </button>
      </div>
      <div class="card-body">
        <div class="table-responsive" v-if="stockMethods.length">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>名称</th>
                <th width="80">类型</th>
                <th width="80">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in stockMethods" :key="m.id">
                <td>{{ m.method_name || m.name }}</td>
                <td><span class="badge" :class="m.type === 'in' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'">{{ m.type === 'in' ? '入库' : '出库' }}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline-danger" @click="deleteMethod(m)"><i class="bi bi-trash"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else icon="bi-list-check" title="暂无出入库方式" />
      </div>
    </div>

    <!-- 新增方式弹窗 -->
    <BaseModal v-model="showMethodModal" title="新增出入库方式" size="sm">
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">方式名称 <span class="text-danger">*</span></label>
          <input v-model="methodForm.name" type="text" class="form-control" placeholder="如：采购入库">
        </div>
        <div class="col-12">
          <label class="form-label">类型</label>
          <select v-model="methodForm.type" class="form-select">
            <option value="in">入库</option>
            <option value="out">出库</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-outline-secondary" @click="showMethodModal = false">取消</button>
        <button class="btn btn-primary" @click="addMethod">添加</button>
      </template>
    </BaseModal>

    <ConfirmDialog ref="deleteConfirm" title="确认删除" type="danger" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { inventoryApi } from '@/api/inventory'
import { backupApi } from '@/api/backup'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { formatDate } from '@/utils/formatters'

const toast = useToast()
const settingsStore = useSettingsStore()
const auth = useAuthStore()

const allTabs = [
  { id: 'company', label: '公司信息', icon: 'bi-building', adminOnly: true },
  { id: 'security', label: '安全设置', icon: 'bi-shield-lock' },
  { id: 'data', label: '数据管理', icon: 'bi-database', adminOnly: true },
  { id: 'stockMethods', label: '出入库方式', icon: 'bi-list-check', adminOnly: true }
]

const isAdmin = computed(() => auth.role === 'admin')
const tabs = computed(() => allTabs.filter(t => !t.adminOnly || isAdmin.value))

const activeTab = ref(isAdmin.value ? 'company' : 'security')

// 公司信息
const form = ref({
  companyName: '',
  phone: '',
  address: '',
  icp: ''
})

// 密码修改
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const changingPwd = ref(false)

// 备份
const backups = ref([])
const backupLoading = ref(false)

// 出入库方式
const stockMethods = ref([])
const showMethodModal = ref(false)
const methodForm = ref({ name: '', type: 'in' })

const deleteConfirm = ref(null)

async function saveCompany() {
  try {
    await settingsStore.save(form.value)
    toast.success('保存成功')
  } catch (e) {
    toast.error('保存失败: ' + e.message)
  }
}

async function changePassword() {
  if (!pwdForm.value.oldPassword || !pwdForm.value.newPassword) {
    toast.warning('请填写完整')
    return
  }
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) {
    toast.warning('两次密码不一致')
    return
  }
  changingPwd.value = true
  try {
    await backupApi.changePassword({
      currentPassword: pwdForm.value.oldPassword,
      newPassword: pwdForm.value.newPassword
    })
    toast.success('密码修改成功')
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e) {
    toast.error('修改失败: ' + e.message)
  } finally {
    changingPwd.value = false
  }
}

async function createBackup() {
  backupLoading.value = true
  try {
    await backupApi.createBackup()
    toast.success('备份创建成功')
    loadBackups()
  } catch (e) {
    toast.error('备份失败: ' + e.message)
  } finally {
    backupLoading.value = false
  }
}

async function loadBackups() {
  try {
    const res = await backupApi.listBackups()
    backups.value = Array.isArray(res) ? res : (res?.data || [])
  } catch (e) {
    toast.error('加载备份列表失败')
  }
}

async function downloadBackup(b) {
  try {
    const res = await backupApi.downloadBackup(b.id)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = b.file_name || 'backup.sql'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    toast.error('下载失败')
  }
}

async function restoreBackup(b) {
  const ok = await deleteConfirm.value.open()
  if (!ok) return
  try {
    await backupApi.restoreBackup(b.id)
    toast.success('恢复成功')
  } catch (e) {
    toast.error('恢复失败: ' + e.message)
  }
}

async function deleteBackup(b) {
  const ok = await deleteConfirm.value.open()
  if (!ok) return
  try {
    await backupApi.deleteBackup(b.id)
    toast.success('删除成功')
    loadBackups()
  } catch (e) {
    toast.error('删除失败')
  }
}

async function loadStockMethods() {
  try {
    const res = await inventoryApi.getStockMethodsAdmin()
    // API 返回 {success, methods: [...]}，兼容 res.data 格式
    stockMethods.value = res?.methods || res?.data || (Array.isArray(res) ? res : [])
  } catch (e) {
    // 降级使用普通接口
    try {
      const res2 = await inventoryApi.getStockMethods()
      stockMethods.value = Array.isArray(res2) ? res2 : (res2?.data || res2?.methods || [])
    } catch (e2) {
      // 忽略
    }
  }
}

async function addMethod() {
  if (!methodForm.value.name) {
    toast.warning('请填写方式名称')
    return
  }
  try {
    // 后端期望 { method_name, type }，不是 { name, type }
    await inventoryApi.createStockMethod({
      method_name: methodForm.value.name,
      type: methodForm.value.type
    })
    toast.success('添加成功')
    showMethodModal.value = false
    methodForm.value = { name: '', type: 'in' }
    loadStockMethods()
  } catch (e) {
    toast.error('添加失败: ' + e.message)
  }
}

async function deleteMethod(m) {
  const ok = await deleteConfirm.value.open()
  if (!ok) return
  try {
    await inventoryApi.deleteStockMethod(m.id)
    toast.success('删除成功')
    loadStockMethods()
  } catch (e) {
    toast.error('删除失败')
  }
}

function formatBackupSize(sizeMb) {
  if (sizeMb === null || sizeMb === undefined || sizeMb === '') return '-'
  const mb = parseFloat(sizeMb)
  if (isNaN(mb)) return String(sizeMb)
  if (mb >= 1) return mb.toFixed(2) + ' MB'
  return (mb * 1024).toFixed(1) + ' KB'
}

onMounted(async () => {
  // 加载设置
  await settingsStore.load()
  Object.assign(form.value, settingsStore.settings)

  // 加载备份列表
  loadBackups()

  // 加载出入库方式
  loadStockMethods()
})
</script>

<style scoped>
.page-toolbar { margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.form-label { font-weight: 600; font-size: 14px; }
</style>

<template>
  <div class="user-list-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-people me-2"></i>用户管理</h4>
        <p>管理系统登录账号、角色与启用状态</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openCreate">
        <i class="bi bi-person-plus me-1"></i>新增用户
      </button>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-list-check"></i>
          <span>用户列表</span>
          <span v-if="users.length" class="badge bg-light text-muted">{{ users.length }}</span>
        </div>
      </div>

      <div class="table-responsive" v-if="!loading && users.length">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th width="60">序号</th>
              <th>用户名</th>
              <th width="120">角色</th>
              <th width="90">状态</th>
              <th width="180">创建时间</th>
              <th width="200">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in users" :key="item.id">
              <td class="text-muted">{{ idx + 1 }}</td>
              <td class="fw-semibold">
                {{ item.username }}
                <span v-if="item.username === currentUsername" class="badge bg-info-subtle text-info ms-1">当前用户</span>
              </td>
              <td>
                <span class="badge" :class="item.role === 'admin' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'">
                  {{ item.role === 'admin' ? '管理员' : '普通用户' }}
                </span>
              </td>
              <td>
                <span class="badge" :class="item.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'">
                  {{ item.is_active ? '启用' : '禁用' }}
                </span>
              </td>
              <td>{{ formatDate(item.created_at, true) || '-' }}</td>
              <td>
                <template v-if="item.username === currentUsername">
                  <span class="text-muted small">—</span>
                </template>
                <template v-else>
                  <button class="btn btn-sm btn-outline-primary" @click="openEdit(item)" title="编辑">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    class="btn btn-sm ms-1"
                    :class="item.is_active ? 'btn-outline-warning' : 'btn-outline-success'"
                    @click="confirmToggle(item)"
                    :title="item.is_active ? '禁用' : '启用'"
                  >
                    <i :class="item.is_active ? 'bi-lock' : 'bi-unlock'"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger ms-1" @click="confirmDelete(item)" title="删除">
                    <i class="bi bi-trash"></i>
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-2 text-muted">加载中...</p>
      </div>

      <EmptyState v-if="!loading && !users.length" icon="bi-people" title="暂无用户" desc="点击右上角「新增用户」添加" />
    </div>

    <!-- 新增/编辑弹窗 -->
    <BaseModal v-model="showForm" :title="editing ? '编辑用户' : '新增用户'">
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label">用户名 <span class="text-danger">*</span></label>
          <input v-model="form.username" type="text" class="form-control" required maxlength="50" placeholder="登录用户名">
        </div>
        <div class="col-12">
          <label class="form-label">角色 <span class="text-danger">*</span></label>
          <select v-model="form.role" class="form-select">
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div class="col-12">
          <label class="form-label">
            {{ editing ? '新密码（留空则不修改）' : '初始密码' }}
            <span v-if="!editing" class="text-danger">*</span>
          </label>
          <input v-model="form.password" type="text" class="form-control" minlength="6" placeholder="至少 6 位">
          <div class="form-text">密码至少 6 位，建议首次登录后修改</div>
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

    <ConfirmDialog ref="deleteConfirm" title="删除用户" type="danger" confirm-text="删除" :message="deleteTarget ? `确定删除用户「${deleteTarget.username}」吗？此操作不可恢复。` : '确定删除该用户吗？'" />
    <ConfirmDialog
      ref="toggleConfirm"
      :title="toggleTarget?.is_active ? '禁用用户' : '启用用户'"
      :type="toggleTarget?.is_active ? 'warning' : 'info'"
      :confirm-text="toggleTarget?.is_active ? '禁用' : '启用'"
      :message="toggleTarget ? `确定要${toggleTarget.is_active ? '禁用' : '启用'}用户「${toggleTarget.username}」吗？` : ''"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatDate } from '@/utils/formatters'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const toast = useToast()
const authStore = useAuthStore()

const users = ref([])
const loading = ref(false)
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const deleteConfirm = ref(null)
const toggleConfirm = ref(null)
const toggleTarget = ref(null)
const deleteTarget = ref(null)

const currentUsername = computed(() => authStore.user || '')

const form = ref({ username: '', role: 'user', password: '' })

async function loadUsers() {
  loading.value = true
  try {
    const res = await authApi.getUsers()
    users.value = res?.data || (Array.isArray(res) ? res : [])
  } catch (e) {
    toast.error('加载用户失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { username: '', role: 'user', password: '' }
  showForm.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = { username: item.username, role: item.role, password: '' }
  showForm.value = true
}

async function handleSave() {
  const username = String(form.value.username || '').trim()
  if (!username) {
    toast.warning('请填写用户名')
    return
  }
  const password = form.value.password || ''
  if (!editing.value && !password) {
    toast.warning('请填写初始密码')
    return
  }
  if (password && password.length < 6) {
    toast.warning('密码至少需要 6 位')
    return
  }

  saving.value = true
  try {
    if (editing.value) {
      const payload = { username, role: form.value.role }
      if (password) payload.password = password
      await authApi.updateUser(editing.value.id, payload)
      toast.success('修改成功')
    } else {
      await authApi.createUser({ username, role: form.value.role, password })
      toast.success('添加成功')
    }
    showForm.value = false
    loadUsers()
  } catch (e) {
    toast.error('操作失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function confirmDelete(item) {
  deleteTarget.value = item
  const ok = await deleteConfirm.value.open()
  if (!ok) return
  try {
    await authApi.deleteUser(item.id)
    toast.success('删除成功')
    loadUsers()
  } catch (e) {
    toast.error('删除失败: ' + e.message)
  }
}

async function confirmToggle(item) {
  toggleTarget.value = item
  const ok = await toggleConfirm.value.open()
  if (!ok) return
  try {
    const res = await authApi.toggleUserStatus(item.id)
    toast.success(res?.message || (item.is_active ? '已禁用' : '已启用'))
    loadUsers()
  } catch (e) {
    toast.error('操作失败: ' + e.message)
  }
}

onMounted(loadUsers)
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
.table td { font-size: 14px; vertical-align: middle; }
.btn-sm { padding: 4px 8px; }
</style>

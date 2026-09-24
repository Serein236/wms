<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <i class="bi bi-warehouse"></i>
        <h2>{{ config.companyName }}</h2>
        <p>请登录以继续</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-person"></i></span>
            <input
              v-model="username"
              type="text"
              class="form-control"
              placeholder="请输入用户名"
              required
              autocomplete="username"
              :disabled="loading"
            >
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">密码</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-lock"></i></span>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-control"
              placeholder="请输入密码"
              required
              autocomplete="current-password"
              :disabled="loading"
            >
            <button
              class="btn btn-outline-secondary"
              type="button"
              @click="showPassword = !showPassword"
            >
              <i class="bi" :class="showPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
            </button>
          </div>
        </div>

        <div v-if="error" class="alert alert-danger">
          <i class="bi bi-exclamation-circle me-1"></i>{{ error }}
        </div>

        <button type="submit" class="btn btn-primary w-100" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-box-arrow-in-right me-1"></i>
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>

    <footer class="login-footer">
      <span>&copy; 2026 {{ settingsStore.companyName }}</span>
      <template v-if="settingsStore.icp">
        <span class="mx-2">|</span>
        <a :href="settingsStore.icpUrl || 'https://beian.miit.gov.cn/'" target="_blank">{{ settingsStore.icp }}</a>
      </template>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useToast } from '@/composables/useToast'
import { authApi } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const toast = useToast()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

// 登录页页脚公司信息/备案号来自公开设置接口（数据库驱动，设置页保存后生效）
onMounted(() => {
  settingsStore.loadPublic()
})

async function handleLogin() {
  if (!username.value || !password.value) return

  loading.value = true
  error.value = ''

  try {
    await auth.login(username.value, password.value)
    // 默认密码提示改为登录成功后仅对管理员检查（该接口已收紧为仅管理员可用），
    // 不再在登录页匿名暴露"默认密码是否在用"的安全状态
    if (auth.role === 'admin') {
      try {
        const data = await authApi.checkDefaultAdmin()
        if (data.isDefault) {
          toast.warning('admin 仍在使用默认密码，请尽快到「设置」中修改')
        }
      } catch (e) {
        // 检查失败不阻塞登录
      }
    }
    const redirect = route.query.redirect || '/home'
    router.push(redirect)
  } catch (e) {
    error.value = e.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 50%, #f0f9ff 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 40px 36px;
  box-shadow: 0 4px 24px rgba(13, 148, 136, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header i {
  font-size: 40px;
  color: var(--brand-500, #0d9488);
}

.login-header h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 12px 0 4px;
  color: var(--text-primary, #1a1a1a);
}

.login-header p {
  font-size: 14px;
  color: var(--text-secondary, #6b7280);
  margin: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 6px;
  color: var(--text-primary, #1a1a1a);
}

.btn-primary {
  padding: 10px;
  font-weight: 600;
  margin-top: 8px;
}

.default-hint {
  margin-top: 16px;
  padding: 10px 12px;
  background: var(--brand-50, #f0fdfa);
  border: 1px solid var(--brand-200, #99f6e4);
  border-radius: 8px;
  font-size: 13px;
  color: var(--brand-700, #0f766e);
  text-align: center;
}

.login-footer {
  margin-top: 24px;
  font-size: 13px;
  color: var(--text-tertiary, #9ca3af);
}

.login-footer a {
  color: inherit;
  text-decoration: none;
}

.login-footer a:hover {
  text-decoration: underline;
}
</style>

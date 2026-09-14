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

        <div v-if="isDefaultAdmin" class="default-hint">
          <i class="bi bi-info-circle"></i>
          默认账号 admin / admin123，请及时修改密码
        </div>
      </form>
    </div>

    <footer class="login-footer">
      <span>&copy; 2026 {{ config.companyName }}</span>
      <template v-if="config.icp">
        <span class="mx-2">|</span>
        <a :href="config.icpUrl || 'https://beian.miit.gov.cn/'" target="_blank">{{ config.icp }}</a>
      </template>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { config } from '@/utils/config'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const isDefaultAdmin = ref(false)

onMounted(async () => {
  try {
    const data = await authApi.checkDefaultAdmin()
    isDefaultAdmin.value = data.isDefault || false
  } catch (e) {
    // 忽略检查失败
  }
})

async function handleLogin() {
  if (!username.value || !password.value) return

  loading.value = true
  error.value = ''

  try {
    await auth.login(username.value, password.value)
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

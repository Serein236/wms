import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Bootstrap CSS (npm package, tree-shakeable)
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

// Custom design system
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/overrides.css'

// Bootstrap JS components (按需引入)
import 'bootstrap/js/dist/modal'
import 'bootstrap/js/dist/dropdown'
import 'bootstrap/js/dist/collapse'
import 'bootstrap/js/dist/tab'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 注意：不要在这里预加载系统设置。
// GET /api/settings 需要登录，在登录页无条件调用会返回 401 并污染控制台。
// 已登录界面由 AppLayout 的 onMounted 加载完整设置；
// 登录页只需要公开信息，由 LoginView 调用 settingsStore.loadPublic()。

app.mount('#app')

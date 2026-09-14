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
import { useSettingsStore } from './stores/settings'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 启动时加载系统设置（公司名等，供出库单导出等场景使用）
useSettingsStore().load()

app.mount('#app')

<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ show: sidebarOpen }">
      <div class="sidebar-brand">
        <i class="bi bi-warehouse"></i>
        <span>{{ config.companyName }}</span>
      </div>
      <nav class="sidebar-nav">
        <template v-for="item in visibleMenuItems" :key="item.label">
          <!-- 无子菜单 -->
          <router-link
            v-if="!item.children"
            :to="item.to"
            class="sidebar-link"
            :class="{ active: isMenuActive(item) }"
          >
            <i class="bi" :class="item.icon"></i>
            <span>{{ item.label }}</span>
          </router-link>

          <!-- 有子菜单 -->
          <template v-else>
            <a
              class="sidebar-link"
              :class="{ expanded: expandedMenus[item.label] }"
              href="javascript:void(0)"
              @click="toggleMenu(item.label)"
            >
              <i class="bi" :class="item.icon"></i>
              <span>{{ item.label }}</span>
              <i class="bi bi-chevron-down arrow"></i>
            </a>
            <div class="sidebar-submenu" :class="{ show: expandedMenus[item.label] || isMenuActive(item) }">
              <template v-for="child in item.children" :key="child.label">
                <router-link
                  v-if="!child.children"
                  :to="child.to"
                  class="sidebar-link"
                  :class="{ active: isRouteActive(child.to) }"
                >
                  <i class="bi" :class="child.icon"></i>
                  <span>{{ child.label }}</span>
                </router-link>
                <!-- 三级子菜单 -->
                <template v-else>
                  <a
                    class="sidebar-link"
                    :class="{ expanded: expandedMenus[child.label] }"
                    href="javascript:void(0)"
                    @click="toggleMenu(child.label)"
                  >
                    <i class="bi" :class="child.icon"></i>
                    <span>{{ child.label }}</span>
                    <i class="bi bi-chevron-down arrow"></i>
                  </a>
                  <div class="sidebar-submenu" :class="{ show: expandedMenus[child.label] || isMenuActive(child) }">
                    <router-link
                      v-for="gc in child.children"
                      :key="gc.label"
                      :to="gc.to"
                      class="sidebar-link"
                      :class="{ active: isRouteActive(gc.to) }"
                    >
                      <i class="bi" :class="gc.icon"></i>
                      <span>{{ gc.label }}</span>
                    </router-link>
                  </div>
                </template>
              </template>
            </div>
          </template>
        </template>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <i class="bi bi-person-circle"></i>
          <span>{{ auth.user ? `欢迎, ${auth.user}` : '未登录' }}</span>
        </div>
        <button class="btn btn-outline-secondary btn-sm w-100" @click="handleLogout">
          <i class="bi bi-box-arrow-right me-1"></i>退出登录
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-wrapper">
      <header class="app-header">
        <div>
          <div class="app-header-title">{{ route.meta.title || '仓库管理系统' }}</div>
        </div>
        <button class="btn btn-sm btn-outline-secondary d-md-none" @click="sidebarOpen = !sidebarOpen">
          <i class="bi bi-list"></i>
        </button>
      </header>

      <main class="main-content">
        <router-view />
      </main>

      <footer class="app-footer">
        <span>{{ settingsStore.companyName }}</span>
        <template v-if="settingsStore.icp">
          <span class="mx-2">|</span>
          <a :href="settingsStore.icpUrl || '#'" target="_blank">{{ settingsStore.icp }}</a>
        </template>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)

const auth = useAuthStore()
const settingsStore = useSettingsStore()

// 页脚公司信息/备案号来自数据库设置（设置页保存后实时生效）
onMounted(() => {
  if (!settingsStore.loaded) settingsStore.load()
})

// 菜单定义（adminOnly 仅管理员可见）
const menuItems = [
  { icon: 'bi-house-door', label: '首页', to: '/home' },
  {
    icon: 'bi-box-seam', label: '商品管理', to: '/products',
    children: [
      { icon: 'bi-plus-circle', label: '新增商品', to: '/products/new', adminOnly: true },
      { icon: 'bi-list-check', label: '商品列表', to: '/products' }
    ]
  },
  {
    icon: 'bi-arrow-left-right', label: '出入库管理', to: '/stock/in',
    children: [
      {
        icon: 'bi-arrow-down-circle', label: '入库管理', to: '/stock/in',
        children: [
          { icon: 'bi-plus-circle', label: '新增入库', to: '/stock/in' },
          { icon: 'bi-list-ul', label: '入库列表', to: '/stock/in-records' }
        ]
      },
      {
        icon: 'bi-arrow-up-circle', label: '出库管理', to: '/stock/out',
        children: [
          { icon: 'bi-plus-circle', label: '新增出库', to: '/stock/out' },
          { icon: 'bi-list-ul', label: '出库列表', to: '/stock/out-records' }
        ]
      },
      {
        icon: 'bi-list-columns', label: '批量管理', to: '/batch',
        children: [
          { icon: 'bi-arrow-down-circle', label: '批量入库', to: '/batch/in' },
          { icon: 'bi-arrow-up-circle', label: '批量出库', to: '/batch/out' }
        ]
      }
    ]
  },
  {
    icon: 'bi-clipboard-data', label: '库存管理', to: '/stock',
    children: [
      { icon: 'bi-table', label: '库存列表', to: '/stock' },
      { icon: 'bi-search', label: '库存查询', to: '/stock/query' },
      { icon: 'bi-clipboard-check', label: '库存盘点', to: '/stocktaking', adminOnly: true }
    ]
  },
  {
    icon: 'bi-truck', label: '供应商管理', to: '/suppliers', adminOnly: true,
    children: [
      { icon: 'bi-plus-circle', label: '新增供应商', to: '/suppliers/new', adminOnly: true },
      { icon: 'bi-list-check', label: '供应商列表', to: '/suppliers', adminOnly: true }
    ]
  },
  {
    icon: 'bi-people', label: '客户管理', to: '/customers', adminOnly: true,
    children: [
      { icon: 'bi-plus-circle', label: '新增客户', to: '/customers', adminOnly: true },
      { icon: 'bi-list-check', label: '客户列表', to: '/customers', adminOnly: true }
    ]
  },
  { icon: 'bi-bar-chart-line', label: '看板大屏', to: '/dashboard' },
  {
    icon: 'bi-gear-wide-connected', label: '系统管理', to: '/settings', adminOnly: true,
    children: [
      { icon: 'bi-upload', label: '数据导入', to: '/import', adminOnly: true },
      { icon: 'bi-people', label: '用户管理', to: '/users', adminOnly: true },
      { icon: 'bi-gear', label: '系统设置', to: '/settings', adminOnly: true }
    ]
  }
]

// 按角色过滤菜单
const visibleMenuItems = computed(() => {
  const isAdmin = auth.role === 'admin'
  const filterNode = (node) => {
    if (node.adminOnly && !isAdmin) return null
    if (node.children) {
      const children = node.children.map(filterNode).filter(Boolean)
      if (!children.length) return null
      return { ...node, children }
    }
    return node
  }
  return menuItems.map(filterNode).filter(Boolean)
})

// 展开状态
const expandedMenus = reactive({})
try {
  const saved = localStorage.getItem('sidebar_state')
  if (saved) Object.assign(expandedMenus, JSON.parse(saved))
} catch (e) { /* ignore */ }

function toggleMenu(label) {
  expandedMenus[label] = !expandedMenus[label]
  localStorage.setItem('sidebar_state', JSON.stringify(expandedMenus))
}

function isRouteActive(to) {
  return route.path === to
}

function isMenuActive(item) {
  if (item.to && route.path === item.to) return true
  if (item.children) {
    return item.children.some(c => {
      if (c.to && route.path === c.to) return true
      if (c.children) return c.children.some(gc => gc.to === route.path)
      return false
    })
  }
  return false
}

function handleLogout() {
  auth.logout().then(() => {
    router.push('/login')
  })
}

// 路由变化时关闭移动端侧边栏
watch(() => route.path, () => {
  sidebarOpen.value = false
})
</script>

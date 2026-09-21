import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', redirect: '/home' },
      { path: 'home', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '首页' } },
      { path: 'products', name: 'products', component: () => import('@/views/products/ProductListView.vue'), meta: { title: '商品列表' } },
      { path: 'products/new', name: 'product-create', component: () => import('@/views/products/ProductFormView.vue'), meta: { title: '新增商品', requireAdmin: true } },
      { path: 'products/:id/edit', name: 'product-edit', component: () => import('@/views/products/ProductFormView.vue'), meta: { title: '编辑商品', requireAdmin: true } },
      { path: 'stock/in', name: 'stock-in', component: () => import('@/views/inventory/StockInView.vue'), meta: { title: '入库管理' } },
      { path: 'stock/out', name: 'stock-out', component: () => import('@/views/inventory/StockOutView.vue'), meta: { title: '出库管理' } },
      { path: 'stock/in-records', name: 'stock-in-records', component: () => import('@/views/inventory/StockInRecordsView.vue'), meta: { title: '入库记录' } },
      { path: 'stock/out-records', name: 'stock-out-records', component: () => import('@/views/inventory/StockOutRecordsView.vue'), meta: { title: '出库记录' } },
      { path: 'batch', name: 'batch', component: () => import('@/views/inventory/BatchView.vue'), meta: { title: '批量管理' } },
      { path: 'batch/:mode', name: 'batch-mode', component: () => import('@/views/inventory/BatchView.vue'), meta: { title: '批量管理' } },
      { path: 'stock', name: 'stock', component: () => import('@/views/stock/StockListView.vue'), meta: { title: '库存列表' } },
      { path: 'stock/query', name: 'stock-query', component: () => import('@/views/stock/StockQueryView.vue'), meta: { title: '库存查询' } },
      { path: 'suppliers', name: 'suppliers', component: () => import('@/views/parties/SupplierListView.vue'), meta: { title: '供应商管理', requireAdmin: true } },
      { path: 'suppliers/new', name: 'supplier-create', component: () => import('@/views/parties/SupplierListView.vue'), meta: { title: '新增供应商', openCreate: true, requireAdmin: true } },
      { path: 'customers', name: 'customers', component: () => import('@/views/parties/CustomerListView.vue'), meta: { title: '客户管理', requireAdmin: true } },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/dashboard/DashboardView.vue'), meta: { title: '看板大屏' } },
      { path: 'import', name: 'import', component: () => import('@/views/import/ImportView.vue'), meta: { title: '数据导入', requireAdmin: true } },
      { path: 'stocktaking', name: 'stocktaking', component: () => import('@/views/stocktaking/StocktakingView.vue'), meta: { title: '库存盘点', requireAdmin: true } },
      { path: 'users', name: 'users', component: () => import('@/views/settings/UserListView.vue'), meta: { title: '用户管理', requireAdmin: true } },
      { path: 'settings', name: 'settings', component: () => import('@/views/settings/SettingsView.vue'), meta: { title: '系统设置', requireAdmin: true } }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/home' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router

// 路由守卫 — 替代旧代码中 13 个文件重复的 checkLogin()
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // 首次导航时初始化认证状态
  if (!auth.initialized) {
    await auth.init()
  }

  // 公开路由（如登录页）
  if (to.meta.public) {
    if (auth.loggedIn && to.name === 'login') {
      return { name: 'home' }
    }
    return true
  }

  // 需要认证的路由
  if (!auth.loggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 管理员专属路由
  if (to.meta.requireAdmin && auth.role !== 'admin') {
    return { name: 'home' }
  }

  return true
})

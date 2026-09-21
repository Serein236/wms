<template>
  <div class="product-list-page">
    <!-- 页面头 -->
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-list-check me-2"></i>商品管理</h4>
        <p>查看、编辑、删除商品信息</p>
      </div>
      <router-link v-if="isAdmin" to="/products/new" class="btn btn-primary btn-sm">
        <i class="bi bi-plus-circle me-1"></i>新增商品
      </router-link>
    </div>

    <!-- 商品列表卡片 -->
    <div class="card">
      <div class="card-header">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-list-check"></i>
          <span>商品列表</span>
          <span v-if="total" class="badge bg-light text-muted">{{ total }}</span>
        </div>
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input
            v-model="searchQuery"
            type="text"
            class="form-control form-control-sm"
            placeholder="搜索商品名称..."
          >
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-responsive" v-if="!loading && products.length">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th width="50">ID</th>
              <th>商品编码</th>
              <th>商品名称</th>
              <th>规格</th>
              <th>装箱规格</th>
              <th width="60">单位</th>
              <th width="80">零售价</th>
              <th>生产厂家</th>
              <th width="70">库存</th>
              <th width="160">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id">
              <td class="text-muted">{{ p.id }}</td>
              <td>{{ p.product_code || '-' }}</td>
              <td class="fw-semibold">{{ p.name }}</td>
              <td>{{ p.spec || '-' }}</td>
              <td>{{ p.packing_spec || '-' }}</td>
              <td>{{ p.unit || '-' }}</td>
              <td>{{ p.retail_price ? '¥' + p.retail_price : '-' }}</td>
              <td>{{ p.manufacturer || '-' }}</td>
              <td>
                <span class="badge" :class="(p.stock || 0) < 10 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'">
                  {{ p.stock || 0 }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-info" @click="viewProduct(p)" title="详情">
                  <i class="bi bi-eye"></i>
                </button>
                <router-link v-if="isAdmin" :to="`/products/${p.id}/edit`" class="btn btn-sm btn-outline-primary ms-1" title="编辑">
                  <i class="bi bi-pencil"></i>
                </router-link>
                <button v-if="isAdmin" class="btn btn-sm btn-outline-danger ms-1" @click="confirmDelete(p)" title="删除">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
        <p class="mt-2 text-muted">加载中...</p>
      </div>

      <!-- 空状态 -->
      <EmptyState
        v-if="!loading && !products.length"
        icon="bi-inbox"
        title="暂无商品"
        desc="点击右上角「新增商品」添加"
      />

      <!-- 分页 -->
      <div class="card-footer" v-if="total > 0">
        <PaginationBar
          :page="page"
          :page-size="pageSize"
          :total="total"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 详情弹窗 -->
    <BaseModal v-model="showDetail" title="商品详情" size="lg">
      <div v-if="selectedProduct" class="row g-3">
        <div class="col-md-6"><label class="text-muted">商品编码</label><p class="fw-bold">{{ selectedProduct.product_code || '-' }}</p></div>
        <div class="col-md-6"><label class="text-muted">商品名称</label><p class="fw-bold">{{ selectedProduct.name || '-' }}</p></div>
        <div class="col-md-6"><label class="text-muted">规格</label><p>{{ selectedProduct.spec || '-' }}</p></div>
        <div class="col-md-6"><label class="text-muted">装箱规格</label><p>{{ selectedProduct.packing_spec || '-' }}</p></div>
        <div class="col-md-4"><label class="text-muted">单位</label><p>{{ selectedProduct.unit || '-' }}</p></div>
        <div class="col-md-4"><label class="text-muted">零售价</label><p>{{ selectedProduct.retail_price ? '¥' + selectedProduct.retail_price : '-' }}</p></div>
        <div class="col-md-4"><label class="text-muted">条形码</label><p>{{ selectedProduct.barcode || '-' }}</p></div>
        <div class="col-md-6"><label class="text-muted">生产厂家</label><p>{{ selectedProduct.manufacturer || '-' }}</p></div>
        <div class="col-md-3"><label class="text-muted">预警数量</label><p>{{ selectedProduct.warning_quantity ?? 10 }}</p></div>
        <div class="col-md-3"><label class="text-muted">危险数量</label><p>{{ selectedProduct.danger_quantity ?? 5 }}</p></div>
        <div class="col-md-6"><label class="text-muted">当前库存</label><p><span class="badge" :class="(selectedProduct.stock || 0) < 10 ? 'bg-danger' : 'bg-success'">{{ selectedProduct.stock || 0 }}</span></p></div>
      </div>
    </BaseModal>

    <!-- 删除确认 -->
    <ConfirmDialog ref="deleteConfirm" title="删除商品" type="danger" confirm-text="删除" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { productsApi } from '@/api/products'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { debounce } from '@/utils/formatters'
import BaseModal from '@/components/common/BaseModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'

const toast = useToast()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.role === 'admin')

const products = ref([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showDetail = ref(false)
const selectedProduct = ref(null)
const deleteConfirm = ref(null)

// 搜索防抖
const debouncedSearch = debounce(() => {
  page.value = 1
  loadProducts()
}, 300)

watch(searchQuery, debouncedSearch)

async function loadProducts() {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (searchQuery.value.trim()) params.query = searchQuery.value.trim()

    const res = await productsApi.list(params)

    // 兼容裸数组和 {success, data, pagination} 两种返回格式
    if (Array.isArray(res)) {
      products.value = res
      total.value = res.length
    } else if (res?.success && res.data) {
      products.value = res.data
      total.value = res.pagination?.total ?? res.data.length
    } else if (res?.data) {
      products.value = res.data
      total.value = res.pagination?.total ?? res.data.length
    } else {
      products.value = res || []
      total.value = products.value.length
    }
  } catch (e) {
    toast.error('加载商品失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function handlePageChange(p) {
  page.value = p
  loadProducts()
}

function handlePageSizeChange(size) {
  pageSize.value = size
  page.value = 1
  loadProducts()
}

function viewProduct(p) {
  selectedProduct.value = p
  showDetail.value = true
}

async function confirmDelete(p) {
  const ok = await deleteConfirm.value.open()
  if (!ok) return

  try {
    await productsApi.delete(p.id)
    toast.success('删除成功')
    loadProducts()
  } catch (e) {
    toast.error('删除失败: ' + e.message)
  }
}

onMounted(loadProducts)
</script>

<style scoped>
.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.page-toolbar h4 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
}

.page-toolbar p {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  margin: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-box {
  position: relative;
  width: 240px;
}

.search-box i {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary, #9ca3af);
  font-size: 14px;
}

.search-box input {
  padding-left: 30px;
}

.table td {
  font-size: 14px;
  vertical-align: middle;
}

.btn-sm {
  padding: 4px 8px;
}
</style>

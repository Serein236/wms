<template>
  <div class="stock-form-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-arrow-down-circle me-2"></i>入库管理</h4>
        <p>办理商品入库，记录入库方式和来源</p>
      </div>
      <router-link to="/stock/in-records" class="btn btn-outline-secondary btn-sm">
        <i class="bi bi-list-ul me-1"></i>查看入库记录
      </router-link>
    </div>

    <div class="row g-3">
      <!-- 表单区 -->
      <div class="col-md-7">
        <div class="card">
          <div class="card-header"><i class="bi bi-plus-circle me-2"></i>办理入库</div>
          <div class="card-body">
            <form @submit.prevent="handleSubmit">
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label">选择商品 <span class="text-danger">*</span></label>
                  <div class="input-group">
                    <select v-model="form.product_id" class="form-select" required @change="onProductChange">
                      <option value="">请选择商品</option>
                      <option v-for="p in products" :key="p.id" :value="p.id">
                        {{ p.product_code }} - {{ p.name }} (库存: {{ p.stock || 0 }})
                      </option>
                    </select>
                    <button type="button" class="btn btn-outline-primary" @click="showScanner = true" title="条码扫描">
                      <i class="bi bi-upc-scan"></i> 扫码
                    </button>
                  </div>
                </div>

                <div class="col-md-6">
                  <label class="form-label">入库方式 <span class="text-danger">*</span></label>
                  <select v-model="form.stock_method_name" class="form-select" required>
                    <option value="">请选择入库方式</option>
                    <option v-for="m in stockMethods" :key="m" :value="m">{{ m }}</option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label">产品批号 <span class="text-danger">*</span></label>
                  <input v-model="form.batch_number" type="text" class="form-control" required placeholder="请输入产品批号">
                </div>

                <div class="col-md-6">
                  <label class="form-label">生产日期 <span class="text-danger">*</span></label>
                  <input v-model="form.production_date" type="date" class="form-control" required>
                </div>

                <div class="col-md-6">
                  <label class="form-label">过期日期 <span class="text-danger">*</span></label>
                  <input v-model="form.expiration_date" type="date" class="form-control" required>
                </div>

                <div class="col-md-4">
                  <label class="form-label">入库数量 <span class="text-danger">*</span></label>
                  <input v-model.number="form.quantity" type="number" class="form-control" min="1" required placeholder="数量" @input="calcTotal">
                </div>

                <div class="col-md-4">
                  <label class="form-label">入库单价 <span class="text-danger">*</span></label>
                  <input v-model.number="form.unit_price" type="number" class="form-control" min="0" step="0.01" required placeholder="单价" @input="calcTotal">
                </div>

                <div class="col-md-4">
                  <label class="form-label">总金额</label>
                  <input :value="form.total_amount" type="number" class="form-control" readonly>
                </div>

                <div class="col-md-6">
                  <label class="form-label">入库日期 <span class="text-danger">*</span></label>
                  <input v-model="form.recorded_date" type="date" class="form-control" required>
                </div>

                <div class="col-md-6">
                  <label class="form-label">供应商名称</label>
                  <input v-model="form.source" type="text" class="form-control" placeholder="输入供应商名称">
                </div>

                <div class="col-12">
                  <label class="form-label">备注</label>
                  <textarea v-model="form.remark" class="form-control" rows="2" placeholder="可选填写"></textarea>
                </div>

                <div class="col-12">
                  <button type="submit" class="btn btn-primary" :disabled="submitting">
                    <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
                    <i v-else class="bi bi-check-circle me-1"></i>
                    {{ submitting ? '提交中...' : '提交入库' }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- 商品信息面板 -->
      <div class="col-md-5">
        <div class="card">
          <div class="card-header"><i class="bi bi-info-circle me-2"></i>商品信息</div>
          <div class="card-body">
            <div v-if="!selectedProduct" class="text-center py-4 text-muted">
              <i class="bi bi-box-seam" style="font-size: 32px;"></i>
              <p class="mt-2 mb-0">请选择商品以查看详细信息</p>
            </div>
            <div v-else class="row g-2">
              <div class="col-6"><label class="text-muted small">商品编码</label><p class="fw-bold">{{ selectedProduct.product_code || '-' }}</p></div>
              <div class="col-6"><label class="text-muted small">商品名称</label><p class="fw-bold">{{ selectedProduct.name }}</p></div>
              <div class="col-6"><label class="text-muted small">规格</label><p>{{ selectedProduct.spec || '-' }}</p></div>
              <div class="col-6"><label class="text-muted small">单位</label><p>{{ selectedProduct.unit || '-' }}</p></div>
              <div class="col-6"><label class="text-muted small">装箱规格</label><p>{{ selectedProduct.packing_spec || '-' }}</p></div>
              <div class="col-6"><label class="text-muted small">当前库存</label><p><span class="badge" :class="(selectedProduct.stock || 0) < 10 ? 'bg-danger' : 'bg-success'">{{ selectedProduct.stock || 0 }}</span></p></div>
              <div class="col-6"><label class="text-muted small">预警数量</label><p>{{ selectedProduct.warning_quantity ?? 10 }}</p></div>
              <div class="col-6"><label class="text-muted small">危险数量</label><p>{{ selectedProduct.danger_quantity ?? 5 }}</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <BarcodeScanner v-model="showScanner" @detected="onBarcodeDetected" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { productsApi } from '@/api/products'
import { inventoryApi } from '@/api/inventory'
import BarcodeScanner from '@/components/common/BarcodeScanner.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const products = ref([])
const stockMethods = ref([])
const submitting = ref(false)
const showScanner = ref(false)

const form = ref({
  product_id: '',
  stock_method_name: '',
  batch_number: '',
  production_date: '',
  expiration_date: '',
  quantity: null,
  unit_price: null,
  total_amount: 0,
  recorded_date: '',
  source: '',
  remark: ''
})

const selectedProduct = computed(() => {
  return products.value.find(p => p.id == form.value.product_id) || null
})

function onProductChange() {
  // 触发 computed 更新
}

function onBarcodeDetected(product) {
  // 商品已在列表中则直接选中；否则补充进列表再选中
  const exists = products.value.some(p => p.id == product.id)
  if (!exists) {
    products.value.unshift(product)
  }
  form.value.product_id = product.id
  toast.success('已选中: ' + product.name)
}

function calcTotal() {
  const q = Number(form.value.quantity) || 0
  const p = Number(form.value.unit_price) || 0
  form.value.total_amount = parseFloat((q * p).toFixed(2))
}

async function handleSubmit() {
  submitting.value = true
  try {
    await inventoryApi.createIn(form.value)
    toast.success('入库成功')
    // 重置表单但保留日期
    const today = form.value.recorded_date
    form.value = {
      product_id: '',
      stock_method_name: '',
      batch_number: '',
      production_date: '',
      expiration_date: '',
      quantity: null,
      unit_price: null,
      total_amount: 0,
      recorded_date: today,
      source: '',
      remark: ''
    }
  } catch (e) {
    toast.error('入库失败: ' + e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  // 设置默认日期
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  form.value.recorded_date = `${y}-${m}-${d}`
  form.value.production_date = `${y}-${m}-${d}`
  form.value.expiration_date = `${y + 1}-${m}-${d}`

  // 加载商品列表
  try {
    const res = await productsApi.list()
    products.value = Array.isArray(res) ? res : (res?.data || [])
  } catch (e) {
    toast.error('加载商品列表失败')
  }

  // 加载入库方式
  try {
    const res = await inventoryApi.getStockMethods({ type: 'in' })
    const methods = Array.isArray(res) ? res : (res?.data || [])
    stockMethods.value = methods
  } catch (e) {
    // 降级为默认值
    stockMethods.value = ['采购入库', '退货入库', '调拨入库', '生产入库', '其他入库']
  }
})
</script>

<style scoped>
.page-toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.form-label { font-weight: 600; font-size: 14px; }
</style>

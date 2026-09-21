<template>
  <div class="stock-form-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-arrow-up-circle me-2"></i>出库管理</h4>
        <p>办理商品出库，记录出库方式和去向</p>
      </div>
      <router-link to="/stock/out-records" class="btn btn-outline-secondary btn-sm">
        <i class="bi bi-list-ul me-1"></i>查看出库记录
      </router-link>
    </div>

    <div class="row g-3">
      <div class="col-md-7">
        <div class="card">
          <div class="card-header"><i class="bi bi-plus-circle me-2"></i>办理出库</div>
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
                  <label class="form-label">出库方式 <span class="text-danger">*</span></label>
                  <select v-model="form.stock_method_name" class="form-select" required>
                    <option value="">请选择出库方式</option>
                    <option v-for="m in stockMethods" :key="m" :value="m">{{ m }}</option>
                  </select>
                </div>

                <div class="col-md-6" v-if="batches.length">
                  <label class="form-label">选择批次</label>
                  <select v-model="form.batch_number" class="form-select">
                    <option value="">请选择批次</option>
                    <option v-for="b in batches" :key="b.batch_number" :value="b.batch_number">
                      {{ b.batch_number }} (余: {{ b.current_stock }})
                    </option>
                  </select>
                </div>

                <div class="col-md-4">
                  <label class="form-label">出库数量 <span class="text-danger">*</span></label>
                  <input v-model.number="form.quantity" type="number" class="form-control" min="1" max="99999999" required placeholder="数量" @input="calcTotal">
                </div>

                <div class="col-md-4">
                  <label class="form-label">出库单价 <span class="text-danger">*</span></label>
                  <input v-model.number="form.unit_price" type="number" class="form-control" min="0" step="0.01" required placeholder="单价" @input="calcTotal">
                </div>

                <div class="col-md-4">
                  <label class="form-label">总金额</label>
                  <input :value="form.total_amount" type="number" class="form-control" readonly>
                </div>

                <div class="col-md-6">
                  <label class="form-label">出库日期 <span class="text-danger">*</span></label>
                  <input v-model="form.recorded_date" type="date" class="form-control" required>
                </div>

                <div class="col-md-6">
                  <label class="form-label">客户名称</label>
                  <input v-model="form.destination" type="text" class="form-control" placeholder="输入客户名称" list="customerOptions" @input="onCustomerInput">
                  <datalist id="customerOptions">
                    <option v-for="c in customerSuggestions" :key="c.id" :value="c.name"></option>
                  </datalist>
                </div>

                <div class="col-12">
                  <label class="form-label">备注</label>
                  <textarea v-model="form.remark" class="form-control" rows="2" placeholder="可选填写"></textarea>
                </div>

                <div class="col-12">
                  <button type="submit" class="btn btn-primary" :disabled="submitting">
                    <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
                    <i v-else class="bi bi-check-circle me-1"></i>
                    {{ submitting ? '提交中...' : '提交出库' }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

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
              <div class="col-6"><label class="text-muted small">当前库存</label><p><span class="badge" :class="(selectedProduct.stock || 0) < 10 ? 'bg-danger' : 'bg-success'">{{ selectedProduct.stock || 0 }}</span></p></div>
              <div class="col-6"><label class="text-muted small">装箱规格</label><p>{{ selectedProduct.packing_spec || '-' }}</p></div>
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
import { customersApi } from '@/api/customers'
import { debounce } from '@/utils/formatters'
import BarcodeScanner from '@/components/common/BarcodeScanner.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const products = ref([])
const stockMethods = ref([])
const batches = ref([])
const submitting = ref(false)
const showScanner = ref(false)
const customerSuggestions = ref([])

const form = ref({
  product_id: '',
  stock_method_name: '',
  batch_number: '',
  quantity: null,
  unit_price: null,
  total_amount: 0,
  recorded_date: '',
  destination: '',
  remark: ''
})

const searchCustomers = debounce(async (kw) => {
  if (!kw || kw.trim().length < 1) {
    customerSuggestions.value = []
    return
  }
  try {
    customerSuggestions.value = await customersApi.searchNormalized(kw.trim())
  } catch (e) {
    customerSuggestions.value = []
  }
}, 300)

function onCustomerInput(e) {
  searchCustomers(e.target.value)
}

const selectedProduct = computed(() => {
  return products.value.find(p => p.id == form.value.product_id) || null
})

async function onProductChange() {
  batches.value = []
  form.value.batch_number = ''
  if (!form.value.product_id) return

  // 加载该商品的批次
  try {
    const res = await inventoryApi.getProductBatches(form.value.product_id)
    batches.value = Array.isArray(res) ? res : (res?.data || [])
  } catch (e) {
    // 忽略
  }
}

async function onBarcodeDetected(product) {
  const exists = products.value.some(p => p.id == product.id)
  if (!exists) {
    products.value.unshift(product)
  }
  form.value.product_id = product.id
  await onProductChange()
  toast.success('已选中: ' + product.name)
}

function calcTotal() {
  const q = Number(form.value.quantity) || 0
  const p = Number(form.value.unit_price) || 0
  form.value.total_amount = parseFloat((q * p).toFixed(2))
}

async function handleSubmit() {
  const qty = Number(form.value.quantity)
  if (!Number.isInteger(qty) || qty <= 0 || qty > 99999999) {
    toast.warning('出库数量必须是 1~99999999 的正整数')
    return
  }
  const batch = batches.value.find(b => b.batch_number === form.value.batch_number)
  if (batch && qty > Number(batch.current_stock)) {
    toast.warning(`出库数量不能超过该批次余量（${batch.current_stock}）`)
    return
  }

  submitting.value = true
  try {
    await inventoryApi.createOut(form.value)
    toast.success('出库成功')
    const today = form.value.recorded_date
    form.value = {
      product_id: '',
      stock_method_name: '',
      batch_number: '',
      quantity: null,
      unit_price: null,
      total_amount: 0,
      recorded_date: today,
      destination: '',
      remark: ''
    }
    customerSuggestions.value = []
    batches.value = []
  } catch (e) {
    toast.error('出库失败: ' + e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  form.value.recorded_date = `${y}-${m}-${d}`

  try {
    const res = await productsApi.list()
    products.value = Array.isArray(res) ? res : (res?.data || [])
  } catch (e) {
    toast.error('加载商品列表失败')
  }

  try {
    const res = await inventoryApi.getStockMethods({ type: 'out' })
    stockMethods.value = Array.isArray(res) ? res : (res?.data || [])
  } catch (e) {
    stockMethods.value = ['销售出库', '调拨出库', '报损出库', '样品出库', '其他出库', '盘点出库']
  }
})
</script>

<style scoped>
.page-toolbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.form-label { font-weight: 600; font-size: 14px; }
</style>

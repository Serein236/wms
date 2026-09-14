<template>
  <div class="product-form-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi me-2" :class="isEdit ? 'bi-pencil-square' : 'bi-plus-circle'"></i>{{ isEdit ? '编辑商品' : '新增商品' }}</h4>
        <p>{{ isEdit ? '修改商品信息' : '添加新商品信息' }}</p>
      </div>
      <router-link to="/products" class="btn btn-outline-secondary btn-sm">
        <i class="bi bi-arrow-left me-1"></i>返回列表
      </router-link>
    </div>

    <div class="card">
      <div class="card-header">
        <i class="bi me-2" :class="isEdit ? 'bi-pencil-square' : 'bi-plus-circle'"></i>
        {{ isEdit ? '编辑商品信息' : '添加新商品' }}
      </div>
      <div class="card-body">
        <form @submit.prevent="handleSubmit">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">商品名称 <span class="text-danger">*</span></label>
              <input v-model="form.name" type="text" class="form-control" required placeholder="商品名称">
            </div>
            <div class="col-md-3">
              <label class="form-label">规格</label>
              <input v-model="form.spec" type="text" class="form-control" placeholder="规格">
            </div>
            <div class="col-md-3">
              <label class="form-label">装箱规格</label>
              <input v-model="form.packing_spec" type="text" class="form-control" placeholder="装箱规格">
            </div>
            <div class="col-md-2">
              <label class="form-label">单位</label>
              <input v-model="form.unit" type="text" class="form-control" placeholder="个/箱">
            </div>
            <div class="col-md-2">
              <label class="form-label">零售价</label>
              <input v-model="form.retail_price" type="number" step="0.01" class="form-control" placeholder="0.00">
            </div>
            <div class="col-md-3">
              <label class="form-label">条形码</label>
              <input v-model="form.barcode" type="text" class="form-control" placeholder="条形码">
            </div>
            <div class="col-md-4">
              <label class="form-label">生产厂家</label>
              <input v-model="form.manufacturer" type="text" class="form-control" placeholder="厂家">
            </div>
            <div class="col-md-2">
              <label class="form-label">预警数量</label>
              <input v-model.number="form.warning_quantity" type="number" class="form-control" placeholder="10">
            </div>
            <div class="col-md-2">
              <label class="form-label">危险数量</label>
              <input v-model.number="form.danger_quantity" type="number" class="form-control" placeholder="5">
            </div>
          </div>

          <div class="mt-4 d-flex gap-2">
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check-circle me-1"></i>
              {{ submitting ? '保存中...' : (isEdit ? '保存修改' : '添加商品') }}
            </button>
            <router-link to="/products" class="btn btn-outline-secondary">取消</router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productsApi } from '@/api/products'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)

const form = ref({
  name: '',
  spec: '',
  packing_spec: '',
  unit: '',
  retail_price: null,
  barcode: null,
  manufacturer: null,
  warning_quantity: 10,
  danger_quantity: 5
})

async function loadProduct() {
  if (!isEdit.value) return
  try {
    const res = await productsApi.getById(route.params.id)
    const data = res?.data || res
    Object.assign(form.value, data)
  } catch (e) {
    toast.error('加载商品失败: ' + e.message)
    router.push('/products')
  }
}

async function handleSubmit() {
  if (!form.value.name) return
  submitting.value = true
  try {
    if (isEdit.value) {
      await productsApi.update(route.params.id, form.value)
      toast.success('修改成功')
    } else {
      await productsApi.create(form.value)
      toast.success('添加成功')
    }
    router.push('/products')
  } catch (e) {
    toast.error('操作失败: ' + e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(loadProduct)
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

.form-label {
  font-weight: 600;
  font-size: 14px;
}
</style>

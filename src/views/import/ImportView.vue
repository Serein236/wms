<template>
  <div class="import-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-upload me-2"></i>数据导入</h4>
        <p>支持 Excel 和 CSV 文件批量导入商品数据</p>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header"><i class="bi bi-cloud-arrow-up me-2"></i>上传文件</div>
          <div class="card-body">
            <div
              class="upload-zone"
              :class="{ dragover: isDragging }"
              @click="triggerFileInput"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
            >
              <i class="bi bi-cloud-arrow-up upload-icon"></i>
              <h5>拖拽文件到此处或点击选择</h5>
              <p class="text-muted">支持 .xlsx, .xls, .csv 格式，最大 10MB</p>
              <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" class="d-none" @change="handleFileSelect">
              <button class="btn btn-primary mt-2">
                <i class="bi bi-folder2-open me-1"></i>选择文件
              </button>
            </div>

            <div v-if="selectedFile" class="mt-3">
              <div class="alert alert-info d-flex justify-content-between align-items-center">
                <span><i class="bi bi-file-earmark-excel me-2"></i>{{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})</span>
                <button class="btn btn-sm btn-outline-danger" @click="clearFile"><i class="bi bi-x"></i></button>
              </div>
              <button class="btn btn-success w-100" @click="startImport" :disabled="importing">
                <span v-if="importing" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-cloud-arrow-up me-1"></i>
                {{ importing ? '导入中...' : '开始导入' }}
              </button>
            </div>

            <div v-if="importResult" class="mt-3">
              <div class="alert" :class="resultAlertClass">
                <i class="bi me-1" :class="resultIcon"></i>
                {{ importResult.message }}
                <div class="mt-1 small">
                  共 {{ importResult.total }} 条，成功 {{ importResult.imported }} 条，跳过/失败 {{ importResult.skipped }} 条
                </div>
                <ul v-if="importResult.errors && importResult.errors.length" class="mb-0 mt-1 small ps-3">
                  <li v-for="(err, i) in importResult.errors" :key="i">{{ err }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card mb-3">
          <div class="card-header"><i class="bi bi-info-circle me-2"></i>导入说明</div>
          <div class="card-body">
            <h6 class="fw-bold">必填字段</h6>
            <ul class="list-unstyled text-muted">
              <li><code>name</code> — 商品名称</li>
            </ul>
            <h6 class="fw-bold">可选字段</h6>
            <ul class="list-unstyled text-muted">
              <li><code>spec</code> — 规格</li>
              <li><code>unit</code> — 单位</li>
              <li><code>retail_price</code> — 零售价</li>
              <li><code>barcode</code> — 条形码</li>
              <li><code>manufacturer</code> — 生产厂家</li>
              <li><code>packing_spec</code> — 装箱规格</li>
            </ul>
          </div>
        </div>
        <button class="btn btn-outline-primary w-100" @click="downloadTemplate">
          <i class="bi bi-download me-1"></i>下载导入模板
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { importApi } from '@/api/import'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const fileInput = ref(null)
const selectedFile = ref(null)
const isDragging = ref(false)
const importing = ref(false)
const importResult = ref(null)

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (file) selectedFile.value = file
  e.target.value = ''
}

function handleDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) selectedFile.value = file
}

function clearFile() {
  selectedFile.value = null
  importResult.value = null
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

async function startImport() {
  if (!selectedFile.value) return
  importing.value = true
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const res = await importApi.importProducts(formData)
    const imported = Number(res?.imported ?? 0)
    const skipped = Number(res?.skipped ?? 0)
    const total = Number(res?.total ?? imported + skipped)
    const errors = Array.isArray(res?.errors) ? res.errors : []

    let status = 'success'
    let message = `导入完成，成功 ${imported} 条`
    if (imported > 0 && skipped > 0) {
      status = 'warning'
      message = `部分导入成功：成功 ${imported} 条，跳过/失败 ${skipped} 条`
    } else if (imported === 0) {
      status = 'danger'
      message = '导入失败，没有成功导入任何商品'
    }

    importResult.value = { status, message, imported, skipped, total, errors }

    if (status === 'success') toast.success(message)
    else if (status === 'warning') toast.warning(message)
    else toast.error(message)
  } catch (e) {
    importResult.value = {
      status: 'danger',
      message: '导入失败: ' + e.message,
      imported: 0, skipped: 0, total: 0, errors: []
    }
    toast.error('导入失败: ' + e.message)
  } finally {
    importing.value = false
  }
}

const resultAlertClass = computed(() => {
  const status = importResult.value?.status
  if (status === 'success') return 'alert-success'
  if (status === 'warning') return 'alert-warning'
  return 'alert-danger'
})

const resultIcon = computed(() => {
  const status = importResult.value?.status
  if (status === 'success') return 'bi-check-circle'
  if (status === 'warning') return 'bi-exclamation-triangle'
  return 'bi-x-circle'
})

async function downloadTemplate() {
  try {
    const res = await importApi.getTemplate()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '商品导入模板.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    toast.error('下载模板失败')
  }
}
</script>

<style scoped>
.page-toolbar { margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }

.upload-zone {
  border: 3px dashed var(--border-medium, #e5e7eb);
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-zone:hover, .upload-zone.dragover {
  border-color: var(--brand-400, #2dd4bf);
  background: var(--brand-50, #f0fdfa);
}

.upload-icon {
  display: block;
  font-size: 3rem;
  color: var(--text-tertiary, #9ca3af);
  margin-bottom: 12px;
}

.upload-zone h5 {
  font-size: 16px;
  font-weight: 600;
}

code {
  background: var(--bg-light, #f5f5f5);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--brand-600, #0f766e);
}
</style>

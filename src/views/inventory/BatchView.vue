<template>
  <div class="batch-page">
    <div class="page-toolbar">
      <div class="page-toolbar-info">
        <h4><i class="bi bi-list-columns me-2"></i>批量管理</h4>
        <p>批量入库/出库操作</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <ul class="nav nav-tabs card-header-tabs">
          <li class="nav-item">
            <button class="nav-link" :class="{ active: mode === 'in' }" @click="switchMode('in')">
              <i class="bi bi-arrow-down-circle me-1"></i>批量入库
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link" :class="{ active: mode === 'out' }" @click="switchMode('out')">
              <i class="bi bi-arrow-up-circle me-1"></i>批量出库
            </button>
          </li>
        </ul>
      </div>
      <div class="card-body">
        <div class="mb-3 d-flex gap-2 flex-wrap">
          <button class="btn btn-outline-success btn-sm" @click="addRow">
            <i class="bi bi-plus-circle me-1"></i>添加一行
          </button>
          <button class="btn btn-outline-primary btn-sm" @click="downloadTemplate">
            <i class="bi bi-download me-1"></i>下载模板
          </button>
          <label class="btn btn-outline-secondary btn-sm mb-0">
            <i class="bi bi-upload me-1"></i>导入Excel
            <input type="file" accept=".xlsx,.xls" @change="handleFileUpload" hidden>
          </label>
        </div>

        <div class="table-responsive">
          <table class="table table-bordered table-sm">
            <thead>
              <tr>
                <th width="40">#</th>
                <th>商品名称 <span class="text-danger">*</span></th>
                <th width="100">批号</th>
                <th width="120" v-if="mode === 'in'">生产日期</th>
                <th width="120" v-if="mode === 'in'">过期日期</th>
                <th width="80">数量 <span class="text-danger">*</span></th>
                <th width="90">单价</th>
                <th width="100">{{ mode === 'in' ? '供应商' : '客户' }}</th>
                <th width="60">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in rows" :key="idx">
                <td class="text-center text-muted">{{ idx + 1 }}</td>
                <td>
                  <input v-model="row.name" type="text" class="form-control form-control-sm" placeholder="商品名称">
                </td>
                <td>
                  <input v-model="row.batch_number" type="text" class="form-control form-control-sm" placeholder="批号">
                </td>
                <td v-if="mode === 'in'">
                  <input v-model="row.production_date" type="date" class="form-control form-control-sm">
                </td>
                <td v-if="mode === 'in'">
                  <input v-model="row.expiration_date" type="date" class="form-control form-control-sm">
                </td>
                <td>
                  <input v-model.number="row.quantity" type="number" class="form-control form-control-sm" min="1">
                </td>
                <td>
                  <input v-model.number="row.unit_price" type="number" class="form-control form-control-sm" step="0.01">
                </td>
                <td>
                  <input v-model="row.source" type="text" class="form-control form-control-sm" :placeholder="mode === 'in' ? '供应商' : '客户'">
                </td>
                <td class="text-center">
                  <button class="btn btn-sm btn-outline-danger" @click="removeRow(idx)" :disabled="rows.length <= 1">
                    <i class="bi bi-dash-circle"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <span class="text-muted small">共 {{ rows.length }} 条记录</span>
          <button class="btn btn-primary" @click="submitBatch" :disabled="submitting">
            <span v-if="submitting" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-check-circle me-1"></i>
            {{ submitting ? '提交中...' : `批量${mode === 'in' ? '入库' : '出库'}` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { inventoryApi } from '@/api/inventory'
import { batchApi } from '@/api/batch'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const mode = ref(route.params.mode === 'out' ? 'out' : 'in')
const rows = ref([])
const submitting = ref(false)

function createEmptyRow() {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return {
    name: '',
    batch_number: '',
    production_date: `${y}-${m}-${d}`,
    expiration_date: `${y + 1}-${m}-${d}`,
    quantity: null,
    unit_price: null,
    source: ''
  }
}

function addRow() {
  rows.value.push(createEmptyRow())
}

function removeRow(idx) {
  rows.value.splice(idx, 1)
}

function switchMode(m) {
  mode.value = m
  router.replace(`/batch/${m}`)
}

function downloadTemplate() {
  const headers = mode.value === 'in'
    ? ['商品名称', '批号', '生产日期', '过期日期', '数量', '单价', '供应商']
    : ['商品名称', '批号', '数量', '单价', '客户']
  const csv = '\uFEFF' + headers.join(',') + '\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `批量${mode.value === 'in' ? '入库' : '出库'}模板.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function handleFileUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  // 动态导入 xlsx 库
  import('xlsx').then(XLSX => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws)
        rows.value = json.map(r => ({
          name: r['商品名称'] || r.name || '',
          batch_number: r['批号'] || r.batch_number || '',
          production_date: r['生产日期'] || '',
          expiration_date: r['过期日期'] || '',
          quantity: Number(r['数量']) || null,
          unit_price: Number(r['单价']) || null,
          source: r['供应商'] || r['客户'] || r['source'] || ''
        }))
        toast.success(`导入 ${rows.value.length} 条记录`)
      } catch (err) {
        toast.error('文件解析失败')
      }
    }
    reader.readAsArrayBuffer(file)
  }).catch(() => {
    toast.error('Excel 库加载失败')
  })
  e.target.value = ''
}

async function submitBatch() {
  const valid = rows.value.filter(r => r.name && r.quantity)
  if (!valid.length) {
    toast.warning('请至少填写一条有效记录（商品名称和数量必填）')
    return
  }

  submitting.value = true
  try {
    const stockMethod = mode.value === 'in' ? '采购入库' : '销售出库'
    const payload = {
      records: valid.map(r => ({ ...r, stock_method_name: stockMethod })),
      type: mode.value
    }

    if (mode.value === 'in') {
      await batchApi.batchIn(payload)
    } else {
      await batchApi.batchOut(payload)
    }

    toast.success(`批量${mode.value === 'in' ? '入库' : '出库'}成功，共 ${valid.length} 条`)
    rows.value = [createEmptyRow()]
  } catch (e) {
    toast.error('批量操作失败: ' + e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  rows.value = [createEmptyRow(), createEmptyRow(), createEmptyRow()]
})
</script>

<style scoped>
.page-toolbar { margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.table td { vertical-align: middle; }
</style>

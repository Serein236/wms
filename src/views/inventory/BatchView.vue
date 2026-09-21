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
                <th width="120">批号 <span class="text-danger">*</span></th>
                <th width="120" v-if="mode === 'in'">生产日期</th>
                <th width="120" v-if="mode === 'in'">过期日期</th>
                <th width="90">数量 <span class="text-danger">*</span></th>
                <th width="90">单价</th>
                <th width="100">{{ mode === 'in' ? '供应商' : '客户' }}</th>
                <th width="60">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in rows" :key="idx">
                <td class="text-center text-muted">{{ idx + 1 }}</td>
                <td>
                  <input v-model="row.name" type="text" class="form-control form-control-sm" placeholder="商品名称" list="batchProductOptions">
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
                  <input v-model.number="row.quantity" type="number" class="form-control form-control-sm" min="1" max="99999999">
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

        <datalist id="batchProductOptions">
          <option v-for="p in products" :key="p.id" :value="p.name"></option>
        </datalist>

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
import { productsApi } from '@/api/products'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const mode = ref(route.params.mode === 'out' ? 'out' : 'in')
const rows = ref([])
const submitting = ref(false)
const products = ref([])

async function loadProducts() {
  try {
    const res = await productsApi.list({ page: 1, pageSize: 1000 })
    products.value = Array.isArray(res) ? res : (res?.data || [])
  } catch (e) {
    // 联想失败不阻塞手工输入（后端仍会按名称兜底解析）
  }
}

function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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
  import('xlsx').then(mod => {
    const XLSX = mod.default || mod
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws)
        const formatDateCell = (v) => {
          if (v === undefined || v === null || v === '') return ''
          if (v instanceof Date && !Number.isNaN(v.getTime())) {
            return v.toISOString().slice(0, 10)
          }
          return String(v)
        }
        rows.value = json.map(r => ({
          name: r['商品名称'] || r.name || '',
          batch_number: r['批号'] || r.batch_number || '',
          production_date: formatDateCell(r['生产日期'] ?? r.production_date),
          expiration_date: formatDateCell(r['过期日期'] ?? r.expiration_date),
          quantity: Number(r['数量'] ?? r.quantity) || null,
          unit_price: Number(r['单价'] ?? r.unit_price) || null,
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
  // 仅保留名称或数量非空的行
  const filled = rows.value.filter(r => (r.name && String(r.name).trim()) || r.quantity)

  if (!filled.length) {
    toast.warning('请至少填写一条有效记录（商品名称、批号、数量必填）')
    return
  }

  // 名称 -> id 映射（trim 精确匹配）
  const nameToId = new Map(products.value.map(p => [String(p.name).trim(), p.id]))

  for (let i = 0; i < filled.length; i++) {
    const r = filled[i]
    const name = String(r.name || '').trim()
    const qty = Number(r.quantity)
    const batch = String(r.batch_number || '').trim()
    if (!name) { toast.error(`第 ${i + 1} 行请填写商品名称`); return }
    if (!nameToId.has(name)) { toast.error(`第 ${i + 1} 行商品「${name}」不存在，请从下拉列表选择`); return }
    if (!batch) { toast.error(`第 ${i + 1} 行请填写批号`); return }
    if (!Number.isInteger(qty) || qty <= 0 || qty > 99999999) {
      toast.error(`第 ${i + 1} 行数量必须是 1~99999999 的正整数`)
      return
    }
  }

  const today = isoDate(new Date())
  const nextYear = isoDate(new Date(Date.now() + 365 * 24 * 3600 * 1000))
  const stockMethod = mode.value === 'in' ? '采购入库' : '销售出库'
  const partyKey = mode.value === 'in' ? 'source' : 'destination'

  const items = filled.map(r => {
    const qty = Number(r.quantity)
    const price = Number(r.unit_price) || 0
    const item = {
      product_id: nameToId.get(String(r.name).trim()),
      name: String(r.name).trim(),
      stock_method_name: stockMethod,
      batch_number: String(r.batch_number).trim(),
      quantity: qty,
      unit_price: price,
      total_amount: parseFloat((qty * price).toFixed(2)),
      [partyKey]: r.source ? String(r.source).trim() : ''
    }
    if (mode.value === 'in') {
      item.production_date = r.production_date || today
      item.expiration_date = r.expiration_date || nextYear
    }
    return item
  })

  const payload = { items, recorded_date: today }

  submitting.value = true
  try {
    const res = mode.value === 'in' ? await batchApi.batchIn(payload) : await batchApi.batchOut(payload)
    const successCount = Number(res?.successCount ?? 0)
    const failCount = Number(res?.failCount ?? 0)
    const errors = Array.isArray(res?.errors) ? res.errors : []
    if (failCount === 0) {
      toast.success(`批量${mode.value === 'in' ? '入库' : '出库'}成功，共 ${successCount} 条`)
      rows.value = [createEmptyRow(), createEmptyRow(), createEmptyRow()]
    } else if (successCount > 0) {
      toast.warning(`部分成功：成功 ${successCount} 条，失败 ${failCount} 条。` + (errors[0] ? '如：' + errors[0] : ''))
    } else {
      toast.error('批量操作全部失败：' + (errors[0] || '请检查数据'))
    }
  } catch (e) {
    toast.error('批量操作失败: ' + e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadProducts()
  rows.value = [createEmptyRow(), createEmptyRow(), createEmptyRow()]
})
</script>

<style scoped>
.page-toolbar { margin-bottom: 16px; }
.page-toolbar h4 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.page-toolbar p { font-size: 13px; color: var(--text-secondary, #6b7280); margin: 0; }
.table td { vertical-align: middle; }
</style>

<template>
  <BaseModal :model-value="modelValue" title="条码扫描" size="lg" @update:model-value="v => $emit('update:modelValue', v)" @close="stopScanner">
    <div ref="scannerContainer" class="scanner-container"></div>

    <div class="mt-3">
      <div class="input-group">
        <span class="input-group-text">手动输入</span>
        <input v-model="manualCode" type="text" class="form-control" placeholder="输入或扫描条码" @keyup.enter="searchByBarcode(manualCode)">
        <button class="btn btn-primary" @click="searchByBarcode(manualCode)">
          <i class="bi bi-search me-1"></i>搜索
        </button>
      </div>
    </div>

    <div v-if="resultMessage" class="mt-3" :class="resultClass">
      <i :class="resultSuccess ? 'bi bi-check-circle me-2' : 'bi bi-exclamation-triangle me-2'"></i>{{ resultMessage }}
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { productsApi } from '@/api/products'
import { ApiError } from '@/api/http'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'detected'])

const scannerContainer = ref(null)
const manualCode = ref('')
const resultMessage = ref('')
const resultSuccess = ref(false)

let Quagga = null
let running = false
let searching = false

const resultClass = ref('alert alert-success mt-3')

async function startScanner() {
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
    resultMessage.value = '当前浏览器不支持摄像头，请使用手动输入'
    resultSuccess.value = false
    resultClass.value = 'alert alert-warning mt-3'
    return
  }
  try {
    if (!Quagga) {
      // Quagga 体积较大，按需动态加载，不进主包
      Quagga = (await import('quagga')).default
      // 只注册一次检测回调（重复注册会导致一次扫码触发多次查询）
      Quagga.onDetected((r) => {
        if (!running) return
        if (!r || !r.codeResult || !r.codeResult.code) return
        manualCode.value = r.codeResult.code
        searchByBarcode(r.codeResult.code)
      })
    }
  } catch (e) {
    resultMessage.value = '条码扫描组件加载失败，请使用手动输入'
    resultSuccess.value = false
    resultClass.value = 'alert alert-warning mt-3'
    return
  }

  // 弹窗可能在动态加载期间已被关闭
  if (!props.modelValue) return

  Quagga.init(
    {
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: scannerContainer.value,
        constraints: { facingMode: 'environment' }
      },
      decoder: {
        readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'code_39_reader', 'upc_reader', 'upc_e_reader']
      }
    },
    (err) => {
      if (err) {
        resultMessage.value = '摄像头初始化失败: ' + (err.name === 'NotAllowedError' ? '已拒绝摄像头权限' : err.message || err)
        resultSuccess.value = false
        resultClass.value = 'alert alert-warning mt-3'
        return
      }
      Quagga.start()
      running = true
    }
  )
}

function stopScanner() {
  if (Quagga && running) {
    try { Quagga.stop() } catch (e) { /* ignore */ }
    running = false
  }
}

async function searchByBarcode(code) {
  const barcode = String(code || '').trim()
  if (!barcode || searching) return
  searching = true
  resultMessage.value = '正在查询: ' + barcode
  resultClass.value = 'alert alert-info mt-3'
  try {
    const res = await productsApi.getByBarcode(barcode)
    // 兼容 { success, data } 与裸对象两种返回格式
    const product = res?.data ?? res
    if (product && product.id) {
      resultSuccess.value = true
      resultMessage.value = '找到商品: ' + product.name
      resultClass.value = 'alert alert-success mt-3'
      emit('detected', product)
      setTimeout(() => {
        stopScanner()
        emit('update:modelValue', false)
      }, 1200)
    } else {
      resultSuccess.value = false
      resultMessage.value = '未找到条码对应的商品'
      resultClass.value = 'alert alert-warning mt-3'
    }
  } catch (e) {
    resultSuccess.value = false
    if (e && e.status === 404) {
      resultMessage.value = '未找到条码对应的商品'
      resultClass.value = 'alert alert-warning mt-3'
    } else {
      resultMessage.value = '查询失败: ' + e.message
      resultClass.value = 'alert alert-danger mt-3'
    }
  } finally {
    searching = false
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      resultMessage.value = ''
      manualCode.value = ''
      // 等待 DOM 渲染出容器后再启动
      setTimeout(startScanner, 200)
    } else {
      stopScanner()
    }
  }
)

onBeforeUnmount(() => {
  stopScanner()
})
</script>

<style scoped>
.scanner-container {
  width: 100%;
  height: 300px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}
.scanner-container :deep(video),
.scanner-container :deep(canvas) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>

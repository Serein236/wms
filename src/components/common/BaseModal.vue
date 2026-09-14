<template>
  <div
    class="modal fade"
    :class="{ show: visible }"
    :style="{ display: visible ? 'block' : 'none' }"
    tabindex="-1"
    ref="modalEl"
  >
    <div class="modal-dialog" :class="sizeClass">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <button type="button" class="btn-close" @click="handleClose"></button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
        <div class="modal-footer" v-if="$slots.footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade" :class="{ show: visible }" v-if="visible"></div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: '' } // '', 'sm', 'lg', 'xl'
})

const emit = defineEmits(['update:modelValue', 'close'])

const visible = computed(() => props.modelValue)
const modalEl = ref(null)
let bsModal = null

const sizeClass = computed(() => {
  if (!props.size) return ''
  return `modal-${props.size}`
})

// 键盘 ESC 关闭
function handleKeydown(e) {
  if (e.key === 'Escape' && visible.value) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}

// body 滚动锁定
watch(visible, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
})
</script>

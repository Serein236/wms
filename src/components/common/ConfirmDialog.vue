<template>
  <BaseModal v-model="show" :title="title" size="sm">
    <div class="text-center py-2">
      <i class="bi" :class="iconClass" style="font-size: 32px;"></i>
      <p class="mt-3 mb-0">{{ message }}</p>
    </div>
    <template #footer>
      <button class="btn btn-outline-secondary btn-sm" @click="handleCancel">
        {{ cancelText }}
      </button>
      <button class="btn btn-primary btn-sm" @click="handleConfirm">
        {{ confirmText }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '确定要执行此操作吗？' },
  type: { type: String, default: 'warning' }, // warning, danger, info
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' }
})

const emit = defineEmits(['confirm', 'cancel'])

const show = ref(false)
let resolvePromise = null

const iconClass = computed(() => {
  const map = {
    warning: 'bi-exclamation-triangle-fill text-warning',
    danger: 'bi-x-circle-fill text-danger',
    info: 'bi-info-circle-fill text-info'
  }
  return map[props.type] || map.warning
})

function open() {
  show.value = true
  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

function handleConfirm() {
  show.value = false
  emit('confirm')
  if (resolvePromise) resolvePromise(true)
}

function handleCancel() {
  show.value = false
  emit('cancel')
  if (resolvePromise) resolvePromise(false)
}

defineExpose({ open })
</script>

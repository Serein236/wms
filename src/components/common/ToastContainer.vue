<template>
  <div class="toast-container">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast-item"
      :class="toast.type"
      @click="remove(toast.id)"
    >
      <i class="bi" :class="iconMap[toast.type] || 'bi-info-circle'"></i>
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

const iconMap = {
  success: 'bi-check-circle-fill',
  danger: 'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill'
}
</script>

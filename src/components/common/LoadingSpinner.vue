<template>
  <div class="loading-spinner">
    <div class="spinner-border" :class="sizeClass" role="status">
      <span class="visually-hidden">加载中...</span>
    </div>
    <span v-if="text" class="ms-2 text-muted" style="font-size: 13px;">{{ text }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: { type: String, default: '' }, // '', 'sm', 'lg'
  text: { type: String, default: '' }
})

const sizeClass = computed(() => props.size ? `spinner-border-${props.size}` : '')
</script>

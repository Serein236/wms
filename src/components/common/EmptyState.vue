<template>
  <div class="empty-state text-center py-4 text-muted">
    <i class="bi" :class="icon" style="font-size: 32px;"></i>
    <p class="mt-2 mb-1 fw-semibold">{{ title || text }}</p>
    <p v-if="desc" class="small mb-0">{{ desc }}</p>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'bi-inbox' },
  title: { type: String, default: '暂无数据' },
  text: { type: String, default: '' },
  desc: { type: String, default: '' }
})
</script>

<template>
  <nav v-if="total > 0" class="pagination-bar">
    <ul class="pagination pagination-sm mb-0">
      <li class="page-item" :class="{ disabled: page <= 1 }">
        <a class="page-link" href="javascript:void(0)" @click="page > 1 && $emit('page-change', page - 1)">
          <i class="bi bi-chevron-left"></i>
        </a>
      </li>
      <li
        v-for="(p, i) in visiblePages"
        :key="i"
        class="page-item"
        :class="{ active: p === page, disabled: p === '...' }"
      >
        <a class="page-link" href="javascript:void(0)" @click="p !== '...' && $emit('page-change', p)">
          {{ p }}
        </a>
      </li>
      <li class="page-item" :class="{ disabled: page >= totalPages }">
        <a class="page-link" href="javascript:void(0)" @click="page < totalPages && $emit('page-change', page + 1)">
          <i class="bi bi-chevron-right"></i>
        </a>
      </li>
    </ul>
    <span class="pagination-info">
      共 {{ total }} 条，第 {{ page }}/{{ totalPages }} 页
    </span>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 }
})

defineEmits(['page-change'])

const totalPages = computed(() => Math.ceil(props.total / props.pageSize) || 1)

const visiblePages = computed(() => {
  const pages = []
  const current = props.page
  const last = totalPages.value

  if (last <= 7) {
    for (let i = 1; i <= last; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 4) pages.push('...')
    const start = Math.max(2, current - 2)
    const end = Math.min(last - 1, current + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < last - 3) pages.push('...')
    pages.push(last)
  }

  return pages
})
</script>

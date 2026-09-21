<template>
  <nav v-if="total > 0" class="pagination-bar d-flex align-items-center gap-2 flex-wrap">
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
    <select
      v-if="showPageSize"
      class="form-select form-select-sm page-size-select"
      :value="pageSize"
      @change="onPageSizeChange"
      title="每页条数"
    >
      <option v-for="s in pageSizes" :key="s" :value="s">{{ s }} 条/页</option>
    </select>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
  showPageSize: { type: Boolean, default: true },
  pageSizes: { type: Array, default: () => [10, 20, 50, 100] }
})

const emit = defineEmits(['page-change', 'page-size-change'])

const totalPages = computed(() => Math.ceil(props.total / props.pageSize) || 1)

function onPageSizeChange(e) {
  emit('page-size-change', Number(e.target.value))
}

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

<style scoped>
.page-size-select {
  width: auto;
  min-width: 84px;
}
.pagination-info {
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
}
</style>

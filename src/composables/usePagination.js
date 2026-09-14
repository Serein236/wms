import { ref, computed, watch } from 'vue'

export function usePagination(initialPage = 1, initialPageSize = 20) {
  const page = ref(initialPage)
  const pageSize = ref(initialPageSize)
  const total = ref(0)

  const totalPages = computed(() => {
    return Math.ceil(total.value / pageSize.value) || 1
  })

  const hasPrev = computed(() => page.value > 1)
  const hasNext = computed(() => page.value < totalPages.value)

  // 页码窗口（当前页前后各 2 页，首尾始终显示）
  const visiblePages = computed(() => {
    const pages = []
    const current = page.value
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

  function goTo(p) {
    if (p >= 1 && p <= totalPages.value) {
      page.value = p
    }
  }

  function prev() {
    if (hasPrev.value) page.value--
  }

  function next() {
    if (hasNext.value) page.value++
  }

  function reset() {
    page.value = 1
  }

  function setTotal(t) {
    total.value = t
  }

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasPrev,
    hasNext,
    visiblePages,
    goTo,
    prev,
    next,
    reset,
    setTotal
  }
}

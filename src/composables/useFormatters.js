import { escapeHtml, formatDate, formatMoney, formatNumber, debounce, generateMonthOptions } from '@/utils/formatters'

export function useFormatters() {
  return {
    escapeHtml,
    formatDate,
    formatMoney,
    formatNumber,
    debounce,
    generateMonthOptions
  }
}

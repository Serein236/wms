/**
 * Blob 下载辅助
 */

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function getFilenameFromResponse(response, fallback = 'download') {
  const disposition = response.headers.get('content-disposition')
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?(["']?)(.+?)\1(?:;|$)/i)
    if (match) {
      return decodeURIComponent(match[2])
    }
  }
  return fallback
}

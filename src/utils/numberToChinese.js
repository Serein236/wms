/**
 * 中文大写金额转换 — 从 out_records.js 提取
 */

const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const units = ['', '拾', '佰', '仟']
const bigUnits = ['', '万', '亿']

export function numberToChinese(num) {
  if (num === 0) return '零元整'
  if (num < 0) return '负' + numberToChinese(-num)

  const integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)

  let result = ''

  // 整数部分
  if (integerPart > 0) {
    result += integerToChinese(integerPart) + '元'
  }

  // 小数部分
  if (decimalPart === 0) {
    result += '整'
  } else {
    const jiao = Math.floor(decimalPart / 10)
    const fen = decimalPart % 10
    if (jiao > 0) result += digits[jiao] + '角'
    if (fen > 0) result += digits[fen] + '分'
  }

  return result
}

function integerToChinese(num) {
  if (num === 0) return ''

  let result = ''
  let unitIndex = 0
  let bigUnitIndex = 0
  let zeroFlag = false

  while (num > 0) {
    const digit = num % 10
    num = Math.floor(num / 10)

    if (digit === 0) {
      zeroFlag = true
    } else {
      if (zeroFlag) {
        result = digits[0] + result
        zeroFlag = false
      }
      result = digits[digit] + units[unitIndex] + result
    }

    unitIndex++

    if (unitIndex === 4) {
      if (num > 0 || bigUnitIndex > 0) {
        if (!zeroFlag || num > 0) {
          result = bigUnits[bigUnitIndex + 1] + result
        }
      }
      unitIndex = 0
      bigUnitIndex++
      zeroFlag = false
    }
  }

  return result
}

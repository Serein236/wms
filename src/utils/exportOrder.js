/**
 * 销售出库单 Excel 导出（迁移自旧版 public/js/out_records.js）
 * - ExcelJS 按需动态加载，不进主包
 * - 生成带合并单元格、边框、黑体标题的格式化出库单
 */

export function numToChinese(num) {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟']
  const bigUnits = ['', '万', '亿']

  if (num === 0) return '零元整'

  let integerPart = Math.floor(num)
  let decimalPart = Math.round((num - integerPart) * 100)

  let result = ''
  let bigUnitIndex = 0

  while (integerPart > 0) {
    let section = integerPart % 10000
    if (section > 0) {
      let sectionResult = ''
      let sectionUnitIndex = 0
      while (section > 0) {
        let digit = section % 10
        if (digit > 0) {
          sectionResult = digits[digit] + units[sectionUnitIndex] + sectionResult
        } else {
          if (sectionResult && !sectionResult.startsWith('零')) {
            sectionResult = '零' + sectionResult
          }
        }
        section = Math.floor(section / 10)
        sectionUnitIndex++
      }
      result = sectionResult + bigUnits[bigUnitIndex] + result
    }
    integerPart = Math.floor(integerPart / 10000)
    bigUnitIndex++
  }

  result += '元'

  if (decimalPart === 0) {
    result += '整'
  } else {
    let jiao = Math.floor(decimalPart / 10)
    let fen = decimalPart % 10
    if (jiao > 0) {
      result += digits[jiao] + '角'
    }
    if (fen > 0) {
      result += digits[fen] + '分'
    }
  }

  return result
}

export function generateOrderNumber(record) {
  const date = record.display_date || new Date().toISOString().split('T')[0]
  const dateStr = date.replace(/-/g, '')
  const quantity = record.quantity || 1
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${dateStr}-${quantity}-${randomNum}`
}

function fmtDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function fmtMoney(val) {
  if (val == null || val === '') return '0.00'
  const n = parseFloat(val)
  return isNaN(n) ? '0.00' : n.toFixed(2)
}

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
}

/**
 * 导出单条销售出库单 Excel
 * @param {Object} record 出库记录（含 product_name/spec/unit 等）
 * @param {Object} consigneeInfo { name, address, phone } 收件信息
 * @param {string} companyName 公司名称
 */
export async function exportOutOrderExcel(record, consigneeInfo = {}, companyName = '') {
  const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'))

  const consignee = consigneeInfo.name || '-'
  const consigneeAddress = consigneeInfo.address || '-'
  const consigneePhone = consigneeInfo.phone || '-'

  const orderNumber = generateOrderNumber(record)

  const productCode = record.product_code || '-'
  const spec = record.spec || '-'
  const unit = record.unit || '-'
  const manufacturer = record.manufacturer || '-'
  const retailPrice = record.retail_price != null ? fmtMoney(record.retail_price) : '-'
  const formattedDate = record.display_date ? fmtDate(record.display_date) : '-'
  const formattedProductionDate = record.production_date ? fmtDate(record.production_date) : '-'
  const formattedExpirationDate = record.expiration_date ? fmtDate(record.expiration_date) : '-'

  const title = `${companyName || '仓库管理系统'}销售出库单`

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('销售出库单')

  worksheet.columns = [
    { width: 8 }, { width: 12 }, { width: 16 }, { width: 12 }, { width: 8 },
    { width: 8 }, { width: 8 }, { width: 10 }, { width: 12 }, { width: 12 },
    { width: 12 }, { width: 10 }, { width: 16 }
  ]

  // 标题行
  const titleRow = worksheet.addRow([title])
  worksheet.mergeCells('A1:M1')
  const titleCell = worksheet.getCell('A1')
  titleCell.font = { name: '黑体', size: 20, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'center' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
  worksheet.getRow(1).height = 35

  worksheet.addRow([])

  // 单号行
  worksheet.addRow([`单号：${orderNumber}`, '', '', '', '', '', '', '', '', '', '', '转入单号：', ''])
  worksheet.mergeCells('A3:D3')
  worksheet.mergeCells('L3:M3')

  // 开单日期行
  worksheet.addRow(['开单日期：', formattedDate, '', '客户名称：', record.source || record.destination || '-', '', '', '', '生产厂家：', manufacturer, '', '', ''])
  worksheet.mergeCells('A4:B4')
  worksheet.mergeCells('E4:H4')
  worksheet.mergeCells('J4:M4')

  // 收货人行
  worksheet.addRow(['收货人：', consignee, '', '收货地址：', consigneeAddress, '', '', '', '收货联系电话：', consigneePhone, '', '', ''])
  worksheet.mergeCells('A5:B5')
  worksheet.mergeCells('E5:H5')
  worksheet.mergeCells('J5:M5')

  worksheet.addRow([])

  // 表头行
  const headerRow = worksheet.addRow(['序号', '产品编码', '品名', '产品规格', '单位', '数量', '单价', '金额/元', '产品批号', '生产日期', '有效期', '零售价', '备注'])
  headerRow.eachCell((cell) => {
    cell.font = { name: '宋体', size: 11, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'center' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } }
    cell.border = thinBorder
  })
  worksheet.getRow(7).height = 25

  // 数据行
  const dataRow = worksheet.addRow([
    1, productCode, record.product_name, spec, unit, record.quantity,
    fmtMoney(record.unit_price), fmtMoney(record.total_amount),
    record.batch_number || '-', formattedProductionDate, formattedExpirationDate,
    retailPrice, record.remark || '-'
  ])
  dataRow.eachCell((cell) => {
    cell.font = { name: '宋体', size: 10 }
    cell.alignment = { horizontal: 'center', vertical: 'center' }
    cell.border = thinBorder
  })

  worksheet.addRow([])

  // 合计行
  const totalRow1 = worksheet.addRow(['合计金额人民币（小写）：', '', '', '', '', '', '', '', fmtMoney(record.total_amount), '', '', '共 1 件', ''])
  worksheet.mergeCells('A10:H10')
  worksheet.mergeCells('J10:K10')
  totalRow1.getCell('A').font = { name: '宋体', size: 11, bold: true }
  totalRow1.getCell('I').font = { name: '宋体', size: 11, bold: true }
  totalRow1.getCell('I').alignment = { horizontal: 'center' }

  // 大写金额行
  const totalRow2 = worksheet.addRow(['合计金额人民币（大写）：', '', '', '', '', '', '', '', numToChinese(parseFloat(record.total_amount) || 0), '', '', '', ''])
  worksheet.mergeCells('A11:H11')
  worksheet.mergeCells('I11:M11')
  totalRow2.getCell('A').font = { name: '宋体', size: 11, bold: true }
  totalRow2.getCell('I').font = { name: '宋体', size: 11, bold: true }

  worksheet.addRow([])

  // 制单人信息行
  worksheet.addRow(['制单人：', '-', '', '审核人：', '-', '', '销售负责人：', '-', '', '客户收货人：', '-', '', ''])
  worksheet.mergeCells('A13:B13')
  worksheet.mergeCells('D13:E13')
  worksheet.mergeCells('G13:H13')
  worksheet.mergeCells('J13:K13')

  worksheet.addRow([])

  // 备注行
  const noteRow = worksheet.addRow(['（一式四联：白色存根联 黄色回单联 红色客户联为财务对账联）', '', '', '', '', '', '', '', '', '', '', '', ''])
  worksheet.mergeCells('A15:M15')
  noteRow.getCell('A').alignment = { horizontal: 'left' }

  // 注意事项行
  const tipRow = worksheet.addRow(['注意事项：客户签收表示购销双方权利义务已确认，货品如有差错，请三天内来电说明（与销售负责人联系），每次发货同行的厂检请保存好', '', '', '', '', '', '', '', '', '', '', '', ''])
  worksheet.mergeCells('A16:M16')
  tipRow.getCell('A').alignment = { horizontal: 'left', wrapText: true }
  worksheet.getRow(16).height = 30

  // 导出
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `销售出库单_${orderNumber}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

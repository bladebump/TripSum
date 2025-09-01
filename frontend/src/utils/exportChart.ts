export interface ExportOptions {
  filename?: string
  format?: 'csv' | 'excel'
  quality?: number
}

/**
 * 导出数据为CSV
 */
export function exportDataAsCSV(
  data: any[],
  headers: string[],
  filename: string = 'data'
): void {
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 导出数据为Excel (简化版，实际可以使用xlsx库)
 */
export function exportDataAsExcel(
  data: any[],
  headers: string[],
  filename: string = 'data'
): void {
  // 构建HTML表格
  const table = document.createElement('table')
  table.style.display = 'none'
  
  // 添加表头
  const thead = document.createElement('thead')
  const headerRow = document.createElement('tr')
  headers.forEach(header => {
    const th = document.createElement('th')
    th.textContent = header
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)
  
  // 添加数据行
  const tbody = document.createElement('tbody')
  data.forEach(row => {
    const tr = document.createElement('tr')
    headers.forEach(header => {
      const td = document.createElement('td')
      td.textContent = row[header]
      tr.appendChild(td)
    })
    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  
  // 导出为xls
  const html = table.outerHTML
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
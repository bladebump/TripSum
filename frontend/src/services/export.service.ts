import api from './api'

export const exportService = {
  /**
   * 导出行程数据为Excel
   * @param tripId 行程ID
   * @returns Promise<void>
   */
  async exportTripToExcel(tripId: string): Promise<void> {
    try {
      const response = await api.get(`/trips/${tripId}/export`, {
        responseType: 'blob'
      })
      
      // 从响应头获取文件名
      const contentDisposition = response.headers['content-disposition']
      let filename = `trip_${tripId}_${Date.now()}.xlsx`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      // 创建下载链接
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      
      // 触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 清理URL
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('导出Excel失败:', error)
      throw error
    }
  }
}
import { describe, it, expect } from 'vitest'
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime,
  getTripStatus,
  getTripStatusText,
  getTripStatusColor
} from '../format'

describe('Format Utils', () => {
  describe('formatCurrency', () => {
    it('应该正确格式化货币', () => {
      expect(formatCurrency(1000)).toBe('¥1,000.00')
      expect(formatCurrency(1234.56)).toBe('¥1,234.56')
      expect(formatCurrency(0)).toBe('¥0.00')
      expect(formatCurrency(-500)).toBe('-¥500.00')
    })

    it('应该处理undefined和null', () => {
      expect(formatCurrency(undefined as any)).toBe('¥0.00')
      expect(formatCurrency(null as any)).toBe('¥0.00')
    })

    it('应该支持自定义货币', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100.00')
      expect(formatCurrency(100, 'EUR')).toBe('€100.00')
    })
  })

  describe('formatDate', () => {
    it('应该正确格式化日期', () => {
      const date = new Date('2024-12-25')
      expect(formatDate(date)).toBe('2024-12-25')
    })

    it('应该处理字符串日期', () => {
      expect(formatDate('2024-01-01')).toBe('2024-01-01')
    })

    it('应该处理无效日期', () => {
      expect(formatDate(null as any)).toBe('')
      expect(formatDate(undefined as any)).toBe('')
      expect(formatDate('invalid')).toBe('')
    })
  })

  describe('formatDateTime', () => {
    it('应该正确格式化日期时间', () => {
      const date = new Date('2024-12-25T14:30:00')
      const result = formatDateTime(date)
      expect(result).toContain('2024-12-25')
      expect(result).toContain('14:30')
    })

    it('应该处理字符串日期时间', () => {
      const result = formatDateTime('2024-01-01T10:00:00')
      expect(result).toContain('2024-01-01')
      expect(result).toContain('10:00')
    })
  })

  describe('getTripStatus', () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    it('应该识别未开始的行程', () => {
      expect(getTripStatus(tomorrow, nextWeek)).toBe('upcoming')
    })

    it('应该识别进行中的行程', () => {
      expect(getTripStatus(yesterday, tomorrow)).toBe('ongoing')
      expect(getTripStatus(yesterday, null)).toBe('ongoing')
    })

    it('应该识别已结束的行程', () => {
      expect(getTripStatus(yesterday, yesterday)).toBe('completed')
    })
  })

  describe('getTripStatusText', () => {
    it('应该返回正确的状态文本', () => {
      expect(getTripStatusText('upcoming')).toBe('未开始')
      expect(getTripStatusText('ongoing')).toBe('进行中')
      expect(getTripStatusText('completed')).toBe('已结束')
      expect(getTripStatusText('unknown' as any)).toBe('未知')
    })
  })

  describe('getTripStatusColor', () => {
    it('应该返回正确的状态颜色', () => {
      expect(getTripStatusColor('upcoming')).toBe('default')
      expect(getTripStatusColor('ongoing')).toBe('success')
      expect(getTripStatusColor('completed')).toBe('warning')
      expect(getTripStatusColor('unknown' as any)).toBe('default')
    })
  })
})
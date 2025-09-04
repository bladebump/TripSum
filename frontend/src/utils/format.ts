import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import AmountUtil from './decimal'

dayjs.locale('zh-cn')
dayjs.extend(relativeTime)

export const formatDate = (date: string | Date | null | undefined, format = 'YYYY-MM-DD'): string => {
  if (!date) return ''
  const parsed = dayjs(date)
  if (!parsed.isValid()) return ''
  return parsed.format(format)
}

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

export const formatRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow()
}

export const formatCurrency = (amount: number | string | null | undefined, currency = 'CNY'): string => {
  if (amount === null || amount === undefined) return '¥0.00'
  const numAmount = typeof amount === 'string' ? AmountUtil.parseAmount(amount) : amount
  if (isNaN(numAmount)) return '¥0.00'
  
  // 根据货币类型选择符号
  const currencySymbol = {
    'CNY': '¥',
    'USD': '$',
    'EUR': '€',
    '¥': '¥'
  }[currency] || currency
  
  // 使用AmountUtil格式化金额，确保精度
  const formatted = AmountUtil.format(Math.abs(numAmount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return numAmount < 0 ? `-${currencySymbol}${formatted}` : `${currencySymbol}${formatted}`
}

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}

export const formatNumber = (value: number): string => {
  return value.toLocaleString('zh-CN')
}

export const getDateRange = (startDate: string, endDate?: string): string => {
  const start = formatDate(startDate)
  if (!endDate) return start
  const end = formatDate(endDate)
  return `${start} - ${end}`
}

export const getDaysCount = (startDate: string, endDate?: string): number => {
  const start = dayjs(startDate)
  const end = endDate ? dayjs(endDate) : dayjs()
  return end.diff(start, 'day') + 1
}

export const isDateInRange = (date: string, startDate: string, endDate?: string): boolean => {
  const target = dayjs(date)
  const start = dayjs(startDate)
  
  if (!endDate) {
    return target.isAfter(start) || target.isSame(start)
  }
  
  const end = dayjs(endDate)
  return (target.isAfter(start) || target.isSame(start)) && 
         (target.isBefore(end) || target.isSame(end))
}

export const getTripStatus = (startDate: string | Date, endDate?: string | Date | null): 'upcoming' | 'ongoing' | 'completed' => {
  const now = dayjs()
  const start = dayjs(startDate)
  
  if (now.isBefore(start)) {
    return 'upcoming'
  }
  
  if (!endDate) {
    return 'ongoing'
  }
  
  const end = dayjs(endDate)
  if (now.isAfter(end)) {
    return 'completed'
  }
  
  return 'ongoing'
}

export const getTripStatusText = (status: 'upcoming' | 'ongoing' | 'completed' | string): string => {
  const statusMap: Record<string, string> = {
    upcoming: '未开始',
    ongoing: '进行中',
    completed: '已结束',
    // 兼容旧版本
    active: '进行中'
  }
  return statusMap[status] || '未知'
}

export const getTripStatusColor = (status: 'upcoming' | 'ongoing' | 'completed' | string): string => {
  const colorMap: Record<string, string> = {
    upcoming: 'default',
    ongoing: 'success',
    completed: 'warning',
    // 兼容旧版本
    active: 'success'
  }
  return colorMap[status] || 'default'
}
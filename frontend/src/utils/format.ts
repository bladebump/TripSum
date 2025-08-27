import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.locale('zh-cn')
dayjs.extend(relativeTime)

export const formatDate = (date: string | Date, format = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format)
}

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

export const formatRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow()
}

export const formatCurrency = (amount: number | string, currency = '¥'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return `${currency}0.00`
  return `${currency}${numAmount.toFixed(2)}`
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

export const getTripStatus = (startDate: string, endDate?: string): 'upcoming' | 'active' | 'completed' => {
  const now = dayjs()
  const start = dayjs(startDate)
  
  if (now.isBefore(start)) {
    return 'upcoming'
  }
  
  if (!endDate) {
    return 'active'
  }
  
  const end = dayjs(endDate)
  if (now.isAfter(end)) {
    return 'completed'
  }
  
  return 'active'
}

export const getTripStatusText = (status: 'upcoming' | 'active' | 'completed'): string => {
  const statusMap = {
    upcoming: '即将开始',
    active: '进行中',
    completed: '已结束'
  }
  return statusMap[status]
}

export const getTripStatusColor = (status: 'upcoming' | 'active' | 'completed'): string => {
  const colorMap = {
    upcoming: '#FF976A',
    active: '#00B578',
    completed: '#999999'
  }
  return colorMap[status]
}
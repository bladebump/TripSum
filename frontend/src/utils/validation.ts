export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): { 
  valid: boolean
  message?: string 
} => {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少6位' }
  }
  return { valid: true }
}

export const validateUsername = (username: string): {
  valid: boolean
  message?: string
} => {
  if (username.length < 3) {
    return { valid: false, message: '用户名至少3个字符' }
  }
  if (username.length > 50) {
    return { valid: false, message: '用户名最多50个字符' }
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return { valid: false, message: '用户名只能包含字母、数字、下划线和中文' }
  }
  return { valid: true }
}

export const validateTripName = (name: string): {
  valid: boolean
  message?: string
} => {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: '行程名称不能为空' }
  }
  if (name.length > 100) {
    return { valid: false, message: '行程名称最多100个字符' }
  }
  return { valid: true }
}

export const validateAmount = (amount: number | string): {
  valid: boolean
  message?: string
} => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount)) {
    return { valid: false, message: '请输入有效的金额' }
  }
  if (numAmount <= 0) {
    return { valid: false, message: '金额必须大于0' }
  }
  if (numAmount > 999999999) {
    return { valid: false, message: '金额过大' }
  }
  return { valid: true }
}

export const validateDateRange = (startDate: string, endDate?: string): {
  valid: boolean
  message?: string
} => {
  const start = new Date(startDate)
  
  if (isNaN(start.getTime())) {
    return { valid: false, message: '开始日期无效' }
  }
  
  if (endDate) {
    const end = new Date(endDate)
    if (isNaN(end.getTime())) {
      return { valid: false, message: '结束日期无效' }
    }
    if (end < start) {
      return { valid: false, message: '结束日期不能早于开始日期' }
    }
  }
  
  return { valid: true }
}

export const validateFile = (file: File, options?: {
  maxSize?: number // in MB
  allowedTypes?: string[]
}): {
  valid: boolean
  message?: string
} => {
  const maxSize = options?.maxSize || 10 // 默认10MB
  const allowedTypes = options?.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
  
  if (file.size > maxSize * 1024 * 1024) {
    return { valid: false, message: `文件大小不能超过${maxSize}MB` }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, message: '文件类型不支持' }
  }
  
  return { valid: true }
}

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // 移除潜在的HTML标签
    .trim()
}
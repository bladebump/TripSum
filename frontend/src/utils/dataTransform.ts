/**
 * 数据转换工具函数
 * 用于将后端返回的字符串类型金额字段转换为数字类型
 */

// 需要转换为数字类型的字段名列表
const AMOUNT_FIELDS = [
  'amount',
  'initialFund',
  'totalExpenses',
  'myBalance',
  'shareAmount',
  'sharePercentage',
  'totalPaid',
  'totalShare',
  'balance',
  'averagePerPerson',
  'totalAmount',
  'totalTransactions'
]

/**
 * 递归转换对象中的金额字段
 * 将字符串类型的金额转换为数字类型
 */
export function transformAmountFields<T>(data: any): T {
  if (!data) return data

  // 处理数组
  if (Array.isArray(data)) {
    return data.map(item => transformAmountFields(item)) as any
  }

  // 处理对象
  if (typeof data === 'object' && data !== null) {
    const result: any = {}
    
    for (const key in data) {
      const value = data[key]
      
      // 如果是金额字段且为字符串，转换为数字
      if (AMOUNT_FIELDS.includes(key) && typeof value === 'string') {
        result[key] = parseFloat(value)
        // 处理 NaN 情况
        if (isNaN(result[key])) {
          result[key] = 0
        }
      } 
      // 递归处理嵌套对象和数组
      else if (value !== null && typeof value === 'object') {
        result[key] = transformAmountFields(value)
      } 
      // 其他类型直接复制
      else {
        result[key] = value
      }
    }
    
    return result
  }

  // 原始类型直接返回
  return data
}

/**
 * 转换Trip数据
 */
export function transformTripData(trip: any): any {
  return transformAmountFields(trip)
}

/**
 * 转换Expense数据
 */
export function transformExpenseData(expense: any): any {
  return transformAmountFields(expense)
}

/**
 * 转换Balance数据
 */
export function transformBalanceData(balance: any): any {
  return transformAmountFields(balance)
}

/**
 * 转换Settlement数据
 */
export function transformSettlementData(settlement: any): any {
  return transformAmountFields(settlement)
}
/**
 * 简单的数学计算器工具
 * 用于AI进行精确的数学计算
 */
export const calculator = {
  add: (a: number, b: number): number => a + b,
  subtract: (a: number, b: number): number => a - b,
  multiply: (a: number, b: number): number => a * b,
  divide: (a: number, b: number): number => b === 0 ? 0 : a / b
}

/**
 * 执行计算操作
 */
export function executeCalculation(operation: string, a: number, b: number): number {
  switch(operation) {
    case 'add':
      return calculator.add(a, b)
    case 'subtract':
      return calculator.subtract(a, b)
    case 'multiply':
      return calculator.multiply(a, b)
    case 'divide':
      return calculator.divide(a, b)
    default:
      throw new Error(`Unknown operation: ${operation}`)
  }
}
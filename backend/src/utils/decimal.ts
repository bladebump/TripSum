import Decimal from 'decimal.js'
import { Decimal as PrismaDecimal } from '@prisma/client/runtime/library'

// 配置Decimal.js全局设置  
// Decimal.config() 是配置方法
const DecimalConfig = Decimal.clone()
DecimalConfig.set({
  precision: 20, // 精度
  rounding: 4, // 四舍五入 ROUND_HALF_UP
  toExpNeg: -9, // 指数表示法的下限
  toExpPos: 20 // 指数表示法的上限
})

/**
 * 金额处理工具类
 * 统一处理Prisma Decimal到Decimal.js的转换和金额运算
 */
export class AmountUtil {
  /**
   * 将Prisma Decimal或其他类型转换为Decimal.js对象
   */
  static toDecimal(value: PrismaDecimal | number | string | null | undefined): Decimal {
    if (value === null || value === undefined) {
      return new Decimal(0)
    }
    
    // Prisma Decimal对象可能有toNumber方法
    if (typeof value === 'object' && 'toNumber' in value) {
      return new Decimal(value.toString())
    }
    
    return new Decimal(value)
  }

  /**
   * 将Decimal.js对象转换为数字（保留2位小数）
   */
  static toNumber(value: Decimal): number {
    return value.toDecimalPlaces(2).toNumber()
  }

  /**
   * 加法运算
   */
  static add(a: PrismaDecimal | number, b: PrismaDecimal | number): Decimal {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    return decimalA.plus(decimalB)
  }

  /**
   * 减法运算
   */
  static subtract(a: PrismaDecimal | number, b: PrismaDecimal | number): Decimal {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    return decimalA.minus(decimalB)
  }

  /**
   * 乘法运算
   */
  static multiply(a: PrismaDecimal | number, b: PrismaDecimal | number): Decimal {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    return decimalA.times(decimalB)
  }

  /**
   * 除法运算
   */
  static divide(a: PrismaDecimal | number, b: PrismaDecimal | number): Decimal {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    
    if (decimalB.isZero()) {
      throw new Error('Division by zero')
    }
    
    return decimalA.dividedBy(decimalB)
  }

  /**
   * 计算数组总和
   */
  static sum(values: (PrismaDecimal | number)[]): Decimal {
    return values.reduce<Decimal>((sum, value) => {
      return sum.plus(this.toDecimal(value))
    }, new Decimal(0))
  }

  /**
   * 计算平均值
   */
  static average(values: (PrismaDecimal | number)[]): Decimal {
    if (values.length === 0) {
      return new Decimal(0)
    }
    const sum = this.sum(values)
    return sum.dividedBy(values.length)
  }

  /**
   * 比较两个金额是否相等（精确比较）
   */
  static equals(a: PrismaDecimal | number, b: PrismaDecimal | number): boolean {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    return decimalA.equals(decimalB)
  }

  /**
   * 比较两个金额是否相等（带容差）
   * @param tolerance 容差值，默认0.01（1分钱）
   */
  static equalsWithTolerance(a: PrismaDecimal | number, b: PrismaDecimal | number, tolerance: number = 0.01): boolean {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    const diff = decimalA.minus(decimalB).abs()
    return diff.lessThanOrEqualTo(tolerance)
  }

  /**
   * 比较大小: a > b
   */
  static greaterThan(a: PrismaDecimal | number, b: PrismaDecimal | number): boolean {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    return decimalA.greaterThan(decimalB)
  }

  /**
   * 比较大小: a < b
   */
  static lessThan(a: PrismaDecimal | number, b: PrismaDecimal | number): boolean {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    return decimalA.lessThan(decimalB)
  }

  /**
   * 格式化金额（保留2位小数）
   */
  static format(value: PrismaDecimal | number | Decimal): string {
    const decimal = value instanceof Decimal ? value : this.toDecimal(value)
    return decimal.toFixed(2)
  }

  /**
   * 四舍五入到2位小数
   */
  static round(value: PrismaDecimal | number | Decimal): Decimal {
    const decimal = value instanceof Decimal ? value : this.toDecimal(value)
    return decimal.toDecimalPlaces(2, 4) // 4 = ROUND_HALF_UP
  }

  /**
   * 获取最大值
   */
  static max(values: (PrismaDecimal | number)[]): Decimal {
    if (values.length === 0) {
      return new Decimal(0)
    }
    
    return values.reduce<Decimal>((max, value) => {
      const decimal = this.toDecimal(value)
      return decimal.greaterThan(max) ? decimal : max
    }, this.toDecimal(values[0]))
  }

  /**
   * 获取最小值
   */
  static min(values: (PrismaDecimal | number)[]): Decimal {
    if (values.length === 0) {
      return new Decimal(0)
    }
    
    return values.reduce<Decimal>((min, value) => {
      const decimal = this.toDecimal(value)
      return decimal.lessThan(min) ? decimal : min
    }, this.toDecimal(values[0]))
  }

  /**
   * 计算百分比
   */
  static percentage(part: PrismaDecimal | number, whole: PrismaDecimal | number): Decimal {
    const partDecimal = this.toDecimal(part)
    const wholeDecimal = this.toDecimal(whole)
    
    if (wholeDecimal.isZero()) {
      return new Decimal(0)
    }
    
    return partDecimal.dividedBy(wholeDecimal).times(100)
  }
}

export default AmountUtil
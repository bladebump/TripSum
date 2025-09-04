import Decimal from 'decimal.js'

// 配置Decimal.js全局设置
const DecimalConfig = Decimal.clone()
DecimalConfig.set({
  precision: 20, // 精度
  rounding: 4, // 四舍五入 ROUND_HALF_UP
  toExpNeg: -9, // 指数表示法的下限
  toExpPos: 20 // 指数表示法的上限
})

/**
 * 前端金额处理工具类
 * 统一处理前端的金额运算和格式化
 */
export class AmountUtil {
  /**
   * 将任意类型转换为Decimal.js对象
   */
  static toDecimal(value: number | string | null | undefined): Decimal {
    if (value === null || value === undefined || value === '') {
      return new Decimal(0)
    }
    
    return new Decimal(value)
  }

  /**
   * 将Decimal.js对象转换为数字（保留2位小数）
   */
  static toNumber(value: Decimal | number | string): number {
    if (value instanceof Decimal) {
      return value.toDecimalPlaces(2).toNumber()
    }
    return this.toDecimal(value).toDecimalPlaces(2).toNumber()
  }

  /**
   * 格式化金额（保留2位小数）
   */
  static format(value: number | string | Decimal): string {
    const decimal = value instanceof Decimal ? value : this.toDecimal(value)
    return decimal.toFixed(2)
  }

  /**
   * 解析用户输入的金额字符串
   */
  static parseAmount(value: string): number {
    if (!value || value.trim() === '') {
      return 0
    }
    
    // 移除可能的千位分隔符
    const cleanValue = value.replace(/,/g, '')
    
    try {
      const decimal = new Decimal(cleanValue)
      return decimal.toDecimalPlaces(2).toNumber()
    } catch {
      return 0
    }
  }

  /**
   * 计算多个金额的总和
   */
  static sum(values: (number | string)[]): number {
    const total = values.reduce((sum, value) => {
      return sum.plus(this.toDecimal(value))
    }, new Decimal(0))
    
    return this.toNumber(total)
  }

  /**
   * 计算平均值
   */
  static average(values: (number | string)[]): number {
    if (values.length === 0) {
      return 0
    }
    
    const sum = this.sum(values)
    return this.toNumber(new Decimal(sum).dividedBy(values.length))
  }

  /**
   * 计算百分比
   */
  static percentage(part: number | string, whole: number | string): number {
    const partDecimal = this.toDecimal(part)
    const wholeDecimal = this.toDecimal(whole)
    
    if (wholeDecimal.isZero()) {
      return 0
    }
    
    return this.toNumber(partDecimal.dividedBy(wholeDecimal).times(100))
  }

  /**
   * 加法运算
   */
  static add(a: number | string, b: number | string): number {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    return this.toNumber(decimalA.plus(decimalB))
  }

  /**
   * 减法运算
   */
  static subtract(a: number | string, b: number | string): number {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    return this.toNumber(decimalA.minus(decimalB))
  }

  /**
   * 乘法运算
   */
  static multiply(a: number | string, b: number | string): number {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    return this.toNumber(decimalA.times(decimalB))
  }

  /**
   * 除法运算
   */
  static divide(a: number | string, b: number | string): number {
    const decimalA = this.toDecimal(a)
    const decimalB = this.toDecimal(b)
    
    if (decimalB.isZero()) {
      return 0
    }
    
    return this.toNumber(decimalA.dividedBy(decimalB))
  }

  /**
   * 四舍五入到2位小数
   */
  static round(value: number | string): number {
    const decimal = this.toDecimal(value)
    return this.toNumber(decimal)
  }

  /**
   * 验证是否为有效金额
   */
  static isValid(value: string): boolean {
    if (!value || value.trim() === '') {
      return false
    }
    
    try {
      const decimal = new Decimal(value.replace(/,/g, ''))
      return decimal.isFinite() && decimal.greaterThanOrEqualTo(0)
    } catch {
      return false
    }
  }

  /**
   * 验证金额是否在范围内
   */
  static isInRange(value: number | string, min: number, max: number): boolean {
    const decimal = this.toDecimal(value)
    return decimal.greaterThanOrEqualTo(min) && decimal.lessThanOrEqualTo(max)
  }
}

export default AmountUtil
import { describe, it, expect } from 'vitest'
import AmountUtil from '../decimal'

describe('AmountUtil - 前端金额处理工具类', () => {
  describe('toDecimal - 类型转换', () => {
    it('应该正确处理各种输入类型', () => {
      // number类型
      const result1 = AmountUtil.toDecimal(123.45)
      expect(result1.toNumber()).toBe(123.45)

      // string类型
      const result2 = AmountUtil.toDecimal('678.90')
      expect(result2.toNumber()).toBe(678.90)

      // 空字符串应返回0
      const result3 = AmountUtil.toDecimal('')
      expect(result3.toNumber()).toBe(0)

      // null和undefined应返回0
      const result4 = AmountUtil.toDecimal(null)
      expect(result4.toNumber()).toBe(0)

      const result5 = AmountUtil.toDecimal(undefined)
      expect(result5.toNumber()).toBe(0)
    })
  })

  describe('parseAmount - 解析用户输入', () => {
    it('应该解析普通数字字符串', () => {
      expect(AmountUtil.parseAmount('123.45')).toBe(123.45)
      expect(AmountUtil.parseAmount('100')).toBe(100.00)
      expect(AmountUtil.parseAmount('0.01')).toBe(0.01)
    })

    it('应该处理千分位逗号', () => {
      expect(AmountUtil.parseAmount('1,234.56')).toBe(1234.56)
      expect(AmountUtil.parseAmount('1,000,000.00')).toBe(1000000.00)
      expect(AmountUtil.parseAmount('9,999,999.99')).toBe(9999999.99)
    })

    it('应该处理空值和无效输入', () => {
      expect(AmountUtil.parseAmount('')).toBe(0)
      expect(AmountUtil.parseAmount('   ')).toBe(0)
      expect(AmountUtil.parseAmount('abc')).toBe(0)
      expect(AmountUtil.parseAmount('12.34.56')).toBe(0)
    })

    it('应该处理前后空格', () => {
      expect(AmountUtil.parseAmount('  123.45  ')).toBe(123.45)
      expect(AmountUtil.parseAmount('\t100\n')).toBe(100.00)
    })
  })

  describe('format - 格式化金额', () => {
    it('应该格式化为2位小数字符串', () => {
      expect(AmountUtil.format(123.456)).toBe('123.46')
      expect(AmountUtil.format(100)).toBe('100.00')
      expect(AmountUtil.format(0.1)).toBe('0.10')
      expect(AmountUtil.format('999.999')).toBe('1000.00')
    })
  })

  describe('算术运算精度测试', () => {
    it('add - 应该精确处理加法', () => {
      expect(AmountUtil.add(0.1, 0.2)).toBe(0.30)
      expect(AmountUtil.add('0.1', '0.2')).toBe(0.30)
      expect(AmountUtil.add(9999999.99, 0.01)).toBe(10000000.00)
    })

    it('subtract - 应该精确处理减法', () => {
      expect(AmountUtil.subtract(1.0, 0.9)).toBe(0.10)
      expect(AmountUtil.subtract('1', '0.9')).toBe(0.10)
      expect(AmountUtil.subtract(10000000.00, 9999999.99)).toBe(0.01)
    })

    it('multiply - 应该精确处理乘法', () => {
      expect(AmountUtil.multiply(0.1, 0.2)).toBe(0.02)
      expect(AmountUtil.multiply(100, 0.333)).toBe(33.30)
      expect(AmountUtil.multiply('999999', '0.01')).toBe(9999.99)
    })

    it('divide - 应该精确处理除法', () => {
      expect(AmountUtil.divide(100, 3)).toBe(33.33)
      expect(AmountUtil.divide('10', '4')).toBe(2.50)
      expect(AmountUtil.divide(1, 3)).toBe(0.33)
    })

    it('divide - 应该处理除零情况', () => {
      expect(AmountUtil.divide(100, 0)).toBe(0)
      expect(AmountUtil.divide(100, '0')).toBe(0)
    })
  })

  describe('聚合函数', () => {
    it('sum - 应该精确计算总和', () => {
      expect(AmountUtil.sum([0.1, 0.2, 0.3, 0.4])).toBe(1.00)
      expect(AmountUtil.sum(['0.1', '0.2', '0.3', '0.4'])).toBe(1.00)
      expect(AmountUtil.sum([9999999.99, 0.01])).toBe(10000000.00)
      expect(AmountUtil.sum([])).toBe(0)
    })

    it('average - 应该精确计算平均值', () => {
      expect(AmountUtil.average([10, 20, 30])).toBe(20.00)
      expect(AmountUtil.average(['100', '100', '100.01'])).toBe(100.00)
      expect(AmountUtil.average([])).toBe(0)
    })

    it('percentage - 应该正确计算百分比', () => {
      expect(AmountUtil.percentage(33, 100)).toBe(33.00)
      expect(AmountUtil.percentage('1', '3')).toBe(33.33)
      expect(AmountUtil.percentage(50, 200)).toBe(25.00)
      expect(AmountUtil.percentage(10, 0)).toBe(0)
    })
  })

  describe('验证函数', () => {
    describe('isValid - 验证金额有效性', () => {
      it('应该验证有效金额', () => {
        expect(AmountUtil.isValid('123.45')).toBe(true)
        expect(AmountUtil.isValid('0')).toBe(true)
        expect(AmountUtil.isValid('9999999.99')).toBe(true)
        expect(AmountUtil.isValid('1,234.56')).toBe(true)
      })

      it('应该拒绝无效金额', () => {
        expect(AmountUtil.isValid('')).toBe(false)
        expect(AmountUtil.isValid('   ')).toBe(false)
        expect(AmountUtil.isValid('abc')).toBe(false)
        expect(AmountUtil.isValid('-100')).toBe(false) // 负数
        expect(AmountUtil.isValid('12.34.56')).toBe(false)
      })
    })

    describe('isInRange - 验证金额范围', () => {
      it('应该验证金额在范围内', () => {
        expect(AmountUtil.isInRange(100, 0, 1000)).toBe(true)
        expect(AmountUtil.isInRange('500', 0, 1000)).toBe(true)
        expect(AmountUtil.isInRange(0, 0, 1000)).toBe(true)
        expect(AmountUtil.isInRange(1000, 0, 1000)).toBe(true)
      })

      it('应该拒绝范围外的金额', () => {
        expect(AmountUtil.isInRange(1001, 0, 1000)).toBe(false)
        expect(AmountUtil.isInRange(-1, 0, 1000)).toBe(false)
        expect(AmountUtil.isInRange('10000', 0, 9999)).toBe(false)
      })
    })
  })

  describe('round - 四舍五入', () => {
    it('应该四舍五入到2位小数', () => {
      expect(AmountUtil.round(123.454)).toBe(123.45)
      expect(AmountUtil.round(123.455)).toBe(123.46)
      expect(AmountUtil.round('123.456')).toBe(123.46)
      expect(AmountUtil.round(100)).toBe(100.00)
    })
  })

  describe('实际业务场景测试', () => {
    it('应该正确处理表单输入金额', () => {
      // 用户输入带逗号的金额
      const userInput = '1,234.567'
      const parsed = AmountUtil.parseAmount(userInput)
      expect(parsed).toBe(1234.57) // 自动四舍五入到2位
      
      // 格式化显示
      const formatted = AmountUtil.format(parsed)
      expect(formatted).toBe('1234.57')
    })

    it('应该正确计算分摊金额', () => {
      const totalAmount = 300.00
      const memberCount = 7
      
      // 计算每人分摊
      const perPerson = AmountUtil.divide(totalAmount, memberCount)
      expect(perPerson).toBe(42.86) // 300 / 7 = 42.857... → 42.86
      
      // 验证总和（会有小误差）
      const sum = AmountUtil.multiply(perPerson, memberCount)
      expect(sum).toBe(300.02) // 42.86 * 7 = 300.02
    })

    it('应该正确处理百分比输入', () => {
      const total = 1000.00
      const percentageInput = '33.33' // 用户输入33.33%
      
      const share = AmountUtil.divide(
        AmountUtil.multiply(total, AmountUtil.parseAmount(percentageInput)),
        100
      )
      expect(share).toBe(333.30)
    })

    it('应该正确验证金额输入范围', () => {
      // 验证最大金额限制
      const maxAmount = 9999999.99
      expect(AmountUtil.isInRange('10000000', 0.01, maxAmount)).toBe(false)
      expect(AmountUtil.isInRange('9999999.99', 0.01, maxAmount)).toBe(true)
      
      // 验证最小金额限制
      expect(AmountUtil.isInRange('0.001', 0.01, maxAmount)).toBe(false)
      expect(AmountUtil.isInRange('0.01', 0.01, maxAmount)).toBe(true)
    })

    it('应该处理复杂的余额计算', () => {
      // 模拟前端余额计算：基金缴纳 + 垫付 - 分摊
      const contribution = '500.00'
      const reimbursements = [100.50, 200.30] // 多笔垫付
      const shares = [150.25, 100.75, 50.00] // 多笔分摊
      
      const totalReimbursements = AmountUtil.sum(reimbursements)
      const totalShares = AmountUtil.sum(shares)
      
      const balance = AmountUtil.subtract(
        AmountUtil.add(contribution, totalReimbursements),
        totalShares
      )
      
      expect(balance).toBe(499.80) // 500 + 300.80 - 301 = 499.80
    })
  })

  describe('边界条件测试', () => {
    it('应该处理JavaScript浮点数精度问题', () => {
      // 经典问题
      expect(0.1 + 0.2).not.toBe(0.3) // JS原生问题
      expect(AmountUtil.add(0.1, 0.2)).toBe(0.3) // 我们的解决方案
      
      // 更多精度问题
      expect(AmountUtil.subtract(0.3, 0.1)).toBe(0.20)
      expect(AmountUtil.multiply(0.1, 0.1)).toBe(0.01)
      expect(AmountUtil.divide(0.3, 0.1)).toBe(3.00)
    })

    it('应该处理极端值', () => {
      // 最大值
      expect(AmountUtil.format(9999999.99)).toBe('9999999.99')
      expect(AmountUtil.isValid('9999999.99')).toBe(true)
      
      // 最小值
      expect(AmountUtil.format(0.01)).toBe('0.01')
      expect(AmountUtil.round(0.001)).toBe(0.00)
      
      // 零值
      expect(AmountUtil.format(0)).toBe('0.00')
      expect(AmountUtil.divide(0, 100)).toBe(0)
    })
  })
})
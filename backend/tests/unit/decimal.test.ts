import AmountUtil from '../../src/utils/decimal'

describe('AmountUtil - 金额处理工具类', () => {
  describe('toDecimal - 类型转换', () => {
    it('应该正确处理各种输入类型', () => {
      // number类型
      const result1 = AmountUtil.toDecimal(123.45)
      expect(result1.toNumber()).toBe(123.45)

      // string类型
      const result2 = AmountUtil.toDecimal('678.90')
      expect(result2.toNumber()).toBe(678.90)

      // null和undefined应返回0
      const result3 = AmountUtil.toDecimal(null)
      expect(result3.toNumber()).toBe(0)

      const result4 = AmountUtil.toDecimal(undefined)
      expect(result4.toNumber()).toBe(0)
    })

    it('应该处理Prisma Decimal对象', () => {
      // 模拟Prisma Decimal对象
      const prismaDecimal = {
        toNumber: () => 999.99,
        toString: () => '999.99'
      } as any

      const result = AmountUtil.toDecimal(prismaDecimal)
      expect(result.toNumber()).toBe(999.99)
    })
  })

  describe('toNumber - 转换为数字', () => {
    it('应该保留2位小数', () => {
      const decimal = AmountUtil.toDecimal(123.456789)
      const result = AmountUtil.toNumber(decimal)
      expect(result).toBe(123.46) // 四舍五入
    })

    it('应该正确处理整数', () => {
      const decimal = AmountUtil.toDecimal(100)
      const result = AmountUtil.toNumber(decimal)
      expect(result).toBe(100.00)
    })
  })

  describe('算术运算精度测试', () => {
    describe('add - 加法', () => {
      it('应该解决0.1 + 0.2问题', () => {
        const result = AmountUtil.add(0.1, 0.2)
        expect(AmountUtil.toNumber(result)).toBe(0.30)
      })

      it('应该处理大金额加法', () => {
        const result = AmountUtil.add(9999999.99, 0.01)
        expect(AmountUtil.toNumber(result)).toBe(10000000.00)
      })

      it('应该处理负数加法', () => {
        const result = AmountUtil.add(-100.50, 50.25)
        expect(AmountUtil.toNumber(result)).toBe(-50.25)
      })
    })

    describe('subtract - 减法', () => {
      it('应该精确处理小数减法', () => {
        const result = AmountUtil.subtract(1.0, 0.9)
        expect(AmountUtil.toNumber(result)).toBe(0.10)
      })

      it('应该处理大金额减法', () => {
        const result = AmountUtil.subtract(10000000.00, 9999999.99)
        expect(AmountUtil.toNumber(result)).toBe(0.01)
      })
    })

    describe('multiply - 乘法', () => {
      it('应该精确处理小数乘法', () => {
        const result = AmountUtil.multiply(0.1, 0.2)
        expect(AmountUtil.toNumber(result)).toBe(0.02)
      })

      it('应该处理百分比计算', () => {
        const result = AmountUtil.multiply(100, 0.333)
        expect(AmountUtil.toNumber(result)).toBe(33.30)
      })

      it('应该处理大数乘法', () => {
        const result = AmountUtil.multiply(999999, 0.01)
        expect(AmountUtil.toNumber(result)).toBe(9999.99)
      })
    })

    describe('divide - 除法', () => {
      it('应该精确处理除法', () => {
        const result = AmountUtil.divide(100, 3)
        expect(AmountUtil.toNumber(result)).toBe(33.33) // 保留2位小数
      })

      it('应该处理除零情况', () => {
        expect(() => AmountUtil.divide(100, 0)).toThrow('Division by zero')
      })

      it('应该处理精确除法', () => {
        const result = AmountUtil.divide(10, 4)
        expect(AmountUtil.toNumber(result)).toBe(2.50)
      })
    })
  })

  describe('聚合函数', () => {
    describe('sum - 求和', () => {
      it('应该精确计算数组总和', () => {
        const values = [0.1, 0.2, 0.3, 0.4]
        const result = AmountUtil.sum(values)
        expect(AmountUtil.toNumber(result)).toBe(1.00)
      })

      it('应该处理大金额数组求和', () => {
        const values = [9999999.99, 0.01, 0.00]
        const result = AmountUtil.sum(values)
        expect(AmountUtil.toNumber(result)).toBe(10000000.00)
      })

      it('应该处理空数组', () => {
        const result = AmountUtil.sum([])
        expect(AmountUtil.toNumber(result)).toBe(0)
      })
    })

    describe('average - 平均值', () => {
      it('应该精确计算平均值', () => {
        const values = [10.00, 20.00, 30.00]
        const result = AmountUtil.average(values)
        expect(AmountUtil.toNumber(result)).toBe(20.00)
      })

      it('应该处理不能整除的平均值', () => {
        const values = [100, 100, 100.01]
        const result = AmountUtil.average(values)
        expect(AmountUtil.toNumber(result)).toBe(100.00) // (300.01 / 3) = 100.003... → 100.00
      })

      it('应该处理空数组', () => {
        const result = AmountUtil.average([])
        expect(AmountUtil.toNumber(result)).toBe(0)
      })
    })

    describe('max/min - 最大最小值', () => {
      it('应该找到最大值', () => {
        const values = [10.01, 10.02, 10.00, 9.99]
        const result = AmountUtil.max(values)
        expect(AmountUtil.toNumber(result)).toBe(10.02)
      })

      it('应该找到最小值', () => {
        const values = [10.01, 10.02, 10.00, 9.99]
        const result = AmountUtil.min(values)
        expect(AmountUtil.toNumber(result)).toBe(9.99)
      })

      it('应该处理空数组', () => {
        expect(AmountUtil.toNumber(AmountUtil.max([]))).toBe(0)
        expect(AmountUtil.toNumber(AmountUtil.min([]))).toBe(0)
      })
    })
  })

  describe('工具函数', () => {
    describe('equals - 相等比较', () => {
      it('应该正确比较相等的金额', () => {
        expect(AmountUtil.equals(10.00, 10)).toBe(true)
        expect(AmountUtil.equals(0.1 + 0.2, 0.3)).toBe(false) // JS精度问题
        expect(AmountUtil.equals(AmountUtil.toNumber(AmountUtil.add(0.1, 0.2)), 0.3)).toBe(true)
      })
    })

    describe('greaterThan/lessThan - 大小比较', () => {
      it('应该正确比较金额大小', () => {
        expect(AmountUtil.greaterThan(10.01, 10.00)).toBe(true)
        expect(AmountUtil.greaterThan(10.00, 10.00)).toBe(false)
        
        expect(AmountUtil.lessThan(9.99, 10.00)).toBe(true)
        expect(AmountUtil.lessThan(10.00, 10.00)).toBe(false)
      })
    })

    describe('format - 格式化', () => {
      it('应该格式化为2位小数字符串', () => {
        expect(AmountUtil.format(123.456)).toBe('123.46')
        expect(AmountUtil.format(100)).toBe('100.00')
        expect(AmountUtil.format(0.1)).toBe('0.10')
      })
    })

    describe('round - 四舍五入', () => {
      it('应该四舍五入到2位小数', () => {
        const result1 = AmountUtil.round(123.454)
        expect(AmountUtil.toNumber(result1)).toBe(123.45)

        const result2 = AmountUtil.round(123.455)
        expect(AmountUtil.toNumber(result2)).toBe(123.46)

        const result3 = AmountUtil.round(123.456)
        expect(AmountUtil.toNumber(result3)).toBe(123.46)
      })
    })

    describe('percentage - 百分比计算', () => {
      it('应该正确计算百分比', () => {
        const result1 = AmountUtil.percentage(33, 100)
        expect(AmountUtil.toNumber(result1)).toBe(33.00)

        const result2 = AmountUtil.percentage(1, 3)
        expect(AmountUtil.toNumber(result2)).toBe(33.33)

        const result3 = AmountUtil.percentage(50, 200)
        expect(AmountUtil.toNumber(result3)).toBe(25.00)
      })

      it('应该处理分母为0的情况', () => {
        const result = AmountUtil.percentage(10, 0)
        expect(AmountUtil.toNumber(result)).toBe(0)
      })
    })
  })

  describe('边界条件测试', () => {
    it('应该处理最大金额', () => {
      const max = 9999999.99
      const result = AmountUtil.add(max, 0)
      expect(AmountUtil.toNumber(result)).toBe(max)
    })

    it('应该处理最小正金额', () => {
      const min = 0.01
      const result = AmountUtil.add(min, 0)
      expect(AmountUtil.toNumber(result)).toBe(min)
    })

    it('应该处理负数最大值', () => {
      const negMax = -9999999.99
      const result = AmountUtil.add(negMax, 0)
      expect(AmountUtil.toNumber(result)).toBe(negMax)
    })

    it('应该处理循环小数', () => {
      const result = AmountUtil.divide(1, 3)
      expect(AmountUtil.toNumber(result)).toBe(0.33) // 1/3 = 0.333... → 0.33
    })

    it('应该处理极小数运算', () => {
      const result = AmountUtil.multiply(0.01, 0.01)
      expect(AmountUtil.toNumber(result)).toBe(0.00) // 0.0001 → 0.00
    })
  })

  describe('实际业务场景测试', () => {
    it('应该正确处理3人AA制分账', () => {
      const total = 100.00
      const perPerson = AmountUtil.divide(total, 3)
      const rounded = AmountUtil.toNumber(perPerson)
      expect(rounded).toBe(33.33)

      // 验证总和
      const sum = AmountUtil.sum([rounded, rounded, rounded])
      expect(AmountUtil.toNumber(sum)).toBe(99.99) // 允许0.01误差
    })

    it('应该正确处理基金池余额计算', () => {
      const contribution = 1000000.00 // 基金缴纳
      const expense = 999999.99 // 支出
      const balance = AmountUtil.subtract(contribution, expense)
      expect(AmountUtil.toNumber(balance)).toBe(0.01)
    })

    it('应该正确处理百分比分摊', () => {
      const total = 1000.00
      const percentage = 33.33 // 33.33%
      const share = AmountUtil.divide(AmountUtil.multiply(total, percentage), 100)
      expect(AmountUtil.toNumber(share)).toBe(333.30)
    })

    it('应该正确处理复杂余额计算', () => {
      // 余额 = 基金缴纳 + 垫付 - 分摊
      const contribution = 500.00
      const paid = 300.00  
      const share = 250.00
      
      const balance = AmountUtil.subtract(
        AmountUtil.add(contribution, paid),
        share
      )
      expect(AmountUtil.toNumber(balance)).toBe(550.00)
    })
  })
})
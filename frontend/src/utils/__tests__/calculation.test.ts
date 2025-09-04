import { describe, it, expect } from 'vitest'
import {
  calculateTotalExpenses,
  calculateAveragePerPerson,
  calculateUserBalance,
  groupExpensesByDate,
  groupExpensesByCategory
} from '../calculation'
import { Expense } from '@/types'

describe('Calculation Utils - 精度测试', () => {
  describe('calculateTotalExpenses - 使用Decimal求和', () => {
    it('应该精确计算支出总额', () => {
      const expenses: Expense[] = [
        { amount: 0.1 } as Expense,
        { amount: 0.2 } as Expense,
        { amount: 0.3 } as Expense
      ]
      
      const total = calculateTotalExpenses(expenses)
      expect(total).toBe(0.6) // 0.1 + 0.2 + 0.3 = 0.6
    })

    it('应该处理大金额求和', () => {
      const expenses: Expense[] = [
        { amount: 9999999.99 } as Expense,
        { amount: 0.01 } as Expense
      ]
      
      const total = calculateTotalExpenses(expenses)
      expect(total).toBe(10000000.00)
    })

    it('应该处理空数组', () => {
      const total = calculateTotalExpenses([])
      expect(total).toBe(0)
    })
  })

  describe('calculateAveragePerPerson - 精度保持', () => {
    it('应该精确计算人均金额', () => {
      const total = 100
      const memberCount = 3
      
      const average = calculateAveragePerPerson(total, memberCount)
      expect(average).toBe(33.33) // 100 / 3 = 33.333... → 33.33
    })

    it('应该处理不能整除的情况', () => {
      const total = 1000
      const memberCount = 7
      
      const average = calculateAveragePerPerson(total, memberCount)
      expect(average).toBe(142.86) // 1000 / 7 = 142.857... → 142.86
    })

    it('应该处理成员数为0的情况', () => {
      const average = calculateAveragePerPerson(100, 0)
      expect(average).toBe(0)
    })
  })

  describe('calculateUserBalance - 复杂计算精度', () => {
    it('应该精确计算用户余额', () => {
      const memberId = 'member1'
      const expenses: Expense[] = [
        {
          id: '1',
          amount: 300.00,
          payerMemberId: 'member1',
          participants: [
            { tripMemberId: 'member1', shareAmount: 100.00 },
            { tripMemberId: 'member2', shareAmount: 100.00 },
            { tripMemberId: 'member3', shareAmount: 100.00 }
          ]
        } as any,
        {
          id: '2',
          amount: 150.00,
          payerMemberId: 'member2',
          participants: [
            { tripMemberId: 'member1', shareAmount: 50.00 },
            { tripMemberId: 'member2', shareAmount: 50.00 },
            { tripMemberId: 'member3', shareAmount: 50.00 }
          ]
        } as any
      ]
      
      // member1: 支付300，分摊150 (100+50) = 余额150
      const balance = calculateUserBalance(memberId, expenses, 3)
      expect(balance).toBe(150.00)
    })

    it('应该处理百分比分摊', () => {
      const memberId = 'member1'
      const expenses: Expense[] = [
        {
          id: '1',
          amount: 1000.00,
          payerMemberId: 'member1',
          participants: [
            { tripMemberId: 'member1', sharePercentage: 33.33 }, // 333.30
            { tripMemberId: 'member2', sharePercentage: 33.33 },
            { tripMemberId: 'member3', sharePercentage: 33.34 }
          ]
        } as any
      ]
      
      // member1: 支付1000，分摊333.30 = 余额666.70
      const balance = calculateUserBalance(memberId, expenses, 3)
      expect(balance).toBe(666.70)
    })

    it('应该处理默认平均分摊', () => {
      const memberId = 'member1'
      const expenses: Expense[] = [
        {
          id: '1',
          amount: 100.00,
          payerMemberId: 'member2',
          participants: [] // 无参与者信息，默认平均分摊
        } as any
      ]
      
      // 3人平均分摊，member1分摊33.33
      const balance = calculateUserBalance(memberId, expenses, 3)
      expect(balance).toBe(-33.33)
    })

    it('应该精确处理小数分摊', () => {
      const memberId = 'member1'
      const expenses: Expense[] = [
        {
          id: '1',
          amount: 0.30,
          payerMemberId: 'member1',
          participants: [
            { tripMemberId: 'member1', shareAmount: 0.10 },
            { tripMemberId: 'member2', shareAmount: 0.10 },
            { tripMemberId: 'member3', shareAmount: 0.10 }
          ]
        } as any,
        {
          id: '2',
          amount: 0.15,
          payerMemberId: 'member2',
          participants: [
            { tripMemberId: 'member1', shareAmount: 0.05 },
            { tripMemberId: 'member2', shareAmount: 0.05 },
            { tripMemberId: 'member3', shareAmount: 0.05 }
          ]
        } as any
      ]
      
      // member1: 支付0.30，分摊0.15 (0.10+0.05) = 余额0.15
      const balance = calculateUserBalance(memberId, expenses, 3)
      expect(balance).toBe(0.15)
    })
  })

  describe('精度边界测试', () => {
    it('应该处理JavaScript浮点数问题', () => {
      // 测试0.1 + 0.2问题
      const expenses: Expense[] = [
        { amount: 0.1 } as Expense,
        { amount: 0.2 } as Expense
      ]
      
      const total = calculateTotalExpenses(expenses)
      expect(total).toBe(0.3) // 不应该是0.30000000000000004
    })

    it('应该处理极大值计算', () => {
      const expenses: Expense[] = [
        {
          id: '1',
          amount: 9999999.99,
          payerMemberId: 'member1',
          participants: [
            { tripMemberId: 'member1', shareAmount: 3333333.33 },
            { tripMemberId: 'member2', shareAmount: 3333333.33 },
            { tripMemberId: 'member3', shareAmount: 3333333.33 }
          ]
        } as any
      ]
      
      const balance = calculateUserBalance('member1', expenses, 3)
      expect(balance).toBe(6666666.66) // 9999999.99 - 3333333.33 = 6666666.66
    })

    it('应该处理极小值计算', () => {
      const expenses: Expense[] = [
        { amount: 0.01 } as Expense,
        { amount: 0.01 } as Expense,
        { amount: 0.01 } as Expense
      ]
      
      const total = calculateTotalExpenses(expenses)
      expect(total).toBe(0.03)
      
      const average = calculateAveragePerPerson(total, 3)
      expect(average).toBe(0.01)
    })
  })

  describe('groupExpensesByDate', () => {
    it('应该按日期分组支出', () => {
      const expenses: Expense[] = [
        { id: '1', expenseDate: '2024-01-01T10:00:00Z', amount: 100 } as any,
        { id: '2', expenseDate: '2024-01-01T14:00:00Z', amount: 200 } as any,
        { id: '3', expenseDate: '2024-01-02T09:00:00Z', amount: 150 } as any
      ]
      
      const grouped = groupExpensesByDate(expenses)
      expect(grouped.size).toBe(2)
      expect(grouped.get('2024-01-01')?.length).toBe(2)
      expect(grouped.get('2024-01-02')?.length).toBe(1)
    })
  })

  describe('groupExpensesByCategory', () => {
    it('应该按分类分组并计算统计', () => {
      const expenses: Expense[] = [
        { id: '1', category: { id: 'food', name: '餐饮' }, amount: 100 } as any,
        { id: '2', category: { id: 'food', name: '餐饮' }, amount: 150 } as any,
        { id: '3', category: { id: 'transport', name: '交通' }, amount: 200 } as any,
        { id: '4', amount: 50 } as any // 无分类
      ]
      
      const grouped = groupExpensesByCategory(expenses)
      
      // 餐饮分类
      const food = grouped.get('food')
      expect(food?.amount).toBe(250) // 100 + 150
      expect(food?.count).toBe(2)
      expect(food?.percentage).toBeCloseTo(50, 1) // 250/500 = 50%
      
      // 交通分类
      const transport = grouped.get('transport')
      expect(transport?.amount).toBe(200)
      expect(transport?.count).toBe(1)
      expect(transport?.percentage).toBeCloseTo(40, 1) // 200/500 = 40%
      
      // 未分类
      const uncategorized = grouped.get('uncategorized')
      expect(uncategorized?.amount).toBe(50)
      expect(uncategorized?.count).toBe(1)
      expect(uncategorized?.percentage).toBeCloseTo(10, 1) // 50/500 = 10%
    })
  })

  describe('实际场景测试', () => {
    it('应该正确处理真实的AA制场景', () => {
      // 3人吃饭，总额298.50元，AA制
      const totalAmount = 298.50
      const memberCount = 3
      
      // 计算人均
      const perPerson = calculateAveragePerPerson(totalAmount, memberCount)
      expect(perPerson).toBe(99.50) // 298.50 / 3 = 99.50
      
      // 创建支出
      const expenses: Expense[] = [
        {
          id: '1',
          amount: totalAmount,
          payerMemberId: 'member1', // member1付全款
          participants: [
            { tripMemberId: 'member1', shareAmount: perPerson },
            { tripMemberId: 'member2', shareAmount: perPerson },
            { tripMemberId: 'member3', shareAmount: perPerson }
          ]
        } as any
      ]
      
      // 计算各自余额
      const balance1 = calculateUserBalance('member1', expenses, memberCount)
      const balance2 = calculateUserBalance('member2', expenses, memberCount)
      const balance3 = calculateUserBalance('member3', expenses, memberCount)
      
      expect(balance1).toBe(199.00) // 付298.50，分摊99.50 = 199.00
      expect(balance2).toBe(-99.50) // 付0，分摊99.50 = -99.50
      expect(balance3).toBe(-99.50) // 付0，分摊99.50 = -99.50
      
      // 验证总和为0
      expect(balance1 + balance2 + balance3).toBe(0)
    })

    it('应该正确处理复杂的多人多笔支出', () => {
      const expenses: Expense[] = [
        // 第一天：交通费
        {
          id: '1',
          amount: 450.00,
          payerMemberId: 'member1',
          participants: [
            { tripMemberId: 'member1', shareAmount: 150.00 },
            { tripMemberId: 'member2', shareAmount: 150.00 },
            { tripMemberId: 'member3', shareAmount: 150.00 }
          ]
        } as any,
        // 第二天：住宿费
        {
          id: '2',
          amount: 600.00,
          payerMemberId: 'member2',
          participants: [
            { tripMemberId: 'member1', shareAmount: 200.00 },
            { tripMemberId: 'member2', shareAmount: 200.00 },
            { tripMemberId: 'member3', shareAmount: 200.00 }
          ]
        } as any,
        // 第三天：餐费
        {
          id: '3',
          amount: 180.50,
          payerMemberId: 'member3',
          participants: [
            { tripMemberId: 'member1', shareAmount: 60.17 },
            { tripMemberId: 'member2', shareAmount: 60.17 },
            { tripMemberId: 'member3', shareAmount: 60.16 }
          ]
        } as any
      ]
      
      // 计算总支出
      const total = calculateTotalExpenses(expenses)
      expect(total).toBe(1230.50)
      
      // 计算人均
      const average = calculateAveragePerPerson(total, 3)
      expect(average).toBe(410.17)
      
      // 计算各自余额
      const balance1 = calculateUserBalance('member1', expenses, 3)
      const balance2 = calculateUserBalance('member2', expenses, 3)  
      const balance3 = calculateUserBalance('member3', expenses, 3)
      
      // member1: 付450，分摊410.17 = 39.83
      expect(Math.abs(balance1 - 39.83)).toBeLessThan(0.01)
      
      // member2: 付600，分摊410.17 = 189.83
      expect(Math.abs(balance2 - 189.83)).toBeLessThan(0.01)
      
      // member3: 付180.50，分摊410.16 = -229.66
      expect(Math.abs(balance3 - (-229.66))).toBeLessThan(0.01)
      
      // 验证总和接近0（允许小误差）
      expect(Math.abs(balance1 + balance2 + balance3)).toBeLessThan(0.01)
    })
  })
})
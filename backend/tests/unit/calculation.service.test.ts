import { CalculationService } from '../../src/services/calculation.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const calculationService = new CalculationService()

describe('CalculationService', () => {
  let testTripId: string
  let testMembers: any[] = []

  beforeAll(async () => {
    // 清理测试数据
    await prisma.expenseParticipant.deleteMany()
    await prisma.expense.deleteMany()
    await prisma.tripMember.deleteMany()
    await prisma.trip.deleteMany()
    await prisma.user.deleteMany()

    // 创建测试用户
    const users = await Promise.all([
      prisma.user.create({
        data: {
          username: 'test_zhang',
          email: 'zhang@test.com',
          password: 'hashed'
        }
      }),
      prisma.user.create({
        data: {
          username: 'test_li',
          email: 'li@test.com',
          password: 'hashed'
        }
      })
    ])

    // 创建测试行程
    const trip = await prisma.trip.create({
      data: {
        name: '测试旅行',
        description: '单元测试',
        startDate: new Date(),
        currency: 'CNY',
        initialFund: 1500
      }
    })
    testTripId = trip.id

    // 创建测试成员
    testMembers = await Promise.all([
      prisma.tripMember.create({
        data: {
          tripId: testTripId,
          userId: users[0].id,
          role: 'admin',
          contribution: 1000,
          isActive: true
        }
      }),
      prisma.tripMember.create({
        data: {
          tripId: testTripId,
          userId: users[1].id,
          role: 'member',
          contribution: 500,
          isActive: true
        }
      }),
      // 虚拟成员
      prisma.tripMember.create({
        data: {
          tripId: testTripId,
          displayName: '虚拟王五',
          role: 'member',
          contribution: 0,
          isVirtual: true,
          isActive: true
        }
      })
    ])
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.expenseParticipant.deleteMany()
    await prisma.expense.deleteMany()
    await prisma.tripMember.deleteMany()
    await prisma.trip.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('calculateBalances', () => {
    it('应该正确计算成员余额 (基金缴纳 + 垫付 - 分摊)', async () => {
      // 创建测试支出 - 张三垫付600，三人平分
      const expense1 = await prisma.expense.create({
        data: {
          tripId: testTripId,
          amount: 600,
          description: '晚餐',
          expenseDate: new Date(),
          payerId: testMembers[0].id,
          isPaidFromFund: false,
          participants: {
            create: [
              { tripMemberId: testMembers[0].id, shareAmount: 200 },
              { tripMemberId: testMembers[1].id, shareAmount: 200 },
              { tripMemberId: testMembers[2].id, shareAmount: 200 }
            ]
          }
        }
      })

      // 创建测试支出 - 李四垫付300，三人平分
      const expense2 = await prisma.expense.create({
        data: {
          tripId: testTripId,
          amount: 300,
          description: '打车',
          expenseDate: new Date(),
          payerId: testMembers[1].id,
          isPaidFromFund: false,
          participants: {
            create: [
              { tripMemberId: testMembers[0].id, shareAmount: 100 },
              { tripMemberId: testMembers[1].id, shareAmount: 100 },
              { tripMemberId: testMembers[2].id, shareAmount: 100 }
            ]
          }
        }
      })

      const balances = await calculationService.calculateBalances(testTripId)

      // 张三: 1000(基金) + 600(垫付) - 300(分摊) = 1300
      const zhangBalance = balances.find(b => b.memberId === testMembers[0].id)
      expect(zhangBalance?.balance).toBe(1300)
      expect(zhangBalance?.contribution).toBe(1000)
      expect(zhangBalance?.totalPaid).toBe(600)
      expect(zhangBalance?.totalShare).toBe(300)

      // 李四: 500(基金) + 300(垫付) - 300(分摊) = 500
      const liBalance = balances.find(b => b.memberId === testMembers[1].id)
      expect(liBalance?.balance).toBe(500)
      expect(liBalance?.contribution).toBe(500)
      expect(liBalance?.totalPaid).toBe(300)
      expect(liBalance?.totalShare).toBe(300)

      // 王五(虚拟): 0(基金) + 0(垫付) - 300(分摊) = -300
      const wangBalance = balances.find(b => b.memberId === testMembers[2].id)
      expect(wangBalance?.balance).toBe(-300)
      expect(wangBalance?.contribution).toBe(0)
      expect(wangBalance?.totalPaid).toBe(0)
      expect(wangBalance?.totalShare).toBe(300)

      // 清理创建的支出
      await prisma.expense.deleteMany({
        where: { id: { in: [expense1.id, expense2.id] } }
      })
    })

    it('应该正确处理基金池支付的支出', async () => {
      // 创建基金池支付的支出
      const expense = await prisma.expense.create({
        data: {
          tripId: testTripId,
          amount: 600,
          description: '景点门票',
          expenseDate: new Date(),
          payerId: testMembers[0].id, // 管理员从基金池支付
          isPaidFromFund: true,
          participants: {
            create: [
              { tripMemberId: testMembers[0].id, shareAmount: 300 },
              { tripMemberId: testMembers[1].id, shareAmount: 300 }
            ]
          }
        }
      })

      const balances = await calculationService.calculateBalances(testTripId)

      // 张三: 1000(基金) + 0(基金池支付不计垫付) - 300(分摊) = 700
      const zhangBalance = balances.find(b => b.memberId === testMembers[0].id)
      expect(zhangBalance?.balance).toBe(700)
      expect(zhangBalance?.totalPaid).toBe(0) // 基金池支付不算个人垫付

      // 李四: 500(基金) + 0 - 300(分摊) = 200
      const liBalance = balances.find(b => b.memberId === testMembers[1].id)
      expect(liBalance?.balance).toBe(200)

      // 清理
      await prisma.expense.delete({ where: { id: expense.id } })
    })
  })

  describe('optimizeSettlements', () => {
    it('应该优化债务关系，减少交易次数', async () => {
      // 创建会产生复杂债务关系的支出
      const expenses = await Promise.all([
        // 张三付了500，只有李四参与
        prisma.expense.create({
          data: {
            tripId: testTripId,
            amount: 500,
            description: '测试1',
            expenseDate: new Date(),
            payerId: testMembers[0].id,
            isPaidFromFund: false,
            participants: {
              create: [
                { tripMemberId: testMembers[0].id, shareAmount: 250 },
                { tripMemberId: testMembers[1].id, shareAmount: 250 }
              ]
            }
          }
        }),
        // 李四付了300，只有王五参与
        prisma.expense.create({
          data: {
            tripId: testTripId,
            amount: 300,
            description: '测试2',
            expenseDate: new Date(),
            payerId: testMembers[1].id,
            isPaidFromFund: false,
            participants: {
              create: [
                { tripMemberId: testMembers[1].id, shareAmount: 150 },
                { tripMemberId: testMembers[2].id, shareAmount: 150 }
              ]
            }
          }
        })
      ])

      const settlements = await calculationService.optimizeSettlements(testTripId)

      // 应该产生优化后的结算方案
      expect(settlements).toBeDefined()
      expect(Array.isArray(settlements)).toBe(true)
      
      // 验证结算总金额平衡
      const totalDebts = settlements.reduce((sum, s) => {
        return s.fromMemberId === testMembers[2].id ? sum + s.amount : sum
      }, 0)
      
      const totalCredits = settlements.reduce((sum, s) => {
        return s.toMemberId === testMembers[0].id ? sum + s.amount : sum
      }, 0)

      // 总债务应该等于总债权（允许浮点误差）
      expect(Math.abs(totalDebts - totalCredits)).toBeLessThan(0.01)

      // 清理
      await prisma.expense.deleteMany({
        where: { id: { in: expenses.map(e => e.id) } }
      })
    })
  })

  describe('getTripStatistics', () => {
    it('应该返回完整的行程统计信息', async () => {
      // 创建一些测试支出
      const expense = await prisma.expense.create({
        data: {
          tripId: testTripId,
          amount: 900,
          description: '统计测试',
          expenseDate: new Date(),
          payerId: testMembers[0].id,
          isPaidFromFund: true,
          participants: {
            create: [
              { tripMemberId: testMembers[0].id, shareAmount: 300 },
              { tripMemberId: testMembers[1].id, shareAmount: 300 },
              { tripMemberId: testMembers[2].id, shareAmount: 300 }
            ]
          }
        }
      })

      const stats = await calculationService.getTripStatistics(testTripId)

      expect(stats).toHaveProperty('totalExpenses')
      expect(stats).toHaveProperty('expenseCount')
      expect(stats).toHaveProperty('averageExpense')
      expect(stats).toHaveProperty('fundStatus')
      expect(stats).toHaveProperty('membersFinancialStatus')

      // 验证基金池状态
      expect(stats.fundStatus.totalContributions).toBe(1500) // 1000 + 500
      expect(stats.fundStatus.totalExpensesFromFund).toBe(900)
      expect(stats.fundStatus.fundBalance).toBe(600) // 1500 - 900

      // 验证成员财务状态
      expect(stats.membersFinancialStatus).toHaveLength(3)
      
      const zhangStatus = stats.membersFinancialStatus.find(
        m => m.memberId === testMembers[0].id
      )
      expect(zhangStatus?.contribution).toBe(1000)
      expect(zhangStatus?.balance).toBe(700) // 1000 - 300

      // 清理
      await prisma.expense.delete({ where: { id: expense.id } })
    })
  })
})
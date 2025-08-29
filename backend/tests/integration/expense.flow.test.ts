import { PrismaClient } from '@prisma/client'
import { ExpenseService } from '../../src/services/expense.service'
import { CalculationService } from '../../src/services/calculation.service'

const prisma = new PrismaClient()

describe('Expense Flow Integration Tests', () => {
  let tripId: string
  let members: any[]
  let expenseService: ExpenseService

  beforeAll(async () => {
    // 清理测试数据
    await prisma.expense.deleteMany()
    await prisma.tripMember.deleteMany()
    await prisma.trip.deleteMany()
    await prisma.user.deleteMany()

    // 创建测试用户
    const users = await Promise.all([
      prisma.user.create({
        data: {
          username: 'testuser1',
          email: 'test1@example.com',
          password: 'hashedpassword'
        }
      }),
      prisma.user.create({
        data: {
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'hashedpassword'
        }
      })
    ])

    // 创建测试行程
    const trip = await prisma.trip.create({
      data: {
        name: '测试旅行',
        description: '集成测试用行程',
        startDate: new Date(),
        currency: 'CNY',
        initialFund: 1500
      }
    })
    tripId = trip.id

    // 添加成员
    members = await Promise.all([
      prisma.tripMember.create({
        data: {
          tripId,
          userId: users[0].id,
          role: 'admin',
          contribution: 1000
        }
      }),
      prisma.tripMember.create({
        data: {
          tripId,
          userId: users[1].id,
          role: 'member',
          contribution: 500
        }
      }),
      // 添加虚拟成员
      prisma.tripMember.create({
        data: {
          tripId,
          userId: null,
          displayName: '虚拟成员小王',
          role: 'member',
          contribution: 0,
          isVirtual: true
        }
      })
    ])

    expenseService = new ExpenseService()
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.expense.deleteMany()
    await prisma.tripMember.deleteMany()
    await prisma.trip.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('完整的支出创建到余额更新流程', () => {
    it('应该正确创建支出并更新余额', async () => {
      // 创建支出
      const expenseData = {
        tripId,
        amount: 300,
        description: '晚餐',
        expenseDate: new Date(),
        payerId: members[0].id, // 管理员支付
        isPaidFromFund: true,
        participants: members.map(m => ({
          memberId: m.id,
          shareAmount: 100 // 每人100
        }))
      }

      const expense = await expenseService.createExpense(expenseData)

      expect(expense.id).toBeDefined()
      expect(expense.amount).toBe(300)
      expect(expense.isPaidFromFund).toBe(true)

      // 验证参与者
      const participants = await prisma.expenseParticipant.findMany({
        where: { expenseId: expense.id }
      })
      expect(participants.length).toBe(3)

      // 计算余额
      const allExpenses = await prisma.expense.findMany({
        where: { tripId },
        include: {
          participants: true
        }
      })

      const balances = CalculationService.calculateBalances(members, allExpenses)

      // 管理员: 1000(基金) - 100(分摊) = 900
      expect(balances[members[0].id]).toBe(900)
      
      // 普通成员: 500(基金) - 100(分摊) = 400
      expect(balances[members[1].id]).toBe(400)
      
      // 虚拟成员: 0(基金) - 100(分摊) = -100
      expect(balances[members[2].id]).toBe(-100)
    })

    it('应该正确处理个人垫付的支出', async () => {
      const expenseData = {
        tripId,
        amount: 450,
        description: '门票',
        expenseDate: new Date(),
        payerId: members[1].id, // 普通成员支付
        isPaidFromFund: false, // 个人垫付
        participants: members.map(m => ({
          memberId: m.id,
          shareAmount: 150
        }))
      }

      const expense = await expenseService.createExpense(expenseData)

      expect(expense.isPaidFromFund).toBe(false)

      // 重新计算余额
      const allExpenses = await prisma.expense.findMany({
        where: { tripId },
        include: {
          participants: true
        }
      })

      const balances = CalculationService.calculateBalances(members, allExpenses)

      // 管理员: 1000(基金) - 250(总分摊) = 750
      expect(balances[members[0].id]).toBe(750)
      
      // 普通成员: 500(基金) + 450(垫付) - 250(总分摊) = 700
      expect(balances[members[1].id]).toBe(700)
      
      // 虚拟成员: 0(基金) - 250(总分摊) = -250
      expect(balances[members[2].id]).toBe(-250)
    })

    it('应该正确计算基金池状态', async () => {
      const allExpenses = await prisma.expense.findMany({
        where: { tripId }
      })

      const fundStatus = CalculationService.calculateFundPoolStatus(members, allExpenses)

      expect(fundStatus.totalContributions).toBe(1500) // 1000 + 500
      expect(fundStatus.totalExpensesFromFund).toBe(300) // 第一笔支出
      expect(fundStatus.totalReimbursements).toBe(450) // 第二笔支出
      expect(fundStatus.fundBalance).toBe(1200) // 1500 - 300
    })
  })

  describe('并发操作测试', () => {
    it('应该正确处理并发创建支出', async () => {
      const createExpense = (index: number) => {
        return expenseService.createExpense({
          tripId,
          amount: 100 * index,
          description: `并发测试${index}`,
          expenseDate: new Date(),
          payerId: members[0].id,
          isPaidFromFund: false,
          participants: [{
            memberId: members[0].id,
            shareAmount: 100 * index
          }]
        })
      }

      // 并发创建5个支出
      const promises = Array.from({ length: 5 }, (_, i) => createExpense(i + 1))
      const expenses = await Promise.all(promises)

      expect(expenses.length).toBe(5)
      
      // 验证所有支出都被正确创建
      const allExpenses = await prisma.expense.findMany({
        where: { 
          tripId,
          description: { startsWith: '并发测试' }
        }
      })
      
      expect(allExpenses.length).toBe(5)
    })
  })

  describe('错误处理', () => {
    it('应该拒绝创建无效的支出', async () => {
      await expect(
        expenseService.createExpense({
          tripId,
          amount: -100, // 负数金额
          description: '无效支出',
          expenseDate: new Date(),
          payerId: members[0].id,
          isPaidFromFund: false,
          participants: []
        })
      ).rejects.toThrow()
    })

    it('应该拒绝不存在的付款人', async () => {
      await expect(
        expenseService.createExpense({
          tripId,
          amount: 100,
          description: '无效付款人',
          expenseDate: new Date(),
          payerId: 'invalid-member-id',
          isPaidFromFund: false,
          participants: [{
            memberId: members[0].id,
            shareAmount: 100
          }]
        })
      ).rejects.toThrow()
    })
  })
})
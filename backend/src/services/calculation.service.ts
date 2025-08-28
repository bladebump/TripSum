import { PrismaClient } from '@prisma/client'
import { BalanceCalculation, Settlement } from '../types'

const prisma = new PrismaClient()

export class CalculationService {
  async calculateBalances(tripId: string): Promise<BalanceCalculation[]> {
    const [members, expenses] = await Promise.all([
      prisma.tripMember.findMany({
        where: { tripId, isActive: true },
        include: { user: true },
      }),
      prisma.expense.findMany({
        where: { tripId },
        include: {
          payerMember: {
            include: {
              user: true
            }
          },
          participants: {
            include: {
              tripMember: {
                include: {
                  user: true
                }
              }
            }
          },
        },
      }),
    ])

    const balanceMap = new Map<string, BalanceCalculation>()

    // 为所有成员创建余额记录（虚拟成员和真实成员完全一样）
    for (const member of members) {
      const memberId = member.id // 统一使用 TripMember.id 作为标识
      const username = member.isVirtual 
        ? (member.displayName || '虚拟成员')
        : (member.user?.username || 'Unknown')
      
      balanceMap.set(memberId, {
        userId: memberId, // 实际上是 memberId，但保持接口兼容
        username: username,
        contribution: member.contribution.toNumber(), // 基金缴纳
        totalPaid: 0, // 实际垫付
        totalShare: 0, // 应该分摊
        balance: 0,
        owesTo: [],
        owedBy: [],
      })
    }

    // 处理所有支出（虚拟成员和真实成员完全一样）
    for (const expense of expenses) {
      // 只计算支出（正数），不计算收入（负数）
      if (expense.amount.toNumber() > 0) {
        // 非基金池支付计入个人垫付（所有成员包括虚拟成员都可以垫付）
        if (!expense.isPaidFromFund && expense.payerMember) {
          const payer = balanceMap.get(expense.payerMember.id)
          if (payer) {
            payer.totalPaid += expense.amount.toNumber()
          }
        }

        // 所有参与者分摊（虚拟成员和真实成员完全一样）
        for (const participant of expense.participants) {
          if (!participant.tripMemberId) continue // 跳过无效记录
          const member = balanceMap.get(participant.tripMemberId)
          if (member && participant.shareAmount) {
            member.totalShare += participant.shareAmount.toNumber()
          }
        }
      }
    }

    // 计算余额（所有成员使用相同公式）
    for (const balance of balanceMap.values()) {
      // 余额 = 基金缴纳 + 实际垫付 - 应该分摊
      balance.balance = balance.contribution + balance.totalPaid - balance.totalShare
    }

    const balances = Array.from(balanceMap.values())
    
    // 所有成员（包括虚拟成员）都参与债务关系计算
    this.calculateDebts(balances)

    return balances
  }

  private calculateDebts(balances: BalanceCalculation[]) {
    const creditors = balances
      .filter((b) => b.balance > 0)
      .sort((a, b) => b.balance - a.balance)
    
    const debtors = balances
      .filter((b) => b.balance < 0)
      .sort((a, b) => a.balance - b.balance)

    for (const debtor of debtors) {
      let remainingDebt = Math.abs(debtor.balance)

      for (const creditor of creditors) {
        if (remainingDebt <= 0.01) break
        if (creditor.balance <= 0.01) continue

        const amount = Math.min(remainingDebt, creditor.balance)
        
        debtor.owesTo.push({
          userId: creditor.userId,
          username: creditor.username,
          amount: Math.round(amount * 100) / 100,
        })

        creditor.owedBy.push({
          userId: debtor.userId,
          username: debtor.username,
          amount: Math.round(amount * 100) / 100,
        })

        creditor.balance -= amount
        remainingDebt -= amount
      }
    }
  }

  async calculateSettlement(tripId: string): Promise<Settlement[]> {
    const balances = await this.calculateBalances(tripId)
    const settlements: Settlement[] = []

    for (const balance of balances) {
      for (const debt of balance.owesTo) {
        settlements.push({
          from: {
            userId: balance.userId,
            username: balance.username,
          },
          to: {
            userId: debt.userId,
            username: debt.username,
          },
          amount: debt.amount,
        })
      }
    }

    return settlements
  }

  async createSettlements(tripId: string, settlements: Array<{
    fromUserId: string
    toUserId: string
    amount: number
  }>) {
    const createdSettlements = await prisma.settlement.createMany({
      data: settlements.map((s) => ({
        tripId,
        fromUserId: s.fromUserId,
        toUserId: s.toUserId,
        amount: s.amount,
      })),
    })

    return createdSettlements
  }

  async markSettlementAsPaid(settlementId: string) {
    const settlement = await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        isSettled: true,
        settledAt: new Date(),
      },
    })

    return settlement
  }

  async getTripStatistics(tripId: string) {
    const [expenses, categories, trip] = await Promise.all([
      prisma.expense.findMany({
        where: { tripId },
        include: {
          category: true,
        },
      }),
      prisma.category.findMany({
        where: { tripId },
      }),
      prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          members: {
            where: { isActive: true }
          }
        }
      })
    ])

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + exp.amount.toNumber(),
      0
    )
    
    // 计算基金池状态
    const totalContributions = trip?.members.reduce(
      (sum, member) => sum + member.contribution.toNumber(),
      0
    ) || 0
    
    const fundExpenses = expenses.filter(e => e.isPaidFromFund).reduce(
      (sum, exp) => sum + exp.amount.toNumber(),
      0
    )
    
    const memberPaidExpenses = expenses.filter(e => !e.isPaidFromFund).reduce(
      (sum, exp) => sum + exp.amount.toNumber(),
      0
    )

    const categoryMap = new Map<string, { name: string; amount: number }>()
    
    for (const category of categories) {
      categoryMap.set(category.id, { name: category.name, amount: 0 })
    }

    for (const expense of expenses) {
      if (expense.categoryId) {
        const cat = categoryMap.get(expense.categoryId)
        if (cat) {
          cat.amount += expense.amount.toNumber()
        }
      }
    }

    const categoryBreakdown = Array.from(categoryMap.entries())
      .filter(([, data]) => data.amount > 0)
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        amount: data.amount,
        percentage: (data.amount / totalExpenses) * 100,
      }))
      .sort((a, b) => b.amount - a.amount)

    const dailyMap = new Map<string, { amount: number; count: number }>()
    
    for (const expense of expenses) {
      const dateKey = expense.expenseDate.toISOString().split('T')[0]
      const daily = dailyMap.get(dateKey) || { amount: 0, count: 0 }
      daily.amount += expense.amount.toNumber()
      daily.count += 1
      dailyMap.set(dateKey, daily)
    }

    const dailyExpenses = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const members = await prisma.tripMember.count({
      where: { tripId, isActive: true },
    })

    return {
      totalExpenses,
      expenseCount: expenses.length,
      averagePerPerson: members > 0 ? totalExpenses / members : 0,
      categoryBreakdown,
      dailyExpenses,
      fundStatus: {
        totalContributions,      // 总缴纳
        fundExpenses,           // 基金池支出
        memberPaidExpenses,     // 成员垫付
        currentBalance: totalContributions - fundExpenses - memberPaidExpenses  // 基金池余额
      }
    }
  }
}

export const calculationService = new CalculationService()
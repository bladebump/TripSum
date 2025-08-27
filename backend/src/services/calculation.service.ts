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
          participants: true,
        },
      }),
    ])

    const balanceMap = new Map<string, BalanceCalculation>()

    for (const member of members) {
      if (!member.userId || !member.user) continue // 跳过虚拟成员
      
      balanceMap.set(member.userId, {
        userId: member.userId,
        username: member.user.username,
        contribution: member.contribution.toNumber(), // 基金缴纳
        totalPaid: 0, // 实际支付（为团队垫付的）
        totalShare: 0, // 应该分摊
        balance: 0,
        owesTo: [],
        owedBy: [],
      })
    }

    for (const expense of expenses) {
      // 只计算支出（正数），不计算收入（负数）
      if (expense.amount.toNumber() > 0) {
        const payer = balanceMap.get(expense.payerId)
        if (payer) {
          payer.totalPaid += expense.amount.toNumber()
        }

        for (const participant of expense.participants) {
          if (!participant.userId) continue // 跳过虚拟成员
          const user = balanceMap.get(participant.userId)
          if (user && participant.shareAmount) {
            user.totalShare += participant.shareAmount.toNumber()
          }
        }
      }
    }

    for (const balance of balanceMap.values()) {
      // 余额 = 基金缴纳 + 实际垫付 - 应该分摊
      balance.balance = balance.contribution + balance.totalPaid - balance.totalShare
    }

    const balances = Array.from(balanceMap.values())
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
    const [expenses, categories] = await Promise.all([
      prisma.expense.findMany({
        where: { tripId },
        include: {
          category: true,
        },
      }),
      prisma.category.findMany({
        where: { tripId },
      }),
    ])

    const totalExpenses = expenses.reduce(
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
    }
  }
}

export const calculationService = new CalculationService()
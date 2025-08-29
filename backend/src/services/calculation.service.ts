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
        memberId: memberId, // 统一使用memberId
        username: username,
        role: member.role, // 角色信息
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
    // 查找基金管理员（admin角色）
    const admin = balances.find(b => b.role === 'admin')
    
    // 创建旅程的人就是管理员，所以admin一定存在
    if (!admin) {
      throw new Error('未找到行程管理员，无法进行结算计算')
    }

    // 基金管理员中心化结算逻辑
    for (const member of balances) {
      // 跳过管理员自己
      if (member.memberId === admin.memberId) continue
      
      // 忽略小于0.01的余额（避免浮点数精度问题）
      if (Math.abs(member.balance) < 0.01) continue

      if (member.balance > 0) {
        // 成员有余额，管理员需要退款给成员
        const amount = Math.round(member.balance * 100) / 100
        
        admin.owesTo.push({
          memberId: member.memberId,
          username: member.username,
          amount: amount,
        })

        member.owedBy.push({
          memberId: admin.memberId,
          username: admin.username,
          amount: amount,
        })
      } else if (member.balance < 0) {
        // 成员欠款，需要补缴给管理员
        const amount = Math.round(Math.abs(member.balance) * 100) / 100
        
        member.owesTo.push({
          memberId: admin.memberId,
          username: admin.username,
          amount: amount,
        })

        admin.owedBy.push({
          memberId: member.memberId,
          username: member.username,
          amount: amount,
        })
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
            memberId: balance.memberId,  // 直接使用memberId
            username: balance.username,
          },
          to: {
            memberId: debt.memberId,     // 直接使用memberId
            username: debt.username,
          },
          amount: debt.amount,
        })
      }
    }

    return settlements
  }

  async createSettlements(tripId: string, settlements: Array<{
    fromMemberId: string
    toMemberId: string
    amount: number
  }>) {
    const createdSettlements = await prisma.settlement.createMany({
      data: settlements.map((s) => ({
        tripId,
        fromMemberId: s.fromMemberId,
        toMemberId: s.toMemberId,
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
    const [expenses, categories, trip, balances] = await Promise.all([
      prisma.expense.findMany({
        where: { tripId },
        include: {
          category: true,
          participants: {
            include: {
              tripMember: {
                include: {
                  user: true
                }
              }
            }
          },
          payerMember: {
            include: {
              user: true
            }
          }
        },
      }),
      prisma.category.findMany({
        where: { tripId },
      }),
      prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          members: {
            where: { isActive: true },
            include: {
              user: true
            }
          }
        }
      }),
      this.calculateBalances(tripId) // 获取余额计算结果
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

    // 构建成员财务状态映射
    const membersFinancialStatus = trip?.members.map(member => {
      const balance = balances.find(b => b.memberId === member.id)
      return {
        memberId: member.id,
        username: member.isVirtual 
          ? (member.displayName || '虚拟成员')
          : (member.user?.username || 'Unknown'),
        isVirtual: member.isVirtual,
        role: member.role,
        contribution: member.contribution.toNumber(),
        totalPaid: balance?.totalPaid || 0,
        totalShare: balance?.totalShare || 0,
        balance: balance?.balance || 0,
        // 参与的支出数量
        expenseCount: expenses.filter(e => 
          e.participants.some(p => p.tripMemberId === member.id)
        ).length,
        // 垫付的支出数量
        paidCount: expenses.filter(e => 
          e.payerMemberId === member.id && !e.isPaidFromFund
        ).length
      }
    }) || []

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

    const members = trip?.members.length || 0

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
        currentBalance: totalContributions - fundExpenses,  // 基金池余额（只减去基金池支出）
        fundUtilization: totalContributions > 0 
          ? (fundExpenses / totalContributions) * 100 
          : 0  // 基金池使用率
      },
      membersFinancialStatus,  // 新增：成员财务状态
      settlements: await this.calculateSettlement(tripId), // 结算建议
      lastUpdated: new Date()  // 最后更新时间
    }
  }
}

export const calculationService = new CalculationService()
import { PrismaClient } from '@prisma/client'
import { BalanceCalculation, Settlement } from '../types'
import AmountUtil from '../utils/decimal'

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
        contribution: AmountUtil.toNumber(AmountUtil.toDecimal(member.contribution)), // 基金缴纳
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
      if (AmountUtil.greaterThan(expense.amount, 0)) {
        // 非基金池支付计入个人垫付（所有成员包括虚拟成员都可以垫付）
        if (!expense.isPaidFromFund && expense.payerMember) {
          const payer = balanceMap.get(expense.payerMember.id)
          if (payer) {
            payer.totalPaid += AmountUtil.toNumber(AmountUtil.toDecimal(expense.amount))
          }
        }

        // 所有参与者分摊（虚拟成员和真实成员完全一样）
        for (const participant of expense.participants) {
          if (!participant.tripMemberId) continue // 跳过无效记录
          const member = balanceMap.get(participant.tripMemberId)
          if (member && participant.shareAmount) {
            member.totalShare += AmountUtil.toNumber(AmountUtil.toDecimal(participant.shareAmount))
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

    const totalExpenses = AmountUtil.toNumber(
      AmountUtil.sum(expenses.map(e => e.amount))
    )
    
    // 计算基金池状态
    const totalContributions = trip?.members ? AmountUtil.toNumber(
      AmountUtil.sum(trip.members.map(m => m.contribution))
    ) : 0
    
    const fundExpenses = AmountUtil.toNumber(
      AmountUtil.sum(expenses.filter(e => e.isPaidFromFund).map(e => e.amount))
    )
    
    const memberPaidExpenses = AmountUtil.toNumber(
      AmountUtil.sum(expenses.filter(e => !e.isPaidFromFund).map(e => e.amount))
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
        contribution: AmountUtil.toNumber(AmountUtil.toDecimal(member.contribution)),
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
    
    // 初始化已有分类
    for (const category of categories) {
      categoryMap.set(category.id, { name: category.name, amount: 0 })
    }
    
    // 添加一个"未分类"类别
    const uncategorizedId = 'uncategorized'
    categoryMap.set(uncategorizedId, { name: '未分类', amount: 0 })

    // 统计各分类支出
    for (const expense of expenses) {
      const catId = expense.categoryId || uncategorizedId
      const cat = categoryMap.get(catId)
      if (cat) {
        cat.amount += AmountUtil.toNumber(AmountUtil.toDecimal(expense.amount))
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
      daily.amount += AmountUtil.toNumber(AmountUtil.toDecimal(expense.amount))
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
    
    // 新增：高级统计指标
    const advancedMetrics = this.calculateAdvancedMetrics(expenses, trip, dailyExpenses, membersFinancialStatus)
    
    // 新增：时间维度分析
    const timeDistribution = this.analyzeTimeDistribution(expenses)
    
    // 新增：支付方式统计
    const paymentMethodStats = {
      fundPool: {
        count: expenses.filter(e => e.isPaidFromFund).length,
        amount: fundExpenses,
        percentage: totalExpenses > 0 ? (fundExpenses / totalExpenses) * 100 : 0
      },
      memberReimbursement: {
        count: expenses.filter(e => !e.isPaidFromFund).length,
        amount: memberPaidExpenses,
        percentage: totalExpenses > 0 ? (memberPaidExpenses / totalExpenses) * 100 : 0
      }
    }
    
    // 新增：异常消费检测
    const anomalies = this.detectAnomalies(expenses, advancedMetrics.dailyAverage)

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
      membersFinancialStatus,  // 成员财务状态
      settlements: await this.calculateSettlement(tripId), // 结算建议
      advancedMetrics,        // 新增：高级统计指标
      timeDistribution,       // 新增：时间分布分析
      paymentMethodStats,     // 新增：支付方式统计
      anomalies,             // 新增：异常消费提醒
      lastUpdated: new Date()  // 最后更新时间
    }
  }
  
  // 新增：计算高级统计指标
  private calculateAdvancedMetrics(expenses: any[], trip: any, dailyExpenses: any[], membersFinancialStatus: any[]) {
    const validExpenses = expenses.filter(e => AmountUtil.greaterThan(e.amount, 0))
    const totalDays = dailyExpenses.length || 1
    const totalMembers = trip?.members.length || 1
    const totalAmount = AmountUtil.toNumber(
      AmountUtil.sum(validExpenses.map(e => e.amount))
    )
    
    // 计算每个成员的人均消费
    const memberAverages = membersFinancialStatus.map(m => ({
      memberId: m.memberId,
      username: m.username,
      averageExpense: m.expenseCount > 0 ? m.totalShare / m.expenseCount : 0,
      dailyAverage: totalDays > 0 ? m.totalShare / totalDays : 0
    }))
    
    // 计算消费峰值
    const peakDay = dailyExpenses.reduce((peak, day) => 
      day.amount > (peak?.amount || 0) ? day : peak, 
      dailyExpenses[0]
    )
    
    // 计算消费趋势（简单线性回归）
    let trend = 'stable'
    if (dailyExpenses.length > 1) {
      const firstHalf = dailyExpenses.slice(0, Math.floor(dailyExpenses.length / 2))
      const secondHalf = dailyExpenses.slice(Math.floor(dailyExpenses.length / 2))
      const firstAvg = firstHalf.reduce((sum, d) => sum + d.amount, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, d) => sum + d.amount, 0) / secondHalf.length
      
      if (secondAvg > firstAvg * 1.2) trend = 'increasing'
      else if (secondAvg < firstAvg * 0.8) trend = 'decreasing'
    }
    
    return {
      // 人均消费
      averagePerPerson: totalAmount / totalMembers,
      // 日均消费
      dailyAverage: totalAmount / totalDays,
      // 单笔平均
      averagePerExpense: totalAmount / (validExpenses.length || 1),
      // 最高单笔
      maxExpense: AmountUtil.toNumber(
        AmountUtil.max(validExpenses.map(e => e.amount))
      ),
      // 最低单笔
      minExpense: validExpenses.length > 0 ? AmountUtil.toNumber(
        AmountUtil.min(validExpenses.map(e => e.amount))
      ) : 0,
      // 消费峰值日
      peakDay: peakDay ? {
        date: peakDay.date,
        amount: peakDay.amount,
        count: peakDay.count
      } : null,
      // 消费趋势
      trend,
      // 成员人均统计
      memberAverages,
      // 行程天数
      tripDuration: totalDays,
      // 活跃消费者数量
      activeConsumers: membersFinancialStatus.filter(m => m.expenseCount > 0).length
    }
  }
  
  // 新增：分析时间维度分布
  private analyzeTimeDistribution(expenses: any[]) {
    const timeSlots = {
      morning: { start: 6, end: 12, count: 0, amount: 0 },    // 早上 6-12
      afternoon: { start: 12, end: 18, count: 0, amount: 0 }, // 下午 12-18
      evening: { start: 18, end: 24, count: 0, amount: 0 },   // 晚上 18-24
      night: { start: 0, end: 6, count: 0, amount: 0 }        // 深夜 0-6
    }
    
    for (const expense of expenses) {
      const hour = expense.expenseDate.getHours()
      const amount = AmountUtil.toNumber(AmountUtil.toDecimal(expense.amount))
      
      if (hour >= 6 && hour < 12) {
        timeSlots.morning.count++
        timeSlots.morning.amount += amount
      } else if (hour >= 12 && hour < 18) {
        timeSlots.afternoon.count++
        timeSlots.afternoon.amount += amount
      } else if (hour >= 18 && hour < 24) {
        timeSlots.evening.count++
        timeSlots.evening.amount += amount
      } else {
        timeSlots.night.count++
        timeSlots.night.amount += amount
      }
    }
    
    const total = AmountUtil.toNumber(
      AmountUtil.sum(expenses.map(e => e.amount))
    )
    
    return {
      morning: {
        count: timeSlots.morning.count,
        amount: timeSlots.morning.amount,
        percentage: total > 0 ? (timeSlots.morning.amount / total) * 100 : 0
      },
      afternoon: {
        count: timeSlots.afternoon.count,
        amount: timeSlots.afternoon.amount,
        percentage: total > 0 ? (timeSlots.afternoon.amount / total) * 100 : 0
      },
      evening: {
        count: timeSlots.evening.count,
        amount: timeSlots.evening.amount,
        percentage: total > 0 ? (timeSlots.evening.amount / total) * 100 : 0
      },
      night: {
        count: timeSlots.night.count,
        amount: timeSlots.night.amount,
        percentage: total > 0 ? (timeSlots.night.amount / total) * 100 : 0
      }
    }
  }
  
  // 新增：异常消费检测
  private detectAnomalies(expenses: any[], dailyAverage: number) {
    const anomalies = []
    const amounts = expenses
      .map(e => AmountUtil.toNumber(AmountUtil.toDecimal(e.amount)))
      .filter(a => a > 0)
    
    if (amounts.length === 0) return []
    
    // 计算标准差
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length
    const stdDev = Math.sqrt(variance)
    
    // 检测异常高额消费（超过均值+2倍标准差）
    const threshold = mean + (2 * stdDev)
    
    for (const expense of expenses) {
      const amount = AmountUtil.toNumber(AmountUtil.toDecimal(expense.amount))
      
      // 异常高额消费
      if (amount > threshold && amount > dailyAverage * 2) {
        anomalies.push({
          type: 'high_amount',
          expenseId: expense.id,
          description: expense.description,
          amount: amount,
          date: expense.expenseDate,
          severity: amount > threshold * 2 ? 'high' : 'medium',
          message: `异常高额支出：${amount}元，超过平均值的${Math.round(amount / mean)}倍`
        })
      }
      
      // 检测深夜消费（凌晨0-5点）
      const hour = expense.expenseDate.getHours()
      if (hour >= 0 && hour < 5 && amount > mean) {
        anomalies.push({
          type: 'unusual_time',
          expenseId: expense.id,
          description: expense.description,
          amount: amount,
          date: expense.expenseDate,
          severity: 'low',
          message: `深夜消费提醒：凌晨${hour}点的支出`
        })
      }
    }
    
    // 按严重程度排序
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    
    return anomalies
  }
}

export const calculationService = new CalculationService()
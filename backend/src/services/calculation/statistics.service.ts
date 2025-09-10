import { PrismaClient } from '@prisma/client'
import { balanceService } from './balance.service'
import AmountUtil from '../../utils/decimal'
import { TripStatistics, AdvancedMetrics, TimeDistribution, Anomaly } from './types'

const prisma = new PrismaClient()

export class StatisticsService {
  async getTripStatistics(tripId: string): Promise<TripStatistics> {
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
      balanceService.calculateBalances(tripId) // 获取余额计算结果
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
        userId: member.userId,  // 添加userId字段，用于前端初始映射
        memberName: member.isVirtual 
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

    // 分类统计
    const categoryBreakdown = this.calculateCategoryBreakdown(expenses, categories, totalExpenses)
    
    // 每日支出统计
    const dailyExpenses = this.calculateDailyExpenses(expenses)

    const members = trip?.members.length || 0
    
    // 高级统计指标
    const advancedMetrics = this.calculateAdvancedMetrics(expenses, trip, dailyExpenses, membersFinancialStatus)
    
    // 时间维度分析
    const timeDistribution = this.analyzeTimeDistribution(expenses)
    
    // 支付方式统计
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
    
    // 异常检测
    const anomalies = this.detectAnomalies(expenses, advancedMetrics.dailyAverage)

    return {
      totalExpenses,
      expenseCount: expenses.length,
      averagePerPerson: members > 0 ? totalExpenses / members : 0,
      categoryBreakdown,
      fundPoolStatus: {
        totalContributions,
        totalExpenses: fundExpenses,
        remainingBalance: totalContributions - fundExpenses,
        utilizationRate: totalContributions > 0 ? (fundExpenses / totalContributions) * 100 : 0
      },
      membersFinancialStatus,
      paymentMethodStats,
      timeDistribution,
      advancedMetrics,
      fundStatus: {
        fundUtilization: totalContributions > 0 ? (fundExpenses / totalContributions) * 100 : 0
      },
      anomalies
    }
  }

  private calculateCategoryBreakdown(expenses: any[], categories: any[], totalExpenses: number) {
    const categoryMap = new Map<string, { name: string; amount: number; count: number }>()
    
    // 初始化已有分类
    for (const category of categories) {
      categoryMap.set(category.id, { name: category.name, amount: 0, count: 0 })
    }
    
    // 添加一个"未分类"类别
    const uncategorizedId = 'uncategorized'
    categoryMap.set(uncategorizedId, { name: '未分类', amount: 0, count: 0 })

    // 统计各分类支出
    for (const expense of expenses) {
      const catId = expense.categoryId || uncategorizedId
      const cat = categoryMap.get(catId)
      if (cat) {
        cat.amount += AmountUtil.toNumber(AmountUtil.toDecimal(expense.amount))
        cat.count += 1
      }
    }

    return Array.from(categoryMap.entries())
      .filter(([, data]) => data.amount > 0)
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        amount: data.amount,
        percentage: (data.amount / totalExpenses) * 100,
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  private calculateDailyExpenses(expenses: any[]) {
    const dailyMap = new Map<string, { amount: number; count: number }>()
    
    for (const expense of expenses) {
      const dateKey = expense.expenseDate.toISOString().split('T')[0]
      const daily = dailyMap.get(dateKey) || { amount: 0, count: 0 }
      daily.amount += AmountUtil.toNumber(AmountUtil.toDecimal(expense.amount))
      daily.count += 1
      dailyMap.set(dateKey, daily)
    }

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private calculateAdvancedMetrics(
    expenses: any[], 
    trip: any, 
    dailyExpenses: any[], 
    membersFinancialStatus: any[]
  ): AdvancedMetrics {
    const validExpenses = expenses.filter(e => AmountUtil.greaterThan(e.amount, 0))
    const totalAmount = AmountUtil.toNumber(
      AmountUtil.sum(validExpenses.map(e => e.amount))
    )
    
    const startDate = trip?.startDate ? new Date(trip.startDate) : new Date()
    const endDate = trip?.endDate ? new Date(trip.endDate) : new Date()
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    
    // 找出消费峰值日
    const peakDay = dailyExpenses.reduce((max, day) => 
      day.amount > (max?.amount || 0) ? day : max
    , null as any)
    
    // 分析消费趋势
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (dailyExpenses.length > 1) {
      const firstHalf = dailyExpenses.slice(0, Math.floor(dailyExpenses.length / 2))
      const secondHalf = dailyExpenses.slice(Math.floor(dailyExpenses.length / 2))
      const firstAvg = firstHalf.reduce((sum, d) => sum + d.amount, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, d) => sum + d.amount, 0) / secondHalf.length
      
      if (secondAvg > firstAvg * 1.2) trend = 'increasing'
      else if (secondAvg < firstAvg * 0.8) trend = 'decreasing'
    }
    
    return {
      dailyAverage: totalAmount / totalDays,
      peakDay: peakDay ? {
        date: peakDay.date,
        amount: peakDay.amount,
        count: peakDay.count
      } : null,
      trend,
      activeConsumers: membersFinancialStatus.filter(m => m.expenseCount > 0).length,
      tripDuration: totalDays
    }
  }
  
  private analyzeTimeDistribution(expenses: any[]): TimeDistribution {
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
  
  private detectAnomalies(expenses: any[], dailyAverage: number): Anomaly[] {
    const anomalies: Anomaly[] = []
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
          message: `异常高额支出：${amount}元，超过平均值的${Math.round(amount / mean)}倍`,
          severity: amount > threshold * 2 ? 'high' : 'medium',
          data: {
            expenseId: expense.id,
            description: expense.description,
            amount: amount,
            date: expense.expenseDate
          }
        })
      }
      
      // 检测深夜消费（凌晨0-5点）
      const hour = expense.expenseDate.getHours()
      if (hour >= 0 && hour < 5 && amount > mean) {
        anomalies.push({
          type: 'unusual_time',
          message: `深夜消费提醒：凌晨${hour}点的支出`,
          severity: 'low',
          data: {
            expenseId: expense.id,
            description: expense.description,
            amount: amount,
            date: expense.expenseDate
          }
        })
      }
    }
    
    // 按严重程度排序
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    
    return anomalies
  }
}

export const statisticsService = new StatisticsService()
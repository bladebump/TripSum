import { ConsumptionInsight } from './types'

export class InsightService {
  generateInsights(statistics: any, _expenses: any[]): ConsumptionInsight[] {
    const insights: ConsumptionInsight[] = []
    
    // 消费模式洞察
    if (statistics.advancedMetrics) {
      const { trend, peakDay, activeConsumers } = statistics.advancedMetrics
      
      // 趋势洞察
      if (trend === 'increasing') {
        insights.push({
          type: 'trend',
          title: '消费趋势上升',
          description: `行程后半段的消费明显高于前半段，可能是因为逐渐放松了预算控制。`,
          severity: 'warning'
        })
      } else if (trend === 'decreasing') {
        insights.push({
          type: 'trend',
          title: '消费趋势下降',
          description: `消费呈现递减趋势，说明团队的预算控制意识较强。`,
          severity: 'info'
        })
      }
      
      // 峰值消费洞察
      if (peakDay) {
        insights.push({
          type: 'pattern',
          title: '消费峰值日',
          description: `${peakDay.date}是消费最高的一天，共${peakDay.count}笔支出，总计${peakDay.amount}元。`,
          data: peakDay
        })
      }
      
      // 参与度洞察
      const participationRate = (activeConsumers / statistics.membersFinancialStatus?.length) * 100
      if (participationRate < 50) {
        insights.push({
          type: 'pattern',
          title: '消费参与度偏低',
          description: `只有${activeConsumers}人参与了消费，建议鼓励更多成员参与支出记录。`,
          severity: 'warning'
        })
      }
    }
    
    // 时间分布洞察
    if (statistics.timeDistribution) {
      const { evening, night } = statistics.timeDistribution
      
      if (night.percentage > 15) {
        insights.push({
          type: 'pattern',
          title: '深夜消费频繁',
          description: `深夜消费占比${night.percentage.toFixed(1)}%，注意合理安排作息时间。`,
          severity: 'warning'
        })
      }
      
      if (evening.percentage > 50) {
        insights.push({
          type: 'pattern',
          title: '晚间消费集中',
          description: `超过一半的消费发生在晚上，符合休闲旅行的特点。`
        })
      }
    }
    
    // 支付方式洞察
    if (statistics.paymentMethodStats) {
      const { fundPool, memberReimbursement } = statistics.paymentMethodStats
      
      if (fundPool.percentage > 80) {
        insights.push({
          type: 'pattern',
          title: '基金池使用充分',
          description: `${fundPool.percentage.toFixed(1)}%的支出通过基金池支付，管理效率高。`,
          severity: 'info'
        })
      } else if (memberReimbursement.percentage > 50) {
        insights.push({
          type: 'pattern',
          title: '成员垫付较多',
          description: `${memberReimbursement.percentage.toFixed(1)}%的支出由成员垫付，建议及时结算。`,
          severity: 'warning'
        })
      }
    }
    
    return insights
  }

  generateWarnings(statistics: any): string[] {
    const warnings: string[] = []
    
    // 基金池警告
    if (statistics.fundPoolStatus) {
      const { remainingBalance } = statistics.fundPoolStatus
      
      if (remainingBalance < 0) {
        warnings.push(`基金池已透支${Math.abs(remainingBalance)}元，请及时补充资金`)
      } else if (remainingBalance < 100 && remainingBalance > 0) {
        warnings.push(`基金池余额仅剩${remainingBalance}元，可能不足以支付后续支出`)
      }
    }
    
    // 异常消费警告
    if (statistics.anomalies?.length > 0) {
      statistics.anomalies.forEach((anomaly: any) => {
        if (anomaly.severity === 'high') {
          warnings.push(anomaly.message)
        }
      })
    }
    
    // 结算警告
    if (statistics.membersFinancialStatus) {
      const unsettledCount = statistics.membersFinancialStatus.filter(
        (m: any) => Math.abs(m.balance) > 10
      ).length
      
      if (unsettledCount > 3) {
        warnings.push(`有${unsettledCount}位成员的账务余额超过10元，建议尽快结算`)
      }
    }
    
    return warnings
  }

  generateNextTripAdvice(statistics: any, _insights: ConsumptionInsight[]): string[] {
    const advice: string[] = []
    
    // 基于消费水平的建议
    const avgPerDay = statistics.summary?.averagePerDay || 0
    if (avgPerDay > 500) {
      advice.push('日均消费较高，下次旅行可以考虑设定每日预算上限')
    }
    
    // 基于支付方式的建议
    if (statistics.paymentMethodStats?.memberReimbursement?.percentage > 30) {
      advice.push('建议增加基金池初始金额，减少成员垫付的情况')
    }
    
    // 基于参与度的建议
    if (statistics.advancedMetrics?.activeConsumers < statistics.membersFinancialStatus?.length * 0.5) {
      advice.push('鼓励更多成员参与记账，确保支出记录的完整性')
    }
    
    // 基于分类的建议
    if (statistics.categoryBreakdown?.length > 0) {
      const topCategory = statistics.categoryBreakdown[0]
      if (topCategory.percentage > 50) {
        advice.push(`${topCategory.categoryName}支出占比过高，可以适当控制`)
      }
    }
    
    // 通用建议
    advice.push('提前制定详细的预算计划，并在行程中定期回顾')
    advice.push('使用分类记账功能，便于后续分析和优化')
    
    return advice.slice(0, 5) // 最多返回5条建议
  }
}

export const insightService = new InsightService()
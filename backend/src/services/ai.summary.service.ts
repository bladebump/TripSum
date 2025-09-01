import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'
import { calculationService } from './calculation.service'

const prisma = new PrismaClient()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export interface TripSummaryResult {
  summary: string
  insights: ConsumptionInsight[]
  recommendations: string[]
  highlights: TripHighlight[]
  warnings: string[]
  nextTripAdvice: string[]
  generatedAt: Date
}

export interface ConsumptionInsight {
  type: 'pattern' | 'anomaly' | 'trend' | 'comparison'
  title: string
  description: string
  severity?: 'info' | 'warning' | 'critical'
  data?: any
}

export interface TripHighlight {
  type: 'achievement' | 'milestone' | 'memory'
  title: string
  description: string
  emoji?: string
}

export class AISummaryService {
  async generateTripSummary(tripId: string): Promise<TripSummaryResult> {
    try {
      // 获取行程完整数据
      const [trip, statistics, expenses] = await Promise.all([
        prisma.trip.findUnique({
          where: { id: tripId },
          include: {
            members: {
              where: { isActive: true },
              include: { user: true }
            },
            categories: true
          }
        }),
        calculationService.getTripStatistics(tripId),
        prisma.expense.findMany({
          where: { tripId },
          include: {
            category: true,
            payerMember: {
              include: { user: true }
            },
            participants: {
              include: {
                tripMember: {
                  include: { user: true }
                }
              }
            }
          },
          orderBy: { expenseDate: 'desc' }
        })
      ])

      if (!trip) {
        throw new Error('行程不存在')
      }

      // 准备分析数据
      const analysisData = this.prepareAnalysisData(trip, statistics, expenses)
      
      // 调用AI生成分析报告
      const aiAnalysis = await this.callAIForAnalysis(analysisData)
      
      // 生成消费洞察
      const insights = this.generateInsights(statistics, expenses)
      
      // 生成行程亮点
      const highlights = this.generateHighlights(trip, statistics, expenses)
      
      // 生成警告和建议
      const warnings = this.generateWarnings(statistics)
      
      // 生成下次旅行建议
      const nextTripAdvice = this.generateNextTripAdvice(statistics, insights)

      return {
        summary: aiAnalysis.summary,
        insights,
        recommendations: aiAnalysis.recommendations || [],
        highlights,
        warnings,
        nextTripAdvice,
        generatedAt: new Date()
      }
    } catch (error) {
      console.error('生成行程总结失败:', error)
      throw error
    }
  }

  private prepareAnalysisData(trip: any, statistics: any, expenses: any[]) {
    const startDate = new Date(trip.startDate)
    const endDate = trip.endDate ? new Date(trip.endDate) : new Date()
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      tripName: trip.name,
      description: trip.description,
      duration,
      memberCount: trip.members.length,
      members: trip.members.map((m: any) => ({
        name: m.isVirtual ? m.displayName : m.user?.username,
        role: m.role,
        contribution: m.contribution
      })),
      totalExpenses: statistics.totalExpenses,
      expenseCount: statistics.expenseCount,
      averagePerPerson: statistics.averagePerPerson,
      averagePerDay: statistics.advancedMetrics?.dailyAverage || 0,
      categoryBreakdown: statistics.categoryBreakdown,
      peakDay: statistics.advancedMetrics?.peakDay,
      trend: statistics.advancedMetrics?.trend,
      fundUtilization: statistics.fundStatus?.fundUtilization,
      paymentMethodDistribution: {
        fundPool: statistics.paymentMethodStats?.fundPool.percentage || 0,
        memberPaid: statistics.paymentMethodStats?.memberReimbursement.percentage || 0
      },
      timeDistribution: statistics.timeDistribution,
      topExpenses: expenses
        .filter(e => e.amount.toNumber() > 0)
        .sort((a, b) => b.amount.toNumber() - a.amount.toNumber())
        .slice(0, 5)
        .map(e => ({
          description: e.description,
          amount: e.amount.toNumber(),
          category: e.category?.name,
          date: e.expenseDate
        })),
      anomalies: statistics.anomalies
    }
  }

  private async callAIForAnalysis(data: any): Promise<{ summary: string; recommendations: string[] }> {
    try {
      const prompt = `
你是一位专业的旅行消费分析师。请根据以下行程数据生成深度分析报告。

行程信息：
- 名称：${data.tripName}
- 描述：${data.description || '无'}
- 时长：${data.duration}天
- 参与人数：${data.memberCount}人
- 总支出：${data.totalExpenses}元
- 支出笔数：${data.expenseCount}笔
- 人均消费：${data.averagePerPerson.toFixed(2)}元
- 日均消费：${data.averagePerDay.toFixed(2)}元
- 消费趋势：${data.trend === 'increasing' ? '上升' : data.trend === 'decreasing' ? '下降' : '平稳'}

分类支出TOP3：
${data.categoryBreakdown?.slice(0, 3).map((c: any) => 
  `- ${c.categoryName}：${c.amount}元 (${c.percentage.toFixed(1)}%)`
).join('\n') || '无分类数据'}

支付方式分布：
- 基金池支付：${data.paymentMethodDistribution.fundPool.toFixed(1)}%
- 成员垫付：${data.paymentMethodDistribution.memberPaid.toFixed(1)}%

时间分布特征：
- 早上消费：${data.timeDistribution?.morning.percentage.toFixed(1)}%
- 下午消费：${data.timeDistribution?.afternoon.percentage.toFixed(1)}%
- 晚上消费：${data.timeDistribution?.evening.percentage.toFixed(1)}%
- 深夜消费：${data.timeDistribution?.night.percentage.toFixed(1)}%

最大单笔支出TOP3：
${data.topExpenses?.slice(0, 3).map((e: any) => 
  `- ${e.description}：${e.amount}元 (${e.category || '未分类'})`
).join('\n') || '无支出数据'}

${data.anomalies?.length > 0 ? `
异常消费提醒：
${data.anomalies.slice(0, 3).map((a: any) => `- ${a.message}`).join('\n')}
` : ''}

请生成：
1. 一段200字左右的行程消费总结，包括消费特点、模式识别、团队协作情况等
2. 3-5条具体的优化建议，帮助下次旅行更好地控制预算和提升体验

返回JSON格式：
{
  "summary": "总结内容",
  "recommendations": ["建议1", "建议2", "建议3"]
}
`

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的旅行消费分析师，擅长从数据中发现规律，提供有价值的洞察和建议。请用友好、专业的语气撰写分析报告。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1000
      })

      const result = JSON.parse(completion.choices[0].message.content || '{}')
      
      return {
        summary: result.summary || '暂无分析结果',
        recommendations: result.recommendations || []
      }
    } catch (error) {
      console.error('AI分析失败:', error)
      return {
        summary: '自动分析暂时不可用，请稍后重试。',
        recommendations: []
      }
    }
  }

  private generateInsights(statistics: any, _expenses: any[]): ConsumptionInsight[] {
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

  private generateHighlights(_trip: any, statistics: any, expenses: any[]): TripHighlight[] {
    const highlights: TripHighlight[] = []
    
    // 团队协作亮点
    if (statistics.membersFinancialStatus?.length > 3) {
      highlights.push({
        type: 'achievement',
        title: '团队出行',
        description: `${statistics.membersFinancialStatus.length}人共同完成了这次旅行！`,
        emoji: '👥'
      })
    }
    
    // 消费控制亮点
    if (statistics.advancedMetrics?.trend === 'decreasing' || statistics.advancedMetrics?.trend === 'stable') {
      highlights.push({
        type: 'achievement',
        title: '预算控制良好',
        description: '整个行程的消费控制得当，没有出现失控情况。',
        emoji: '💰'
      })
    }
    
    // 记账习惯亮点
    if (expenses.length > 20) {
      highlights.push({
        type: 'achievement',
        title: '详细记账',
        description: `记录了${expenses.length}笔支出，财务管理非常细致！`,
        emoji: '📝'
      })
    }
    
    // 基金池管理亮点
    if (statistics.fundStatus?.fundUtilization > 0 && statistics.fundStatus?.fundUtilization < 100) {
      highlights.push({
        type: 'achievement',
        title: '基金池管理得当',
        description: `基金池使用率${statistics.fundStatus.fundUtilization.toFixed(1)}%，既充分利用又留有余地。`,
        emoji: '🏦'
      })
    }
    
    // 行程时长里程碑
    const duration = statistics.advancedMetrics?.tripDuration || 0
    if (duration >= 7) {
      highlights.push({
        type: 'milestone',
        title: '长途旅行',
        description: `完成了${duration}天的旅程，收获满满！`,
        emoji: '🗓️'
      })
    }
    
    return highlights
  }

  private generateWarnings(statistics: any): string[] {
    const warnings: string[] = []
    
    // 异常消费警告
    if (statistics.anomalies?.length > 0) {
      const highSeverity = statistics.anomalies.filter((a: any) => a.severity === 'high')
      if (highSeverity.length > 0) {
        warnings.push(`发现${highSeverity.length}笔异常高额消费，请核实是否合理`)
      }
    }
    
    // 基金池透支警告
    if (statistics.fundStatus?.currentBalance < 0) {
      warnings.push(`基金池已透支${Math.abs(statistics.fundStatus.currentBalance)}元，需要及时补充`)
    }
    
    // 未结算警告
    const unsettledAmount = statistics.settlements?.reduce((sum: number, s: any) => sum + s.amount, 0) || 0
    if (unsettledAmount > 1000) {
      warnings.push(`还有${unsettledAmount.toFixed(2)}元待结算，建议尽快完成`)
    }
    
    // 消费失衡警告
    if (statistics.membersFinancialStatus) {
      const maxBalance = Math.max(...statistics.membersFinancialStatus.map((m: any) => Math.abs(m.balance)))
      if (maxBalance > statistics.averagePerPerson * 2) {
        warnings.push('成员间消费差异较大，建议及时沟通和调整')
      }
    }
    
    return warnings
  }

  private generateNextTripAdvice(statistics: any, _insights: ConsumptionInsight[]): string[] {
    const advice: string[] = []
    
    // 基于消费趋势的建议
    if (statistics.advancedMetrics?.trend === 'increasing') {
      advice.push('制定每日预算上限，避免后期消费失控')
    }
    
    // 基于时间分布的建议
    if (statistics.timeDistribution?.night.percentage > 15) {
      advice.push('合理安排行程时间，减少深夜活动和消费')
    }
    
    // 基于支付方式的建议
    if (statistics.paymentMethodStats?.memberReimbursement.percentage > 50) {
      advice.push('增加基金池初始金额，减少成员垫付的情况')
    }
    
    // 基于分类消费的建议
    const topCategory = statistics.categoryBreakdown?.[0]
    if (topCategory && topCategory.percentage > 40) {
      advice.push(`${topCategory.categoryName}支出占比过高(${topCategory.percentage.toFixed(1)}%)，可以适当控制`)
    }
    
    // 基于人均消费的建议
    if (statistics.advancedMetrics?.averagePerPerson > statistics.advancedMetrics?.dailyAverage * 10) {
      advice.push('人均消费较高，下次可以选择更经济的方案')
    }
    
    // 基于记账习惯的建议
    if (statistics.expenseCount < 10) {
      advice.push('增加记账频率，确保所有支出都被记录')
    }
    
    // 通用建议
    advice.push('行程开始前明确各类支出的预算分配')
    advice.push('指定专人负责基金池管理和日常记账')
    
    return advice.slice(0, 5) // 最多返回5条建议
  }

  async exportSummaryReport(tripId: string): Promise<Buffer> {
    try {
      const summary = await this.generateTripSummary(tripId)
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          members: {
            where: { isActive: true },
            include: { user: true }
          }
        }
      })

      if (!trip) {
        throw new Error('行程不存在')
      }

      // 生成HTML报告
      const htmlContent = this.generateHTMLReport(trip, summary)
      return Buffer.from(htmlContent, 'utf-8')
    } catch (error) {
      console.error('导出报告失败:', error)
      throw error
    }
  }

  private generateHTMLReport(trip: any, summary: TripSummaryResult): string {
    const formatDate = (date: Date) => new Date(date).toLocaleDateString('zh-CN')
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${trip.name} - 行程总结报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1890ff;
      border-bottom: 2px solid #1890ff;
      padding-bottom: 10px;
    }
    h2 {
      color: #333;
      margin-top: 30px;
      border-left: 4px solid #1890ff;
      padding-left: 10px;
    }
    .summary {
      background: #f0f5ff;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .insights {
      margin: 20px 0;
    }
    .insight {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 15px;
      margin: 10px 0;
    }
    .insight-title {
      font-weight: bold;
      color: #1890ff;
      margin-bottom: 5px;
    }
    .highlights {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .highlight {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .highlight-emoji {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .recommendations, .warnings, .advice {
      margin: 20px 0;
    }
    .recommendations li, .warnings li, .advice li {
      margin: 10px 0;
      padding: 10px;
      background: #f9f9f9;
      border-left: 3px solid #52c41a;
      list-style: none;
    }
    .warnings li {
      border-left-color: #faad14;
      background: #fffbe6;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e8e8e8;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 ${trip.name} - 行程总结报告</h1>
    
    <div class="summary">
      <h2>📊 总体概况</h2>
      <p>${summary.summary}</p>
      <p><small>生成时间：${formatDate(summary.generatedAt)}</small></p>
    </div>

    <h2>✨ 行程亮点</h2>
    <div class="highlights">
      ${summary.highlights.map(h => `
        <div class="highlight">
          <div class="highlight-emoji">${h.emoji || '🌟'}</div>
          <div><strong>${h.title}</strong></div>
          <div>${h.description}</div>
        </div>
      `).join('')}
    </div>

    <h2>🔍 消费洞察</h2>
    <div class="insights">
      ${summary.insights.map(i => `
        <div class="insight">
          <div class="insight-title">${i.title}</div>
          <div>${i.description}</div>
        </div>
      `).join('')}
    </div>

    ${summary.warnings.length > 0 ? `
      <h2>⚠️ 注意事项</h2>
      <ul class="warnings">
        ${summary.warnings.map(w => `<li>${w}</li>`).join('')}
      </ul>
    ` : ''}

    <h2>💡 优化建议</h2>
    <ul class="recommendations">
      ${summary.recommendations.map(r => `<li>${r}</li>`).join('')}
    </ul>

    <h2>🚀 下次旅行建议</h2>
    <ul class="advice">
      ${summary.nextTripAdvice.map(a => `<li>${a}</li>`).join('')}
    </ul>

    <div class="footer">
      <p>本报告由 TripSum 旅算 AI 自动生成</p>
      <p>让每一次旅行都更加精彩！</p>
    </div>
  </div>
</body>
</html>
    `
  }
}

export const aiSummaryService = new AISummaryService()
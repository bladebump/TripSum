import { TripHighlight } from './types'

export class HighlightService {
  generateHighlights(_trip: any, statistics: any, expenses: any[]): TripHighlight[] {
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
}

export const highlightService = new HighlightService()
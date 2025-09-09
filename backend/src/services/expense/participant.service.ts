import AmountUtil from '../../utils/decimal'
import { ParticipantsSummary, ParticipantDetail } from './types'

export class ExpenseParticipantService {
  addParticipantsSummary(expense: any): any {
    if (!expense.participants || expense.participants.length === 0) {
      return expense
    }

    // 获取参与者名称列表
    const participantNames = expense.participants.map((p: any) => {
      if (p.tripMember?.isVirtual) {
        return p.tripMember.displayName || '虚拟成员'
      }
      return p.tripMember?.user?.username || '未知用户'
    })

    // 计算每个参与者的实际分摊金额
    const participantDetails: ParticipantDetail[] = expense.participants.map((p: any) => {
      const name = p.tripMember?.isVirtual 
        ? (p.tripMember.displayName || '虚拟成员')
        : (p.tripMember?.user?.username || '未知用户')
      
      let shareAmount = AmountUtil.toNumber(AmountUtil.toDecimal(p.shareAmount))
      if (!shareAmount && p.sharePercentage) {
        const percentage = AmountUtil.toNumber(AmountUtil.toDecimal(p.sharePercentage))
        const amount = AmountUtil.toNumber(AmountUtil.toDecimal(expense.amount))
        shareAmount = AmountUtil.toNumber(AmountUtil.divide(AmountUtil.multiply(amount, percentage), 100))
      }

      return {
        memberId: p.tripMemberId || p.tripMember?.id,
        name,
        shareAmount: shareAmount || 0,
        isVirtual: p.tripMember?.isVirtual || false
      }
    })

    // 计算平均分摊
    const totalAmount = AmountUtil.toNumber(AmountUtil.toDecimal(expense.amount))
    const averageShare = participantDetails.length > 0 
      ? AmountUtil.toNumber(AmountUtil.divide(totalAmount, participantDetails.length))
      : 0

    // 生成摘要信息
    const participantsSummary: ParticipantsSummary = {
      count: participantDetails.length,
      names: participantNames.slice(0, 3), // 最多显示3个名字
      hasMore: participantNames.length > 3,
      averageShare: Math.round(averageShare * 100) / 100,
      totalAmount,
      details: participantDetails,
      // 判断是否平均分摊
      isEqualShare: participantDetails.every((p: any) => 
        Math.abs(p.shareAmount - averageShare) < 0.01
      )
    }

    return {
      ...expense,
      participantsSummary
    }
  }

  calculateParticipantShares(amount: number, participants: any[]) {
    if (participants.length === 0) {
      return []
    }

    const averageShare = amount / participants.length

    return participants.map(p => ({
      ...p,
      shareAmount: p.shareAmount || averageShare,
      sharePercentage: p.sharePercentage || (100 / participants.length)
    }))
  }

  validateParticipantShares(participants: any[], totalAmount: number): boolean {
    if (participants.length === 0) {
      return true
    }

    const totalShare = participants.reduce((sum, p) => {
      return sum + (p.shareAmount || 0)
    }, 0)

    return Math.abs(totalShare - totalAmount) < 0.01
  }

  getParticipantSummaryText(participantsSummary: ParticipantsSummary): string {
    if (participantsSummary.count === 0) {
      return '无参与者'
    }

    const names = participantsSummary.names.join('、')
    const moreText = participantsSummary.hasMore ? `等${participantsSummary.count}人` : ''
    const shareText = participantsSummary.isEqualShare 
      ? `平均分摊${participantsSummary.averageShare}元`
      : '按比例分摊'

    return `${names}${moreText} ${shareText}`
  }
}

export const expenseParticipantService = new ExpenseParticipantService()
import { PrismaClient } from '@prisma/client'
import AmountUtil from '../../utils/decimal'

const prisma = new PrismaClient()

export class ExpenseValidationService {
  async checkTripMembership(tripId: string, userId: string) {
    const member = await prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId,
        },
      },
    })

    if (!member || !member.isActive) {
      throw new Error('您不是该行程的成员')
    }

    return member
  }

  async validatePayer(payerId: string, tripId: string) {
    const payerMember = await prisma.tripMember.findFirst({
      where: {
        id: payerId,
        tripId,
        isActive: true
      }
    })
    
    if (!payerMember) {
      throw new Error('付款人不是该行程的成员')
    }

    return payerMember
  }

  async validateParticipants(participants: any[], tripId: string) {
    if (participants.length === 0) {
      return []
    }

    const memberIds = participants.map(p => p.memberId)
    
    const validMembers = await prisma.tripMember.findMany({
      where: {
        id: { in: memberIds },
        tripId,
        isActive: true
      }
    })
    
    if (validMembers.length !== memberIds.length) {
      throw new Error('部分参与者不是该行程的成员')
    }

    return validMembers
  }

  validateShareAmounts(participants: any[], totalAmount: any) {
    if (participants.length === 0) {
      return true
    }

    // 检查分摊总和是否等于支出金额
    const totalShare = AmountUtil.sum(
      participants.map(p => p.shareAmount || 0)
    )
    
    if (!AmountUtil.equals(totalShare, totalAmount)) {
      throw new Error('分摊金额总和必须等于支出金额')
    }

    return true
  }

  async checkExpenseOwnership(expenseId: string, userId: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        trip: {
          include: {
            members: {
              where: {
                userId,
                isActive: true
              }
            }
          }
        }
      }
    })

    if (!expense) {
      throw new Error('支出不存在')
    }

    const userMember = expense.trip.members[0]
    if (!userMember) {
      throw new Error('您不是该行程的成员')
    }

    // 只有管理员或创建者可以修改/删除
    if (userMember.role !== 'admin' && expense.createdBy !== userId) {
      throw new Error('您没有权限操作此支出')
    }

    return { expense, userMember }
  }
}

export const expenseValidationService = new ExpenseValidationService()
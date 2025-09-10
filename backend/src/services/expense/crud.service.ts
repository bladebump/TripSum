import { PrismaClient } from '@prisma/client'
import { io } from '../../app'
import { ServiceCreateExpenseData, CreateExpenseData } from './types'
import { expenseValidationService } from './validation.service'
import { expenseParticipantService } from './participant.service'

const prisma = new PrismaClient()

export class ExpenseCrudService {
  async createExpense(tripId: string, createdBy: string, data: ServiceCreateExpenseData) {
    await expenseValidationService.checkTripMembership(tripId, createdBy)

    // 验证付款人
    const payerMember = await expenseValidationService.validatePayer(data.payerId, tripId)
    
    // 判断是否为基金池支付（管理员付款）
    const isPaidFromFund = payerMember.role === 'admin'

    const participants = data.participants || []
    
    // 验证参与者
    if (participants.length > 0) {
      await expenseValidationService.validateParticipants(participants, tripId)
      
      // 验证分摊金额
      if (participants.some(p => p.shareAmount)) {
        expenseValidationService.validateShareAmounts(participants, data.amount)
      }
    }

    const expense = await prisma.expense.create({
      data: {
        tripId,
        amount: data.amount,
        categoryId: data.categoryId,
        payerMemberId: data.payerId,
        description: data.description,
        expenseDate: data.expenseDate,
        receiptUrl: data.receiptUrl,
        isPaidFromFund,
        createdBy,
        participants: {
          create: participants.map((p) => ({
            tripMember: {
              connect: { id: p.memberId }
            },
            shareAmount: p.shareAmount,
            sharePercentage: p.sharePercentage,
          })),
        },
      },
      include: {
        payerMember: {
          include: {
            user: true
          }
        },
        category: true,
        participants: {
          include: {
            tripMember: {
              include: {
                user: true
              }
            }
          },
        },
      },
    })

    // 添加参与者摘要信息
    const enhancedExpense = expenseParticipantService.addParticipantsSummary(expense)

    io.to(`trip-${tripId}`).emit('expense-created', enhancedExpense)

    return enhancedExpense
  }

  async updateExpense(expenseId: string, userId: string, data: Partial<CreateExpenseData>) {
    const { expense } = await expenseValidationService.checkExpenseOwnership(expenseId, userId)

    // 如果更新了付款人，需要重新判断是否为基金池支付
    let isPaidFromFund = expense.isPaidFromFund
    if (data.payerMemberId) {
      const payerMember = await expenseValidationService.validatePayer(data.payerMemberId, expense.tripId)
      isPaidFromFund = payerMember.role === 'admin'
    }

    // 验证新的参与者
    if (data.participants) {
      await expenseValidationService.validateParticipants(data.participants, expense.tripId)
      
      if (data.participants.some(p => p.shareAmount)) {
        expenseValidationService.validateShareAmounts(data.participants, data.amount || expense.amount)
      }
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        amount: data.amount,
        categoryId: data.categoryId,
        payerMemberId: data.payerMemberId,
        description: data.description,
        expenseDate: data.expenseDate,
        receiptUrl: data.receiptUrl,
        isPaidFromFund,
        // 如果有新的参与者，先删除旧的再创建新的
        participants: data.participants ? {
          deleteMany: {},
          create: data.participants.map((p) => ({
            tripMember: {
              connect: { id: p.memberId }
            },
            shareAmount: p.shareAmount,
            sharePercentage: p.sharePercentage,
          })),
        } : undefined,
      },
      include: {
        payerMember: {
          include: {
            user: true
          }
        },
        category: true,
        participants: {
          include: {
            tripMember: {
              include: {
                user: true
              }
            }
          },
        },
      },
    })

    const enhancedExpense = expenseParticipantService.addParticipantsSummary(updatedExpense)

    io.to(`trip-${expense.tripId}`).emit('expense-updated', enhancedExpense)

    return enhancedExpense
  }

  async deleteExpense(expenseId: string, userId: string) {
    const { expense } = await expenseValidationService.checkExpenseOwnership(expenseId, userId)

    await prisma.expense.delete({
      where: { id: expenseId },
    })

    io.to(`trip-${expense.tripId}`).emit('expense-deleted', { expenseId })

    return { success: true }
  }
}

export const expenseCrudService = new ExpenseCrudService()
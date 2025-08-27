import { PrismaClient, Prisma } from '@prisma/client'
import { io } from '../app'

const prisma = new PrismaClient()

interface CreateExpenseData {
  amount: number
  categoryId?: string
  payerId: string
  description?: string
  expenseDate: Date
  receiptUrl?: string
  participants?: Array<{
    userId: string
    shareAmount?: number
    sharePercentage?: number
  }>
}

export class ExpenseService {
  async createExpense(tripId: string, createdBy: string, data: CreateExpenseData) {
    await this.checkTripMembership(tripId, createdBy)

    if (data.payerId !== createdBy) {
      await this.checkTripMembership(tripId, data.payerId)
    }

    const participants = data.participants || []
    
    if (participants.length === 0) {
      const members = await prisma.tripMember.findMany({
        where: { tripId, isActive: true },
      })
      
      const validMembers = members.filter(m => m.userId) // 只包含有userId的成员
      const shareAmount = data.amount / validMembers.length
      participants.push(
        ...validMembers.map((m) => ({
          userId: m.userId!,
          shareAmount,
        }))
      )
    } else {
      let totalPercentage = 0
      let totalAmount = 0

      for (const p of participants) {
        if (p.sharePercentage) {
          totalPercentage += p.sharePercentage
          p.shareAmount = (data.amount * p.sharePercentage) / 100
        } else if (p.shareAmount) {
          totalAmount += p.shareAmount
        }
      }

      if (totalPercentage > 0 && totalPercentage !== 100) {
        throw new Error('百分比总和必须等于100')
      }

      if (totalAmount > 0 && Math.abs(totalAmount - data.amount) > 0.01) {
        throw new Error('分摊金额总和必须等于支出金额')
      }
    }

    const expense = await prisma.expense.create({
      data: {
        tripId,
        amount: data.amount,
        categoryId: data.categoryId,
        payerId: data.payerId,
        description: data.description,
        expenseDate: data.expenseDate,
        receiptUrl: data.receiptUrl,
        createdBy,
        participants: {
          create: participants.map((p) => ({
            userId: p.userId,
            shareAmount: p.shareAmount,
            sharePercentage: p.sharePercentage,
          })),
        },
      },
      include: {
        payer: true,
        category: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    })

    io.to(`trip-${tripId}`).emit('expense-created', expense)

    return expense
  }

  async getTripExpenses(
    tripId: string,
    userId: string,
    page = 1,
    limit = 20,
    filters?: {
      startDate?: Date
      endDate?: Date
      categoryId?: string
      payerId?: string
    }
  ) {
    await this.checkTripMembership(tripId, userId)

    const skip = (page - 1) * limit

    const where: Prisma.ExpenseWhereInput = {
      tripId,
    }

    if (filters) {
      if (filters.startDate || filters.endDate) {
        where.expenseDate = {}
        if (filters.startDate) {
          where.expenseDate.gte = filters.startDate
        }
        if (filters.endDate) {
          where.expenseDate.lte = filters.endDate
        }
      }
      if (filters.categoryId) {
        where.categoryId = filters.categoryId
      }
      if (filters.payerId) {
        where.payerId = filters.payerId
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          payer: true,
          category: true,
          participants: {
            include: {
              user: true,
            },
          },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ])

    return {
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getExpenseDetail(expenseId: string, userId: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        trip: true,
        payer: true,
        creator: true,
        category: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!expense) {
      throw new Error('支出记录不存在')
    }

    await this.checkTripMembership(expense.tripId, userId)

    return expense
  }

  async updateExpense(expenseId: string, userId: string, data: Partial<CreateExpenseData>) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { trip: true },
    })

    if (!expense) {
      throw new Error('支出记录不存在')
    }

    const member = await this.checkTripMembership(expense.tripId, userId)

    if (expense.createdBy !== userId && member.role !== 'admin') {
      throw new Error('您没有权限编辑此支出')
    }

    const updateData: any = {
      amount: data.amount,
      categoryId: data.categoryId,
      description: data.description,
      expenseDate: data.expenseDate,
      receiptUrl: data.receiptUrl,
    }

    if (data.participants) {
      await prisma.expenseParticipant.deleteMany({
        where: { expenseId },
      })

      updateData.participants = {
        create: data.participants.map((p) => ({
          userId: p.userId,
          shareAmount: p.shareAmount,
          sharePercentage: p.sharePercentage,
        })),
      }
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
      include: {
        payer: true,
        category: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    })

    io.to(`trip-${expense.tripId}`).emit('expense-updated', updatedExpense)

    return updatedExpense
  }

  async deleteExpense(expenseId: string, userId: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { trip: true },
    })

    if (!expense) {
      throw new Error('支出记录不存在')
    }

    const member = await this.checkTripMembership(expense.tripId, userId)

    if (expense.createdBy !== userId && member.role !== 'admin') {
      throw new Error('您没有权限删除此支出')
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    })

    io.to(`trip-${expense.tripId}`).emit('expense-deleted', { expenseId })

    return { message: '支出记录已删除' }
  }

  private async checkTripMembership(tripId: string, userId: string) {
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
}

export const expenseService = new ExpenseService()
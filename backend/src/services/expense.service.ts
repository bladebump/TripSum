import { PrismaClient, Prisma } from '@prisma/client'
import { io } from '../app'
import { 
  ParticipantsSummary, 
  ParticipantDetail,
  CreateExpenseData
} from '../types/expense.types'
import AmountUtil from '../utils/decimal'

const prisma = new PrismaClient()

// 扩展CreateExpenseData以匹配服务层需求
interface ServiceCreateExpenseData extends Omit<CreateExpenseData, 'payerMemberId'> {
  payerId: string  // TripMember.id（兼容旧代码）
}

export class ExpenseService {
  async createExpense(tripId: string, createdBy: string, data: ServiceCreateExpenseData) {
    await this.checkTripMembership(tripId, createdBy)

    // 验证付款人（payerId现在是TripMember.id）
    const payerMember = await prisma.tripMember.findFirst({
      where: {
        id: data.payerId,
        tripId,
        isActive: true
      }
    })
    
    if (!payerMember) {
      throw new Error('付款人不是该行程的成员')
    }

    // 判断是否为基金池支付（管理员付款）
    const isPaidFromFund = payerMember.role === 'admin'

    const participants = data.participants || []
    
    // 验证参与者的memberId是否有效
    if (participants.length > 0) {
      const memberIds = participants.map(p => p.memberId)
      
      const validMembers = await prisma.tripMember.findMany({
        where: {
          id: { in: memberIds },
          tripId,
          isActive: true
        }
      })
      
      if (validMembers.length !== memberIds.length) {
        const validIds = validMembers.map(m => m.id)
        const invalidIds = memberIds.filter(id => !validIds.includes(id))
        throw new Error(`无效的成员ID: ${invalidIds.join(', ')}`)
      }
      
      // 检查参与者数量是否合理（防止4人分摊变成1人）
      const totalMembers = await prisma.tripMember.count({
        where: { tripId, isActive: true }
      })
      
      if (participants.length === 1 && totalMembers > 1) {
        console.warn(`警告：只有1个参与者但行程有${totalMembers}个成员，可能存在解析错误`)
        // 可以根据业务需求决定是否抛出错误
        // throw new Error(`参与者数量异常：只有1个参与者但行程有${totalMembers}个成员`)
      }
    }
    
    if (participants.length === 0) {
      const members = await prisma.tripMember.findMany({
        where: { tripId, isActive: true },
      })
      
      // 包含所有成员（真实用户和虚拟成员统一处理）
      const shareAmount = data.amount / members.length
      participants.push(
        ...members.map((m) => ({
          memberId: m.id,  // 统一使用 TripMember.id
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
        payerMemberId: data.payerId,  // 使用payerMemberId字段
        description: data.description,
        expenseDate: data.expenseDate,
        receiptUrl: data.receiptUrl,
        isPaidFromFund,
        createdBy,
        participants: {
          create: participants.map((p) => ({
            tripMember: {
              connect: { id: p.memberId }  // 连接到现有的 TripMember
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
    const enhancedExpense = this.addParticipantsSummary(expense)

    io.to(`trip-${tripId}`).emit('expense-created', enhancedExpense)

    return enhancedExpense
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
        // 使用 payerMemberId 代替 payerId
        where.payerMemberId = filters.payerId
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
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
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ])

    // 为每个支出添加参与者摘要
    const enhancedExpenses = expenses.map(expense => this.addParticipantsSummary(expense))

    return {
      expenses: enhancedExpenses,
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
        payerMember: {
          include: {
            user: true
          }
        },
        creator: true,
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

    if (!expense) {
      throw new Error('支出记录不存在')
    }

    await this.checkTripMembership(expense.tripId, userId)

    return this.addParticipantsSummary(expense)
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
          tripMember: {
            connect: { id: p.memberId }  // 连接到现有的 TripMember
          },
          shareAmount: p.shareAmount,
          sharePercentage: p.sharePercentage,
        })),
      }
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
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

    const enhancedExpense = this.addParticipantsSummary(updatedExpense)
    
    io.to(`trip-${expense.tripId}`).emit('expense-updated', enhancedExpense)

    return enhancedExpense
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

  private addParticipantsSummary(expense: any): any {
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

}

export const expenseService = new ExpenseService()
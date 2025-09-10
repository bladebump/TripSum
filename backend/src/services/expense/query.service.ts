import { PrismaClient, Prisma } from '@prisma/client'
import { expenseValidationService } from './validation.service'
import { expenseParticipantService } from './participant.service'

const prisma = new PrismaClient()

export class ExpenseQueryService {
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
    await expenseValidationService.checkTripMembership(tripId, userId)

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
    const enhancedExpenses = expenses.map(expense => 
      expenseParticipantService.addParticipantsSummary(expense)
    )

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
        trip: true,
      },
    })

    if (!expense) {
      throw new Error('支出不存在')
    }

    await expenseValidationService.checkTripMembership(expense.tripId, userId)

    // 添加参与者摘要
    const enhancedExpense = expenseParticipantService.addParticipantsSummary(expense)

    return enhancedExpense
  }

  async getExpensesByCategory(tripId: string, userId: string) {
    await expenseValidationService.checkTripMembership(tripId, userId)

    const expenses = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: { tripId },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    })

    const categories = await prisma.category.findMany({
      where: { tripId },
    })

    const result = categories.map(category => {
      const expense = expenses.find(e => e.categoryId === category.id)
      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        totalAmount: expense?._sum.amount || 0,
        count: expense?._count.id || 0,
      }
    })

    // 添加未分类的支出
    const uncategorized = expenses.find(e => !e.categoryId)
    if (uncategorized) {
      result.push({
        categoryId: null as any,
        categoryName: '未分类',
        categoryIcon: '📦',
        categoryColor: '#999',
        totalAmount: uncategorized._sum.amount || 0,
        count: uncategorized._count.id || 0,
      })
    }

    return result.filter(r => r.count > 0)
  }

  async getExpensesByPayer(tripId: string, userId: string) {
    await expenseValidationService.checkTripMembership(tripId, userId)

    const expenses = await prisma.expense.findMany({
      where: { tripId },
      include: {
        payerMember: {
          include: {
            user: true,
          },
        },
      },
    })

    const payerMap = new Map<string, any>()

    for (const expense of expenses) {
      const payerId = expense.payerMemberId
      const payerName = expense.payerMember?.isVirtual
        ? expense.payerMember?.displayName
        : expense.payerMember?.user?.username

      if (payerId && !payerMap.has(payerId)) {
        payerMap.set(payerId, {
          payerId,
          payerName,
          isVirtual: expense.payerMember?.isVirtual || false,
          totalAmount: 0,
          count: 0,
          expenses: [],
        })
      }

      if (payerId) {
        const payer = payerMap.get(payerId)
        if (payer) {
          payer.totalAmount += Number(expense.amount)
          payer.count += 1
          payer.expenses.push({
            id: expense.id,
            amount: expense.amount,
            description: expense.description,
            expenseDate: expense.expenseDate,
            isPaidFromFund: expense.isPaidFromFund,
          })
        }
      }
    }

    return Array.from(payerMap.values())
  }
}

export const expenseQueryService = new ExpenseQueryService()
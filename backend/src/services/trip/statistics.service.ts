import { PrismaClient } from '@prisma/client'
import AmountUtil from '../../utils/decimal'

const prisma = new PrismaClient()

export class TripStatisticsService {
  async getTripStatisticsForList(userId: string, page = 1, limit = 10, status = 'all') {
    const skip = (page - 1) * limit

    const whereClause: any = {
      members: {
        some: {
          userId,
          isActive: true,
        },
      },
    }

    const now = new Date()
    if (status === 'active') {
      whereClause.OR = [
        { endDate: null },
        { endDate: { gte: now } },
      ]
    } else if (status === 'completed') {
      whereClause.endDate = { lt: now }
    }

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where: whereClause,
        include: {
          members: {
            select: {
              id: true,
              role: true,
              contribution: true,
              userId: true,
              isVirtual: true
            }
          },
          expenses: {
            select: {
              amount: true,
              isPaidFromFund: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trip.count({ where: whereClause }),
    ])

    const tripsWithStats = trips.map((trip) => {
      // 计算总支出
      const totalExpenses = AmountUtil.toNumber(
        AmountUtil.sum(trip.expenses.map(e => e.amount))
      )

      // 计算总缴纳
      const totalContributions = AmountUtil.toNumber(
        AmountUtil.sum(trip.members.map(m => m.contribution))
      )

      // 计算基金池支出（isPaidFromFund=true的支出）
      const fundExpenses = AmountUtil.toNumber(
        AmountUtil.sum(trip.expenses.filter(e => e.isPaidFromFund).map(e => e.amount))
      )

      // 基金剩余
      const fundBalance = totalContributions - fundExpenses

      // 获取用户角色（可选）
      const userMember = trip.members.find(m => m.userId === userId)
      const myRole = userMember?.role || null

      return {
        id: trip.id,
        name: trip.name,
        description: trip.description,
        startDate: trip.startDate,
        endDate: trip.endDate,
        currency: trip.currency,
        createdAt: trip.createdAt,
        memberCount: trip.members.length,
        totalExpenses,
        fundBalance,
        myRole,
      }
    })

    return {
      trips: tripsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async calculateTripStatistics(tripId: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: {
          where: { isActive: true },
          select: {
            id: true,
            contribution: true,
            userId: true,
            isVirtual: true,
            displayName: true,
            user: {
              select: {
                username: true
              }
            }
          }
        },
        expenses: {
          include: {
            participants: {
              select: {
                tripMemberId: true,
                shareAmount: true
              }
            }
          }
        }
      }
    })

    if (!trip) {
      throw new Error('行程不存在')
    }

    // 计算各项统计数据
    const totalExpenses = AmountUtil.toNumber(
      AmountUtil.sum(trip.expenses.map(e => e.amount))
    )

    const totalContributions = AmountUtil.toNumber(
      AmountUtil.sum(trip.members.map(m => m.contribution))
    )

    const fundExpenses = AmountUtil.toNumber(
      AmountUtil.sum(trip.expenses.filter(e => e.isPaidFromFund).map(e => e.amount))
    )

    const memberReimbursements = AmountUtil.toNumber(
      AmountUtil.sum(trip.expenses.filter(e => !e.isPaidFromFund).map(e => e.amount))
    )

    const fundBalance = totalContributions - fundExpenses

    // 计算成员财务状态
    const membersFinancialStatus = trip.members.map(member => {
      const memberId = member.id
      
      // 计算该成员的总分摊金额
      const participantShares = trip.expenses.flatMap(e => 
        e.participants
          .filter(p => p.tripMemberId === memberId)
          .map(p => p.shareAmount)
      ).filter(amount => amount !== null)
      
      const totalShare = AmountUtil.toNumber(
        AmountUtil.sum(participantShares)
      )

      // 计算该成员垫付的金额（作为付款人且不是从基金池支付）
      const totalPaid = AmountUtil.toNumber(
        AmountUtil.sum(
          trip.expenses
            .filter(e => e.payerMemberId === memberId && !e.isPaidFromFund)
            .map(e => e.amount)
        )
      )

      // 余额 = 缴纳 + 垫付 - 分摊
      const contribution = AmountUtil.toNumber(member.contribution)
      const balance = contribution + totalPaid - totalShare

      return {
        memberId,
        memberName: member.isVirtual ? member.displayName : member.user?.username,
        isVirtual: member.isVirtual,
        contribution,
        totalPaid,
        totalShare,
        balance
      }
    })

    return {
      tripId,
      tripName: trip.name,
      summary: {
        totalExpenses,
        totalContributions,
        fundBalance,
        fundExpenses,
        memberReimbursements,
        memberCount: trip.members.length,
        expenseCount: trip.expenses.length
      },
      membersFinancialStatus
    }
  }
}

export const tripStatisticsService = new TripStatisticsService()
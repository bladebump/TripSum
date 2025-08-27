import { PrismaClient, Trip } from '@prisma/client'
import { io } from '../app'

const prisma = new PrismaClient()

interface CreateTripData {
  name: string
  description?: string
  startDate: Date
  endDate?: Date
  initialFund?: number
  currency?: string
}

interface TripWithStats extends Trip {
  memberCount: number
  totalExpenses: number
  myBalance?: number
}

export class TripService {
  async createTrip(userId: string, data: CreateTripData) {
    const trip = await prisma.trip.create({
      data: {
        ...data,
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
        categories: {
          createMany: {
            data: [
              { name: '餐饮', icon: '🍽️', color: '#FF6B6B', isDefault: true },
              { name: '交通', icon: '🚗', color: '#4ECDC4', isDefault: true },
              { name: '住宿', icon: '🏨', color: '#45B7D1', isDefault: true },
              { name: '娱乐', icon: '🎮', color: '#96CEB4', isDefault: true },
              { name: '购物', icon: '🛒', color: '#FFEAA7', isDefault: true },
              { name: '其他', icon: '📦', color: '#DFE6E9', isDefault: true },
            ],
          },
        },
      },
      include: {
        creator: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    })

    return trip
  }

  async getUserTrips(userId: string, page = 1, limit = 10, status = 'all') {
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
          members: true,
          expenses: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trip.count({ where: whereClause }),
    ])

    const tripsWithStats: TripWithStats[] = await Promise.all(
      trips.map(async (trip) => {
        const totalExpenses = trip.expenses.reduce(
          (sum, expense) => sum + expense.amount.toNumber(),
          0
        )

        const userExpenses = trip.expenses
          .filter((expense) => expense.payerId === userId)
          .reduce((sum, expense) => sum + expense.amount.toNumber(), 0)

        const avgExpense = trip.members.length > 0 ? totalExpenses / trip.members.length : 0
        const myBalance = userExpenses - avgExpense

        return {
          ...trip,
          memberCount: trip.members.length,
          totalExpenses,
          myBalance,
        }
      })
    )

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

  async getTripDetail(tripId: string, userId: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        creator: true,
        members: {
          include: {
            user: true,
          },
        },
        categories: true,
        expenses: {
          include: {
            payer: true,
            category: true,
          },
        },
      },
    })

    if (!trip) {
      throw new Error('行程不存在')
    }

    const isMember = trip.members.some((m) => m.userId === userId && m.isActive)
    if (!isMember) {
      throw new Error('您不是该行程的成员')
    }

    const totalExpenses = trip.expenses.reduce(
      (sum, expense) => sum + expense.amount.toNumber(),
      0
    )

    const statistics = {
      totalExpenses,
      expenseCount: trip.expenses.length,
      averagePerPerson: trip.members.length > 0 ? totalExpenses / trip.members.length : 0,
    }

    return {
      ...trip,
      statistics,
    }
  }

  async updateTrip(tripId: string, userId: string, data: Partial<CreateTripData>) {
    await this.checkTripPermission(tripId, userId, 'admin')

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data,
    })

    io.to(`trip-${tripId}`).emit('trip-updated', trip)

    return trip
  }

  async deleteTrip(tripId: string, userId: string) {
    await this.checkTripPermission(tripId, userId, 'admin')

    await prisma.trip.delete({
      where: { id: tripId },
    })

    io.to(`trip-${tripId}`).emit('trip-deleted', { tripId })

    return { message: '行程已删除' }
  }

  async addMember(tripId: string, newUserId: string, role: string, addedBy: string) {
    await this.checkTripPermission(tripId, addedBy, 'admin')

    const existingMember = await prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId: newUserId,
        },
      },
    })

    if (existingMember) {
      if (existingMember.isActive) {
        throw new Error('用户已是行程成员')
      } else {
        const member = await prisma.tripMember.update({
          where: { id: existingMember.id },
          data: { isActive: true, role },
          include: { user: true },
        })

        io.to(`trip-${tripId}`).emit('member-added', member)
        return member
      }
    }

    const member = await prisma.tripMember.create({
      data: {
        tripId,
        userId: newUserId,
        role,
      },
      include: { user: true },
    })

    io.to(`trip-${tripId}`).emit('member-added', member)

    return member
  }

  async addVirtualMember(tripId: string, displayName: string, addedBy: string) {
    await this.checkTripPermission(tripId, addedBy, 'admin')

    // 检查是否已存在同名虚拟成员
    const existingVirtualMember = await prisma.tripMember.findFirst({
      where: {
        tripId,
        isVirtual: true,
        displayName: displayName.trim(),
        isActive: true
      }
    })

    if (existingVirtualMember) {
      throw new Error('已存在同名成员')
    }

    const member = await prisma.tripMember.create({
      data: {
        tripId,
        displayName: displayName.trim(),
        isVirtual: true,
        createdBy: addedBy,
        role: 'member'
      },
      include: { 
        user: true,
        creator: true
      }
    })

    io.to(`trip-${tripId}`).emit('virtual-member-added', member)

    return member
  }

  async removeMember(tripId: string, removeUserId: string, removedBy: string) {
    if (removeUserId === removedBy) {
      const member = await prisma.tripMember.findUnique({
        where: {
          tripId_userId: {
            tripId,
            userId: removeUserId,
          },
        },
      })

      if (member?.role === 'admin') {
        const adminCount = await prisma.tripMember.count({
          where: {
            tripId,
            role: 'admin',
            isActive: true,
          },
        })

        if (adminCount <= 1) {
          throw new Error('不能移除最后一个管理员')
        }
      }
    } else {
      await this.checkTripPermission(tripId, removedBy, 'admin')
    }

    const member = await prisma.tripMember.update({
      where: {
        tripId_userId: {
          tripId,
          userId: removeUserId,
        },
      },
      data: { isActive: false },
    })

    io.to(`trip-${tripId}`).emit('member-removed', { userId: removeUserId })

    return member
  }

  async updateMemberRole(tripId: string, targetUserId: string, role: string, updatedBy: string) {
    await this.checkTripPermission(tripId, updatedBy, 'admin')

    if (role !== 'admin') {
      const adminCount = await prisma.tripMember.count({
        where: {
          tripId,
          role: 'admin',
          isActive: true,
        },
      })

      if (adminCount <= 1) {
        const currentMember = await prisma.tripMember.findUnique({
          where: {
            tripId_userId: {
              tripId,
              userId: targetUserId,
            },
          },
        })

        if (currentMember?.role === 'admin') {
          throw new Error('不能移除最后一个管理员')
        }
      }
    }

    const member = await prisma.tripMember.update({
      where: {
        tripId_userId: {
          tripId,
          userId: targetUserId,
        },
      },
      data: { role },
      include: { user: true },
    })

    io.to(`trip-${tripId}`).emit('member-role-updated', member)

    return member
  }

  async getTripMembers(tripId: string, userId: string) {
    await this.checkTripPermission(tripId, userId)

    const members = await prisma.tripMember.findMany({
      where: {
        tripId,
        isActive: true,
      },
      include: {
        user: true,
      },
    })

    const membersWithStats = await Promise.all(
      members.map(async (member) => {
        // 虚拟成员没有userId，跳过支付统计
        if (!member.userId) {
          return {
            ...member,
            totalPaid: 0,
            totalShares: 0,
            balance: 0,
          }
        }

        const expenses = await prisma.expense.findMany({
          where: {
            tripId,
            payerId: member.userId,
          },
        })

        const totalPaid = expenses.reduce(
          (sum, expense) => sum + expense.amount.toNumber(),
          0
        )

        const participations = await prisma.expenseParticipant.findMany({
          where: {
            userId: member.userId,
            expense: {
              tripId,
            },
          },
          include: {
            expense: true,
          },
        })

        const totalShare = participations.reduce(
          (sum, p) => sum + (p.shareAmount?.toNumber() || 0),
          0
        )

        const balance = totalPaid - totalShare

        return {
          ...member,
          totalPaid,
          balance,
        }
      })
    )

    return membersWithStats
  }

  private async checkTripPermission(
    tripId: string,
    userId: string,
    requiredRole?: 'admin' | 'member'
  ) {
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

    if (requiredRole === 'admin' && member.role !== 'admin') {
      throw new Error('您没有权限执行此操作')
    }

    return member
  }
}

export const tripService = new TripService()
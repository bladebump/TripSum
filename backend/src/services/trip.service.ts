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

        // 找到用户对应的 TripMember
        const userMember = trip.members.find(m => m.userId === userId)
        const userExpenses = userMember ? trip.expenses
          .filter((expense) => expense.payerMemberId === userMember.id)
          .reduce((sum, expense) => sum + expense.amount.toNumber(), 0) : 0

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
            payerMember: {
              include: {
                user: true
              }
            },
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

    // 计算余额信息
    const { calculationService } = await import('./calculation.service')
    const balances = await calculationService.calculateBalances(tripId)

    // 将余额信息合并到成员数据中
    const membersWithBalance = trip.members.map((member: any) => {
      // 统一使用 member.id 查找余额信息
      const balance = balances.find(b => b.userId === member.id)
      return {
        ...member,
        balance: balance?.balance || 0,
        totalPaid: balance?.totalPaid || 0,
        totalShares: balance?.totalShare || 0
      }
    })

    const totalExpenses = trip.expenses.reduce(
      (sum, expense) => sum + expense.amount.toNumber(),
      0
    )

    const statistics = {
      totalExpenses,
      expenseCount: trip.expenses.length,
    }

    return {
      ...trip,
      members: membersWithBalance,
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

    // 计算余额信息 - 使用正确的基金池模式计算
    const { calculationService } = await import('./calculation.service')
    const balances = await calculationService.calculateBalances(tripId)

    // 将余额信息合并到成员数据中（虚拟成员和真实成员统一处理）
    const membersWithBalance = members.map(member => {
      // 统一使用 member.id 查找余额信息
      const balance = balances.find(b => b.userId === member.id) || {
        balance: 0,
        totalPaid: 0,
        totalShare: 0
      }

      return {
        ...member,
        balance: balance.balance,
        totalPaid: balance.totalPaid,
        totalShares: balance.totalShare
      }
    })

    return membersWithBalance
  }

  async updateMemberContribution(tripId: string, memberId: string, contribution: number, updatedBy: string) {
    // 检查权限：只有管理员可以更新基金缴纳
    await this.checkTripPermission(tripId, updatedBy, 'admin')
    
    // 验证成员是否存在且属于该行程
    const member = await prisma.tripMember.findFirst({
      where: {
        id: memberId,
        tripId,
        isActive: true,
      },
      include: { user: true },
    })

    if (!member) {
      throw new Error('成员不存在或不属于该行程')
    }

    const updatedMember = await prisma.tripMember.update({
      where: { id: memberId },
      data: { 
        contribution: {
          increment: contribution  // 使用累加而不是覆盖
        }
      },
      include: { user: true },
    })

    io.to(`trip-${tripId}`).emit('member-contribution-updated', updatedMember)

    return updatedMember
  }

  async batchUpdateContributions(tripId: string, contributions: Array<{ memberId: string; contribution: number }>, updatedBy: string) {
    // 检查权限：只有管理员可以批量更新基金缴纳
    await this.checkTripPermission(tripId, updatedBy, 'admin')
    
    // 验证所有成员都属于该行程
    const memberIds = contributions.map(c => c.memberId)
    const members = await prisma.tripMember.findMany({
      where: {
        id: { in: memberIds },
        tripId,
        isActive: true,
      },
    })

    if (members.length !== contributions.length) {
      throw new Error('部分成员不存在或不属于该行程')
    }

    // 批量更新 - 使用累加而不是覆盖
    const updatePromises = contributions.map(({ memberId, contribution }) =>
      prisma.tripMember.update({
        where: { id: memberId },
        data: { 
          contribution: {
            increment: contribution  // 使用累加
          }
        },
        include: { user: true },
      })
    )

    const updatedMembers = await Promise.all(updatePromises)

    io.to(`trip-${tripId}`).emit('batch-contributions-updated', updatedMembers)

    return {
      success: true,
      updated: updatedMembers.length,
      members: updatedMembers,
    }
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
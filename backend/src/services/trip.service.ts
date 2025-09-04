import { PrismaClient } from '@prisma/client'
import { io } from '../app'
import AmountUtil from '../utils/decimal'

const prisma = new PrismaClient()

interface CreateTripData {
  name: string
  description?: string
  startDate: Date
  endDate?: Date
  initialFund?: number
  currency?: string
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

  async getTripDetail(tripId: string, userId: string) {
    // 首先验证用户是否为行程成员
    const memberCheck = await prisma.tripMember.findFirst({
      where: {
        tripId,
        userId,
        isActive: true
      }
    })

    if (!memberCheck) {
      throw new Error('您不是该行程的成员')
    }

    // 只返回行程基础信息和分类
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        creator: true,
        categories: true,
        // 不再包含 members 和 expenses
      },
    })

    if (!trip) {
      throw new Error('行程不存在')
    }

    return trip
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

  // 新方法：通过memberId移除成员
  async removeMemberById(tripId: string, memberId: string, removedBy: string) {
    // 先获取member信息
    const targetMember = await prisma.tripMember.findUnique({
      where: { id: memberId },
      include: { user: true }
    })

    if (!targetMember || targetMember.tripId !== tripId) {
      throw new Error('成员不存在')
    }

    // 检查权限
    const removerMember = await prisma.tripMember.findFirst({
      where: {
        tripId,
        userId: removedBy,
        isActive: true
      }
    })

    if (!removerMember) {
      throw new Error('您不是该行程的成员')
    }

    // 如果是自己退出或者是管理员操作
    if (targetMember.userId === removedBy || removerMember.role === 'admin') {
      // 检查是否是最后一个管理员
      if (targetMember.role === 'admin') {
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

      const member = await prisma.tripMember.update({
        where: { id: memberId },
        data: { isActive: false },
      })

      io.to(`trip-${tripId}`).emit('member-removed', { memberId })
      return member
    } else {
      throw new Error('权限不足')
    }
  }

  // 保留旧方法以兼容
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

  // 新方法：通过memberId更新角色
  async updateMemberRoleById(tripId: string, memberId: string, role: string, updatedBy: string) {
    await this.checkTripPermission(tripId, updatedBy, 'admin')

    // 获取目标成员
    const targetMember = await prisma.tripMember.findUnique({
      where: { id: memberId },
      include: { user: true }
    })

    if (!targetMember || targetMember.tripId !== tripId) {
      throw new Error('成员不存在')
    }

    // 如果要降级管理员，检查是否是最后一个
    if (role !== 'admin' && targetMember.role === 'admin') {
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

    const member = await prisma.tripMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: true },
    })

    io.to(`trip-${tripId}`).emit('member-role-updated', member)
    return member
  }

  // 保留旧方法以兼容
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
      // 统一使用 member.id (memberId) 查找余额信息
      const balance = balances.find(b => b.memberId === member.id) || {
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

    // 计算新的贡献总额
    const currentContribution = Number(member.contribution || 0)
    const newContribution = currentContribution + contribution
    
    const updatedMember = await prisma.tripMember.update({
      where: { id: memberId },
      data: { contribution: newContribution },
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

    // 批量更新 - 计算每个成员的新贡献总额
    const updatePromises = contributions.map(async ({ memberId, contribution }) => {
      const member = members.find(m => m.id === memberId)
      if (!member) {
        throw new Error(`成员 ${memberId} 不存在`)
      }
      
      // 计算新的贡献总额
      const currentContribution = Number(member.contribution || 0)
      const newContribution = currentContribution + contribution
      
      return prisma.tripMember.update({
        where: { id: memberId },
        data: { contribution: newContribution },
        include: { user: true },
      })
    })

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
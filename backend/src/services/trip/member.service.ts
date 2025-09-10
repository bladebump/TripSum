import { PrismaClient } from '@prisma/client'
import { io } from '../../app'
import { tripPermissionService } from './permission.service'
import AmountUtil from '../../utils/decimal'
import { UpdateContributionData } from './types'

const prisma = new PrismaClient()

export class TripMemberService {
  async addMember(tripId: string, newUserId: string, role: string, addedBy: string) {
    await tripPermissionService.checkTripPermission(tripId, addedBy, 'admin')

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
    await tripPermissionService.checkTripPermission(tripId, addedBy, 'admin')

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

  async removeMemberById(tripId: string, memberId: string, removedBy: string) {
    const { targetMember } = await tripPermissionService.checkMemberPermission(tripId, memberId, removedBy)

    // 不能移除自己
    if (targetMember.userId === removedBy) {
      throw new Error('不能移除自己')
    }

    // 检查是否为最后一个管理员
    const adminCount = await prisma.tripMember.count({
      where: {
        tripId,
        role: 'admin',
        isActive: true,
      },
    })

    if (targetMember.role === 'admin' && adminCount <= 1) {
      throw new Error('不能移除最后一个管理员')
    }

    const updatedMember = await prisma.tripMember.update({
      where: { id: memberId },
      data: { isActive: false },
      include: { user: true },
    })

    io.to(`trip-${tripId}`).emit('member-removed', updatedMember)

    return updatedMember
  }

  async removeMember(tripId: string, removeUserId: string, removedBy: string) {
    await tripPermissionService.checkTripPermission(tripId, removedBy, 'admin')

    // 不能移除自己
    if (removeUserId === removedBy) {
      throw new Error('不能移除自己')
    }

    const member = await prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId: removeUserId,
        },
      },
    })

    if (!member || !member.isActive) {
      throw new Error('成员不存在或已被移除')
    }

    // 检查是否为最后一个管理员
    const adminCount = await prisma.tripMember.count({
      where: {
        tripId,
        role: 'admin',
        isActive: true,
      },
    })

    if (member.role === 'admin' && adminCount <= 1) {
      throw new Error('不能移除最后一个管理员')
    }

    const updatedMember = await prisma.tripMember.update({
      where: { id: member.id },
      data: { isActive: false },
      include: { user: true },
    })

    io.to(`trip-${tripId}`).emit('member-removed', updatedMember)

    return updatedMember
  }

  async updateMemberRoleById(tripId: string, memberId: string, role: string, updatedBy: string) {
    const { targetMember } = await tripPermissionService.checkMemberPermission(tripId, memberId, updatedBy)

    // 如果要降级管理员，检查是否为最后一个管理员
    if (targetMember.role === 'admin' && role !== 'admin') {
      const adminCount = await prisma.tripMember.count({
        where: {
          tripId,
          role: 'admin',
          isActive: true,
        },
      })

      if (adminCount <= 1) {
        throw new Error('不能降级最后一个管理员')
      }
    }

    const updatedMember = await prisma.tripMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: true },
    })

    io.to(`trip-${tripId}`).emit('member-role-updated', updatedMember)

    return updatedMember
  }

  async updateMemberRole(tripId: string, targetUserId: string, role: string, updatedBy: string) {
    await tripPermissionService.checkTripPermission(tripId, updatedBy, 'admin')

    const member = await prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId: targetUserId,
        },
      },
    })

    if (!member || !member.isActive) {
      throw new Error('成员不存在或已被移除')
    }

    // 如果要降级管理员，检查是否为最后一个管理员
    if (member.role === 'admin' && role !== 'admin') {
      const adminCount = await prisma.tripMember.count({
        where: {
          tripId,
          role: 'admin',
          isActive: true,
        },
      })

      if (adminCount <= 1) {
        throw new Error('不能降级最后一个管理员')
      }
    }

    const updatedMember = await prisma.tripMember.update({
      where: { id: member.id },
      data: { role },
      include: { user: true },
    })

    io.to(`trip-${tripId}`).emit('member-role-updated', updatedMember)

    return updatedMember
  }

  async getTripMembers(tripId: string, userId: string) {
    await tripPermissionService.checkTripPermission(tripId, userId)

    const members = await prisma.tripMember.findMany({
      where: {
        tripId,
        isActive: true,
      },
      include: {
        user: true,
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' }
      ],
    })

    return members
  }

  async updateMemberContribution(tripId: string, memberId: string, contribution: number, updatedBy: string) {
    await tripPermissionService.checkMemberPermission(tripId, memberId, updatedBy)

    const updatedMember = await prisma.tripMember.update({
      where: { id: memberId },
      data: { 
        contribution: AmountUtil.toDecimal(contribution)
      },
      include: { user: true },
    })

    io.to(`trip-${tripId}`).emit('member-contribution-updated', {
      memberId,
      contribution: AmountUtil.toNumber(updatedMember.contribution)
    })

    return updatedMember
  }

  async batchUpdateContributions(
    tripId: string, 
    contributions: UpdateContributionData[], 
    updatedBy: string
  ) {
    await tripPermissionService.checkTripPermission(tripId, updatedBy, 'admin')

    // 批量验证所有成员是否存在
    const memberIds = contributions.map(c => c.memberId)
    const existingMembers = await prisma.tripMember.findMany({
      where: {
        id: { in: memberIds },
        tripId,
        isActive: true
      }
    })

    if (existingMembers.length !== memberIds.length) {
      throw new Error('部分成员不存在或已被移除')
    }

    // 使用事务批量更新
    const updatePromises = contributions.map(({ memberId, contribution }) => 
      prisma.tripMember.update({
        where: { id: memberId },
        data: { 
          contribution: AmountUtil.toDecimal(contribution)
        },
        include: { user: true }
      })
    )

    const updatedMembers = await prisma.$transaction(updatePromises)

    // 通知所有成员
    io.to(`trip-${tripId}`).emit('contributions-batch-updated', 
      updatedMembers.map(m => ({
        memberId: m.id,
        contribution: AmountUtil.toNumber(m.contribution)
      }))
    )

    return updatedMembers
  }

  /**
   * 获取成员的显示名称
   * 真实用户优先使用 username，虚拟成员使用 displayName
   */
  getMemberDisplayName(member: any): string {
    // 如果是真实用户（非虚拟成员）
    if (!member.isVirtual && member.user) {
      return member.user.username || member.displayName || '未知用户'
    }
    // 如果是虚拟成员
    return member.displayName || '虚拟成员'
  }

  /**
   * 批量获取成员显示名称
   */
  getMembersDisplayNames(members: any[]): Map<string, string> {
    const namesMap = new Map<string, string>()
    members.forEach(member => {
      namesMap.set(member.id, this.getMemberDisplayName(member))
    })
    return namesMap
  }
}

export const tripMemberService = new TripMemberService()
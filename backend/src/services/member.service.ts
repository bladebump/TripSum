import { PrismaClient } from '@prisma/client'
import { tripService } from './trip.service'
import logger from '../utils/logger'

const prisma = new PrismaClient()

export class MemberService {
  async updateMemberContribution(
    tripId: string, 
    memberId: string, 
    contribution: number,
    requestUserId: string
  ) {
    // 验证用户权限
    const trip = await tripService.getTripDetail(tripId, requestUserId)
    const userMember = trip.members?.find(m => m.userId === requestUserId)
    
    if (userMember?.role !== 'admin') {
      throw new Error('只有管理员可以更新基金缴纳')
    }

    // 更新成员的contribution
    const updatedMember = await prisma.tripMember.update({
      where: { id: memberId },
      data: { contribution },
      include: {
        user: true
      }
    })

    // 更新行程的总基金
    const totalContribution = await prisma.tripMember.aggregate({
      where: { tripId, isActive: true },
      _sum: { contribution: true }
    })

    await prisma.trip.update({
      where: { id: tripId },
      data: { 
        initialFund: totalContribution._sum.contribution || 0 
      }
    })

    logger.info('成员基金缴纳已更新', {
      tripId,
      memberId,
      contribution,
      totalFund: totalContribution._sum.contribution
    })

    return {
      member: updatedMember,
      totalFund: totalContribution._sum.contribution || 0
    }
  }

  async batchUpdateContributions(
    tripId: string,
    contributions: Array<{ memberId: string; contribution: number }>,
    requestUserId: string
  ) {
    // 验证用户权限
    const trip = await tripService.getTripDetail(tripId, requestUserId)
    const userMember = trip.members?.find(m => m.userId === requestUserId)
    
    if (userMember?.role !== 'admin') {
      throw new Error('只有管理员可以更新基金缴纳')
    }

    // 批量更新
    const updates = contributions.map(item => 
      prisma.tripMember.update({
        where: { id: item.memberId },
        data: { contribution: item.contribution }
      })
    )

    await prisma.$transaction(updates)

    // 更新行程的总基金
    const totalContribution = await prisma.tripMember.aggregate({
      where: { tripId, isActive: true },
      _sum: { contribution: true }
    })

    await prisma.trip.update({
      where: { id: tripId },
      data: { 
        initialFund: totalContribution._sum.contribution || 0 
      }
    })

    // 获取更新后的成员列表
    const members = await prisma.tripMember.findMany({
      where: { tripId, isActive: true },
      include: { user: true }
    })

    logger.info('批量更新基金缴纳成功', {
      tripId,
      count: contributions.length,
      totalFund: totalContribution._sum.contribution
    })

    return {
      members,
      totalFund: totalContribution._sum.contribution || 0
    }
  }

  async getTripMembers(tripId: string, requestUserId: string) {
    // 验证用户是否为行程成员
    await tripService.getTripDetail(tripId, requestUserId)

    const members = await prisma.tripMember.findMany({
      where: { tripId, isActive: true },
      include: { user: true },
      orderBy: { joinDate: 'asc' }
    })

    return members.map(member => ({
      id: member.id,
      userId: member.userId,
      displayName: member.isVirtual ? member.displayName : member.user?.username,
      isVirtual: member.isVirtual,
      role: member.role,
      contribution: member.contribution.toNumber(),
      joinDate: member.joinDate
    }))
  }
}

export const memberService = new MemberService()
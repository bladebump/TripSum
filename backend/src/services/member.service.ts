import { PrismaClient } from '@prisma/client'
import logger from '../utils/logger'

const prisma = new PrismaClient()

export class MemberService {
  /**
   * 根据userId和tripId获取对应的memberId
   * @param userId 用户ID
   * @param tripId 行程ID
   * @returns memberId 或 null
   */
  async getMemberIdByUserId(userId: string, tripId: string): Promise<string | null> {
    try {
      const member = await prisma.tripMember.findUnique({
        where: {
          tripId_userId: {
            tripId,
            userId
          }
        }
      })
      
      return member?.id || null
    } catch (error) {
      logger.error('获取memberId失败:', error)
      return null
    }
  }

  /**
   * 根据memberId获取成员信息
   * @param memberId 成员ID
   * @returns 成员信息
   */
  async getMemberById(memberId: string) {
    return await prisma.tripMember.findUnique({
      where: { id: memberId },
      include: {
        user: true,
        trip: true
      }
    })
  }

  /**
   * 检查用户是否为行程成员并返回成员信息
   * @param tripId 行程ID
   * @param userId 用户ID
   * @returns 成员信息
   */
  async checkAndGetMember(tripId: string, userId: string) {
    const member = await prisma.tripMember.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId
        }
      },
      include: {
        user: true
      }
    })
    
    if (!member || !member.isActive) {
      throw new Error('用户不是该行程的成员')
    }
    
    return member
  }

  /**
   * 获取行程的所有活跃成员
   * @param tripId 行程ID
   * @returns 成员列表
   */
  async getTripMembers(tripId: string) {
    return await prisma.tripMember.findMany({
      where: {
        tripId,
        isActive: true
      },
      include: {
        user: true
      }
    })
  }

  /**
   * 批量根据userId获取memberId映射
   * @param tripId 行程ID
   * @param userIds 用户ID列表
   * @returns userId到memberId的映射
   */
  async getUserIdToMemberIdMap(tripId: string, userIds: string[]): Promise<Map<string, string>> {
    const members = await prisma.tripMember.findMany({
      where: {
        tripId,
        userId: { in: userIds },
        isActive: true
      }
    })
    
    const map = new Map<string, string>()
    members.forEach(member => {
      if (member.userId) {
        map.set(member.userId, member.id)
      }
    })
    
    return map
  }

  /**
   * 检查memberId是否有效
   * @param tripId 行程ID
   * @param memberId 成员ID
   * @returns 是否有效
   */
  async isValidMember(tripId: string, memberId: string): Promise<boolean> {
    const member = await prisma.tripMember.findFirst({
      where: {
        id: memberId,
        tripId,
        isActive: true
      }
    })
    
    return !!member
  }

  /**
   * 获取成员的角色
   * @param memberId 成员ID
   * @returns 角色（admin/member）或null
   */
  async getMemberRole(memberId: string): Promise<string | null> {
    const member = await prisma.tripMember.findUnique({
      where: { id: memberId }
    })
    
    return member?.role || null
  }

  /**
   * 根据userId获取用户在所有行程中的成员信息
   * @param userId 用户ID
   * @returns 成员信息列表
   */
  async getUserMemberships(userId: string) {
    return await prisma.tripMember.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        trip: true
      }
    })
  }
}

export const memberService = new MemberService()
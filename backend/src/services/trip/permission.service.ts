import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class TripPermissionService {
  async checkTripPermission(
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

  async checkMemberPermission(tripId: string, memberId: string, userId: string) {
    const requestingMember = await this.checkTripPermission(tripId, userId, 'admin')
    
    const targetMember = await prisma.tripMember.findFirst({
      where: {
        id: memberId,
        tripId,
        isActive: true,
      },
    })

    if (!targetMember) {
      throw new Error('成员不存在或已被移除')
    }

    return { requestingMember, targetMember }
  }

  async isUserInTrip(tripId: string, userId: string): Promise<boolean> {
    const member = await prisma.tripMember.findFirst({
      where: {
        tripId,
        userId,
        isActive: true
      }
    })

    return !!member
  }

  async getUserRole(tripId: string, userId: string): Promise<string | null> {
    const member = await prisma.tripMember.findFirst({
      where: {
        tripId,
        userId,
        isActive: true
      }
    })

    return member?.role || null
  }
}

export const tripPermissionService = new TripPermissionService()
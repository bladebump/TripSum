import { PrismaClient, InvitationStatus, Prisma } from '@prisma/client'
import { InvitationListQuery } from '../../types/invitation.types'

const prisma = new PrismaClient()

export class InvitationQueryService {
  async getUserInvitations(userId: string, query: InvitationListQuery) {
    const { page = 1, limit = 10, status, type = 'received' } = query
    const skip = (page - 1) * limit

    const where: Prisma.TripInvitationWhereInput = 
      type === 'sent' 
        ? { createdBy: userId }
        : { invitedUserId: userId }

    if (status) {
      where.status = status
    }

    const [invitations, total] = await Promise.all([
      prisma.tripInvitation.findMany({
        where,
        include: {
          trip: {
            select: {
              id: true,
              name: true,
              description: true,
              startDate: true,
              endDate: true,
            },
          },
          inviter: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          invitedUser: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          targetMember: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tripInvitation.count({ where }),
    ])

    return {
      invitations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getInvitationById(invitationId: string, userId: string) {
    const invitation = await prisma.tripInvitation.findUnique({
      where: { id: invitationId },
      include: {
        trip: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            _count: {
              select: { expenses: true },
            },
          },
        },
        inviter: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        invitedUser: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        targetMember: true,
      },
    })

    if (!invitation) {
      throw new Error('邀请不存在')
    }

    // 验证用户是否有权查看此邀请
    if (invitation.invitedUserId !== userId && invitation.createdBy !== userId) {
      throw new Error('无权查看此邀请')
    }

    return invitation
  }

  async getTripInvitations(tripId: string, status?: InvitationStatus) {
    const where: Prisma.TripInvitationWhereInput = { tripId }
    
    if (status) {
      where.status = status
    }

    const invitations = await prisma.tripInvitation.findMany({
      where,
      include: {
        inviter: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        invitedUser: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        targetMember: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return invitations
  }

  async getPendingInvitationsCount(userId: string) {
    const count = await prisma.tripInvitation.count({
      where: {
        invitedUserId: userId,
        status: InvitationStatus.PENDING,
      },
    })

    return count
  }

  async checkUserHasPendingInvitation(tripId: string, userId: string) {
    const invitation = await prisma.tripInvitation.findFirst({
      where: {
        tripId,
        invitedUserId: userId,
        status: InvitationStatus.PENDING,
      },
    })

    return !!invitation
  }
}

export const invitationQueryService = new InvitationQueryService()
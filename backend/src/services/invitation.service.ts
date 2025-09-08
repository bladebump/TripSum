import { PrismaClient, InviteType, InvitationStatus, Prisma } from '@prisma/client';
import { CreateInvitationDTO, InvitationListQuery, AcceptInvitationResult } from '../types/invitation.types';
import { notificationService } from './notification.service';

const prisma = new PrismaClient();

export class InvitationService {
  /**
   * 创建邀请
   */
  async createInvitation(
    tripId: string,
    createdBy: string,
    data: CreateInvitationDTO
  ) {
    // 检查用户是否已经在行程中
    const existingMember = await prisma.tripMember.findFirst({
      where: {
        tripId,
        userId: data.invitedUserId,
        isActive: true,
      },
    });

    if (existingMember) {
      throw new Error('该用户已经是行程成员');
    }

    // 检查是否有未处理的邀请
    const pendingInvitation = await prisma.tripInvitation.findFirst({
      where: {
        tripId,
        invitedUserId: data.invitedUserId,
        status: InvitationStatus.PENDING,
      },
    });

    if (pendingInvitation) {
      throw new Error('该用户已有待处理的邀请');
    }

    // 如果是替换模式，验证目标虚拟成员
    if (data.inviteType === InviteType.REPLACE) {
      if (!data.targetMemberId) {
        throw new Error('替换模式必须指定目标成员');
      }

      const targetMember = await prisma.tripMember.findFirst({
        where: {
          id: data.targetMemberId,
          tripId,
          isVirtual: true,
        },
      });

      if (!targetMember) {
        throw new Error('目标成员不存在或不是虚拟成员');
      }
    }

    // 创建邀请，设置7天过期
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.tripInvitation.create({
      data: {
        tripId,
        invitedUserId: data.invitedUserId,
        inviteType: data.inviteType,
        targetMemberId: data.targetMemberId,
        message: data.message,
        createdBy,
        expiresAt,
      },
      include: {
        trip: true,
        invitedUser: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        inviter: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        targetMember: true,
      },
    });

    // 发送邀请通知
    await notificationService.sendInvitationNotification({
      recipientId: data.invitedUserId,
      inviterName: invitation.inviter.username,
      tripName: invitation.trip.name,
      invitationId: invitation.id,
      message: data.message,
    });

    return invitation;
  }

  /**
   * 获取用户的邀请列表
   */
  async getUserInvitations(userId: string, query: InvitationListQuery) {
    const { status, page = 1, limit = 10 } = query;

    const where: Prisma.TripInvitationWhereInput = {
      invitedUserId: userId,
    };

    if (status) {
      where.status = status;
    }

    const [invitations, total] = await Promise.all([
      prisma.tripInvitation.findMany({
        where,
        include: {
          trip: {
            include: {
              _count: {
                select: { members: true },
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
          targetMember: {
            select: {
              id: true,
              displayName: true,
              isVirtual: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tripInvitation.count({ where }),
    ]);

    return {
      invitations: invitations.map(inv => ({
        id: inv.id,
        tripId: inv.tripId,
        inviteType: inv.inviteType,
        status: inv.status,
        message: inv.message,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        respondedAt: inv.respondedAt,
        trip: {
          id: inv.trip.id,
          name: inv.trip.name,
          description: inv.trip.description,
          memberCount: inv.trip._count.members,
        },
        inviter: inv.inviter,
        targetMember: inv.targetMember,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取邀请详情
   */
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
            expenses: {
              select: { id: true },
            },
          },
        },
        invitedUser: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        inviter: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        targetMember: true,
      },
    });

    if (!invitation) {
      throw new Error('邀请不存在');
    }

    // 验证访问权限
    if (invitation.invitedUserId !== userId && invitation.createdBy !== userId) {
      throw new Error('无权查看此邀请');
    }

    return invitation;
  }

  /**
   * 接受邀请
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<AcceptInvitationResult> {
    // 先获取完整的邀请信息（包括关联数据）用于发送通知
    const fullInvitation = await prisma.tripInvitation.findUnique({
      where: { id: invitationId },
      include: {
        trip: true,
        inviter: true,
        invitedUser: true,
        targetMember: true,
      },
    });

    if (!fullInvitation) {
      throw new Error('邀请不存在');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 获取邀请详情
      const invitation = await tx.tripInvitation.findUnique({
        where: { id: invitationId },
        include: { targetMember: true },
      });

      if (!invitation) {
        throw new Error('邀请不存在');
      }

      if (invitation.invitedUserId !== userId) {
        throw new Error('无权操作此邀请');
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new Error('邀请状态无效');
      }

      if (new Date() > invitation.expiresAt) {
        // 更新为过期状态
        await tx.tripInvitation.update({
          where: { id: invitationId },
          data: { status: InvitationStatus.EXPIRED },
        });
        throw new Error('邀请已过期');
      }

      // 检查用户是否已经在行程中
      const existingMember = await tx.tripMember.findFirst({
        where: {
          tripId: invitation.tripId,
          userId,
          isActive: true,
        },
      });

      if (existingMember) {
        throw new Error('您已经是该行程的成员');
      }

      let memberId: string;
      let isReplacement = false;

      if (invitation.inviteType === InviteType.REPLACE && invitation.targetMemberId) {
        // 替换模式：更新现有虚拟成员
        const updatedMember = await tx.tripMember.update({
          where: { id: invitation.targetMemberId },
          data: {
            userId,
            isVirtual: false,
            displayName: null, // 清除虚拟成员的显示名称
          },
        });
        memberId = updatedMember.id;
        isReplacement = true;
      } else {
        // 新增模式：创建新成员
        const newMember = await tx.tripMember.create({
          data: {
            tripId: invitation.tripId,
            userId,
            role: 'member',
            isVirtual: false,
          },
        });
        memberId = newMember.id;
      }

      // 更新邀请状态
      await tx.tripInvitation.update({
        where: { id: invitationId },
        data: {
          status: InvitationStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      return {
        success: true,
        memberId,
        isReplacement,
        message: isReplacement ? '成功替换虚拟成员' : '成功加入行程',
        targetMemberName: invitation.targetMember?.displayName,
      };
    });

    // 发送接受通知给邀请人
    await notificationService.sendInvitationAcceptedNotification({
      recipientId: fullInvitation.createdBy,
      accepterName: fullInvitation.invitedUser.username,
      tripName: fullInvitation.trip.name,
      tripId: fullInvitation.tripId,
    });

    // 通知其他成员有新成员加入
    const tripMembers = await prisma.tripMember.findMany({
      where: {
        tripId: fullInvitation.tripId,
        userId: { not: null },
        isActive: true,
      },
      select: { userId: true },
    });

    const memberUserIds = tripMembers
      .map(m => m.userId)
      .filter((id): id is string => id !== null && id !== userId);

    if (memberUserIds.length > 0) {
      await notificationService.sendMemberJoinedNotification({
        tripId: fullInvitation.tripId,
        tripName: fullInvitation.trip.name,
        memberName: fullInvitation.invitedUser.username,
        memberIds: memberUserIds,
        isReplacement: result.isReplacement,
        replacedMemberName: result.targetMemberName || undefined,
      });
    }

    return result;
  }

  /**
   * 拒绝邀请
   */
  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.tripInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new Error('邀请不存在');
    }

    if (invitation.invitedUserId !== userId) {
      throw new Error('无权操作此邀请');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('邀请状态无效');
    }

    const updatedInvitation = await prisma.tripInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REJECTED,
        respondedAt: new Date(),
      },
      include: {
        trip: true,
        inviter: {
          select: {
            id: true,
            username: true,
          },
        },
        invitedUser: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // 发送拒绝通知给邀请人
    await notificationService.sendInvitationRejectedNotification({
      recipientId: updatedInvitation.createdBy,
      rejecterName: updatedInvitation.invitedUser.username,
      tripName: updatedInvitation.trip.name,
    });

    return updatedInvitation;
  }

  /**
   * 撤销邀请
   */
  async cancelInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.tripInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new Error('邀请不存在');
    }

    if (invitation.createdBy !== userId) {
      throw new Error('无权撤销此邀请');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('只能撤销待处理的邀请');
    }

    const updatedInvitation = await prisma.tripInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.CANCELLED,
        respondedAt: new Date(),
      },
    });

    return updatedInvitation;
  }

  /**
   * 获取行程的邀请列表（管理员用）
   */
  async getTripInvitations(tripId: string, status?: InvitationStatus) {
    const where: Prisma.TripInvitationWhereInput = { tripId };

    if (status) {
      where.status = status;
    }

    const invitations = await prisma.tripInvitation.findMany({
      where,
      include: {
        invitedUser: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        inviter: {
          select: {
            id: true,
            username: true,
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
    });

    return invitations;
  }

  /**
   * 检查并更新过期的邀请
   */
  async updateExpiredInvitations() {
    const now = new Date();
    
    const updated = await prisma.tripInvitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { lt: now },
      },
      data: {
        status: InvitationStatus.EXPIRED,
      },
    });

    return updated.count;
  }
}

export const invitationService = new InvitationService();
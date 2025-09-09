import { PrismaClient, InviteType, InvitationStatus } from '@prisma/client'
import { AcceptInvitationResult } from '../../types/invitation.types'
import { notificationService } from '../notification.service'

const prisma = new PrismaClient()

export class InvitationProcessService {
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
    })

    if (!fullInvitation) {
      throw new Error('邀请不存在')
    }

    const result = await prisma.$transaction(async (tx) => {
      // 获取邀请详情
      const invitation = await tx.tripInvitation.findUnique({
        where: { id: invitationId },
        include: { targetMember: true },
      })

      if (!invitation) {
        throw new Error('邀请不存在')
      }

      if (invitation.invitedUserId !== userId) {
        throw new Error('无权操作此邀请')
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw new Error('邀请状态无效')
      }

      if (new Date() > invitation.expiresAt) {
        // 更新为过期状态
        await tx.tripInvitation.update({
          where: { id: invitationId },
          data: { status: InvitationStatus.EXPIRED },
        })
        throw new Error('邀请已过期')
      }

      // 检查用户是否已经在行程中
      const existingMember = await tx.tripMember.findFirst({
        where: {
          tripId: invitation.tripId,
          userId,
          isActive: true,
        },
      })

      if (existingMember) {
        throw new Error('您已经是该行程的成员')
      }

      let memberId: string
      let isReplacement = false

      if (invitation.inviteType === InviteType.REPLACE && invitation.targetMemberId) {
        // 替换模式：更新现有虚拟成员
        const updatedMember = await tx.tripMember.update({
          where: { id: invitation.targetMemberId },
          data: {
            userId,
            isVirtual: false,
            displayName: null, // 清除虚拟成员的显示名称
          },
        })
        memberId = updatedMember.id
        isReplacement = true
      } else {
        // 新增模式：创建新成员
        const newMember = await tx.tripMember.create({
          data: {
            tripId: invitation.tripId,
            userId,
            role: 'member',
            isVirtual: false,
          },
        })
        memberId = newMember.id
      }

      // 更新邀请状态
      await tx.tripInvitation.update({
        where: { id: invitationId },
        data: {
          status: InvitationStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      })

      return {
        success: true,
        memberId,
        isReplacement,
        message: isReplacement ? '成功替换虚拟成员' : '成功加入行程',
        targetMemberName: invitation.targetMember?.displayName,
      }
    })

    // 发送接受通知给邀请人
    await notificationService.sendInvitationAcceptedNotification({
      recipientId: fullInvitation.createdBy,
      accepterName: fullInvitation.invitedUser.username,
      tripName: fullInvitation.trip.name,
      tripId: fullInvitation.tripId,
    })

    // 通知其他成员有新成员加入
    const tripMembers = await prisma.tripMember.findMany({
      where: {
        tripId: fullInvitation.tripId,
        userId: { not: null },
        isActive: true,
      },
      select: { userId: true },
    })

    const memberUserIds = tripMembers
      .map(m => m.userId)
      .filter((id): id is string => id !== null && id !== userId)

    if (memberUserIds.length > 0) {
      await notificationService.sendMemberJoinedNotification({
        tripId: fullInvitation.tripId,
        tripName: fullInvitation.trip.name,
        memberName: fullInvitation.invitedUser.username,
        memberIds: memberUserIds,
        isReplacement: result.isReplacement,
        replacedMemberName: result.targetMemberName || undefined,
      })
    }

    return result
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.tripInvitation.findUnique({
      where: { id: invitationId },
    })

    if (!invitation) {
      throw new Error('邀请不存在')
    }

    if (invitation.invitedUserId !== userId) {
      throw new Error('无权操作此邀请')
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('邀请状态无效')
    }

    const updatedInvitation = await prisma.tripInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REJECTED,
        respondedAt: new Date(),
      },
      include: {
        inviter: true,
        invitedUser: true,
        trip: true,
      },
    })

    // 通知邀请人邀请被拒绝
    await notificationService.sendInvitationRejectedNotification({
      recipientId: updatedInvitation.createdBy,
      rejecterName: updatedInvitation.invitedUser.username,
      tripName: updatedInvitation.trip.name,
    })

    return updatedInvitation
  }

  async updateExpiredInvitations() {
    const expiredInvitations = await prisma.tripInvitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: {
        status: InvitationStatus.EXPIRED,
      },
    })

    return {
      count: expiredInvitations.count,
      message: `更新了 ${expiredInvitations.count} 个过期邀请`,
    }
  }
}

export const invitationProcessService = new InvitationProcessService()